-- DuitNow managed-slot purchase flow.
--
-- Adds an optional manual-transfer purchase method alongside Stripe Checkout:
--   * exactly two administrator-managed DuitNow slots (no add/delete lifecycle);
--   * append-only slot configuration history, customer transfer submissions,
--     and payment reviews;
--   * an atomic first-completion-wins transition shared by the Stripe webhook
--     and manual DuitNow confirmation, which promotes the frozen fulfillment
--     snapshot to the published card exactly once.
--
-- A customer transfer submission is never payment confirmation. Publication
-- happens only through complete_order_payment(); direct publication
-- transitions are rejected by trigger.

-- ---------------------------------------------------------------------------
-- Orders: nullable winning-payment metadata
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists payment_method text,
  add column if not exists payment_completed_at timestamptz;

do $$ begin
  alter table public.orders
    add constraint orders_payment_method_check check (payment_method in ('stripe', 'duitnow'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Slots: exactly two durable rows, seeded disabled until an admin supplies
-- valid recipient/QR details and enables them.
-- ---------------------------------------------------------------------------

create table if not exists public.duitnow_payment_slots (
  slot_number int primary key check (slot_number in (1, 2)),
  version int not null default 1,
  enabled boolean not null default false,
  label text not null default '',
  payee_name text not null default '',
  provider text not null default '',
  qr_image_url text not null default '',
  instructions text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.duitnow_payment_slots (slot_number)
values (1), (2)
on conflict (slot_number) do nothing;

-- Append-only configuration lineage. Each row freezes one version's full
-- configuration plus the configuration it replaced.
create table if not exists public.duitnow_slot_history (
  id bigint generated always as identity primary key,
  slot_number int not null references public.duitnow_payment_slots(slot_number),
  version int not null,
  previous_config jsonb,
  config jsonb not null,
  changed_by uuid references public.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

insert into public.duitnow_slot_history (slot_number, version, previous_config, config)
select s.slot_number, s.version, null,
       jsonb_build_object(
         'slotNumber', s.slot_number, 'version', s.version, 'enabled', s.enabled,
         'label', s.label, 'payeeName', s.payee_name, 'provider', s.provider,
         'qrImageUrl', s.qr_image_url, 'instructions', s.instructions)
from public.duitnow_payment_slots s
where not exists (
  select 1 from public.duitnow_slot_history h where h.slot_number = s.slot_number
);

-- Customer transfer submissions. A submission atomically freezes the displayed
-- slot configuration, the order amount, and the exact saved draft
-- (`cards.custom_data_draft`) that was live at submission time. It is the
-- immutable fulfillment snapshot a confirmation publishes — never live data.
create table if not exists public.duitnow_transfer_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  slot_number int not null check (slot_number in (1, 2)),
  slot_version int not null,
  slot_snapshot jsonb not null,
  amount_sen bigint not null check (amount_sen >= 0),
  transfer_reference text not null,
  draft_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists duitnow_submissions_order_idx
  on public.duitnow_transfer_submissions (order_id, created_at desc);

-- Manual administrator reviews. Exactly one per submission; only `confirmed`
-- drives the payment-completion transition.
create table if not exists public.duitnow_payment_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.duitnow_transfer_submissions(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  slot_version int not null,
  transfer_reference text not null,
  outcome text not null check (outcome in ('confirmed', 'rejected')),
  reviewer uuid references public.users(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists duitnow_reviews_one_per_submission
  on public.duitnow_payment_reviews (submission_id);

create index if not exists duitnow_reviews_order_idx
  on public.duitnow_payment_reviews (order_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ACLs. Browser users cannot touch payment lifecycle data directly; trusted
-- server paths act through the security-definer RPCs below or the service role.
-- ---------------------------------------------------------------------------

alter table public.duitnow_payment_slots enable row level security;
alter table public.duitnow_slot_history enable row level security;
alter table public.duitnow_transfer_submissions enable row level security;
alter table public.duitnow_payment_reviews enable row level security;

revoke all on public.duitnow_payment_slots, public.duitnow_slot_history,
  public.duitnow_transfer_submissions, public.duitnow_payment_reviews
  from anon, authenticated;

grant select, insert, update, delete on
  public.duitnow_payment_slots,
  public.duitnow_slot_history,
  public.duitnow_transfer_submissions,
  public.duitnow_payment_reviews
  to service_role;

-- ---------------------------------------------------------------------------
-- Append-only guards: histories, submissions, and reviews reject update/delete
-- for every actor, including the service role.
-- ---------------------------------------------------------------------------

create or replace function public.duitnow_append_only_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'DUITNOW_RECORD_IMMUTABLE'
    using errcode = 'restrict_violation';
end $$;

drop trigger if exists duitnow_slot_history_immutable on public.duitnow_slot_history;
create trigger duitnow_slot_history_immutable
  before update or delete on public.duitnow_slot_history
  for each row execute function public.duitnow_append_only_guard();

drop trigger if exists duitnow_submissions_immutable on public.duitnow_transfer_submissions;
create trigger duitnow_submissions_immutable
  before update or delete on public.duitnow_transfer_submissions
  for each row execute function public.duitnow_append_only_guard();

drop trigger if exists duitnow_reviews_immutable on public.duitnow_payment_reviews;
create trigger duitnow_reviews_immutable
  before update or delete on public.duitnow_payment_reviews
  for each row execute function public.duitnow_append_only_guard();

-- ---------------------------------------------------------------------------
-- Cards lifecycle guards.
--
-- While an order has a submission awaiting review the saved draft is locked so
-- the frozen fulfillment snapshot cannot drift. Paid cards cannot be deleted.
-- Publication transitions happen only inside the payment-completion path,
-- which sets the transaction-local `app.payment_completion` GUC — this also
-- closes the pre-existing manual admin publish endpoint.
-- ---------------------------------------------------------------------------

-- One-card-per-order invariant enforced by the database itself: every payment
-- completion and submission can rely on resolving exactly one fulfillment
-- card per order.
create unique index if not exists cards_one_per_order_unique
  on public.cards (order_id);

create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    return old;
  end if;

  return new;
end $$;

drop trigger if exists cards_payment_lifecycle on public.cards;
create trigger cards_payment_lifecycle
  before insert or update or delete on public.cards
  for each row execute function public.cards_payment_lifecycle_guard();

-- ---------------------------------------------------------------------------
-- Shared atomic completion transition. First valid completion wins: locks the
-- order, allows only a still-pending order to win, records the winner's
-- method/reference/time, and promotes the immutable saved draft snapshot to
-- the published snapshot exactly once. Losers return without mutating the
-- already-paid order or card.
--
-- `p_draft_snapshot`: the frozen transfer-submission snapshot for DuitNow;
-- null for Stripe (the pre-payment draft on the card row is used).
-- ---------------------------------------------------------------------------

create or replace function public.duitnow_card_event_name(p_card jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(btrim(coalesce(
      (select s->'data'->>'eventName'
         from jsonb_array_elements(p_card->'sections') s
        where s->>'type' = 'event_info' limit 1),
      (select s->'data'->>'headline'
         from jsonb_array_elements(p_card->'sections') s
        where s->>'type' = 'landing' limit 1),
      (p_card->>'eventName'),
      ''
    )), ''),
    'Invitation')
$$;

create or replace function public.complete_order_payment(
  p_order_id uuid,
  p_method text,
  p_reference text,
  p_draft_snapshot jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_card public.cards%rowtype;
  v_final jsonb;
begin
  if p_method not in ('stripe', 'duitnow') then
    raise exception 'METHOD_INVALID' using errcode = 'check_violation';
  end if;
  if coalesce(btrim(p_reference), '') = '' then
    raise exception 'REFERENCE_INVALID' using errcode = 'check_violation';
  end if;

  select status into v_status
  from public.orders
  where id = p_order_id
  for update;
  if not found then
    return jsonb_build_object('won', false, 'reason', 'ORDER_NOT_FOUND');
  end if;
  if v_status <> 'pending' then
    return jsonb_build_object('won', false, 'reason', 'ALREADY_COMPLETED');
  end if;

  -- One-card-per-order invariant is guaranteed by the
  -- cards_one_per_order_unique index above; require the pre-payment draft card
  -- instead of creating a concurrent fallback card.
  select * into v_card from public.cards where order_id = p_order_id for update;
  if not found then
    raise exception 'ORDER_CARD_MISSING' using errcode = 'object_not_in_prerequisite_state';
  end if;

  -- The published snapshot must come from the correct immutable fulfillment
  -- snapshot: the caller-supplied frozen submission snapshot for DuitNow, or
  -- the locked saved draft for Stripe. Never fall back to live custom_data.
  if p_draft_snapshot is null then
    if v_card.custom_data_draft is null then
      raise exception 'FULFILLMENT_SNAPSHOT_MISSING' using errcode = 'object_not_in_prerequisite_state';
    end if;
    v_final := v_card.custom_data_draft;
  else
    v_final := p_draft_snapshot;
  end if;

  perform set_config('app.payment_completion', 'on', true);

  update public.cards
  set custom_data = v_final,
      custom_data_draft = null,
      is_published = true,
      published_at = coalesce(published_at, now())
  where id = v_card.id;

  update public.orders
  set status = 'paid',
      payment_method = p_method,
      payment_completed_at = now(),
      stripe_session_id = case when p_method = 'stripe' then btrim(p_reference) else stripe_session_id end
  where id = p_order_id;

  return jsonb_build_object(
    'won', true,
    'method', p_method,
    'cardId', v_card.id,
    'slug', v_card.slug,
    'eventName', public.duitnow_card_event_name(v_final));
end $$;

-- ---------------------------------------------------------------------------
-- Admin slot management: lock the slot, bump its version, and atomically
-- append the old/new audit entry.
-- ---------------------------------------------------------------------------

create or replace function public.duitnow_require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return; -- trusted service-role callers have already been checked upstream
  end if;
  if coalesce((select u.role from public.users u where u.id = auth.uid()), 'customer') <> 'admin' then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
end $$;

create or replace function public.admin_update_duitnow_slot(
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
set search_path = public
as $$
declare
  v_old public.duitnow_payment_slots%rowtype;
  v_new public.duitnow_payment_slots%rowtype;
begin
  perform public.duitnow_require_admin();

  if p_slot_number not in (1, 2) then
    raise exception 'SLOT_INVALID' using errcode = 'check_violation';
  end if;

  -- A slot may only be enabled when its recipient details are fully configured;
  -- customers can select only enabled, fully configured slots.
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
    auth.uid());

  return jsonb_build_object('version', v_new.version, 'enabled', v_new.enabled);
end $$;

-- ---------------------------------------------------------------------------
-- Customer submission: lock and re-read the enabled slot, the still-pending
-- owned order, and its draft card, then freeze the transfer/fulfillment
-- submission.
-- ---------------------------------------------------------------------------

create or replace function public.submit_duitnow_transfer(
  p_order_id uuid,
  p_slot_number int,
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  if char_length(v_ref) < 3 or char_length(v_ref) > 64 then
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

  -- Lock the slot row so the version/configuration captured in the snapshot
  -- cannot change between validation and submission.
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

  -- The submission freezes exactly the saved draft (`custom_data_draft`) that
  -- was live at submission time — never a fallback to live `custom_data`.
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

-- ---------------------------------------------------------------------------
-- Admin review: appends the immutable review and, only for confirmation,
-- invokes the shared completion transition. Duplicate reviews are rejected so
-- later completions can never change a winning payment.
-- ---------------------------------------------------------------------------

create or replace function public.admin_review_duitnow_submission(
  p_submission_id uuid,
  p_outcome text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.duitnow_transfer_submissions%rowtype;
  v_completion jsonb;
begin
  perform public.duitnow_require_admin();

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
     v_submission.transfer_reference, p_outcome, auth.uid(), coalesce(p_note, ''));

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

revoke all on function
  public.complete_order_payment(uuid, text, text, jsonb),
  public.admin_update_duitnow_slot(int, boolean, text, text, text, text, text),
  public.submit_duitnow_transfer(uuid, int, text),
  public.admin_review_duitnow_submission(uuid, text, text),
  public.duitnow_require_admin(),
  public.duitnow_card_event_name(jsonb),
  public.duitnow_append_only_guard(),
  public.cards_payment_lifecycle_guard()
  from public, anon, authenticated;

grant execute on function
  public.complete_order_payment(uuid, text, text, jsonb),
  public.admin_update_duitnow_slot(int, boolean, text, text, text, text, text),
  public.submit_duitnow_transfer(uuid, int, text),
  public.admin_review_duitnow_submission(uuid, text, text)
  to service_role;

grant execute on function public.submit_duitnow_transfer(uuid, int, text)
  to authenticated;
