# KJ-3 — Mobile-friendly public template pages (build spec)

Binding spec. Where this document and your judgement disagree, follow this
document; where it is silent, follow `AGENTS.md` and the surrounding code. If
you believe a requirement here is wrong, say so in your report rather than
silently doing something else.

## 0. Environment facts

- Branch based on `origin/main` at `191f623`.
- Use your own isolated Supabase project and allocated ports, read from your
  worktree's `.env.local`. Never point at a shared or hosted database.
- Start the dev server with
  `python3 "$HOME/.bb-setup/lib/kamy-worktree-entry.py" dev`, not bare
  `npm run dev`.
- Verification is `npm run lint` (0 errors, 7 pre-existing warnings in
  `components/card-previews/*`) plus `node docs/ui-glossary/validate.mjs`.
- **Turbopack's CSS watcher is unreliable in these worktrees.** If a stylesheet
  edit does not reach the browser, stop the dev server, `rm -rf .next/dev`,
  and start it again before concluding a rule is wrong.
- Another builder (KJ-2) is working in a different worktree on the Section
  editor tour. See section 5 — file ownership matters here.

## 1. Scope

Three routes in the `(public)` group:

- `/templates` — `app/(public)/templates/page.tsx`, `components/TemplatesGallery.tsx`,
  `components/TemplatesGallery.module.css`, `components/TemplateShowcaseCard.tsx`
- `/templates/[id]` — `app/(public)/templates/[id]/page.tsx`
- `/templates/custom` — `app/(public)/templates/custom/page.tsx`,
  `app/(public)/templates/custom/CustomOrderForm.tsx`

Not in scope: `/templates/preview/[id]` (the bare preview surface rendered
inside an iframe — it is already sized by its host), the dashboard, the
admin template management table, the Section editor, and the invitation
route `/i/[slug]`.

## 2. What is actually wrong

I measured all three routes at 390x844 in a real browser. Findings, in
priority order:

### 2.1 `/templates/[id]` is broken, not merely cramped — fix this first

`app/(public)/templates/[id]/page.tsx:268` opens a two-column grid:

```
display: "grid",
gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
gap: 60,
```

At 390px each column resolves to roughly 150px. The left column holds a phone
frame with a hardcoded `width: 295, height: 640` and `flexShrink: 0`
(`:290`), so it overflows its own column and lands at `x = -53` — partly
off-canvas — while visually overlapping the right column. The right column is
squeezed until "Sakura Story" wraps mid-word and the price "RM 129" breaks
across two lines. The info panel is also `position: "sticky", top: 80`
(`:366`), which is meaningless in a single-column mobile flow.

**Root cause is the same one KJ-1 found in the Section editor: the layout
lives in inline `style` objects, and an inline style cannot carry a media
query.** Read `docs/MOBILE_EDITOR.md` section 2.1 — the diagnosis and the
remedy pattern are already written down there.

### 2.2 iOS auto-zoom on every form field

Any input under 16px makes iOS Safari zoom the page on focus, and it does not
zoom back. Currently sub-16px:

- `/templates/custom`: `eventType`, `brief`, `budgetBand`, `referenceLinks`,
  `contactName`, `contactPhone`, `contactEmail` — all 14px.
- `/templates`: the search field — 14px.

### 2.3 Touch targets below 44px

- Filter pills on `/templates`: 36px tall.
- Footer links: 20px tall.
- The logo link in the Navbar: 34px.
- `/templates/custom` inputs and selects: 42–43px — just short.

### 2.4 Cramped two-column contact row

`CustomOrderForm` puts Nama Penuh and Telefon in a `165px 165px` grid inside a
342px container. It fits, but a Malaysian phone number and a full name both
want more room.

### 2.5 Things that are already fine — do not "fix" them

Verify before you touch, and leave alone if still true:

- The gallery grid already collapses to `repeat(1, minmax(0px, 1fr))` at
  390px. `TemplatesGallery.module.css` already has media queries at 1100 /
  820 / 520px.
- The filter row is already `overflow-x: auto` — a deliberate horizontal
  scroller, not an overflow bug. It may deserve a scroll affordance; it does
  not deserve rearchitecting.
- The Navbar's mobile menu works and its links are already 44px.
- No route has horizontal page overflow: `scrollWidth === clientWidth === 390`
  on all three.

## 3. What to build

### 3.1 The detail page

