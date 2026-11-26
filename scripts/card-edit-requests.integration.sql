-- Issue #80 acceptance coverage. Run only through the authorized local-target
-- runner. All durable fixture writes are inside one transaction and roll back.
begin;

create temporary table issue80_fixture(
  card_id uuid primary key,
  order_id uuid not null,
  owner_id uuid not null,
  admin_id uuid not null,
  second_admin_id uuid not null,
  stranger_id uuid not null,
  publication_id uuid not null,
  request_id uuid,
  expired_card_id uuid,
  expired_request_id uuid,
  stale_card_id uuid,
  stale_request_id uuid
);
grant select, update on issue80_fixture to service_role;

do $$
declare
  v_owner uuid := 'd880f9d4-4dc3-4a57-a9d5-4e813cb66501';
  v_admin uuid := 'e880f9d4-4dc3-4a57-a9d5-4e813cb66502';
  v_second_admin uuid := 'e880f9d4-4dc3-4a57-a9d5-4e813cb66503';
  v_stranger uuid := 'f880f9d4-4dc3-4a57-a9d5-4e813cb66504';
  v_created jsonb;
  v_card public.cards%rowtype;
  v_publication public.card_publications%rowtype;
  v_slug text := 'issue80-main-' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into auth.users(id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    (v_owner,'issue80-owner@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
    (v_admin,'issue80-admin@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
    (v_second_admin,'issue80-admin-2@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
    (v_stranger,'issue80-stranger@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp())
  on conflict (id) do nothing;
  insert into public.users(id,email,name,role) values
    (v_owner,'issue80-owner@example.test','Issue 80 Owner','customer'),
    (v_admin,'issue80-admin@example.test','Issue 80 Admin','admin'),
    (v_second_admin,'issue80-admin-2@example.test','Issue 80 Admin Two','admin'),
    (v_stranger,'issue80-stranger@example.test','Issue 80 Stranger','customer')
  on conflict (id) do update set email=excluded.email, name=excluded.name, role=excluded.role;

  v_created := public.create_draft_order_and_card('malay-wedding',v_owner,v_slug)::jsonb;
  update public.orders
     set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft(
    (v_created->>'cardId')::uuid,v_owner,
    'I understand that this invitation will become public and read-only.',1
  );
  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_publication from public.card_publications where id=v_card.current_publication_id;
  insert into issue80_fixture(card_id,order_id,owner_id,admin_id,second_admin_id,stranger_id,publication_id)
  values(v_card.id,v_card.order_id,v_owner,v_admin,v_second_admin,v_stranger,v_publication.id);
end
$$;

-- The customer can submit one bounded request. A retry with the same intent
-- returns the same row, while another intent is rejected by the pending index
-- and the locked lifecycle check.
set local role service_role;
do $$
declare
  f issue80_fixture%rowtype;
  v_request uuid := gen_random_uuid();
  v_result jsonb;
  v_replay jsonb;
  v_card public.cards%rowtype;
  v_count bigint;
  v_message text;
  v_caught boolean := false;
begin
  select * into f from issue80_fixture;
  update issue80_fixture set request_id=v_request;
  v_result := public.submit_card_edit_request(
    f.card_id,f.owner_id,'Tukar nama ibu bapa pengantin.',v_request
  );
  if v_result->>'status' <> 'pending' or (v_result->>'replayed')::boolean then
    raise exception 'initial request was not pending';
  end if;
  v_replay := public.submit_card_edit_request(
    f.card_id,f.owner_id,'Tukar nama ibu bapa pengantin.',v_request
  );
  if not (v_replay->>'replayed')::boolean or v_replay->>'id' <> v_result->>'id' then
    raise exception 'duplicate request was not idempotent';
  end if;
  select count(*) into v_count from public.card_edit_requests where card_id=f.card_id;
  if v_count <> 1 then raise exception 'duplicate request created another row'; end if;
  select * into v_card from public.cards where id=f.card_id;
  if not v_card.is_published or v_card.active_edit_window_id is not null then
    raise exception 'request changed public boundary';
  end if;
  begin
    perform public.submit_card_edit_request(
      f.card_id,f.owner_id,'Another correction.',gen_random_uuid()
    );
  exception when others then
    v_message := sqlerrm;
    v_caught := true;
  end;
  if not v_caught or v_message not like '%REQUEST_ALREADY_PENDING%' then
    raise exception 'second pending request was accepted: %',v_message;
  end if;
  v_caught := false;
  begin
    perform public.submit_card_edit_request(
      f.card_id,f.stranger_id,'Stranger correction.',gen_random_uuid()
    );
  exception when others then
    v_message := sqlerrm;
    v_caught := true;
  end;
  if not v_caught or v_message not like '%FORBIDDEN%' then
    raise exception 'non-owner request was accepted: %',v_message;
  end if;
end
$$;
reset role;

-- Owner/admin read policies expose the ledger only to the appropriate
-- authenticated identities; anonymous access and direct table mutation stay
-- closed. The service role is used only for the guarded RPC calls above.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d880f9d4-4dc3-4a57-a9d5-4e813cb66501","role":"authenticated"}';
do $$
declare v_count bigint;
begin
  select count(*) into v_count from public.card_edit_requests;
  if v_count <> 1 then raise exception 'owner RLS did not expose own request'; end if;
end
$$;
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f880f9d4-4dc3-4a57-a9d5-4e813cb66504","role":"authenticated"}';
do $$
declare v_count bigint;
begin
  select count(*) into v_count from public.card_edit_requests;
  if v_count <> 0 then raise exception 'stranger RLS exposed another owner request'; end if;
end
$$;
reset role;
set local role anon;
do $$
declare v_caught boolean := false; v_message text;
begin
  begin
    perform 1 from public.card_edit_requests;
  exception when insufficient_privilege then
    v_caught := true;
    v_message := sqlerrm;
  end;
  if not v_caught then raise exception 'anonymous request read was exposed'; end if;
end
$$;
reset role;

set local role service_role;
do $$
declare
  f issue80_fixture%rowtype;
  v_result jsonb;
  v_replay jsonb;
  v_reject_decision uuid := gen_random_uuid();
  v_message text;
  v_caught boolean := false;
  v_window_count bigint;
begin
  select * into f from issue80_fixture;
  v_result := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=f.request_id),
    f.admin_id,'reject','Sila semak semula nama pada bahagian utama.',v_reject_decision
  );
  if v_result->>'status' <> 'rejected'
     or v_result->>'decisionReason' <> 'Sila semak semula nama pada bahagian utama.' then
    raise exception 'rejection did not record customer-safe reason';
  end if;
  select count(*) into v_window_count from public.card_edit_windows where card_id=f.card_id;
  if v_window_count <> 0 then raise exception 'rejection opened an edit window'; end if;
  v_replay := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=f.request_id),
    f.second_admin_id,'reject','Different retry text',v_reject_decision
  );
  if not (v_replay->>'replayed')::boolean or v_replay->>'decisionReason' <> v_result->>'decisionReason' then
    raise exception 'exact rejection retry did not return the original outcome';
  end if;
  begin
    perform public.review_card_edit_request(
      (select id from public.card_edit_requests where request_id=f.request_id),
    f.second_admin_id,'approve',null,gen_random_uuid()
    );
  exception when others then
    v_message := sqlerrm;
    v_caught := true;
  end;
  if not v_caught or v_message not like '%REQUEST_ALREADY_DECIDED%' then
    raise exception 'a second decision changed a rejected request: %',v_message;
  end if;
end
$$;

-- A fresh request can follow a terminal rejection. Approval delegates to the
-- existing guarded seven-day grant exactly once and makes the public boundary
-- private/read-only until the owner publishes again.
do $$
declare
  f issue80_fixture%rowtype;
  v_request uuid := gen_random_uuid();
  v_decision uuid := gen_random_uuid();
  v_result jsonb;
  v_replay jsonb;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_window_count bigint;
begin
  select * into f from issue80_fixture;
  update issue80_fixture set request_id=v_request;
  v_result := public.submit_card_edit_request(f.card_id,f.owner_id,'Betulkan alamat majlis.',v_request);
  if v_result->>'status' <> 'pending' then raise exception 'follow-up request was not pending'; end if;
  v_result := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=v_request),
    f.admin_id,'approve',null,v_decision
  );
  if v_result->>'status' <> 'approved' or v_result->>'windowId' is null then
    raise exception 'approval did not record its window';
  end if;
  select * into v_card from public.cards where id=f.card_id;
  select * into v_window from public.card_edit_windows where id=(v_result->>'windowId')::uuid;
  select count(*) into v_window_count from public.card_edit_windows where card_id=f.card_id;
  if v_card.is_published
     or v_card.active_edit_window_id is distinct from v_window.id
     or v_window.expires_at <> v_window.granted_at + interval '7 days'
     or v_window.expires_at <= clock_timestamp()
     or v_window_count <> 1 then
    raise exception 'approval did not atomically create one active seven-day window';
  end if;
  v_replay := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=v_request),
    f.second_admin_id,'approve','ignored retry reason',v_decision
  );
  if not (v_replay->>'replayed')::boolean
     or v_replay->>'windowId' <> v_result->>'windowId'
     or (v_replay->>'expiresAt')::timestamptz <> (v_result->>'expiresAt')::timestamptz then
    raise exception 'approval retry changed the window or deadline';
  end if;
  select count(*) into v_window_count from public.card_edit_windows where card_id=f.card_id;
  if v_window_count <> 1 then raise exception 'approval retry created another window'; end if;
