-- Customer "Mohon Suntingan" requests for already-published invitations.
--
-- This migration is intentionally compatible with migration 039. It binds a
-- request to the current publication, edit-window generation, availability
-- action and draft version observed by the customer. Approval still delegates
-- the seven-day grant to open_card_edit_window, so later lifecycle extensions
-- can reject a stale/retired target without this migration knowing their
-- columns.

-- ---------------------------------------------------------------------------
-- 1. Request ledger and RLS boundary
-- ---------------------------------------------------------------------------

create table if not exists public.card_edit_requests (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete restrict,
  owner_id uuid not null references public.users(id) on delete restrict,
  request_id uuid not null unique,
  reason text not null,
  status text not null default 'pending',
  submitted_publication_id uuid not null references public.card_publications(id) on delete restrict,
  submitted_edit_window_id uuid references public.card_edit_windows(id) on delete restrict,
  submitted_availability_action_id uuid references public.card_availability_actions(id) on delete restrict,
  submitted_draft_version bigint not null check (submitted_draft_version >= 1),
  submitted_at timestamptz not null default clock_timestamp(),
  decision text,
  decision_request_id uuid,
  decision_actor_id uuid references public.users(id) on delete restrict,
  decision_reason text,
  decided_at timestamptz,
  approved_edit_window_id uuid references public.card_edit_windows(id) on delete restrict,
  constraint card_edit_requests_status_valid check (
    status in ('pending', 'approved', 'rejected', 'stale')
  ),
  constraint card_edit_requests_decision_valid check (
    decision is null or decision in ('approve', 'reject', 'stale')
  ),
  constraint card_edit_requests_reason_valid check (
    octet_length(btrim(reason)) between 1 and 500
    and btrim(reason) = reason
  ),
  constraint card_edit_requests_decision_reason_valid check (
    decision_reason is null
    or (
      octet_length(btrim(decision_reason)) between 1 and 500
      and btrim(decision_reason) = decision_reason
    )
  ),
  constraint card_edit_requests_terminal_fields_valid check (
    (
      status = 'pending'
      and decision is null
      and decision_request_id is null
      and decision_actor_id is null
      and decision_reason is null
      and decided_at is null
      and approved_edit_window_id is null
    )
    or (
      status = 'approved'
      and decision = 'approve'
      and decision_request_id is not null
      and decision_actor_id is not null
      and decided_at is not null
      and approved_edit_window_id is not null
      and decision_reason is null
    )
    or (
      status = 'rejected'
      and decision = 'reject'
      and decision_request_id is not null
      and decision_actor_id is not null
      and decision_reason is not null
      and decided_at is not null
      and approved_edit_window_id is null
    )
    or (
      status = 'stale'
      and decision = 'stale'
      and decision_request_id is not null
      and decided_at is not null
      and approved_edit_window_id is null
    )
  )
);

create unique index if not exists card_edit_requests_one_pending_idx
  on public.card_edit_requests(card_id)
  where status = 'pending';

create unique index if not exists card_edit_requests_decision_request_idx
  on public.card_edit_requests(decision_request_id)
  where decision_request_id is not null;

create index if not exists card_edit_requests_queue_idx
  on public.card_edit_requests(status, submitted_at desc, id desc);

create index if not exists card_edit_requests_card_recent_idx
  on public.card_edit_requests(card_id, submitted_at desc, id desc);

create index if not exists card_edit_requests_owner_recent_idx
  on public.card_edit_requests(owner_id, submitted_at desc, id desc);

create or replace function public.prevent_card_edit_request_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card_id uuid;
begin
  v_card_id := case when TG_OP = 'DELETE' then old.card_id else new.card_id end;
  if not exists (
    select 1
    from public.card_mutation_authorizations a
    where a.txid = txid_current()
      and a.card_id = v_card_id
      and a.capability like 'edit_request_%'
  ) then
    raise exception 'CARD_EDIT_REQUEST_MUTATION_GUARDED'
      using errcode = 'restrict_violation';
  end if;
  delete from public.card_mutation_authorizations
  where txid = txid_current()
    and card_id = v_card_id
    and capability like 'edit_request_%';
  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists card_edit_requests_immutable on public.card_edit_requests;
create trigger card_edit_requests_immutable
before insert or update or delete on public.card_edit_requests
for each row execute function public.prevent_card_edit_request_mutation();

alter table public.card_edit_requests enable row level security;

revoke all on public.card_edit_requests from public, anon, authenticated, service_role;
grant select on public.card_edit_requests to authenticated, service_role;

