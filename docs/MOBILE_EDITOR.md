# Mobile Section editor — research and recommendation

**Task:** KJ-1 · Make editing a customer card mobile-friendly.
**Status:** research complete, no production code changed by this document.
**Companion artifact:** [`docs/mobile-editor-lab/index.html`](./mobile-editor-lab/index.html)
— an interactive lab that renders each candidate shell at real phone widths so
the options can be judged side by side instead of on paper.

This document does three things: it states precisely what breaks today and why,
it works through six candidate shells one by one, and it recommends a hybrid —
Option C's always-visible card carrying Option D's stepper.

---

## 1. What the editor is today

`/dashboard/cards/[id]/edit` renders `components/SectionEditor.tsx` (2,595
lines, one client component) inside the `(dashboard)` layout, which also paints
the **Navbar** and the **Footer** (`app/(dashboard)/layout.tsx:22-25`).

The editor's own shell is a three-pane grid:

```
components/SectionEditor.tsx:2177
const threePaneStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "260px 1fr 360px",
  ...
}
```

| Pane | Contents | Style |
|---|---|---|
| Left — **Section stack** | Gaya panel, sortable Section rows, "+ Tambah Bahagian" | `sidebarStyle:2186`, sticky `top: 80` |
| Centre — **Sub-form** | Variant gallery + the active Section's fields | `centerStyle:2231`, padding 24 |
| Right — **Live preview** | `PhonePreview` bezel + `SectionInvitationCard` | `previewPaneStyle:2456`, sticky `top: 80` |

The interaction model is *three simultaneous panes*: pick on the left, type in
the middle, watch on the right. Every part of that model assumes ≥ 1024 px.

---

## 2. Diagnosis — what actually breaks on a phone

Grouped by class, because the classes have different fixes and different owners.

### 2.1 Structural — the shell cannot respond at all

The editor styles itself almost entirely with inline `CSSProperties` objects
(≈ 60 of them, `SectionEditor.tsx:1977-2595`). **Inline styles cannot carry a
media query.** This is the root cause, and it is not a detail: no amount of
Tailwind added around the edges fixes the shell while `threePaneStyle` is an
inline object. The fixed grid `260px 1fr 360px` plus `gap: 16` and
`padding: 16` needs ≈ 700 px before the centre column has *any* room; on a
390 px viewport the three columns are crushed or the page scrolls sideways.

Consequences that follow from the same root:

- Both side panes are `position: sticky; top: 80` — tuned to the 58 px Navbar
  (`--navbar-height`) plus the editor's own sticky top bar. Stacked vertically
  on a phone, two sticky panes at `top: 80` would pin on top of each other.
- `modalStyle` (`:2570`) is `width: 360` with **no `maxWidth`** — the "Tambah
  Bahagian" picker is edge-to-edge on a 360 px device and clipped below it.
- `gayaListStyle` (`:2411`) caps at `maxHeight: 300` with its own inner scroll
  — a nested scroll region inside an already-scrolling page.
- `previewToolbarStyle` (`:2465`) is `width: 340` fixed.
- `errorBannerStyle` (`:2512`) is `position: fixed; bottom: 24` — it lands
  under the software keyboard.
- The page is `minHeight: "100vh"` (`pageStyle:1977`), not `100dvh`, so mobile
  browser chrome adds a phantom scroll.

### 2.2 The preview is a phone inside a phone

`PhonePreview` draws a 340 × 712 device bezel (`PhonePreview.tsx:38-48`) whose
entire purpose is to simulate a phone on a desktop screen. On an actual phone
it is pure waste: bezel chrome, a hard-coded aspect ratio, and a nested scroll
container, all to show a mobile rendering *on a mobile device*. Any mobile
shell must be able to render the card at native width with no bezel.

This matters more than it sounds. The live preview is the product's core
promise — the customer is buying a beautiful card and wants to see it. On a
phone, screen space is the scarcest resource, and the preview is competing for
it with the form. **Every candidate below is really an answer to one question:
how do form and preview share one small screen?**

### 2.3 Touch and input ergonomics

