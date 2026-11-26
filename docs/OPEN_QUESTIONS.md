# OPEN_QUESTIONS.md

> Genuinely unresolved questions requiring human input. Answered questions move to `DECISIONS.md` as new `D<N>` entries (see the rule at the bottom). Already-resolved items — legacy/v2 rollout, draft persistence, Malay-first labels, Section image storage strategy, and the Phase-1 defaults bundle (former Q2, Q5, Q8, Q9, D10) — are recorded in `DECISIONS.md` and no longer tracked here.

---

## Q1 — Section schemas: code-first permanently?

**Question:** D2 locks Section schemas to TypeScript code. Should schema-in-DB ever be pursued, or is code-first permanent?

**Options:** (A) code-first permanently *(recommended)*; (B) DB-stored schemas once the catalogue stabilises; (C) hybrid with customer-defined extension fields.

**Why it matters:** A major build whose payoff only materialises if catalogue additions become frequent.

---

## Q3 — Premium gating: what is the unit of charge?

**Current state:** Template-level one-time pricing; premium Variant markers in the Variant gallery are informational only.

**Question:** Keep template-level pricing only, or add paid gating at the Variant level (+RM per premium variant) or Section level?

**Recommendation:** Variant-level upgrades first if any gating is wanted; avoid Section-level pricing (confuses "Add Section").

**Why it matters:** Drives Stripe line-item shape, editor gating UX, and customer messaging. Blocks launch pricing decisions.

---

## Q4 — Multi-language structured text?

**Current state:** `LocalisedText` is implemented as `type LocalisedText = string` (`lib/types.ts`) — not yet a union. Bilingual copy is written manually into single fields.

**Question:** Do we commit to structured multi-language fields (`{ primary, secondary? }` or language maps) later?

**Why it matters:** Any future change must stay additive and backward-compatible under D12 — single strings must remain valid input to whatever shape is chosen.

---

## Q7 — How custom is custom?

**Question:** Where is the line between catalogue self-serve and bespoke work now that every active template is Section-v2 and custom orders flow through `/api/custom-orders` + admin triage?

**Recommendation:** Tiered model — catalogue composition (self-serve), styled bespoke (custom theme/assets), full bespoke (dev-built). Decide which tiers are actively marketed and their price bands.

**Why it matters:** Determines what stays automated vs dev-touch as order volume grows.

---

## When a question gets answered

1. Add a corresponding `D<N>` entry in `DECISIONS.md` capturing the answer + rationale.
2. Remove the question from this file.
3. Update `PLAN.md` / `PRODUCT_PLAN.md` / `ARCHITECTURE.md` if the answer changes plans or the model.
