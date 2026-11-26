# DECISIONS.md — `kamy-jemput/docs/`

> Decisions made during the Section-Component architecture brainstorm. Each entry: the decision, the rationale, the alternatives considered, and the date. Future agents: if you're considering reversing one of these, **read the rationale first** and discuss with the user.

---

## D1 — Section is the atomic unit, not Template

**Date:** 2026-05-30
**Status:** Decided by user

**Decision:** Templates are presets of Sections + theme. A Section (Landing, Event Info, RSVP, Map, etc.) is the smallest reusable unit. Adding a new template type means picking a Section list + theme, not writing a new React component tree.

**Rationale:**
- Today's pattern (one React file per template, with ad-hoc fields) duplicates UX work N times (live preview, validation, image upload, draft save).
- A Section-first model collapses N hand-coded templates into a registry of ~15 reusable parts. The Malaysian event taxonomy (~25 types across Tiers 1–4) is then config, not code.
- The user explicitly wants "consistent components throughout all designs" and editable parts that "are consistent in terms of the coding."
- The customisation form (Phase 1) maps 1:1 with Sections — per-Section sub-form + live preview. The model and the UX are isomorphic.

**Alternatives considered:**
- *Template-first with shared utility components.* Today's model, just with more shared helpers. Doesn't solve the "new template = new file" problem. Rejected.
- *Block-based (Notion-style).* Too granular for short-form invitation cards; introduces an editor abstraction that's harder to constrain. Rejected — Section granularity matches how customers think about invitation cards.

**Implications:**
- `lib/types.ts` `CardData` shape changes (see `ARCHITECTURE.md` §3).
- Each Section is a folder under `components/sections/` with schema + variants + label + appliesTo.
- The customisation form is generated from Section schemas, not hand-built per template.

---

## D2 — Section schemas live in TypeScript code, not the database

**Date:** 2026-05-30
**Status:** Decided by agent (low-risk default; revisit at Phase 5)

**Decision:** Each Section module exports a zod schema. The DB stores instance data only (in `cards.custom_data` JSONB). Adding or modifying a Section requires a code deploy.

**Rationale:**
- Schema-in-DB requires building a schema editor, a runtime form generator that handles arbitrary field types, and a migration story for in-progress drafts when schemas change. All Phase 5+ work.
- Code-first gives compile-time field-name safety + zod runtime validation for the form and the public render.
- Customers don't see "schema" — they see Sections and Variants. The schema is dev-facing only.
- A new Section type added by an agent is a single PR: create the folder, register it, ship. Faster than any DB-schema-editor workflow we could build.

**Alternatives considered:**
- *Schema in DB from day one.* See `OPEN_QUESTIONS.md` Q1 for the long-term path. Rejected for Phase 1–4 on complexity grounds.
- *Hybrid: core schemas in code, customer-defined extension fields in DB.* Possible Phase 4–5 extension; deferred.

**Implications:**
- The Section catalogue is gated by deploys. If non-devs need to add Sections, that's a future unlock (see `OPEN_QUESTIONS.md` Q1).
- Schema versioning is implicit in the code's git history. Compatibility of stored shapes is governed by D12.

---

## D3 — `cards.custom_data` stays JSONB; no relational explosion

**Date:** 2026-05-30
**Status:** Decided by agent

**Decision:** Section instances are stored inside the existing `cards.custom_data` JSONB column. No separate `card_sections` relational table.

**Rationale:**
- The Section list per card is small (5–20 entries) and only accessed by `card_id`. There's no query pattern that requires JOIN-ability across cards.
- Keeping it in JSONB means Phase 1 ships **without a relational schema change** — just the column shape changes. Stripe webhook, RSVP API, and the slug URL all keep reading the same column.
- Adding a `theme` JSONB column to `templates` and a `custom_data_draft` JSONB to `cards` is the only Phase 1 migration.

**Alternatives considered:**
- *Separate `card_sections` table.* Cleaner relationally; lets you query "all cards using `wishlist` Section." Useful for analytics, not for the customer flow. Defer until that query becomes a need.
- *Postgres `jsonb_path_ops` index on `custom_data`.* Premature optimisation — add when query patterns appear.

**Implications:**
- RLS still operates on the `cards` row, so per-customer isolation is unchanged.
- A schema validation hook on write (e.g. in a Phase 2 RPC) would protect against malformed Section instances; for Phase 1, trust the customisation form's zod validation.

---

## D4 — Cross-cutting visual axes (background, font, animation) are Theme, not Sections

**Date:** 2026-05-30
**Status:** Decided by agent

**Decision:** The user's listed "Background", "Font", "Animation" components are modelled as `Theme` properties applied globally to a card — not as individual Section components.

**Rationale:**
- They have no spatial position on the card (unlike Landing, RSVP, etc.). A Section has render order; theme axes don't.
- If they were Sections, every other Section would have to opt-in to receiving them as props. Treating them as `<ThemeProvider>` context is cleaner.
- It keeps the Section catalogue focused on **structural pieces of the card**, not **stylistic settings**.

**Alternatives considered:**
- *Treat each as a hidden "configuration Section" without render output.* Adds noise to the sidebar and the matrix. Rejected.

**Implications:**
- The customisation form has a separate "Theme" tab/section above the per-Section list — a small subset of controls (palette swatch picker, font set, animation toggle).
- Theme overrides at the Section level (e.g. one Section using a different palette) are NOT supported in Phase 1–2. If demand surfaces, add per-Section theme override later.

---

## D5 — Pragmatic phased rollout; do not pre-build for hypothetical phases

**Date:** 2026-05-30
**Status:** Decided by user

**Decision:** Ship Phase 1 with the minimum viable Section set and one real template (`wedding_malay`). Variant picking, Section reordering, and the broader catalogue are explicitly Phase 2+. Do not add infrastructure for Phase 5 features (visual editor, marketplace, schema-in-DB) before there's evidence of demand.

**Rationale:**
- The user explicitly chose "step by step, phases kind of product development" over "complete product fast but not scalable or much more complex than needed."
- Each phase needs to produce real orders before the next one starts; that's the feedback loop that prevents building the wrong abstraction.
- Section + theme is the load-bearing abstraction; variants and reorder are valuable but cheap to add later without architecture change.

**Alternatives considered:**
- *Build the variant picker, drag reorder, and 8 templates all in Phase 1.* Risks scope blow-out, delays first-real-order signal. Rejected.
- *Skip Phase 1 entirely and refactor only when adding Tier 2 types.* Loses the customisation UX wins (live preview, per-Section sub-form, draft save) that are needed right now to fix today's pain points. Rejected.

**Implications:**
- The user's customisation UX feedback (live preview broken, upload hidden, errors at top) is addressed in Phase 1 — not as a separate "UX fix" PR but as the natural shape of the new sub-form architecture.
- The hard cap on Phase 1 Section count (11) is in `PLAN.md`. Resist scope creep.

---

## D6 — Legacy templates keep running side-by-side until explicitly ported

**Date:** 2026-05-30
**Status:** Decided by agent

**Decision:** During Phase 1, the new Section-Component pipeline runs alongside the existing 5 hand-coded templates. `<InvitationCard>` falls through to the legacy renderer for cards whose `custom_data` lacks a `sections` array. Phase 2 ports the legacy templates to v2 presets.

**Rationale:**
- Published cards (paid orders) must keep rendering exactly as the customer expected. Any other behaviour breaks trust.
- A parallel rollout lets us prove the new pipeline on `wedding_malay` v2 before touching the legacy stuff.
- The cost is a single fallback branch in `<InvitationCard>` — tiny.

**Alternatives considered:**
- *Big-bang port all 5 templates as Section presets in Phase 1.* Risks Phase 1 stalling on edge cases in the legacy templates. Rejected.
- *Branch the entire app and run two deploys.* Overkill. Rejected.

**Implications:**
- `<InvitationCard>` has a v1/v2 branch for one or two phases. Document the branch; remove it cleanly when legacy templates are fully ported.
- The customisation form for legacy templates (`/dashboard/cards/new`) is unchanged until Phase 2 cutover.

---

## D7 — Docs are agent-agnostic and stored under `docs/`

**Date:** 2026-05-30
**Status:** Decided by user

**Decision:** All architecture/brainstorm docs live under `docs/` at the project root, in plain Markdown. They are written for **any LLM coding agent or human reader**, not Claude-specifically.

**Rationale:**
- The team uses (and plans to use) multiple coding agents; docs that assume a specific agent's instruction conventions don't travel.
- Plain Markdown reads the same in any tool; no agent-specific tags or magic comments.
- `docs/` is the standard convention; root `AGENTS.md` / `CLAUDE.md` stay only as agent-loader shims, while durable docs live under `docs/`.

**Alternatives considered:**
- *Folder named `brainstorm/` or `design/`.* `docs/` is more future-proof as content grows beyond pure brainstorm. Picked `docs/`.
- *Mix Claude-specific instructions in.* Rejected — locks docs to one agent.

**Implications:**
- Root `AGENTS.md` and `CLAUDE.md` continue to serve their tool-specific loader roles. `docs/` is the main source of truth for project docs, including service flow, product plan, setup, agent workflow, design, and progress tracking.
- Diagrams live in `docs/diagrams/` as `.excalidraw` files.

---

## D8 — No emojis in code, dashboards, or docs

**Date:** 2026-05-30
**Status:** Superseded by D11

**Decision:** Plain Markdown only. No emojis unless the user explicitly asks for them in a specific user-facing string.

**Rationale:**
- Consistency with existing project convention.
- Emojis render inconsistently across terminals, IDEs, and embedded views.

---

## D9 — The customisation form is per-Section sub-forms with a live preview on the right

**Date:** 2026-05-30
**Status:** Decided by user (driven by current UX pain)

**Decision:** Replace the single-page customisation form with a three-pane layout: Section list sidebar (left), active Section sub-form (centre), live preview iframe / inline render (right). Per-Section sub-form drives all editing; preview updates per keystroke; draft auto-saves.

**Rationale:**
- The user's direct feedback on the current `/dashboard/cards/new`: live preview ("Pratonton template") doesn't update; image upload button isn't visible; "Template not found" error at the top requires scrolling. All three are symptoms of one big form trying to do too much.
- A per-Section sub-form is naturally aligned with the Section-Component model — same Section, same form, same data.
- Live preview becomes feasible because the in-memory draft state is shared between the form and the preview renderer.
- Errors get scoped to a Section, surfaced inline + as a sidebar badge, so no scrolling is needed to find them.

**Alternatives considered:**
- *Fix the current form in place without restructuring.* Patches symptoms; doesn't unlock the catalogue scale-out. Rejected.
- *Drag-and-drop visual editor.* Phase 5 conjecture. Rejected for now (D5 pragmatic rollout rule).

**Implications:**
- The bug fixes the user listed land as a byproduct of Phase 1, not as a separate PR.
- The draft save model needs decided — see `OPEN_QUESTIONS.md` Q5.

---

## D10 — Phase 1 defaults selected from the open questions

**Date:** 2026-05-30
**Status:** Decided by agent as pragmatic Phase 1 defaults; revisit with user if scope changes

**Decision:** Use these defaults to unblock Phase 1 implementation:

| Question | Decision |
|---|---|
| Section schemas | Keep schemas code-first in TypeScript; DB stores Section instance data only. |
| Rollout | Run legacy templates and the new Section pipeline side-by-side. |
| Pricing | Keep template-level pricing through Phase 3; defer premium variant pricing to Phase 4. |
| Text fields | Keep Phase 1 UI simple, but make Section text helpers compatible with future localised text. |
| Drafts | Use browser localStorage for fast draft state; use `cards.custom_data_draft` for DB-backed edit drafts. |
| Schema evolution | Maintain backward-compatible Section schemas by default; add explicit migrations only when a breaking change is unavoidable. |
| Custom work | Use a tiered custom-work model: catalogue, styled bespoke, full bespoke. |

**Rationale:** These calls keep Phase 1 small enough to ship while preserving the migration path described in `PLAN.md` and `ARCHITECTURE.md`.

**Implications:** Do not add schema-in-DB, line-item premium pricing, a visual editor, or a full custom-order queue during Phase 1. Track actual implementation progress in `CHECKLIST.md`.

---

## D11 — Keep agent docs plain; allow intentional customer-facing symbols

**Date:** 2026-05-30
**Status:** Decided by agent as consistency cleanup

**Decision:** Agent-facing docs should stay plain and easy to diff. Customer-facing invitation templates, public marketing copy, dashboard states, and card previews may use culturally or visually intentional symbols/emoji when they are part of the design.

**Rationale:**
- The current product already uses symbols and emoji in template previews, card UI, and status screens. A blanket ban conflicts with the product's invitation-card surface.
- Agent docs benefit from plain text because they are copied across tools, terminals, and reviews.
- The important long-term rule is not "never use emoji"; it is "do not use decorative symbols as a substitute for clear UI, state, or copy."

**Implications:** Remove decorative emoji from agent docs when touching them. Do not block customer-facing product or card design work solely because a visual symbol is appropriate there.

---

## D12 — Section data compatibility: readers accept prior stored shapes; breaking changes need approved migrations

**Date:** 2026-05-30
**Status:** Decided by user (approved compatibility and migration rule)

**Decision:** Stored `SectionInstance.data` must remain readable under later Section schemas by default. Section schema evolution should be additive and backward-compatible: new optional fields, never removed or reinterpreted required fields. When a breaking schema change is unavoidable, it requires an explicit, separately approved migration — stored JSONB is never silently reinterpreted or backfilled. This decision is documentation/policy only; it does not authorize implementation, TypeScript changes, SQL migrations, or data backfills. It records the existing default from D10 as an explicit, user-approved rule.

**Rationale:**
- `SectionInstance.data` persists in `cards.custom_data` and `cards.custom_data_draft` long after a card is created; published cards render from this JSONB, so silent reinterpretation would corrupt live invitations.
- Additive evolution keeps template presets, in-progress drafts, and published snapshots readable across deploys without coordination.
- Requiring human approval for migrations keeps destructive data operations deliberate rather than emergent from code changes.

**Alternatives considered:**
- *Automatic backfill of stored JSONB on deploy.* Rejected: silently rewriting customer data is high-risk and was explicitly ruled out by the user.
- *Version-stamped per-instance schemas with multi-version readers.* Deferred; not part of this decision and needs separate approval if pursued.

