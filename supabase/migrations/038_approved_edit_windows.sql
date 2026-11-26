-- Administrator-approved edit windows for already-published invitations.
--
-- This migration is deliberately additive. `cards.custom_data` remains the
-- immutable first-publication snapshot. A later publication is an immutable
-- row in card_publications, and cards.current_publication_id is the one
-- guarded pointer guest entry points may read. A customer edits only
-- cards.revision_draft while a short-lived administrator grant is active.
--
-- No caller-set GUC is a write capability. Card lifecycle RPCs authorize one
-- row mutation through card_mutation_authorizations; the card trigger rejects
-- direct service-role table writes, including attempts that set historical
-- app.* GUCs.

-- ---------------------------------------------------------------------------
-- 1. Revision state and immutable history
-- ---------------------------------------------------------------------------

alter table public.cards
  add column if not exists revision_draft jsonb,
  add column if not exists current_publication_id uuid,
  add column if not exists active_edit_window_id uuid;

create table if not exists public.card_edit_windows (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete restrict,
  owner_id uuid not null references public.users(id) on delete restrict,
  admin_id uuid not null references public.users(id) on delete restrict,
  request_id uuid not null,
  reason text not null,
  granted_at timestamptz not null,
  expires_at timestamptz not null,
  constraint card_edit_windows_request_unique unique (card_id, request_id),
  constraint card_edit_windows_reason_valid check (
    octet_length(btrim(reason)) between 1 and 500
    and btrim(reason) = reason
  ),
  constraint card_edit_windows_fixed_duration check (
    expires_at = granted_at + interval '7 days'
  )
);

create index if not exists card_edit_windows_card_recent_idx
  on public.card_edit_windows(card_id, granted_at desc, id desc);

create table if not exists public.card_publications (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete restrict,
  revision_number bigint not null check (revision_number >= 1),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  source_edit_window_id uuid references public.card_edit_windows(id) on delete restrict,
  published_by uuid not null references public.users(id) on delete restrict,
  acknowledgement text not null,
  draft_version bigint not null check (draft_version >= 1),
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint card_publications_revision_unique unique (card_id, revision_number),
  constraint card_publications_window_unique unique (card_id, source_edit_window_id),
  constraint card_publications_acknowledgement_exact check (
    acknowledgement = 'I understand that this invitation will become public and read-only.'
  )
);

create index if not exists card_publications_card_recent_idx
  on public.card_publications(card_id, revision_number desc);

create table if not exists public.card_edit_activity (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete restrict,
  edit_window_id uuid references public.card_edit_windows(id) on delete restrict,
  actor_id uuid not null references public.users(id) on delete restrict,
  activity text not null check (activity in ('saved', 'published')),
  draft_version bigint not null check (draft_version >= 1),
  created_at timestamptz not null default now()
);

create index if not exists card_edit_activity_card_recent_idx
  on public.card_edit_activity(card_id, created_at desc, id desc);

-- Historical published rows did not have a separate pointer. Reconstruct only
-- from durable data already present. A malformed snapshot is intentionally not
-- manufactured into a publication row; the guest boundary will fail closed.
insert into public.card_publications(
  card_id, revision_number, snapshot, source_edit_window_id, published_by,
  acknowledgement, draft_version, published_at
)
select
  c.id,
  1,
  coalesce(a.published_snapshot, c.custom_data),
  null,
  c.user_id,
  coalesce(
    a.acknowledgement,
    'I understand that this invitation will become public and read-only.'
  ),
  greatest(coalesce(a.draft_version, c.draft_version), 1),
  c.published_at
from public.cards c
left join public.card_publication_actions a on a.card_id = c.id
where c.published_at is not null
  and c.user_id is not null
  and jsonb_typeof(coalesce(a.published_snapshot, c.custom_data)) = 'object'
  and not exists (
    select 1
    from public.card_publications p
    where p.card_id = c.id and p.revision_number = 1
  );

update public.cards c
set current_publication_id = p.id
from public.card_publications p
where p.card_id = c.id
  and p.revision_number = 1
  and c.published_at is not null
  and c.current_publication_id is null;

-- Guestbook rows belong to the immutable publication that was visible when
-- the guest submitted them. A later publication must not inherit old wishes
-- through the guest page or its realtime channel.
alter table public.rsvp_responses
  add column if not exists publication_id uuid;

