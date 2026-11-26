-- Controlled replacement follow-up repairs.
--
-- 040 established the replacement tables and lifecycle functions. Keep that
-- migration immutable; this migration narrows the browser storage boundary
-- back to the append-only rules from 034/036/038, permits only the intended
-- pending-predecessor disable, and binds grant creation to the publication
-- the administrator reviewed before copying its snapshot.

-- ---------------------------------------------------------------------------
-- 1. Pending direction helpers
-- ---------------------------------------------------------------------------

create or replace function public.card_is_pending_replacement_target(p_card_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.card_replacement_grants g
    left join public.card_replacement_cutovers c on c.grant_id = g.id
    where c.id is null
      and g.replacement_card_id = p_card_id
  )
$$;

revoke all on function public.card_is_pending_replacement_target(uuid)
  from public, anon, authenticated;
grant execute on function public.card_is_pending_replacement_target(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Restore append-only card-assets policies
-- ---------------------------------------------------------------------------

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    ]
where id = 'card-assets';

drop policy if exists "card-assets owner insert" on storage.objects;
drop policy if exists "card-assets owner update" on storage.objects;
drop policy if exists "card-assets owner delete" on storage.objects;

-- A pending target is still a never-published paid draft, so it uses the
-- original first-publication branch. A published card may append a new UUID
-- only while its current edit window is valid; it may never overwrite or
-- delete an object from a historical publication.
create policy "card-assets owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'card-assets'
  and name ~ '^[^/]+/[^/]+/[^/]+$'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and split_part(name, '/', 2) ~ '^[a-z][a-z0-9_]{0,63}$'
  and split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
  and coalesce(metadata->>'mimetype', '') in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  )
  and exists (
    select 1
    from public.cards c
    join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1)
      and c.user_id = (select auth.uid())
      and not exists (
        select 1
        from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and (
        (
          c.published_at is null
          and c.current_publication_id is null
          and c.is_published = false
          and (o.status <> 'paid' or o.manual_paid_draft is true)
        )
        or (
          c.published_at is not null
          and c.is_published = false
          and c.active_edit_window_id is not null
          and c.current_publication_id is not null
          and exists (
            select 1
            from public.card_publications p
            where p.id = c.current_publication_id
              and p.card_id = c.id
          )
          and exists (
            select 1
            from public.card_edit_windows w
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

create policy "card-assets owner update"
on storage.objects for update to authenticated
using (
  bucket_id = 'card-assets'
  and name ~ '^[^/]+/[^/]+/[^/]+$'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and split_part(name, '/', 2) ~ '^[a-z][a-z0-9_]{0,63}$'
  and split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and exists (
    select 1
    from public.cards c
    join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1)
      and c.user_id = (select auth.uid())
      and c.published_at is null
      and c.current_publication_id is null
      and c.is_published = false
      and not exists (
        select 1
        from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and not exists (
        select 1
        from public.card_replacement_grants g
        join public.card_replacement_asset_preparations p on p.grant_id = g.id
        where g.replacement_card_id = c.id
      )
      and (o.status <> 'paid' or o.manual_paid_draft is true)
  )
)
with check (
  bucket_id = 'card-assets'
  and name ~ '^[^/]+/[^/]+/[^/]+$'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and split_part(name, '/', 2) ~ '^[a-z][a-z0-9_]{0,63}$'
  and split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
  and coalesce(metadata->>'mimetype', '') in (
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  )
  and exists (
    select 1
    from public.cards c
    join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1)
      and c.user_id = (select auth.uid())
      and c.published_at is null
      and c.current_publication_id is null
      and c.is_published = false
      and not exists (
        select 1
        from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and not exists (
        select 1
        from public.card_replacement_grants g
        join public.card_replacement_asset_preparations p on p.grant_id = g.id
        where g.replacement_card_id = c.id
      )
      and (o.status <> 'paid' or o.manual_paid_draft is true)
  )
);

create policy "card-assets owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'card-assets'
  and name ~ '^[^/]+/[^/]+/[^/]+$'
  and split_part(name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
  and split_part(name, '/', 2) ~ '^[a-z][a-z0-9_]{0,63}$'
  and split_part(name, '/', 3) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
  and exists (
    select 1
    from public.cards c
    join public.orders o on o.id = c.order_id
    where c.id::text = split_part(name, '/', 1)
      and c.user_id = (select auth.uid())
      and c.published_at is null
      and c.current_publication_id is null
      and c.is_published = false
      and not exists (
        select 1
        from public.card_replacement_cutovers retired
        where retired.predecessor_card_id = c.id
      )
      and not exists (
        select 1
        from public.card_replacement_grants g
        join public.card_replacement_asset_preparations p on p.grant_id = g.id
        where g.replacement_card_id = c.id
      )
      and (o.status <> 'paid' or o.manual_paid_draft is true)
  )
);

-- ---------------------------------------------------------------------------
-- 3. Moderation and card-write guards for pending direction
-- ---------------------------------------------------------------------------

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
  if not exists (select 1 from public.users where id = p_admin_id and role = 'admin') then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('disabled', 'restored') then raise exception 'INVALID_ACTION'; end if;
  select order_id into v_order_id from public.cards where id = p_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  select * into v_order from public.orders where id = v_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if public.card_is_retired(v_card.id) then raise exception 'RETIRED'; end if;
  if public.card_is_pending_replacement_target(v_card.id)
     or (public.card_has_pending_replacement(v_card.id) and p_action <> 'disabled') then
    raise exception 'REPLACEMENT_PENDING';
  end if;
  if v_order.status is distinct from 'paid' then raise exception 'UNPAID'; end if;
  select action into v_last_action
  from public.card_availability_actions
  where card_id = v_card.id
  order by created_at desc, id desc
  limit 1;

  if p_action = 'disabled' then
    if not v_card.is_published and v_card.active_edit_window_id is null then raise exception 'NOT_PUBLISHED'; end if;
    if coalesce(btrim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
    if octet_length(btrim(p_reason)) > 1000 then raise exception 'REASON_INVALID'; end if;
    insert into public.card_availability_actions(card_id, admin_id, action, reason)
    values (v_card.id, p_admin_id, 'disabled', btrim(p_reason));
    perform public.authorize_card_mutation(v_card.id, 'disable_card');
    update public.cards set is_published = false where id = v_card.id;
    return json_build_object(
      'is_published', false,
      'action', 'disabled',
      'state', case when v_card.active_edit_window_id is not null then 'edit_window' else 'unavailable' end
    );
  end if;

  if v_card.is_published then raise exception 'ALREADY_PUBLISHED'; end if;
  if v_last_action is distinct from 'disabled' then raise exception 'NOT_DISABLED'; end if;
  insert into public.card_availability_actions(card_id, admin_id, action, reason)
  values (v_card.id, p_admin_id, 'restored', nullif(btrim(coalesce(p_reason, '')), ''));
  if v_card.active_edit_window_id is not null then
    select * into v_window
    from public.card_edit_windows
    where id = v_card.active_edit_window_id and card_id = v_card.id;
    if not found then raise exception 'EDIT_WINDOW_CORRUPT'; end if;
    return json_build_object(
      'is_published', false,
      'action', 'restored',
      'state', case when v_window.expires_at > clock_timestamp() then 'edit_window' else 'edit_window_expired' end,
      'windowId', v_window.id,
      'expiresAt', v_window.expires_at
    );
  end if;
  if v_card.current_publication_id is null or v_card.published_at is null then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  if not exists (select 1 from public.card_publications p where p.id = v_card.current_publication_id and p.card_id = v_card.id) then raise exception 'CURRENT_PUBLICATION_MISSING'; end if;
  perform public.authorize_card_mutation(v_card.id, 'restore_card');
  update public.cards set is_published = true where id = v_card.id;
  return json_build_object('is_published', true, 'action', 'restored', 'state', 'published');
end;
$$;

revoke all on function public.set_card_availability(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_card_availability(uuid, uuid, text, text)
  to service_role;

create or replace function public.cards_payment_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_authorized boolean;
  v_capability text;
begin
  if TG_OP = 'INSERT' then
    if new.is_published is true or new.published_at is not null or new.current_publication_id is not null then raise exception 'PUBLICATION_PAYMENT_ONLY'; end if;
    return new;
  end if;
  if TG_OP = 'UPDATE' then
    if public.card_is_retired(old.id) then
      raise exception 'RETIRED' using errcode = 'restrict_violation';
    end if;
    if old.published_at is not null and (
      new.custom_data is distinct from old.custom_data
      or new.published_at is distinct from old.published_at
      or new.slug is distinct from old.slug
    ) then
      raise exception 'PUBLISHED_SNAPSHOT_IMMUTABLE';
    end if;
    if to_jsonb(new) is not distinct from to_jsonb(old) then return new; end if;
    select a.capability
    into v_capability
    from public.card_mutation_authorizations a
    where a.txid = txid_current() and a.card_id = old.id
    order by a.created_at desc, a.capability desc
    limit 1;
    v_authorized := v_capability is not null;
    if not v_authorized then
      if new.is_published is distinct from old.is_published then raise exception 'PUBLICATION_PAYMENT_ONLY'; end if;
      raise exception 'CARD_UPDATE_GUARDED';
    end if;
    if public.card_has_pending_replacement(old.id) then
      if not (
        (
          public.card_is_pending_replacement_target(old.id)
          and v_capability in ('save_draft', 'controlled_replacement_publish')
        )
        or (
          not public.card_is_pending_replacement_target(old.id)
          and v_capability in ('disable_card', 'controlled_replacement_retire')
        )
      ) then
        raise exception 'REPLACEMENT_PENDING' using errcode = 'restrict_violation';
      end if;
    end if;
    delete from public.card_mutation_authorizations
    where txid = txid_current() and card_id = old.id;
    return new;
  end if;
  if TG_OP = 'DELETE' then
    if public.card_is_retired(old.id) then raise exception 'RETIRED' using errcode = 'restrict_violation'; end if;
    if public.card_has_pending_replacement(old.id) then raise exception 'REPLACEMENT_PENDING' using errcode = 'restrict_violation'; end if;
    if exists (select 1 from public.orders where id = old.order_id and status = 'paid') then raise exception 'PAID_CARD_PROTECTED' using errcode = 'restrict_violation'; end if;
    if exists (select 1 from public.duitnow_transfer_submissions s where s.order_id = old.order_id) then raise exception 'IMMUTABLE_PAYMENT_AUDIT_PROTECTED' using errcode = 'restrict_violation'; end if;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists cards_payment_lifecycle on public.cards;
create trigger cards_payment_lifecycle
before insert or update or delete on public.cards
for each row execute function public.cards_payment_lifecycle_guard();

revoke all on function public.cards_payment_lifecycle_guard()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Versioned grant entry point binds the reviewed publication
-- ---------------------------------------------------------------------------

create or replace function public.create_card_replacement_grant(
  p_predecessor_card_id uuid,
  p_admin_id uuid,
  p_reason text,
  p_request_id uuid,
  p_replacement_order_id uuid,
  p_replacement_card_id uuid,
  p_slug text,
  p_replacement_draft jsonb,
  p_expected_source_publication_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_card public.cards%rowtype;
begin
  if p_expected_source_publication_id is null then
    raise exception 'PREDECESSOR_PUBLICATION_REQUIRED';
  end if;
  select order_id into v_order_id
  from public.cards
  where id = p_predecessor_card_id;
  if not found or v_order_id is null then raise exception 'CARD_NOT_FOUND'; end if;
  -- Match the established order-then-card lifecycle lock order. The original
  -- function called below runs in this same transaction and cannot observe a
  -- later publication after these locks are held.
  select * into v_order from public.orders where id = v_order_id for update;
  select * into v_card from public.cards where id = p_predecessor_card_id for update;
  if not found or v_card.order_id is distinct from v_order.id then raise exception 'CARD_NOT_FOUND'; end if;
  if v_card.current_publication_id is distinct from p_expected_source_publication_id then
    raise exception 'PREDECESSOR_PUBLICATION_CHANGED' using errcode = 'serialization_failure';
  end if;
  if not exists (
    select 1
    from public.card_publications p
    where p.id = p_expected_source_publication_id
      and p.card_id = p_predecessor_card_id
  ) then
    raise exception 'CURRENT_PUBLICATION_MISSING';
  end if;

  return public.create_card_replacement_grant(
    p_predecessor_card_id,
    p_admin_id,
    p_reason,
    p_request_id,
    p_replacement_order_id,
    p_replacement_card_id,
    p_slug,
    p_replacement_draft
  );
end;
$$;

-- The unbound 040 entry point is not a safe grant surface after this repair.
-- Keep the signature for catalog compatibility but require callers to use the
-- publication-bound overload.
revoke all on function public.create_card_replacement_grant(
  uuid, uuid, text, uuid, uuid, uuid, text, jsonb
) from public, anon, authenticated, service_role;
revoke all on function public.create_card_replacement_grant(
  uuid, uuid, text, uuid, uuid, uuid, text, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.create_card_replacement_grant(
  uuid, uuid, text, uuid, uuid, uuid, text, jsonb, uuid
) to service_role;
