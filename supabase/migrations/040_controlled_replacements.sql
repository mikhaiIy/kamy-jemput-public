-- Controlled replacement and terminal retirement for paid invitations.
--
-- A replacement is an administrator-granted entitlement. It is not a second
-- payment, and it never borrows the predecessor's payment evidence. The
-- predecessor remains the only public invitation until the cutover RPC commits
-- the replacement publication and the predecessor retirement in one tx.

-- ---------------------------------------------------------------------------
-- 1. Durable replacement entitlement and publication lineage
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists entitlement_source text not null default 'payment',
  add column if not exists replacement_grant_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_entitlement_source_check'
  ) then
    alter table public.orders add constraint orders_entitlement_source_check
      check (entitlement_source in ('payment', 'controlled_replacement'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_replacement_entitlement_fields_check'
  ) then
    alter table public.orders add constraint orders_replacement_entitlement_fields_check
      check (
        entitlement_source = 'payment'
        or (
          status = 'paid'
          and manual_paid_draft is true
          and payment_method is null
          and payment_completed_at is null
          and stripe_session_id is null
          and checkout_reservation_token is null
          and checkout_reserved_at is null
          and stripe_session_expires_at is null
        )
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_replacement_grant_pair_check'
  ) then
    alter table public.orders add constraint orders_replacement_grant_pair_check
      check (
        (entitlement_source = 'payment' and replacement_grant_id is null)
        or (entitlement_source = 'controlled_replacement' and replacement_grant_id is not null)
      );
  end if;
end
$$;

create table if not exists public.card_replacement_grants (
  id uuid primary key default gen_random_uuid(),
  predecessor_card_id uuid not null references public.cards(id) on delete restrict,
  predecessor_order_id uuid not null references public.orders(id) on delete restrict,
  predecessor_publication_id uuid not null references public.card_publications(id) on delete restrict,
  replacement_card_id uuid not null references public.cards(id) on delete restrict,
  replacement_order_id uuid not null references public.orders(id) on delete restrict,
  owner_id uuid not null references public.users(id) on delete restrict,
  administrator_id uuid not null references public.users(id) on delete restrict,
  request_id uuid not null,
  reason text not null,
  granted_at timestamptz not null default clock_timestamp(),
  constraint card_replacement_grants_one_successor unique (predecessor_card_id),
  constraint card_replacement_grants_one_predecessor_per_card unique (replacement_card_id),
  constraint card_replacement_grants_one_replacement_order unique (replacement_order_id),
  constraint card_replacement_grants_request_unique unique (request_id),
  constraint card_replacement_grants_reason_valid check (
    octet_length(btrim(reason)) between 1 and 1000 and btrim(reason) = reason
  ),
  constraint card_replacement_grants_distinct_cards check (
    predecessor_card_id <> replacement_card_id
  ),
  constraint card_replacement_grants_distinct_orders check (
    predecessor_order_id <> replacement_order_id
  )
);

create index if not exists card_replacement_grants_owner_recent_idx
  on public.card_replacement_grants(owner_id, granted_at desc, id desc);
create index if not exists card_replacement_grants_replacement_order_idx
  on public.card_replacement_grants(replacement_order_id);

alter table public.orders
  drop constraint if exists orders_replacement_grant_id_fkey;
alter table public.orders
  add constraint orders_replacement_grant_id_fkey
  foreign key (replacement_grant_id)
  references public.card_replacement_grants(id)
  on delete restrict;

create table if not exists public.card_replacement_asset_copies (
  grant_id uuid not null references public.card_replacement_grants(id) on delete restrict,
  source_object_path text not null,
  target_object_path text not null,
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  source_size_bytes integer not null check (source_size_bytes between 1 and 5242880),
  source_content_type text not null check (source_content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  state text not null default 'pending' check (state in ('pending', 'ready')),
  ready_sha256 text,
  ready_size_bytes integer,
  ready_content_type text,
  ready_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  primary key (grant_id, source_object_path),
  unique (target_object_path),
  constraint card_replacement_asset_ready_metadata_check check (
    (state = 'pending' and ready_sha256 is null and ready_size_bytes is null
      and ready_content_type is null and ready_at is null)
    or (state = 'ready' and ready_sha256 = source_sha256
      and ready_size_bytes = source_size_bytes
      and ready_content_type = source_content_type and ready_at is not null)
  )
);

create index if not exists card_replacement_asset_copies_grant_state_idx
  on public.card_replacement_asset_copies(grant_id, state, source_object_path);

create table if not exists public.card_replacement_asset_preparations (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.card_replacement_grants(id) on delete restrict,
  source_publication_id uuid not null references public.card_publications(id) on delete restrict,
  target_draft_version bigint not null check (target_draft_version >= 1),
  target_draft_sha256 text not null check (target_draft_sha256 ~ '^[a-f0-9]{64}$'),
  target_draft jsonb not null check (jsonb_typeof(target_draft) = 'object'),
  prepared_at timestamptz not null default clock_timestamp(),
  unique (grant_id, target_draft_version)
);

create index if not exists card_replacement_asset_preparations_latest_idx
  on public.card_replacement_asset_preparations(grant_id, target_draft_version desc, prepared_at desc);

create table if not exists public.card_replacement_cutovers (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.card_replacement_grants(id) on delete restrict,
  predecessor_card_id uuid not null references public.cards(id) on delete restrict,
  predecessor_order_id uuid not null references public.orders(id) on delete restrict,
  predecessor_publication_id uuid not null references public.card_publications(id) on delete restrict,
  replacement_card_id uuid not null references public.cards(id) on delete restrict,
  replacement_order_id uuid not null references public.orders(id) on delete restrict,
  replacement_publication_id uuid not null references public.card_publications(id) on delete restrict,
  administrator_id uuid not null references public.users(id) on delete restrict,
  request_id uuid not null unique,
  reason text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  unique (grant_id),
  unique (predecessor_card_id),
  unique (replacement_card_id),
  constraint card_replacement_cutovers_reason_valid check (
    octet_length(btrim(reason)) between 1 and 1000 and btrim(reason) = reason
  )
);

create index if not exists card_replacement_cutovers_owner_lineage_idx
  on public.card_replacement_cutovers(administrator_id, created_at desc, id desc);

-- A publication row identifies its publication path without changing the
-- established acknowledgement contract used by ordinary first publication.
alter table public.card_publications
  add column if not exists publication_kind text not null default 'owner';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.card_publications'::regclass
      and conname = 'card_publications_publication_kind_check'
  ) then
    alter table public.card_publications add constraint card_publications_publication_kind_check
      check (publication_kind in ('owner', 'controlled_replacement'));
  end if;
end
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'card_replacement_grants',
    'card_replacement_asset_preparations',
    'card_replacement_cutovers'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v_table);
    execute format('grant select on public.%I to service_role, authenticated', v_table);
  end loop;
end
$$;

create or replace function public.prevent_card_replacement_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP <> 'INSERT' then
    raise exception 'IMMUTABLE_REPLACEMENT_HISTORY' using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

-- Asset-copy rows intentionally transition from pending to ready. They are
-- protected by the readiness RPC and metadata checks, rather than the
-- append-only lineage trigger used by grants, preparations and cutovers.
drop trigger if exists card_replacement_asset_copies_immutable
  on public.card_replacement_asset_copies;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'card_replacement_grants',
    'card_replacement_asset_preparations',
    'card_replacement_cutovers'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_immutable', v_table);
    execute format(
      'create trigger %I before update or delete on public.%I for each row execute function public.prevent_card_replacement_history_mutation()',
      v_table || '_immutable', v_table
    );
  end loop;
