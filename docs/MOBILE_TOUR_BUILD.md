# KJ-2 — Mobile tour for the Section editor (build spec)

Binding spec. Where this document and your judgement disagree, follow this
document; where it is silent, follow `AGENTS.md` and the surrounding code.
If you believe a requirement here is wrong, say so in your report rather than
silently doing something else.

## 0. Environment facts

- Branch `bb/kj-2-build-mobile-tour-for-the-section-editor-thr_gddjyupum4`,
  based on `origin/main` at `191f623`.
- Isolated Supabase project `kamy-wt-cb3558d1c924ad5e`; app
  `http://localhost:43828`, API `http://127.0.0.1:43820`, Studio
  `http://localhost:43823`. Never point anything at a shared or hosted
  database.
- Test accounts: `kamy@gmail.com` / `123` (customer),
  `kamy.admin@gmail.com` / `123` (administrator).
- Start the dev server with
  `python3 "$HOME/.bb-setup/lib/kamy-worktree-entry.py" dev`, not bare
  `npm run dev`.
- Verification is `npm run lint` (0 errors, 7 pre-existing warnings in
  `components/card-previews/*`) plus `node docs/ui-glossary/validate.mjs`.
- **Turbopack's CSS watcher is unreliable in these worktrees.** If an edit to
  `app/globals.css` does not reach the browser, stop the dev server,
  `rm -rf .next/dev`, and start it again. Do not conclude a rule is wrong
  until you have done that once.

## 1. The problem

`components/SectionEditorTour.tsx` is gated to `(min-width: 1024px)` in three
places, so a phone customer gets the new canvas-first shell with no guidance:

- `DESKTOP_TOUR_QUERY` at `SectionEditorTour.tsx:35`, consumed by
  `useIsDesktopViewport()`.
- `if (!open || !isDesktop) return null` — the render gate.
- `SectionEditor.tsx:427` (auto-launch) and `SectionEditor.tsx:1059` (the
  Bantuan replay button), both `&& isDesktop`.

Lifting the gate alone is not enough. Three of the five desktop steps point at
`[data-editor-tour="sidebar"]`, `"sub-form"` and `"preview"`, and those hooks
are rendered **only** inside the desktop three-pane branch
(`SectionEditor.tsx:1262`, `:1267`, `:1272`). On mobile they do not exist, so
those steps would highlight nothing. `"save-indicator"` (`:1033`) and
`"pay-button"` (`:1118`, `:1144`) are in the shared header and do exist on
mobile.

The panel geometry is also desktop-shaped: `PANEL_TOP_MIN` reserves 58px for
the dashboard Navbar, but on mobile `app/globals.css` hides it
(`body:has(.section-editor) > header { display: none }`), so that reservation
is dead space. Nothing reserves the 76px navigation rail at the bottom.

## 2. Hard constraints

1. **Do not change the desktop tour.** Same five steps, same Malay copy, same
   geometry, same behaviour at ≥1024px. This is the regression I will check
   first.
2. **The tour still owns no editor data.** It keeps its current contract: it
   holds only ephemeral state (step index, highlight rect, settle flag), never
   touches the draft pipeline, and its only persistence is the account-level
   marker through `onComplete`. Do **not** make the tour set `mobilePane`,
   `sheetDetent`, `activeIdx`, or any other editor state. Pick step targets
   that are visible in the shell's default state instead.
3. **One completion marker.** `completeSectionEditorTourAction()` stays as-is;
   a customer who has settled the tour on either viewport does not see it
   again on the other. Do not add a second marker or a migration.
4. **Malay copy**, matching the tone of the existing steps: plain second
   person, no jargon, no English loanwords where a Malay word exists. Use the
   canonical UI terms from `docs/GLOSSARY.md`.
5. **Accessibility parity.** The mobile panel keeps `role="dialog"`,
   `aria-modal`, focus-on-open, the Tab trap and Escape-to-dismiss that the
   desktop panel already has.

## 3. What to build

### 3.1 Two step lists, one component

Keep a single `SectionEditorTour`. Add a `MOBILE_STEPS` array beside `STEPS`
and select between them on the same viewport signal the component already
uses. Rename the module doc comment: it is no longer "desktop-only".

Keep exporting `useIsDesktopViewport` and `DESKTOP_TOUR_QUERY` — the editor
uses them for its own shell branch. Only stop using them to *suppress* the
tour.

### 3.2 Mobile steps

Five steps, in this order, each anchored to a new `data-editor-tour` hook you
add to the mobile branch of `SectionEditor.tsx`:

| # | Hook | Element | What the copy must say |
|---|---|---|---|
| 1 | `mobile-canvas` | `.se-canvas` | This is your invitation, live. It updates as you type. |
| 2 | `mobile-sheet` | `.se-sheet` | The form for the Section you are on. Fill it in here. |
| 3 | `mobile-detents` | `.se-detents` | Three heights: peek to see more card, full to see more form. |
| 4 | `mobile-rail` | `.se-rail` | Kembali / Seterusnya walk you through every enabled Section in order; ☰ jumps to the full Section stack. |
| 5 | `pay-button` | existing hook | Reuse the desktop step-five copy verbatim. |

Step 5 reuses the existing hook and existing Malay text — do not rewrite it.

Autosave is not its own mobile step; fold one sentence about it into step 2's
copy. (Rationale: six steps is too many on a phone, and the save indicator is
a 11px line in the header that a highlight ring around it looks broken on.)
If you disagree after seeing it on the device, say so in your report — do not
just add a sixth step.

All five targets are present in the shell's **default** state (`mobilePane`
`"edit"`), so no step needs the editor to move. Steps 1–4 do not exist when
`mobilePane === "stack"`; the tour only auto-launches on first visit, when the
pane is `"edit"`, but the Bantuan replay can be pressed at any time. Handle
that: when the tour opens while the stack pane is showing, the missing target
must degrade to the component's existing "no rect" path (centred panel, no
highlight ring) rather than crashing or highlighting the wrong thing. The
existing `measure()` already returns `null` for a missing selector — verify
that path works rather than assuming it.

### 3.3 Panel geometry on mobile

- `PANEL_TOP_MIN`: on mobile the Navbar is hidden, so the minimum top is just
  the gutter (12), not `NAVBAR_HEIGHT + 12`. Derive it from the viewport, do
  not hardcode two magic numbers in two places.
- Reserve the navigation rail: the panel's bottom clamp must stay 76px + the
  gutter above the viewport bottom, so the panel never sits under the rail.
  76 is the rail height used throughout `app/globals.css`; define it once and
  reference it.
- Placement rule: **put the panel opposite its target.** If the target's
  centre is in the lower half of the viewport (steps 2, 3, 4), place the panel
  in the upper area; otherwise place it below. Rect-anchored placement as on
  desktop will cover the target on a 390px-wide screen.
- Width: full-bleed minus the gutter on mobile, not the fixed 360.
- The tour's `z-index` (120) already clears the sheet (30) and the rail (35).
  Confirm rather than change.
- Respect `--kb-inset` if it is non-zero, the same way the rail does. In
  practice the keyboard should not be up during the tour because the overlay
  blocks the page, but do not assume it.

### 3.4 Editor gates

- `SectionEditor.tsx:427` — auto-launch: drop `isDesktop` from the condition.
  The other conditions (`mounted`, not paid, not a revision window, not
  already completed) stay exactly as they are.
- `SectionEditor.tsx:1059` — the Bantuan button: drop `isDesktop`. On mobile
  the header is tight; if `helpButtonStyle` makes the header wrap at 390px,
  give the button a mobile-sized variant via a class in the existing
  `@media (max-width: 1023px)` block rather than changing the desktop style.

## 4. Documentation

Required by `AGENTS.md`, in the same change:

- Add the mobile shell's parts to `docs/ui-glossary/data/` — at minimum the
  ones your steps name (the live card canvas, the form sheet, the detent
  toggle, the navigation rail) — and re-run
  `node docs/ui-glossary/validate.mjs` so `docs/GLOSSARY.md` regenerates.
  It currently passes with a stale-screenshot warning; it must still pass.
  Do not hand-edit the generated sections of `docs/GLOSSARY.md`.
- Update the "Desktop-only" description of the tour wherever it appears in
  `docs/` (grep for it; `docs/MOBILE_EDITOR.md` names the mobile tour as the
  remaining gap — mark it closed).

Do not touch `docs/FLOW.md` unless you add or remove a route, server action,
service client or env var. This change should not.

## 5. Out of scope

- Tap-to-edit on the rendered card (research Option E).
- Any change to the desktop tour's steps, copy or geometry.
- Any change to `completeSectionEditorTourAction` or the `cards` schema.
- The two open cosmetic items on the mobile rail (the gold button wrapping to
  two lines at the last step; the primary action appearing in both the header
  and the rail). Leave them alone.

## 6. How I will check your work

I will run these myself, not read them from your report:

1. `npm run lint` → 0 errors, 7 pre-existing warnings.
2. `node docs/ui-glossary/validate.mjs` → passes.
3. At 390×844, signed in as `kamy@gmail.com`: the tour auto-launches for a
   fresh draft, all five steps highlight a real element, and at no point does
   the panel cover its own highlight or sit under the rail.
4. Bantuan is reachable on mobile and replays from step one.
5. Bantuan pressed while the ☰ stack pane is open does not crash.
6. Escape and the dismiss control both settle the tour, and it does not
   relaunch on reload.
7. At 1280px: the desktop tour is byte-for-byte the same experience — five
   steps, same copy, panel below/above the rect as before.

Report what you did, what you verified with actual output, and anything you
could not do or disagreed with. Do not claim a check passed that you did not
run.

---

# Addendum A — the Susun Bahagian step (user request, 2026-09-13)

The customer asked for one more mobile helper: a step that takes them to the
**Bahagian** screen, tells them the Section stack can be rearranged, points at
the drag handle with an animated arrow, and returns to the editor when they
press Seterusnya.

