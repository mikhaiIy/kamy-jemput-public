# PLAN.md — current engineering roadmap

> Engineering follow-ups on top of the implemented system. Business direction lives in `PRODUCT_PLAN.md`; current product policy in `PRODUCT.md`. Completed foundations are listed as context only — this file plans what remains.

## Implemented foundations (context)

- Section-v2 pipeline end-to-end: registry, three-pane `SectionEditor`, per-Section sub-forms and custom forms, Variant gallery with premium-tier metadata, Gaya panel (`lib/themes/presets.ts`), inline Live preview.
- Draft persistence: localStorage cache + ~1,500 ms debounced save to `cards.custom_data_draft`; pre-payment draft card creation (`createDraftCardAction`) so image upload works before checkout; webhook promotes the draft.
- Full catalogue on v2 (migration 009 ported all legacy templates); Tier-1–3 presets seeded through migrations 013–015 (Sakura/Celestial/Cinema story templates).
- Storage: private `card-assets` bucket (manually created prerequisite), with owner-only draft mutation policies from migrations 010, 016, 033–036, the scoped corrective policy in 037, and protected application rendering for customer images.
- Security hardening: migration 016 restricted direct table writes and scoped `card-assets` mutations to authenticated owners of unpublished cards.

## Remaining work

### 1. Operational launch readiness

- **Deploy outside local dev**: production Supabase project, Stripe live keys, Resend domain, `NEXT_PUBLIC_APP_URL`, webhook endpoint. Decision gate: pricing finalisation (Q3).
- **Performance indexes**: migration 004 already created the owner/order/RSVP lookup indexes (`cards.user_id`, `cards.order_id`, `orders.user_id`, `rsvp_responses.card_id`). The only remaining gap is an index on `cards.template_id`; add it when query timings under load justify it.
- **Monitoring/backup posture** for Supabase + Vercel. Decision gate: cost vs. free tier limits.

### 2. Productisation of Variants

- Resolve Q3: paid premium-variant gating (Stripe line items, editor gating UX) or keep informational markers. Blocks any "premium" messaging beyond today's labels.
- Resolve Q4 if bilingual structured text is wanted: extend `LocalisedText` (currently `string`) via an additive schema change per D12.

### 3. Catalogue maintenance loop

- New occasion presets remain config-first: seed a new template row (+ migration) using existing Sections; write code only for genuinely new Sections.
- Keep `docs/FLOW.md`'s migration inventory and `CHECKLIST.md` updated with every new migration.

## Rules

- No speculative infrastructure for deferred features (visual canvas, marketplace, schema-in-DB) without a recorded decision reversing D2/D5 where applicable.
- Every shipped item above lands with its canonical-doc updates and a `CHECKLIST.md` verification row.
