-- Close the legacy Stripe completion bypass and make DuitNow reference
-- validation authoritative at the database boundary.
--
-- The old record_paid_checkout_session() predates the shared completion
-- transition. It remains callable for trusted legacy callers, but now resolves
-- its durable Stripe Session binding and delegates all state changes to the
-- first-payment-wins publication transaction.

create or replace function public.record_paid_checkout_session(p_stripe_session_id text)
returns json
language plpgsql
as $$
declare
  v_order_id uuid;
  v_completion jsonb;
begin
  select id into v_order_id
  from public.orders
  where stripe_session_id = p_stripe_session_id;

  if not found then
    raise exception 'CHECKOUT_SESSION_NOT_FOUND';
  end if;

  v_completion := public.complete_order_payment(
    v_order_id,
    'stripe',
    p_stripe_session_id,
    null
  );

  return v_completion::json;
end;
$$;

-- Stored values are already trimmed by submit_duitnow_transfer(). Retain the
-- same constraint on the immutable table so no direct RPC or future trusted
-- writer can persist a value outside the shared HTTP validator contract.
alter table public.duitnow_transfer_submissions
  add constraint duitnow_transfer_submissions_reference_format_check
  check (
    transfer_reference = btrim(transfer_reference)
    and char_length(transfer_reference) between 3 and 64
    and transfer_reference ~ '^[A-Za-z0-9][A-Za-z0-9 .,&+/():#@''-]*$'
  );

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

  if exists (
    select 1 from public.duitnow_transfer_submissions s
    where s.order_id = p_order_id
      and not exists (
        select 1 from public.duitnow_payment_reviews r where r.submission_id = s.id)
  ) then
    raise exception 'ALREADY_SUBMITTED' using errcode = 'unique_violation';
  end if;

  select * into v_slot from public.duitnow_payment_slots
  where slot_number = p_slot_number
  for update;
  if not found
     or not v_slot.enabled
     or btrim(v_slot.payee_name) = ''
     or btrim(v_slot.provider) = ''
     or btrim(v_slot.qr_image_url) = '' then
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
    v_order.price_myr, v_ref,
    v_card.custom_data_draft)
  returning id into v_submission;

  return jsonb_build_object('submissionId', v_submission);
end $$;

-- CREATE OR REPLACE retains the existing execute ACLs: the legacy Stripe
-- wrapper remains service-role-only and customer submission remains available
-- to authenticated callers only.
