-- Issue #70: append-only manual payment review and paid-draft entitlement.
--
-- Migration 029 already owns the private customer receipt boundary. This
-- migration extends that boundary without replacing it: every receipt stays
-- immutable, each attempt keeps its replacement lineage, and review decisions
-- are appended rather than edited. The durable method ids remain `duitnow`
-- and `tng` for compatibility with #69/#68; the admin/customer labels are
-- Bank DuitNow and Touch 'n Go.

alter table public.orders
  add column if not exists manual_paid_draft boolean not null default false;

alter table public.manual_payment_attempts
  add column if not exists prior_attempt_id uuid;

alter table public.manual_payment_attempts
  drop constraint if exists manual_payment_attempts_state_check,
  add constraint manual_payment_attempts_state_check
    check (state in ('submitted', 'rejected', 'insufficient', 'confirmed', 'duplicate'));

alter table public.manual_payment_attempts
  drop constraint if exists manual_payment_attempts_prior_attempt_id_fkey,
  add constraint manual_payment_attempts_prior_attempt_id_fkey
    foreign key (prior_attempt_id) references public.manual_payment_attempts(id)
    on delete restrict;

create index if not exists manual_payment_attempts_order_state_idx
  on public.manual_payment_attempts(order_id, state, created_at desc, id desc);

-- A review correction is a new immutable row linked to the decision it
-- corrects. There is one initial review per receipt and one direct correction
-- per decision; retries can therefore be identified without updating audit.
alter table public.manual_payment_reviews
  drop constraint if exists manual_payment_reviews_receipt_id_key,
  add column if not exists replaces_review_id uuid,
  add column if not exists credited_amount_sen integer not null default 0,
  add column if not exists remaining_amount_sen integer not null default 0,
  add column if not exists excess_amount_sen integer not null default 0,
  add column if not exists evidence_object_path text,
  add column if not exists evidence_content_type text,
  add column if not exists evidence_size_bytes integer,
  add column if not exists evidence_sha256 text;

alter table public.manual_payment_reviews
  drop constraint if exists manual_payment_reviews_outcome_check,
  drop constraint if exists manual_payment_reviews_check,
  drop constraint if exists manual_payment_reviews_amounts_check,
  drop constraint if exists manual_payment_reviews_evidence_metadata_check,
  add constraint manual_payment_reviews_outcome_check
    check (outcome in ('confirmed', 'insufficient', 'rejected', 'duplicate')),
  add constraint manual_payment_reviews_amounts_check
    check (
      received_amount_sen >= 0
      and credited_amount_sen >= 0
      and remaining_amount_sen >= 0
      and excess_amount_sen >= 0
      and (outcome <> 'rejected' or (received_amount_sen = 0 and credited_amount_sen = 0 and length(btrim(reason)) > 0))
      and (outcome <> 'duplicate' or (received_amount_sen > 0 and credited_amount_sen = 0))
      and (outcome not in ('confirmed', 'insufficient') or received_amount_sen > 0)
    ),
  add constraint manual_payment_reviews_evidence_metadata_check
    check (
      (evidence_object_path is null and evidence_content_type is null and evidence_size_bytes is null and evidence_sha256 is null)
      or (evidence_object_path is not null and evidence_content_type is not null and evidence_size_bytes between 1 and 5242880 and evidence_sha256 ~ '^[a-f0-9]{64}$')
    );

alter table public.manual_payment_reviews
  drop constraint if exists manual_payment_reviews_replaces_review_id_fkey,
  add constraint manual_payment_reviews_replaces_review_id_fkey
    foreign key (replaces_review_id) references public.manual_payment_reviews(id)
    on delete restrict;

create unique index if not exists manual_payment_reviews_initial_receipt_idx
  on public.manual_payment_reviews(receipt_id)
  where replaces_review_id is null;
create unique index if not exists manual_payment_reviews_one_correction_idx
  on public.manual_payment_reviews(replaces_review_id)
  where replaces_review_id is not null;
create index if not exists manual_payment_reviews_receipt_recent_idx
  on public.manual_payment_reviews(receipt_id, created_at desc, id desc);

-- New evidence supplied by an administrator is separate from the customer
-- receipt bucket. It is private and can only be reached through an
-- authenticated administrator server action that creates a short-lived link.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-review-evidence', 'payment-review-evidence', false, 5242880,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_review_evidence_no_browser_access on storage.objects;
create policy payment_review_evidence_no_browser_access on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'payment-review-evidence')
  with check (bucket_id <> 'payment-review-evidence');