end
$$;

-- Build an expired-window invitation. It remains private and locked while the
-- request is pending, then approval reopens only a new seven-day generation.
set local role postgres;
do $$
declare
  f issue80_fixture%rowtype;
  v_created jsonb;
  v_card public.cards%rowtype;
  v_expired public.card_edit_windows%rowtype;
  v_publication public.card_publications%rowtype;
  v_request uuid := gen_random_uuid();
  v_past timestamptz := clock_timestamp() - interval '8 days';
  v_result jsonb;
  v_version bigint;
  v_slug text := 'issue80-expired-' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into f from issue80_fixture;
  v_created := public.create_draft_order_and_card('malay-wedding',f.owner_id,v_slug)::jsonb;
  update public.orders set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft((v_created->>'cardId')::uuid,f.owner_id,
    'I understand that this invitation will become public and read-only.',1);
  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_publication from public.card_publications where id=v_card.current_publication_id;
  insert into public.card_edit_windows(card_id,owner_id,admin_id,request_id,reason,granted_at,expires_at)
  values(v_card.id,f.owner_id,f.admin_id,gen_random_uuid(),'Expired fixture',v_past,v_past + interval '7 days')
  returning * into v_expired;
  perform public.authorize_card_mutation(v_card.id,'issue80_expired_fixture');
  update public.cards
     set revision_draft=v_publication.snapshot, active_edit_window_id=v_expired.id, is_published=false
   where id=v_card.id;
  select draft_version into v_version from public.cards where id=v_card.id;
  v_result := public.submit_card_edit_request(v_card.id,f.owner_id,'Betulkan nombor telefon.',v_request);
  if v_result->>'status' <> 'pending' then raise exception 'expired request was not accepted'; end if;
  select * into v_card from public.cards where id=v_card.id;
  if v_card.is_published or v_card.active_edit_window_id is distinct from v_expired.id
     or v_card.draft_version <> v_version then
    raise exception 'expired pending request changed the locked invitation';
  end if;
  v_result := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=v_request),
    f.admin_id,'approve',null,gen_random_uuid()
  );
  if v_result->>'status' <> 'approved' then raise exception 'expired request did not approve'; end if;
  select * into v_card from public.cards where id=v_card.id;
  if v_card.is_published
     or v_card.active_edit_window_id is distinct from (v_result->>'windowId')::uuid
     or v_card.active_edit_window_id = v_expired.id
     or (v_result->>'expiresAt')::timestamptz <= clock_timestamp() then
    raise exception 'expired approval did not open a new private window';
  end if;
  update issue80_fixture set expired_card_id=v_card.id, expired_request_id=v_request;