update public.rsvp_responses r
set publication_id = c.current_publication_id
from public.cards c
where r.card_id = c.id
  and r.publication_id is null
  and c.current_publication_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.rsvp_responses'::regclass
      and conname = 'rsvp_responses_publication_fk'
  ) then
    alter table public.rsvp_responses
      add constraint rsvp_responses_publication_fk
      foreign key (publication_id)
      references public.card_publications(id)
      on delete restrict;
  end if;
end $$;

create index if not exists rsvp_responses_publication_recent_idx
  on public.rsvp_responses(publication_id, created_at desc);

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
  where id = new.card_id;
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

drop trigger if exists rsvp_current_publication on public.rsvp_responses;
create trigger rsvp_current_publication
before insert or update on public.rsvp_responses
for each row execute function public.rsvp_current_publication_guard();

revoke all on function public.rsvp_current_publication_guard() from public, anon, authenticated;
grant execute on function public.rsvp_current_publication_guard() to service_role;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.cards'::regclass
      and conname = 'cards_current_publication_fk'
  ) then
    alter table public.cards
      add constraint cards_current_publication_fk
      foreign key (current_publication_id)
      references public.card_publications(id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.cards'::regclass
      and conname = 'cards_active_edit_window_fk'
  ) then
    alter table public.cards
      add constraint cards_active_edit_window_fk
      foreign key (active_edit_window_id)
      references public.card_edit_windows(id)
      on delete restrict;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Append-only audit ACLs and policies
-- ---------------------------------------------------------------------------

create or replace function public.prevent_edit_window_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'IMMUTABLE_EDIT_WINDOW_HISTORY'
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists card_edit_windows_immutable on public.card_edit_windows;
create trigger card_edit_windows_immutable
before update or delete on public.card_edit_windows
for each row execute function public.prevent_edit_window_history_mutation();

drop trigger if exists card_publications_immutable on public.card_publications;
create trigger card_publications_immutable
before update or delete on public.card_publications
for each row execute function public.prevent_edit_window_history_mutation();

drop trigger if exists card_edit_activity_immutable on public.card_edit_activity;
create trigger card_edit_activity_immutable
before update or delete on public.card_edit_activity
for each row execute function public.prevent_edit_window_history_mutation();

alter table public.card_edit_windows enable row level security;
alter table public.card_publications enable row level security;
alter table public.card_edit_activity enable row level security;

revoke all on public.card_edit_windows from public, anon, authenticated, service_role;
revoke all on public.card_publications from public, anon, authenticated, service_role;
revoke all on public.card_edit_activity from public, anon, authenticated, service_role;
grant select on public.card_edit_windows to authenticated, service_role;
grant select on public.card_publications to authenticated, service_role;
grant select on public.card_edit_activity to authenticated, service_role;

drop policy if exists "owners can read edit windows" on public.card_edit_windows;
create policy "owners can read edit windows"
on public.card_edit_windows for select to authenticated
using (
  exists (
    select 1 from public.cards c
    where c.id = card_edit_windows.card_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "admins can read edit windows" on public.card_edit_windows;
create policy "admins can read edit windows"
on public.card_edit_windows for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  )
);

drop policy if exists "owners can read publications" on public.card_publications;
create policy "owners can read publications"
on public.card_publications for select to authenticated
using (
  exists (
    select 1 from public.cards c
    where c.id = card_publications.card_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "admins can read publications" on public.card_publications;
create policy "admins can read publications"
on public.card_publications for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  )
);

drop policy if exists "owners can read edit activity" on public.card_edit_activity;
create policy "owners can read edit activity"
on public.card_edit_activity for select to authenticated
using (
  exists (
    select 1 from public.cards c
    where c.id = card_edit_activity.card_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists "admins can read edit activity" on public.card_edit_activity;
create policy "admins can read edit activity"
on public.card_edit_activity for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  )
);

-- The availability history also becomes function-owned append-only data. The
-- existing administrator RPC remains the only writer after this migration.
revoke insert, update, delete on public.card_availability_actions
  from public, anon, authenticated, service_role;

create or replace function public.prevent_availability_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP <> 'INSERT' then
    raise exception 'IMMUTABLE_AVAILABILITY_HISTORY'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists card_availability_actions_immutable
  on public.card_availability_actions;
create trigger card_availability_actions_immutable
before update or delete on public.card_availability_actions
for each row execute function public.prevent_availability_history_mutation();

-- Anonymous direct PostgREST reads are intentionally empty. The application
-- guest boundary below selects exactly one current publication using the
-- service client, so cards.custom_data and old joins cannot disclose history.
drop policy if exists "paid published cards are publicly readable" on public.cards;
drop policy if exists "published cards are publicly readable" on public.cards;
drop policy if exists "guest cards direct access denied" on public.cards;
create policy "guest cards direct access denied"
on public.cards for select to anon using (false);