-- The queue is the one-row-per-attempt projection used by the administrator
-- workspace. It contains receipt metadata needed to make a decision, but no
-- customer-facing endpoint is granted access to it.
drop view if exists public.manual_payment_queue;
create view public.manual_payment_queue as
with current_attempts as (
  select
    a.id,
    a.order_id,
    a.prior_attempt_id,
    a.created_at,
    a.method,
    a.state,
    a.current_receipt_id,
    o.price_myr,
    o.status as order_status,
    o.payment_method,
    o.payment_completed_at,
    o.manual_paid_draft,
    u.email,
    r.object_path,
    r.version as receipt_version,
    r.transfer_reference,
    r.content_type,
    r.size_bytes,
    x.state as receipt_access,
    v.id as review_id,
    v.outcome as review_outcome,
    v.reason,
    v.reviewer,
    v.created_at as reviewed_at,
    v.received_amount_sen,
    v.credited_amount_sen,
    v.remaining_amount_sen,
    v.excess_amount_sen,
    v.evidence_object_path,
    v.evidence_content_type,
    v.evidence_size_bytes,
    v.evidence_sha256
  from public.manual_payment_attempts a
  join public.orders o on o.id = a.order_id
  left join public.users u on u.id = a.user_id
  join public.payment_receipts r on r.id = a.current_receipt_id
  left join public.payment_receipt_access x on x.receipt_id = r.id
  left join lateral (
    select v0.*
    from public.manual_payment_reviews v0
    where v0.receipt_id = r.id
    order by v0.created_at desc, v0.id desc
    limit 1
  ) v on true
), effective_totals as (
  select
    a.order_id,
    coalesce(sum(case when a.review_outcome <> 'rejected' then a.received_amount_sen else 0 end), 0)::integer as total_sen,
    coalesce(sum(a.credited_amount_sen), 0)::integer as credited_total_sen
  from current_attempts a
  group by a.order_id
)
select
  a.id,
  a.order_id,
  a.prior_attempt_id,
  a.current_receipt_id,
  a.created_at,
  a.method,
  'payment-receipts'::text as receipt_bucket,
  a.object_path as receipt_object,
  a.receipt_version,
  a.transfer_reference as customer_reference,
  a.email,
  a.price_myr,
  coalesce(t.total_sen, 0) as total_sen,
  coalesce(t.credited_total_sen, 0) as credited_total_sen,
  a.review_id,
  coalesce(a.review_outcome, 'pending') as outcome,
  a.reason,
  a.reviewer,
  a.reviewed_at,
  a.received_amount_sen as received_sen,
  a.credited_amount_sen as credited_sen,
  coalesce(a.remaining_amount_sen, greatest(0, a.price_myr - coalesce(t.credited_total_sen, 0))) as remaining_sen,
  a.excess_amount_sen as excess_sen,
  'payment-review-evidence'::text as evidence_bucket,
  a.evidence_object_path as evidence_object,
  a.evidence_content_type,
  a.evidence_size_bytes,
  a.evidence_sha256,
  a.receipt_access,
  a.content_type as receipt_content_type,
  a.size_bytes as receipt_size_bytes,
  a.order_status,
  a.payment_method,
  a.payment_completed_at,
  a.manual_paid_draft
from current_attempts a
left join effective_totals t on t.order_id = a.order_id;

revoke all on public.manual_payment_queue from public, anon, authenticated;
grant select on public.manual_payment_queue to service_role;

-- Replace the submission boundary so a reviewed partial payment can be
-- followed by another immutable attempt, and a paid draft can record a later
-- duplicate without opening a second entitlement.
create or replace function public.submit_manual_receipt(
  p_owner uuid, p_order_id uuid, p_receipt_id uuid, p_attempt_id uuid,
  p_expected_receipt uuid, p_method text, p_slot integer, p_reference text,
  p_path text, p_type text, p_size integer, p_sha text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o public.orders%rowtype;
  a public.manual_payment_attempts%rowtype;
  prior public.manual_payment_attempts%rowtype;
  r public.payment_receipts%rowtype;
  s public.duitnow_payment_slots%rowtype;
  t public.tng_payment_config%rowtype;
  c public.cards%rowtype;
  snap jsonb;
  next_version integer;
begin
  if p_method is null or p_method not in ('duitnow', 'tng') then
    raise exception 'METHOD_INVALID';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id is distinct from p_owner then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- The operation id is the retry key. Check it before status gates so a
  -- successful old upload remains replayable after the order is paid.
  select * into r from public.payment_receipts where id = p_receipt_id;
  if found then
    select * into a from public.manual_payment_attempts where id = r.attempt_id;
    if a.order_id <> o.id or a.user_id <> p_owner or r.sha256 <> p_sha
       or r.object_path <> p_path
       or r.transfer_reference <> coalesce(p_reference, '')
       or a.method <> p_method
       or (p_attempt_id is null and p_method = 'duitnow'
           and (a.slot_snapshot->>'slotNumber')::integer is distinct from p_slot)
       or (p_attempt_id is not null and a.id <> p_attempt_id) then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return a.id;
  end if;

  if o.status <> 'pending' and not (
    o.status = 'paid' and o.manual_paid_draft is true and o.payment_method = p_method
  ) then
    raise exception 'ORDER_CLOSED';
  end if;
  if o.status = 'pending'
     and (o.checkout_reservation_token is not null or o.stripe_session_id is not null) then
    raise exception 'CHECKOUT_RECONCILIATION_REQUIRED';
  end if;
  if p_path <> o.id::text || '/' || p_receipt_id::text || '/' || p_sha then
    raise exception 'RECEIPT_INVALID';
  end if;
  if p_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
     or p_size < 1 or p_size > 5242880
     or p_sha !~ '^[a-f0-9]{64}$' then
    raise exception 'RECEIPT_INVALID';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'payment-receipts' and name = p_path
  ) then
    raise exception 'RECEIPT_REQUIRED';
  end if;

  if o.status = 'pending' and exists (
    select 1 from public.duitnow_transfer_submissions legacy_s
    where legacy_s.order_id = o.id
      and not exists (
        select 1 from public.duitnow_payment_reviews legacy_r
        where legacy_r.submission_id = legacy_s.id
      )
  ) then
    raise exception 'DUITNOW_REVIEW_PENDING';
  end if;

  if exists (
    select 1 from public.manual_payment_attempts old_a
    where old_a.order_id = o.id
      and old_a.state in ('submitted', 'insufficient', 'confirmed', 'duplicate')
      and old_a.method <> p_method
  ) then
    raise exception 'MANUAL_METHOD_LOCKED';
  end if;

  select * into c from public.cards where order_id = o.id for update;
  if not found or c.custom_data_draft is null then
    raise exception 'FULFILLMENT_SNAPSHOT_MISSING';
  end if;

  if p_attempt_id is not null then
    select * into a from public.manual_payment_attempts where id = p_attempt_id for update;
    if not found or a.order_id <> o.id or a.user_id <> p_owner then
      raise exception 'ORDER_NOT_FOUND';
    end if;
    if a.state = 'confirmed' or a.state = 'insufficient'
       or a.state = 'duplicate' or a.method <> p_method
       or a.current_receipt_id is distinct from p_expected_receipt then
      raise exception 'RECEIPT_CHANGED';
    end if;
    if a.state = 'rejected' and not exists (
      select 1 from public.manual_payment_reviews v
      where v.receipt_id = a.current_receipt_id
        and v.outcome = 'rejected'
        and length(btrim(v.reason)) > 0
    ) then
      raise exception 'REJECTION_REASON_REQUIRED';
    end if;
  else
    if exists (
      select 1 from public.manual_payment_attempts old_a
      where old_a.order_id = o.id and old_a.state in ('submitted', 'rejected')
    ) then
      raise exception 'REPLACE_CURRENT_RECEIPT';
    end if;

    if p_method = 'duitnow' then
      select * into s from public.duitnow_payment_slots
      where slot_number = p_slot and enabled for share;
      if not found or btrim(s.payee_name) = '' or btrim(s.provider) = ''
         or btrim(s.qr_image_url) = '' then
        raise exception 'SLOT_UNAVAILABLE';
      end if;
      snap := jsonb_build_object(
        'slotNumber', s.slot_number, 'version', s.version,
        'payeeName', s.payee_name, 'qrImageUrl', s.qr_image_url,
        'provider', s.provider, 'instructions', s.instructions
      );
    else
      select * into t from public.tng_payment_config
      where id = true and enabled for share;
      if not found or btrim(t.payee_name) = '' or btrim(t.qr_image_url) = '' then
        raise exception 'SLOT_UNAVAILABLE';
      end if;
      snap := jsonb_build_object(
        'version', t.version, 'payeeName', t.payee_name,
        'qrImageUrl', t.qr_image_url, 'provider', 'Touch ''n Go',
        'instructions', t.instructions
      );
    end if;

    select * into prior from public.manual_payment_attempts
    where order_id = o.id order by created_at desc, id desc limit 1;
    insert into public.manual_payment_attempts(
      order_id, user_id, price_sen, method, slot_snapshot, draft_snapshot, prior_attempt_id
    ) values (
      o.id, p_owner, o.price_myr, p_method, snap, c.custom_data_draft,
      prior.id
    ) returning * into a;
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.payment_receipts where attempt_id = a.id;

  insert into public.payment_receipts(
    id, attempt_id, version, object_path, content_type, size_bytes, sha256,
    transfer_reference
  ) values (
    p_receipt_id, a.id, next_version, p_path, p_type, p_size, p_sha,
    coalesce(p_reference, '')
  );

  insert into public.payment_receipt_access(receipt_id) values (p_receipt_id);
  update public.manual_payment_attempts
  set current_receipt_id = p_receipt_id, state = 'submitted'
  where id = a.id;
  return a.id;
end;
$$;

