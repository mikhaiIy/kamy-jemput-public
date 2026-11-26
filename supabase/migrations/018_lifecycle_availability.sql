-- Invitation lifecycle: administrator availability audit + guarded operations.
--
-- Lifecycle is DERIVED from durable facts; no customer-writable lifecycle
-- column exists:
--
--   Editing     order not paid (draft writes / owner deletion allowed)
--   Publishing  order paid, card unpublished, no recorded `disabled` action
--   Published   order paid, card public (`is_published = true`)
--   Unavailable order paid, card unpublished, latest audit action `disabled`
--
-- `cards.custom_data` stays the immutable first-publication snapshot: it is
-- written exactly once, by finalize_paid_order(), when a paid order first
-- publishes. An administrative disable never erases or resets `published_at`.
--
-- The audit table is append-only for clients: no anon/authenticated DML.
-- Owners and admins get read-only access to the history they can display.

-- ---------------------------------------------------------------------------
-- 1. Append-only administrator availability-action audit table
-- ---------------------------------------------------------------------------

create table public.card_availability_actions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  admin_id uuid not null references public.users(id),
  action text not null check (action in ('disabled', 'restored')),
  reason text,
  created_at timestamptz not null default now(),
  -- A disable must always record why — the reason is customer-visible.
  constraint card_availability_actions_disable_reason
    check (action <> 'disabled' or (reason is not null and btrim(reason) <> ''))
);

-- Latest-action lookup by card, newest first.
create index card_availability_actions_card_recent_idx
  on public.card_availability_actions (card_id, created_at desc);

alter table public.card_availability_actions enable row level security;

-- The audit trail is append-only: no client may mutate or remove recorded
-- actions. Owners/admins read their permitted rows through the RLS policies
-- below; trusted server paths append and read via service_role.
revoke insert, update, delete on public.card_availability_actions from anon, authenticated;
grant select on public.card_availability_actions to authenticated;
grant select, insert on public.card_availability_actions to service_role;

create policy "card owners can read their availability actions"
  on public.card_availability_actions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.cards c
      where c.id = card_availability_actions.card_id
        and c.user_id = (select auth.uid())
    )
  );

create policy "admins can read availability actions"
  on public.card_availability_actions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'admin'
    )
  );

grant select, insert on public.card_availability_actions to service_role;

-- ---------------------------------------------------------------------------
-- 2. Guarded transactional operations
--
-- Every function below runs as invoker and is callable ONLY by service_role:
-- trusted server code performs its own auth/ownership/admin checks before
-- calling. Errors carry stable message tokens so route handlers can map them
-- to useful responses; any unexpected error also aborts atomically, so an
-- interrupted transition is always retryable rather than half-applied.
-- ---------------------------------------------------------------------------

-- Paid-order finalizer used by the Stripe webhook AND by owner status polling,
-- so a signed replay or a manual check can finish an interrupted Publishing
-- transition. Never re-publishes an Unavailable card and never recreates a
-- missing card: a missing pre-created Card is a remediable failure, because
-- rebuilding one from orders.custom_data risks duplicate/malformed
-- publications.
create or replace function public.finalize_paid_order(p_order_id uuid)
returns json
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
  v_last_action text;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if o.status is distinct from 'paid' then
    raise exception 'ORDER_NOT_PAID';
  end if;

  select * into c from public.cards where order_id = p_order_id for update;
  if not found then
    raise exception 'CARD_MISSING';
  end if;

  if c.is_published then
    return json_build_object('state', 'published', 'slug', c.slug, 'promoted', false);
  end if;

  -- Audit-read failure must fail the recovery operation, never default to
  -- "there was no disable".
  select action into v_last_action
    from public.card_availability_actions
   where card_id = c.id
   order by created_at desc, id desc
   limit 1;

  if v_last_action = 'disabled' then
    return json_build_object('state', 'unavailable', 'slug', c.slug, 'promoted', false);
  end if;

  -- First publication wins: promote the draft into the immutable snapshot.
  update public.cards set
    custom_data = coalesce(c.custom_data_draft, c.custom_data),
    custom_data_draft = null,
    is_published = true,
    published_at = coalesce(c.published_at, now())
  where id = c.id;

  return json_build_object('state', 'published', 'slug', c.slug, 'promoted', true);
end;
$$;

-- Draft persistence is allowed only while the related order remains unpaid
-- (Editing), so a payment transition cannot race a late draft write.
create or replace function public.update_card_draft_if_editing(p_card_id uuid, p_draft jsonb)
returns boolean
language plpgsql
as $$
begin
  update public.cards c
     set custom_data_draft = p_draft
   where c.id = p_card_id
     and exists (
       select 1 from public.orders o
        where o.id = c.order_id
          and o.status <> 'paid'
     );
  return found;
