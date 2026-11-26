-- Repair issue #80 approval replay semantics without changing migration 041.
--
-- A decision UUID is an operation id, not a reusable edit-window id. The
-- guarded grant RPC intentionally returns an old window for an exact
-- card/request replay before it evaluates the current lifecycle. A pending
-- Mohon Suntingan review must therefore reject UUIDs already used by another
-- operation and must verify the returned window is the new active generation
-- before recording approval.

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
  v_after_card public.cards%rowtype;
  v_request public.card_edit_requests%rowtype;
  v_publication public.card_publications%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_approved_window public.card_edit_windows%rowtype;
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

  -- Do not let an operation id from an old direct grant, another request, or
  -- another card be replayed through open_card_edit_window for this review.
  -- Use a server-generated terminal id so the collision cannot itself create a
  -- duplicate decision id in the request ledger.
  if p_decision = 'approve'
     and (
       exists (
         select 1 from public.card_edit_windows
         where request_id = p_decision_request_id
       )
       or exists (
         select 1 from public.card_edit_requests
         where request_id = p_decision_request_id
            or decision_request_id = p_decision_request_id
       )
     ) then
    return public.resolve_card_edit_request_stale(
      v_request.id, p_admin_id, null,
      'Jemputan tidak lagi tersedia untuk keputusan ini.'
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
    if coalesce((v_opened->>'replayed')::boolean, false) then
      raise exception 'EDIT_WINDOW_REPLAY_CONFLICT';
    end if;
    v_opened_window_id := nullif(v_opened->>'windowId', '')::uuid;
    if v_opened_window_id is null then raise exception 'EDIT_WINDOW_CONFLICT'; end if;

    -- The grant must be the newly active, future-dated window for this card,
    -- and its request id must be this review operation. This closes the gap
    -- where an old same-card window could be returned as a replay.
    select * into v_after_card
    from public.cards
    where id = v_card.id;
    select * into v_approved_window
    from public.card_edit_windows
    where id = v_opened_window_id and card_id = v_card.id;
    if not found
       or v_after_card.is_published
       or v_after_card.active_edit_window_id is distinct from v_opened_window_id
       or v_approved_window.request_id is distinct from p_decision_request_id
       or v_approved_window.expires_at <= clock_timestamp() then
      raise exception 'EDIT_WINDOW_CONFLICT';
    end if;
  exception when others then
    v_error_message := sqlerrm;
    if v_error_message ~* '(CARD_UNAVAILABLE|CARD_NOT_PUBLISHED|CARD_RETIRED|CARD_REPLACED|CARD_REPLACEMENT_PENDING|REPLACEMENT_PENDING|PENDING_REPLACEMENT|CUTOVER|RETIREMENT|RETIRED|REPLACED|SUCCESSOR|EDIT_WINDOW_REPLAY_CONFLICT|EDIT_WINDOW_ACTIVE|EDIT_WINDOW_CONFLICT|CURRENT_PUBLICATION_MISSING|EDIT_WINDOW_CORRUPT|TEMPLATE_MISMATCH)' then
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

revoke all on function public.review_card_edit_request(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.review_card_edit_request(uuid, uuid, text, text, uuid)
  to service_role;