| Issue | Evidence | Effect on a phone |
|---|---|---|
| Drag to reorder uses `PointerSensor` with `distance: 4` | `:1173` | A 4 px pointer move fires a drag. On touch, that is indistinguishable from a scroll — the list either hijacks scrolling or drags by accident. dnd-kit's own guidance is a `TouchSensor` with `{ delay: 200, tolerance: 5 }` and `touch-action: none` **only on the handle**. |
| Drag handle is a `⋮⋮` text glyph, `fontSize: 14` | `dragHandleStyle:2215` | ≈ 14 × 14 px target. Apple's HIG minimum is 44 × 44 pt; Material's is 48 dp. |
| Eye / × row buttons are `padding: 4`, `fontSize: 14` | `iconBtnStyle:2222` | ≈ 22 px targets, sitting 8 px apart — mis-taps are the default outcome. |
| Text inputs are `fontSize: 14` | `inputStyle:2262` | iOS Safari **auto-zooms the whole page** on focus for any input under 16 px, then leaves the viewport zoomed. This alone makes the current form feel broken. |
| No `inputMode` / `autocomplete` hints anywhere | generic fields, `GenericForm` | Phone and date fields get the full QWERTY keyboard. |
| Photo upload already offers camera *and* gallery | `sections/_image_upload.tsx:101` (`accept="image/*"`) | Nothing to add: `accept="image/*"` lets the OS offer the camera and the photo library. Adding `capture` would force camera-only and remove the gallery — a regression. |
| No visual-viewport handling | — | When the keyboard opens, the sticky top bar and any bottom action bar are wrong by ~300 px. |

### 2.4 Onboarding was explicitly desktop-only — closed by KJ-2

`SectionEditorTour` gates on `DESKTOP_TOUR_QUERY = "(min-width: 1024px)"`
(`SectionEditorTour.tsx:35`), and the "Bantuan" replay button is rendered only
when `isDesktop` (`SectionEditor.tsx:826`). The spotlight geometry assumes the
three panes exist. A mobile user today gets a broken layout *and* no guidance.

