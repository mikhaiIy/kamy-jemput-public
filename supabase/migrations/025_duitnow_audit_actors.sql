-- Attribute DuitNow slot changes and payment reviews to the authenticated
-- administrator, rather than the service-role database session used by server
-- actions. The caller identity is validated inside these guarded RPCs before
-- it is written to an immutable audit record.

create function public.admin_update_duitnow_slot(
  p_admin_id uuid,
  p_slot_number int,
  p_enabled boolean,
  p_label text,
  p_payee_name text,
  p_provider text,
  p_qr_image_url text,
  p_instructions text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old public.duitnow_payment_slots%rowtype;
  v_new public.duitnow_payment_slots%rowtype;
begin
  if p_admin_id is null or not exists (
    select 1 from public.users u
    where u.id = p_admin_id and u.role = 'admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  if p_slot_number not in (1, 2) then
    raise exception 'SLOT_INVALID' using errcode = 'check_violation';
  end if;

  if p_enabled and (
    btrim(coalesce(p_payee_name, '')) = ''
    or btrim(coalesce(p_provider, '')) = ''
    or btrim(coalesce(p_qr_image_url, '')) = ''
  ) then
    raise exception 'SLOT_INCOMPLETE' using errcode = 'check_violation';
  end if;

  select * into v_old from public.duitnow_payment_slots
  where slot_number = p_slot_number
  for update;
  if not found then
    raise exception 'SLOT_INVALID' using errcode = 'check_violation';
  end if;

  update public.duitnow_payment_slots
  set enabled = p_enabled,
      label = btrim(coalesce(p_label, '')),
      payee_name = btrim(coalesce(p_payee_name, '')),
      provider = btrim(coalesce(p_provider, '')),
      qr_image_url = btrim(coalesce(p_qr_image_url, '')),
      instructions = coalesce(p_instructions, ''),
      version = version + 1,
      updated_at = now()
  where slot_number = p_slot_number
  returning * into v_new;

  insert into public.duitnow_slot_history
    (slot_number, version, previous_config, config, changed_by)
  values (
    p_slot_number, v_new.version,
    jsonb_build_object(
      'slotNumber', v_old.slot_number, 'version', v_old.version, 'enabled', v_old.enabled,
      'label', v_old.label, 'payeeName', v_old.payee_name, 'provider', v_old.provider,
      'qrImageUrl', v_old.qr_image_url, 'instructions', v_old.instructions),
    jsonb_build_object(
      'slotNumber', v_new.slot_number, 'version', v_new.version, 'enabled', v_new.enabled,
      'label', v_new.label, 'payeeName', v_new.payee_name, 'provider', v_new.provider,
      'qrImageUrl', v_new.qr_image_url, 'instructions', v_new.instructions),
    p_admin_id);

  return jsonb_build_object('version', v_new.version, 'enabled', v_new.enabled);
end $$;

create function public.admin_review_duitnow_submission(
  p_admin_id uuid,
  p_submission_id uuid,
  p_outcome text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.duitnow_transfer_submissions%rowtype;
  v_completion jsonb;
begin
  if p_admin_id is null or not exists (
    select 1 from public.users u
    where u.id = p_admin_id and u.role = 'admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;

  if p_outcome not in ('confirmed', 'rejected') then
    raise exception 'OUTCOME_INVALID' using errcode = 'check_violation';
  end if;

  select * into v_submission from public.duitnow_transfer_submissions
  where id = p_submission_id
  for update;
  if not found then
    raise exception 'SUBMISSION_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  if exists (
    select 1 from public.duitnow_payment_reviews where submission_id = p_submission_id
  ) then
    raise exception 'ALREADY_REVIEWED' using errcode = 'unique_violation';
  end if;

  insert into public.duitnow_payment_reviews
    (submission_id, order_id, slot_version, transfer_reference, outcome, reviewer, note)
  values
    (p_submission_id, v_submission.order_id, v_submission.slot_version,
     v_submission.transfer_reference, p_outcome, p_admin_id, coalesce(p_note, ''));

  if p_outcome = 'confirmed' then
    v_completion := public.complete_order_payment(
      v_submission.order_id, 'duitnow',
      v_submission.transfer_reference, v_submission.draft_snapshot);
    return jsonb_build_object(
      'reviewed', true,
      'won', coalesce((v_completion->>'won')::boolean, false),
      'reason', v_completion->>'reason',
      'slug', v_completion->>'slug',
      'eventName', v_completion->>'eventName');
  end if;

  return jsonb_build_object('reviewed', true, 'won', false);
end $$;

-- Remove the unauditable signatures after their actor-aware replacements are
-- in place. Only the new guarded RPC contracts are executable by service_role.
drop function public.admin_update_duitnow_slot(int, boolean, text, text, text, text, text);
drop function public.admin_review_duitnow_submission(uuid, text, text);

revoke all on function public.admin_update_duitnow_slot(
  uuid, int, boolean, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.admin_review_duitnow_submission(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_update_duitnow_slot(
  uuid, int, boolean, text, text, text, text, text
), public.admin_review_duitnow_submission(uuid, uuid, text, text)
  to service_role;