-- Single transactional review boundary. The client may suggest a remaining
-- balance, but this function calculates it again while holding the order and
-- attempt locks. `p_expected_review_id` is required for duplicate correction.
create or replace function public.admin_review_manual_payment(
  p_admin_id uuid,
  p_attempt_id uuid,
  p_outcome text,
  p_received_sen integer,
  p_remaining_sen integer,
  p_reason text,
  p_evidence_object_path text,
  p_expected_review_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.manual_payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_receipt public.payment_receipts%rowtype;
  v_current public.manual_payment_reviews%rowtype;
  v_expected public.manual_payment_reviews%rowtype;
  v_existing public.manual_payment_reviews%rowtype;
  v_card public.cards%rowtype;
  v_order_id uuid;
  v_prior_credited bigint := 0;
  v_prior_received bigint := 0;
  v_remaining_before bigint;
  v_total_credited bigint;
  v_total_received bigint;
  v_effective_outcome text;
  v_received integer;
  v_credited integer;
  v_remaining integer;
  v_excess integer;
  v_review_id uuid;
  v_won boolean := false;
  v_correction boolean := false;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_evidence_content_type text;
  v_evidence_size integer;
  v_evidence_sha text;
begin
  if not exists (
    select 1 from public.users where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if p_outcome not in ('confirmed', 'insufficient', 'rejected', 'duplicate') then
    raise exception 'OUTCOME_INVALID';
  end if;
  if p_received_sen is null or p_received_sen < 0 or p_received_sen > 999999999 then
    raise exception 'AMOUNT_INVALID';
  end if;
  if length(v_reason) > 1000 then
    raise exception 'REASON_INVALID';
  end if;
  if p_outcome in ('rejected', 'insufficient', 'duplicate') and v_reason = '' then
    raise exception 'REASON_REQUIRED';
  end if;
  if p_outcome = 'rejected' and p_received_sen <> 0 then
    raise exception 'AMOUNT_INVALID';
  end if;

  select order_id into v_order_id
  from public.manual_payment_attempts where id = p_attempt_id;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  -- Every payment transition locks the order before its card. The attempt is
  -- locked after the order, so checkout, receipt submission and review share a
  -- deterministic lock order under concurrency.
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_attempt from public.manual_payment_attempts
  where id = p_attempt_id for update;
  if not found or v_attempt.order_id <> v_order.id then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;
  select * into v_receipt from public.payment_receipts
  where id = v_attempt.current_receipt_id;
  if not found then raise exception 'RECEIPT_NOT_FOUND'; end if;
  if p_outcome <> 'rejected' and not exists (
    select 1 from public.payment_receipt_access
    where receipt_id = v_receipt.id and state = 'available'
  ) then
    raise exception 'RECEIPT_UNAVAILABLE';
  end if;

  select * into v_current from public.manual_payment_reviews
  where receipt_id = v_receipt.id
  order by created_at desc, id desc limit 1;

  if p_expected_review_id is not null then
    select * into v_expected from public.manual_payment_reviews
    where id = p_expected_review_id;
    if not found or v_expected.receipt_id <> v_receipt.id
       or v_expected.outcome <> 'duplicate' then
      raise exception 'STALE_REVIEW';
    end if;
    select * into v_existing from public.manual_payment_reviews
    where replaces_review_id = p_expected_review_id;
    if found then
      if v_existing.outcome <> p_outcome
         or v_existing.received_amount_sen <> p_received_sen
         or v_existing.reason <> v_reason
         or v_existing.evidence_object_path is distinct from p_evidence_object_path then
        raise exception 'REVIEW_CONFLICT';
      end if;
      select coalesce(sum(case when e.outcome <> 'rejected' then e.received_sen else 0 end), 0),
             coalesce(sum(e.credited_sen), 0)
      into v_total_received, v_total_credited
      from public.manual_payment_queue e
      where e.order_id = v_order.id;
      return jsonb_build_object(
        'id', v_existing.id, 'outcome', v_existing.outcome,
        'receivedSen', v_existing.received_amount_sen,
        'creditedSen', v_existing.credited_amount_sen,
        'remainingSen', v_existing.remaining_amount_sen,
        'excessSen', v_existing.excess_amount_sen,
        'receivedTotal', v_total_received, 'creditedTotal', v_total_credited,
        'remainingTotalSen', greatest(0, v_order.price_myr - v_total_credited),
        'excessTotalSen', greatest(0, v_total_received - v_order.price_myr),
        'replayed', true, 'won', false, 'duplicate', v_existing.outcome = 'duplicate',
        'paidDraft', v_order.manual_paid_draft
      );
    end if;
    -- A correction retry arrives after the append-only correction has become
    -- the latest review. It is still idempotent when it repeats the same
    -- correction; only a new correction requires the duplicate to be current.
    if v_expected.id is distinct from v_current.id then
      raise exception 'STALE_REVIEW';
    end if;
    v_correction := true;
  elsif v_current.id is not null then
    if v_current.outcome <> p_outcome
       or v_current.received_amount_sen <> p_received_sen
       or v_current.reason <> v_reason
       or v_current.evidence_object_path is distinct from p_evidence_object_path then
      raise exception 'ALREADY_REVIEWED';
    end if;
    select coalesce(sum(case when e.outcome <> 'rejected' then e.received_sen else 0 end), 0),
           coalesce(sum(e.credited_sen), 0)
    into v_total_received, v_total_credited
    from public.manual_payment_queue e
    where e.order_id = v_order.id;
    return jsonb_build_object(
      'id', v_current.id, 'outcome', v_current.outcome,
      'receivedSen', v_current.received_amount_sen,
      'creditedSen', v_current.credited_amount_sen,
      'remainingSen', v_current.remaining_amount_sen,
      'excessSen', v_current.excess_amount_sen,
      'receivedTotal', v_total_received, 'creditedTotal', v_total_credited,
      'remainingTotalSen', greatest(0, v_order.price_myr - v_total_credited),
      'excessTotalSen', greatest(0, v_total_received - v_order.price_myr),
      'replayed', true, 'won', false, 'duplicate', v_current.outcome = 'duplicate',
      'paidDraft', v_order.manual_paid_draft
    );
  elsif v_attempt.state <> 'submitted' then
    raise exception 'RECEIPT_CHANGED';
  end if;

  select coalesce(sum(e.credited_sen), 0),
         coalesce(sum(case when e.outcome <> 'rejected' then e.received_sen else 0 end), 0)
  into v_prior_credited, v_prior_received
  from public.manual_payment_queue e
  where e.order_id = v_order.id and e.id <> v_attempt.id;
  v_remaining_before := greatest(0, v_order.price_myr - v_prior_credited);

  -- A confirmed manual receipt after any paid transition is a duplicate. A
  -- duplicate can later be corrected, but it never creates a second draft.
  if v_order.status = 'paid' and p_outcome <> 'rejected' and not v_correction then
    v_effective_outcome := 'duplicate';
    v_received := p_received_sen;
    if v_received <= 0 then raise exception 'AMOUNT_INVALID'; end if;
    v_credited := 0;
    v_remaining := greatest(0, v_remaining_before);
    v_excess := v_received;
  elsif p_outcome = 'rejected' then
    v_effective_outcome := 'rejected';
    v_received := 0;
    v_credited := 0;
    v_remaining := v_remaining_before;
    v_excess := 0;
  elsif p_outcome = 'duplicate' then
    if v_order.status <> 'paid' and v_prior_credited < v_order.price_myr then
      raise exception 'DUPLICATE_INVALID';
    end if;
    if p_received_sen <= 0 then raise exception 'AMOUNT_INVALID'; end if;
    v_effective_outcome := 'duplicate';
    v_received := p_received_sen;
    v_credited := 0;
    v_remaining := v_remaining_before;
    v_excess := v_received;
  elsif v_order.status = 'paid' and v_correction then
    if p_outcome = 'insufficient' then raise exception 'ORDER_ALREADY_PAID'; end if;
    if p_received_sen <= 0 then raise exception 'AMOUNT_INVALID'; end if;
    v_effective_outcome := 'confirmed';
    v_received := p_received_sen;
    v_credited := 0;
    v_remaining := v_remaining_before;
    v_excess := v_received;
  elsif p_outcome = 'insufficient' then
    if p_received_sen <= 0 or v_remaining_before <= 0 or p_received_sen >= v_remaining_before then
      raise exception 'INSUFFICIENT_AMOUNT_INVALID';
    end if;
    if p_evidence_object_path is null
       or p_evidence_object_path !~ ('^review-evidence/' || v_order.id::text || '/')
       or not exists (
         select 1 from storage.objects
         where bucket_id = 'payment-review-evidence'
           and name = p_evidence_object_path
       ) then
      raise exception 'PRIVATE_EVIDENCE_REQUIRED';
    end if;
    v_effective_outcome := 'insufficient';
    v_received := p_received_sen;
    v_credited := p_received_sen;
    v_remaining := v_remaining_before - p_received_sen;
    v_excess := 0;
  else
    if p_received_sen <= 0 then raise exception 'AMOUNT_INVALID'; end if;
    -- A legacy five-argument caller can still record a partial amount. The
    -- stored decision is normalized to Insufficient, while the new admin UI
    -- presents the explicit Insufficient action and evidence requirement.
    if p_received_sen < v_remaining_before then
      v_effective_outcome := 'insufficient';
      v_received := p_received_sen;
      v_credited := p_received_sen;
      v_remaining := v_remaining_before - p_received_sen;
      v_excess := 0;
    else
      v_effective_outcome := 'confirmed';
      v_received := p_received_sen;
      v_credited := least(p_received_sen::bigint, v_remaining_before)::integer;
      v_remaining := greatest(0, v_remaining_before - v_credited);
      v_excess := greatest(0, p_received_sen - v_remaining_before);
    end if;
  end if;

  if p_remaining_sen is not null and p_remaining_sen <> v_remaining then
    raise exception 'REMAINING_MISMATCH';
  end if;

  if p_evidence_object_path is not null then
    if p_evidence_object_path !~ ('^review-evidence/' || v_order.id::text || '/')
       or not exists (
         select 1 from storage.objects
         where bucket_id = 'payment-review-evidence'
           and name = p_evidence_object_path
       ) then
      raise exception 'PRIVATE_EVIDENCE_REQUIRED';
    end if;
    select
      nullif(metadata->>'mimetype', ''),
      nullif(metadata->>'size', '')::integer,
      nullif(metadata->>'sha256', '')
    into v_evidence_content_type, v_evidence_size, v_evidence_sha
    from storage.objects
    where bucket_id = 'payment-review-evidence' and name = p_evidence_object_path;
    v_evidence_content_type := coalesce(v_evidence_content_type, 'application/octet-stream');
    v_evidence_size := coalesce(v_evidence_size, 1);
    v_evidence_sha := coalesce(v_evidence_sha, split_part(p_evidence_object_path, '/', 4));
  end if;

  insert into public.manual_payment_reviews(
    receipt_id, replaces_review_id, outcome, received_amount_sen,
    credited_amount_sen, remaining_amount_sen, excess_amount_sen, reviewer,
    reason, evidence_object_path, evidence_content_type, evidence_size_bytes,
    evidence_sha256
  ) values (
    v_receipt.id, case when v_correction then p_expected_review_id else null end,
    v_effective_outcome, v_received, v_credited, v_remaining, v_excess,
    p_admin_id, v_reason, p_evidence_object_path, v_evidence_content_type,
    v_evidence_size, v_evidence_sha
  ) returning id into v_review_id;

  update public.manual_payment_attempts
  set state = v_effective_outcome
  where id = v_attempt.id;

  select coalesce(sum(e.credited_sen), 0),
         coalesce(sum(case when e.outcome <> 'rejected' then e.received_sen else 0 end), 0)
  into v_total_credited, v_total_received
  from public.manual_payment_queue e
  where e.order_id = v_order.id;

  if v_order.status = 'pending' and v_total_credited >= v_order.price_myr then
    select * into v_card from public.cards where order_id = v_order.id for update;
    if not found or v_card.custom_data_draft is null or v_card.is_published then
      raise exception 'FULFILLMENT_SNAPSHOT_MISSING';
    end if;
    update public.orders set
      status = 'paid',
      payment_method = v_attempt.method,
      payment_completed_at = now(),
      manual_paid_draft = true,
      checkout_reservation_token = null,
      checkout_reserved_at = null,
      stripe_session_id = null,
      stripe_session_expires_at = null
    where id = v_order.id;
    v_won := true;
  end if;

  return jsonb_build_object(
    'id', v_review_id, 'orderId', v_order.id,
    'outcome', v_effective_outcome, 'receivedSen', v_received,
    'creditedSen', v_credited, 'remainingSen', v_remaining,
    'excessSen', v_excess, 'receivedTotal', v_total_received,
    'creditedTotal', v_total_credited,
    'remainingTotalSen', greatest(0, v_order.price_myr - v_total_credited),
    'excessTotalSen', greatest(0, v_total_received - v_order.price_myr),
    'replayed', false, 'won', v_won,
    'duplicate', v_effective_outcome = 'duplicate',
    'paidDraft', (v_order.manual_paid_draft or v_won),
    'published', false
  );
end;
$$;

-- Keep the #69 receipt-review function signature for existing integration
-- callers. New admin code uses the attempt-oriented function above.
create or replace function public.review_manual_receipt(
  p_admin uuid, p_receipt uuid, p_outcome text, p_amount integer, p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt uuid;
  v_current_receipt uuid;
begin
  select r.attempt_id, a.current_receipt_id into v_attempt, v_current_receipt
  from public.payment_receipts r
  join public.manual_payment_attempts a on a.id = r.attempt_id
  where r.id = p_receipt;
  if not found then raise exception 'RECEIPT_NOT_FOUND'; end if;
  if v_current_receipt is distinct from p_receipt then raise exception 'RECEIPT_CHANGED'; end if;
  return public.admin_review_manual_payment(
    p_admin, v_attempt, p_outcome, p_amount, null, p_reason, null, null
  );
end;
$$;

-- Legacy transfer rows remain visible and append-only, but cannot bypass the
-- receipt proof boundary or publish an invitation.
create or replace function public.admin_review_duitnow_submission(
  p_admin_id uuid, p_submission_id uuid, p_outcome text, p_note text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.duitnow_transfer_submissions%rowtype;
begin
  if not exists (
    select 1 from public.users where id = p_admin_id and role = 'admin'
  ) then raise exception 'FORBIDDEN'; end if;
  if p_outcome not in ('confirmed', 'rejected') then raise exception 'OUTCOME_INVALID'; end if;
  select * into v_submission from public.duitnow_transfer_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'SUBMISSION_NOT_FOUND'; end if;
  if exists (
    select 1 from public.duitnow_payment_reviews where submission_id = p_submission_id
  ) then raise exception 'ALREADY_REVIEWED'; end if;
  insert into public.duitnow_payment_reviews(
    submission_id, order_id, slot_version, transfer_reference,
    outcome, reviewer, note
  ) values (
    v_submission.id, v_submission.order_id, v_submission.slot_version,
    v_submission.transfer_reference, p_outcome, p_admin_id,
    left(btrim(coalesce(p_note, '')), 1000)
  );
  return jsonb_build_object(
    'reviewed', true, 'won', false,
    'reason', case when p_outcome = 'confirmed' then 'RECEIPT_REQUIRED' else null end
  );
end;
$$;

-- Stripe retains its existing first-completion publication path. Manual
-- methods can only complete through admin_review_manual_payment, which is the
-- sole path that creates a paid draft and never publishes.
create or replace function public.complete_order_payment(
  p_order_id uuid, p_method text, p_reference text, p_draft_snapshot jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_final jsonb;
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

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('won', false, 'reason', 'ORDER_NOT_FOUND');
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('won', false, 'reason', 'ALREADY_COMPLETED');
  end if;
  if v_order.stripe_session_id is distinct from btrim(p_reference) then
    raise exception 'CHECKOUT_SESSION_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select * into v_card from public.cards where order_id = p_order_id for update;
  if not found then raise exception 'ORDER_CARD_MISSING'; end if;
  if p_draft_snapshot is null then
    if v_card.custom_data_draft is null then raise exception 'FULFILLMENT_SNAPSHOT_MISSING'; end if;
    v_final := v_card.custom_data_draft;
  else
    v_final := p_draft_snapshot;
  end if;

  perform set_config('app.payment_completion', 'on', true);
  update public.cards set
    custom_data = v_final,
    custom_data_draft = null,
    is_published = true,
    published_at = coalesce(published_at, now())
  where id = v_card.id;

  update public.orders set
    status = 'paid', payment_method = 'stripe', payment_completed_at = now(),
    stripe_session_id = v_order.stripe_session_id,
    checkout_reservation_token = null,
    checkout_reserved_at = null,
    stripe_session_expires_at = null
  where id = p_order_id;

  return jsonb_build_object(
    'won', true, 'method', 'stripe', 'cardId', v_card.id,
    'slug', v_card.slug, 'eventName', public.duitnow_card_event_name(v_final)
  );
end;
$$;

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
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status is distinct from 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  select * into c from public.cards where order_id = p_order_id for update;
  if not found then raise exception 'CARD_MISSING'; end if;
  if c.is_published then
    return json_build_object('state', 'published', 'slug', c.slug, 'promoted', false);
  end if;
  if o.manual_paid_draft then
    return json_build_object('state', 'paid_draft', 'slug', c.slug, 'promoted', false);
  end if;
  select action into v_last_action from public.card_availability_actions
  where card_id = c.id order by created_at desc, id desc limit 1;
  if v_last_action = 'disabled' then
    return json_build_object('state', 'unavailable', 'slug', c.slug, 'promoted', false);
  end if;
  perform set_config('app.payment_completion', 'on', true);
  update public.cards set
    custom_data = coalesce(c.custom_data_draft, c.custom_data),
    custom_data_draft = null, is_published = true,
    published_at = coalesce(c.published_at, now())
  where id = c.id and is_published = false and custom_data_draft is not null;
  if not found then raise exception 'CARD_NOT_PROMOTABLE'; end if;
  return json_build_object('state', 'published', 'slug', c.slug, 'promoted', true);
end;
$$;

create or replace function public.update_card_draft_if_editing(
  p_card_id uuid, p_draft jsonb
) returns boolean
language plpgsql
as $$
declare
  v_order_id uuid;
  o public.orders%rowtype;
  c public.cards%rowtype;
begin
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then return false; end if;
  select * into o from public.orders where id = v_order_id for update;
  if not found then return false; end if;
  select * into c from public.cards where id = p_card_id for update;
  if not found or c.order_id is distinct from o.id or c.is_published then return false; end if;
  if o.status = 'paid' and not o.manual_paid_draft then return false; end if;
  if o.status not in ('pending', 'paid') or c.custom_data_draft is null then return false; end if;
  update public.cards set custom_data_draft = p_draft
  where id = c.id and is_published = false;
  return found;
end;
$$;

-- A manual pending/partial attempt keeps the saved fulfillment snapshot fixed;
-- the paid-draft owner is explicitly allowed to edit that draft.
create or replace function public.manual_receipt_card_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'DELETE' and exists (
    select 1 from public.manual_payment_attempts where order_id = old.order_id
  ) then
    raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED';
  end if;
  if TG_OP = 'UPDATE' and new.custom_data_draft is distinct from old.custom_data_draft
     and exists (
       select 1 from public.manual_payment_attempts a
       join public.orders o on o.id = a.order_id
       where a.order_id = old.order_id
         and o.status = 'pending'
         and a.state in ('submitted', 'insufficient')
     ) then
    raise exception 'DRAFT_LOCKED_PENDING_REVIEW';
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Stripe cannot be started while manual evidence is awaiting review or a
-- partial amount has already fixed the method. Rejection remains retryable.
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
  if exists (
    select 1 from public.manual_payment_attempts
    where order_id = o.id and state in ('submitted', 'insufficient', 'confirmed', 'duplicate')
  ) then raise exception 'MANUAL_PAYMENT_ACTIVE'; end if;
  if exists (
    select 1 from public.duitnow_transfer_submissions s
    where s.order_id = o.id and not exists (
      select 1 from public.duitnow_payment_reviews r where r.submission_id = s.id
    )
  ) then raise exception 'DUITNOW_REVIEW_PENDING'; end if;
  if o.checkout_reservation_token is null then
    update public.orders set checkout_reservation_token = gen_random_uuid(), checkout_reserved_at = now()
    where id = o.id returning * into o;
  end if;
  return json_build_object(
    'reservationToken', o.checkout_reservation_token,
    'stripeSessionId', o.stripe_session_id,
    'stripeSessionExpiresAt', o.stripe_session_expires_at,
    'priceMyr', o.price_myr, 'templateId', o.template_id
  );
end;
$$;

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
    select 1 from public.manual_payment_attempts
    where order_id = o.id and state in ('submitted', 'insufficient', 'confirmed', 'duplicate')
  ) then raise exception 'MANUAL_PAYMENT_ACTIVE'; end if;
  if exists (
    select 1 from public.duitnow_transfer_submissions s
    where s.order_id = o.id and not exists (
      select 1 from public.duitnow_payment_reviews r where r.submission_id = s.id
    )
  ) then return false; end if;
  if o.checkout_reservation_token is distinct from p_reservation_token then return false; end if;
  if o.stripe_session_id is not null and o.stripe_session_id is distinct from p_stripe_session_id then return false; end if;
  update public.orders set stripe_session_id = p_stripe_session_id,
    stripe_session_expires_at = p_stripe_session_expires_at where id = o.id;
  return true;
end;
$$;

-- Customer projection: current attempt/current receipt/current decision only.
-- It intentionally omits reviewer ids, evidence paths, audit history and
-- earlier receipt versions.
create or replace function public.manual_payment_state(p_order uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
with current_attempts as (
  select a.*, r.id as receipt_id, r.version, r.content_type, r.size_bytes,
    r.transfer_reference, r.created_at as receipt_created_at,
    x.state as receipt_access,
    v.id as review_id, v.outcome as review_outcome,
    v.received_amount_sen, v.credited_amount_sen,
    v.remaining_amount_sen, v.excess_amount_sen, v.reason
  from public.manual_payment_attempts a
  left join public.payment_receipts r on r.id = a.current_receipt_id
  left join public.payment_receipt_access x on x.receipt_id = r.id
  left join lateral (
    select v0.* from public.manual_payment_reviews v0
    where v0.receipt_id = r.id
    order by v0.created_at desc, v0.id desc limit 1
  ) v on true
  where a.order_id = p_order
), totals as (
  select
    coalesce(sum(case when review_outcome <> 'rejected' then received_amount_sen else 0 end), 0)::integer as received_sen,
    coalesce(sum(credited_amount_sen), 0)::integer as credited_sen
  from current_attempts where review_id is not null
), latest as (
  select * from current_attempts order by created_at desc, id desc limit 1
), order_data as (
  select price_myr, status, manual_paid_draft from public.orders where id = p_order
)
select jsonb_build_object(
  'attempt', (select case when l.id is null then null else jsonb_build_object(
    'id', l.id, 'method', l.method, 'state', coalesce(l.review_outcome, l.state),
    'prior_attempt_id', l.prior_attempt_id, 'slot_snapshot', l.slot_snapshot
  ) end from latest l),
  'receipt', (select case when l.receipt_id is null then null else jsonb_build_object(
    'id', l.receipt_id, 'version', l.version, 'content_type', l.content_type,
    'size_bytes', l.size_bytes, 'transfer_reference', l.transfer_reference,
    'created_at', l.receipt_created_at, 'access', l.receipt_access
  ) end from latest l),
  'review', (select case when l.review_id is null then null else jsonb_build_object(
    'outcome', l.review_outcome, 'received_amount_sen', l.received_amount_sen,
    'credited_amount_sen', l.credited_amount_sen,
    'remaining_amount_sen', l.remaining_amount_sen,
    'excess_amount_sen', l.excess_amount_sen, 'reason', l.reason
  ) end from latest l),
  'receivedSen', (select received_sen from totals),
  'creditedSen', (select credited_sen from totals),
  'remainingSen', (select greatest(0, o.price_myr - t.credited_sen) from order_data o, totals t),
  'excessSen', (select greatest(0, t.received_sen - o.price_myr) from order_data o, totals t),
  'paidDraft', (select manual_paid_draft from order_data),
  'orderStatus', (select status from order_data)
);
$$;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('stripe', 'duitnow', 'tng'));

revoke all on function public.submit_manual_receipt(
  uuid, uuid, uuid, uuid, uuid, text, integer, text, text, text, integer, text
) from public, anon, authenticated;
revoke all on function public.admin_review_manual_payment(
  uuid, uuid, text, integer, integer, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.review_manual_receipt(uuid, uuid, text, integer, text)
  from public, anon, authenticated;
revoke all on function public.admin_review_duitnow_submission(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.complete_order_payment(uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.finalize_paid_order(uuid),
  public.update_card_draft_if_editing(uuid, jsonb),
  public.reserve_checkout(uuid, uuid),
  public.attach_checkout_session(uuid, uuid, uuid, text, timestamptz),
  public.manual_payment_state(uuid)
  from public, anon, authenticated;

grant execute on function public.submit_manual_receipt(
  uuid, uuid, uuid, uuid, uuid, text, integer, text, text, text, integer, text
) to service_role;
grant execute on function public.admin_review_manual_payment(
  uuid, uuid, text, integer, integer, text, text, uuid
) to service_role;
grant execute on function public.review_manual_receipt(uuid, uuid, text, integer, text)
  to service_role;
grant execute on function public.admin_review_duitnow_submission(uuid, uuid, text, text)
  to service_role;
grant execute on function public.complete_order_payment(uuid, text, text, jsonb)
  to service_role;
grant execute on function public.finalize_paid_order(uuid),
  public.update_card_draft_if_editing(uuid, jsonb),
  public.reserve_checkout(uuid, uuid),
  public.attach_checkout_session(uuid, uuid, uuid, text, timestamptz),
  public.manual_payment_state(uuid)
  to service_role;