**Closed (KJ-2).** Both gates are gone and `SectionEditorTour` now carries a
`MOBILE_STEPS` list beside `STEPS`, selected on the same viewport signal, with
its own full-bleed geometry that reserves the navigation rail. The six mobile
targets are the Live card canvas, Form sheet, Sheet detent control, Navigation
rail, the Section stack screen (Susun Bahagian, with an animated reorder hint
arrow on the first row's drag handle), and the shared Continue to payment
button. The tour opens the Section stack screen for that step through an
editor-owned pane callback and restores the starting pane on every exit. The
desktop tour is unchanged, and both viewports share the one account-level
completion marker.

### 2.5 Chrome tax

On a phone the editor is wrapped in Navbar + Footer *and* its own sticky top
bar. Three bands of chrome around a form that has no room to begin with. The
`(invite)` and `(preview)` route groups already establish the precedent that a
surface may opt out of Navbar/Footer.

---

## 3. Constraints the answer has to respect

1. **One component, several entitlement flows.** `SectionEditor` serves the
   unpaid draft, the manual **paid draft**, the admin **controlled
   replacement**, and the post-publication **revision window** — each with a
   different primary action in the top bar (`:794-930`). A mobile shell must
   host all four, not just the happy path.
2. **Section-v2 is the data model, and it is good.** Sections are an ordered
   list of typed instances with variants (`docs/ARCHITECTURE.md`). A linear,
   list-shaped model maps naturally onto a phone. No data work is needed — this
   is a presentation problem.
3. **Autosave already exists** (1.5 s debounce, `SAVE_DEBOUNCE_MS`, plus a
   localStorage cache and a `draft_version` conflict check). Mobile sessions
   are interruption-prone; this machinery is exactly right and must not be
   bypassed by a new shell.
4. **The editor is the paywall funnel.** The top bar's price button is how a
   draft becomes an order. Whatever the mobile shell, the primary action cannot
   be buried.
5. **Malay-first copy.** Labels are longer than their English equivalents
   ("Maklumat Majlis", "Jadual Berbilang Hari") — a tab bar with text labels
   will not fit five items at 360 px.
6. **No test suite.** `npm run lint` is the only automated gate
   (`AGENTS.md`), so any change must be verifiable by eye in a real browser at
   real widths. That is precisely what the lab artifact is for.

---

## 4. Candidates, one by one

Each is scored on: *card visibility* (can the customer see what they are
buying), *form comfort*, *Section-stack management*, *build cost*, and *risk of
regressing desktop*.

---

### Option A — Responsive reflow: stack the three panes

**What.** Replace `threePaneStyle` with a CSS class that is `grid-cols-[260px_1fr_360px]` at `lg:` and a single column below. Panes stack: Section stack → sub-form → preview.

**Precedent.** The default answer for any three-pane admin UI.

**In this codebase.** Requires migrating at least the shell styles from inline objects to Tailwind/`globals.css`. Cheapest possible change: roughly the shell, the two sticky offsets, and the modal width.

**Verdict — necessary but not sufficient.** It stops the horizontal overflow, so it is the correct *first commit*. But as a final answer it is poor: the preview ends up below a form that is 800–2,000 px tall depending on Section, so **the customer never sees the card while typing**. The live-update promise ("Kemas kini secara langsung", `:1145`) silently dies. Worse, a customer must scroll past the whole Section list to reach the form, then past the whole form to reach the preview, for every single edit.

| card visibility | form comfort | reorder | cost | desktop risk |
|---|---|---|---|---|
| ✗ poor | ○ ok | ○ ok | **very low** | very low |

---

### Option B — Segmented panes: *Bahagian · Sunting · Pratonton*

**What.** Keep exactly three panes, but on mobile show one at a time behind a segmented control (the same control already used for Telefon/Lebar, `segmentBtnStyle:2495`). Tapping a Section row switches to *Sunting*; a "Lihat" button switches to *Pratonton*.

**Precedent.** Squarespace's mobile editor, WordPress mobile admin, most CMS phone UIs.

**In this codebase.** Very natural. The three panes are already three JSX blocks with no shared layout logic. A `mobilePane` state plus conditional rendering gets ~90 % of it. Desktop renders all three, untouched.

**Verdict — the strongest low-cost option.** Each pane gets the full screen, so the form is comfortable and the preview is full-bleed and honest. The cost is **modality**: seeing your edit requires a deliberate tab switch, so the feedback loop goes from continuous to ~2 taps. For a customer choosing a Gaya or a variant — a visual decision — that loop is too slow.

| card visibility | form comfort | reorder | cost | desktop risk |
|---|---|---|---|---|
| ○ on demand | ✓ good | ✓ good | **low** | low |

---

### Option C — Canvas-first with a bottom-sheet inspector

**What.** The card owns the screen. The live preview renders full-bleed at native width with no bezel. The form lives in a bottom sheet with three detents — *peek* (~30 %, showing the Section name and a handle), *half* (~55 %, the comfortable editing height), *full* (~92 %, for long Sections like Galeri or Kisah Cinta). Dragging the sheet down reveals more card; the card stays visible at every detent above *peek*.

**Precedent.** This is how Canva, Figma, and Wix all solved the same problem, and it is the pattern [NN/g](https://www.nngroup.com/articles/bottom-sheet/) recommends for exactly this case: keeping the main document visible while offering contextual controls. A [canvas app write-up](https://dev.to/rocketsquirreldev/making-a-canvas-based-web-app-mobile-friendly-deskflow-v118-2dnk) describes the same move — give the canvas 100 % of the viewport and push side panels into a drawer and a sheet.

**In this codebase.** The most work of any option. Needs: a sheet component with detents and drag (none exists — `components/ui/` has `dialog` but no sheet), full-bleed preview mode in `PhonePreview`, sheet-aware scroll containment, and visual-viewport handling so the sheet sits above the keyboard rather than under it.

**Verdict — the best *feel*, and the right destination.** It preserves the product's core promise on the smallest screen: the customer is always looking at their card. The risk is that it is the option most likely to be half-built. Detent physics, scroll chaining, and keyboard interplay are genuinely fiddly, and done badly a sheet is worse than a tab.

| card visibility | form comfort | reorder | cost | desktop risk |
|---|---|---|---|---|
| ✓✓ always | ✓ good | ○ needs its own surface | **high** | low (mobile-only branch) |

---

### Option D — Guided wizard: one Section per step

**What.** Drop the simultaneous model entirely. Walk the customer through their Sections in order — *Pembukaan → Maklumat Majlis → Atur Cara → …* — one full-screen step each, with a progress rail, Back/Next, and a preview of that Section pinned above the fields. Reordering, enabling/disabling and adding Sections move into a separate "Susun bahagian" screen.

**Precedent.** Typeform, mobile checkout flows, and — most relevantly — the onboarding flows of every wedding-invitation competitor in this market.

**In this codebase.** `statuses[i]` per Section already exists (complete/draft/error, used by `StatusDot`), which is exactly the progress model a wizard needs. But it fights the current mental model: the Section stack *is* the navigation today, and the tour teaches it that way.

**Verdict — excellent for the first card, wrong for the fifth edit.** A first-timer on a phone is well served by "tell me what to fill in next". A returning customer in a 7-day revision window who wants to fix one typo in Maklumat Majlis is badly served by a 9-step wizard. Its real value is as an *optional overlay* on whatever shell wins — a "Panduan langkah demi langkah" mode — not as the shell itself.

| card visibility | form comfort | reorder | cost | desktop risk |
|---|---|---|---|---|
| ○ per-step | ✓✓ excellent | ✗ needs separate screen | medium | medium |

*D's* Kembali */* Seterusnya *pair does not have to come with D's full-screen
step, though. Pulled out of the wizard and dropped into Option C's rail, it
fixes C's one real weakness — see §5.2.*

---

### Option E — Direct manipulation: tap the card to edit it

**What.** No Section list on mobile at all. The customer scrolls their actual card; each rendered Section carries a tap target ("Sunting bahagian ini"); tapping opens that Section's fields. The card *is* the navigation.

**Precedent.** Squarespace 7.1's in-context editing, Shopify's theme editor preview-tap, Webflow mobile.

**In this codebase.** Interesting, because half of the wiring exists: the editor already scrolls the preview to the selected Section via `previewScroll` / `scrollTargetId` / `scrollToken` (`:176-185`, passed to `SectionInvitationCard`). The reverse direction — preview → editor — is the missing half.

**Verdict — the most delightful, the most fragile.** Section renderers are 20 independent components with many variants (`components/sections/*/index.tsx`); injecting reliable, non-intrusive tap targets into all of them without polluting the *published guest* rendering is a large, spread-out change with real risk of leaking editor chrome into the customer-facing invitation. Disabled Sections have no rendered target at all, so it cannot be the only navigation. **Best adopted as an enhancement on top of another shell**, not as the shell.

| card visibility | form comfort | reorder | cost | desktop risk |
|---|---|---|---|---|
| ✓✓ always | ○ ok | ✗ none | high (spread across 20 modules) | **medium-high** |

---

### Option F — A separate `SectionEditorMobile` route/component

**What.** Not a layout at all — a delivery strategy. Branch at the page level and render a purpose-built mobile editor, sharing the state hooks but none of the layout.

**Verdict — rejected as a strategy, though tempting.** `SectionEditor` holds the autosave debounce, draft-version conflict handling, localStorage cache, validation, publication dialog, payment dialog, replacement and revision-window logic. Forking the shell means either duplicating that (two code paths for money and publication — unacceptable) or extracting it all into hooks first (a large refactor before any user-visible improvement). The same visual outcome is reachable by branching *only the layout* inside the existing component. **Do that instead**: one component, one state model, a `useIsMobile()` branch around the shell JSX.

*(For the record, the two non-solutions: a "please use a desktop" interstitial fails the market — Malaysian customers buying a wedding invitation are on a phone — and forcing landscape is hostile and does not survive rotation lock.)*

---

## 5. Recommendation — a hybrid, in four phases

**Short version: Option C's shell, Option D's rail.** Phases below.

No single option wins. A + C is the spine; B is the fallback; D and E are
opt-in layers. Sequenced so that **every phase ships value on its own** and
nothing is wasted if a later phase is deferred.

### Phase 0 — Foundations (do this regardless of which shell wins)

Independent of layout, low risk, immediately felt:

1. Move the shell styles that need breakpoints out of inline `CSSProperties`
   and into Tailwind classes or `globals.css`. Start with `threePaneStyle`,
   `sidebarStyle`, `previewPaneStyle`, `centerStyle`, `modalStyle`,
   `previewToolbarStyle`. *This unblocks everything else.*
2. Inputs to `font-size: 16px` on mobile (`inputStyle:2262`) — kills the iOS
   focus-zoom.
3. Touch targets to ≥ 44 px: `iconBtnStyle`, `dragHandleStyle`,
   `segmentBtnStyle`, picker rows.
4. Add a `TouchSensor` with `{ delay: 200, tolerance: 5 }` alongside the
   existing `PointerSensor`, and `touch-action: none` on the drag handle only
   ([dnd-kit touch sensor docs](https://docs.dndkit.com/api-documentation/sensors/touch)).
5. `100dvh` for `pageStyle`; `visualViewport`-aware positioning for
   `errorBannerStyle` and any bottom action bar.
6. `inputMode` / `autocomplete` on generic fields; `accept="image/*"` on
   `ImageUploadField` already offers camera *and* gallery, so do **not** add
   `capture` (it would force camera-only).
7. `modalStyle`: `width: min(360px, calc(100vw - 32px))`.

### Phase 1 — Ship Option B (segmented panes)

The cheapest shell that makes editing genuinely *possible* on a phone. Three
segments, one visible pane, full-bleed preview (Phase 1 also adds a
`bezel: false` mode to `PhonePreview` — a phone frame inside a phone is
noise). Keep desktop's three-pane grid exactly as it is.

This is the safety net: if Phase 2 slips, the feature is still shipped.

### Phase 2 — Upgrade the *Sunting* pane to **C + D**

<a id="52"></a>Replace the *Sunting* segment with the canvas-first sheet:
preview always behind, form in a three-detent sheet. Then take D's stepper out
of the wizard and put it in C's rail.

**Why the two belong together.** Each fixes the other's defect.

- Option C on its own has nowhere good to put *navigation*. Changing Section
  means leaving the card for a list screen and coming back — three taps to move
  one Section along, which is the ordinary case, not the exception.
- Option D on its own is rigid: a 9-step full-screen wizard is the wrong shape
  for a returning customer fixing one line, and it has nowhere to put
  reordering at all.

Combined, the rail carries the navigation and the list becomes optional:

```
┌──────────────────────────────────────┐
│  live card, full-bleed, native width │   ← always visible
│  ┌────────────────────────────────┐  │
│  │ ▁▁▁ grabber                    │  │
│  │ ▰▰▰▰▰▱▱▱   progress            │  │   ← which Section, out of how many
│  │ ● Maklumat Majlis   2/8  ▁▄█   │  │   ← status · name · count · detents
│  │ …fields…                       │  │
│  └────────────────────────────────┘  │
│  [ ← Kembali ] [ ☰ ] [ Seterusnya → ]│   ← D's stepper; ☰ is the old Bahagian
└──────────────────────────────────────┘
```

**Design decisions this settles:**

1. ***Bahagian* shrinks from a pane to one ☰ icon.** It stops being the only
   way to change Section and becomes what it is actually good at: jumping to a
   distant Section, reordering, enabling/disabling, and adding. Drag-to-reorder
   keeps a full-screen surface with room for 44 px handles — the thing a bottom
   sheet has nowhere to put.
2. **The stepper skips disabled Sections.** A disabled Section renders nothing
   on the card, so stepping onto it would show a form with no visible effect.
   They stay reachable from ☰. The counter therefore reads *2 / 8*, not
   *2 / 9*, when one of nine Sections is off.
3. **The card follows the step.** `SectionEditor` already has this machinery —
   `previewScroll` / `scrollTargetId` / `scrollToken` (`:176-185`) drive the
   desktop preview exactly this way. The mobile stepper reuses it rather than
   inventing anything.
4. **The last step becomes the funnel.** On the final Section, *Seterusnya*
   turns into *Terbitkan* / *Teruskan ke pembayaran*. This is a genuine
   product win, not just a layout one: constraint 4 in §3 says the primary
   action cannot be buried, and here the natural end of the guided path *is*
   the primary action. Note this must respect the entitlement flow — an unpaid
   draft ends at payment, a revision window ends at *Terbitkan perubahan*, a
   controlled replacement ends at the admin cutover notice.
5. **It solves the Malay-label width problem** (constraint 5). Two text
   buttons plus one icon fit at 360 px; three text segments do not.

The remaining cost is that a stepper implies an order, and the customer may not
think of their card as a sequence. Mitigation: the progress rail is
informational, ☰ is always one tap away, and nothing forces a linear pass —
this is a *shortcut*, not a wizard.

### Phase 3 — Layer E, and D's guided framing, as options

- **E as an enhancement:** once the preview is full-bleed and always visible,
  adding a tap-to-edit affordance to the *rendered* Sections becomes a small
  increment rather than a rewrite — and it can be added Section type by
  Section type, starting with the highest-traffic ones (Pembukaan, Maklumat
  Majlis, Atur Cara).
- **D's framing, once, for a first-timer:** Phase 2 already gives a first-time
  customer a guided path — the stepper walks their Sections in order and ends
  at payment. What is left of D is only the *framing*: copy that says "Langkah
  2 daripada 8, isi maklumat majlis anda". That belongs in the mobile tour,
  not in a separate mode.

### Also required, at whichever phase touches it

- **Escape the chrome.** Give the editor route a mobile treatment without the
  Footer, following the `(invite)` / `(preview)` precedent — or at minimum
  hide the Footer on the editor at mobile widths.
- **Un-gate the tour.** ✅ Done (KJ-2). `DESKTOP_TOUR_QUERY` and the `isDesktop`
  guard on the Bantuan button no longer suppress the tour; they select between
  a five-step desktop list and a six-step mobile list. The mobile steps match the
  canvas-first shell (Live card canvas, Form sheet, Sheet detent control,
  Navigation rail, Section stack screen for Susun Bahagian), and the shared
  Continue to payment button closes it. A mobile customer gets the tour rather
  than a hidden control.

---

## 6. How to judge this

Open [`docs/mobile-editor-lab/index.html`](./mobile-editor-lab/index.html). It
renders Options A, B, C and D — and the recommended **C + D** combination —
as switchable prototypes inside a 390 × 844 frame, with real Section names and
the app's own tokens, so the trade-offs in §4 can be felt rather than read. In
the C + D prototype the Kembali / Seterusnya rail steps through the Sections,
skipping the disabled one, and the card scrolls to keep up. Nothing in it is wired to the app — it exists
to settle the shell decision before any of `SectionEditor.tsx` is touched.

Once a shell is chosen, verification is manual (there is no test suite):

```sh
npm run lint
npm run dev   # then DevTools device toolbar at 360 / 390 / 414 px, plus a real phone
```

Checks that matter: no horizontal scroll at 360 px; focusing any input does not
zoom on iOS Safari; the Section list scrolls without triggering a drag; the
primary action (price / Terbitkan) is reachable with the keyboard open; the
card is visible while typing.

---

## Sources

- [Bottom Sheets: Definition and UX Guidelines — Nielsen Norman Group](https://www.nngroup.com/articles/bottom-sheet/)
- [Sheets: bottom — Material Design](https://m2.material.io/components/sheets-bottom)
- [Making a Canvas-Based Web App Mobile Friendly — DEV](https://dev.to/rocketsquirreldev/making-a-canvas-based-web-app-mobile-friendly-deskflow-v118-2dnk)
- [How to design bottom sheets for optimized UX — LogRocket](https://blog.logrocket.com/ux-design/bottom-sheets-optimized-ux/)
- [Touch sensor — @dnd-kit documentation](https://docs.dndkit.com/api-documentation/sensors/touch)
- [Pointer sensor — @dnd-kit documentation](https://docs.dndkit.com/api-documentation/sensors/pointer)
- [Dragging with PointerSensor does not work well on touch devices — dnd-kit #435](https://github.com/clauderic/dnd-kit/issues/435)