This **overrides hard constraint 2 in part**, and that is deliberate — it is
the customer's explicit decision, not your judgement or mine. Read the new
boundary carefully:

- The tour **may now drive one piece of ephemeral shell state**: which mobile
  pane is showing (`mobilePane`).
- The tour **still owns no editor data**. It must not touch `activeIdx`,
  `sheetDetent`, the draft, `updateData`, `scheduleSave`, `saveDraft`, or
  `PATCH /api/cards/[id]/draft`. The completion marker remains its only
  persistence.
- The tour must not reach into the DOM to change panes. Add an explicit
  callback prop that `SectionEditor` implements — the editor stays the owner
  of its own state.

## A1. The step

Mobile list becomes **six** steps. The new one is inserted **after** the
navigation rail step and **before** the payment step, because the rail step is
where ☰ is introduced:

1. Kad Jemputan Anda (canvas) — unchanged
2. Borang Bahagian (sheet) — unchanged
3. Ketinggian Borang (detents) — unchanged
4. Pandu Bahagian (rail) — unchanged
5. **Susun Bahagian (new)**
6. Teruskan ke Pembayaran — unchanged

The desktop list stays at five. Do not touch it.

Malay copy for step 5, in the tone of the existing steps: this is the full
list of Sections in your invitation; drag the ⋮⋮ handle to change the order,
tap 👁 to turn a Section off without deleting it, and × removes it. Keep it to
two or three short sentences.

## A2. Entering and leaving the step

- Declare the requirement on the step itself (for example a
  `pane: "stack"` field on `TourStep`), rather than hardcoding "if stepIdx
  === 4". A later step insertion must not silently break it.
- Add an optional prop — `onRequestPane?: (pane: "edit" | "stack") => void`
  — and have `SectionEditor` pass `setMobilePane`. Do not add it to the
  desktop path.
- **Remember the pane the customer was on when the tour opened**, and restore
  it on every exit from the step: Seterusnya, Kembali, ×, Escape, and
  completion. The customer's words were *"clicking 'next' will go back to the
  editor page"* — that is the primary case, but every other exit must not
  strand them on the Bahagian screen either.
- Switching panes changes the DOM under the open tour. The highlight is
  measured once per step via rAF, so re-measure after the pane switch commits
  or the ring will be anchored to the old layout. This is exactly the stale
  ring you already guarded with `setRect(null)`; make sure the guard covers
  this path too, and verify it in the browser rather than reasoning about it.
- If the stack is scrolled, bring the highlighted row into view before
  measuring.

## A3. The arrow

- Point it at the **drag handle** (`.se-handle`, the `⋮⋮` span, `aria-label`
  "Susun semula") of the first Section row — the handle is what conveys
  "drag to reorder".
- Animate it **vertically**, a slow up-and-down oscillation, because the
  gesture it describes is a vertical drag. Not a spin, not a pulse.
- Gold accent (`var(--accent)`), `pointer-events: none`, above the dim
  overlay and the ring, `aria-hidden` — it is decoration, the copy carries
  the meaning for a screen reader.
- **Respect `prefers-reduced-motion: reduce`**: the arrow still shows, it
  just stops moving. Put that in its own `@media (prefers-reduced-motion:
  reduce)` block, as `app/globals.css` already does for `.se-sheet`.
- Keyframes go in `app/globals.css`. Scope them to the mobile block so
  nothing leaks into the desktop tour.

## A4. What this step cannot do

The tour's blocker swallows pointer events on the page, so the customer
**cannot actually drag a row while the step is open** — and that is fine. This
step shows that reordering is possible; it does not teach the gesture by
doing. Do not try to make dragging live under the overlay, and do not
special-case pointer events through the blocker.

## A5. Documentation

- **Amend D28**, do not add a new record. D28 was written earlier today on
  this branch and has never been merged, so it is not yet history — it is the
  decision for this change, and the customer has refined it before it ships.
  It currently says the tour never drives `mobilePane`; that sentence is now
  wrong. Record the real boundary: one piece of ephemeral shell state, driven
  only through an editor-owned callback, restored on every exit, with card
  data still untouched. Leave D16 alone.
- Update the `SectionEditorTour` row in `docs/FLOW.md` for the six-step mobile
  list and the pane callback.
- Add the arrow and the Bahagian step to `docs/ui-glossary/data/` if they
  introduce a named part, and re-run `node docs/ui-glossary/validate.mjs`.

## A6. How I will check it

1. Lint and the glossary validator, as before.
2. At 390x844: six mobile steps. Step 5 switches to the Bahagian screen, the
   ring frames a Section row, the arrow sits on the drag handle and is
   animating.
3. Seterusnya from step 5 returns to the card **and** advances to the payment
   step.
4. Kembali from step 5 returns to the card and goes back to the rail step.
5. × and Escape during step 5 both return to the card.
6. Opening the tour while already on the Bahagian screen, walking to step 5
   and out, leaves the customer on the Bahagian screen — the pane they
   started on.
7. With `prefers-reduced-motion: reduce` emulated, the arrow is visible and
   static.
8. Desktop at 1280px: still five steps, unchanged.