Give `/templates/[id]` a single-column layout below 1024px: preview first,
then the info panel. The phone frame must fit the viewport width instead of
being hardcoded at 295px, and the sticky info panel must not be sticky when
the layout is one column.

You may not express this with inline styles. Add a CSS Module beside the page
(follow `components/TemplatesGallery.module.css` for house style) and move the
layout-bearing declarations into it. Keep purely decorative, non-responsive
inline styles where they are — this is not an invitation to rewrite the file.

Preserve exactly: the desktop layout at >=1024px, the live preview iframe's
behaviour, and every existing string. This page sells the product; it must
look deliberate on a phone, not merely un-broken.

### 3.2 Inputs and touch targets

- Every input, select and textarea on the three routes reaches 16px at mobile
  widths. Where the value is set inline (`CustomOrderForm` has 14 inline style
  objects), the override must win — check the computed value in the browser,
  do not assume a stylesheet rule beats an inline one. It does not.
- Filter pills, footer links and the logo link reach a 44px touch target at
  mobile widths. You may add padding rather than growing the visible box.
- Keep the desktop sizes exactly as they are.

### 3.3 The contact row

Stack Nama Penuh and Telefon at mobile widths.

### 3.4 A scroll affordance for the filter row

The filter scroller gives no hint that more pills exist off-screen. Add a
lightweight one — a fade mask at the trailing edge is enough. Do not add
arrow buttons or a JavaScript carousel.

## 4. Constraints

1. **No behaviour changes.** No new routes, no new server actions, no data
   fetching changes, no copy changes, no new dependencies.
2. **Desktop at >=1024px is untouched.** This is the regression I check first.
3. **Prefer CSS Modules over `app/globals.css`.** See section 5.
4. Use the canonical UI terms from `docs/GLOSSARY.md` in code, comments and
   commit messages — "Template showcase card", "Detail preview iframe",
   "Template info panel", never a bare "card" or "preview".
5. Read and use the `frontend-design` skill. This is the public storefront.

## 5. File ownership — read this before you edit

A second builder is working concurrently in another worktree on the Section
editor tour (KJ-2). To keep the two branches mergeable:

- **Do not edit `app/globals.css`.** KJ-2 owns it this cycle. Put your styles
  in CSS Modules. If you are certain something belongs in the global sheet,
  say so in your report and leave it out.
- **Do not edit `components/SectionEditor.tsx`, `components/SectionEditorTour.tsx`,
  or anything under `components/sections/`.**
- `docs/FLOW.md`, `docs/GLOSSARY.md` and `docs/ui-glossary/data/` are shared.
  Touch only the rows and entries your change actually affects, and mention in
  your report which ones you edited so I can merge deliberately.

## 6. Documentation

Required by `AGENTS.md`, in the same change:

- Update `docs/ui-glossary/data/` if you introduce or rename a named part, and
  re-run `node docs/ui-glossary/validate.mjs` so `docs/GLOSSARY.md`
  regenerates. Do not hand-edit the generated sections.
- `docs/FLOW.md` only if a route, server action, service client or env var
  changes. This change should not touch any of those — but the file also
  carries a client-component inventory, so if a description there becomes
  wrong, fix that row.
- Do not add a decision record unless you make a design decision this spec did
  not make for you. If you do, follow the template in `docs/DECISIONS.md` and
  add a new `D<N>` — never rewrite an existing one.

## 7. How I will check your work

I will run these myself, not read them from your report:

1. `npm run lint` → 0 errors, 7 pre-existing warnings.
2. `node docs/ui-glossary/validate.mjs` → passes.
3. At 390x844 on all three routes: no element's bounding box crosses the
   viewport edge, `scrollWidth === clientWidth`, and no two layout regions
   overlap.
4. `/templates/[id]`: single column, preview above the info panel, the phone
   frame fits the viewport, the template name and the price each render on one
   line, nothing sticky.
5. Every input, select and textarea has a **computed** `font-size` of at least
   16px at 390px.
6. Filter pills, footer links and the logo link each measure at least 44px in
   their touch dimension.
7. At 1280x900: all three routes are pixel-identical to `origin/main`. I will
   compare against a checkout of main side by side.
8. A real interaction pass: filter the gallery, open a template, submit the
   custom form with a validation error and with valid input.

Report what you did, what you verified with actual output, and anything you
could not do or disagreed with. Do not claim a check passed that you did not
run.
