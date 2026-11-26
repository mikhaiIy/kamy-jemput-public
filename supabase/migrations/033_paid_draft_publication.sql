-- Paid-draft lifecycle and explicit first publication.
--
-- Migration 031 introduced `manual_paid_draft` for the manual-payment path.
-- It is retained for compatibility and now means that the winning payment has
-- created the one editable, unpublished paid draft, regardless of whether the
-- winner was Stripe, Bank DuitNow, or Touch ’n Go.
--
-- Payment confirmation and publication are deliberately separate transactions:
-- payment records the entitlement, while publish_paid_draft() copies the
-- latest saved draft only after the owner supplies the exact acknowledgement.
-- Every lifecycle mutation locks the order before the card.

-- ---------------------------------------------------------------------------
-- 1. Draft concurrency/activity metadata
-- ---------------------------------------------------------------------------

alter table public.cards
  add column if not exists draft_version bigint,
  add column if not exists last_activity_at timestamptz;

-- Existing rows are valid at version 1. A NULL activity timestamp is honest:
-- no historical customer draft-save event can be reconstructed safely.
update public.cards
set draft_version = 1
where draft_version is null;

alter table public.cards
  alter column draft_version set default 1,
  alter column draft_version set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.cards'::regclass
      and conname = 'cards_draft_version_positive'
  ) then
    alter table public.cards
      add constraint cards_draft_version_positive check (draft_version >= 1);
  end if;
end $$;

-- The selected template is a property of the purchased card. The draft may
-- change its content, but never its template identity.
create or replace function public.cards_template_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE'
     and new.template_id is distinct from old.template_id then
    raise exception 'TEMPLATE_IMMUTABLE' using errcode = 'check_violation';
  end if;
  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists cards_template_immutable on public.cards;
create trigger cards_template_immutable
before update on public.cards
for each row execute function public.cards_template_immutable_guard();

create or replace function public.orders_template_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE'
     and new.template_id is distinct from old.template_id then
    raise exception 'TEMPLATE_IMMUTABLE' using errcode = 'check_violation';
  end if;
  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists orders_template_immutable on public.orders;
create trigger orders_template_immutable
before update on public.orders
for each row execute function public.orders_template_immutable_guard();

-- Once a card has a publication timestamp, its public snapshot, stable slug,
-- and first-publication time are frozen even for trusted direct table writers.
-- Availability RPCs may still flip only `is_published` for a reasoned disable
-- or restore, and the publication RPC is the only path that sets these fields
-- from an unpublished paid draft.
create or replace function public.cards_published_snapshot_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE' and old.published_at is not null and (
    new.custom_data is distinct from old.custom_data
    or new.custom_data_draft is distinct from old.custom_data_draft
    or new.published_at is distinct from old.published_at
    or new.slug is distinct from old.slug
  ) then
    raise exception 'PUBLISHED_SNAPSHOT_IMMUTABLE' using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists cards_published_snapshot_immutable on public.cards;
create trigger cards_published_snapshot_immutable
before update on public.cards
for each row execute function public.cards_published_snapshot_guard();

-- ---------------------------------------------------------------------------
-- 2. Append-only publication acknowledgement audit
-- ---------------------------------------------------------------------------

create table if not exists public.card_publication_actions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete restrict,
  owner_id uuid not null references public.users(id) on delete restrict,
  draft_version bigint not null check (draft_version >= 1),
  acknowledgement text not null,
  published_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint card_publication_actions_one_per_card unique (card_id),
  constraint card_publication_actions_acknowledgement_exact check (
    acknowledgement = 'I understand that this invitation will become public and read-only.'
  )
);

create index if not exists card_publication_actions_owner_idx
  on public.card_publication_actions(owner_id, created_at desc);

alter table public.card_publication_actions enable row level security;

revoke insert, update, delete on public.card_publication_actions
  from public, anon, authenticated, service_role;
grant select on public.card_publication_actions to authenticated, service_role;

drop policy if exists "card owners can read publication actions"
  on public.card_publication_actions;
create policy "card owners can read publication actions"
  on public.card_publication_actions
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.cards c
      where c.id = card_publication_actions.card_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "admins can read publication actions"
  on public.card_publication_actions;
create policy "admins can read publication actions"
  on public.card_publication_actions
  for select to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and u.role = 'admin'
    )
  );

create or replace function public.prevent_card_publication_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP <> 'INSERT' then
    raise exception 'IMMUTABLE_PUBLICATION_AUDIT' using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists card_publication_actions_immutable
  on public.card_publication_actions;
create trigger card_publication_actions_immutable
before update or delete on public.card_publication_actions
for each row execute function public.prevent_card_publication_audit_mutation();

-- The audit row is inserted only by the guarded publication RPC below. The
-- function owner retains table access while direct service-role DML is closed.