**Implications:** Section authors must treat additive-only change as the default contract. Any breaking change to a Section schema must surface as a proposal for an explicit migration before deployment.

---

## D13 — Implementation status: Section-v2 shipped; rollout-specific limits superseded

**Date:** 2026-06-01
**Status:** Decided by agent as an implementation-status record

**Decision:** The Section-v2 system described by D1–D4, D9, and D12 is implemented across the full catalogue. This record supersedes only the *rollout-specific* implications of D5, D6, D9, and D10 — namely the one-template Phase-1 scope, the side-by-side legacy rollout, the "variants/reorder are later" caveat, and the localStorage-only pre-payment draft limitation. Implemented today: every active template is Section-v2 (migration 009); Variant gallery with premium-tier metadata, Section reorder/toggle/add, and per-Section custom forms; Gaya panel with curated presets (`lib/themes/presets.ts`); inline Live preview reading editor state; draft persistence via localStorage cache plus debounced writes to `cards.custom_data_draft`, with a pending order **and** unpublished card created up-front (`createDraftCardAction`) so image upload works before checkout; payment completion opens a private paid draft and the owner publication action later promotes the latest saved draft to the published snapshot. Legacy renderers remain only for historical stored payloads and eligible legacy preview fallbacks.

D22 supersedes only this paragraph's older Stripe publication behavior: the current
payment flow opens a private paid draft, and the owner publication action later
promotes the latest saved draft.

**Rationale:** Records what actually shipped so D5/D6/D9/D10 are not misread as describing current constraints. No past entry is rewritten.

**Alternatives considered:** Editing D5/D6/D9/D10 in place. Rejected — history stays intact per this file's convention.

**Implications:** New work plans against the current architecture (`ARCHITECTURE.md`, `FLOW.md`), not against phase rollouts. Legacy-renderer support is a compatibility surface only.

---

## D14 — Invitation content languages: plain strings, manual bilingual copy

**Date:** 2026-08-25
**Status:** Decided by user (approved language model)

**Decision:** Stored invitation content remains plain strings — `LocalisedText` stays `type LocalisedText = string`. Hosts write bilingual copy (e.g. Malay and English) manually into single free-text fields; there are no language maps or per-language slots. Editor inputs are plain single text fields per copy slot in the Section sub-forms — no language tabs, no locale pickers. Rendering shows stored copy verbatim in both the Live preview and the published card at `/i/<slug>`: guests see exactly the languages the host typed, with no language switcher or multi-language rendering engine. If structured multi-language fields are adopted later, the change must be additive under D12 — existing stored single strings must remain valid input to whatever shape is chosen.

**Rationale:**
- Malaysian hosts routinely mix languages inside one field anyway, so a single free-text field matches real usage.
- Structured `{ primary, secondary }` shapes add editor complexity and migration risk with no demonstrated customer demand (`PRODUCT_PLAN.md` policy: revisit multi-language structured text only with demonstrated customer need).
- Verbatim rendering keeps published snapshots stable and avoids a whole class of rendering-engine complexity.

**Alternatives considered:**
- *Structured `{ primary, secondary? }` union.* Rejected for now; deferred until customer need is demonstrated. `OPEN_QUESTIONS.md` Q4 stays open for that future question — this entry records today's approved model.
- *Full language maps / i18n engine.* Rejected as over-engineering for invitation copy.

**Implications:** Section authors keep single-string text fields. Any future structured-text work must propose an additive schema evolution plus an approved migration under D12 before shipping.

---

## D15 — Custom card theme preset: the Gaya panel permits no custom controls

**Date:** 2026-08-25
**Status:** Decided by agent (records the existing documented contract)

**Decision:** The Gaya panel offers curated selection only — it permits no
custom controls. Customers cannot supply arbitrary palettes, fonts,
backgrounds, animations, or CSS, and there is no "Custom" Gaya entry. The only
approved colour controls are the 14 curated Gaya presets in
`lib/themes/presets.ts` (`songket_emerald`, `royal_maroon`, `amber_classic`,
`crimson_lacquer`, `imperial_gold`, `marigold_saffron`, `sakura_blush`,
`midnight_celestial`, `editorial_cinema`, `blush_romance`, `garden_sage`,
`confetti_bright`, `boardroom_ink`, `minimal_mono`); every preset is selectable
on every template. The only approved font controls are the faces Gaya
presets apply via the font map in `lib/themes/presets.ts`: Playfair Display,
Cormorant, Great Vibes, Cinzel, Fraunces, Dancing Script, and Bodoni Moda for
display/script slots, with Plus Jakarta Sans for body throughout. (This list was
corrected against `lib/themes/presets.ts`.) Caveat and Amatic SC (handwriting
faces on doodle Section variants) and Geist Mono (fixed monospace treatments
inside Section code) are registered globally in `app/layout.tsx` but no Gaya
preset owns them; they are Section-level styling, not Gaya panel font controls. A "Custom" Gaya exposing raw palette/font controls remains an open
follow-up (`TEMPLATE_GAYA.md` §9) and requires separate human approval before
any implementation.

**Rationale:** Curation keeps cards cohesive, protects the code-owned design
baselines (six legacy palettes, `DEFAULT_THEME`, preset literals), and avoids a
raw site-theme/arbitrary-colour surface. The constraint was already stated in
`TEMPLATE_GAYA.md` §§Control hierarchy and §8; this records it as a numbered
decision so future agents do not treat it as incidental.

**Alternatives considered:**
- *"Custom" Gaya with raw palette/font controls.* Rejected for now — out of
  the feature's current contract; revisit only with explicit user approval.
- Free-form CSS/background/keyframe input. Rejected — same reasoning;
  backgrounds/animations come only from preset payloads via `applyPreset()`.

**Implications:** Any request to add raw custom controls, a "Custom" Gaya, or
customer-supplied fonts/backgrounds must first reverse or supersede this
decision with human sign-off. Adding a *new curated preset* stays allowed under
`TEMPLATE_GAYA.md` §6 and is unaffected by this ruling.

---

## D20 — Stripe-to-DuitNow handoff requires Stripe-confirmed Session expiry

**Date:** 2026-08-27
**Status:** Decided by agent (implements the approved payment-recovery scope)

**Decision:** A customer cannot submit a DuitNow reference while an order carries any Stripe Checkout reservation or persisted Session binding, and Stripe reservation/session attachment cannot proceed while any DuitNow submission is unreviewed. The owner-authorized status route retrieves the exact bound Session from Stripe, expires it only if Stripe reports it open, and releases only that exact token/session reservation after Stripe reports it expired. Unknown, unbound, complete, or unreachable Stripe state blocks the manual handoff. The database submission RPC repeats the reservation/binding guard under its order lock. A DuitNow winner clears all Checkout guard fields; a Stripe winner retains its Session identity for signed webhook idempotency.

**Rationale:** A local timestamp cannot prove that Stripe will reject a later card payment. Requiring Stripe's status plus an exact durable release closes the window where a customer submits DuitNow and an older Checkout URL can still charge. The locked database guard closes races between the HTTP reconciliation and manual submission, while first-payment-wins remains the final publication rule for already-valid completion races.

