-- Combined #75/#80 lifecycle acceptance coverage. Run only through the
-- authorized local-target runner. Durable fixture writes are rolled back.
begin;

do $$
declare
  v_owner uuid := 'd875f9d4-4dc3-4a57-a9d5-4e813cb66501';
  v_admin uuid := 'e875f9d4-4dc3-4a57-a9d5-4e813cb66502';
  v_second_admin uuid := 'e875f9d4-4dc3-4a57-a9d5-4e813cb66503';
  v_created jsonb;
  v_created_target jsonb;
  v_source public.cards%rowtype;
  v_target public.cards%rowtype;
  v_source_publication public.card_publications%rowtype;
  v_target_publication public.card_publications%rowtype;
  v_source_order public.orders%rowtype;
  v_target_order public.orders%rowtype;
  v_grant jsonb;
  v_result jsonb;
  v_request_id uuid;
  v_request_row_id uuid;
  v_decision_id uuid;
  v_target_draft jsonb;
  v_saved jsonb;
  v_published jsonb;
  v_window_id uuid;
  v_before_publication uuid;
  v_caught boolean;
  v_sqlstate text;
  v_message text;
begin
  insert into auth.users(
    id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data,
    created_at,updated_at
  ) values
    (v_owner,'issue75-80-owner@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
    (v_admin,'issue75-80-admin@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
    (v_second_admin,'issue75-80-admin-2@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp())
  on conflict (id) do nothing;
  insert into public.users(id,email,name,role) values
    (v_owner,'issue75-80-owner@example.test','Issue 75/80 Owner','customer'),
    (v_admin,'issue75-80-admin@example.test','Issue 75/80 Admin','admin'),
    (v_second_admin,'issue75-80-admin-2@example.test','Issue 75/80 Admin Two','admin')
  on conflict (id) do update set email=excluded.email, name=excluded.name, role=excluded.role;

  set local role service_role;

  -- A request submitted before a replacement grant can never become an edit
  -- window for the predecessor. The guarded grant RPC makes it terminal stale.
  v_created := public.create_draft_order_and_card(
    'malay-wedding',v_owner,'issue75-80-grant-' || replace(gen_random_uuid()::text,'-','')
  )::jsonb;
  update public.orders
     set status='paid', manual_paid_draft=true, payment_method='stripe',
         payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft(
    (v_created->>'cardId')::uuid,v_owner,
    'I understand that this invitation will become public and read-only.',1
  );
  select * into v_source from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_source_publication
    from public.card_publications where id=v_source.current_publication_id;
  v_request_id := gen_random_uuid();
  v_result := public.submit_card_edit_request(
    v_source.id,v_owner,'Betulkan maklumat majlis.',v_request_id
  );
  select id into v_request_row_id from public.card_edit_requests where request_id=v_request_id;
  v_grant := public.create_card_replacement_grant(
    v_source.id,v_admin,'Grant after request',gen_random_uuid(),gen_random_uuid(),
    gen_random_uuid(),'issue75-80-grant-target-' || replace(gen_random_uuid()::text,'-',''),
    v_source_publication.snapshot,v_source_publication.id
  );
  v_decision_id := gen_random_uuid();
  v_result := public.review_card_edit_request(
    v_request_row_id,v_admin,'approve',null,v_decision_id
  );
  if v_result->>'status' <> 'stale' then
    raise exception 'request after pending replacement was not stale: %',v_result;
  end if;
  if exists (select 1 from public.card_edit_windows where card_id=v_source.id) then
    raise exception 'pending replacement request opened an edit window';
  end if;

  -- A request submitted before an atomic cutover is stale after the
  -- predecessor becomes terminal Retired.
  v_created := public.create_draft_order_and_card(
    'malay-wedding',v_owner,'issue75-80-cutover-' || replace(gen_random_uuid()::text,'-','')
  )::jsonb;
  update public.orders
     set status='paid', manual_paid_draft=true, payment_method='stripe',
         payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft(
    (v_created->>'cardId')::uuid,v_owner,
    'I understand that this invitation will become public and read-only.',1
  );
  select * into v_source from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_source_publication
    from public.card_publications where id=v_source.current_publication_id;
  v_request_id := gen_random_uuid();
  perform public.submit_card_edit_request(
    v_source.id,v_owner,'Tukar alamat majlis.',v_request_id
  );
  select id into v_request_row_id from public.card_edit_requests where request_id=v_request_id;
  v_grant := public.create_card_replacement_grant(
    v_source.id,v_admin,'Cutover after request',gen_random_uuid(),gen_random_uuid(),
    gen_random_uuid(),'issue75-80-cutover-target-' || replace(gen_random_uuid()::text,'-',''),
    v_source_publication.snapshot,v_source_publication.id
  );
  perform public.plan_card_replacement_assets(
    (v_grant->>'grantId')::uuid,v_source_publication.id,'[]'::jsonb
  );
  select c.* into v_target
    from public.cards c
   where c.id=(v_grant->>'replacementCardId')::uuid;
  perform public.finalize_card_replacement_assets(
    (v_grant->>'grantId')::uuid,v_source_publication.id,
    v_target.custom_data_draft,v_target.draft_version
  );
  v_result := public.cutover_card_replacement(
    (v_grant->>'grantId')::uuid,v_admin,'Complete reviewed replacement',
    gen_random_uuid(),v_source_publication.id,v_target.draft_version
  );
  if not (v_result->'result'->>'retired')::boolean then
    raise exception 'cutover did not retire predecessor: %',v_result;
  end if;
  v_result := public.review_card_edit_request(
    v_request_row_id,v_admin,'approve',null,gen_random_uuid()
  );
  if v_result->>'status' <> 'stale' then
    raise exception 'request after retirement was not stale: %',v_result;
  end if;
  if not public.card_is_retired(v_source.id) then
    raise exception 'cutover predecessor is not terminal retired';
  end if;
  if exists (
    select 1 from public.card_edit_windows where card_id=v_source.id
  ) then
    raise exception 'retired predecessor received an edit window';
  end if;

  select * into v_target
    from public.cards where id=(v_grant->>'replacementCardId')::uuid;

  -- Retired rows reject every direct lifecycle route, including a fresh
  -- customer request and administrator restore/open attempts.
  v_caught := false;
  begin
    perform public.submit_card_edit_request(
      v_source.id,v_owner,'Request on retired predecessor',gen_random_uuid()
    );
  exception when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate, v_message = message_text;
    v_caught := true;
  end;
  if v_sqlstate is distinct from '55000' or v_message is distinct from 'REQUEST_NOT_ELIGIBLE' then
    raise exception 'retired request expected REQUEST_NOT_ELIGIBLE/55000, got %/%',v_message,v_sqlstate;
  end if;
  v_caught := false;
  v_sqlstate := null;
  v_message := null;
  begin
    perform public.open_card_edit_window(
      v_source.id,v_admin,'Open retired predecessor',gen_random_uuid()
    );
  exception when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate, v_message = message_text;
    v_caught := true;
  end;
  if v_sqlstate is distinct from 'P0001' or v_message is distinct from 'RETIRED' then
    raise exception 'retired edit grant expected RETIRED/P0001, got %/%',v_message,v_sqlstate;
  end if;
  select * into v_source from public.cards where id=v_source.id;
  v_caught := false;
  v_sqlstate := null;
  v_message := null;
  begin
    perform public.save_card_draft(
      v_source.id,v_owner,coalesce(v_source.custom_data,'{}'::jsonb),v_source.draft_version
    );
  exception when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate, v_message = message_text;
    v_caught := true;
  end;
  if v_sqlstate is distinct from '55000' or v_message is distinct from 'CARD_NOT_EDITABLE' then
    raise exception 'retired draft save expected CARD_NOT_EDITABLE/55000, got %/%',v_message,v_sqlstate;
  end if;
  v_caught := false;
  v_sqlstate := null;
  v_message := null;
  begin
    perform public.publish_paid_draft(
      v_source.id,v_owner,
      'I understand that this invitation will become public and read-only.',v_source.draft_version
    );
  exception when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate, v_message = message_text;
    v_caught := true;
  end;
  if v_sqlstate is distinct from 'P0001' or v_message is distinct from 'RETIRED' then
    raise exception 'retired publication expected RETIRED/P0001, got %/%',v_message,v_sqlstate;
  end if;
  v_caught := false;
  v_sqlstate := null;
  v_message := null;
  begin
    perform public.set_card_availability(
      v_source.id,v_admin,'restored','Restore retired predecessor'
    );
  exception when others then
    get stacked diagnostics v_sqlstate = returned_sqlstate, v_message = message_text;
    v_caught := true;
  end;
  if v_sqlstate is distinct from 'P0001' or v_message is distinct from 'RETIRED' then
    raise exception 'retired restore expected RETIRED/P0001, got %/%',v_message,v_sqlstate;
  end if;

  -- A completed replacement is a normal current Published invitation for its
  -- owner: it can request a fresh window, save a revision, and republish.
  v_request_id := gen_random_uuid();
  v_result := public.submit_card_edit_request(
    v_target.id,v_owner,'Betulkan nama pengantin.',v_request_id
  );
  select id into v_request_row_id from public.card_edit_requests where request_id=v_request_id;
  v_result := public.review_card_edit_request(
    v_request_row_id,v_admin,'approve',null,gen_random_uuid()
  );
  if v_result->>'status' <> 'approved' or v_result->>'windowId' is null then
    raise exception 'completed replacement did not receive a normal window: %',v_result;
  end if;
  v_window_id := (v_result->>'windowId')::uuid;
  select * into v_target from public.cards where id=v_target.id;
  v_target_draft := jsonb_set(
    coalesce(v_target.revision_draft,v_target.custom_data,'{}'::jsonb),
    '{combinedReviewMarker}',to_jsonb('saved-after-replacement'::text),true
  );
  v_saved := public.save_card_draft(
    v_target.id,v_owner,v_target_draft,v_target.draft_version
  );
  if v_saved->>'mode' <> 'revision' then
    raise exception 'completed replacement revision was not saved: %',v_saved;
  end if;
  v_before_publication := v_target.current_publication_id;
  v_published := public.publish_card_revision(
    v_target.id,v_owner,v_window_id,
    'I understand that this invitation will become public and read-only.',
    (v_saved->>'draftVersion')::bigint
  );
  if not (v_published->>'published')::boolean then
    raise exception 'completed replacement revision was not republished: %',v_published;
  end if;
  select * into v_target from public.cards where id=v_target.id;
  if not v_target.is_published
     or v_target.current_publication_id is not distinct from v_before_publication
     or v_target.active_edit_window_id is not null then
    raise exception 'completed replacement did not return to current Published state';
  end if;

  -- A pending replacement target remains owner-editable, but its grant-only
  -- entitlement cannot be paid again or self-published. Its predecessor may
  -- still be disabled for moderation while the replacement is prepared.
  v_created := public.create_draft_order_and_card(
    'malay-wedding',v_owner,'issue75-80-pending-' || replace(gen_random_uuid()::text,'-','')
  )::jsonb;
  update public.orders
     set status='paid', manual_paid_draft=true, payment_method='stripe',
         payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft(
    (v_created->>'cardId')::uuid,v_owner,
    'I understand that this invitation will become public and read-only.',1
  );
  select * into v_source from public.cards where id=(v_created->>'cardId')::uuid;
  select * into v_source_publication
    from public.card_publications where id=v_source.current_publication_id;
  v_grant := public.create_card_replacement_grant(
    v_source.id,v_admin,'Pending target owner edit',gen_random_uuid(),gen_random_uuid(),
    gen_random_uuid(),'issue75-80-pending-target-' || replace(gen_random_uuid()::text,'-',''),
    v_source_publication.snapshot,v_source_publication.id
  );
  select * into v_target from public.cards where id=(v_grant->>'replacementCardId')::uuid;
  v_target_draft := v_target.custom_data_draft || jsonb_build_object('pendingOwnerEdit',true);
  v_saved := public.save_card_draft(
    v_target.id,v_owner,v_target_draft,v_target.draft_version
  );
  if v_saved->>'mode' <> 'draft' then
    raise exception 'pending replacement owner save was not accepted: %',v_saved;
  end if;
  v_caught := false;
  begin
    update public.orders set payment_method='stripe' where id=v_target.order_id;
  exception when others then
    v_message := sqlerrm;
    v_caught := v_message like '%CONTROLLED_REPLACEMENT_PAYMENT_METADATA_FORBIDDEN%';
  end;
  if not v_caught then raise exception 'pending replacement payment mutation was accepted: %',v_message; end if;
  select * into v_target from public.cards where id=v_target.id;
  v_caught := false;
  begin
    perform public.publish_paid_draft(
      v_target.id,v_owner,
      'I understand that this invitation will become public and read-only.',
      v_target.draft_version
    );
  exception when others then
    v_message := sqlerrm;
    v_caught := v_message like '%CONTROLLED_REPLACEMENT_CUTOVER_REQUIRED%';
  end;
  if not v_caught then raise exception 'pending replacement self-publication was accepted: %',v_message; end if;
  v_result := public.set_card_availability(
    v_source.id,v_admin,'disabled','Pending replacement moderation'
  );
  if (v_result->>'is_published')::boolean then
    raise exception 'pending predecessor disable did not take effect';
  end if;
end
$$;

rollback;
select 'issue75-80 combined replacement/edit-request acceptance passed';
