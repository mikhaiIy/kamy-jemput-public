-- RLS policies for the `card-assets` Supabase Storage bucket.
--
-- Public GETs already work because the bucket has `public = true` — the
-- Storage REST endpoint serves the file bytes directly without consulting
-- storage.objects RLS. But the *upload* path (used by the Section editor's
-- cover/photo widget) goes through storage.objects RLS and requires
-- BOTH a SELECT and an INSERT/UPDATE policy to be present:
--
--   1. SELECT — Storage's upsert flow (`upload(path, file, { upsert: true })`)
--      first checks whether the object already exists. Without a SELECT
--      policy that check returns nothing visible, and the server falls
--      through to a path that produces `new row violates row-level
--      security policy` even when the INSERT policy would allow the write.
--      This is the trap that 010 originally fell into.
--   2. INSERT / UPDATE / DELETE — the actual write. Scoped to the bucket so
--      these policies don't open every other bucket on the project.
--
-- Also need a SELECT policy on storage.buckets so the Storage server can
-- look the bucket up under the user's JWT. Otherwise the lookup returns
-- zero rows and the same RLS error is raised before we ever reach the
-- objects table.
--
-- Practical ownership is enforced one level up: the editor's cardId is
-- server-rendered behind the cards RLS policy in 002. A malicious
-- authenticated user could write into a foreign cardId folder, but they
-- can't reference that file from a card they don't own (cards.update RLS
-- blocks it), so the worst case is an orphan blob — no data leak,
-- no UX regression for the real owner. Tightening to a cards-join
-- policy is a Phase 2 hardening.
--
-- Safe to re-run.

drop policy if exists "card-assets authenticated insert" on storage.objects;
drop policy if exists "card-assets authenticated update" on storage.objects;
drop policy if exists "card-assets authenticated delete" on storage.objects;
drop policy if exists "card-assets public select" on storage.objects;
drop policy if exists "card-assets public insert" on storage.objects;
drop policy if exists "card-assets public update" on storage.objects;
drop policy if exists "card-assets public delete" on storage.objects;
drop policy if exists "public buckets are visible" on storage.buckets;

create policy "public buckets are visible"
  on storage.buckets for select
  to public
  using (public = true);

create policy "card-assets public select"
  on storage.objects for select
  to public
  using (bucket_id = 'card-assets');

create policy "card-assets public insert"
  on storage.objects for insert
  to public
  with check (bucket_id = 'card-assets');

create policy "card-assets public update"
  on storage.objects for update
  to public
  using (bucket_id = 'card-assets')
  with check (bucket_id = 'card-assets');

create policy "card-assets public delete"
  on storage.objects for delete
  to public
  using (bucket_id = 'card-assets');
