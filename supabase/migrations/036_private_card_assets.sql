-- Protect customer invitation images behind the application asset endpoint.
--
-- Existing published snapshots may still contain the old public-object URL.
-- The application normalizes those known-origin references at render time, so
-- this migration does not rewrite immutable card snapshots or move objects.
-- New browser uploads use only <card UUID>/<section type>/<safe filename>.

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    ]
where id = 'card-assets';

-- Remove every public/broad policy installed by migrations 010, 016, 018,
-- 033 and 034. The service-role server client is the only reader.
drop policy if exists "public buckets are visible" on storage.buckets;
drop policy if exists "card-assets authenticated bucket lookup" on storage.buckets;
drop policy if exists "card-assets public select" on storage.objects;
drop policy if exists "card-assets public insert" on storage.objects;
drop policy if exists "card-assets public update" on storage.objects;
drop policy if exists "card-assets public delete" on storage.objects;
drop policy if exists "card-assets authenticated select" on storage.objects;
drop policy if exists "card-assets authenticated insert" on storage.objects;
drop policy if exists "card-assets authenticated update" on storage.objects;
drop policy if exists "card-assets authenticated delete" on storage.objects;
drop policy if exists "card-assets owner select" on storage.objects;
drop policy if exists "card-assets owner insert" on storage.objects;
drop policy if exists "card-assets owner update" on storage.objects;
drop policy if exists "card-assets owner delete" on storage.objects;
drop policy if exists "card-assets no browser select" on storage.objects;

-- Storage needs to resolve this private bucket for an authenticated upload, but
-- no browser role receives a storage.objects SELECT policy for card-assets.
-- Keep the restrictive predicate bucket-scoped so unrelated bucket policies
-- remain effective. Uploads use upsert=false and a collision-resistant
-- filename, so an existence/read probe is not needed.
create policy "card-assets authenticated bucket lookup"
  on storage.buckets for select
  to authenticated
  using (id = 'card-assets');

create policy "card-assets no browser select"
  on storage.objects as restrictive for select
  to anon, authenticated
  using (bucket_id <> 'card-assets');

create policy "card-assets owner insert"
  on storage.objects for insert
  to authenticated
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
        and c.is_published = false
        and c.published_at is null
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );

create policy "card-assets owner update"
  on storage.objects for update
  to authenticated
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
        and c.is_published = false
        and c.published_at is null
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
        and c.is_published = false
        and c.published_at is null
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );

create policy "card-assets owner delete"
  on storage.objects for delete
  to authenticated
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
        and c.is_published = false
        and c.published_at is null
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );
