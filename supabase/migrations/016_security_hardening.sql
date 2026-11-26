-- Harden direct database and card-assets access.
--
-- User profile updates are limited to non-privileged fields, preventing role
-- escalation. Lifecycle-sensitive table writes remain available only to the
-- trusted service-role server paths. Public card assets remain readable, while
-- authenticated owners may mutate images only for their unpublished cards.

-- Prevent clients from creating/deleting profiles or changing privileged and
-- identity fields. The existing owner-update RLS policy remains an additional
-- row-level boundary for the allowed profile fields.
revoke insert, delete on public.users from anon, authenticated;
revoke update on public.users from anon, authenticated;
grant update(name, phone) on public.users to authenticated;

-- Remove permissive write policies before revoking direct client PostgREST
-- writes. Trusted server code uses the explicitly granted service_role ACLs
-- below together with that role's RLS bypass.
drop policy if exists "owners can update own cards" on public.cards;
drop policy if exists "users can insert own orders" on public.orders;
drop policy if exists "anyone can submit rsvp" on public.rsvp_responses;
drop policy if exists "anyone can submit custom orders" on public.custom_orders;

revoke insert, update, delete on public.cards from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.rsvp_responses from anon, authenticated;
revoke insert, update, delete on public.custom_orders from anon, authenticated;
revoke insert, update, delete on public.templates from anon, authenticated;

-- Table ACLs enable the existing read surface; RLS continues to determine
-- which rows each client can see. Anonymous users need the users ACL so the
-- admin-policy subqueries on templates and cards can evaluate false rather
-- than fail; users RLS still exposes no rows to them. The authenticated cards
-- read is also needed by the card-assets policies below to verify ownership
-- under the uploader's database role.
grant select on public.users, public.templates, public.cards to anon;
grant select on
  public.users,
  public.templates,
  public.orders,
  public.cards,
  public.rsvp_responses,
  public.custom_orders
  to authenticated;

-- BYPASSRLS does not bypass table ACLs. Restore only the affected public-table
-- DML and reads required by trusted service-role server paths.
grant select, insert, update, delete on
  public.users,
  public.cards,
  public.orders,
  public.rsvp_responses,
  public.custom_orders,
  public.templates
  to service_role;

-- Preserve public reads, but replace every known broad card-assets write policy
-- with authenticated, owner-scoped policies.
drop policy if exists "card-assets public insert" on storage.objects;
drop policy if exists "card-assets public update" on storage.objects;
drop policy if exists "card-assets public delete" on storage.objects;
drop policy if exists "card-assets authenticated insert" on storage.objects;
drop policy if exists "card-assets authenticated update" on storage.objects;
drop policy if exists "card-assets authenticated delete" on storage.objects;

create policy "card-assets owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
    )
  );

create policy "card-assets owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-assets'
    and exists (
      select 1
      from public.cards
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
    )
  )
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
    )
  );

create policy "card-assets owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-assets'
    and exists (
      select 1
      from public.cards
      where cards.id::text = (storage.foldername(name))[1]
        and cards.user_id = (select auth.uid())
        and cards.is_published = false
    )
  );

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    ]
where id = 'card-assets';
