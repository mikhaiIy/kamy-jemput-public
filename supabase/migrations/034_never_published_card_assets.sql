-- Keep card-assets writable only for a never-published editable draft.
--
-- Migration 033 correctly added the paid-draft entitlement to the existing
-- owner policies, but `is_published = false` is not an historical boundary:
-- administrator disable intentionally flips that flag back to false while
-- retaining the first-publication snapshot and `published_at`. A published
-- card must therefore remain immutable even while it is unavailable.
--
-- This migration is limited to Storage policy predicates. The card and
-- payment-review immutability triggers remain unchanged.

drop policy if exists "card-assets owner insert" on storage.objects;
drop policy if exists "card-assets owner update" on storage.objects;
drop policy if exists "card-assets owner delete" on storage.objects;

create policy "card-assets owner insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
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
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = (select auth.uid())
        and c.is_published = false
        and c.published_at is null
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  )
  with check (
    bucket_id = 'card-assets'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
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
    and exists (
      select 1
      from public.cards c
      join public.orders o on o.id = c.order_id
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = (select auth.uid())
        and c.is_published = false
        and c.published_at is null
        and (o.status <> 'paid' or o.manual_paid_draft is true)
    )
  );