-- ---------------------------------------------------------------------------
-- 3. Lifecycle trigger permission for the publication transaction
-- ---------------------------------------------------------------------------

create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Existing trusted payment/availability RPCs use this transaction-local
  -- marker. The new publication RPC has its own marker so payment completion
  -- cannot accidentally become a publication capability.
  if coalesce(current_setting('app.paid_draft_publication', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  if coalesce(current_setting('app.payment_completion', true), '') = 'on' then
    if TG_OP = 'DELETE' then return old; end if;
    return new;
  end if;

  if TG_OP = 'INSERT' and new.is_published is true then
    raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
  end if;

  if TG_OP = 'UPDATE' then
    if new.is_published is distinct from old.is_published then
      raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
    end if;
    if new.custom_data_draft is distinct from old.custom_data_draft
       and exists (
         select 1
         from public.duitnow_transfer_submissions s
         join public.orders o on o.id = s.order_id
         where s.order_id = old.order_id
           and o.status = 'pending'
           and not exists (
             select 1 from public.duitnow_payment_reviews r
             where r.submission_id = s.id
           )
       ) then
      raise exception 'DRAFT_LOCKED_PENDING_REVIEW' using errcode = 'check_violation';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    if exists (
      select 1 from public.orders
      where id = old.order_id and status = 'paid'
    ) then
      raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation';
    end if;
    if exists (
      select 1 from public.duitnow_transfer_submissions s
      where s.order_id = old.order_id
    ) then
      raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED' using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Paid transitions must have one matching, unpublished paid draft
-- ---------------------------------------------------------------------------

-- Manual review predates this migration and updates `orders` directly after
-- its own order/attempt/card checks. Keep that path subject to the same final
-- database boundary as Stripe: a status transition to paid is valid only when
-- the order and its one card still agree on owner/template and the live draft
-- is present. The trigger also closes a direct service-role status bypass.
create or replace function public.orders_paid_draft_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.cards%rowtype;
begin
  if new.status is distinct from 'paid' then
    return new;
  end if;
  if TG_OP = 'UPDATE' and old.status = 'paid' then
    return new;
  end if;

  if new.manual_paid_draft is not true
     or new.payment_method is null
     or new.payment_completed_at is null then
    raise exception 'PAID_DRAFT_PAYMENT_METADATA_REQUIRED'
      using errcode = 'check_violation';
  end if;

  select * into v_card
  from public.cards
  where order_id = new.id
  for update;
  if not found then
    raise exception 'ORDER_CARD_MISSING'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.user_id is distinct from new.user_id
     or v_card.template_id is distinct from new.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.is_published or v_card.custom_data_draft is null then
    raise exception 'FULFILLMENT_SNAPSHOT_MISSING'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_paid_draft on public.orders;
create trigger orders_paid_draft
before insert or update of status on public.orders
for each row execute function public.orders_paid_draft_guard();

revoke all on function public.orders_paid_draft_guard() from public, anon, authenticated;
grant execute on function public.orders_paid_draft_guard() to service_role;

-- ---------------------------------------------------------------------------
-- 5. Stripe completion: payment creates a private paid draft only
-- ---------------------------------------------------------------------------

create or replace function public.complete_order_payment(
  p_order_id uuid,
  p_method text,
  p_reference text,
  p_draft_snapshot jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
begin
  if p_method not in ('stripe', 'duitnow', 'tng') then
    raise exception 'METHOD_INVALID' using errcode = 'check_violation';
  end if;
  if p_method in ('duitnow', 'tng') then
    raise exception 'MANUAL_REVIEW_REQUIRED' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if coalesce(btrim(p_reference), '') = '' then
    raise exception 'REFERENCE_INVALID' using errcode = 'check_violation';
  end if;

  -- First-payment-wins boundary. A retry returns without changing the winner,
  -- evidence, draft, or publication state.
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('won', false, 'reason', 'ORDER_NOT_FOUND');
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object(
      'won', false,
      'reason', 'ALREADY_COMPLETED',
      'paidDraft', v_order.manual_paid_draft
    );
  end if;
  if v_order.stripe_session_id is distinct from btrim(p_reference) then
    raise exception 'CHECKOUT_SESSION_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  -- The card is locked after the order, matching every other lifecycle
  -- operation. The caller-provided snapshot is intentionally ignored: the
  -- live saved draft is the only customer content that becomes the paid
  -- entitlement, and immutable payment evidence remains in its own tables.
  select * into v_card
  from public.cards
  where order_id = p_order_id
  for update;
  if not found then
    raise exception 'ORDER_CARD_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.order_id is distinct from v_order.id
     or v_card.user_id is distinct from v_order.user_id
     or v_card.template_id is distinct from v_order.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.is_published or v_card.custom_data_draft is null then
    raise exception 'FULFILLMENT_SNAPSHOT_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;

  update public.orders
  set status = 'paid',
      payment_method = 'stripe',
      payment_completed_at = now(),
      manual_paid_draft = true,
      checkout_reservation_token = null,
      checkout_reserved_at = null,
      stripe_session_expires_at = null
  where id = v_order.id;

  return jsonb_build_object(
    'won', true,
    'method', 'stripe',
    'paidDraft', true,
    'published', false,
    'cardId', v_card.id,
    'draftVersion', v_card.draft_version,
    'lastActivityAt', v_card.last_activity_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Payment/status recovery: preserve paid drafts, never publish
-- ---------------------------------------------------------------------------

create or replace function public.finalize_paid_order(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_last_action text;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status is distinct from 'paid' then raise exception 'ORDER_NOT_PAID'; end if;

  select * into v_card
  from public.cards
  where order_id = p_order_id
  for update;
  if not found then raise exception 'CARD_MISSING'; end if;
  if v_card.order_id is distinct from v_order.id
     or v_card.user_id is distinct from v_order.user_id
     or v_card.template_id is distinct from v_order.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;

  if v_card.is_published then
    return json_build_object(
      'state', 'published', 'slug', v_card.slug, 'promoted', false
    );
  end if;

  select action into v_last_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;
  if v_last_action = 'disabled' then
    return json_build_object(
      'state', 'unavailable', 'slug', v_card.slug, 'promoted', false
    );
  end if;

  -- A paid unpublished row from before this migration is recoverable only if
  -- its live draft marker still exists. Marking the entitlement is safe; no
  -- content or visibility is changed here.
  if v_card.custom_data_draft is null then
    raise exception 'CARD_NOT_PROMOTABLE' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if not v_order.manual_paid_draft then
    update public.orders
    set manual_paid_draft = true
    where id = v_order.id and status = 'paid';
  end if;

  return json_build_object(
    'state', 'paid_draft', 'slug', v_card.slug, 'promoted', false,
    'draftVersion', v_card.draft_version,
    'lastActivityAt', v_card.last_activity_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Owner/version-guarded draft persistence
-- ---------------------------------------------------------------------------

create or replace function public.save_card_draft(
  p_card_id uuid,
  p_owner uuid,
  p_draft jsonb,
  p_expected_draft_version bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_saved_version bigint;
  v_saved_at timestamptz;
begin
  if p_owner is null then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if p_expected_draft_version is null then
    raise exception 'DRAFT_VERSION_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_expected_draft_version < 1 then
    raise exception 'DRAFT_VERSION_INVALID' using errcode = 'check_violation';
  end if;
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'DRAFT_INVALID' using errcode = 'check_violation';
  end if;

  -- Discovery is intentionally unlocked. The durable acquisition sequence
  -- starts with the related order and then the card.
  select order_id into v_order_id
  from public.cards
  where id = p_card_id;
  if not found or v_order_id is null then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;
  if not found then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select * into v_card
  from public.cards
  where id = p_card_id
  for update;
  if not found or v_card.order_id is distinct from v_order.id then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.user_id is distinct from p_owner
     or v_card.user_id is distinct from p_owner then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if v_order.status not in ('pending', 'paid')
     or (v_order.status = 'paid' and not v_order.manual_paid_draft)
     or v_card.is_published
     or v_card.custom_data_draft is null then
    raise exception 'CARD_NOT_EDITABLE' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.template_id is distinct from v_order.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if p_draft ? 'templateId'
     and p_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;

  -- Same-row predicates make a stale save unable to recreate a consumed draft
  -- after publication, even if a future caller bypasses the preceding reads.
  update public.cards
  set custom_data_draft = p_draft,
      draft_version = draft_version + 1,
      last_activity_at = now()
  where id = v_card.id
    and is_published = false
    and custom_data_draft is not null
    and draft_version = p_expected_draft_version
  returning draft_version, last_activity_at
  into v_saved_version, v_saved_at;

  if not found then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;

  return jsonb_build_object(
    'saved', true,
    'draftVersion', v_saved_version,
    'lastActivityAt', v_saved_at
  );
end;
$$;

-- Keep the pre-033 two-argument service contract for existing callers and
-- migration tests. New server code must use save_card_draft() with owner and
-- expected version; this wrapper snapshots the current version while holding
-- the same order-then-card transaction boundary.
create or replace function public.update_card_draft_if_editing(
  p_card_id uuid,
  p_draft jsonb
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_version bigint;
begin
  select user_id, draft_version into v_owner, v_version
  from public.cards
  where id = p_card_id;
  if not found then return false; end if;
  perform public.save_card_draft(p_card_id, v_owner, p_draft, v_version);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Explicit owner publication of the latest saved draft
-- ---------------------------------------------------------------------------

create or replace function public.publish_paid_draft(
  p_card_id uuid,
  p_owner uuid,
  p_acknowledgement text,
  p_expected_draft_version bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_last_action text;
  v_snapshot jsonb;
  v_published_at timestamptz;
begin
  if p_acknowledgement is distinct from
     'I understand that this invitation will become public and read-only.' then
    raise exception 'ACKNOWLEDGEMENT_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_expected_draft_version is null then
    raise exception 'DRAFT_VERSION_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_expected_draft_version < 1 then
    raise exception 'DRAFT_VERSION_INVALID' using errcode = 'check_violation';
  end if;

  -- Deterministic lifecycle lock order: related order, then card.
  select order_id into v_order_id
  from public.cards
  where id = p_card_id;
  if not found or v_order_id is null then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select * into v_order
  from public.orders
  where id = v_order_id
  for update;
  if not found then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select * into v_card
  from public.cards
  where id = p_card_id
  for update;
  if not found or v_card.order_id is distinct from v_order.id then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if p_owner is null
     or v_order.user_id is distinct from p_owner
     or v_card.user_id is distinct from p_owner then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if v_order.status is distinct from 'paid' then
    raise exception 'ORDER_NOT_PAID' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.template_id is distinct from v_order.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;

  -- A retry after the first publication is a read-only acknowledgement of the
  -- existing public snapshot. It never writes the card or a second audit row.
  if v_card.is_published then
    return jsonb_build_object(
      'published', true,
      'replayed', true,
      'state', 'published',
      'slug', v_card.slug,
      'draftVersion', v_card.draft_version,
      'publishedAt', v_card.published_at
    );
  end if;

  select action into v_last_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;
  if v_last_action = 'disabled' then
    return jsonb_build_object(
      'published', false,
      'replayed', false,
      'state', 'unavailable'
    );
  end if;

  if v_card.custom_data_draft is null then
    raise exception 'CARD_NOT_PROMOTABLE' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;

  -- Recover a paid unpublished row created before this migration when its
  -- live draft marker is still present. This is entitlement normalization, not
  -- publication, and it remains inside the order lock.
  if not v_order.manual_paid_draft then
    update public.orders
    set manual_paid_draft = true
    where id = v_order.id and status = 'paid';
  end if;

  v_snapshot := v_card.custom_data_draft;
  v_published_at := coalesce(v_card.published_at, now());

  perform set_config('app.paid_draft_publication', 'on', true);
  update public.cards
  set custom_data = v_snapshot,
      custom_data_draft = null,
      is_published = true,
      published_at = v_published_at
  where id = v_card.id
    and is_published = false
    and custom_data_draft is not null
    and draft_version = p_expected_draft_version;
  if not found then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;

  insert into public.card_publication_actions(
    card_id, owner_id, draft_version, acknowledgement, published_snapshot
  ) values (
    v_card.id, p_owner, p_expected_draft_version,
    p_acknowledgement, v_snapshot
  );

  return jsonb_build_object(
    'published', true,
    'replayed', false,
    'state', 'published',
    'slug', v_card.slug,
    'eventName', public.duitnow_card_event_name(v_snapshot),
    'draftVersion', p_expected_draft_version,
    'publishedAt', v_published_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Paid-draft owner asset writes
-- ---------------------------------------------------------------------------

-- Migration 018 intentionally limited card-assets writes to unpaid cards.
-- Keep the same owner/path/type boundary while admitting the one editable
-- paid-draft state. Published and unavailable cards remain immutable.
drop policy if exists "card-assets owner insert" on storage.objects;
drop policy if exists "card-assets owner update" on storage.objects;
drop policy if exists "card-assets owner delete" on storage.objects;

create policy "card-assets owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = (select auth.uid())
        and c.is_published = false
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );

create policy "card-assets owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-assets'
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = (select auth.uid())
        and c.is_published = false
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  )
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = (select auth.uid())
        and c.is_published = false
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );

create policy "card-assets owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-assets'
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = (select auth.uid())
        and c.is_published = false
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );

-- ---------------------------------------------------------------------------
-- 10. Guarded RPC ACLs
-- ---------------------------------------------------------------------------

revoke all on function public.complete_order_payment(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_order_payment(uuid, text, text, jsonb)
  to service_role;

revoke all on function public.finalize_paid_order(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid)
  to service_role;

revoke all on function public.save_card_draft(uuid, uuid, jsonb, bigint)
  from public, anon, authenticated;
grant execute on function public.save_card_draft(uuid, uuid, jsonb, bigint)
  to service_role;

revoke all on function public.publish_paid_draft(uuid, uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.publish_paid_draft(uuid, uuid, text, bigint)
  to service_role;

revoke all on function public.update_card_draft_if_editing(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_card_draft_if_editing(uuid, jsonb)
  to service_role;