end
$$;

revoke all on function public.prevent_card_replacement_history_mutation() from public, anon, authenticated, service_role;

drop policy if exists "replacement owners can read grants" on public.card_replacement_grants;
create policy "replacement owners can read grants"
on public.card_replacement_grants for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "replacement admins can read grants" on public.card_replacement_grants;
create policy "replacement admins can read grants"
on public.card_replacement_grants for select to authenticated
using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin'));

drop policy if exists "replacement owners can read cutovers" on public.card_replacement_cutovers;
create policy "replacement owners can read cutovers"
on public.card_replacement_cutovers for select to authenticated
using (exists (
  select 1 from public.cards c
  where c.id = card_replacement_cutovers.predecessor_card_id
    and c.user_id = (select auth.uid())
));

drop policy if exists "replacement admins can read cutovers" on public.card_replacement_cutovers;
create policy "replacement admins can read cutovers"
on public.card_replacement_cutovers for select to authenticated
using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin'));

drop policy if exists "replacement owners can read asset preparations" on public.card_replacement_asset_preparations;
create policy "replacement owners can read asset preparations"
on public.card_replacement_asset_preparations for select to authenticated
using (exists (
  select 1 from public.card_replacement_grants g
  where g.id = grant_id and g.owner_id = (select auth.uid())
));

drop policy if exists "replacement admins can read asset preparations" on public.card_replacement_asset_preparations;
create policy "replacement admins can read asset preparations"
on public.card_replacement_asset_preparations for select to authenticated
using (exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin'));

-- Asset paths are administrator/server metadata, not a browser-readable
-- invitation surface. Service code reads them; owner/admin UI reads only the
-- preparation status and lineage fields through its trusted server queries.
revoke select on public.card_replacement_asset_copies from authenticated;
grant select on public.card_replacement_asset_copies to service_role;

-- ---------------------------------------------------------------------------
-- 2. Derived replacement state and the paid-entitlement guard
-- ---------------------------------------------------------------------------

create or replace function public.card_is_retired(p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.card_replacement_cutovers c
    where c.predecessor_card_id = p_card_id
  )
$$;

create or replace function public.card_has_pending_replacement(p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.card_replacement_grants g
    left join public.card_replacement_cutovers c on c.grant_id = g.id
    where c.id is null
      and (g.predecessor_card_id = p_card_id or g.replacement_card_id = p_card_id)
  )
$$;

create or replace function public.card_replacement_state(p_card_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.card_is_retired(p_card_id) then return 'retired'; end if;
  if public.card_has_pending_replacement(p_card_id) then return 'pending'; end if;
  return null;
end;
$$;

revoke all on function public.card_is_retired(uuid) from public, anon, authenticated;
revoke all on function public.card_has_pending_replacement(uuid) from public, anon, authenticated;
revoke all on function public.card_replacement_state(uuid) from public, anon, authenticated;
grant execute on function public.card_is_retired(uuid) to service_role;
grant execute on function public.card_has_pending_replacement(uuid) to service_role;
grant execute on function public.card_replacement_state(uuid) to service_role;

create or replace function public.orders_controlled_entitlement_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant public.card_replacement_grants%rowtype;
begin
  if new.entitlement_source = 'controlled_replacement' then
    if new.replacement_grant_id is null
       or new.status is distinct from 'paid'
       or new.manual_paid_draft is not true
       or new.payment_method is not null
       or new.payment_completed_at is not null
       or new.stripe_session_id is not null
       or new.checkout_reservation_token is not null
       or new.checkout_reserved_at is not null
       or new.stripe_session_expires_at is not null then
      raise exception 'CONTROLLED_REPLACEMENT_PAYMENT_METADATA_FORBIDDEN'
        using errcode = 'check_violation';
    end if;
    select * into v_grant from public.card_replacement_grants where id = new.replacement_grant_id;
    if not found or v_grant.replacement_order_id is distinct from new.id
       or v_grant.owner_id is distinct from new.user_id
       or v_grant.replacement_card_id is null then
      raise exception 'CONTROLLED_REPLACEMENT_ENTITLEMENT_INVALID'
        using errcode = 'check_violation';
    end if;
  elsif new.replacement_grant_id is not null then
    raise exception 'CONTROLLED_REPLACEMENT_ENTITLEMENT_INVALID'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_controlled_entitlement on public.orders;
create trigger orders_controlled_entitlement
before insert or update on public.orders
for each row execute function public.orders_controlled_entitlement_guard();

revoke all on function public.orders_controlled_entitlement_guard() from public, anon, authenticated, service_role;

-- Replace the normal paid-draft trigger with a branch that accepts only the
-- explicit grant entitlement. Payment-backed rows retain the old evidence
-- requirements.
create or replace function public.orders_paid_draft_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.cards%rowtype;
  v_grant public.card_replacement_grants%rowtype;
begin
  if new.status is distinct from 'paid' then return new; end if;
  if TG_OP = 'UPDATE' and old.status = 'paid' then return new; end if;

  if new.entitlement_source = 'controlled_replacement' then
    select * into v_grant from public.card_replacement_grants
    where id = new.replacement_grant_id;
    if not found or v_grant.replacement_order_id is distinct from new.id then
      raise exception 'CONTROLLED_REPLACEMENT_ENTITLEMENT_INVALID';
    end if;
    select * into v_card from public.cards where order_id = new.id for update;
    if not found or v_card.id is distinct from v_grant.replacement_card_id
       or v_card.user_id is distinct from new.user_id
       or v_card.template_id is distinct from new.template_id
       or v_card.is_published
       or v_card.custom_data_draft is null then
      raise exception 'FULFILLMENT_SNAPSHOT_MISSING'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
    return new;
  end if;

  if new.manual_paid_draft is not true
     or new.payment_method is null
     or new.payment_completed_at is null then
    raise exception 'PAID_DRAFT_PAYMENT_METADATA_REQUIRED'
      using errcode = 'check_violation';
  end if;
  select * into v_card from public.cards where order_id = new.id for update;
  if not found then
    raise exception 'ORDER_CARD_MISSING' using errcode = 'object_not_in_prerequisite_state';
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

revoke all on function public.orders_paid_draft_guard() from public, anon, authenticated, service_role;
grant execute on function public.orders_paid_draft_guard() to service_role;

-- No payment evidence row may be created for the grant entitlement, even by a
-- trusted service-role caller that bypasses browser RLS.
create or replace function public.prevent_controlled_replacement_payment_evidence()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_source text;
begin
  if TG_TABLE_NAME = 'manual_payment_attempts' then
    v_order_id := new.order_id;
  elsif TG_TABLE_NAME = 'duitnow_transfer_submissions' then
    v_order_id := new.order_id;
  elsif TG_TABLE_NAME = 'payment_receipts' then
    select order_id into v_order_id from public.manual_payment_attempts where id = new.attempt_id;
  elsif TG_TABLE_NAME = 'manual_payment_reviews' then
    select a.order_id into v_order_id
    from public.payment_receipts r
    join public.manual_payment_attempts a on a.id = r.attempt_id
    where r.id = new.receipt_id;
  elsif TG_TABLE_NAME = 'duitnow_payment_reviews' then
    select order_id into v_order_id from public.duitnow_transfer_submissions where id = new.submission_id;
  end if;
  if v_order_id is not null then
    select entitlement_source into v_source from public.orders where id = v_order_id;
    if v_source = 'controlled_replacement' then
      raise exception 'CONTROLLED_REPLACEMENT_PAYMENT_FORBIDDEN'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'manual_payment_attempts',
    'payment_receipts',
    'manual_payment_reviews',
    'duitnow_transfer_submissions',
    'duitnow_payment_reviews'
  ] loop
    execute format('drop trigger if exists %I on public.%I', v_table || '_controlled_replacement_guard', v_table);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function public.prevent_controlled_replacement_payment_evidence()',
      v_table || '_controlled_replacement_guard', v_table
    );
  end loop;
