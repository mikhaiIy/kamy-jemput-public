-- Correct already-applied 036 installations whose restrictive SELECT policy
-- used an unqualified false predicate. Keep the correction limited to the
-- card-assets policy: unrelated buckets retain their own SELECT/list rules.
-- This is idempotent and does not create, delete, or make any bucket public.

drop policy if exists "card-assets no browser select" on storage.objects;

create policy "card-assets no browser select"
  on storage.objects as restrictive for select
  to anon, authenticated
  using (bucket_id <> 'card-assets');