end;
$$;

-- Owner deletion is allowed only while the card is atomically Editing with a
-- related unpaid order. A card without a related order is rejected rather than
-- deleted, so deletion always converges through the same paid-state check. The
-- pending order is deleted too (which cascades to the card row) so an orphan
-- order cannot subsequently be checked out or resurrected by webhook recovery.
create or replace function public.delete_card_if_editing(p_card_id uuid, p_owner uuid)
returns boolean
language plpgsql
as $$
declare
  c public.cards%rowtype;
  o_status text;
begin
  select * into c from public.cards where id = p_card_id for update;
  if not found then
    return false;
  end if;
  if c.user_id is distinct from p_owner then
    return false;
  end if;

  -- A related order is required: no order means no provably-unpaid state.
  if c.order_id is null then
    return false;
  end if;

  select status into o_status from public.orders where id = c.order_id for update;
  if o_status = 'paid' then
    return false;
  end if;

  delete from public.orders where id = c.order_id;
  return true;
end;
$$;

-- Recorded administrator availability transitions, atomic with the visibility
-- flip. Disable requires a paid Published card plus a nonblank reason
-- (also DB-enforced). Restore requires a paid Unavailable card (unpublished
-- AND latest action disabled). published_at is retained across disables so an
-- administrative disable is neither a new nor an erased first publication.
create or replace function public.set_card_availability(
  p_card_id uuid,
  p_admin_id uuid,
  p_action text,
  p_reason text default null
)
returns json
language plpgsql
as $$
declare
  r record;
  v_last_action text;
begin
  if p_action not in ('disabled', 'restored') then
    raise exception 'INVALID_ACTION';
  end if;

  select c.*, o.status as order_status into r
    from public.cards c
    left join public.orders o on o.id = c.order_id
   where c.id = p_card_id
   for update of c;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;
  if r.order_status is distinct from 'paid' then
    raise exception 'UNPAID';
  end if;

  select action into v_last_action
    from public.card_availability_actions
   where card_id = p_card_id
   order by created_at desc, id desc
   limit 1;

  if p_action = 'disabled' then
    if not r.is_published then
      raise exception 'NOT_PUBLISHED';
    end if;
    if coalesce(btrim(p_reason), '') = '' then
      raise exception 'REASON_REQUIRED';
    end if;
    insert into public.card_availability_actions (card_id, admin_id, action, reason)
      values (p_card_id, p_admin_id, 'disabled', btrim(p_reason));
    update public.cards set is_published = false where id = p_card_id;
    return json_build_object('is_published', false, 'action', 'disabled');
  else
    if r.is_published then
      raise exception 'ALREADY_PUBLISHED';
    end if;
    if v_last_action is distinct from 'disabled' then
      raise exception 'NOT_DISABLED';
    end if;
    insert into public.card_availability_actions (card_id, admin_id, action, reason)
      values (p_card_id, p_admin_id, 'restored', nullif(btrim(coalesce(p_reason, '')), ''));
    update public.cards set is_published = true where id = p_card_id;
    return json_build_object('is_published', true, 'action', 'restored');
  end if;
end;
$$;

-- Functions are executable by PUBLIC by default — lock them to service_role.
revoke all on function public.finalize_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid) to service_role;

revoke all on function public.update_card_draft_if_editing(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.update_card_draft_if_editing(uuid, jsonb) to service_role;

revoke all on function public.delete_card_if_editing(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_card_if_editing(uuid, uuid) to service_role;

revoke all on function public.set_card_availability(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_card_availability(uuid, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Card-assets mutation now also requires the owner card's order to remain
-- unpaid, matching the Editing-only edit boundary above (supersedes the
-- migration-016 versions of these policies).
-- ---------------------------------------------------------------------------

drop policy "card-assets owner insert" on storage.objects;
drop policy "card-assets owner update" on storage.objects;
drop policy "card-assets owner delete" on storage.objects;

create policy "card-assets owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards
      join public.orders on orders.id = cards.order_id
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
        and orders.status <> 'paid'
    )
  );

create policy "card-assets owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-assets'
    and exists (
      select 1
      from public.cards
      join public.orders on orders.id = cards.order_id
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
        and orders.status <> 'paid'
    )
  )
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards
      join public.orders on orders.id = cards.order_id
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
        and orders.status <> 'paid'
    )
  );

create policy "card-assets owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-assets'
    and exists (
      select 1
      from public.cards
      join public.orders on orders.id = cards.order_id
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
        and orders.status <> 'paid'
    )
  );
