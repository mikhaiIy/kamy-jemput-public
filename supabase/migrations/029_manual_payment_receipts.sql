-- D18: immutable evidence metadata; private content is held separately in Storage.
create table public.manual_payment_attempts (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete restrict,
 user_id uuid not null references public.users(id) on delete restrict,
 price_sen integer not null check (price_sen >= 0),
 method text not null check (method in ('duitnow','tng')),
 slot_snapshot jsonb not null,
 draft_snapshot jsonb not null,
 current_receipt_id uuid,
 state text not null default 'submitted' check (state in ('submitted','rejected','confirmed')),
 created_at timestamptz not null default now()
);
create table public.payment_receipts (
 id uuid primary key, -- stable upload operation ID, scoped and payload-checked on replay
 attempt_id uuid not null references public.manual_payment_attempts(id) on delete restrict,
 version integer not null check (version > 0),
 object_path text not null unique,
 content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 size_bytes integer not null check (size_bytes between 1 and 5242880),
 sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
 transfer_reference text not null default '' check (transfer_reference = '' or
   (length(transfer_reference) between 3 and 64 and transfer_reference ~ '^[A-Za-z0-9][A-Za-z0-9 .,&+/():#@''-]*$')),
 created_at timestamptz not null default now(),
 unique(attempt_id,version), unique(id,attempt_id)
);
alter table public.manual_payment_attempts add constraint current_receipt_attempt_fk
 foreign key(current_receipt_id,id) references public.payment_receipts(id,attempt_id) deferrable initially deferred;
create table public.manual_payment_reviews (
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null unique references public.payment_receipts(id) on delete restrict,
 outcome text not null check (outcome in ('confirmed','rejected')),
 received_amount_sen integer not null check (received_amount_sen >= 0),
 reviewer uuid not null references public.users(id) on delete restrict,
 reason text not null check (length(reason) <= 1000),
 created_at timestamptz not null default now(),
 check ((outcome='rejected' and received_amount_sen=0 and length(btrim(reason))>0)
     or (outcome='confirmed' and received_amount_sen>0))
);
create table public.payment_receipt_access (
 receipt_id uuid primary key references public.payment_receipts(id) on delete restrict,
 state text not null default 'available' check (state in ('available','quarantined','removing','removed'))
);
create table public.payment_receipt_events (
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null references public.payment_receipts(id) on delete restrict,
 action text not null check (action in ('quarantined','removing','removed')),
 reason text not null check (length(btrim(reason)) between 1 and 1000),
 category text not null check(category in ('harmful-file','legal','operational')),
 actor uuid not null references public.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(receipt_id,action)
);
create table public.tng_payment_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 payee_name text not null default '', qr_image_url text not null default '',
 instructions text not null default '', version integer not null default 1
);
insert into public.tng_payment_config(id) values(true);