end
$$;

revoke all on function public.prevent_controlled_replacement_payment_evidence() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Guarded administrator grant and idempotent asset preparation
-- ---------------------------------------------------------------------------

create or replace function public.create_card_replacement_grant(
  p_predecessor_card_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_request_id uuid,
  p_replacement_order_id uuid,
  p_replacement_card_id uuid,
  p_slug text,
  p_replacement_draft jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_predecessor_order_id uuid;
  v_source_order public.orders%rowtype;
  v_source_card public.cards%rowtype;
  v_source_publication public.card_publications%rowtype;
  v_grant public.card_replacement_grants%rowtype;
  v_existing public.card_replacement_grants%rowtype;
  v_target_order public.orders%rowtype;
  v_target_card public.cards%rowtype;
  v_latest_action text;
  v_draft jsonb;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if coalesce(btrim(p_reason), '') = ''
     or octet_length(btrim(p_reason)) > 1000
     or btrim(p_reason) <> p_reason then
    raise exception 'REASON_INVALID';
  end if;
  if p_replacement_order_id is null or p_replacement_card_id is null then
    raise exception 'REPLACEMENT_IDS_REQUIRED';
  end if;

  select order_id into v_predecessor_order_id
  from public.cards where id = p_predecessor_card_id;
  if not found or v_predecessor_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;

  -- The established lifecycle order is order then card. A source and its
  -- future target never share rows at this point, so this remains the same
  -- deterministic order used by payment/publication operations.
  select * into v_source_order from public.orders
  where id = v_predecessor_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_source_card from public.cards
  where id = p_predecessor_card_id for update;
  if not found or v_source_card.order_id is distinct from v_source_order.id then
    raise exception 'CARD_NOT_FOUND';
  end if;

  select * into v_existing from public.card_replacement_grants
  where request_id = p_request_id or predecessor_card_id = p_predecessor_card_id;
  if found then
    if v_existing.predecessor_card_id is distinct from p_predecessor_card_id
       or v_existing.replacement_order_id is distinct from p_replacement_order_id
       or v_existing.replacement_card_id is distinct from p_replacement_card_id then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object(
      'grantId', v_existing.id, 'replayed', true,
      'predecessorCardId', v_existing.predecessor_card_id,
      'predecessorOrderId', v_existing.predecessor_order_id,
      'predecessorPublicationId', v_existing.predecessor_publication_id,
      'replacementCardId', v_existing.replacement_card_id,
      'replacementOrderId', v_existing.replacement_order_id,
      'ownerId', v_existing.owner_id,
      'reason', v_existing.reason,
      'grantedAt', v_existing.granted_at
    );
  end if;

  if p_replacement_draft is null or jsonb_typeof(p_replacement_draft) <> 'object' then
    raise exception 'DRAFT_INVALID';
  end if;

  if public.card_is_retired(v_source_card.id) then raise exception 'RETIRED'; end if;
  if public.card_has_pending_replacement(v_source_card.id) then
    raise exception 'REPLACEMENT_PENDING';
  end if;
  if v_source_order.status is distinct from 'paid'
     or v_source_order.entitlement_source not in ('payment', 'controlled_replacement')
     or v_source_card.user_id is distinct from v_source_order.user_id then
    raise exception 'PREDECESSOR_NOT_ELIGIBLE';
  end if;
  if v_source_card.current_publication_id is null or v_source_card.published_at is null then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  select * into v_source_publication from public.card_publications
  where id = v_source_card.current_publication_id and card_id = v_source_card.id;
  if not found or jsonb_typeof(v_source_publication.snapshot) <> 'object' then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  select action into v_latest_action from public.card_availability_actions
  where card_id = v_source_card.id order by created_at desc, id desc limit 1;
  if not v_source_card.is_published and v_latest_action is distinct from 'disabled' then
    raise exception 'PREDECESSOR_NOT_AVAILABLE';
  end if;
  if v_source_card.active_edit_window_id is not null then
    raise exception 'EDIT_WINDOW_ACTIVE';
  end if;
  if p_replacement_draft ? 'templateId'
     and p_replacement_draft->>'templateId' is distinct from v_source_card.template_id then
    raise exception 'TEMPLATE_MISMATCH';
  end if;

  v_draft := p_replacement_draft;
  insert into public.orders(
    id, user_id, template_id, status, price_myr, custom_data,
    entitlement_source, manual_paid_draft, payment_method, payment_completed_at
  ) values (
    p_replacement_order_id, v_source_order.user_id, v_source_order.template_id,
    'pending', v_source_order.price_myr, v_draft,
    'payment', false, null, null
  ) returning * into v_target_order;

  insert into public.cards(
    id, order_id, user_id, template_id, slug, custom_data,
    custom_data_draft, is_published, published_at
  ) values (
    p_replacement_card_id, v_target_order.id, v_source_order.user_id,
    v_source_order.template_id, p_slug, v_draft, v_draft, false, null
  ) returning * into v_target_card;

  insert into public.card_replacement_grants(
    predecessor_card_id, predecessor_order_id, predecessor_publication_id,
    replacement_card_id, replacement_order_id, owner_id, administrator_id,
    request_id, reason
  ) values (
    v_source_card.id, v_source_order.id, v_source_publication.id,
    v_target_card.id, v_target_order.id, v_source_order.user_id, p_admin_id,
    p_request_id, btrim(p_reason)
  ) returning * into v_grant;

  update public.orders
  set status = 'paid',
      manual_paid_draft = true,
      entitlement_source = 'controlled_replacement',
      replacement_grant_id = v_grant.id,
      payment_method = null,
      payment_completed_at = null,
      stripe_session_id = null,
      checkout_reservation_token = null,
      checkout_reserved_at = null,
      stripe_session_expires_at = null
  where id = v_target_order.id;

  return jsonb_build_object(
    'grantId', v_grant.id, 'replayed', false,
    'predecessorCardId', v_source_card.id,
    'predecessorOrderId', v_source_order.id,
    'predecessorPublicationId', v_source_publication.id,
    'replacementCardId', v_target_card.id,
    'replacementOrderId', v_target_order.id,
    'ownerId', v_grant.owner_id,
    'reason', v_grant.reason,
    'grantedAt', v_grant.granted_at,
    'draftVersion', v_target_card.draft_version
  );
exception
  when unique_violation then
    raise exception 'REPLACEMENT_CONFLICT' using errcode = 'serialization_failure';
end;
$$;

create or replace function public.plan_card_replacement_assets(
  p_grant_id uuid,
  p_source_publication_id uuid,
  p_assets jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant public.card_replacement_grants%rowtype;
  v_source_order public.orders%rowtype;
  v_target_order public.orders%rowtype;
  v_source_card public.cards%rowtype;
  v_target_card public.cards%rowtype;
  v_asset jsonb;
  v_source_path text;
  v_target_path text;
  v_source_id text;
  v_target_id text;
  v_count integer := 0;
begin
  if p_assets is null or jsonb_typeof(p_assets) <> 'array' then raise exception 'ASSET_PLAN_INVALID'; end if;
  select * into v_grant from public.card_replacement_grants where id = p_grant_id for update;
  if not found then raise exception 'REPLACEMENT_GRANT_NOT_FOUND'; end if;
  if exists (select 1 from public.card_replacement_cutovers where grant_id = p_grant_id) then
    raise exception 'RETIRED';
  end if;

  -- Lock both order rows in ascending UUID order, then both card rows in
  -- ascending UUID order. This is the cutover lock order as well.
  if v_grant.predecessor_order_id < v_grant.replacement_order_id then
    select * into v_source_order from public.orders where id = v_grant.predecessor_order_id for update;
    select * into v_target_order from public.orders where id = v_grant.replacement_order_id for update;
  else
    select * into v_target_order from public.orders where id = v_grant.replacement_order_id for update;
    select * into v_source_order from public.orders where id = v_grant.predecessor_order_id for update;
  end if;
  if v_grant.predecessor_card_id < v_grant.replacement_card_id then
    select * into v_source_card from public.cards where id = v_grant.predecessor_card_id for update;
    select * into v_target_card from public.cards where id = v_grant.replacement_card_id for update;
  else
    select * into v_target_card from public.cards where id = v_grant.replacement_card_id for update;
    select * into v_source_card from public.cards where id = v_grant.predecessor_card_id for update;
  end if;
  if v_source_card.current_publication_id is distinct from p_source_publication_id
     or v_grant.predecessor_publication_id is distinct from p_source_publication_id then
    raise exception 'PREDECESSOR_PUBLICATION_CHANGED' using errcode = 'serialization_failure';
  end if;
  if v_target_order.entitlement_source is distinct from 'controlled_replacement'
     or v_target_card.order_id is distinct from v_target_order.id
     or v_target_card.is_published then
    raise exception 'REPLACEMENT_TARGET_INVALID';
  end if;
  v_source_id := v_grant.predecessor_card_id::text;
  v_target_id := v_grant.replacement_card_id::text;

  for v_asset in select value from jsonb_array_elements(p_assets) loop
    v_source_path := v_asset->>'sourceObjectPath';
    v_target_path := v_asset->>'targetObjectPath';
    if v_source_path is null or v_target_path is null
       or (v_source_path !~ ('^' || v_source_id || '/[a-z][a-z0-9_]{0,63}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$')
           and v_source_path !~ '^covers/[0-9a-fA-F-]{36}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$')
       or v_target_path !~ ('^' || v_target_id || '/[a-z][a-z0-9_]{0,63}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$') then
      raise exception 'ASSET_PLAN_INVALID';
    end if;
    if (v_asset->>'sha256') !~ '^[a-f0-9]{64}$'
       or (v_asset->>'sizeBytes')::integer not between 1 and 5242880
       or v_asset->>'contentType' not in ('image/jpeg','image/png','image/webp','image/gif') then
      raise exception 'ASSET_PLAN_INVALID';
    end if;
    insert into public.card_replacement_asset_copies(
      grant_id, source_object_path, target_object_path, source_sha256,
      source_size_bytes, source_content_type
    ) values (
      p_grant_id, v_source_path, v_target_path, v_asset->>'sha256',
      (v_asset->>'sizeBytes')::integer, v_asset->>'contentType'
    )
    on conflict (grant_id, source_object_path) do update
      set target_object_path = excluded.target_object_path,
          source_sha256 = excluded.source_sha256,
          source_size_bytes = excluded.source_size_bytes,
          source_content_type = excluded.source_content_type
      where card_replacement_asset_copies.state = 'pending'
        and card_replacement_asset_copies.target_object_path = excluded.target_object_path
        and card_replacement_asset_copies.source_sha256 = excluded.source_sha256
        and card_replacement_asset_copies.source_size_bytes = excluded.source_size_bytes
        and card_replacement_asset_copies.source_content_type = excluded.source_content_type;
    if not found then
      -- The conflict was already ready or the source mapping changed. Never
      -- replace a ready row or silently move a target object.
      if exists (
        select 1 from public.card_replacement_asset_copies c
        where c.grant_id = p_grant_id and c.source_object_path = v_source_path
          and (c.target_object_path is distinct from v_target_path
            or c.source_sha256 is distinct from v_asset->>'sha256'
            or c.source_size_bytes is distinct from (v_asset->>'sizeBytes')::integer
            or c.source_content_type is distinct from v_asset->>'contentType')
      ) then
        raise exception 'ASSET_PLAN_CONFLICT';
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'grantId', p_grant_id, 'assetCount',
    (select count(*) from public.card_replacement_asset_copies where grant_id = p_grant_id),
    'readyCount',
    (select count(*) from public.card_replacement_asset_copies where grant_id = p_grant_id and state = 'ready'),
    'targetDraftVersion', v_target_card.draft_version
  );
end;
$$;

create or replace function public.mark_card_replacement_asset_ready(
  p_grant_id uuid,
  p_source_object_path text,
  p_sha256 text,
  p_size_bytes integer,
  p_content_type text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_copy public.card_replacement_asset_copies%rowtype;
begin
  select * into v_copy from public.card_replacement_asset_copies
  where grant_id = p_grant_id and source_object_path = p_source_object_path
  for update;
  if not found then raise exception 'ASSET_PLAN_MISSING'; end if;
  if v_copy.state = 'ready' then
    if p_sha256 is distinct from v_copy.source_sha256
       or p_size_bytes is distinct from v_copy.source_size_bytes
       or p_content_type is distinct from v_copy.source_content_type then
      raise exception 'ASSET_COPY_CONFLICT';
    end if;
    return jsonb_build_object('ready', true, 'replayed', true, 'targetObjectPath', v_copy.target_object_path);
  end if;
  if p_sha256 is distinct from v_copy.source_sha256
     or p_size_bytes is distinct from v_copy.source_size_bytes
     or p_content_type is distinct from v_copy.source_content_type then
    raise exception 'ASSET_COPY_CONFLICT';
  end if;
  if exists (select 1 from public.card_replacement_cutovers where grant_id = p_grant_id) then
    raise exception 'RETIRED';
  end if;
  update public.card_replacement_asset_copies
  set state = 'ready', ready_sha256 = p_sha256, ready_size_bytes = p_size_bytes,
      ready_content_type = p_content_type, ready_at = clock_timestamp()
  where grant_id = p_grant_id and source_object_path = p_source_object_path and state = 'pending';
  if not found then raise exception 'ASSET_COPY_CONFLICT'; end if;
  return jsonb_build_object('ready', true, 'replayed', false, 'targetObjectPath', v_copy.target_object_path);
end;
$$;

create or replace function public.finalize_card_replacement_assets(
  p_grant_id uuid,
  p_source_publication_id uuid,
  p_target_draft jsonb,
  p_expected_draft_version bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant public.card_replacement_grants%rowtype;
  v_source_order public.orders%rowtype;
  v_target_order public.orders%rowtype;
  v_source_card public.cards%rowtype;
  v_target_card public.cards%rowtype;
  v_sha text;
  v_preparation public.card_replacement_asset_preparations%rowtype;
begin
  if p_target_draft is null or jsonb_typeof(p_target_draft) <> 'object' then raise exception 'DRAFT_INVALID'; end if;
  if p_expected_draft_version is null or p_expected_draft_version < 1 then raise exception 'DRAFT_VERSION_REQUIRED'; end if;
  select * into v_grant from public.card_replacement_grants where id = p_grant_id for update;
  if not found then raise exception 'REPLACEMENT_GRANT_NOT_FOUND'; end if;
  if exists (select 1 from public.card_replacement_cutovers where grant_id = p_grant_id) then raise exception 'RETIRED'; end if;

  if v_grant.predecessor_order_id < v_grant.replacement_order_id then
    select * into v_source_order from public.orders where id = v_grant.predecessor_order_id for update;
    select * into v_target_order from public.orders where id = v_grant.replacement_order_id for update;
  else
    select * into v_target_order from public.orders where id = v_grant.replacement_order_id for update;
    select * into v_source_order from public.orders where id = v_grant.predecessor_order_id for update;
  end if;
  if v_grant.predecessor_card_id < v_grant.replacement_card_id then
    select * into v_source_card from public.cards where id = v_grant.predecessor_card_id for update;
    select * into v_target_card from public.cards where id = v_grant.replacement_card_id for update;
  else
    select * into v_target_card from public.cards where id = v_grant.replacement_card_id for update;
    select * into v_source_card from public.cards where id = v_grant.predecessor_card_id for update;
  end if;
  if v_source_card.current_publication_id is distinct from p_source_publication_id
     or v_grant.predecessor_publication_id is distinct from p_source_publication_id then
    raise exception 'PREDECESSOR_PUBLICATION_CHANGED' using errcode = 'serialization_failure';
  end if;
  if v_target_order.entitlement_source is distinct from 'controlled_replacement'
     or v_target_card.is_published
     or v_target_card.custom_data_draft is null
     or v_target_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;
  if p_target_draft ? 'templateId'
     and p_target_draft->>'templateId' is distinct from v_target_card.template_id then
    raise exception 'TEMPLATE_MISMATCH';
  end if;
  if v_target_card.custom_data_draft is distinct from p_target_draft then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;
  if exists (
    select 1 from public.card_replacement_asset_copies c
    where c.grant_id = p_grant_id and c.state <> 'ready'
  ) then
    raise exception 'REPLACEMENT_ASSETS_NOT_READY' using errcode = 'object_not_in_prerequisite_state';
  end if;
  v_sha := encode(extensions.digest(convert_to(p_target_draft::text, 'utf8'), 'sha256'), 'hex');
  select * into v_preparation from public.card_replacement_asset_preparations
  where grant_id = p_grant_id and target_draft_version = p_expected_draft_version;
  if found then
    if v_preparation.source_publication_id is distinct from p_source_publication_id
       or v_preparation.target_draft_sha256 is distinct from v_sha
       or v_preparation.target_draft is distinct from p_target_draft then
      raise exception 'REPLACEMENT_PREPARATION_CONFLICT';
    end if;
    return jsonb_build_object('prepared', true, 'replayed', true,
      'draftVersion', p_expected_draft_version, 'draftSha256', v_sha);
  end if;
  insert into public.card_replacement_asset_preparations(
    grant_id, source_publication_id, target_draft_version,
    target_draft_sha256, target_draft
  ) values (
    p_grant_id, p_source_publication_id, p_expected_draft_version, v_sha, p_target_draft
  ) returning * into v_preparation;
  return jsonb_build_object('prepared', true, 'replayed', false,
    'draftVersion', v_preparation.target_draft_version, 'draftSha256', v_preparation.target_draft_sha256);
end;
$$;

revoke all on function public.create_card_replacement_grant(uuid, uuid, text, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.plan_card_replacement_assets(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.mark_card_replacement_asset_ready(uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.finalize_card_replacement_assets(uuid, uuid, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.create_card_replacement_grant(uuid, uuid, text, uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.plan_card_replacement_assets(uuid, uuid, jsonb) to service_role;
grant execute on function public.mark_card_replacement_asset_ready(uuid, text, text, integer, text) to service_role;
grant execute on function public.finalize_card_replacement_assets(uuid, uuid, jsonb, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Cutover: deterministic two-order/two-card locks and terminal retirement
-- ---------------------------------------------------------------------------

create or replace function public.cutover_card_replacement(
  p_grant_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_request_id uuid,
  p_expected_source_publication_id uuid,
  p_expected_replacement_draft_version bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant public.card_replacement_grants%rowtype;
  v_cutover public.card_replacement_cutovers%rowtype;
  v_source_order public.orders%rowtype;
  v_target_order public.orders%rowtype;
  v_source_card public.cards%rowtype;
  v_target_card public.cards%rowtype;
  v_source_publication public.card_publications%rowtype;
  v_preparation public.card_replacement_asset_preparations%rowtype;
  v_publication_id uuid;
  v_published_at timestamptz;
  v_ack text := 'I understand that this invitation will become public and read-only.';
  v_result jsonb;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if coalesce(btrim(p_reason), '') = ''
     or octet_length(btrim(p_reason)) > 1000
     or btrim(p_reason) <> p_reason then raise exception 'REASON_INVALID'; end if;

  select * into v_grant from public.card_replacement_grants where id = p_grant_id for update;
  if not found then raise exception 'REPLACEMENT_GRANT_NOT_FOUND'; end if;
  select * into v_cutover from public.card_replacement_cutovers where grant_id = p_grant_id;
  if found then
    if v_cutover.request_id is distinct from p_request_id then raise exception 'RETIRED'; end if;
    return jsonb_build_object(
      'cutoverId', v_cutover.id, 'grantId', p_grant_id, 'replayed', true,
      'predecessorCardId', v_cutover.predecessor_card_id,
      'replacementCardId', v_cutover.replacement_card_id,
      'replacementPublicationId', v_cutover.replacement_publication_id,
      'createdAt', v_cutover.created_at, 'result', v_cutover.result
    );
  end if;

  -- All cutovers acquire both related order rows in ascending UUID order and
  -- then both card rows in ascending UUID order. Every recheck below occurs
  -- after those locks, so a concurrent payment, disable or owner save cannot
  -- make this transaction publish a stale draft or retire the wrong snapshot.
  if v_grant.predecessor_order_id < v_grant.replacement_order_id then
    select * into v_source_order from public.orders where id = v_grant.predecessor_order_id for update;
    select * into v_target_order from public.orders where id = v_grant.replacement_order_id for update;
  else
    select * into v_target_order from public.orders where id = v_grant.replacement_order_id for update;
    select * into v_source_order from public.orders where id = v_grant.predecessor_order_id for update;
  end if;
  if v_grant.predecessor_card_id < v_grant.replacement_card_id then
    select * into v_source_card from public.cards where id = v_grant.predecessor_card_id for update;
    select * into v_target_card from public.cards where id = v_grant.replacement_card_id for update;
  else
    select * into v_target_card from public.cards where id = v_grant.replacement_card_id for update;
    select * into v_source_card from public.cards where id = v_grant.predecessor_card_id for update;
  end if;

  if v_source_card.current_publication_id is distinct from p_expected_source_publication_id
     or v_source_card.current_publication_id is distinct from v_grant.predecessor_publication_id then
    raise exception 'PREDECESSOR_PUBLICATION_CHANGED' using errcode = 'serialization_failure';
  end if;
  select * into v_source_publication from public.card_publications
  where id = v_source_card.current_publication_id and card_id = v_source_card.id;
  if not found or v_source_publication.id is distinct from v_grant.predecessor_publication_id then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  if v_source_card.active_edit_window_id is not null then raise exception 'EDIT_WINDOW_ACTIVE'; end if;
  if not v_source_card.is_published and not exists (
    select 1 from public.card_availability_actions a
    where a.card_id = v_source_card.id and a.action = 'disabled'
      and not exists (
        select 1 from public.card_availability_actions newer
        where newer.card_id = a.card_id
          and (newer.created_at > a.created_at or (newer.created_at = a.created_at and newer.id > a.id))
      )
  ) then
    raise exception 'PREDECESSOR_NOT_AVAILABLE';
  end if;
  if v_source_order.status is distinct from 'paid'
     or v_source_order.entitlement_source not in ('payment', 'controlled_replacement')
     or v_target_order.status is distinct from 'paid'
     or v_target_order.entitlement_source is distinct from 'controlled_replacement'
     or v_target_order.replacement_grant_id is distinct from v_grant.id
     or v_target_order.payment_method is not null
     or v_target_order.payment_completed_at is not null then
    raise exception 'REPLACEMENT_ENTITLEMENT_INVALID';
  end if;
  if v_target_card.order_id is distinct from v_target_order.id
     or v_target_card.user_id is distinct from v_source_card.user_id
     or v_target_card.template_id is distinct from v_source_card.template_id
     or v_target_card.is_published
     or v_target_card.published_at is not null
     or v_target_card.current_publication_id is not null
     or v_target_card.active_edit_window_id is not null
     or v_target_card.custom_data_draft is null
     or v_target_card.draft_version is distinct from p_expected_replacement_draft_version then
    raise exception 'REPLACEMENT_TARGET_INVALID';
  end if;

  select * into v_preparation from public.card_replacement_asset_preparations
  where grant_id = v_grant.id
    and source_publication_id = v_source_publication.id
    and target_draft_version = v_target_card.draft_version
    and target_draft_sha256 = encode(extensions.digest(convert_to(v_target_card.custom_data_draft::text, 'utf8'), 'sha256'), 'hex')
    and target_draft is not distinct from v_target_card.custom_data_draft
  order by prepared_at desc, id desc limit 1;
  if not found then raise exception 'REPLACEMENT_PREPARATION_STALE'; end if;
  if exists (select 1 from public.card_replacement_asset_copies c where c.grant_id = v_grant.id and c.state <> 'ready') then
    raise exception 'REPLACEMENT_ASSETS_NOT_READY';
  end if;

  v_published_at := clock_timestamp();
  insert into public.card_publications(
    card_id, revision_number, snapshot, source_edit_window_id, published_by,
    acknowledgement, draft_version, published_at, publication_kind
  ) values (
    v_target_card.id, 1, v_target_card.custom_data_draft, null, p_admin_id,
    v_ack, v_target_card.draft_version, v_published_at, 'controlled_replacement'
  ) returning id into v_publication_id;

  perform public.authorize_card_mutation(v_target_card.id, 'controlled_replacement_publish');
  update public.cards
  set custom_data = v_target_card.custom_data_draft,
      custom_data_draft = null,
      is_published = true,
      published_at = v_published_at,
      current_publication_id = v_publication_id
  where id = v_target_card.id
    and is_published = false
    and published_at is null
    and current_publication_id is null
    and active_edit_window_id is null
    and draft_version = p_expected_replacement_draft_version;
  if not found then raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure'; end if;

  insert into public.card_publication_actions(
    card_id, owner_id, draft_version, acknowledgement, published_snapshot
  ) values (
    v_target_card.id, v_target_card.user_id, v_target_card.draft_version, v_ack,
    v_preparation.target_draft
  );

  perform public.authorize_card_mutation(v_source_card.id, 'controlled_replacement_retire');
  update public.cards
  set is_published = false
  where id = v_source_card.id
    and current_publication_id = v_source_publication.id
    and is_published is not distinct from v_source_card.is_published;
  if not found then raise exception 'PREDECESSOR_CHANGED' using errcode = 'serialization_failure'; end if;

  v_result := jsonb_build_object(
    'sourcePublicationId', v_source_publication.id,
    'replacementPublicationId', v_publication_id,
    'replacementDraftVersion', v_target_card.draft_version,
    'retired', true,
    'publishedAt', v_published_at
  );
  insert into public.card_replacement_cutovers(
    grant_id, predecessor_card_id, predecessor_order_id, predecessor_publication_id,
    replacement_card_id, replacement_order_id, replacement_publication_id,
    administrator_id, request_id, reason, result
  ) values (
    v_grant.id, v_source_card.id, v_source_order.id, v_source_publication.id,
    v_target_card.id, v_target_order.id, v_publication_id,
    p_admin_id, p_request_id, btrim(p_reason), v_result
  ) returning * into v_cutover;

  return jsonb_build_object(
    'cutoverId', v_cutover.id, 'grantId', v_grant.id, 'replayed', false,
    'predecessorCardId', v_source_card.id,
    'replacementCardId', v_target_card.id,
    'replacementPublicationId', v_publication_id,
    'createdAt', v_cutover.created_at, 'result', v_result
  );
end;
$$;

revoke all on function public.cutover_card_replacement(uuid, uuid, text, uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function public.cutover_card_replacement(uuid, uuid, text, uuid, uuid, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Existing lifecycle functions inherit terminal/pending guards
-- ---------------------------------------------------------------------------

-- The stable #80 wrapper keeps this exact signature. Pending replacements are
-- not edit-window grants; retired cards are never reopened.
create or replace function public.open_card_edit_window(
  p_card_id uuid, p_admin_id uuid, p_reason text, p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_publication public.card_publications%rowtype;
  v_latest_action text;
  v_granted_at timestamptz;
  v_expires_at timestamptz;
  v_draft jsonb;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then raise exception 'FORBIDDEN'; end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  if coalesce(btrim(p_reason), '') = '' or octet_length(btrim(p_reason)) > 500 or btrim(p_reason) <> p_reason then raise exception 'REASON_INVALID'; end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  if public.card_is_retired(v_card.id) then raise exception 'RETIRED'; end if;
  if public.card_has_pending_replacement(v_card.id) then raise exception 'REPLACEMENT_PENDING'; end if;
  if v_order.status is distinct from 'paid' or v_card.user_id is distinct from v_order.user_id then raise exception 'UNPAID'; end if;
  select * into v_window from public.card_edit_windows where card_id = v_card.id and request_id = p_request_id;
  if found then
    return jsonb_build_object('granted', true, 'replayed', true, 'windowId', v_window.id,
      'requestId', v_window.request_id, 'grantedAt', v_window.granted_at,
      'expiresAt', v_window.expires_at, 'reason', v_window.reason);
  end if;
  select action into v_latest_action from public.card_availability_actions where card_id = v_card.id order by created_at desc, id desc limit 1;
  if v_latest_action = 'disabled' then raise exception 'CARD_UNAVAILABLE'; end if;
  if v_card.active_edit_window_id is not null then
    select * into v_window from public.card_edit_windows where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    if v_window.expires_at > clock_timestamp() then raise exception 'EDIT_WINDOW_ACTIVE'; end if;
  elsif not v_card.is_published or v_card.published_at is null then
    raise exception 'CARD_NOT_PUBLISHED';
  end if;
  if v_card.current_publication_id is null then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  select * into v_publication from public.card_publications where id = v_card.current_publication_id and card_id = v_card.id;
  if not found or jsonb_typeof(v_publication.snapshot) <> 'object' then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  if v_publication.snapshot ? 'templateId' and v_publication.snapshot->>'templateId' is distinct from v_card.template_id then raise exception 'TEMPLATE_MISMATCH'; end if;
  v_granted_at := clock_timestamp(); v_expires_at := v_granted_at + interval '7 days';
  insert into public.card_edit_windows(card_id, owner_id, admin_id, request_id, reason, granted_at, expires_at)
  values (v_card.id, v_card.user_id, p_admin_id, p_request_id, btrim(p_reason), v_granted_at, v_expires_at)
  returning * into v_window;
  v_draft := coalesce(v_card.revision_draft, v_publication.snapshot);
  perform public.authorize_card_mutation(v_card.id, 'open_edit_window');
  update public.cards set revision_draft = v_draft, active_edit_window_id = v_window.id, is_published = false
  where id = v_card.id and current_publication_id = v_publication.id;
  if not found then raise exception 'EDIT_WINDOW_CONFLICT'; end if;
  return jsonb_build_object('granted', true, 'replayed', false, 'windowId', v_window.id,
    'requestId', v_window.request_id, 'grantedAt', v_window.granted_at,
    'expiresAt', v_window.expires_at, 'reason', v_window.reason);
end;
$$;

revoke all on function public.open_card_edit_window(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.open_card_edit_window(uuid, uuid, text, uuid) to service_role;

create or replace function public.set_card_availability(
  p_card_id uuid, p_admin_id uuid, p_action text, p_reason text default null
) returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_last_action text;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('disabled', 'restored') then raise exception 'INVALID_ACTION'; end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if public.card_is_retired(v_card.id) then raise exception 'RETIRED'; end if;
  if public.card_has_pending_replacement(v_card.id) then raise exception 'REPLACEMENT_PENDING'; end if;
  if v_order.status is distinct from 'paid' then raise exception 'UNPAID'; end if;
  select action into v_last_action from public.card_availability_actions where card_id = v_card.id order by created_at desc, id desc limit 1;

  if p_action = 'disabled' then
    if not v_card.is_published and v_card.active_edit_window_id is null then raise exception 'NOT_PUBLISHED'; end if;
    if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    if octet_length(btrim(p_reason)) > 1000 then raise exception 'REASON_INVALID'; end if;
    insert into public.card_availability_actions(card_id, admin_id, action, reason)
    values (v_card.id, p_admin_id, 'disabled', btrim(p_reason));
    perform public.authorize_card_mutation(v_card.id, 'disable_card');
    update public.cards set is_published = false where id = v_card.id;
    return json_build_object('is_published', false, 'action', 'disabled', 'state', case when v_card.active_edit_window_id is not null then 'edit_window' else 'unavailable' end);
  end if;

  if v_card.is_published then raise exception 'ALREADY_PUBLISHED'; end if;
  if v_last_action is distinct from 'disabled' then raise exception 'NOT_DISABLED'; end if;
  insert into public.card_availability_actions(card_id, admin_id, action, reason)
  values (v_card.id, p_admin_id, 'restored', nullif(btrim(coalesce(p_reason, '')), ''));
  if v_card.active_edit_window_id is not null then
    select * into v_window from public.card_edit_windows where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    return json_build_object('is_published', false, 'action', 'restored', 'state', case when v_window.expires_at > clock_timestamp() then 'edit_window' else 'edit_window_expired' end, 'windowId', v_window.id, 'expiresAt', v_window.expires_at);
  end if;
  if v_card.current_publication_id is null or v_card.published_at is null then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  if not exists (select 1 from public.card_publications p where p.id = v_card.current_publication_id and p.card_id = v_card.id) then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  perform public.authorize_card_mutation(v_card.id, 'restore_card');
  update public.cards set is_published = true where id = v_card.id;
  return json_build_object('is_published', true, 'action', 'restored', 'state', 'published');
end;
$$;

revoke all on function public.set_card_availability(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_card_availability(uuid, uuid, text, text) to service_role;

create or replace function public.publish_paid_draft(
  p_card_id uuid, p_owner uuid, p_acknowledgement text, p_expected_draft_version bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_first public.card_publications%rowtype;
  v_last_action text;
  v_snapshot jsonb;
  v_published_at timestamptz;
  v_publication_id uuid;
begin
  if p_acknowledgement is distinct from 'I understand that this invitation will become public and read-only.' then raise exception 'ACKNOWLEDGEMENT_REQUIRED'; end if;
  if p_expected_draft_version is null or p_expected_draft_version < 1 then raise exception 'DRAFT_VERSION_REQUIRED'; end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if public.card_is_retired(v_card.id) then raise exception 'RETIRED'; end if;
  if v_order.entitlement_source = 'controlled_replacement' then raise exception 'CONTROLLED_REPLACEMENT_CUTOVER_REQUIRED'; end if;
  if p_owner is null or v_order.user_id is distinct from p_owner or v_card.user_id is distinct from p_owner then raise exception 'FORBIDDEN'; end if;
  if v_order.status is distinct from 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  select action into v_last_action from public.card_availability_actions
  where card_id = v_card.id order by created_at desc, id desc limit 1;
  if v_last_action = 'disabled' then
    return jsonb_build_object('published', false, 'replayed', false, 'revision', false, 'state', 'unavailable');
  end if;
  if v_card.published_at is not null then
    select * into v_first from public.card_publications where id = v_card.current_publication_id and card_id = v_card.id and revision_number = 1;
    if v_card.is_published and v_card.active_edit_window_id is null
       and v_first.id is not null
       and v_first.published_by = p_owner
       and v_first.draft_version = p_expected_draft_version
       and v_first.acknowledgement = p_acknowledgement
       and v_card.custom_data is not distinct from v_first.snapshot then
      return jsonb_build_object('published', true, 'replayed', true, 'revision', false, 'state', 'published', 'slug', v_card.slug, 'draftVersion', v_card.draft_version, 'publishedAt', v_card.published_at, 'publicationId', v_first.id, 'revisionNumber', 1);
    end if;
    raise exception 'CARD_NOT_FIRST_PUBLICATION';
  end if;
  if v_card.active_edit_window_id is not null or v_card.current_publication_id is not null then raise exception 'CARD_NOT_FIRST_PUBLICATION'; end if;
  if v_card.custom_data_draft is null then raise exception 'CARD_NOT_PROMOTABLE'; end if;
  if v_card.custom_data_draft ? 'templateId' and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then raise exception 'TEMPLATE_MISMATCH'; end if;
  if v_card.draft_version is distinct from p_expected_draft_version then raise exception 'DRAFT_VERSION_CONFLICT'; end if;
  if not v_order.manual_paid_draft then update public.orders set manual_paid_draft = true where id = v_order.id and status = 'paid'; end if;
  v_snapshot := v_card.custom_data_draft; v_published_at := clock_timestamp();
  insert into public.card_publications(card_id, revision_number, snapshot, published_by, acknowledgement, draft_version, published_at, publication_kind)
  values (v_card.id, 1, v_snapshot, p_owner, p_acknowledgement, p_expected_draft_version, v_published_at, 'owner') returning id into v_publication_id;
  perform public.authorize_card_mutation(v_card.id, 'publish_first');
  update public.cards set custom_data = v_snapshot, custom_data_draft = null, is_published = true, published_at = v_published_at, current_publication_id = v_publication_id
  where id = v_card.id and is_published = false and published_at is null and current_publication_id is null and custom_data_draft is not null and draft_version = p_expected_draft_version;
  if not found then raise exception 'DRAFT_VERSION_CONFLICT'; end if;
  insert into public.card_publication_actions(card_id, owner_id, draft_version, acknowledgement, published_snapshot)
  values (v_card.id, p_owner, p_expected_draft_version, p_acknowledgement, v_snapshot);
  return jsonb_build_object('published', true, 'replayed', false, 'revision', false, 'state', 'published', 'slug', v_card.slug, 'eventName', public.duitnow_card_event_name(v_snapshot), 'draftVersion', p_expected_draft_version, 'publishedAt', v_published_at, 'publicationId', v_publication_id, 'revisionNumber', 1);
end;
$$;

revoke all on function public.publish_paid_draft(uuid, uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.publish_paid_draft(uuid, uuid, text, bigint) to service_role;

-- A retirement is terminal for direct card writes/deletes. Pending targets are
-- deliberately excluded from this trigger so owner draft saves remain valid.
create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_authorized boolean;
begin
  if TG_OP = 'INSERT' then
    if new.is_published is true or new.published_at is not null or new.current_publication_id is not null then raise exception 'PUBLICATION_PAYMENT_ONLY'; end if;
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if public.card_is_retired(old.id) then
      raise exception 'RETIRED' using errcode = 'restrict_violation';
    end if;
    if old.published_at is not null and (new.custom_data is distinct from old.custom_data or new.published_at is distinct from old.published_at or new.slug is distinct from old.slug) then raise exception 'PUBLISHED_SNAPSHOT_IMMUTABLE'; end if;
    if to_jsonb(new) is not distinct from to_jsonb(old) then return new; end if;
    select exists (select 1 from public.card_mutation_authorizations a where a.txid = txid_current() and a.card_id = old.id) into v_authorized;
    if not v_authorized then
      if new.is_published is distinct from old.is_published then raise exception 'PUBLICATION_PAYMENT_ONLY'; end if;
      raise exception 'CARD_UPDATE_GUARDED';
    end if;
    if public.card_has_pending_replacement(old.id)
       and not exists (
         select 1
         from public.card_mutation_authorizations a
         where a.txid = txid_current()
           and a.card_id = old.id
           and a.capability in ('save_draft', 'controlled_replacement_publish', 'controlled_replacement_retire')
       ) then
      raise exception 'REPLACEMENT_PENDING' using errcode = 'restrict_violation';
    end if;
    delete from public.card_mutation_authorizations where txid = txid_current() and card_id = old.id;
    return new;
  end if;
  if TG_OP = 'DELETE' then
    if public.card_is_retired(old.id) then raise exception 'RETIRED' using errcode = 'restrict_violation'; end if;
    if public.card_has_pending_replacement(old.id) then raise exception 'REPLACEMENT_PENDING' using errcode = 'restrict_violation'; end if;
    if exists (select 1 from public.orders where id = old.order_id and status = 'paid') then raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation'; end if;
    if exists (select 1 from public.duitnow_transfer_submissions s where s.order_id = old.order_id) then raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED' using errcode = 'restrict_violation'; end if;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists cards_payment_lifecycle on public.cards;
create trigger cards_payment_lifecycle before insert or update or delete on public.cards for each row execute function public.cards_payment_lifecycle_guard();
revoke all on function public.cards_payment_lifecycle_guard() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Owner target asset writes, with the existing card-scoped boundary
-- ---------------------------------------------------------------------------

-- Reassert the protected bucket boundary here as well. A local bootstrap or
-- an older bucket edit must never turn predecessor or target references into
-- directly public storage URLs.
update storage.buckets
set public = false
where id = 'card-assets';

drop policy if exists "card-assets owner insert" on storage.objects;
drop policy if exists "card-assets owner update" on storage.objects;
drop policy if exists "card-assets owner delete" on storage.objects;

create policy "card-assets owner insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'card-assets'
  and name ~ '^[0-9a-fA-F-]{36}/[a-z][a-z0-9_]{0,63}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')
  and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1)
      and c.user_id = (select auth.uid())
      and c.is_published = false
      and not exists (
        select 1 from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and (
        (c.published_at is null and (o.status <> 'paid' or o.manual_paid_draft is true))
        or (c.published_at is not null and c.active_edit_window_id is not null
          and exists (select 1 from public.card_edit_windows w where w.id = c.active_edit_window_id and w.card_id = c.id and w.expires_at > clock_timestamp())
          and not exists (select 1 from public.card_availability_actions a where a.card_id = c.id and a.action = 'disabled'
            and not exists (select 1 from public.card_availability_actions newer where newer.card_id = a.card_id and (newer.created_at > a.created_at or (newer.created_at = a.created_at and newer.id > a.id)))))
      )
  )
);

create policy "card-assets owner update" on storage.objects for update to authenticated
using (
  bucket_id = 'card-assets' and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1) and c.user_id = (select auth.uid())
      and c.is_published = false and not exists (
        select 1 from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and not exists (
        select 1
        from public.card_replacement_grants g
        join public.card_replacement_asset_preparations p on p.grant_id = g.id
        where g.replacement_card_id = c.id
      )
      and (o.status <> 'paid' or o.manual_paid_draft is true or c.active_edit_window_id is not null)
  )
)
with check (
  bucket_id = 'card-assets'
  and name ~ '^[0-9a-fA-F-]{36}/[a-z][a-z0-9_]{0,63}/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif')
  and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1) and c.user_id = (select auth.uid())
      and c.is_published = false and not exists (
        select 1 from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and not exists (
        select 1
        from public.card_replacement_grants g
        join public.card_replacement_asset_preparations p on p.grant_id = g.id
        where g.replacement_card_id = c.id
      )
      and (o.status <> 'paid' or o.manual_paid_draft is true or c.active_edit_window_id is not null)
  )
);

create policy "card-assets owner delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'card-assets' and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1) and c.user_id = (select auth.uid())
      and c.is_published = false and not exists (
        select 1 from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and not exists (
        select 1
        from public.card_replacement_grants g
        join public.card_replacement_asset_preparations p on p.grant_id = g.id
        where g.replacement_card_id = c.id
      )
      and (o.status <> 'paid' or o.manual_paid_draft is true or c.active_edit_window_id is not null)
  )
);

-- ---------------------------------------------------------------------------
-- 7. Replacement-aware service ACLs
-- ---------------------------------------------------------------------------

revoke all on public.card_replacement_grants from public, anon, authenticated;
revoke all on public.card_replacement_asset_copies from public, anon, authenticated;
revoke all on public.card_replacement_asset_preparations from public, anon, authenticated;
revoke all on public.card_replacement_cutovers from public, anon, authenticated;
grant select on public.card_replacement_grants to service_role;
grant select on public.card_replacement_asset_copies to service_role;
grant select on public.card_replacement_asset_preparations to service_role;
grant select on public.card_replacement_cutovers to service_role;
-- Storage owner policies inspect these owner/admin-visible tables through RLS
-- when deciding whether a pending target is prepared or terminally retired.
grant select on public.card_replacement_grants to authenticated;
grant select on public.card_replacement_asset_preparations to authenticated;
grant select on public.card_replacement_cutovers to authenticated;