**Alternatives considered:**
- *Infer expiry from `stripe_session_expires_at` or reservation age.* Rejected — local state cannot prove Stripe has stopped accepting payment.
- *Clear an unbound reservation after a timeout.* Rejected — it may represent an ambiguous Stripe create response.
- *Remove Stripe when manual transfer is available.* Rejected — Stripe remains a supported method.

**Implications:** Rejected DuitNow retry is a new immutable submission after its review; client polling must not restore the historical rejection while the customer is choosing that replacement. A rejected review makes Stripe eligible again only when no manual amount is confirmed (issue #69); an unreviewed record blocks it so manual confirmation cannot clear a later live Stripe Session. This adds no slots, automated reconciliation, refunds or settlement tooling. Receipt evidence is subsequently added by issue #69 below.

---

## D18 — DuitNow purchase flow: two fixed slots, immutable snapshots, manual review, first-payment-wins

**Date:** 2026-08-26
**Status:** Decided by user (approved scope for issue #60)

**Original issue #60 decision (receipt rules amended by issues #69 and #70 below):** DuitNow is an optional purchase method alongside Stripe Checkout, implemented as manual transfer against exactly two administrator-managed slots (`duitnow_payment_slots`, slot numbers 1 and 2 only — no add/delete lifecycle, no more than two slots). A customer transfer submission is never payment confirmation: it atomically freezes the displayed slot configuration, order amount in sen, transfer reference, and the exact saved draft (`cards.custom_data_draft`) into an append-only immutable submission. An administrator then manually records the review outcome. Payment completion for Stripe and manual methods follows the shared paid-draft boundary in D21 and D22: it opens an unpublished paid draft; the owner publishes later. Slots start disabled until an admin supplies fully configured recipient/QR details; customers can select only enabled, fully configured slots, and always see their submission's frozen snapshot rather than live slot data.

**Rationale:** Manual Malaysian bank transfers need human verification, so automation would be false advertising; freezing the fulfillment snapshot at submission time guarantees the published card equals what the customer saw and paid for even if slots or drafts change later; immutability plus a single atomic completion makes duplicate events, duplicate reviews, and Stripe-vs-DuitNow races deterministic instead of last-write-wins.

**Alternatives considered:**
- *Automated reconciliation of incoming transfers.* Rejected — explicitly out of scope; review stays manual.
- *More than two slots / dynamic slot CRUD.* Rejected — fixed capacity keeps operations auditable and simple.
- *Reference-only proof.* Superseded by issue #69: a private receipt is required; the reference is optional.
- *Refunds, chargebacks, and settlement reconciliation tooling.* Rejected — out of scope for this decision.

**Implications:** Direct publication is rejected. Payment completion and recorded administrator availability actions use guarded database functions; payment completion never publishes or sends a publication email. The legacy Stripe payment-recording wrapper also delegates to `complete_order_payment`, so it cannot mark an order paid without the same atomic payment and winner metadata. Slot configuration is written only through the owned `SECURITY DEFINER` `admin_update_duitnow_slot` RPC: migration 024 revokes direct service-role slot DML and retains only reads plus guarded RPC execution, so every change advances the version and appends history. Migration 025 requires the Server Action to pass the signed-in administrator ID, revalidates that role in both administrative RPCs, and persists it in immutable slot/review audit records. This boundary is enforced by PostgreSQL ACLs, not a caller-set session/GUC bypass. The transfer reference is trimmed and must be 3–64 printable permitted characters beginning alphanumerically, enforced by both submission RPC and table CHECK. The live `cards.custom_data_draft` remains owner-editable while a submission awaits review; migration 035 replaces only the historical card-trigger draft locks. Migration 026 preserves immutable evidence: after any submission, `IMMUTABLE_PAYMENT_AUDIT_PROTECTED` prevents deletion of its order and fulfillment card, including after rejection. The admin queue keeps every unreviewed submission, including one that lost to a Stripe completion; it exhaustively walks descending `(created_at, id)` keyset pages beyond Supabase's 1,000-row cap, so rows already in the ordered scan are visited once and newer records appear on refresh. Its later review is immutable but cannot change the winner. Paid cards cannot be deleted. The checkout success view adopts the winning method and completion time from status polling. Any future payment method must join `complete_order_payment` to preserve first-payment-wins. Raising the slot cap requires a new migration and a new decision.

**Issue #69 amendment (approved 2026-08-31):** Bank DuitNow retains exactly two slots. Touch ’n Go is a separate manual method with its own configuration. Each payment attempt requires a private PDF, JPEG, PNG or WebP receipt of 5 MB or less; validate content bytes, size and ownership. References are optional (the existing format applies when supplied). A receipt version belongs to one attempt. Customers can replace an incorrect current receipt before confirmation; rejected receipts must already have an administrator reason. Only the latest attempt's current receipt is customer-accessible. Administrators retain access to prior versions.

A manual payment attempt is one transfer, potentially evidenced by several receipt versions. A confirmed partial attempt cannot be replaced: the remaining amount needs a new attempt and receipt through the same manual method. Immutable reviews record received sen; the total determines full payment, capped at the stored order price for entitlement purposes. The first sufficient total marks the order paid and opens exactly one editable paid draft; it does not publish or send a publication confirmation. Excess and later duplicate payments require manual support. Stripe fallback is allowed after rejection only when no manual amount has been confirmed; Stripe never collects a partial manual balance.

Receipt content and prior files are retained indefinitely in this release, outside D18. There is no customer deletion action. Authorized administrators can quarantine or remove content for harmful-file, legal or operational reasons. Access is revoked before removal; retries resume interrupted deletion. Immutable D18 metadata retains object reference, hash, size/type, version, order, attempt, method, outcome, received amounts, reason, actor and timestamps after removal. Quarantine/removal applies to current, prior and reviewed receipts. Database transactions serialize replacement, review and file actions on the order; stable upload IDs and unique reviews/tombstones prevent duplicate audit entries. Existing reference-only records remain historical and reviewable, but the legacy submission RPC is revoked for new submissions.

## D21 — Manual payment review opens one paid draft

**Date:** 2026-09-05
**Status:** Decided by user (approved revision 5 for issue #70)

**Decision:** The durable manual method IDs remain `duitnow` and `tng` for compatibility, labelled to customers and administrators as Bank DuitNow and Touch ’n Go. Manual review is one newest-first queue with five outcomes: pending, insufficient, rejected, confirmed and duplicate. The administrator detail surface must show the stored order price, current private receipt, optional customer reference, received/credited/remaining/excess RM, and available payment evidence before a decision. Confirmed records the verified amount; Rejected requires a reason; Insufficient requires a reason, a server-calculated remaining amount and a separate private evidence file; Duplicate records later payment after the order is paid. Only the remaining balance is credited. Excess is recorded for manual refund support. The first sufficient total, under the order lock, creates exactly one `manual_paid_draft` entitlement, leaves `custom_data_draft` editable and unpublished, and never calls the Stripe publication transition, exposes a guest URL or sends a publication email. Later uploads may be corrected only through a reasoned append-only correction; retries are idempotent and cannot create a second draft or entitlement. The customer projection includes only safe current status, amounts, reason and current receipt; reviewer IDs, evidence paths, prior versions and audit history remain administrator-only. The `/admin` overview shows pending-review notification counts. Receipt file quarantine/removal remains a separate operation from review. There is no email, assignment or escalation automation.

**Rationale:** Manual verification needs a clear operational queue and a durable audit trail, while payment completion must not silently publish content or create more than one entitlement. Server-calculated allocation and order locking make partial payments, top-ups, excess and concurrent reviews deterministic.

**Alternatives considered:**
- *Publish immediately after manual confirmation.* Rejected — publication is a later fulfilment step, so the owner can review the paid draft first.
- *Treat duplicate receipts as new entitlements.* Rejected — later payments stay in the same order lineage and require manual support or a reasoned correction.
- *Expose the full review record to the customer.* Rejected — reviewer identity, evidence paths, prior versions and audit history are administrator-only.

**Implications:** The administrator queue and overview notification are the only work surfaces in this release. Receipt file quarantine/removal is separate from review; no email, assignment, escalation or automated refund flow is added.

---

## D22 — Every first payment opens a private draft; owner publishes explicitly

**Date:** 2026-09-07
**Status:** Decided by user (approved combined issues #73/#78/#79 under #71)

**Decision:** The first sufficient confirmed payment by Stripe, Bank DuitNow, or Touch ’n Go wins under the existing order lock and creates exactly one private, editable paid-draft entitlement. Payment confirmation never publishes, exposes a guest URL, or sends a publication email. The selected template is fixed, while all invitation content, the Gaya panel, and Section controls remain editable until publication. Manual receipt/evidence snapshots remain immutable and are evidence only; publication always uses the latest successfully saved `cards.custom_data_draft`. The owner must provide the exact unchecked-to-checked acknowledgement `I understand that this invitation will become public and read-only.` and the server/database must validate it together with ownership, payment, template, availability, live draft, and expected draft version. The first publication writes the immutable `cards.custom_data` snapshot, clears the live draft, records one acknowledgement audit row, and sets `published_at`, which starts hosting; there is no automatic paid-draft expiry or invented hosting duration.

**Rationale:** Separating payment from publication gives the customer a safe final review window and makes Stripe/manual behavior identical. A versioned live-draft check prevents a failed or stale save from being silently published, while immutable evidence and a one-row publication audit preserve the payment record and make retries convergent.

**Alternatives considered:**
- *Publish automatically when Stripe or manual payment wins.* Rejected — payment is entitlement, not customer approval of public/read-only content.
- *Publish the frozen manual receipt draft.* Rejected — the receipt snapshot is immutable evidence; the customer may continue editing the live draft after payment.
- *Expire paid drafts or infer a hosting duration.* Rejected — no approved duration or expiry policy exists.
- *Let publication restore a disabled invitation or rewrite a published snapshot.* Rejected — administrator disable/restore remains reasoned and published invitations remain frozen.

**Implications:** `complete_order_payment`, manual review, and `finalize_paid_order` are payment/status transitions only; `publish_paid_draft` is the sole first-publication RPC and is service-role-execute-only behind an owner-authenticated route. `draft_version` increments and `last_activity_at` records only successful customer draft saves; reads and polling do not change activity, and historical NULL activity is honest. Public invitation, metadata/OG, preview, RSVP, cache, and Storage boundaries must not disclose a paid draft. The approved pre-publication edit window includes manual review; broader edit-window, replacement and retirement policy outside that window remains deferred to issues #74/#75. D22 supersedes prior decision text that described Stripe payment completion as publication; earlier history remains for traceability.

---

## D23 — Invitation editing and payment review are separate flows

**Date:** 2026-09-07
**Status:** Decided by user (approved follow-up to issues #73/#78/#79)

**Decision:** The owner may edit invitation text, layout, the Gaya panel, Sections and images before and during manual receipt review (submitted, insufficient and same-method top-up) and after sufficient payment until first publication. The selected template and order price remain fixed. Live invitation edits never update immutable receipt versions, payment-time snapshots, private evidence, review decisions or audit records. Publication still requires sufficient confirmed payment and the exact explicit acknowledgement, then publishes the latest successfully saved draft. Payment confirmation never publishes, exposes a guest URL or sends a publication email.

**Rationale:** Payment evidence proves a transfer, while the invitation remains customer-owned content until explicit public/read-only acknowledgement. Separating the flows avoids freezing legitimate design edits without weakening payment integrity.

**Implications:** The edit page stays on the live editor and offers a separate payment-status action; dashboard and checkout surfaces expose editing independently from payment review. Migration 035 replaces only card-trigger draft-lock branches for legacy and receipt-based paths. Existing payment concurrency, Stripe/manual handoff, duplicate-credit, publication acknowledgement, order/card deletion and audit guards remain. Migration 034 continues to make published and administratively disabled snapshots and assets read-only. Issues #74/#75 remain deferred outside this approved pre-publication window.

---

## D16 — Section editor tour: Malay-only, desktop-only, dismissible, account-level

**Date:** 2026-08-25
**Status:** Decided by user (approved scope); extended by D28

**Decision:** The Section editor ships a dismissible five-step desktop guided tour in plain Malay. The steps target exactly five editor surfaces, in order: the Section sidebar, the Sub-form, the Live preview pane, the Save indicator, and the Continue to payment button — no field-level guidance inside them. It launches automatically only when the authenticated account has never completed or dismissed it (the server-read `users.section_editor_tour_completed_at` marker, migration 017; never localStorage, never per card id). Finishing **and** dismissing both mark completion at the account level, so a settled tour stays closed across reloads, other drafts, and other browsers for that account. A persistent Help control (**Bantuan**) in the editor top bar replays the tour from step one at any time without clearing the completion marker. Tour state is strictly isolated from draft persistence: no tour interaction calls `updateData`, `scheduleSave`, `saveDraft`, or `PATCH /api/cards/[id]/draft`, writes no localStorage draft cache, and touches no card JSONB — the sole write surface is `app/actions/editor-help.ts`, an authenticated service-role action scoped to the caller's own row and idempotent while the marker is NULL. Placement-wise, the dashboard's sticky 58px Navbar (z-index 100) must never clip the helper UI: the tour's fixed overlay stacks above that Navbar (z-index 120), measures the rendered panel height on step, error-state, and viewport changes, and selects only an above/below candidate that fits that complete height before clamping it below the Navbar and inside the viewport. If neither side fits on a short viewport, only the panel body scrolls while its header and navigation controls stay visible. All customer-facing tour copy uses active, plain Malay. Mobile support and non-Malay tour text are explicitly out of scope.

**Rationale:** New customers need orientation across the three-pane editor before they trust it, but a tour that nags per card or per browser erodes trust fast. Account-level once-only with voluntary replay gives every customer one guided pass plus on-demand help at near-zero ongoing cost. Keeping completion out of the draft JSONB means the tour can neither corrupt nor be corrupted by card data, and isolating its write in one reviewed action keeps that guarantee enforceable. Malay-only matches the product's primary audience; desktop-only matches the editor, which has no mobile layout.

**Alternatives considered:**
- *Per-card or localStorage-tracked launch.* Rejected: replays the tour for every new card or cleared browser, and client-only tracking cannot express "seen before" reliably across devices.
- *Storing completion in the card/draft JSONB.* Rejected: couples helper UI state to customer invitation data and multiplies write surfaces against the draft.
- *English/bilingual tour copy or mobile support.* Deferred — out of the approved scope; revisit only with explicit user approval.

**Implications:** Any future step, language, or surface change must keep the five-surface/no-field-guidance framing unless this decision is superseded. The completion column is append-friendly: later tours may reuse it only if they preserve the finish/dismiss/account-level semantics, or add their own marker.

---

## D17 — Invitation lifecycle: five derived states with reasoned administrator availability controls

**Date:** 2026-08-26
**Status:** Decided by agent (implements the human-approved recovery scope)

Issue #70's D21 amendment adds the Paid draft state and its narrowly scoped
owner editing exception. D22 supersedes the older Stripe publication wording
below; the other lifecycle and availability rules stay in force.

**Decision:** The invitation has exactly five lifecycle states — **Editing**,
**Paid draft**, **Publishing**, **Published**, and **Unavailable** — and every one is *derived*
from durable facts (`deriveCardLifecycle` in `lib/types.ts`); no customer-writable
lifecycle column exists. Editing means the related order is unpaid; Paid draft
means the first sufficient confirmed Stripe, Bank DuitNow, or Touch ’n Go payment
has made the order paid while `manual_paid_draft` remains true and the saved
draft remains editable and unpublished; Publishing means a legacy paid row not
yet normalized to the Paid draft entitlement, with no recorded disable; Published
means paid and public; Unavailable means paid, unpublished, and the latest row of
the append-only `card_availability_actions` audit table is a `disable` carrying a
recorded, customer-visible reason (nonblank enforced by a DB CHECK). Availability
disables/restores are paid-only, administrator-only, reasoned, and executed by a
transactional RPC (`set_card_availability`) that appends the audit row atomically
with the visibility flip; `published_at` survives a disable. `cards.custom_data`
remains the immutable first-publication snapshot written once by the owner-only
`publish_paid_draft` RPC; `finalize_paid_order` used by status recovery only
normalizes or reports a private paid draft and never publishes. The publication
RPC carries owner, fixed-template, acknowledgement, availability, live-draft and
expected-version checks under the order-then-card lock, copies only the latest
saved draft, and records one immutable acknowledgement audit row. Missing draft
markers and version conflicts are retryable integrity errors, never permission to
publish a stale snapshot. The draft-save RPC (`save_card_draft`) repeats the
unpublished/non-null marker and expected-version guards on its own `UPDATE`, so a
stale autosave cannot recreate the marker cleared by first publication; late saves
on Published or Unavailable cards return HTTP 409. Publication retries do not
overwrite the snapshot, duplicate the audit or restore an Unavailable card.
Draft persistence is atomic for Editing and the single Paid draft; owner deletion
remains an unpaid-only operation, and a permitted deletion also removes the
pending order so no orphan can later be checked out. Only Published is
guest-accessible (`/i/[slug]`, metadata, OG image, and the RSVP guard all enforce the paid-and-public boundary). The
dashboard groups cards into three date groups — Current, Akan Datang
(Ongoing/Upcoming), Lepas (Past) — computed from strictly parsed event dates in
`Asia/Kuala_Lumpur` day keys (`lib/sections/resolve-event-date.ts`), never from
lifecycle; Current holds all Editing/Paid draft/Publishing/Unavailable/no-date Published
cards with Editing first.

**Rationale:** Deriving state from durable facts keeps the truth in one place,
makes crash/restart recovery convergent (idempotent finalizer), and lets an
administrative disable be told apart from an unfulfilled payment only through an
append-only audit trail whose absence cannot be silently interpreted as "never
disabled". Reasoned, recorded disables give customers an honest explanation
instead of a silent disappearance.

**Alternatives considered:**
- A writable `cards.status` column. Rejected — redundant with order payment +
  audit facts and creates a second source of truth that can drift.
- Recreating a missing card from `orders.custom_data` during payment or status
  recovery. Rejected — risks duplicate or malformed publications; a missing
  pre-created Card is instead a retryable/remediable failure.
- Falling back to the existing `custom_data` snapshot when the draft marker is
  gone at promotion time. Rejected — it would publish stale content and erase
  the "written exactly once" property; a consumed/missing marker is instead an
  integrity failure (`CARD_NOT_PROMOTABLE`, migration 019) retried through the
  existing recovery path.
- Customer restore/archive, or post-payment editing outside the explicitly
  permitted Paid draft. Rejected as policy non-goals; the owner-only publication
  acknowledgement is the sole new post-payment publication action in this scope.

**Implications:** Any new lifecycle-affecting write must go through the guarded
RPCs (service_role execute only) rather than direct table updates. New guest-
visible surfaces must respect the paid-and-public boundary. Date grouping must
reuse the shared Kuala Lumpur helpers rather than ad-hoc `new Date()` parsing.

---

## D27 — Customer Mohon Suntingan requests use a generation-bound review ledger

**Date:** 2026-09-08
**Status:** Decided by user (approved implementation for issue #80)

**Decision:** A customer may submit one bounded Mohon Suntingan request for an
own Published or `edit_window_expired` invitation. Submission records the
current publication, active edit-window pointer, latest availability action and
draft version. The request is visible to the owner and administrators through
the application only; there is no email, WhatsApp or notification service for
this flow. A pending Published invitation stays public and read-only, while a
pending expired edit window stays private and locked. Approval rechecks
payment, ownership, availability, lifecycle, current
publication and the captured generation inside the database transaction, then
delegates the actual fixed seven-day privacy/edit transition to the guarded
`open_card_edit_window` RPC. Rejection requires a bounded customer-readable
reason. A changed, disabled, retired, replaced or otherwise unavailable target
becomes a terminal stale decision, so it cannot block a later request. Stable
submission and decision ids make exact retries return the original result; they
never create a second request, window or deadline extension. Request, actor,
reason and decision timestamps are audited, RLS permits read-only owner/admin
views, and all mutations are service-role-only guarded RPCs.

**Rationale:** Customers need a clear correction path without weakening the
published guest boundary or allowing a customer to self-approve. Capturing the
publication/window/availability/draft generation prevents a delayed review
from granting a different invitation revision. Order-then-card locks match the
existing lifecycle transitions and make approval/rejection/direct grants
serializable.

**Alternatives considered:**
- Automatically opening a window on submission. Rejected — a request must not
  change guest visibility before administrator approval.
- A cooldown or multiple pending rows. Rejected — one pending row per
  invitation is sufficient and no arbitrary cooldown is part of this scope.
- Email/WhatsApp delivery or a new notification service. Rejected — status and
  queue are intentionally in-app only.
- Keeping changed rows pending forever. Rejected — stale is a terminal,
  customer-safe outcome that frees the request slot.

**Implications:** Migration 041 owns `card_edit_requests`, its RLS/ACL and the
submission/review/stale RPCs. Migration 043 repairs review operation-id replay
semantics and verifies that approval records the new active window after the
controlled-replacement guards in migration 040 and repair 042. Published and
expired invitations use the same customer Dialog and dashboard status; the
Admin nav/overview expose a pending count and focused queue. Issue #75 owns
migrations 040/042, D26 and any retirement or replacement terminal-state
columns; 041 remains compatible with baseline 039 and relies on the stable
`open_card_edit_window` signature to enforce those later guards.


## Pattern: how to add a new decision

When a future call needs to be recorded:

```markdown
## D<N> — <Short imperative summary>

**Date:** YYYY-MM-DD
**Status:** Decided by <user|agent>

**Decision:** <One paragraph: what we're doing>

**Rationale:** <Why>

**Alternatives considered:** <Bullet list with why-rejected>

**Implications:** <What this means for future work>
```

Reversing a decision: leave the old entry in place; add a new one with `Status: Superseded by D<N>`. Don't delete history.

---

## D19 — Checkout reservations protect Editing deletion

**Date:** 2026-08-26
**Status:** Decided by agent (implements the human-approved recovery scope)

**Decision:** This decision supersedes D17 **only** for its unconditional
Editing-deletion wording while an active Checkout reservation exists. A durable
Checkout reservation protects an unpaid Editing order/card pair while Stripe
Session creation or payment reconciliation is in progress. It is not a fifth
lifecycle state: the five D17 derived states remain unchanged. The
reservation is created before Stripe is contacted, uses its token as Stripe's
idempotency key, and the resulting Session must be persisted against that same
reservation before its URL is returned. The database enforces one card per order
and one persisted Stripe Session per order; lifecycle operations lock order then
card. Owner deletion remains available for Editing: it may release a bound Session
only after Stripe confirms that Session expired (or after the server expires an
open Session). An unbound or unconfirmable reservation remains protected because
a Stripe create response may have been lost. Paid webhook events are accepted only
when their Session matches the persisted binding; metadata is only a consistency
check. Guest access remains paid-and-public.

**Rationale:** A local timeout cannot prove a Checkout Session is unpayable. A
persisted reservation closes the create/delete race without adding customer
controls or weakening first-publication integrity.

**Alternatives considered:** Deleting after a 30-minute local timer was rejected:
Stripe expiry is based on Session creation and a request may have timed out after
Stripe created a payable Session. Releasing an unbound reservation was rejected
for the same reason.

---

## D24 — Administrator-approved seven-day edit windows for published invitations

**Date:** 2026-09-08
**Status:** Decided by user (approved implementation for issue #74)

**Decision:** This decision supersedes D17, D22 and D23 only for the explicitly
approved post-publication edit-window exception; their first-payment, payment-
evidence, first-publication and pre-publication rules remain historical and
otherwise in force. After first publication, only an authenticated administrator
may grant a fixed seven-day window with a bounded reason and replay-safe request
id. The database records the actor, reason, grant time and deadline using the DB
clock, serializes conflicting grants, and does not restart the clock on a
duplicate retry. The grant atomically makes the same slug private while keeping
the first `cards.custom_data` snapshot, payment evidence, purchased template,
order price and original `published_at` immutable. The owner may edit existing
content, reorder/change Section variants, use the Gaya panel and append new UUID
image uploads in `revision_draft`; template replacement, retirement, refunds and
new purchase are not permitted. The owner must save a valid latest version,
acknowledge the exact public/read-only statement and call the guarded
republish transition. That transition appends one immutable `card_publications`
row, advances the guarded `cards.current_publication_id`, closes the window and
restores the same slug as read-only. It is replay-safe and does not reset
`published_at` or send a second first-publication email.

At or after the database deadline, every save, upload and republish transition
fails server-side; the invitation stays private and the retained revision stays
locked until a fresh, separately audited grant. No browser timer or scheduler
restores visibility. Administrator disable prevails over a window and restore
does not publish old content or bypass an active/expired window. Missing or
corrupt current-publication pointers fail closed. Every guest boundary — page,
RSC, metadata, OG, RSVP, asset stream and realtime/guestbook — reads only the
selected current approved publication; private states return only `{Customer
name} is making edits. Please wait.` using a safe bounded profile name. Already
downloaded bytes or stale third-party caches cannot be revoked by this app.

**Rationale:** Published invitations are normally read-only, but administrators
need a controlled correction path. An explicit, time-bounded grant preserves
customer control and auditability while the immutable publication ledger and one
guest pointer prevent old or unapproved content from leaking during a revision.
Database-clock checks at every transition close the expiry race; append-only
assets preserve historical bytes without allowing snapshot rewrites.

**Alternatives considered:**
- Customer self-approval or an owner-created deadline. Rejected — only an
  administrator may authorize a window and the deadline is fixed.
- A browser timer or scheduled auto-restore. Rejected — expiry must be enforced
  by the database and server at each mutation; expired invitations remain private.
- Rewriting `cards.custom_data` or approving each revision separately. Rejected
  — the first snapshot and payment evidence are immutable, and the administrator
  approves the window rather than every owner save.
- Deleting/replacing image bytes or revoking a slug. Rejected — assets are
  retained append-only and the same slug is restored only after explicit
  republication.

**Implications:** Migrations 038 and 039 add the edit-window, publication,
activity and current-pointer boundaries, guarded RPCs, RSVP publication lineage
and scoped append-only Storage policies. Migration 039 also advances the
optimistic generation on every fresh grant/reopen, allows only the unpaid
non-payment activity cascade during ordinary deletion, serializes RSVP pointer
validation with lifecycle transitions, and keeps first-publication retries
unavailable-safe and stale-intent-safe. UI state uses the canonical Edit window
and Edit window expired lifecycle names, shows the deadline/support direction,
and keeps disable/restore as separate availability controls. Controlled
replacement and retirement are defined separately in D26; this edit-window
decision does not grant a replacement path.


## D25 — Shared Kamy brand palette and invitation-first dashboards

2026-09-08. Keep the existing Kamy logo palette: deep plum (`#2c1a4a`), gold
(`#c9984a`), warm cream and white panels. The requested cleanup concerns obsolete
UI page iterations; it does not replace the purple brand identity or restore
old layouts. `app/globals.css` owns browser tokens; customer Gaya preset colors
remain invitation content. Shared Dialog and Button primitives own app
confirmation styling, including destructive states and pending dismissal.

The customer dashboard uses small phone renders with a single primary next
action. Perlu perhatian, Akan datang and Majlis lepas replace D17's original
Semasa grouping. Published invitations without dates belong in Akan datang;
only fully past Published invitations enter Majlis lepas. RSVP summary is
attending guests and response totals; the full breakdown remains on RSVP.
The three group controls are sticky selected filters, with invitation search
and six results per page. A grid keeps invitations scannable without sideways
scrolling; only the chosen group is shown. Search counts cover all groups.
The RSVP dashboard uses the same palette and typography with guest totals and
expandable responses; full messages and contact details remain available.

The administrator invitation index at /admin/cards shows identity, owner and
lifecycle. Its detail view starts with a short summary and phone render.
Payment/activity, access/editing, history and deletion are disclosed on demand.
This presentation change retains payment, ownership, publication and audit
boundaries. The user required managed Worktree Setup and requested all work in
one thread; no builder agents were used.


## D26 — Controlled replacement grants retire one predecessor atomically

**Date:** 2026-09-08
**Status:** Decided by user (approved implementation for issue #75)

**Decision:** An authenticated administrator may create one reasoned,
audited, replay-safe controlled replacement for a paid predecessor that has no
direct successor. The replacement has its own order, invitation, slug and
entitlement record, keeps the same owner and purchased template, and starts as
an unpublished owner-editable draft copied from the predecessor's latest
published snapshot. The target order is explicitly marked
`entitlement_source = 'controlled_replacement'`; it is paid only as a durable
grant entitlement and has no payment method, payment time, Stripe Session,
receipt, revenue or payment-confirmation email. A completed replacement may
itself become the predecessor of a later replacement chain.

The predecessor remains Published while the target is pending and remains
Unavailable when it was already administratively unavailable. The owner may
save the pending target draft and upload new target-scoped assets under the
ordinary ownership/version rules, but the target cannot use ordinary paid-draft
publication, payment/receipt flows or a new edit-window grant. A target-scoped
asset plan copies referenced predecessor objects to protected target paths with
source hashes, idempotent pending/ready transitions and a draft-version-bound
readiness record. Retries never overwrite ready copies or newer owner edits.

An administrator completes cutover only after the current source publication,
target draft version and every copied asset are revalidated. The transaction
locks both order rows in ascending UUID order and then both card rows in
ascending UUID order, publishes the validated target through a
`controlled_replacement` publication, and permanently retires the predecessor
in the same transaction. It preserves predecessor and target orders,
invitations, snapshots, publication history, payment evidence, assets and
RSVP rows; no RSVP is moved or copied. Retired is an additional terminal
derived lifecycle state. Owner and administrator surfaces show reason and
lineage. A retired guest URL, metadata/OG route, RSC, RSVP, realtime topic and
asset request all fail closed at a generic unavailable boundary without
disclosing the old name, reason or replacement URL.

**Rationale:** A separately entitled target gives administrators a controlled
way to correct or replace a paid invitation without fabricating a second
payment or rewriting immutable history. Durable lineage and target-scoped
asset references prevent a predecessor's private bytes or RSVP history from
crossing the card boundary. Deterministic locks, exact version checks and
idempotent copy/cutover records make concurrent disable, save, upload, payment
and retry operations converge safely.

**Alternatives considered:**
- Reusing the predecessor order, payment evidence, slug or RSVP rows. Rejected
  — it would erase audit lineage, create a false second payment or broaden
  cross-card access.
- Publishing through the ordinary paid-draft route. Rejected — only the
  administrator's validated cutover may publish a controlled replacement.
- Restoring or reopening a retired predecessor. Rejected — retirement is a
  terminal state; a later replacement is a new direct successor instead.
- Copying arbitrary paid template grants or allowing a customer to choose a
  replacement template. Rejected — the target retains the source template and
  latest published snapshot unless a future issue explicitly changes that
  policy.

**Implications:** Migration 040 owns the replacement grant, target entitlement,
asset-copy/readiness and cutover tables, storage boundaries and lifecycle
guards. Migration 042 is an append-only repair: it restores historical
card-assets immutability, permits moderation to disable a pending predecessor
but never restore or publish a pending target, binds the grant to the reviewed
source publication, and makes cutover require the rendered source publication
and replacement draft version. The stable `open_card_edit_window` signature is
retained for issue #80's wrapper, while retired and pending replacement states
are rejected by the common lifecycle guard. D27 records the separate customer
request/review flow and delegates approval through this guarded lifecycle
boundary.

---

## D28 — Section editor tour extends to the mobile shell with its own step list

**Date:** 2026-09-13
**Status:** Decided by user

**Decision:** `SectionEditorTour` stays one component and gains a second list,
`MOBILE_STEPS`, beside the desktop `STEPS`, selected on the same
`useIsDesktopViewport()` signal the editor already exposes. At 1024px and wider
the tour is unchanged at five steps: the Section sidebar, Sub-form, Live preview
pane, Save indicator, and Continue to payment button. Below that breakpoint it
walks six steps, in order: the Live card canvas, the Form sheet, the Sheet
detent control, the Navigation rail, the Section stack screen (Susun Bahagian),
and the shared Continue to payment button, with one sentence about autosave
folded into the Form sheet step. Every mobile step declares the pane it
describes: the four card-and-sheet steps declare `pane: "edit"`, and the Susun
Bahagian step declares `pane: "stack"` and points an animated, non-interactive
reorder hint arrow above the first Section row's drag handle. Pane selection is
the tour's one deliberate exception to its state-free contract: the tour may
drive exactly one piece of ephemeral shell state, `mobilePane`, and only through
an editor-owned `onRequestPane` callback the editor implements as
`setMobilePane`. It reconciles the shell to the current step's pane, and it
restores the pane in effect when the tour opened whenever a step needs no
particular pane and on every exit — Seterusnya, Kembali, ×, Escape, and
completion. It never reaches into the DOM to change panes, and it still owns no
editor data: it does not touch `activeIdx`, `sheetDetent`, `updateData`,
`scheduleSave`, `saveDraft`, or `PATCH /api/cards/[id]/draft`. The mobile
targets are `data-editor-tour` hooks in the editor's mobile branch. Both
viewports share the one account-level `users.section_editor_tour_completed_at`
marker: a customer who finishes or dismisses the tour on either viewport does
not see it again on the other, and finishing or dismissing still persists only
through `completeSectionEditorTourAction()`. Panel geometry derives from the
viewport: with the Navbar hidden on mobile the minimum top is the gutter alone,
the panel is full-bleed minus that gutter, the bottom clamp reserves the 76px
navigation rail plus the gutter, `--kb-inset` is respected, and placement is
opposite the target — a target in the lower half puts the panel in the upper
area, an upper-half target puts it below, and a full-screen backdrop target puts
it at the bottom. A step whose target is not yet present during a pane switch
degrades to the existing no-rect path: a centred panel with no highlight ring.

**Rationale:** KJ-1 gave the editor a canvas-first mobile shell, so the mobile
customer now has the layout the tour describes and needs the orientation more,
not less; suppressing the tour below 1024px had become the gap. Reordering is a
core Section-stack operation that lived in a separate pane, so the tour could
not show it without leaving the card; the customer explicitly asked for a step
that takes them there. One component and one completion marker avoid a second
persistence path or a migration, and selecting steps on the existing viewport
signal keeps the desktop tour a regression-free no-op. Confining the pane
override to one editor-owned callback keeps the tour from becoming a second
owner of editor state.

**Alternatives considered:**
- *A separate mobile tour component or a second completion marker.* Rejected —
  duplicates the modal focus logic, would need a migration, and could show the
  tour twice to one account.
- *A dedicated autosave step.* Rejected — a highlight ring around the 11px save
  indicator reads as broken, so autosave folds into the Form sheet copy.
- *Reusing the desktop hooks or gating the tour off on mobile.* Rejected — the
  desktop hooks do not exist in the mobile branch, and suppressing the tour is
  the exact gap this decision closes.
- *Letting the tour set `sheetDetent` or `activeIdx`, or manipulate panes
  through the DOM.* Rejected — `mobilePane` is the only shell state the tour may
  drive, and only through the editor-owned callback.
- *Hardcoding the pane switch to a step index.* Rejected — the step declares
  `pane: "stack"`, so inserting or reordering steps cannot silently break it.
- *A new decision record for the Susun Bahagian refinement.* Rejected — D28 is
  unmerged and is this change's decision, so it is amended in place; D16's dated
  record is left untouched.

**Implications:** Any future mobile step must target a hook present in the
shell's default `"edit"` pane or declare the pane it needs; any pane change must
go through `onRequestPane` and restore the starting pane on every exit. D16's
five-surface/no-field-guidance framing and account-level finish/dismiss
semantics hold per viewport (the mobile list now has six surfaces, the desktop
five). No migration, route, server action, or environment variable is added.
