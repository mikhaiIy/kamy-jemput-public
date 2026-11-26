-- Issue #74 acceptance fixture. Run only through the guarded local target
-- runner; every assertion is inside one transaction and rolls back.
begin;
create temporary table issue74_fixture(
  card_id uuid,
  owner_id uuid,
  admin_id uuid,
  first_publication_id uuid,
  first_published_at timestamptz,
  first_window_id uuid
);

do $$
declare
  v_owner uuid := 'd740f9d4-4dc3-4a57-a9d5-4e813cb66501';
  v_admin uuid := 'e740f9d4-4dc3-4a57-a9d5-4e813cb66502';
  v_stranger uuid := 'f740f9d4-4dc3-4a57-a9d5-4e813cb66503';
  v_created jsonb;
  v_result jsonb;
  v_card public.cards%rowtype;
  v_first public.card_publications%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_expired public.card_edit_windows%rowtype;
  v_message text;
  v_caught boolean;
  v_past timestamptz;
  v_saved_version bigint;
  v_expired_version bigint;
  v_publication_count bigint;
  v_deleted boolean;
  v_slug text := 'issue74-accept-' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into auth.users(id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values
    (v_owner,'issue74-accept-owner@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',now(),now()),
    (v_admin,'issue74-accept-admin@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',now(),now()),
    (v_stranger,'issue74-accept-stranger@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',now(),now())
  on conflict (id) do nothing;
  insert into public.users(id,email,name,role) values
    (v_owner,'issue74-accept-owner@example.test','Accept Owner','customer'),
    (v_admin,'issue74-accept-admin@example.test','Accept Admin','admin'),
    (v_stranger,'issue74-accept-stranger@example.test','Accept Stranger','customer')
  on conflict (id) do update set name=excluded.name, role=excluded.role;

  v_created := public.create_draft_order_and_card('malay-wedding',v_owner,v_slug)::jsonb;
  update public.orders
  set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp()
  where id=(v_created->>'orderId')::uuid;
  v_result := public.publish_paid_draft(
    (v_created->>'cardId')::uuid,v_owner,
    'I understand that this invitation will become public and read-only.',1
  );
  if (v_result->>'published')::boolean is not true then raise exception 'first publication failed'; end if;

  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_first from public.card_publications where id=v_card.current_publication_id;
  insert into issue74_fixture values(v_card.id,v_owner,v_admin,v_first.id,v_card.published_at,null);
  insert into public.rsvp_responses(card_id,publication_id,guest_name,attending,pax,message)
  values(v_card.id,v_first.id,'First Guest',true,1,'first publication wish');

  -- A lost first-publication response replays only while the revision-1
  -- pointer is still current. Disable must preserve the prior unavailable
  -- response and must not mutate the publication.
  v_result := public.publish_paid_draft(
    v_card.id,v_owner,
    'I understand that this invitation will become public and read-only.',
    v_first.draft_version
  );
  if (v_result->>'replayed')::boolean is not true then
    raise exception 'first-publication retry was not replay-safe';
  end if;
  select count(*) into v_publication_count
    from public.card_publications where card_id=v_card.id;
  v_result := public.set_card_availability(v_card.id,v_admin,'disabled','Retry safety hold');
  if (v_result->>'is_published')::boolean is not false then raise exception 'disable retry fixture published'; end if;
  v_result := public.publish_paid_draft(
    v_card.id,v_owner,
    'I understand that this invitation will become public and read-only.',
    v_first.draft_version
  );
  if (v_result->>'state') <> 'unavailable' then raise exception 'disabled first retry changed state'; end if;
  select * into v_card from public.cards where id=v_card.id;
  if v_card.is_published or v_card.current_publication_id is distinct from v_first.id
     or (select count(*) from public.card_publications where card_id=v_card.id) <> v_publication_count then
    raise exception 'disabled first retry mutated publication state';
  end if;
  v_result := public.set_card_availability(v_card.id,v_admin,'restored',null);
  if (v_result->>'is_published')::boolean is not true then raise exception 'restore did not restore first publication'; end if;

  v_result := public.open_card_edit_window(v_card.id,v_admin,'Approved correction',gen_random_uuid());
  select * into v_window from public.card_edit_windows where id=(v_result->>'windowId')::uuid;
  update issue74_fixture set first_window_id=v_window.id;
  select * into v_card from public.cards where id=v_card.id;
  if v_window.expires_at <> v_window.granted_at + interval '7 days'
     or v_window.expires_at <= clock_timestamp()
     or v_card.is_published
     or v_card.active_edit_window_id is distinct from v_window.id
     or v_card.revision_draft is distinct from v_first.snapshot
     or v_card.draft_version <> v_first.draft_version + 1 then
    raise exception 'grant did not atomically create the active seven-day private draft';
  end if;

  v_result := public.open_card_edit_window(v_card.id,v_admin,'Changed text',v_window.request_id);
  if (v_result->>'replayed')::boolean is not true
     or (v_result->>'expiresAt')::timestamptz <> v_window.expires_at then
    raise exception 'duplicate grant restarted its deadline';
  end if;
  v_caught := false;
  begin
    perform public.open_card_edit_window(v_card.id,v_admin,'Conflict',gen_random_uuid());
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%EDIT_WINDOW_ACTIVE%' then raise exception 'active conflicting grant accepted'; end if;

  v_caught := false;
  begin
    perform public.open_card_edit_window(v_card.id,v_owner,'Self approval',gen_random_uuid());
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%FORBIDDEN%' then raise exception 'owner self-approval accepted'; end if;
  v_caught := false;
  begin
    perform public.open_card_edit_window(v_card.id,v_stranger,'Stranger',gen_random_uuid());
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%FORBIDDEN%' then raise exception 'stranger approval accepted'; end if;

  v_result := public.save_card_draft(
    v_card.id,v_owner,
    jsonb_build_object('templateId','malay-wedding','schemaVersion',2,'eventName','Revision copy'),v_first.draft_version + 1
  );
  if (v_result->>'mode') <> 'revision' or (v_result->>'draftVersion')::bigint <> v_first.draft_version + 2 then raise exception 'revision save failed'; end if;
  v_saved_version := (v_result->>'draftVersion')::bigint;
  v_caught := false;
  begin
    perform public.save_card_draft(v_card.id,v_owner,'{"templateId":"malay-wedding","stale":true}'::jsonb,v_first.draft_version + 1);
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%DRAFT_VERSION_CONFLICT%' then raise exception 'stale save accepted'; end if;

  v_result := public.publish_card_revision(
    v_card.id,v_owner,v_window.id,
    'I understand that this invitation will become public and read-only.',v_saved_version
  );
  select * into v_card from public.cards where id=v_card.id;
  if (v_result->>'published')::boolean is not true
     or v_card.is_published is not true
     or v_card.active_edit_window_id is not null
     or v_card.published_at is distinct from v_first.published_at
     or v_card.custom_data is distinct from v_first.snapshot then
    raise exception 'revision publication changed immutable first snapshot/time';
  end if;
  v_result := public.publish_card_revision(
    v_card.id,v_owner,v_window.id,
    'I understand that this invitation will become public and read-only.',v_saved_version
  );
  if (v_result->>'replayed')::boolean is not true then raise exception 'publication retry was not replay-safe'; end if;

  v_caught := false;
  begin
    perform public.publish_paid_draft(
      v_card.id,v_owner,
      'I understand that this invitation will become public and read-only.',
      v_first.draft_version
    );
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%CARD_NOT_FIRST_PUBLICATION%' then
    raise exception 'stale first-publication request was accepted after a later revision';
  end if;

  insert into public.rsvp_responses(card_id,publication_id,guest_name,attending,pax,message)
  values(v_card.id,v_card.current_publication_id,'Second Guest',true,1,'current publication wish');
  if (select count(*) from public.rsvp_responses where card_id=v_card.id and publication_id=v_first.id) <> 1
     or (select count(*) from public.rsvp_responses where card_id=v_card.id and publication_id=v_card.current_publication_id) <> 1 then
    raise exception 'guestbook publication boundary failed';
  end if;

  -- Insert a valid-but-expired immutable fixture without waiting seven days.
  v_past := clock_timestamp() - interval '8 days';
  insert into public.card_edit_windows(card_id,owner_id,admin_id,request_id,reason,granted_at,expires_at)
  values(v_card.id,v_owner,v_admin,gen_random_uuid(),'Expired fixture',v_past,v_past + interval '7 days')
  returning * into v_expired;
  perform public.authorize_card_mutation(v_card.id,'fixture_expired_window');
  update public.cards
  set revision_draft=v_first.snapshot, active_edit_window_id=v_expired.id, is_published=false
  where id=v_card.id;
  select draft_version into v_expired_version from public.cards where id=v_card.id;
  v_caught := false;
  begin
    perform public.save_card_draft(v_card.id,v_owner,'{"templateId":"malay-wedding","expired":true}'::jsonb,v_expired_version);
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%EDIT_WINDOW_EXPIRED%' then raise exception 'expired save accepted'; end if;
  v_result := public.open_card_edit_window(v_card.id,v_admin,'Reopen expired',gen_random_uuid());
  if (v_result->>'replayed')::boolean or (v_result->>'expiresAt')::timestamptz <= clock_timestamp() then raise exception 'expired window did not reopen'; end if;
  select draft_version into v_saved_version from public.cards where id=v_card.id;
  if v_saved_version <> v_expired_version + 1 then raise exception 'reopen did not advance the edit-window generation'; end if;
  v_caught := false;
  begin
    perform public.save_card_draft(v_card.id,v_owner,'{"templateId":"malay-wedding","oldWindow":true}'::jsonb,v_expired_version);
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%DRAFT_VERSION_CONFLICT%' then raise exception 'old-window save accepted after reopen'; end if;

  v_result := public.set_card_availability(v_card.id,v_admin,'disabled','Safety hold');
  if (v_result->>'is_published')::boolean is not false then raise exception 'disable published'; end if;
  v_caught := false;
  begin
    perform public.save_card_draft(v_card.id,v_owner,'{"templateId":"malay-wedding","disabled":true}'::jsonb,v_saved_version);
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or v_message not like '%CARD_UNAVAILABLE%' then raise exception 'disabled save accepted'; end if;
  v_result := public.set_card_availability(v_card.id,v_admin,'restored',null);
  if (v_result->>'is_published')::boolean is not false then raise exception 'restore republished old content'; end if;

  -- Ordinary unpaid deletion remains available after a successful draft save;
  -- the new activity row is not payment evidence and cascades with the card.
  v_created := public.create_draft_order_and_card(
    'malay-wedding',v_owner,
    'issue74-delete-' || replace(gen_random_uuid()::text, '-', '')
  )::jsonb;
  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  perform public.save_card_draft(
    v_card.id,v_owner,
    jsonb_build_object('templateId','malay-wedding','schemaVersion',2,'eventName','Delete fixture'),
    v_card.draft_version
  );
  select public.delete_card_if_editing(v_card.id,v_owner) into v_deleted;
  if v_deleted is not true
     or exists (select 1 from public.cards where id=v_card.id)
     or exists (select 1 from public.orders where id=v_card.order_id) then
    raise exception 'unpaid card with draft activity could not be deleted';
  end if;

  set local role anon;
  if (select count(*) from public.cards where slug=v_slug) <> 0 then raise exception 'anon direct card read exposed data'; end if;
  reset role;
end
$$;

set local role service_role;
do $$
declare v_card uuid; v_caught boolean := false; v_message text;
begin
  select id into v_card
  from public.cards
  where slug like 'issue74-accept-%'
  order by created_at desc
  limit 1;
  begin
    update public.cards set custom_data='{"tampered":true}'::jsonb where id=v_card;
  exception when others then v_message := sqlerrm; v_caught := true; end;
  if not v_caught or (v_message not like '%PUBLISHED_SNAPSHOT_IMMUTABLE%' and v_message not like '%CARD_UPDATE_GUARDED%') then
    raise exception 'direct service-role snapshot write accepted: %',v_message;
  end if;
end
$$;
reset role;
rollback;
select 'issue74 approved edit-window acceptance passed' as result;
