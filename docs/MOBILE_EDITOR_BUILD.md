# KJ-1 build spec — mobile Section editor

Implementation plan for the shell chosen in [`docs/MOBILE_EDITOR.md`](./MOBILE_EDITOR.md):
**Option C + D** — the live card owns the screen, the form lives in a bottom
sheet, and the rail carries *Kembali* / *Seterusnya* with *Bahagian* as one ☰
icon. Reference prototype: [`docs/mobile-editor-lab/index.html`](./mobile-editor-lab/index.html)
(the **C + D** option, which is the default selection). Match its behaviour.

Read `AGENTS.md` and `CLAUDE.md` first. They are binding.

---

## 0. Environment (already provisioned — do not re-provision)

This worktree was set up with the BB Worktree Setup plugin. It has its own
isolated Supabase stack and its own app port. **Never point it at a shared or
hosted database.**

| Thing | Value |
|---|---|
| Worktree | `/home/user/.bb/plugins/environment-git-worktree/host-data/worktrees/thr_e7recfsvyg-1/kamy-jemput` |
| Branch | `bb/kj-1-make-editing-customer-card-mobile-friendly-thr_e7recfsvyg` |
| Supabase project | `kamy-wt-4e3fd182c5b22a67` |
| Supabase API | `http://127.0.0.1:48550` |
| Supabase Studio | `http://localhost:48553` |
| App | `http://localhost:48558` |

Run the dev server **only** through the wrapper, which pins the allocated port:

```sh
python3 "$HOME/.bb-setup/lib/kamy-worktree-entry.py" dev
```

(A dev server may already be running on 48558 — check before starting another.)

Seeded accounts, password `123` for both:

| Email | Role |
|---|---|
| `kamy@gmail.com` | customer |
| `kamy.admin@gmail.com` | admin |

Sign in as the customer at `http://localhost:48558/login`, open a card from the
dashboard, and you are on the editor at `/dashboard/cards/[id]/edit` — the
surface this spec changes.

---

## 1. Hard constraints

1. **Desktop must not change.** Every change is either gated on `!isDesktop`
   in JS or lives inside `@media (max-width: 1023px)` in CSS. At ≥ 1024px the
   editor must render and behave exactly as it does today. Verify this.
2. **Do not touch the money or lifecycle logic.** Autosave (`SAVE_DEBOUNCE_MS`,
   `saveDraft`), `draft_version` conflict handling, the localStorage cache,
   validation, the publication dialog, `PaymentMethodDialog`, controlled
   replacement and the revision window all stay exactly as they are. You are
   changing *layout and navigation only*.
3. **One component.** Do **not** create a `SectionEditorMobile`. Branch the
   shell JSX inside `components/SectionEditor.tsx`. `useIsDesktopViewport()` is
   already imported there and `const isDesktop = useIsDesktopViewport()` already
   exists at line 409 — use it.
4. **UI copy is Malay.** Follow `docs/GLOSSARY.md` canonical terms in code,
   comments and commit messages.
5. **Two commits**, in this order. Do not squash them.

---

## 2. Commit 1 — Phase 0 foundations

These are needed whichever shell wins and are low risk. Land them first so the
shell work sits on a clean base.

### 2.1 Give the editor root a hook for CSS

`components/SectionEditor.tsx`, the outer `<div style={pageStyle}>` (both the
`!mounted` early return and the main return): add `className="section-editor"`.
Everything below targets that class.

### 2.2 16px inputs (kills iOS focus-zoom)

In `app/globals.css`, inside the existing `@layer components` block:

```css
@media (max-width: 1023px) {
  .section-editor input,
  .section-editor textarea,
  .section-editor select { font-size: 16px; }
}
```

Do **not** change `inputStyle()` in the TSX — that would move desktop too.

### 2.3 44px touch targets

Add `className="se-iconbtn"` to the two icon buttons in `SidebarRow` (the
👁/⊘ toggle and the × remove) and `className="se-handle"` to the drag-handle
`<span>`. Then:

```css
@media (max-width: 1023px) {
  .section-editor .se-iconbtn,
  .section-editor .se-handle {
    min-width: 44px; min-height: 44px;
    display: grid; place-items: center;
  }
  .section-editor .se-row { min-height: 56px; }
}
```

Add `className="se-row"` to the `<li>` in `SidebarRow` as well.

### 2.4 Drag that touch can tell apart from a scroll

`useDndSensors()` (≈ line 1171). Import `TouchSensor` from `@dnd-kit/core` and
add it alongside the existing `PointerSensor`:

```ts
useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
```