drop policy if exists "owners can read own edit requests" on public.card_edit_requests;
create policy "owners can read own edit requests"
on public.card_edit_requests for select to authenticated
using (
  owner_id = (select auth.uid())
);

drop policy if exists "admins can read edit requests" on public.card_edit_requests;
create policy "admins can read edit requests"
on public.card_edit_requests for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  )
);

-- The ledger is append-only to callers. The request and review RPCs authorize
-- their one insert/update through the existing transaction-scoped capability.
revoke all on function public.prevent_card_edit_request_mutation() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Safe result and stale-resolution helpers
-- ---------------------------------------------------------------------------

create or replace function public.card_edit_request_result(
  p_request_id uuid,
  p_replayed boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.card_edit_requests%rowtype;
  v_window public.card_edit_windows%rowtype;
begin
  select * into v_request
  from public.card_edit_requests
  where id = p_request_id;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;

  if v_request.approved_edit_window_id is not null then
    select * into v_window
    from public.card_edit_windows
    where id = v_request.approved_edit_window_id;
  end if;

  return jsonb_build_object(
    'id', v_request.id,
    'requestId', v_request.request_id,
    'status', v_request.status,
    'reason', v_request.reason,
    'decision', v_request.decision,
    'decisionReason', v_request.decision_reason,
    'submittedAt', v_request.submitted_at,
    'decidedAt', v_request.decided_at,
    'replayed', p_replayed,
    'windowId', v_request.approved_edit_window_id,
    'expiresAt', v_window.expires_at
  );
end;
$$;

create or replace function public.resolve_card_edit_request_stale(
  p_request_id uuid,
  p_actor_id uuid default null,
  p_decision_request_id uuid default null,
  p_reason text default 'Jemputan berubah sebelum permintaan dapat disemak.'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.card_edit_requests%rowtype;
  v_decision_request_id uuid := coalesce(p_decision_request_id, gen_random_uuid());
begin
  select * into v_request
  from public.card_edit_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.status <> 'pending' then
    return public.card_edit_request_result(v_request.id, true);
  end if;
  if coalesce(btrim(p_reason), '') = ''
     or octet_length(btrim(p_reason)) > 500
     or btrim(p_reason) <> p_reason then
    raise exception 'REASON_INVALID' using errcode = 'check_violation';
  end if;

  perform public.authorize_card_mutation(v_request.card_id, 'edit_request_resolve');
  update public.card_edit_requests
  set status = 'stale',
      decision = 'stale',
      decision_request_id = v_decision_request_id,
      decision_actor_id = p_actor_id,
      decision_reason = p_reason,
      decided_at = clock_timestamp()
  where id = v_request.id and status = 'pending';
  if not found then
    return public.card_edit_request_result(v_request.id, true);
  end if;
  return public.card_edit_request_result(v_request.id, false);
end;
$$;

revoke all on function public.card_edit_request_result(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.resolve_card_edit_request_stale(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Customer submission
-- ---------------------------------------------------------------------------

create or replace function public.submit_card_edit_request(
  p_card_id uuid,
  p_owner_id uuid,
  p_reason text,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_request public.card_edit_requests%rowtype;
  v_pending public.card_edit_requests%rowtype;
  v_publication public.card_publications%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_latest_action_id uuid;
  v_latest_action text;
  v_current_eligible boolean := false;
begin
  if p_owner_id is null then raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege'; end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED' using errcode = 'check_violation'; end if;
  if coalesce(btrim(p_reason), '') = ''
     or octet_length(btrim(p_reason)) > 500
     or btrim(p_reason) <> p_reason then
    raise exception 'REASON_INVALID' using errcode = 'check_violation';
  end if;

  select order_id into v_order_id
  from public.cards
  where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;

  -- All request lifecycle paths use order then card. This also serializes a
  -- customer retry against grants, availability transitions and republishing.
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;

  select * into v_request
  from public.card_edit_requests
  where request_id = p_request_id;
  if found then
    if v_request.card_id is distinct from v_card.id
       or v_request.owner_id is distinct from p_owner_id
       or v_request.reason is distinct from p_reason then
      raise exception 'REQUEST_REPLAY_MISMATCH' using errcode = 'serialization_failure';
    end if;
    return public.card_edit_request_result(v_request.id, true);
  end if;

  if v_order.user_id is distinct from p_owner_id
     or v_card.user_id is distinct from p_owner_id then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  select id, action into v_latest_action_id, v_latest_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;

  if v_card.current_publication_id is not null then
    select * into v_publication
    from public.card_publications
    where id = v_card.current_publication_id and card_id = v_card.id;
  end if;

  if v_card.active_edit_window_id is not null then
    select * into v_window
    from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
  end if;

  if v_card.is_published
     and v_card.published_at is not null
     and v_card.current_publication_id is not null
     and v_card.active_edit_window_id is null
     and v_publication.id is not null then
    -- The publication row is checked explicitly below; this branch only
    -- records the current derived Published shape.
    v_current_eligible := true;
  elsif not v_card.is_published
        and v_card.published_at is not null
        and v_card.current_publication_id is not null
        and v_card.active_edit_window_id is not null
        and v_window.id is not null
        and v_window.expires_at <= clock_timestamp() then
    v_current_eligible := true;
  end if;

  -- A lifecycle transition may have made an older pending row stale. Resolve
  -- it here so it cannot permanently block a later eligible request.
  select * into v_pending
  from public.card_edit_requests
  where card_id = v_card.id and status = 'pending'
  order by submitted_at asc, id asc
  limit 1
  for update;
  if found then
    if v_pending.submitted_publication_id is distinct from v_card.current_publication_id
       or v_pending.submitted_edit_window_id is distinct from v_card.active_edit_window_id
       or v_pending.submitted_availability_action_id is distinct from v_latest_action_id
       or v_pending.submitted_draft_version is distinct from v_card.draft_version then
      perform public.resolve_card_edit_request_stale(v_pending.id);
    else
      raise exception 'REQUEST_ALREADY_PENDING' using errcode = 'object_not_in_prerequisite_state';
    end if;
  end if;

  if v_order.status is distinct from 'paid'
     or v_card.user_id is distinct from v_order.user_id then
    raise exception 'REQUEST_NOT_ELIGIBLE' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_latest_action = 'disabled' then
    raise exception 'CARD_UNAVAILABLE' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if not v_current_eligible
     or v_publication.id is null
     or jsonb_typeof(v_publication.snapshot) <> 'object' then
    raise exception 'REQUEST_NOT_ELIGIBLE' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_publication.snapshot ? 'templateId'
     and v_publication.snapshot->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;

  perform public.authorize_card_mutation(v_card.id, 'edit_request_insert');
  insert into public.card_edit_requests(
    card_id, owner_id, request_id, reason, status,
    submitted_publication_id, submitted_edit_window_id,
    submitted_availability_action_id, submitted_draft_version
  ) values (
    v_card.id, v_card.user_id, p_request_id, p_reason, 'pending',
    v_card.current_publication_id, v_card.active_edit_window_id,
    v_latest_action_id, v_card.draft_version
  ) returning id into v_request.id;
  return public.card_edit_request_result(v_request.id, false);
end;
$$;

revoke all on function public.submit_card_edit_request(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.submit_card_edit_request(uuid, uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Administrator decision
-- ---------------------------------------------------------------------------

create or replace function public.review_card_edit_request(
  p_request_id uuid,
  p_admin_id uuid,
  p_decision text,
  p_decision_reason text default null,
  p_decision_request_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card_id uuid;
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_request public.card_edit_requests%rowtype;
  v_publication public.card_publications%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_latest_action_id uuid;
  v_latest_action text;
  v_current_eligible boolean := false;
  v_opened jsonb;
  v_opened_window_id uuid;
  v_error_message text;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'DECISION_INVALID' using errcode = 'check_violation';
  end if;
  if p_decision_request_id is null then
    raise exception 'DECISION_REQUEST_ID_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_decision = 'reject'
     and (coalesce(btrim(p_decision_reason), '') = ''
       or octet_length(btrim(p_decision_reason)) > 500
       or btrim(p_decision_reason) <> p_decision_reason) then
    raise exception 'REASON_INVALID' using errcode = 'check_violation';
  end if;
  if p_decision = 'approve' and p_decision_reason is not null
     and (octet_length(btrim(p_decision_reason)) > 500
       or btrim(p_decision_reason) <> p_decision_reason) then
    raise exception 'REASON_INVALID' using errcode = 'check_violation';
  end if;

  -- Read only the foreign key needed to discover the lock path. The request
  -- row itself is not locked until after order and card locks are acquired.
  select card_id into v_card_id
  from public.card_edit_requests
  where id = p_request_id;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  select order_id into v_order_id from public.cards where id = v_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = v_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_request
  from public.card_edit_requests
  where id = p_request_id and card_id = v_card.id
  for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;

  if v_request.status <> 'pending' then
    if v_request.decision_request_id = p_decision_request_id
       and (v_request.decision = p_decision or v_request.decision = 'stale') then
      return public.card_edit_request_result(v_request.id, true);
    end if;
    raise exception 'REQUEST_ALREADY_DECIDED' using errcode = 'object_not_in_prerequisite_state';
  end if;

  select id, action into v_latest_action_id, v_latest_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;
  if v_card.current_publication_id is not null then
    select * into v_publication
    from public.card_publications
    where id = v_card.current_publication_id and card_id = v_card.id;
  end if;
  if v_card.active_edit_window_id is not null then
    select * into v_window
    from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
  end if;

  if v_request.submitted_edit_window_id is null then
    v_current_eligible := v_card.is_published
      and v_card.published_at is not null
      and v_card.active_edit_window_id is null;
  else
    v_current_eligible := not v_card.is_published
      and v_card.published_at is not null
      and v_card.active_edit_window_id = v_request.submitted_edit_window_id
      and v_window.id is not null
      and v_window.expires_at <= clock_timestamp();
  end if;

  -- Generation checks are made for both approval and rejection. A disabled,
  -- replaced, directly granted or republished target becomes terminal stale;
  -- it never remains pending and never receives a new window.
  if v_order.status is distinct from 'paid'
     or v_card.user_id is distinct from v_request.owner_id
     or v_order.user_id is distinct from v_request.owner_id
     or v_card.current_publication_id is distinct from v_request.submitted_publication_id
     or v_card.active_edit_window_id is distinct from v_request.submitted_edit_window_id
     or v_card.draft_version is distinct from v_request.submitted_draft_version
     or v_latest_action_id is distinct from v_request.submitted_availability_action_id
     or v_latest_action = 'disabled'
     or not v_current_eligible
     or v_publication.id is null
     or jsonb_typeof(v_publication.snapshot) <> 'object' then
    return public.resolve_card_edit_request_stale(
      v_request.id, p_admin_id, p_decision_request_id,
      'Jemputan berubah sebelum permintaan dapat disemak.'
    );
  end if;

  if p_decision = 'reject' then
    perform public.authorize_card_mutation(v_card.id, 'edit_request_decide');
    update public.card_edit_requests
    set status = 'rejected',
        decision = 'reject',
        decision_request_id = p_decision_request_id,
        decision_actor_id = p_admin_id,
        decision_reason = p_decision_reason,
        decided_at = clock_timestamp()
    where id = v_request.id and status = 'pending';
    if not found then return public.card_edit_request_result(v_request.id, true); end if;
    return public.card_edit_request_result(v_request.id, false);
  end if;

  -- The existing guarded grant owns the actual privacy flip and seven-day
  -- deadline. It receives the stable decision request id for replay safety.
  begin
    v_opened := public.open_card_edit_window(
      v_card.id, p_admin_id, v_request.reason, p_decision_request_id
    );
    v_opened_window_id := nullif(v_opened->>'windowId', '')::uuid;
    if v_opened_window_id is null then raise exception 'EDIT_WINDOW_CONFLICT'; end if;
  exception when others then
    v_error_message := sqlerrm;
    if v_error_message ~* '(CARD_UNAVAILABLE|CARD_NOT_PUBLISHED|CARD_RETIRED|CARD_REPLACED|REPLACEMENT_PENDING|CUTOVER|EDIT_WINDOW_ACTIVE|EDIT_WINDOW_CONFLICT|CURRENT_PUBLICATION_MISSING|EDIT_WINDOW_CORRUPT|TEMPLATE_MISMATCH)' then
      return public.resolve_card_edit_request_stale(
        v_request.id, p_admin_id, p_decision_request_id,
        'Jemputan tidak lagi tersedia untuk permintaan ini.'
      );
    end if;
    raise;
  end;

  perform public.authorize_card_mutation(v_card.id, 'edit_request_decide');
  update public.card_edit_requests
  set status = 'approved',
      decision = 'approve',
      decision_request_id = p_decision_request_id,
      decision_actor_id = p_admin_id,
      decision_reason = null,
      decided_at = clock_timestamp(),
      approved_edit_window_id = v_opened_window_id
  where id = v_request.id and status = 'pending';
  if not found then raise exception 'REQUEST_DECISION_CONFLICT'; end if;
  return public.card_edit_request_result(v_request.id, false);
end;
$$;

revoke all on function public.review_card_edit_request(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.review_card_edit_request(uuid, uuid, text, text, uuid) to service_role;

-- All table writes are RPC-owned. The customer and administrator API routes
-- authenticate their actors before calling these service-role-only functions.
