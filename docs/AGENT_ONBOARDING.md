# AGENT_ONBOARDING.md

> First read for any human contributor or coding agent. Assumes only that you can read Markdown and the project source. Agent-agnostic by design (D7).

## The 60-second version

`kamy-jemput` is a digital invitation card platform for Malaysian users: Next.js 16 App Router + Supabase + Stripe + Resend. Customers browse Template showcase cards, customise a card through Section-stack editing with an inline Live preview, pay via Stripe Checkout or manual QR, review the private paid draft, explicitly publish it, and share the published `/i/[slug]` URL that guests RSVP to.

Manual payment review and invitation editing are separate flows: the owner may
continue editing the unpublished invitation and its images before and during
submitted, insufficient or same-method top-up review, and after payment until
first publication. Receipt versions, payment-time snapshots, private evidence,
review decisions and audit records remain immutable.

Every active template is **Section-v2**: a template preset is `{ type, theme, sections }`, and a card is a customer-edited copy of that preset stored as JSONB (`cards.custom_data_draft` while editing, `cards.custom_data` once published). Legacy hand-coded template components survive only to render historical stored payloads and as preview fallbacks.

## Request flow in one screen

```
/templates ──pick──> /dashboard/cards/new?template=<id>
  createDraftCardAction(): pending order + unpublished card seeded from the preset
       │
       v
/dashboard/cards/[id]/edit   (SectionEditor: list / sub-form / Live preview)
  localStorage cache + ~1.5 s debounced PATCH -> cards.custom_data_draft
       │
Payment confirmation ──> private paid draft ──owner acknowledgement──>
POST /api/cards/[id]/publish ──> immutable Published snapshot
       │
/i/[slug]  guests view + POST /api/rsvp/[cardId]
```

## Reading order

1. `docs/FLOW.md` — authoritative service connectivity, importers, routes, migrations.
2. `docs/ARCHITECTURE.md` — implemented Section-v2 model and rendering contexts.
3. `docs/PRODUCT.md` — current product capabilities and boundaries.
4. `docs/PLAN.md` — current engineering roadmap; `CHECKLIST.md` — verification state.
5. `docs/DECISIONS.md` before reversing any recorded choice; `OPEN_QUESTIONS.md` for unresolved human calls.
6. `docs/GLOSSARY.md` for canonical UI terms; `docs/ui-glossary/index.html` for the visual glossary.

## Ground rules

- **Code is ground truth.** Docs describe the repository; when they disagree with code, fix the docs or the code deliberately — never let them drift silently.
- **Update canonical docs with behaviour changes.** Connectivity/routes/env/import changes → `FLOW.md`. Card model → `ARCHITECTURE.md`. Lasting choices → `DECISIONS.md` entry; open human calls → `OPEN_QUESTIONS.md`.
- **Use the right Supabase client** (`client.ts` browser, `server.ts` RLS-aware server, `admin.ts` trusted system operations after explicit checks) and keep auth/ownership checks next to writes.
- **Section module convention:** each Section lives in `components/sections/<name>/index.tsx` (+ schema, variants, custom form where needed) registered in `lib/sections/registry.ts`.
- **Publication boundary:** published card snapshots are frozen; do not mutate them from editor work.
- **Visual glossary boundary:** this documentation set does not redesign the visual glossary. If UI terms change, update `docs/ui-glossary/data/` and run `node docs/ui-glossary/validate.mjs`.

## Where to record things

| You… | Record in |
|---|---|
| Changed services, routes, env, data flow | `docs/FLOW.md` |
| Changed the card/architecture model | `docs/ARCHITECTURE.md` |
| Made a lasting decision | new `D<N>` in `docs/DECISIONS.md` |
| Hit an unresolved human choice | `docs/OPEN_QUESTIONS.md` |
| Ran verification / found known gaps | `docs/CHECKLIST.md` |
| Planned follow-up engineering work | `docs/PLAN.md` |

## Document tree

```
docs/
├── AGENT_ONBOARDING.md   ← entry point (this file)
├── AGENT_WORKFLOW.md     ← concurrent branch/worktree protocol
├── ARCHITECTURE.md       ← implemented Section-v2 model
├── CHECKLIST.md          ← current verification + known limitations
├── DECISIONS.md          ← approved decisions D1–…
├── DEV_SETUP.md          ← executable local setup + manual flow test
├── FLOW.md               ← source of truth for connectivity/data flow
├── GLOSSARY.md           ← canonical UI terms (generated sections)
├── OPEN_QUESTIONS.md     ← unresolved questions needing humans
├── PLAN.md               ← current engineering roadmap
├── PRODUCT.md            ← current product capabilities/boundaries
├── PRODUCT_PLAN.md       ← high-level business direction
├── TEMPLATE_GAYA.md / TEMPLATE_TAXONOMY.md / RSVP_VARIANTS.md  ← design research records
├── diagrams/             ← diagram index
└── ui-glossary/          ← visual glossary sources + generated output
```