Add `touchAction: "none"` to `dragHandleStyle` — **on the handle only**, so the
list itself still scrolls.

### 2.5 Viewport units and chrome

- `pageStyle.minHeight`: `"100dvh"` instead of `"100vh"`.
- `modalStyle.width`: `"min(360px, calc(100vw - 32px))"`.
- Hide the dashboard Navbar and Footer on mobile while the editor is mounted.
  `Navbar`'s root is a `<header>`, `Footer`'s root is a `<footer>`:

  ```css
  @media (max-width: 1023px) {
    body:has(.section-editor) > header,
    body:has(.section-editor) footer { display: none; }
  }
  ```

  Confirm the selector actually matches in the browser — adjust if the Navbar
  is nested rather than a direct child.

### 2.6 Keyboard-aware bottom edge

Set a CSS variable from the visual viewport so anything pinned to the bottom
can sit above the software keyboard. Add an effect in `SectionEditor`:

```ts
useEffect(() => {
  const vv = window.visualViewport
  if (!vv) return
  const sync = () => {
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    document.documentElement.style.setProperty("--kb-inset", `${inset}px`)
  }
  sync()
  vv.addEventListener("resize", sync)
  vv.addEventListener("scroll", sync)
  return () => {
    vv.removeEventListener("resize", sync)
    vv.removeEventListener("scroll", sync)
    document.documentElement.style.removeProperty("--kb-inset")
  }
}, [])
```

Then `errorBannerStyle.bottom` becomes
`"calc(var(--kb-inset, 0px) + env(safe-area-inset-bottom, 0px) + 24px)"`.

### 2.7 Keyboard hints on generic fields

In `GenericForm`, set `inputMode` from the field key: `"tel"` for keys matching
`/phone|tel|no_tel|whatsapp/i`, `"url"` for `/url|link|pautan/i`,
`"email"` for `/email|emel/i`. Leave everything else alone.

**Do not add `capture` to `ImageUploadField`.** It already has
`accept="image/*"` (`components/sections/_image_upload.tsx:101`), which lets the
OS offer camera *and* gallery. `capture` would force camera-only and remove the
gallery — a regression. (`docs/MOBILE_EDITOR.md` §2.3 suggests `capture`; that
line is wrong and should be corrected to say `accept="image/*"` is already
sufficient. Fix it in this commit.)

**Commit 1 message:** `Make the Section editor usable under touch`

---

## 3. Commit 2 — the C + D mobile shell

Only renders when `!isDesktop`. The existing three-pane JSX stays untouched and
is what renders when `isDesktop`.

### 3.1 New state

```ts
const [mobilePane, setMobilePane] = useState<"edit" | "stack">("edit")
const [sheetDetent, setSheetDetent] = useState<"peek" | "half" | "full">("half")
```

### 3.2 A bare preview mode

`components/PhonePreview.tsx` currently renders a 340×712 device bezel. A phone
frame inside a phone is noise. Add a third mode:

```ts
mode: "phone" | "wide" | "bare"
```

`"bare"` renders `children` in a full-bleed scroll container (`width:100%`,
`height:100%`, `overflowY:auto`, `className="phone-scroll"`) with no bezel, no
aspect ratio, no border. Keep `"phone"` and `"wide"` exactly as they are.

### 3.3 Which Sections the stepper walks

Disabled Sections render nothing on the card, so stepping onto one shows a form
with no visible effect. Derive the walk list from enabled Sections only:

```ts
const walk = useMemo(
  () => data.sections.map((s, i) => (s.enabled ? i : -1)).filter((i) => i >= 0),
  [data.sections],
)
const walkPos = walk.indexOf(activeIdx)
```

Disabled Sections stay reachable from the ☰ stack screen. The counter reads
`walkPos + 1` / `walk.length`.

### 3.4 Layout

```
<div className="section-editor se-mobile">
  {existing <header style={topBarStyle}> — reused as-is}

  {mobilePane === "stack" ? (
     full-screen Section stack: the existing <GayaPanel>, <DndContext>/
     <SortableContext>/<SidebarRow> list and "+ Tambah Bahagian" button,
     lifted out of the desktop <aside> so both shells render the same rows
  ) : (
     <div className="se-canvas">
       <PhonePreview mode="bare"><SectionInvitationCard …/></PhonePreview>
     </div>
     <div className="se-sheet" data-detent={sheetDetent}>
       <div className="se-grabber" />                 ← drag to change detent
       <div className="se-progress">…walk.length bars…</div>
       <div className="se-sheethead">
         <StatusDot/> <b>{label}</b> <span>{walkPos+1} / {walk.length}</span>
         <detent buttons ▁ ▄ █>
       </div>
       <div className="se-sheetbody"><SubForm …/></div>
     </div>
  )}

  <div className="se-rail">
    <button ← Kembali>  <button ☰>  <button Seterusnya →>
  </div>
</div>
```

