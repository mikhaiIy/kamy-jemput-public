-- Phase 1: Section-Component template system schema additions.
--
-- Adds optional v2 columns on `templates` (type/theme/sections) and adds
-- `custom_data_draft` on `cards` so per-keystroke editor state can be
-- persisted server-side once a card row exists.
--
-- Safe to re-run.

alter table public.templates
  add column if not exists type text,
  add column if not exists theme jsonb,
  add column if not exists sections jsonb;

alter table public.cards
  add column if not exists custom_data_draft jsonb;

-- Indexes for owner-scoped lookups (helps editor + dashboard queries).
create index if not exists cards_user_id_idx on public.cards(user_id);
create index if not exists cards_order_id_idx on public.cards(order_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists rsvp_card_id_idx on public.rsvp_responses(card_id);