-- ---------------------------------------------------------------------------
-- 3. Internal card-mutation capability
-- ---------------------------------------------------------------------------

create table if not exists public.card_mutation_authorizations (
  txid bigint not null,
  card_id uuid not null references public.cards(id) on delete cascade,
  capability text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (txid, card_id, capability)
);

revoke all on public.card_mutation_authorizations
  from public, anon, authenticated, service_role;

create or replace function public.authorize_card_mutation(
  p_card_id uuid,
  p_capability text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_card_id is null or coalesce(btrim(p_capability), '') = '' then
    raise exception 'CARD_MUTATION_CAPABILITY_INVALID'
      using errcode = 'check_violation';
  end if;
  insert into public.card_mutation_authorizations(txid, card_id, capability)
  values (txid_current(), p_card_id, btrim(p_capability))
  on conflict (txid, card_id, capability) do nothing;
end;
$$;

revoke all on function public.authorize_card_mutation(uuid, text)
  from public, anon, authenticated, service_role;

-- One guarded trigger replaces the historical caller-set-GUC bypass. It also
-- keeps the original first snapshot, slug, and first-publication time fixed.
drop trigger if exists cards_published_snapshot_immutable on public.cards;

create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_authorized boolean;
begin
  if TG_OP = 'INSERT' then
    if new.is_published is true
       or new.published_at is not null
       or new.current_publication_id is not null then
      raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if old.published_at is not null and (
      new.custom_data is distinct from old.custom_data
      or new.published_at is distinct from old.published_at
      or new.slug is distinct from old.slug
    ) then
      raise exception 'PUBLISHED_SNAPSHOT_IMMUTABLE'
        using errcode = 'restrict_violation';
    end if;

    if to_jsonb(new) is not distinct from to_jsonb(old) then
      return new;
    end if;

    select exists (
      select 1
      from public.card_mutation_authorizations a
      where a.txid = txid_current() and a.card_id = old.id
    ) into v_authorized;
    if not v_authorized then
      if new.is_published is distinct from old.is_published then
        raise exception 'PUBLICATION_PAYMENT_ONLY' using errcode = 'check_violation';
      end if;
      raise exception 'CARD_UPDATE_GUARDED' using errcode = 'restrict_violation';
    end if;

    delete from public.card_mutation_authorizations
    where txid = txid_current() and card_id = old.id;
    return new;
  end if;

  if TG_OP = 'DELETE' then
    if exists (
      select 1 from public.orders
      where id = old.order_id and status = 'paid'
    ) then
      raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation';
    end if;
    if exists (
      select 1 from public.duitnow_transfer_submissions s
      where s.order_id = old.order_id
    ) then
      raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED'
        using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists cards_payment_lifecycle on public.cards;
create trigger cards_payment_lifecycle
before insert or update or delete on public.cards
for each row execute function public.cards_payment_lifecycle_guard();

-- ---------------------------------------------------------------------------
-- 4. Shared lifecycle helpers and administrator grant
-- ---------------------------------------------------------------------------

create or replace function public.open_card_edit_window(
  p_card_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_publication public.card_publications%rowtype;
  v_latest_action text;
  v_granted_at timestamptz;
  v_expires_at timestamptz;
  v_draft jsonb;
begin
  if not exists (
    select 1 from public.users where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if p_request_id is null then
    raise exception 'REQUEST_ID_REQUIRED' using errcode = 'check_violation';
  end if;
  if coalesce(btrim(p_reason), '') = ''
     or octet_length(btrim(p_reason)) > 500
     or btrim(p_reason) <> p_reason then
    raise exception 'REASON_INVALID' using errcode = 'check_violation';
  end if;

  select order_id into v_order_id
  from public.cards where id = p_card_id;
  if not found or v_order_id is null then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;

  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then
    raise exception 'CARD_NOT_FOUND' using errcode = 'no_data_found';
  end if;
  if v_order.status is distinct from 'paid'
     or v_card.user_id is distinct from v_order.user_id then
    raise exception 'UNPAID' using errcode = 'object_not_in_prerequisite_state';
  end if;

  -- A client retry with the same operation id returns the original grant and
  -- never restarts its deadline, even if the window has since closed.
  select * into v_window
  from public.card_edit_windows
  where card_id = v_card.id and request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'granted', true, 'replayed', true, 'windowId', v_window.id,
      'requestId', v_window.request_id, 'grantedAt', v_window.granted_at,
      'expiresAt', v_window.expires_at, 'reason', v_window.reason
    );
  end if;

  select action into v_latest_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;
  if v_latest_action = 'disabled' then
    raise exception 'CARD_UNAVAILABLE' using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_card.active_edit_window_id is not null then
    if v_card.is_published or v_card.published_at is null then
      raise exception 'EDIT_WINDOW_CORRUPT';
    end if;
    select * into v_window
    from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    if v_window.expires_at > clock_timestamp() then
      raise exception 'EDIT_WINDOW_ACTIVE' using errcode = 'object_not_in_prerequisite_state';
    end if;
  elsif not v_card.is_published or v_card.published_at is null then
    raise exception 'CARD_NOT_PUBLISHED' using errcode = 'object_not_in_prerequisite_state';
  end if;

  if v_card.current_publication_id is null then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  select * into v_publication
  from public.card_publications
  where id = v_card.current_publication_id and card_id = v_card.id;
  if not found or jsonb_typeof(v_publication.snapshot) <> 'object' then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  if v_publication.snapshot ? 'templateId'
     and v_publication.snapshot->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.revision_draft is not null
     and jsonb_typeof(v_card.revision_draft) <> 'object' then
    raise exception 'EDIT_WINDOW_CORRUPT';
  end if;

  v_granted_at := clock_timestamp();
  v_expires_at := v_granted_at + interval '7 days';
  insert into public.card_edit_windows(
    card_id, owner_id, admin_id, request_id, reason, granted_at, expires_at
  ) values (
    v_card.id, v_card.user_id, p_admin_id, p_request_id, btrim(p_reason),
    v_granted_at, v_expires_at
  ) returning * into v_window;

  v_draft := coalesce(v_card.revision_draft, v_publication.snapshot);
  perform public.authorize_card_mutation(v_card.id, 'open_edit_window');
  update public.cards
  set revision_draft = v_draft,
      active_edit_window_id = v_window.id,
      is_published = false
  where id = v_card.id
    and current_publication_id = v_publication.id;
  if not found then raise exception 'EDIT_WINDOW_CONFLICT'; end if;

  return jsonb_build_object(
    'granted', true, 'replayed', false, 'windowId', v_window.id,
    'requestId', v_window.request_id, 'grantedAt', v_window.granted_at,
    'expiresAt', v_window.expires_at, 'reason', v_window.reason
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Payment recovery and owner draft persistence
-- ---------------------------------------------------------------------------

create or replace function public.finalize_paid_order(p_order_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_publication public.card_publications%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_last_action text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status is distinct from 'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  select * into v_card from public.cards where order_id = p_order_id for update;
  if not found then raise exception 'CARD_MISSING'; end if;
  if v_card.order_id is distinct from v_order.id
     or v_card.user_id is distinct from v_order.user_id
     or v_card.template_id is distinct from v_order.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;

  select action into v_last_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;
  if v_last_action = 'disabled' then
    return json_build_object('state', 'unavailable', 'promoted', false);
  end if;

  if v_card.published_at is not null then
    if v_card.current_publication_id is null then
      raise exception 'CURRENT_PUBLICATION_MISSING';
    end if;
    select * into v_publication
    from public.card_publications
    where id = v_card.current_publication_id and card_id = v_card.id;
    if not found or jsonb_typeof(v_publication.snapshot) <> 'object' then
      raise exception 'CURRENT_PUBLICATION_MISSING';
    end if;
    if v_card.is_published then
      return json_build_object(
        'state', 'published', 'slug', v_card.slug, 'promoted', false,
        'publicationId', v_publication.id
      );
    end if;
    if v_card.active_edit_window_id is null then
      return json_build_object('state', 'unavailable', 'promoted', false);
    end if;
    select * into v_window
    from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    return json_build_object(
      'state', case when v_window.expires_at > clock_timestamp()
                    then 'edit_window' else 'edit_window_expired' end,
      'slug', v_card.slug, 'promoted', false,
      'windowId', v_window.id, 'expiresAt', v_window.expires_at,
      'draftVersion', v_card.draft_version
    );
  end if;

  if v_card.is_published or v_card.custom_data_draft is null then
    raise exception 'CARD_NOT_PROMOTABLE'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if not v_order.manual_paid_draft then
    update public.orders set manual_paid_draft = true
    where id = v_order.id and status = 'paid';
  end if;
  return json_build_object(
    'state', 'paid_draft', 'slug', v_card.slug, 'promoted', false,
    'draftVersion', v_card.draft_version,
    'lastActivityAt', v_card.last_activity_at
  );
end;
$$;

create or replace function public.save_card_draft(
  p_card_id uuid,
  p_owner uuid,
  p_draft jsonb,
  p_expected_draft_version bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_current public.card_publications%rowtype;
  v_saved_version bigint;
  v_saved_at timestamptz;
begin
  if p_owner is null then raise exception 'FORBIDDEN'; end if;
  if p_expected_draft_version is null or p_expected_draft_version < 1 then
    raise exception 'DRAFT_VERSION_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'DRAFT_INVALID' using errcode = 'check_violation';
  end if;

  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then
    raise exception 'CARD_NOT_FOUND';
  end if;
  if v_order.user_id is distinct from p_owner
     or v_card.user_id is distinct from p_owner then raise exception 'FORBIDDEN'; end if;
  if v_order.status not in ('pending', 'paid') then raise exception 'CARD_NOT_EDITABLE'; end if;
  if v_card.template_id is distinct from v_order.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if p_draft ? 'templateId'
     and p_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;

  if v_card.published_at is not null then
    if v_card.is_published or v_card.active_edit_window_id is null
       or v_card.revision_draft is null then
      raise exception 'CARD_NOT_EDITABLE'
        using errcode = 'object_not_in_prerequisite_state';
    end if;
    select * into v_window
    from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    if v_card.current_publication_id is null then
      raise exception 'CURRENT_PUBLICATION_MISSING';
    end if;
    select * into v_current
    from public.card_publications
    where id = v_card.current_publication_id and card_id = v_card.id;
    if not found or jsonb_typeof(v_current.snapshot) <> 'object' then
      raise exception 'CURRENT_PUBLICATION_MISSING';
    end if;
    if v_current.snapshot ? 'templateId'
       and v_current.snapshot->>'templateId' is distinct from v_card.template_id then
      raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.card_availability_actions
      where card_id = v_card.id and action = 'disabled'
      order by created_at desc, id desc limit 1
    ) then
      -- The exact latest-action check is repeated below so an older disable
      -- cannot lock a card after an administrator has restored it.
      if (select action from public.card_availability_actions
          where card_id = v_card.id order by created_at desc, id desc limit 1) = 'disabled' then
        raise exception 'CARD_UNAVAILABLE';
      end if;
    end if;
    if v_window.expires_at <= clock_timestamp() then
      raise exception 'EDIT_WINDOW_EXPIRED'
        using errcode = 'object_not_in_prerequisite_state';
    end if;

    perform public.authorize_card_mutation(v_card.id, 'save_revision');
    update public.cards
    set revision_draft = p_draft,
        draft_version = draft_version + 1,
        last_activity_at = clock_timestamp()
    where id = v_card.id
      and is_published = false
      and active_edit_window_id = v_window.id
      and revision_draft is not null
      and draft_version = p_expected_draft_version;
    if not found then raise exception 'DRAFT_VERSION_CONFLICT'; end if;
    select draft_version, last_activity_at
    into v_saved_version, v_saved_at
    from public.cards where id = v_card.id;
    insert into public.card_edit_activity(
      card_id, edit_window_id, actor_id, activity, draft_version
    ) values (v_card.id, v_window.id, p_owner, 'saved', v_saved_version);
    return jsonb_build_object(
      'saved', true, 'mode', 'revision', 'windowId', v_window.id,
      'expiresAt', v_window.expires_at, 'draftVersion', v_saved_version,
      'lastActivityAt', v_saved_at
    );
  end if;

  if (v_order.status = 'paid' and not v_order.manual_paid_draft)
     or v_card.is_published or v_card.custom_data_draft is null then
    raise exception 'CARD_NOT_EDITABLE'
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  perform public.authorize_card_mutation(v_card.id, 'save_draft');
  update public.cards
  set custom_data_draft = p_draft,
      draft_version = draft_version + 1,
      last_activity_at = clock_timestamp()
  where id = v_card.id
    and is_published = false
    and custom_data_draft is not null
    and active_edit_window_id is null
    and draft_version = p_expected_draft_version;
  if not found then raise exception 'DRAFT_VERSION_CONFLICT'; end if;
  select draft_version, last_activity_at
  into v_saved_version, v_saved_at
  from public.cards where id = v_card.id;
  insert into public.card_edit_activity(
    card_id, edit_window_id, actor_id, activity, draft_version
  ) values (v_card.id, null, p_owner, 'saved', v_saved_version);
  return jsonb_build_object(
    'saved', true, 'mode', 'draft', 'draftVersion', v_saved_version,
    'lastActivityAt', v_saved_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. First publication and later revision publication
-- ---------------------------------------------------------------------------

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
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if p_owner is null or v_order.user_id is distinct from p_owner
     or v_card.user_id is distinct from p_owner then raise exception 'FORBIDDEN'; end if;
  if v_order.status is distinct from 'paid' then raise exception 'ORDER_NOT_PAID'; end if;

  if v_card.published_at is not null then
    if v_card.is_published and v_card.current_publication_id is not null then
      return jsonb_build_object(
        'published', true, 'replayed', true, 'revision', false,
        'state', 'published', 'slug', v_card.slug,
        'draftVersion', v_card.draft_version, 'publishedAt', v_card.published_at
      );
    end if;
    raise exception 'CARD_NOT_FIRST_PUBLICATION';
  end if;
  if v_card.active_edit_window_id is not null or v_card.current_publication_id is not null then
    raise exception 'CARD_NOT_FIRST_PUBLICATION';
  end if;
  select action into v_last_action from public.card_availability_actions
  where card_id = v_card.id order by created_at desc, id desc limit 1;
  if v_last_action = 'disabled' then
    return jsonb_build_object('published', false, 'replayed', false, 'revision', false, 'state', 'unavailable');
  end if;
  if v_card.custom_data_draft is null then raise exception 'CARD_NOT_PROMOTABLE'; end if;
  if v_card.custom_data_draft ? 'templateId'
     and v_card.custom_data_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;
  if not v_order.manual_paid_draft then
    update public.orders set manual_paid_draft = true where id = v_order.id and status = 'paid';
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
  ) values (v_card.id, p_owner, p_expected_draft_version, p_acknowledgement, v_snapshot);
  return jsonb_build_object(
    'published', true, 'replayed', false, 'revision', false,
    'state', 'published', 'slug', v_card.slug,
    'eventName', public.duitnow_card_event_name(v_snapshot),
    'draftVersion', p_expected_draft_version, 'publishedAt', v_published_at,
    'publicationId', v_publication_id, 'revisionNumber', 1
  );
end;
$$;

create or replace function public.publish_card_revision(
  p_card_id uuid,
  p_owner uuid,
  p_edit_window_id uuid,
  p_acknowledgement text,
  p_expected_draft_version bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_current public.card_publications%rowtype;
  v_existing public.card_publications%rowtype;
  v_last_action text;
  v_revision bigint;
  v_publication_id uuid;
  v_published_at timestamptz;
begin
  if p_acknowledgement is distinct from
     'I understand that this invitation will become public and read-only.' then
    raise exception 'ACKNOWLEDGEMENT_REQUIRED' using errcode = 'check_violation';
  end if;
  if p_edit_window_id is null then raise exception 'EDIT_WINDOW_REQUIRED'; end if;
  if p_expected_draft_version is null or p_expected_draft_version < 1 then
    raise exception 'DRAFT_VERSION_REQUIRED' using errcode = 'check_violation';
  end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if p_owner is null or v_order.user_id is distinct from p_owner
     or v_card.user_id is distinct from p_owner then raise exception 'FORBIDDEN'; end if;
  if v_order.status is distinct from 'paid' or v_card.published_at is null then
    raise exception 'CARD_NOT_EDITABLE';
  end if;

  select action into v_last_action from public.card_availability_actions
  where card_id = v_card.id order by created_at desc, id desc limit 1;
  if v_last_action = 'disabled' then
    return jsonb_build_object('published', false, 'replayed', false, 'revision', true, 'state', 'unavailable');
  end if;

  if v_card.active_edit_window_id is null then
    select * into v_existing
    from public.card_publications
    where card_id = v_card.id
      and source_edit_window_id = p_edit_window_id
      and id = v_card.current_publication_id;
    if found and v_card.is_published then
      return jsonb_build_object(
        'published', true, 'replayed', true, 'revision', true, 'state', 'published',
        'slug', v_card.slug, 'draftVersion', v_card.draft_version,
        'publishedAt', v_card.published_at, 'publicationId', v_existing.id,
        'revisionNumber', v_existing.revision_number
      );
    end if;
    raise exception 'EDIT_WINDOW_NOT_ACTIVE';
  end if;
  if v_card.active_edit_window_id is distinct from p_edit_window_id then
    raise exception 'EDIT_WINDOW_SUPERSEDED' using errcode = 'serialization_failure';
  end if;

  select * into v_window from public.card_edit_windows
  where id = p_edit_window_id and card_id = v_card.id;
  if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
  if v_window.expires_at <= clock_timestamp() then
    raise exception 'EDIT_WINDOW_EXPIRED' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if v_card.is_published or v_card.revision_draft is null then
    raise exception 'CARD_NOT_EDITABLE';
  end if;
  if v_card.current_publication_id is null then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  select * into v_current from public.card_publications
  where id = v_card.current_publication_id and card_id = v_card.id;
  if not found or jsonb_typeof(v_current.snapshot) <> 'object' then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  if v_current.snapshot ? 'templateId'
     and v_current.snapshot->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.revision_draft ? 'templateId'
     and v_card.revision_draft->>'templateId' is distinct from v_card.template_id then
    raise exception 'TEMPLATE_MISMATCH' using errcode = 'check_violation';
  end if;
  if v_card.draft_version is distinct from p_expected_draft_version then
    raise exception 'DRAFT_VERSION_CONFLICT' using errcode = 'serialization_failure';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision
  from public.card_publications where card_id = v_card.id;
  v_published_at := clock_timestamp();
  insert into public.card_publications(
    card_id, revision_number, snapshot, source_edit_window_id, published_by,
    acknowledgement, draft_version, published_at
  ) values (
    v_card.id, v_revision, v_card.revision_draft, v_window.id, p_owner,
    p_acknowledgement, p_expected_draft_version, v_published_at
  ) returning id into v_publication_id;
  perform public.authorize_card_mutation(v_card.id, 'publish_revision');
  update public.cards
  set revision_draft = null,
      active_edit_window_id = null,
      is_published = true,
      current_publication_id = v_publication_id
  where id = v_card.id
    and active_edit_window_id = v_window.id
    and is_published = false
    and draft_version = p_expected_draft_version;
  if not found then raise exception 'DRAFT_VERSION_CONFLICT'; end if;
  insert into public.card_edit_activity(
    card_id, edit_window_id, actor_id, activity, draft_version
  ) values (v_card.id, v_window.id, p_owner, 'published', p_expected_draft_version);
  return jsonb_build_object(
    'published', true, 'replayed', false, 'revision', true, 'state', 'published',
    'slug', v_card.slug, 'draftVersion', p_expected_draft_version,
    'publishedAt', v_card.published_at, 'publicationId', v_publication_id,
    'revisionNumber', v_revision
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Availability transitions and active-window storage writes
-- ---------------------------------------------------------------------------

-- Worktree setup may create the fixture bucket after migrations. Reassert the
-- protected bucket's private flag here so a public-bucket default cannot
-- bypass the restrictive SELECT policy or the application asset route.
update storage.buckets
set public = false,
    file_size_limit = coalesce(file_size_limit, 5242880),
    allowed_mime_types = coalesce(
      allowed_mime_types,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
    )
where id = 'card-assets';

create or replace function public.set_card_availability(
  p_card_id uuid, p_admin_id uuid, p_action text, p_reason text default null
) returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
  v_window public.card_edit_windows%rowtype;
  v_last_action text;
begin
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then
    raise exception 'FORBIDDEN' using errcode = 'insufficient_privilege';
  end if;
  if p_action not in ('disabled', 'restored') then raise exception 'INVALID_ACTION'; end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if v_order.status is distinct from 'paid' then raise exception 'UNPAID'; end if;
  select action into v_last_action from public.card_availability_actions
  where card_id = v_card.id order by created_at desc, id desc limit 1;

  if p_action = 'disabled' then
    if not v_card.is_published and v_card.active_edit_window_id is null then
      raise exception 'NOT_PUBLISHED';
    end if;
    if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    if octet_length(btrim(p_reason)) > 1000 then raise exception 'REASON_INVALID'; end if;
    insert into public.card_availability_actions(card_id, admin_id, action, reason)
    values (v_card.id, p_admin_id, 'disabled', btrim(p_reason));
    perform public.authorize_card_mutation(v_card.id, 'disable_card');
    update public.cards set is_published = false where id = v_card.id;
    return json_build_object(
      'is_published', false, 'action', 'disabled',
      'state', case when v_card.active_edit_window_id is not null
                    then 'edit_window' else 'unavailable' end
    );
  end if;

  if v_card.is_published then raise exception 'ALREADY_PUBLISHED'; end if;
  if v_last_action is distinct from 'disabled' then raise exception 'NOT_DISABLED'; end if;
  insert into public.card_availability_actions(card_id, admin_id, action, reason)
  values (v_card.id, p_admin_id, 'restored', nullif(btrim(coalesce(p_reason, '')), ''));

  if v_card.active_edit_window_id is not null then
    select * into v_window from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    -- Restore removes the availability disable, but never publishes the old
    -- snapshot or extends the edit deadline.
    return json_build_object(
      'is_published', false, 'action', 'restored',
      'state', case when v_window.expires_at > clock_timestamp()
                    then 'edit_window' else 'edit_window_expired' end,
      'windowId', v_window.id, 'expiresAt', v_window.expires_at
    );
  end if;

  if v_card.current_publication_id is null or v_card.published_at is null then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;
  if not exists (
    select 1 from public.card_publications p
    where p.id = v_card.current_publication_id and p.card_id = v_card.id
  ) then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  perform public.authorize_card_mutation(v_card.id, 'restore_card');
  update public.cards set is_published = true where id = v_card.id;
  return json_build_object('is_published', true, 'action', 'restored', 'state', 'published');
end;
$$;

drop policy if exists "card-assets owner insert" on storage.objects;
drop policy if exists "card-assets owner update" on storage.objects;
drop policy if exists "card-assets owner delete" on storage.objects;

create policy "card-assets owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'card-assets'
  and name ~ '^[^/]+/[^/]+/[^/]+$'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and split_part(name, '/', 2) ~ '^[a-z][a-z0-9_]{0,63}$'
  and split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
  and coalesce(metadata->>'mimetype', '') in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  and exists (
    select 1
    from public.cards c
    join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1)
      and c.user_id = (select auth.uid())
      and (
        (
          c.published_at is null
          and c.is_published = false
          and (o.status <> 'paid' or o.manual_paid_draft is true)
        )
        or (
          c.published_at is not null
          and c.is_published = false
          and c.active_edit_window_id is not null
          and c.current_publication_id is not null
          and exists (
            select 1 from public.card_publications p
            where p.id = c.current_publication_id and p.card_id = c.id
          )
          and exists (
            select 1 from public.card_edit_windows w
            where w.id = c.active_edit_window_id
              and w.card_id = c.id
              and w.expires_at > clock_timestamp()
          )
          and not exists (
            select 1
            from public.card_availability_actions a
            where a.card_id = c.id
              and a.action = 'disabled'
              and not exists (
                select 1
                from public.card_availability_actions newer
                where newer.card_id = a.card_id
                  and (
                    newer.created_at > a.created_at
                    or (newer.created_at = a.created_at and newer.id > a.id)
                  )
              )
          )
        )
      )
  )
);

-- Asset replacement/deletion remains a pre-publication operation only. An
-- approved window can append a new UUID object, never rewrite/delete a byte.
create policy "card-assets owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'card-assets'
  and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = (storage.foldername(name))[1]
      and c.user_id = (select auth.uid())
      and c.published_at is null and c.is_published = false
      and (o.status <> 'paid' or o.manual_paid_draft is true)
  )
)
with check (
  bucket_id = 'card-assets'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
  and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = (storage.foldername(name))[1]
      and c.user_id = (select auth.uid())
      and c.published_at is null and c.is_published = false
      and (o.status <> 'paid' or o.manual_paid_draft is true)
  )
);

create policy "card-assets owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'card-assets'
  and exists (
    select 1 from public.cards c join public.orders o on o.id = c.order_id
    where c.id::text = (storage.foldername(name))[1]
      and c.user_id = (select auth.uid())
      and c.published_at is null and c.is_published = false
      and (o.status <> 'paid' or o.manual_paid_draft is true)
  )
);

-- ---------------------------------------------------------------------------
-- 8. Privileged RPC ACLs
-- ---------------------------------------------------------------------------

revoke all on function public.open_card_edit_window(uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.open_card_edit_window(uuid, uuid, text, uuid) to service_role;

revoke all on function public.publish_card_revision(uuid, uuid, uuid, text, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_card_revision(uuid, uuid, uuid, text, bigint) to service_role;

revoke all on function public.finalize_paid_order(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid) to service_role;

revoke all on function public.save_card_draft(uuid, uuid, jsonb, bigint)
  from public, anon, authenticated;
grant execute on function public.save_card_draft(uuid, uuid, jsonb, bigint) to service_role;

revoke all on function public.publish_paid_draft(uuid, uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function public.publish_paid_draft(uuid, uuid, text, bigint) to service_role;

revoke all on function public.set_card_availability(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_card_availability(uuid, uuid, text, text) to service_role;
