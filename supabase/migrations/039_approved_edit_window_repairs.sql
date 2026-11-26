-- Additive repairs for the already-applied administrator-approved edit-window
-- contract. This migration does not rewrite migration 038.

-- Pre-publication save activity is not payment evidence. Allow the existing
-- unpaid/no-evidence delete RPC to remove that card while retaining RESTRICT
-- on paid cards, publications, windows and payment history.
do $$
declare
  v_delete_action "char";
begin
  select c.confdeltype
    into v_delete_action
    from pg_constraint c
   where c.conrelid = 'public.card_edit_activity'::regclass
     and c.conname = 'card_edit_activity_card_id_fkey';

  if v_delete_action is null then
    execute 'alter table public.card_edit_activity
      add constraint card_edit_activity_card_id_fkey
      foreign key (card_id) references public.cards(id) on delete cascade';
  elsif v_delete_action <> 'c' then
    execute 'alter table public.card_edit_activity
      drop constraint card_edit_activity_card_id_fkey';
    execute 'alter table public.card_edit_activity
      add constraint card_edit_activity_card_id_fkey
      foreign key (card_id) references public.cards(id) on delete cascade';
  end if;
end
$$;

-- The immutable-history trigger must not veto the narrowly permitted cascade
-- from an unpaid card deletion. Direct history DELETE remains rejected at
-- trigger depth 1; a paid card cannot reach this cascade because the card
-- payment/audit guard rejects its deletion first.
create or replace function public.prevent_edit_window_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'IMMUTABLE_EDIT_WINDOW_HISTORY'
    using errcode = 'restrict_violation';
end;
$$;

revoke all on function public.prevent_edit_window_history_mutation() from public, anon, authenticated, service_role;

-- Every fresh grant, including a reopen after expiry, advances the optimistic
-- draft version. A retry of the same request returns before this trigger runs,
-- so it cannot restart the generation. Old tabs from a prior window therefore
-- fail the existing DRAFT_VERSION_CONFLICT check without needing a caller-set
-- GUC or a trustable browser window id.
create or replace function public.card_edit_window_generation_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.active_edit_window_id is distinct from old.active_edit_window_id
     and new.active_edit_window_id is not null then
    new.draft_version := old.draft_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists card_edit_window_generation on public.cards;
create trigger card_edit_window_generation
before update on public.cards
for each row execute function public.card_edit_window_generation_guard();

revoke all on function public.card_edit_window_generation_guard() from public, anon, authenticated, service_role;

-- `now()` is transaction-stable. Two disable/restore calls in one transaction
-- can therefore share a timestamp and make the UUID tie-breaker choose the
-- wrong latest action. Availability history remains append-only, but its
-- ordering uses the database wall clock for every new transition.
create or replace function public.availability_action_clock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.created_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists availability_action_clock on public.card_availability_actions;
create trigger availability_action_clock
before insert on public.card_availability_actions
for each row execute function public.availability_action_clock();

revoke all on function public.availability_action_clock() from public, anon, authenticated, service_role;

-- The RSVP guard must serialize against publication and availability
-- transitions. A row-level share lock lets an in-flight insert finish before a
-- transition, or makes the trigger observe the committed new pointer/private
-- state after the transition; it never validates an unlocked stale row.
create or replace function public.rsvp_current_publication_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_published boolean;
  v_current_publication_id uuid;
begin
  select is_published, current_publication_id
    into v_is_published, v_current_publication_id
    from public.cards
   where id = new.card_id
   for share;

  if not found
     or v_is_published is distinct from true
     or new.publication_id is null
     or new.publication_id is distinct from v_current_publication_id then
    raise exception 'RSVP_PUBLICATION_REQUIRED'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  return new;
end;
$$;