-- No browser Storage policy: the authenticated application streams authorized content.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('payment-receipts','payment-receipts',false,5242880,
 array['application/pdf','image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
-- Restrictive policies also contain any unrelated broad permissive storage policies.
create policy receipt_storage_private on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id <> 'payment-receipts') with check(bucket_id <> 'payment-receipts');

do $$ declare t text; begin
 foreach t in array array['manual_payment_attempts','payment_receipts','manual_payment_reviews','payment_receipt_access','payment_receipt_events','tng_payment_config'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated, service_role',t);
  execute format('grant select on public.%I to service_role',t);
 end loop;
 foreach t in array array['payment_receipts','manual_payment_reviews','payment_receipt_events'] loop
  execute format('create trigger immutable_history before update or delete on public.%I for each row execute function public.duitnow_append_only_guard()',t);
 end loop;
end $$;

create function public.submit_manual_receipt(
 p_owner uuid,p_order_id uuid,p_receipt_id uuid,p_attempt_id uuid,p_expected_receipt uuid,
 p_method text,p_slot integer,p_reference text,p_path text,p_type text,p_size integer,p_sha text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders%rowtype; a public.manual_payment_attempts%rowtype;
 r public.payment_receipts%rowtype; s public.duitnow_payment_slots%rowtype;
 t public.tng_payment_config%rowtype; c public.cards%rowtype; snap jsonb; n integer;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.user_id is distinct from p_owner then raise exception 'ORDER_NOT_FOUND'; end if;
 select * into r from public.payment_receipts where id=p_receipt_id;
 if found then
  select * into a from public.manual_payment_attempts where id=r.attempt_id;
  if a.order_id<>o.id or a.user_id<>p_owner or r.sha256<>p_sha or r.object_path<>p_path
    or r.transfer_reference<>p_reference or a.method<>p_method
    or (p_attempt_id is null and p_method='duitnow' and (a.slot_snapshot->>'slotNumber')::integer is distinct from p_slot)
    or (p_attempt_id is not null and a.id<>p_attempt_id)
    then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return a.id;
 end if;
 if o.status<>'pending' then raise exception 'ORDER_CLOSED'; end if;
 if o.checkout_reservation_token is not null or o.stripe_session_id is not null then raise exception 'CHECKOUT_RECONCILIATION_REQUIRED'; end if;
 if p_method not in ('duitnow','tng') or p_method is null then raise exception 'METHOD_INVALID'; end if;
 if p_path <> o.id::text || '/' || p_receipt_id::text || '/' || p_sha then raise exception 'RECEIPT_INVALID'; end if;
 if not exists(select 1 from storage.objects where bucket_id='payment-receipts' and name=p_path) then raise exception 'RECEIPT_REQUIRED'; end if;
 if exists(select 1 from public.duitnow_transfer_submissions legacy_s where legacy_s.order_id=o.id and not exists(select 1 from public.duitnow_payment_reviews legacy_r where legacy_r.submission_id=legacy_s.id)) then raise exception 'DUITNOW_REVIEW_PENDING'; end if;
 if exists(select 1 from public.manual_payment_attempts where order_id=o.id and state='confirmed' and method<>p_method) then raise exception 'MANUAL_METHOD_LOCKED'; end if;
 select * into c from public.cards where order_id=o.id for update;
 if not found or c.custom_data_draft is null then raise exception 'FULFILLMENT_SNAPSHOT_MISSING'; end if;
 if p_attempt_id is not null then
  select * into a from public.manual_payment_attempts where id=p_attempt_id for update;
  if not found or a.order_id<>o.id or a.user_id<>p_owner then raise exception 'ORDER_NOT_FOUND'; end if;
  if a.state='confirmed' or a.method<>p_method or a.current_receipt_id is distinct from p_expected_receipt then raise exception 'RECEIPT_CHANGED'; end if;
  if a.state='rejected' and not exists(select 1 from public.manual_payment_reviews where receipt_id=a.current_receipt_id and outcome='rejected' and length(btrim(reason))>0) then raise exception 'REJECTION_REASON_REQUIRED'; end if;
 else
  if exists(select 1 from public.manual_payment_attempts where order_id=o.id and state in ('submitted','rejected')) then raise exception 'REPLACE_CURRENT_RECEIPT'; end if;
  if p_method='duitnow' then
   select * into s from public.duitnow_payment_slots where slot_number=p_slot and enabled for share;
   if not found or btrim(s.payee_name)='' or btrim(s.provider)='' or btrim(s.qr_image_url)='' then raise exception 'SLOT_UNAVAILABLE'; end if;
   snap:=jsonb_build_object('slotNumber',s.slot_number,'version',s.version,'payeeName',s.payee_name,'qrImageUrl',s.qr_image_url,'provider',s.provider,'instructions',s.instructions);
  else
   select * into t from public.tng_payment_config where id=true and enabled for share;
   if not found then raise exception 'SLOT_UNAVAILABLE'; end if;
   snap:=jsonb_build_object('version',t.version,'payeeName',t.payee_name,'qrImageUrl',t.qr_image_url,'provider','Touch ''n Go','instructions',t.instructions);
  end if;
  insert into public.manual_payment_attempts(order_id,user_id,price_sen,method,slot_snapshot,draft_snapshot)
   values(o.id,p_owner,o.price_myr,p_method,snap,c.custom_data_draft) returning * into a;
 end if;
 select coalesce(max(version),0)+1 into n from public.payment_receipts where attempt_id=a.id;
 insert into public.payment_receipts(id,attempt_id,version,object_path,content_type,size_bytes,sha256,transfer_reference)
 values(p_receipt_id,a.id,n,p_path,p_type,p_size,p_sha,p_reference);
 insert into public.payment_receipt_access(receipt_id) values(p_receipt_id);
 update public.manual_payment_attempts set current_receipt_id=p_receipt_id,state='submitted' where id=a.id;
 return a.id;
end $$;

create function public.review_manual_receipt(p_admin uuid,p_receipt uuid,p_outcome text,p_amount integer,p_reason text)
 returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.manual_payment_attempts%rowtype; o public.orders%rowtype; r public.payment_receipts%rowtype;
 old_review public.manual_payment_reviews%rowtype; total bigint; result jsonb:='{}';
begin
 if not exists(select 1 from public.users where id=p_admin and role='admin') then raise exception 'FORBIDDEN'; end if;
 select * into r from public.payment_receipts where id=p_receipt;
 if not found then raise exception 'RECEIPT_NOT_FOUND'; end if;
 select * into a from public.manual_payment_attempts where id=r.attempt_id;
 select * into o from public.orders where id=a.order_id for update;
 select * into a from public.manual_payment_attempts where id=r.attempt_id for update;
 select * into old_review from public.manual_payment_reviews where receipt_id=p_receipt;
 if found then
  if old_review.outcome<>p_outcome or old_review.received_amount_sen<>p_amount or old_review.reason<>p_reason then raise exception 'ALREADY_REVIEWED'; end if;
  return jsonb_build_object('replayed',true,'won',false);
 end if;
 if a.current_receipt_id<>p_receipt or a.state<>'submitted' then raise exception 'RECEIPT_CHANGED'; end if;
 if p_outcome='confirmed' and not exists(select 1 from public.payment_receipt_access where receipt_id=p_receipt and state='available') then raise exception 'RECEIPT_UNAVAILABLE'; end if;
 insert into public.manual_payment_reviews(receipt_id,outcome,received_amount_sen,reviewer,reason)
 values(p_receipt,p_outcome,p_amount,p_admin,p_reason);
 update public.manual_payment_attempts set state=p_outcome where id=a.id;
 select coalesce(sum(review_row.received_amount_sen),0) into total from public.manual_payment_reviews review_row
 join public.payment_receipts receipt_row on receipt_row.id=review_row.receipt_id join public.manual_payment_attempts attempt_row on attempt_row.id=receipt_row.attempt_id
 where attempt_row.order_id=o.id and review_row.outcome='confirmed';
 if p_outcome='confirmed' and total>=o.price_myr and o.status='pending' then
  result:=public.complete_order_payment(o.id,a.method,p_receipt::text,a.draft_snapshot);
 end if;
 return result || jsonb_build_object('orderId',o.id,'receivedTotal',total,'remainingSen',greatest(0,o.price_myr-total),
 'excessSen',greatest(0,total-o.price_myr),'duplicate',o.status='paid');
end $$;

-- First revoke access and record intent; only mark removed after Storage succeeds.
-- Repeated requests resume removing, never erase metadata or re-enable access.
create function public.manage_payment_receipt(p_admin uuid,p_receipt uuid,p_action text,p_category text,p_reason text)
 returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.manual_payment_attempts%rowtype; r public.payment_receipts%rowtype; state_now text;
begin
 if not exists(select 1 from public.users where id=p_admin and role='admin') then raise exception 'FORBIDDEN'; end if;
 select * into r from public.payment_receipts where id=p_receipt;
 if not found then raise exception 'RECEIPT_NOT_FOUND'; end if;
 select * into a from public.manual_payment_attempts where id=r.attempt_id;
 perform 1 from public.orders where id=a.order_id for update;
 select state into state_now from public.payment_receipt_access where receipt_id=p_receipt for update;
 if p_action not in ('quarantined','removing','removed') or p_action is null then raise exception 'ACTION_INVALID'; end if;
 if state_now='removed' or state_now=p_action then return r.object_path; end if;
 if (p_action='removed' and state_now<>'removing') or (state_now='removing' and p_action='quarantined') then raise exception 'ACTION_INVALID'; end if;
 insert into public.payment_receipt_events(receipt_id,action,reason,category,actor)
 values(p_receipt,p_action,p_reason,p_category,p_admin);
 update public.payment_receipt_access set state=p_action where receipt_id=p_receipt;
 return r.object_path;
end $$;

create function public.configure_tng(p_admin uuid,p_enabled boolean,p_payee text,p_qr text,p_instructions text)
 returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.users where id=p_admin and role='admin') then raise exception 'FORBIDDEN'; end if;
 if length(p_payee)>120 or length(p_qr)>500 or length(p_instructions)>2000 or
 (p_enabled and (coalesce(btrim(p_payee),'')='' or p_qr !~ '^https://')) then raise exception 'SLOT_INCOMPLETE'; end if;
 update public.tng_payment_config set enabled=p_enabled,payee_name=p_payee,qr_image_url=p_qr,instructions=p_instructions,version=version+1 where id=true;
end $$;

-- Protect draft and deletion for the new audit, alongside the existing legacy guards.
create function public.manual_receipt_card_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if TG_OP='DELETE' and exists(select 1 from public.manual_payment_attempts where order_id=old.order_id) then raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED'; end if;
 if TG_OP='UPDATE' and new.custom_data_draft is distinct from old.custom_data_draft
 and coalesce(current_setting('app.payment_completion',true),'')<>'on'
 and exists(select 1 from public.manual_payment_attempts where order_id=old.order_id and state in ('submitted','confirmed')) then raise exception 'DRAFT_LOCKED_PENDING_REVIEW'; end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
create trigger manual_receipt_card_guard before update or delete on public.cards for each row execute function public.manual_receipt_card_guard();

-- Legacy submission cannot bypass mandatory proof. Legacy reviews remain reviewable.
revoke execute on function public.submit_duitnow_transfer(uuid,integer,text) from public,anon,authenticated,service_role;

revoke all on function public.submit_manual_receipt(uuid,uuid,uuid,uuid,uuid,text,integer,text,text,text,integer,text),
 public.review_manual_receipt(uuid,uuid,text,integer,text),public.manage_payment_receipt(uuid,uuid,text,text,text),
 public.configure_tng(uuid,boolean,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_manual_receipt(uuid,uuid,uuid,uuid,uuid,text,integer,text,text,text,integer,text),
 public.review_manual_receipt(uuid,uuid,text,integer,text),public.manage_payment_receipt(uuid,uuid,text,text,text),
 public.configure_tng(uuid,boolean,text,text,text) to service_role;

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
  if p_method not in ('stripe', 'duitnow', 'tng') then
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
  if p_method in ('duitnow','tng') and p_draft_snapshot is null then
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
  if exists(select 1 from public.manual_payment_attempts where order_id=o.id and state in ('submitted','confirmed')) then raise exception 'MANUAL_PAYMENT_ACTIVE'; end if;
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
  if exists(select 1 from public.manual_payment_attempts where order_id=o.id and state in ('submitted','confirmed')) then raise exception 'MANUAL_PAYMENT_ACTIVE'; end if;
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


alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('stripe','duitnow','tng'));

-- One consistent customer projection, only the current attempt/version; totals
-- include all confirmed attempts without exposing earlier receipts or reviews.
create function public.manual_payment_state(p_order uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'attempt',(select jsonb_build_object('id',a.id,'method',a.method,'state',a.state,'slot_snapshot',a.slot_snapshot) from public.manual_payment_attempts a where a.order_id=p_order order by a.created_at desc,a.id desc limit 1),
 'receipt',(select jsonb_build_object('id',r.id,'version',r.version,'content_type',r.content_type,'size_bytes',r.size_bytes,'transfer_reference',r.transfer_reference,'created_at',r.created_at,'access',x.state)
 from public.manual_payment_attempts a join public.payment_receipts r on r.id=a.current_receipt_id join public.payment_receipt_access x on x.receipt_id=r.id where a.order_id=p_order order by a.created_at desc,a.id desc limit 1),
 'review',(select jsonb_build_object('outcome',v.outcome,'received_amount_sen',v.received_amount_sen,'reason',v.reason)
 from (select * from public.manual_payment_attempts where order_id=p_order order by created_at desc,id desc limit 1) a
 join public.manual_payment_reviews v on v.receipt_id=a.current_receipt_id),
 'receivedSen',(select coalesce(sum(v.received_amount_sen),0) from public.manual_payment_attempts a join public.payment_receipts r on r.attempt_id=a.id join public.manual_payment_reviews v on v.receipt_id=r.id where a.order_id=p_order and v.outcome='confirmed'));
$$;
revoke all on function public.manual_payment_state(uuid) from public,anon,authenticated;
grant execute on function public.manual_payment_state(uuid) to service_role;

create index manual_attempts_order_created on public.manual_payment_attempts(order_id,created_at desc,id desc);
