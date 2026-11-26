-- Account-level completion marker for the Section editor's Malay desktop
-- tour (components/SectionEditorTour.tsx).
--
-- NULL   = the account has never finished or dismissed the tour; the editor
--          launches it automatically on the next visit.
-- value  = the account finished or dismissed the tour; only the persistent
--          Help control in the editor top bar replays it.
--
-- This column is the tour's only persisted state. The tour never writes card
-- data: cards.custom_data and cards.custom_data_draft are untouched by every
-- tour interaction. Clients cannot write it directly (migration 016 revoked
-- client UPDATE on public.users); the trusted service-role server action in
-- app/actions/editor-help.ts is the sole write surface, scoped to the
-- authenticated caller's own row.
alter table public.users
  add column if not exists section_editor_tour_completed_at timestamptz;