Extract the Section-stack block and the `SubForm` call into small local
components or variables so they are written once and used by both shells. Do
not duplicate them.

Do **not** render the *Telefon / Lebar* preview toggle on mobile.

### 3.5 Behaviour

- **Kembali / Seterusnya** move `activeIdx` along `walk`. Call the existing
  `activateSectionRow(idx)` — it already sets `previewScroll`, so the card
  scrolls to the new Section for free. `Kembali` is `disabled` at `walkPos === 0`.
- **☰** sets `mobilePane = "stack"`. Tapping a row there sets `activeIdx` and
  returns to `"edit"` at the `"half"` detent. The stack screen replaces the rail
  with a single full-width **Kembali ke kad** button.
- **The last step is the primary action.** At `walkPos === walk.length - 1`,
  *Seterusnya* becomes the same action the desktop top bar shows for the current
  entitlement flow — reuse those exact handlers, do not write new ones:
  - unpaid draft → the price / payment action
  - `paidDraft` → *Terbitkan sekarang* (the publication dialog)
  - `revisionWindow` → *Terbitkan perubahan*
  - `controlledReplacement` → the existing replacement notice, **no publish**
  - `manualReviewActive` → the existing status action
  Label it accordingly. Getting this wrong is the highest-risk part of the
  build — read lines ~794-930 carefully and reuse.
- **Detents** are `peek` / `half` / `full`. The three header buttons set them
  directly. Dragging the grabber resizes live and snaps to the nearest detent on
  release (pointer events; see the prototype's `wireSheetDrag`).
- The sheet sits **above** the rail, never under it.

### 3.6 CSS

All of it inside `@media (max-width: 1023px)` in `app/globals.css`. Sizes from
the prototype:

- rail height 76px, pinned bottom, `bottom: calc(var(--kb-inset, 0px) + env(safe-area-inset-bottom, 0px))`
- sheet `bottom: 76px`, heights `peek 26%` / `half 52%` / `full 86%` of the
  editor body, `transition: height .28s cubic-bezier(.22,.9,.3,1)`
- sheet body `overflow:auto; overscroll-behavior: contain`
- canvas `padding-bottom: 76px`
- respect `prefers-reduced-motion` (there is already a block for it)

Use the app's semantic tokens (`--primary`, `--accent`, `--border`,
`--muted-foreground`, …). No new hard-coded hex values for app chrome.

**Commit 2 message:** `Add the canvas-first mobile Section editor`

---

## 4. Out of scope

Do not do these. Report them as follow-ups instead.

- The mobile tour. `SectionEditorTour` is gated to `(min-width: 1024px)` and its
  spotlight geometry assumes the three panes. Leave the gating alone.
- Tap-to-edit affordances on the rendered card (Option E).
- Any change to Section modules under `components/sections/*/index.tsx` beyond
  the `inputMode` hints in §2.7.
- Migrations, API routes, server actions, `docs/FLOW.md` (nothing you touch
  changes connectivity).

---

## 5. Verification — all of it, and report the actual output

```sh
npm run lint                      # must pass; it is the only automated gate
node docs/ui-glossary/validate.mjs
```

If `validate.mjs` fails because the new mobile surfaces have no place on a
wireframe, **do not hand-edit `docs/GLOSSARY.md`** (its UI terms section is
generated). Report it as a follow-up.

Then, against `http://localhost:48558`, signed in as `kamy@gmail.com` / `123`:

1. **360 / 390 / 414px** — no horizontal scroll anywhere in the editor.
2. The card is visible while typing in the sheet at the `half` detent.
3. *Kembali* / *Seterusnya* step through the Sections, skip the disabled one,
   and the card scrolls to keep up.
4. ☰ opens the stack; a row tap returns to the sheet on that Section.
5. Drag-to-reorder works on the stack screen **and the list still scrolls**.
6. Focusing an input does not zoom the page; the rail stays above the keyboard.
7. The last step shows the correct primary action for the entitlement flow.
8. **1280px — the editor is unchanged.** Compare against `git stash`-free
   reality: check out `HEAD~2` in a scratch tab if you need a baseline.

State plainly in your final report what you ran, what passed, and what you
could not verify. Do not claim a check you did not perform.