end
$$;

-- A pending request becomes stale after a direct grant. The stale terminal
-- outcome frees the one-pending slot so a later request can be submitted.
do $$
declare
  f issue80_fixture%rowtype;
  v_created jsonb;
  v_card public.cards%rowtype;
  v_publication public.card_publications%rowtype;
  v_request uuid := gen_random_uuid();
  v_result jsonb;
  v_message text;
  v_caught boolean := false;
  v_slug text := 'issue80-stale-' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into f from issue80_fixture;
  v_created := public.create_draft_order_and_card('malay-wedding',f.owner_id,v_slug)::jsonb;
  update public.orders set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft((v_created->>'cardId')::uuid,f.owner_id,
    'I understand that this invitation will become public and read-only.',1);
  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_publication from public.card_publications where id=v_card.current_publication_id;
  v_result := public.submit_card_edit_request(v_card.id,f.owner_id,'Tukar ejaan nama.',v_request);
  if v_result->>'status' <> 'pending' then raise exception 'stale fixture request was not pending'; end if;
  perform public.open_card_edit_window(v_card.id,f.admin_id,'Direct administrator grant',gen_random_uuid());
  v_result := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=v_request),
    f.admin_id,'approve',null,gen_random_uuid()
  );
  if v_result->>'status' <> 'stale' or v_result->>'decision' <> 'stale' then
    raise exception 'changed pending request was not made stale';
  end if;
  select * into v_card from public.cards where id=v_card.id;
  v_result := public.save_card_draft(
    v_card.id,f.owner_id,
    jsonb_build_object('templateId','malay-wedding','schemaVersion',2,'eventName','After stale request'),
    v_card.draft_version
  );
  perform public.publish_card_revision(
    v_card.id,f.owner_id,v_card.active_edit_window_id,
    'I understand that this invitation will become public and read-only.',
    (v_result->>'draftVersion')::bigint
  );
  begin
    perform public.submit_card_edit_request(v_card.id,f.owner_id,'Tukar ejaan nama lagi.',gen_random_uuid());
  exception when others then
    v_message := sqlerrm;
    v_caught := true;
  end;
  if v_caught then raise exception 'stale request permanently blocked a new request: %',v_message; end if;
  update issue80_fixture set stale_card_id=v_card.id, stale_request_id=v_request;