-- First-publication retries are selected by the request intent at the API
-- boundary, not by the fact that published_at is non-null. The database only
-- replays when the original first publication/version/owner/acknowledgement
-- still matches the current revision-1 pointer. A disabled card returns the
-- prior unavailable result, and a later edit window/publication rejects stale
-- first-publication requests.
create or replace function public.publish_paid_draft(
  p_card_id uuid,
  p_owner uuid,
  p_acknowledgement text,
  p_expected_draft_version bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_first public.card_publications%rowtype;
  v_last_action text;
  v_snapshot jsonb;
  v_published_at timestamptz;
  v_publication_id uuid;
begin
  if p_acknowledgement is distinct from
     'I understand that this invitation will become public and read-only.' then
    raise exception 'ACKNOWLEDGEMENT_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_expected_draft_version is null or p_expected_draft_version < 1 then
    raise exception 'DRAFT_VERSION_REQUIRED' using errcode = 'check_violation';
  end if;

  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then
    raise exception 'CARD_NOT_FOUND';
  end if;
  if p_owner is null or v_order.user_id is distinct from p_owner
     or v_card.user_id is distinct from p_owner then
    raise exception 'FORBIDDEN';
  end if;
  if v_order.status is distinct from 'paid' then
    raise exception 'ORDER_NOT_PAID';
  end if;

  select action into v_last_action
    from public.card_availability_actions
   where card_id = v_card.id
   order by created_at desc, id desc
   limit 1;
  if v_last_action = 'disabled' then
    return json_build_object(
      'published', false, 'replayed', false, 'revision', false,
      'state', 'unavailable'
    );
  end if;

  if v_card.published_at is not null then
    select * into v_first
      from public.card_publications
     where id = v_card.current_publication_id
       and card_id = v_card.id
       and revision_number = 1;

    if v_card.is_published
       and v_card.active_edit_window_id is null
       and found
       and v_first.published_by = p_owner
       and v_first.draft_version = p_expected_draft_version
       and v_first.acknowledgement = p_acknowledgement
       and v_card.custom_data is not distinct from v_first.snapshot then
      return jsonb_build_object(
        'published', true, 'replayed', true, 'revision', false,
        'state', 'published', 'slug', v_card.slug,
        'draftVersion', v_first.draft_version,
        'publishedAt', v_first.published_at,
        'publicationId', v_first.id, 'revisionNumber', 1
      );
    end if;
    raise exception 'CARD_NOT_FIRST_PUBLICATION';
  end if;

  if v_card.active_edit_window_id is not null
     or v_card.current_publication_id is not null then
    raise exception 'CARD_NOT_FIRST_PUBLICATION';
  end if;
  if v_card.is_published then
    raise exception 'CARD_NOT_PROMOTABLE';
  end if;
  if v_card.custom_data_draft is null then
    raise exception 'CARD_NOT_PROMOTABLE';
  end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;
  if not v_order.manual_paid_draft then
    update public.orders set manual_paid_draft = true
     where id = v_order.id and status = 'paid';
  end if;

  v_snapshot := v_card.custom_data_draft;
  v_published_at := clock_timestamp();
  insert into public.card_publications(
    card_id, revision_number, snapshot, published_by, acknowledgement,
    draft_version, published_at
  ) values (
    v_card.id, 1, v_snapshot, p_owner, p_acknowledgement,
    p_expected_draft_version, v_published_at
  ) returning id into v_publication_id;
  perform public.authorize_card_mutation(v_card.id, 'publish_first');
  update public.cards
     set custom_data = v_snapshot,
         custom_data_draft = null,
         is_published = true,
         published_at = v_published_at,
         current_publication_id = v_publication_id
   where id = v_card.id
     and is_published = false
     and published_at is null
     and current_publication_id is null
     and custom_data_draft is not null
     and draft_version = p_expected_draft_version;
  if not found then raise exception 'DRAFT_VERSION_CONFLICT'; end if;

  insert into public.card_publication_actions(
    card_id, owner_id, draft_version, acknowledgement, published_snapshot
  ) values (
    v_card.id, p_owner, p_expected_draft_version, p_acknowledgement, v_snapshot
  );
  return jsonb_build_object(
    'published', true, 'replayed', false, 'revision', false,
    'state', 'published', 'slug', v_card.slug,
    'eventName', public.duitnow_card_event_name(v_snapshot),
    'draftVersion', p_expected_draft_version, 'publishedAt', v_published_at,
    'publicationId', v_publication_id, 'revisionNumber', 1
  );
end;
$$;

revoke all on function public.publish_paid_draft(uuid, uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.publish_paid_draft(uuid, uuid, text, bigint)
  to service_role;
