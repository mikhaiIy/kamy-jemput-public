-- Make Stripe Checkout and a new DuitNow submission mutually exclusive.
--
-- A customer may move from Stripe to DuitNow only after Stripe has confirmed
-- the persisted Session can no longer be paid and the exact reservation has
-- been released. This migration is append-only: it replaces the affected RPC
-- bodies while retaining the existing signatures and ACL boundary.

create or replace function public.submit_duitnow_transfer(
  p_order_id uuid,
  p_slot_number int,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_slot public.duitnow_payment_slots%rowtype;
  v_card public.cards%rowtype;
  v_ref text;
  v_submission uuid;
begin
  v_ref := btrim(coalesce(p_reference, ''));
  if p_slot_number not in (1, 2) then
    raise exception 'SLOT_INVALID' using errcode = 'check_violation';
  end if;
  if char_length(v_ref) < 3 or char_length(v_ref) > 64
     or v_ref !~ '^[A-Za-z0-9][A-Za-z0-9 .,&+/():#@''-]*$' then
    raise exception 'REFERENCE_INVALID' using errcode = 'check_violation';
  end if;

  -- Keep the global lock order: order, then card/slot. The checkout fields are
  -- tested while this row is locked, so an old open Stripe Session can never
  -- remain payable after a manual submission is accepted.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if auth.uid() is null or v_order.user_id is distinct from auth.uid() then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'ORDER_CLOSED' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_order.checkout_reservation_token is not null or v_order.stripe_session_id is not null then
    raise exception 'CHECKOUT_RECONCILIATION_REQUIRED' using errcode = 'object_not_in_prerequisite_state';
  end if;

  if exists (
    select 1 from public.duitnow_transfer_submissions s
    where s.order_id = p_order_id
      and not exists (
        select 1 from public.duitnow_payment_reviews r where r.submission_id = s.id)
  ) then
    raise exception 'ALREADY_SUBMITTED' using errcode = 'unique_violation';
  end if;

  select * into v_slot from public.duitnow_payment_slots
  where slot_number = p_slot_number for update;
  if not found or not v_slot.enabled or btrim(v_slot.payee_name) = ''
     or btrim(v_slot.provider) = '' or btrim(v_slot.qr_image_url) = '' then
    raise exception 'SLOT_UNAVAILABLE' using errcode = 'object_not_in_prerequisite_state';
  end if;

  select * into v_card from public.cards where order_id = p_order_id for update;
  if not found then
    raise exception 'ORDER_CARD_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.custom_data_draft is null then
    raise exception 'FULFILLMENT_SNAPSHOT_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;

  insert into public.duitnow_transfer_submissions
    (order_id, user_id, slot_number, slot_version, slot_snapshot,
     amount_sen, transfer_reference, draft_snapshot)
  values (
    p_order_id, v_order.user_id, p_slot_number, v_slot.version,
    jsonb_build_object(
      'slotNumber', v_slot.slot_number, 'version', v_slot.version,
      'label', v_slot.label, 'payeeName', btrim(v_slot.payee_name),
      'provider', btrim(v_slot.provider), 'qrImageUrl', btrim(v_slot.qr_image_url),
      'instructions', v_slot.instructions),
    v_order.price_myr, v_ref, v_card.custom_data_draft)
  returning id into v_submission;

  return jsonb_build_object('submissionId', v_submission);
end $$;

create or replace function public.complete_order_payment(
  p_order_id uuid,
  p_method text,
  p_reference text,
  p_draft_snapshot jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_final jsonb;
begin
  if p_method not in ('stripe', 'duitnow') then
    raise exception 'METHOD_INVALID' using errcode = 'check_violation';
  end if;
  if coalesce(btrim(p_reference), '') = '' then
    raise exception 'REFERENCE_INVALID' using errcode = 'check_violation';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('won', false, 'reason', 'ORDER_NOT_FOUND');
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('won', false, 'reason', 'ALREADY_COMPLETED');
  end if;
  -- Stripe completion is authoritative only for the persisted binding, not a
  -- caller-supplied Session id. A DuitNow winner must have no live binding.
  if p_method = 'stripe' and v_order.stripe_session_id is distinct from btrim(p_reference) then
    raise exception 'CHECKOUT_SESSION_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if p_method = 'duitnow' and p_draft_snapshot is null then
    raise exception 'FULFILLMENT_SNAPSHOT_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;

  select * into v_card from public.cards where order_id = p_order_id for update;
  if not found then
    raise exception 'ORDER_CARD_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if p_draft_snapshot is null then
    if v_card.custom_data_draft is null then
      raise exception 'FULFILLMENT_SNAPSHOT_MISSING' using errcode = 'object_not_in_prerequisite_state';
    end if;
    v_final := v_card.custom_data_draft;
  else
    v_final := p_draft_snapshot;
  end if;

  perform set_config('app.payment_completion', 'on', true);
  update public.cards set custom_data = v_final, custom_data_draft = null,
    is_published = true, published_at = coalesce(published_at, now())
  where id = v_card.id;

  update public.orders set
    status = 'paid', payment_method = p_method, payment_completed_at = now(),
    -- Keep a Stripe winner's Session identity for webhook idempotency. A
    -- DuitNow winner removes every reservation/binding, which is safe because
    -- the HTTP boundary expired the exact Stripe Session before submission.
    stripe_session_id = case when p_method = 'stripe' then v_order.stripe_session_id else null end,
    checkout_reservation_token = null,
    checkout_reserved_at = null,
    stripe_session_expires_at = null
  where id = p_order_id;

  return jsonb_build_object('won', true, 'method', p_method, 'cardId', v_card.id,
    'slug', v_card.slug, 'eventName', public.duitnow_card_event_name(v_final));
end $$;

-- Do not reserve or attach a Checkout Session to an order which has left the
-- pending state. The exact-token release remains the only way to clear a bound
-- reservation before a manual submission.
create or replace function public.reserve_checkout(p_order_id uuid, p_owner uuid)
returns json
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from p_owner then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into c from public.cards where order_id = o.id for update;
  if not found then raise exception 'CARD_MISSING'; end if;
  if o.status <> 'pending' then raise exception 'ORDER_PAID'; end if;
  if c.is_published or c.custom_data_draft is null then raise exception 'CARD_NOT_EDITING'; end if;
  -- Symmetric method exclusivity: a pending manual submission has already
  -- frozen the fulfillment snapshot and awaits a human decision. Do not create
  -- a new card-charge opportunity until that immutable review is appended.
  -- Rejected submissions have a review, so a later method choice stays valid.
  if exists (
    select 1
    from public.duitnow_transfer_submissions s
    where s.order_id = o.id
      and not exists (
        select 1 from public.duitnow_payment_reviews r where r.submission_id = s.id
      )
  ) then
    raise exception 'DUITNOW_REVIEW_PENDING' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if o.checkout_reservation_token is null then
    update public.orders set checkout_reservation_token = gen_random_uuid(), checkout_reserved_at = now()
      where id = o.id returning * into o;
  end if;
  return json_build_object('reservationToken', o.checkout_reservation_token,
    'stripeSessionId', o.stripe_session_id, 'stripeSessionExpiresAt', o.stripe_session_expires_at,
    'priceMyr', o.price_myr, 'templateId', o.template_id);
end $$;

create or replace function public.attach_checkout_session(
  p_order_id uuid, p_owner uuid, p_reservation_token uuid,
  p_stripe_session_id text, p_stripe_session_expires_at timestamptz
) returns boolean
language plpgsql
as $$
declare
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from p_owner then return false; end if;
  select * into c from public.cards where order_id = o.id for update;
  if not found or o.status <> 'pending' or c.is_published then return false; end if;
  if exists (
    select 1
    from public.duitnow_transfer_submissions s
    where s.order_id = o.id
      and not exists (
        select 1 from public.duitnow_payment_reviews r where r.submission_id = s.id
      )
  ) then return false; end if;
  if o.checkout_reservation_token is distinct from p_reservation_token then return false; end if;
  if o.stripe_session_id is not null and o.stripe_session_id is distinct from p_stripe_session_id then return false; end if;
  update public.orders set stripe_session_id = p_stripe_session_id,
    stripe_session_expires_at = p_stripe_session_expires_at where id = o.id;
  return true;
end $$;

revoke all on function public.submit_duitnow_transfer(uuid, int, text) from public, anon;
grant execute on function public.submit_duitnow_transfer(uuid, int, text) to authenticated;
revoke all on function public.complete_order_payment(uuid, text, text, jsonb),
  public.reserve_checkout(uuid, uuid), public.attach_checkout_session(uuid, uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_order_payment(uuid, text, text, jsonb),
  public.reserve_checkout(uuid, uuid), public.attach_checkout_session(uuid, uuid, uuid, text, timestamptz)
  to service_role;