end
$$;

-- A previous direct grant UUID must not replay its closed window through a
-- later pending request. The review is terminal stale and leaves the newly
-- published invitation public with no active window.
do $$
declare
  f issue80_fixture%rowtype;
  v_created jsonb;
  v_card public.cards%rowtype;
  v_old_decision uuid := gen_random_uuid();
  v_request uuid := gen_random_uuid();
  v_opened jsonb;
  v_saved jsonb;
  v_result jsonb;
  v_window_count bigint;
  v_slug text := 'issue80-replay-' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into f from issue80_fixture;
  v_created := public.create_draft_order_and_card('malay-wedding',f.owner_id,v_slug)::jsonb;
  update public.orders
     set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft(
    (v_created->>'cardId')::uuid,f.owner_id,
    'I understand that this invitation will become public and read-only.',1
  );
  v_opened := public.open_card_edit_window(
    (v_created->>'cardId')::uuid,f.admin_id,'Old direct grant',v_old_decision
  );
  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  v_saved := public.save_card_draft(
    v_card.id,f.owner_id,
    jsonb_build_object('templateId','malay-wedding','schemaVersion',2,'eventName','After old grant'),
    v_card.draft_version
  );
  perform public.publish_card_revision(
    v_card.id,f.owner_id,v_card.active_edit_window_id,
    'I understand that this invitation will become public and read-only.',
    (v_saved->>'draftVersion')::bigint
  );
  v_result := public.submit_card_edit_request(
    v_card.id,f.owner_id,'Betulkan selepas grant lama.',v_request
  );
  v_result := public.review_card_edit_request(
    (select id from public.card_edit_requests where request_id=v_request),
    f.admin_id,'approve',null,v_old_decision
  );
  if v_result->>'status' <> 'stale'
     or v_result->>'decision' <> 'stale'
     or v_result->>'windowId' is not null then
    raise exception 'old direct-grant UUID replay was approved: %',v_result;
  end if;
  select * into v_card from public.cards where id=v_card.id;
  select count(*) into v_window_count
  from public.card_edit_windows where card_id=v_card.id;
  if not v_card.is_published
     or v_card.active_edit_window_id is not null
     or v_window_count <> 1 then
    raise exception 'old direct-grant replay changed the current publication boundary';
  end if;
end
$$;

-- Direct table writes are denied even to the service role; the guarded RPC is
-- the only mutation path.
set local role service_role;
do $$
declare v_message text; v_caught boolean := false; f issue80_fixture%rowtype;
begin
  select * into f from issue80_fixture;
  begin
    insert into public.card_edit_requests(
      card_id,owner_id,request_id,reason,submitted_publication_id,submitted_draft_version
    ) values(f.card_id,f.owner_id,gen_random_uuid(),'Direct write',f.publication_id,1);
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or (v_message not like '%permission denied%' and v_message not like '%CARD_EDIT_REQUEST_MUTATION_GUARDED%') then
    raise exception 'direct request table write was accepted: %',v_message;
  end if;
end
$$;
reset role;

rollback;
select 'issue80 card-edit-request acceptance passed' as result;
