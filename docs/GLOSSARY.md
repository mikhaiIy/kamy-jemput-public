# GLOSSARY.md

> Terms used across the codebase and the docs. Two sections come from source and
> must not be edited by hand. Two are written by people.

---

## How to use this file

| You want | Read |
|---|---|
| The name of a thing on screen | **UI terms** below. Open `docs/ui-glossary/index.html` to see the wireframe that points at each one. |
| The list of Sections that exist | **Section catalogue** below |
| What Gaya means, and how it differs from Theme | **Core concepts** below |
| What Aqiqah is | **Malaysian event terms** below |
| Which Supabase client to use, env vars, routes | root `AGENTS.md`. This file does not repeat it. |

To add or rename a UI term, edit `docs/ui-glossary/data/`, then run:

```sh
node docs/ui-glossary/validate.mjs
```

That command rewrites both generated sections. It fails if a term has no place
on a wireframe. It also fails if a place on a wireframe has no term.

---

## UI terms

<!-- BEGIN GENERATED: ui-terms -->
_Generated from `docs/ui-glossary/data/`. Do not edit by hand._
_220 terms across 16 interfaces. For definitions, wireframes, and connectors, open `docs/ui-glossary/index.html`._

Use the canonical name when you write about the UI. Aliases are fine as input. Write the canonical name.

### Administrator workspace
`/admin, /admin/orders, /admin/payments, /admin/custom-orders, /admin/cards/[id]`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Admin invitation preview iframe** | Component | `app/(admin)/admin/cards/[id]/page.tsx` | none | Administrator-only saved invitation rendered in the shared Phone preview frame, beside review controls on desktop and above them on mobile. The iframe has its own viewport and scroll; it shows the latest saved draft without publishing it. |
| **Receipt viewer** | Component | `components/ReceiptViewer.tsx` | none | Dialog opened by Buka resit over the current screen: authenticated image or PDF preview, original-size image toggle, explicit download, loading and retry states. Admins can open current and prior versions; customers see only their current receipt. |
| **Admin overview** | Layout region | `app/(admin)/AdminTable.tsx` | none | Task-linked pending counts and latest orders in the shared kamy-jemput palette, with Cormorant headings and Jakarta interface text; each opens its corresponding list. |
| **Admin table search** | Content field | `app/(admin)/AdminTable.tsx` | none | Case-insensitive search combined with all selected filters. Searches the complete server-loaded list. |
| **Admin table filters** | Control | `app/(admin)/AdminTable.tsx` | none | Status filter on each table and category filter on templates, with a reset action. |
| **Orders table** | Component | `app/(admin)/AdminTable.tsx` | none | Order/customer, template, amount, payment state, payment-confirmed time, lifecycle and invitation management link, with payment age and last customer draft activity for paid orders. |
| **Payment attempts table** | Component | `app/(admin)/AdminTable.tsx` | none | One current receipt per attempt, customer/order links, amount totals, status and submission time in Asia/Kuala_Lumpur (UTC+8); expandable details show history and actions. |
| **Custom requests table** | Component | `app/(admin)/AdminTable.tsx` | none | Customer requests with search, status filters and expandable brief/contact/status editing. |
| **Admin row details** | Layout region | `app/(admin)/AdminTable.tsx` | none | Focused details revealed by the row action, preserving the surrounding searchable list. |
| **Admin table pagination** | Control | `app/(admin)/AdminTable.tsx` | none | Twenty rows per page, previous/next buttons and page count; filtering resets to the first page. |
| **Admin confirmation dialog** | Component | `app/(admin)/AdminTable.tsx` | none | The shared Dialog surface for receipt review/file actions, template deactivation and invitation availability/deletion. All use the global deep-plum palette, white panels and pending dismissal guards. |
| **Admin edit request queue** | Component | `app/(admin)/admin/edit-requests/page.tsx` | Mohon Suntingan queue, edit request queue | The focused administrator table for Mohon Suntingan requests, with pending count, owner and invitation context, bounded customer reason, lifecycle-safe status, current-page search and expandable request details. It is in-app only; it sends no email or WhatsApp notification. |
| **Admin edit request review controls** | Control | `components/EditRequestReviewControls.tsx` | request review controls, edit request decision | Approve or reject controls inside the queue details. Approval delegates the guarded fixed seven-day window; rejection requires a bounded customer-readable reason. Stable decision ids make retries and two-admin races replay-safe. |
| **Payment review notification** | State | `app/(admin)/admin/page.tsx` | none | The in-dashboard administrator alert for newly pending manual receipts. It links to the payment review queue and does not send email or assign work. |

### Site shell
`/, /templates, /privacy, /terms, /dashboard`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Navbar** | Component | `components/Navbar.tsx` | header, site header, top nav | The sticky translucent header at the top of every (public) and (dashboard) page; administrator pages use their separate sidebar. It renders on the server and reads the session to decide which links to show. At mobile widths the logo link grows to a 44px touch target without changing the logo. |
| **Brand lockup** | Component | `components/KamyLogo.tsx` | logo, wordmark | The `kamy jemput` wordmark in the Navbar and Footer. `size="sm"` in the Navbar, `dark` in the Footer. |
| **Nav links** | Component | `components/Navbar.tsx` | desktop nav, primary navigation | The inline desktop link row inside the Navbar. Signed-in users retain Templates, Dashboard and the role-dependent Admin link here; account actions sit in the adjacent hamburger menu. Below 640px these links move into the Account menu. |
| **Admin nav link** | State | `components/Navbar.tsx` | none | The `Admin` entry, rendered only when the signed-in user's `users.role` is `admin`. Absent for every other visitor. |
| **Register CTA** | Control | `components/Navbar.tsx` | sign-up button, Mula Sekarang button | The filled deep-plum `Mula Sekarang` button in the Navbar linking to `/register`. Shown only to signed-out visitors; signed-in users get `Dashboard` and the Navbar menu button instead. |
| **Logout button** | Control | `components/LogoutButton.tsx` | sign-out button, Log keluar | Shared quiet Logout navigation action with muted text, a plum exit icon, a transparent resting surface and a minimum 44px target. Warm hover and visible focus feedback provide affordance without a permanent border or shadow. Full-width and left-aligned inside the Account menu on desktop and mobile, and in the admin account area. It is not an inline desktop Navbar action. Pending sign-out disables the control, shows a reduced-motion-aware progress icon and announces its state; errors use the shared Dialog with a retry action and return focus to Logout, or to the hamburger if the menu has been closed. |
| **Navbar menu button** | Control | `components/NavbarMenu.tsx` | hamburger, menu toggle | The quiet 44×44 hamburger control shown to signed-in users at all widths and to signed-out visitors below 640px. It toggles the Account menu, changes to an X while open, and carries aria-expanded plus aria-controls=navbar-menu. |
| **Account menu** | Component | `components/NavbarMenu.tsx` | mobile menu, nav drawer, Mobile navigation panel | The responsive dropdown revealed by the Navbar menu button (id=navbar-menu). Desktop shows the Akaun area with Logout; mobile adds the normal navigation links above it. It focuses the first visible action, closes on outside pointer or focus movement, and returns focus to the hamburger on Escape. Logout remains mounted while closed so its pending state and error dialog survive dismissal. Customer settings can be added to the Akaun area when implemented. |
| **Page body** | Layout region | `app/(public)/layout.tsx` | main, content area | Everything the route group's layout renders between the Navbar and the Footer. Use it to scope a change to page content without touching the shell. |
| **Footer** | Component | `components/Footer.tsx` | site footer | The deep-plum block closing every shell page: brand column, link columns, then the footer legal bar. At mobile widths each link grows to a 44px touch target; desktop keeps its compact row. |
| **Footer column** | Component | `components/Footer.tsx` | footer link group | One titled stack of footer links (`Produk`, `Syarikat`), rendered by the local `FooterCol` helper. |
| **Footer legal bar** | Layout region | `components/Footer.tsx` | copyright bar | The hairline-separated bottom row holding the copyright line and the `Dibuat dengan ❤ di Malaysia` line. |
| **Menu dismiss** | Interaction | `components/NavbarMenu.tsx` | escape to close | The mobile navigation panel focuses its first link on open and closes on Escape, returning focus to the navbar menu button. It does not close on outside click. |

### Templates gallery
`/templates`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Gallery hero** | Layout region | `app/(public)/templates/page.tsx` | templates header | The centred 900px-max introduction above the catalogue: eyebrow, title, and intro line. |
| **Eyebrow** | Component | `app/(public)/templates/templates-page.module.css` | kicker, overline | The small uppercase gold kicker above a title, with a 42px rule drawn by its `::after`. Used on the gallery hero, the gallery CTA, and the template detail preview column. |
| **Gallery title** | Content field | `app/(public)/templates/page.tsx` | none | The Cormorant display headline of the templates page. Its second clause is wrapped in `<em>`, which renders at weight 500 rather than italic-only. |
| **Custom order link** | Control | `app/(public)/templates/page.tsx` | none | The `Tidak jumpa? Tempahan khas →` link sitting between the hero and the filter strip, pointing at `/templates/custom`. |
| **Search field** | Control | `components/TemplatesGallery.tsx` | template search, catalogue search box | The labelled text input above the Category filter strip. It trims and case-normalises the query and matches it as a substring against the Template name, Template mood, and static description. It reaches a 16px font at mobile widths so iOS Safari does not auto-zoom on focus; desktop stays at 14px. |
| **Category filter strip** | Component | `components/TemplatesGallery.tsx` | filter row, category bar | The row of category pills labelled `Tapis mengikut kategori`, below the Search field. It wraps and centres above 820px, and becomes a single-line horizontal swipe strip below that, with a trailing-edge fade mask as the scroll affordance. |
| **Category filter pill** | Control | `components/TemplatesGallery.tsx` | filter pill, category chip (in the strip) | One category button. Selection is client state, not a URL param — it sets `aria-pressed` and `data-active`, which drives the filled deep-plum style. It grows to a 44px touch target at mobile widths; desktop keeps its 36px pill. |
| **Result count** | Content field | `components/TemplatesGallery.tsx` | count line | The `N reka bentuk` line under the filter strip. It is an `aria-live="polite"` region and reports the combined total after the search AND the category pill are applied together. |
| **Gallery error state** | State | `app/(public)/templates/page.tsx` | none | Replaces the whole gallery when the active-template query fails server-side, so a failed lookup can never masquerade as an empty catalogue. Shows a load-failure message instead of the Search field, Category filter strip, Result count, Template grid, or Empty results state. |
| **Empty results state** | State | `components/TemplatesGallery.tsx` | no results state | Shown when a successful combined search + category filter returns zero showcase cards. Distinct from the Gallery error state: the controls above stay usable and the reset controls live inside it. |
| **Empty results reset controls** | Control | `components/TemplatesGallery.tsx` | reset buttons | Two independent buttons inside the Empty results state: one clears the Search field, one re-selects the existing `Semua` Category filter pill. |
| **Template grid** | Layout region | `components/TemplatesGallery.module.css` | catalogue grid, template list | The catalogue grid: 4 columns, dropping to 3 at 1100px, 2 at 820px, and 1 at 520px. It renders exactly the combined-filter results — filtered-out cards leave the DOM rather than hiding in place. |
| **Template showcase card** | Component | `components/TemplateShowcaseCard.tsx` | template card, gallery card, showcase card | One catalogue entry links to `/templates/[id]` and wraps a shadowed Device frame that contains a live preview when one is available. The Template name, Gallery template price, and Template mood are below the Device frame. The entry has no outer panel or stage. The Device frame's shadow separates it from the page. The gallery page renders only static catalogue entries backed by an active `templates` row — the active row supplies price and preview data; entries without one never reach the gallery. This is the gallery tile, not the shadcn `Card` primitive. |
| **Template name** | Content field | `components/TemplateShowcaseCard.tsx` | card name | The Playfair display line under a showcase card's device frame, naming the catalogue entry. |
| **Gallery template price** | Content field | `components/TemplateShowcaseCard.tsx` | price line | The price line under the template name on a showcase card: a gold `RM N` from the active database row, or a grey `Akan Datang` placeholder when the row's price is null (an entry with no active row is omitted from the gallery entirely). Distinct from the detail page's Template price. |
| **Template mood** | Content field | `components/TemplateShowcaseCard.tsx` | mood line | The small uppercase grey descriptor at the bottom of a showcase card's metadata, e.g. `Lembut & Klasik`. |
| **Device frame** | Component | `components/TemplateShowcaseCard.tsx` | phone frame (gallery), phone mock | The 9:19 phone body drawn inside a showcase card, with its dynamic island, home indicator, and bottom edge highlight. One of three separate phone-frame implementations in the repo. |
| **Gallery preview iframe** | Component | `components/TemplateShowcaseCard.tsx` | live preview (gallery), card preview iframe | The 390×2200 iframe loading `/templates/preview/[id]` inside a showcase card, scaled to the screen width. Mounted lazily by an IntersectionObserver and marked `aria-hidden` with `tabIndex={-1}`. |
| **Fallback face** | State | `components/TemplateShowcaseCard.tsx` | placeholder face, preview fallback | The static `Sarah & Adam` card face painted under every preview. It is what shows before the iframe loads, when `livePreview` is false, and when the iframe errors. |
| **Category chip** | Component | `components/TemplateShowcaseCard.tsx` | template category label | The small deep-plum pill overlaid on the top-left of a showcase card's screen, naming the template's category. |
| **Preview badge** | Component | `components/TemplateShowcaseCard.tsx` | preview affordance, affordance | The `Pratonton ↗` badge in the bottom-right of a showcase card, hinting that the tile opens the template detail page. |
| **Hover scroll preview** | Interaction | `components/TemplateShowcaseCard.tsx` | auto-scroll preview | On devices matching `(hover: hover) and (pointer: fine)`, entering a showcase card scrolls its preview iframe at 75px/s; leaving smooth-scrolls it back to the top. Suppressed under `prefers-reduced-motion`. |
| **Long-press preview** | Interaction | `components/TemplateShowcaseCard.tsx` | press and hold preview | The touch equivalent: holding a showcase card for 450ms starts the same scroll, and a 1000ms click guard stops the release from navigating. |
| **Preview failed** | State | `components/TemplateShowcaseCard.tsx` | none | Set when the preview iframe fires `onError`. The iframe is unmounted permanently for that card and the fallback face stays visible. |

### Template detail
`/templates/[id]`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Detail back link** | Control | `app/(public)/templates/[id]/page.tsx` | none | The `← Kembali ke Templates` link above the two columns. |
| **Detail grid** | Layout region | `app/(public)/templates/[id]/page.tsx` | none | The template detail page's layout. Above 1024px it is two equal columns — preview column left, Template info panel right, 60px gap. Below 1024px it is one column, with the Detail preview phone first and the Template info panel beneath it. |
| **Detail preview phone** | Component | `app/(public)/templates/[id]/page.tsx` | preview phone, detail phone frame | The phone frame holding the Detail preview iframe. It is 295×640 above 1024px; below that it tracks the column width capped at 295px, and its preview scale steps down on the narrowest phones so the frame always fits the viewport. A third, separate phone implementation from the gallery device frame and the editor's phone preview frame. |
| **Detail preview iframe** | Component | `app/(public)/templates/[id]/page.tsx` | none | A 375×839 iframe of `/templates/preview/[id]` scaled by 0.744 to fit the detail preview phone at desktop widths; below 1024px the `--preview-scale` custom property tracks the frame width. Unlike the gallery one it keeps `pointer-events`, so the visitor can scroll it directly. |
| **Template info panel** | Layout region | `app/(public)/templates/[id]/page.tsx` | detail panel, info column | The column holding the category badge, title, description, price, feature list, and customise CTA. It is sticky at top 80px only while the layout has two columns (≥1024px); in the one-column mobile layout it is static below the Detail preview phone. |
| **Template category badge** | Component | `app/(public)/templates/[id]/page.tsx` | none | The cream pill above the template title, showing the Malay category label mapped by the local `categoryLabel()` helper. |
| **Template title** | Content field | `app/(public)/templates/[id]/page.tsx` | none | The 40px Cormorant `h1`. Prefers the DB row's `templates.name` and falls back to the hard-coded catalogue entry's name. |
| **Template price** | Content field | `app/(public)/templates/[id]/page.tsx` | price display | The 52px gold `RM N` figure, rendered from the active `templates.price_myr` divided by 100. Omitted entirely when the template has no active DB row — the hard-coded catalogue fallback price is never rendered. |
| **Feature list** | Content field | `app/(public)/templates/[id]/page.tsx` | includes list, benefit list | The green-tick list of what the template includes, above the customise CTA. |
| **Customise CTA** | Control | `app/(public)/templates/[id]/page.tsx` | customise button, start button | The primary `Sesuaikan Template Ini →` button linking to `/dashboard/cards/new?template=[id]`. It is the only entry point into the build flow. |
| **Coming soon state** | State | `app/(public)/templates/[id]/page.tsx` | unavailable template | When a known template has no active `templates` row, the customise CTA is replaced by a flat grey `Akan Datang` block, the Template price is omitted entirely (no static fallback), and the card is absent from the gallery. An unknown id instead takes the unchanged notFound() route. |

### Card preview route
`/templates/preview/[id]`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Bare preview surface** | Layout region | `app/(preview)/templates/preview/[id]/page.tsx` | preview route, bare card | The whole of `/templates/preview/[id]`. The (preview) route group applies no Navbar and no Footer, because the page only ever appears inside an iframe. |
| **Demo card data** | Content field | `app/(preview)/templates/preview/[id]/page.tsx` | preview fixture, sample data | The hard-coded `Sarah & Adam` / `陈雅仪 & 李俊明` fixtures the preview route renders. It is fixture content, never a customer's card. |

### Published card
`/i/[slug]`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Card gutter** | Layout region | `app/(invite)/i/[slug]/page.tsx` | page gutter, card backdrop | The full-bleed background behind the invitation column on desktop: the card's own `theme` background darkened by a 6% black overlay. |
| **Card column** | Layout region | `app/(invite)/i/[slug]/page.tsx` | invitation column, card frame | The centred 480px-max column the invitation is painted into, with a soft outer shadow and hairline side borders. Full width on mobile. |
| **Section stack** | Layout region | `components/SectionInvitationCard.tsx` | card body, section list (rendered) | The rendered list of Sections inside a card: enabled instances only, sorted by `order`, each resolved through the registry, painted over the active Gaya preset's own background with its decorative ambient-motion layer (`.gaya-backdrop`). This is the body of the invitation. |
| **Landing section** | Component | `components/sections/landing/index.tsx` | cover section | The `landing` Section — the cover screen a guest sees first. Eight variants: `photo_hero`, `minimalist`, `kinetic_hero`, `sakura_depth`, `poster_luxe`, `doodle_scrapbook`, `celestial_gate`, `premiere_gate`. |
| **headline** | Content field | `components/sections/landing/index.tsx` | couple name, card title | The landing Section's main line — the couple's or host's name. Stored at `sections[i].data.headline`; default `Sarah & Adam`. |
| **tagline** | Content field | `components/sections/landing/index.tsx` | occasion line, subtitle | The landing Section's occasion line under the headline — `Walimatul Urus` by default. Stored at `sections[i].data.tagline`. |
| **Event info section** | Component | `components/sections/event_info/index.tsx` | details section, when and where | The `event_info` Section: date, time, venue, address. Variants `card_stack` (default) and `single_card`. Its `date` is what the dashboard and the OG image read. |
| **venue** | Content field | `components/sections/event_info/index.tsx` | location name | The event_info Section's venue name, stored at `sections[i].data.venue`. Distinct from `address`, which is the street line the map Section links from. |
| **Countdown section** | Component | `components/sections/countdown/index.tsx` | timer section | The `countdown` Section, counting down to the resolved event date. Variants `digital`, `flip_cards`, `lunar_phases`, `film_leader`. |
| **RSVP section** | Component | `components/sections/rsvp/index.tsx` | RSVP block | The `rsvp` Section a guest submits from. Six live variants (`walimah` default, `romance_envelope`, `double_happiness`, `marigold`, `confetti_pop`, `boardroom_badge`) plus two legacy ones kept only so old cards still render. |
| **Guestbook section** | Component | `components/sections/guestbook/index.tsx` | wishes wall, attendees message | The `guestbook` Section — the wishes wall where guests leave messages. Single variant `wishes_wall`. |
| **Card footer** | Component | `components/SectionInvitationCard.tsx` | card credit | The `kamy jemput` credit line closing every rendered card, in the theme's muted colour. |
| **Section error boundary** | State | `components/SectionInvitationCard.tsx` | none | Each Section renders inside a boundary that swallows render errors: a Section with stale or invalid data renders nothing rather than blanking the whole card. |
| **Guest edit-window notice** | State | `components/GuestEditWindowNotice.tsx` | private invitation notice, revision notice | The only guest-visible content while the same invitation slug is private for an active or expired administrator-approved window: a safe bounded customer display name followed by `is making edits. Please wait.` It never includes the prior event snapshot, metadata or asset references. |

### Section editor
`/dashboard/cards/[id]/edit`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Editor top bar** | Layout region | `components/SectionEditor.tsx` | editor header | The editor's own header: back link to the dashboard, template name with the save indicator beneath it, and the payment action or manual-review status action on the right. Separate from the site Navbar. |
| **Save indicator** | State | `components/SectionEditor.tsx` | autosave status | The draft persistence state under the template name, with exactly four values: `Sedia`, `Menyimpan…`, `Disimpan ✓`, and an error state that also renders a `Cuba lagi` button. |
| **Continue to payment button** | Control | `components/SectionEditor.tsx` | pay button, checkout button | The primary editor action showing the template price. It validates the draft, force-saves it to `custom_data_draft`, and navigates to the owned order's checkout page where the payment method is chosen — it never starts a Stripe session itself. During active manual receipt review, the same area becomes a separate payment-status action: it flushes the latest serialized draft, skips invitation completeness validation, shows `Menyimpan…` while waiting, and keeps retry/conflict feedback in the editor when saving fails. It navigates only after a successful save. |
| **Validation banner** | State | `components/SectionEditor.tsx` | error banner | The `role="alert"` strip under the top bar listing why the draft cannot go to payment yet. |
| **Three-pane layout** | Layout region | `components/SectionEditor.tsx` | editor layout | The editor's `260px 1fr 360px` grid: section sidebar, sub-form, preview pane. |
| **Section sidebar** | Layout region | `components/SectionEditor.tsx` | left pane, editor sidebar | The editor's sticky left pane: the Gaya panel on top, then the section list, then the add section button. |
| **Gaya panel** | Component | `components/SectionEditor.tsx` | theme picker, Gaya picker | The collapsible card-level theme picker at the top of the sidebar. Choosing a Gaya replaces the draft's whole `theme` and may re-suggest variants for sections that are not variant-locked. |
| **Gaya swatch** | Component | `components/SectionEditor.tsx` | theme swatch, preset swatch | The gradient chip standing in for a theme preset, in the Gaya panel header and on each Gaya tile. A `★` marks presets recommended for the card's template type. |
| **Section list** | Component | `components/SectionEditor.tsx` | section order list | The reorderable list of the draft's Section instances, wired to dnd-kit's `SortableContext` with a vertical strategy. |
| **Section list header** | Component | `components/SectionEditor.tsx` | none | The `Bahagian` label separating the Gaya panel from the section list. |
| **Section row** | Component | `components/SectionEditor.tsx` | sidebar row, section item | One Section instance in the sidebar: drag handle, status dot, Malay label, visibility toggle, remove button. The active row gets a gold left border; a disabled one drops to 50% opacity. Selecting an enabled row scrolls the Live preview to its matching enabled Section stack item; selecting a disabled row activates the Sub-form only, since it has no rendered item to scroll to. |
| **Drag handle** | Control | `components/SectionEditor.tsx` | grip, reorder handle | The `⋮⋮` grip on a section row, labelled `Susun semula`. It carries the dnd-kit listeners and stops click propagation so grabbing it does not also activate the row. |
| **Status dot** | State | `components/SectionEditor.tsx` | completion dot | The 8px completeness dot on a section row: green `complete`, gold `draft`, red for a section failing validation. Its `aria-label` is the raw status word. |
| **Section visibility toggle** | Control | `components/SectionEditor.tsx` | enable toggle, hide section | The `👁` / `⊘` button flipping `sections[i].enabled`. A disabled Section stays on the draft but is skipped by the renderer. |
| **Remove section button** | Control | `components/SectionEditor.tsx` | delete section | The `×` on a section row. Confirms through a native `confirm()` before dropping the instance. |
| **Add section button** | Control | `components/SectionEditor.tsx` | add block button | The `+ Tambah Bahagian` button under the section list, opening the add section picker. |
| **Sub-form** | Layout region | `components/SectionEditor.tsx` | centre pane, section form | The centre pane: the editing surface for whichever Section is active. Uses the module's `customForm` when it declares one, otherwise the generic schema-driven form built from its zod schema. |
| **Sub-form header** | Component | `components/SectionEditor.tsx` | none | The active Section's Malay label with its English label and 1-based position beneath, plus a premium pill when the module's `tier` is `premium`. |
| **Variant gallery** | Control | `components/SectionEditor.tsx` | variant picker, section style picker | The per-Section treatment picker inside the sub-form. Renders swatch tiles when the module supplies `variantMeta`, otherwise compact chips, ordered recommended-first for the card's template type. |
| **Variant tile** | Control | `components/SectionEditor.tsx` | variant swatch | One option in the variant gallery. Picking it sets `variant` and also sets `variantAuto: false`, locking the Section against future Gaya re-suggestion. |
| **Form field** | Control | `components/SectionEditor.tsx` | input, editor field | One input in the sub-form, generated per key of the Section's data. Its error text comes from the `errors` map keyed by field name. |
| **Live preview pane** | Layout region | `components/SectionEditor.tsx` | preview column, right pane | The editor's sticky right column: the preview toolbar, the framed preview, and the `Kemas kini secara langsung` hint. |
| **Preview mode toggle** | Control | `components/SectionEditor.tsx` | phone/wide toggle | The two-button segmented control switching the preview between `Telefon` (a 340×712 device frame) and `Lebar` (a 460px-max plain column). Uses `aria-pressed`. |
| **Phone preview frame** | Component | `components/PhonePreview.tsx` | editor phone, preview bezel | Shared rounded device frame used by the editor and administrator invitation detail. Its 340×712 proportions shrink with available width; the admin version contains a private mobile-viewport iframe. |
| **Live preview** | Component | `components/SectionEditor.tsx` | inline preview | The in-memory draft rendered inline through the same `SectionInvitationCard` the published card uses. It updates on every keystroke, ahead of the debounced draft save, and scrolls smoothly (within its own scroller, never the page) to the enabled Section stack item matching a newly selected enabled Section row. |
| **Editor hydration shell** | State | `components/SectionEditor.tsx` | editor skeleton | Before mount the editor renders only its top bar, with `Memuatkan…` in place of the save indicator and a dimmed price. The three panes stay empty to keep dnd-kit and localStorage SSR-safe. |
| **Help control** | Control | `components/SectionEditor.tsx` | help button, Bantuan button, tour replay control | The `Bantuan` button in the editor top bar, rendered on both viewports. It replays the Section editor tour from step one at any time — for accounts that completed it and accounts that dismissed it alike — without clearing the account-level completion marker and without touching draft data. |
| **Section editor tour** | Interaction | `components/SectionEditorTour.tsx` | editor tour, guided tour, onboarding tour | The five-step desktop / six-step mobile Malay guided tour over the editor, with a separate step list per viewport. At 1024px and wider it walks the Section sidebar, Sub-form, Live preview pane, Save indicator, and Continue to payment button. On the canvas-first mobile shell it walks the Live card canvas, Form sheet, Sheet detent control, Navigation rail, the Section stack screen (Susun Bahagian), and the same Continue to payment button, with autosave folded into the Form sheet step. Every mobile step declares the pane it describes — the four card-and-sheet steps `edit`, Susun Bahagian `stack` — so the tour shows that screen wherever it was opened from; Susun Bahagian also points an animated reorder hint arrow above the first row's drag handle. The tour reconciles the shell through an editor-owned `onRequestPane` callback and restores the pane the customer started on whenever a step needs no particular pane and on every exit (Seterusnya, Kembali, ×, Escape, or completion); it holds no editor state beyond that pane switch. It auto-launches once per account while `users.section_editor_tour_completed_at` is NULL; finishing or dismissing stamps that marker through `app/actions/editor-help.ts` (never through the draft save), and the Help control replays it without clearing the marker. Its overlay is modal — focus is trapped inside its panel (a `Shift+Tab` from the freshly opened, initially focused panel wraps to the last enabled tour button instead of escaping) and restored to the opener on settle — and its state is ephemeral: never draft data, localStorage, or `custom_data_draft`. Desktop placement is Navbar-safe: its fixed overlay stacks above the 58px sticky Navbar (z-index 120 vs 100), measures the rendered panel height, and selects only a fitting above/below position before clamping the complete panel inside the viewport. On mobile the panel is full-bleed minus the gutter, derives its minimum top from the viewport (no Navbar reservation while the Navbar is hidden), stays 76px plus the gutter above the viewport bottom, and sits opposite its target; a step whose target is not yet present during a pane switch degrades to a centred panel with no highlight ring. |
| **Paid-draft publication button** | Control | `components/SectionEditor.tsx` | publish paid-draft button, publication button | The `Terbitkan Jemputan` action shown only for the one owner-editable paid draft. It opens the publication acknowledgement dialog; it never exposes a guest link before the owner publication request commits. |
| **Publication acknowledgement dialog** | Component | `components/SectionEditor.tsx` | publish confirmation, publication modal | Responsive keyboard-accessible confirmation for paid-draft publication. It presents the exact unchecked acknowledgement `I understand that this invitation will become public and read-only.`, flushes the latest save, and reports loading, validation, conflict, failure and retry states. |
| **Revision deadline** | State | `components/SectionEditor.tsx` | edit-window deadline, expiry banner | The customer-facing deadline strip for an active administrator-approved edit window. It names the database-derived expiry and changes to a locked/support state after expiry; it is not a browser-only timer. |
| **Controlled replacement status** | State | `components/SectionEditor.tsx` | replacement draft status, administrator-granted replacement | The owner-only status strip for a pending administrator-granted replacement: it explains that the target is an editable grant-only draft, shows preparation readiness, and hides ordinary payment/publication actions. Owner saves and target-scoped image uploads remain available while preparation is valid. |
| **Draft conflict state** | State | `components/SectionEditor.tsx` | stale draft state, save conflict | The editor state after a versioned save or publication request receives a conflict. It blocks publication, explains that another saved version exists, and offers a reload action instead of publishing stale content. |
| **Section reorder** | Interaction | `components/SectionEditor.tsx` | drag to reorder, sort sections | Dragging a section row by its handle reorders the draft. Wired with dnd-kit `closestCenter` collision and a vertical sort strategy; the drop rewrites every instance's `order`. |
| **Draft autosave** | Interaction | `components/SectionEditor.tsx` | autosave, debounced save | Edits are cached to localStorage immediately and persisted to `cards.custom_data_draft` on a debounce with an expected `draft_version`. Successful saves advance that version and set `last_activity_at`; there is no save button — the save indicator reports the result. |

### Mobile Section editor
`/dashboard/cards/[id]/edit`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Live card canvas** | Layout region | `components/SectionEditor.tsx` | card canvas, mobile preview, canvas | The full-bleed surface behind the mobile shell: the in-memory draft rendered at native width with no device bezel. The Form sheet covers its lower part at every detent, but the card is never navigated away from while editing. This is the mobile counterpart of the Live preview pane. |
| **Form sheet** | Layout region | `components/SectionEditor.tsx` | bottom sheet, sheet, mobile form | The draggable bottom sheet holding the active Section's Sub-form on mobile. It sits 76px above the viewport bottom so the Navigation rail stays clear, has its own scroll region, and tracks the software keyboard through `--kb-inset`. The desktop Sub-form and the mobile Form sheet render the same form component. |
| **Sheet detent control** | Control | `components/SectionEditor.tsx` | detent toggle, sheet height control | The three-button control in the Form sheet header that snaps the sheet to `Petak kecil` (peek), `Separuh` (half), or `Penuh` (full); dragging the grabber selects the nearest detent on release. Each button exposes `aria-pressed` for its active detent. |
| **Navigation rail** | Layout region | `components/SectionEditor.tsx` | mobile rail, stepper rail, bottom rail | The fixed control strip above the safe area of the mobile shell. Kembali and Seterusnya step through the enabled Sections in order, and the ☰ button opens the full Section stack over the card. On the last enabled Section the forward action becomes the entitlement's primary action — payment, publication, or status review. The rail respects `--kb-inset` so it stays above the software keyboard. |
| **Section stack screen** | Layout region | `components/SectionEditor.tsx` | Bahagian screen, mobile Section stack, stack pane | The full-screen Section list the ☰ rail button opens over the live card: the Gaya panel, the reorderable Section rows, and the add-Section button. Selecting a row returns to the card at that Section. The Section editor tour opens this screen for its Susun Bahagian step and returns to the card on exit. |
| **Reorder hint arrow** | Component | `components/SectionEditorTour.tsx` | drag hint arrow, reorder arrow | The gold animated ↕ arrow the Section editor tour draws beside the first Section row's drag handle during the Susun Bahagian step. It bobs vertically to describe the drag direction, is not interactive (`pointer-events: none`) and not announced (the step copy carries the meaning), and stops moving under `prefers-reduced-motion: reduce` while staying visible. |

### Dashboard
`/dashboard`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Dashboard header** | Layout region | `app/(dashboard)/dashboard/page.tsx` | none | The heading Jemputan saya, short guidance and New invitation button above the customer invitation gallery. |
| **New invitation button** | Control | `app/(dashboard)/dashboard/page.tsx` | create card button | Jemputan baharu opens the template gallery to start a new invitation. |
| **Date group** | Layout region | `app/(dashboard)/dashboard/page.tsx` | card list group, Semasa group, Akan Datang group, Lepas group | Customer invitations grouped into Perlu perhatian (every unpublished or unavailable lifecycle), Akan datang (published with a current/future date, plus undated published invitations) and Majlis lepas (all valid dates past). Upcoming sorts by the next event date in Kuala Lumpur; past sorts newest event first. One selected group is shown at a time; empty groups retain their filter and show an empty state. |
| **Card list** | Layout region | `app/(dashboard)/dashboard/page.tsx` | invitation list, my cards | Responsive gallery of Card rows with small phone renders, grouped by next action and event timing. Sticky group filters show the selected group, with search and six invitations per page. |
| **Card row** | Component | `app/(dashboard)/dashboard/page.tsx` | invitation row | One compact invitation tile in the customer gallery: a scaled phone render, lifecycle, clamped event name, date, one short status or deadline and aligned next actions. Full names, admin/replacement explanations, request outcomes and payment detail open in the per-invitation Butiran dialog. At desktop widths, the phone render remains above the summary and actions; the narrow mobile layout keeps its established smaller phone beside the information and actions. |
| **Invitation details dialog** | Component | `components/InvitationDetailsDialog.tsx` | invitation details, Butiran dialog | Butiran is the accessible per-invitation Dialog for the full event name, lifecycle context, active or expired edit deadline, customer-safe availability reason, replacement lineage, Mohon Suntingan reason/outcome and manual-payment detail. The tile keeps only the essential status visible so neighboring actions stay aligned. |
| **Lifecycle indicator** | State | `app/(dashboard)/dashboard/page.tsx` | status badge, publish badge, published pill | The Lifecycle indicator names the derived state: Draf, Sedia untuk diterbitkan, Sedang disiapkan, Diterbitkan, Suntingan diluluskan, Suntingan tamat or Tidak tersedia. A grant-only replacement target uses the truthful Draf penggantian pentadbir label for its private editable paid-draft state. Private drafts never expose guest sharing controls. |
| **Paid-draft indicator** | State | `app/(dashboard)/dashboard/page.tsx` | none | Sedia untuk diterbitkan identifies a payment-backed, editable and unpublished invitation; its supporting copy confirms payment and owner publication. A controlled replacement target is still private and editable, but displays Draf penggantian pentadbir and makes clear that only administrator cutover can publish it. |
| **Manual payment status message** | State | `app/(dashboard)/dashboard/page.tsx` | none | A compact payment status on the invitation tile. Butiran explains received, remaining, rejected, duplicate or excess amounts and support links without private audit data. |
| **Paid-draft edit action** | Control | `app/(dashboard)/dashboard/page.tsx` | none | Semak & terbitkan returns a payment-backed owner to the Section editor to review the saved paid draft; publication still requires the existing explicit acknowledgement. A controlled replacement target instead shows Sambung suntingan and cannot self-publish. |
| **Unavailable note** | Content field | `app/(dashboard)/dashboard/page.tsx` | disable reason line | A short unavailable status on the invitation tile. Butiran retains the recorded customer-safe reason, followed by the support action. |
| **Card row metrics** | Content field | `app/(dashboard)/dashboard/page.tsx` | response counts | Two compact figures on a published invitation tile: attending guests (sum of saved pax) and total responses. Lihat RSVP opens the detailed response breakdown. |
| **Card deletion dialog** | Component | `app/(dashboard)/dashboard/DeleteCardButton.tsx` | delete popup | Shared deep-plum confirmation surface with a destructive action, cancel focus, pending dismissal guard and inline error messages. Cancellation returns focus to the outlined Padam draf action with its trash icon. |
| **Support contact dialog** | Component | `components/SupportContactDialog.tsx` | support popup | Opened by Hubungi sokongan on an unavailable or locked invitation. Shows Sila hubungi followed by the configured email and WhatsApp links, without payment-specific wording. The dialog is wide enough for the contact sentence to fit on one line on desktop, with wrapping retained on small screens. Missing contacts show a neutral retry message. The close control or Escape returns focus to the trigger. |
| **Card row actions** | Control | `app/(dashboard)/dashboard/page.tsx` | row buttons | One primary action per lifecycle: Sambung suntingan, Semak & terbitkan, Semak status, Lihat RSVP or Hubungi sokongan. On an expired edit window, an eligible, rejected or stale Mohon Suntingan keeps the filled request primary and the shared Support contact dialog as the outlined secondary; while a request is pending, the same support dialog becomes the filled primary with no empty request slot. All non-Published tiles use shared primary and secondary tracks at the gallery's two-column width, reserving the 40px secondary row below the 44px primary even when empty; the row collapses with the single-column layout. Published invitations add Buka jemputan and Salin pautan, with eligible Mohon Suntingan requests in their separate secondary action area and a consistent reserved request row. Payment details use a full-width outlined Lihat bayaran button with a receipt icon in the secondary slot. The existing Bayar baki label and checkout destination remain conditional on payment state; deletion remains limited by existing payment guards. |
| **Customer edit request status** | State | `components/EditRequestDialog.tsx` | Mohon Suntingan status, edit request status | The compact customer-safe status block for Mohon Suntingan: pending explains that a Published invitation remains public and read-only while an expired edit window remains private and locked; rejection and stale states point to Butiran for their bounded customer-readable reason. It never shows administrator identity or internal lifecycle data. |
| **Customer edit request dialog** | Component | `components/EditRequestDialog.tsx` | request editing dialog | The shared semantic-token Dialog opened by Mohon Suntingan. On Published invitations its outlined trigger sits in the secondary action area; on an expired edit window it is the filled primary action until a pending request turns the shared support dialog into the filled primary. The customer-safe status remains in the invitation tile content. It accepts one bounded reason, shows a byte counter, keeps the stable request id for network retries and explains that submission does not open an edit window. |
| **Dashboard empty state** | State | `app/(dashboard)/dashboard/page.tsx` | zero state | A prompt to create the first invitation, with Pilih reka bentuk opening the template gallery. |
| **Dashboard group filters** | Control | `app/(dashboard)/dashboard/InvitationGallery.tsx` | none | Three persistent group filters flush beneath the Navbar, sharing its height token and underlapping its border to prevent gaps at fractional browser zoom. The opaque bar has a filled selected state and matching counts. Changing selection replaces the results and retains keyboard focus on the filter; all groups remain accessible, including empty ones. |
| **Dashboard invitation preview iframe** | Component | `components/InvitationThumbnail.tsx` | none | Owner-authenticated saved invitation in a small phone frame, rendered at a scaled 390px mobile viewport. The lazy iframe is inert; the surrounding keyboard-accessible link opens a full preview or published invitation. |
| **Invitation search** | Control | `app/(dashboard)/dashboard/InvitationGallery.tsx` | none | Sticky search by invitation name, slug or displayed date. Words match case-insensitively across every group; each filter shows its matching count, while the selected group alone supplies results. Clearing restores the group and focuses the search input. |
| **Invitation pagination** | Control | `app/(dashboard)/dashboard/InvitationGallery.tsx` | none | Six invitations per page within the selected group and search. Previous and next controls show the page count; changing a filter or query resets to page one. |

### Checkout status
`/dashboard/checkout/[orderId]`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Receipt upload** | Content field | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Required PDF, JPEG, PNG or WebP file input, up to 5 MB; supports replacement before confirmation. |
| **Current receipt** | Component | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Only the latest payment attempt’s current version is shown to the customer. Private download access is rechecked on every request. |
| **Payment balance** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Received and remaining RM totals after manual review. Top-up uses the same QR method with a new receipt; overpayment requires manual refund support. |
| **Manual payment status** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | The customer-safe outcome message for a manual receipt: waiting, rejected with a correction path, insufficient with the server-calculated balance, confirmed as a paid draft, or duplicate with support guidance. Review status does not freeze the owner's live unpublished invitation draft. |
| **Checkout invitation preview** | Layout region | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Owner-only phone iframe beside payment details, showing the latest saved invitation for this order. It follows payment details on mobile and has no live RSVP context or public guest URL. |
| **Checkout status panel** | Layout region | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | order status panel, post-payment screen | The owned checkout surface. Manual QR uses a wide payment summary above separate QR and receipt areas, stacked on mobile. Partial payment shows the remaining amount and a new-receipt path while the owner may keep editing the invitation. After any first sufficient payment it shows the private editable paid draft; the published invitation link appears only after the owner publication action. |
| **Payment success** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Reached when the order is paid. It shows the winning payment method and time. Any sufficient confirmed payment shows an editable paid draft that remains unpublished; the Copy link field appears only when the current lifecycle result is Published. An Unavailable invitation shows a blocked state. |
| **Paid-draft state** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | The post-payment state for a Stripe-, Bank DuitNow- or Touch ’n Go-confirmed order: the owner can continue editing the saved draft, but publication, guest URL exposure and publication messaging wait for the explicit owner acknowledgement and publication action. |
| **Paid-draft checkout action** | Control | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | The checkout action that opens the editable paid draft after any first sufficient confirmed payment. It returns to the editor without exposing a public invitation link; publication is a separate owner action. |
| **Paid-confirmation metadata** | Content field | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | winner line, payment metadata line | The winner line on the payment success state: the completed method (`Stripe` / `DuitNow` / `Touch ’n Go`) and its localized completion time. Seeded from the server render and refreshed by every status poll that reports `paid`; hidden when either value is absent. |
| **Payment cancelled** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Reached when Stripe returns with `?status=cancel`. Shows `Pembayaran Dibatalkan` and a `Kembali ke Editor` control for the bound card (or Dashboard if no card is available); the bound Checkout Session remains protected until Stripe confirms it cannot be paid. |
| **Payment pending** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | processing state | The waiting state while the webhook has not yet landed or a durable Checkout reservation is being reconciled: the page says it will update itself, and falls back to a manual check if polling stalls. |
| **Copy link field** | Component | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | card link box, share link box | The tinted box on the Published success state holding the invitation's public `/i/[slug]` URL for copying. Manual paid drafts do not render this field. |
| **DuitNow QR choice** | Control | `components/PaymentMethodDialog.tsx` | none | The second button in the payment modal. Opens the owned QR payment page. |
| **Payment support message** | Component | `components/PaymentSupportMessage.tsx` | support contact message | The exact customer payment-help copy shared by checkout and receipt-error states. It renders one validated email link, one digits-only Malaysian WhatsApp link, both links, or the approved no-link fallback when values are missing or unreadable. |
| **Payment method dialog** | Layout region | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | method selection | A two-button Payment method dialog offers Stripe and DuitNow QR. The QR choice opens a dedicated page with Bank and Touch ’n Go choices. Stripe is blocked during review and after any confirmed manual amount; only a rejection with zero confirmed manual amount permits Stripe fallback. |
| **Stripe choice** | Control | `components/PaymentMethodDialog.tsx` | pay by card button | Starts an owned Stripe Checkout Session only when no manual receipt awaits review and no partial manual amount is confirmed. |
| **QR payment choice** | Control | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | slot picker | Two choices on the dedicated QR page: Bank and Touch ’n Go. Bank uses slot 1. Existing attempts use their frozen recipient snapshot; partial top-ups retain the same method. |
| **Selected slot detail** | Component | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | recipient details | The tinted detail box revealed when a slot is chosen: payee name, provider/bank, the amount in MYR, the slot's QR image, and its transfer instructions — all from the slot's current enabled configuration. |
| **Transfer-reference field** | Content field | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | reference input | Optional payment reference. When supplied, it must be 3–64 permitted printable characters beginning alphanumerically. It never replaces the required receipt. |
| **Receipt submit** | Control | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | none | Sends one required private receipt with an optional reference. Shows progress and failure/retry state; the same operation ID makes retries idempotent. |
| **Awaiting-review state** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | pending review state, manual review wait | A current receipt awaits human payment review. The customer can download or replace the current receipt, return to the editor and edit invitation content/assets; those edits do not change payment records. Stripe remains blocked. |
| **Rejected state** | State | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | review rejected state | Shows the administrator rejection reason, receipt replacement control and a return to the editable invitation. Prior metadata remains immutable. Stripe fallback is available only if no manual amount has been confirmed. |
| **Order status polling** | Interaction | `app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx` | status polling | The checkout panel polls the owned status endpoint after Stripe returns or while DuitNow review is pending. The endpoint runs paid-order recovery and returns lifecycle plus winning-payment data. During rejected retry payment-method choice it does not adopt the old reviewed submission; only a successful new submission POST can do so. A Published result reveals the link. An Unavailable result stops polling. |

### Admin templates
`/admin/templates`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Admin nav** | Component | `app/(admin)/AdminNav.tsx` | admin tabs | Persistent left administrator sidebar with overview, customer invitations, orders, payment review, template management, custom requests and settings. A separate Cipta & uji group links to the customer Dashboard and template gallery. Replaces the customer Navbar on admin routes; becomes a focus-trapped drawer on mobile. |
| **Admin nav item** | Control | `app/(admin)/AdminNav.tsx` | none | One entry in the admin nav, marked active by matching the current pathname and using the shared pointer cursor for enabled controls. |
| **Template management table** | Component | `app/(admin)/admin/templates/page.tsx` | templates table | Searchable administrator table with combined name/ID search, category and active-status filters, 20-row pagination, inline price editing and confirmed deactivation. |
| **Table header** | Component | `app/(admin)/admin/templates/page.tsx` | column headers | The table's `thead` row of column labels. |
| **Admin template row** | Component | `app/(admin)/admin/templates/TemplateRow.tsx` | none | One editable template row. Its price field and active toggle both commit through `PATCH /api/admin/templates/[id]`. |
| **Template price field** | Content field | `app/(admin)/admin/templates/TemplateRow.tsx` | price input | The inline numeric input editing `templates.price_myr`. Stored in sen — the customer-facing price divides it by 100. |
| **Template active toggle** | Control | `app/(admin)/admin/templates/TemplateRow.tsx` | publish toggle | The control flipping `templates.is_active`. Deactivating a template removes its `/templates` showcase card from the gallery entirely (the catalogue is active-only) and shows the coming soon state on its detail page: no Template price and no Customise CTA. |

### Administrator settings
`/admin/settings/qr, /admin/settings/support`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Touch ’n Go configuration** | Component | `app/(admin)/admin/payments/page.tsx` | none | Separate manual method configuration for recipient, QR URL, instructions and enabled state. Does not add a DuitNow slot. |
| **Settings navigation pane** | Layout region | `app/(admin)/admin/settings/layout.tsx` | none | Horizontal settings categories above the Settings content pane, with active links for Bayaran QR and Hubungi sokongan. The selected category uses the shared administrator focus and colour treatment. |
| **Settings content pane** | Layout region | `app/(admin)/admin/settings/layout.tsx` | none | Full-width editing area below the horizontal settings categories for the selected administrator setting. |
| **QR image upload** | Control | `app/(admin)/admin/settings/qr/QrSettingsForm.tsx` | none | Image picker and preview for merchant QR artwork. Accepts JPEG, PNG or WebP up to 5 MB; administrator-only API decodes and normalizes to PNG before storing separately from receipts. |
| **Support contact settings form** | Component | `app/(admin)/admin/settings/support/page.tsx` | none | Administrator-only form at /admin/settings/support for optional support email and Malaysian +60 WhatsApp values. The required change reason follows the optional contact fields directly. It validates on the server and includes a live customer-message sample. |
| **Support email field** | Content field | `app/(admin)/admin/settings/support/SupportSettingsForm.tsx` | none | Optional single support address. Surrounding spaces are trimmed, the stored value is lower-case, plus-addressing is allowed, and whitespace, control characters, commas, malformed syntax and a local part over 64 characters are rejected. |
| **Support WhatsApp field** | Content field | `app/(admin)/admin/settings/support/SupportSettingsForm.tsx` | none | Optional Malaysian WhatsApp contact. Spaces, hyphens and brackets are removed; the stored value must be +60 followed by 8–10 national digits without a trunk zero immediately after the country code. Ownership and WhatsApp registration are not verified. |
| **Support change reason** | Content field | `app/(admin)/admin/settings/support/SupportSettingsForm.tsx` | support reason field | Required bounded reason for an actual support-contact add, replacement, clear or restore. Blank, control-character and over-500-character reasons are rejected; no-op writes do not create history. |
| **Support message sample** | Component | `app/(admin)/admin/settings/support/SupportSettingsForm.tsx` | customer message sample | The restrained live sample beside the support form. It updates as the administrator types and shows the exact email, WhatsApp, combined or safe fallback customer message with its links. |
| **Support contact history** | State | `app/(admin)/admin/settings/support/page.tsx` | support settings audit log | Administrator-only indefinite append-only history, with the latest 100 rows displayed. Each actual change stores before and after contacts, operation, bounded reason, actor, timestamp and config version; a restore selects the old values and writes another audited change through the same guarded RPC. |
| **QR settings form** | Component | `app/(admin)/admin/settings/qr/QrSettingsForm.tsx` | duitnow slot form | The Bank QR settings form at /admin/settings/qr: recipient, bank, instructions, image upload and activation. Touch ’n Go uses the adjacent method choice. There is one QR per method. |
| **Slot enabled toggle** | Control | `app/(admin)/admin/settings/qr/QrSettingsForm.tsx` | slot enable checkbox | The checkbox enabling a slot for customers. Enabling requires fully configured recipient details (payee, provider, QR URL); the database RPC re-checks and bumps the slot's version atomically. |
| **Slot configuration history** | State | `app/(admin)/admin/settings/qr/page.tsx` | slot audit log | Read-only configuration history in Settings: latest 50 changes per method, previous/current recipient, image, instructions, activation, actor and time. |

### Admin DuitNow payments
`/admin/payments`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Receipt history** | Layout region | `app/(admin)/admin/payments/page.tsx` | none | Expandable history within a payment-attempt detail: all receipt versions, current/prior labels, review amounts, reasons, reviewers, times and file-action tombstones. |
| **Receipt review controls** | Control | `app/(admin)/admin/payments/ReviewControls.tsx` | none | The decision inputs for the current receipt: confirmed received amount, insufficient-balance reason plus private evidence, rejected reason, or a correction of a prior decision. The server enforces current-receipt and concurrency rules. |
| **Receipt file controls** | Control | `app/(admin)/admin/payments/page.tsx` | none | Reasoned quarantine/removal and retry actions, available for current, prior and reviewed files. Removed files retain permanent tombstones. |
| **Review filters** | Control | `app/(admin)/AdminTable.tsx` | none | The administrator search and five outcome filters for the newest-first manual payment queue: pending, insufficient, rejected, confirmed and duplicate. Search covers customer, order and payment reference. |
| **Review evidence panel** | Layout region | `app/(admin)/admin/payments/page.tsx` | none | The private evidence area beside a review decision. It shows the receipt before the decision, current receipt, price, received, credited, remaining and excess amounts, while private evidence access is authorized separately. |
| **Review decision panel** | Layout region | `app/(admin)/admin/payments/ReviewControls.tsx` | none | The administrator decision surface for confirming an amount, recording an insufficient balance, rejecting a receipt, or appending a correction. It never publishes an invitation or creates a second paid draft. |
| **Review queue** | Layout region | `app/(admin)/admin/page.tsx` | manual review queue | The newest-first administrator queue for the current manual receipt per payment attempt. Search and filters cover pending, insufficient, rejected, confirmed and duplicate outcomes; older legacy transfer references remain in a separate history section. |
| **Submission row** | Component | `app/(admin)/admin/payments/page.tsx` | none | One current manual payment attempt rendered from its immutable receipt and review projection: customer, method, price, received amount, outcome and submitted time. |
| **Review controls** | Control | `app/(admin)/admin/payments/ReviewControls.tsx` | none | Legacy reference-only review controls for older transfer rows. They remain separate from the current receipt decision panel and cannot publish an invitation. |
| **Payment review history** | State | `app/(admin)/admin/payments/page.tsx` | review audit log | The append-only decision history for a manual payment attempt: outcomes, received/credited/remaining/excess amounts, reviewer, reasons, correction links and timestamps. Receipt files and private evidence remain managed separately. |

### Admin card detail
`/admin/cards/[id]`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Edit window controls** | Control | `app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx` | grant edit window, reopen editing | The administrator-only Card-detail block for opening or reopening a fixed seven-day post-publication edit window. It requires a bounded reason, records the actor and database-clock deadline, and never edits the invitation directly. |
| **Edit window deadline** | Content field | `app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx` | admin deadline | The fixed seven-day deadline shown from the successful administrator grant. Duplicate retries preserve the original deadline; an expired window remains private and locked. |
| **Edit window reason** | Content field | `app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx` | revision reason | The required bounded reason for a new administrator grant or reopen. It is audited with the actor and grant time and is not customer invitation content. |
| **Grant edit window button** | Control | `app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx` | open limited editing | The explicit administrator action that starts or reopens one seven-day revision window. It is replay-safe, serializes conflicting grants, and atomically makes the same guest slug private. |
| **Availability controls** | Control | `app/(admin)/admin/cards/[id]/TogglePublishButton.tsx` | none | The administrator-only paid-state availability block on the Card-detail page: disable a paid Published invitation (reason required + confirmation) or restore a paid Unavailable one. Every action is recorded through `POST /api/admin/cards/[id]/publish` into the append-only audit table; there is no customer endpoint and no arbitrary visibility boolean. |
| **Disable reason field** | Content field | `app/(admin)/admin/cards/[id]/TogglePublishButton.tsx` | reason textarea | The required textarea behind a reasoned disable. A blank reason is rejected client- and server-side, and the database CHECK constraint refuses a disable row without one — the recorded reason is what the owner sees on the dashboard. |
| **Restore invitation control** | Control | `app/(admin)/admin/cards/[id]/TogglePublishButton.tsx` | restore button | The `Pulihkan Jemputan` button offered only for a paid Unavailable invitation — unpublished with its latest recorded action being a disable. Restoring appends a `restored` audit row and re-publishes atomically without resetting the original publication timestamp. |
| **Availability action record** | Component | `app/(admin)/admin/cards/[id]/page.tsx` | availability history entry, audit record | One append-only row of the availability history table (`card_availability_actions`): action (Dinyahterbitkan / Dipulihkan), acting administrator, optional reason, and timestamp, newest first. Owners see their own cards' records on the dashboard boundary; clients can read but never write. |
| **Unpaid activation block** | State | `app/(admin)/admin/cards/[id]/TogglePublishButton.tsx` | blocked activation message | The blocked explanation shown instead of availability controls when a card is unpaid (Editing) or still Publishing: activation is refused with a conflict until the invitation actually reaches Published. |
| **Payment-confirmed metadata** | Content field | `app/(admin)/admin/cards/[id]/page.tsx` | payment-confirmed time, payment completion time | The administrator's payment confirmation field: winning payment completion time, localized to Asia/Kuala_Lumpur, with a blank state for unpaid or historical rows without a recorded completion. |
| **Payment age** | Content field | `app/(admin)/admin/cards/[id]/page.tsx` | days since payment | The administrator-only whole-day count since the winning payment was confirmed. It stays empty when payment has not been confirmed and never implies a paid-draft expiry or hosting duration. |
| **Administrator lifecycle state** | State | `app/(admin)/admin/cards/[id]/page.tsx` | admin lifecycle, lifecycle state | The derived invitation lifecycle shown to administrators: Editing, Paid draft, Publishing, Published, Edit window, Edit window expired, Unavailable or Retired. It is read from payment, publication, current-pointer, window, availability and controlled-replacement facts rather than a customer-writable status field. |
| **Controlled replacement panel** | Layout region | `app/(admin)/admin/cards/[id]/ControlledReplacementPanel.tsx` | replacement controls, replacement lineage panel | The administrator-only Card-detail panel for a reasoned replacement grant and atomic cutover. It shows the durable administrator reason, source/target lineage, grant-only entitlement status, target preparation readiness and the action to create or complete the replacement; it makes clear that the owner may edit the pending draft but only administrator cutover can publish it, and never offers payment or ordinary publication controls. |
| **Draft activity** | Content field | `app/(admin)/admin/cards/[id]/page.tsx` | last activity, last draft activity | The last successful customer draft-save time. Reads and polling do not change it; an old row with NULL activity says `Tiada aktiviti pelanggan direkodkan` instead of inventing a timestamp. |
| **Admin invitation summary** | Layout region | `app/(admin)/admin/cards/[id]/page.tsx` | none | First-view summary of design, payment state, response count and attending guests. Availability reasons and current edit deadlines remain visible. |
| **Payment and activity disclosure** | Control | `app/(admin)/admin/cards/[id]/page.tsx` | none | Closed by default; reveals technical identifiers, payment details, creation/publication dates and draft activity, with order/payment links. |
| **Access and editing disclosure** | Control | `app/(admin)/admin/cards/[id]/page.tsx` | none | Closed by default; reveals reasoned disable/restore controls and administrator-approved seven-day editing controls. |
| **Admin history disclosure** | Control | `app/(admin)/admin/cards/[id]/page.tsx` | none | Closed by default; reveals immutable editing and availability records with reasons, actors and timestamps. |
| **Admin deletion disclosure** | Control | `app/(admin)/admin/cards/[id]/page.tsx` | none | Closed by default; separates permanent deletion from routine review. Opens the guarded deletion confirmation. |

### Customer invitations
`/admin/cards`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **Customer invitations table** | Component | `app/(admin)/admin/cards/page.tsx` | none | Compact searchable list at /admin/cards: invitation, customer, lifecycle and a detail link. Status filtering and twenty-row pagination reuse AdminTable. |

### RSVP dashboard
`/dashboard/cards/[id]/rsvp`

| Canonical name | Kind | Lives in | Aliases | Definition |
|---|---|---|---|---|
| **RSVP dashboard header** | Layout region | `app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx` | none | Respons RSVP with the current publication's invitation name and a return link to Jemputan saya, using the shared cream and deep-plum app styling. |
| **RSVP sharing actions** | Control | `app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx` | none | Salin pautan and Buka jemputan for a published invitation with a readable current publication. Empty responses retain a copy-link prompt. |
| **RSVP attendance summary** | Layout region | `app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx` | none | Expected guest count, including additional guests, alongside attending and declining response counts. These are distinct from the total responses displayed above the list. |
| **RSVP response list** | Layout region | `app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx` | none | Owner-only responses across the invitation's publications, newest first. Each collapsed row shows name, Kuala Lumpur response time, attendance and guest count. Empty lists explain how to start receiving responses. |
| **RSVP response details** | Component | `app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx` | none | Keyboard-accessible native disclosure under a guest name, containing contact information and the complete, untruncated message. Missing fields are stated explicitly. |

### Words that misfire

**Qualify. The word is real, but it names more than one thing.**

- `Component` _(also in Core concepts)_. Here it is the category for any reusable React unit, such as Navbar, Stat tile, or Footer column. The Core concepts section uses it far more narrowly, for the React function that draws a Section variant. Say "Section renderer" for that sense. Say: **Landing section**, **RSVP section**
- `Gaya` _(also in Core concepts)_. Two different controls on the same screen use this word. In the editor sidebar it means the card-level theme preset. Inside the sub-form it labels the per-Section variant picker. Say: **Gaya panel**, **Variant gallery**
- `Preview` _(also in Core concepts)_. Four surfaces answer to this word. The iframe inside a gallery card. The iframe on the template detail page. The editor's inline right-pane render. The standalone /templates/preview/[id] route. Say: **Gallery preview iframe**, **Detail preview iframe**, **Live preview**, **Bare preview surface**
- `Card` _(also in Core concepts)_. This word means at least four things. The `cards` database row. The rendered invitation. A gallery tile. The shadcn `Card` primitive in components/ui/card.tsx. Say: **Template showcase card**, **Card column**, **Card row**, **Section stack**
- `Template` _(also in Core concepts)_. This names the catalogue entry a customer picks. It also names the legacy React components in components/templates/ and components/card-previews/ that draw whole legacy cards. Say: **Template showcase card**, **Template info panel**, **Template management table**
- `Theme` _(also in Core concepts)_. Three things carry this name. The card's `Theme` data object. A Gaya preset. The site's Tailwind design tokens. Say: **Gaya panel**, **Gaya swatch**
- `Phone frame`. Three separate implementations carry this name. The gallery draws a 9:19 device frame. The detail page draws a fixed 295×640 frame. The editor uses the shared 340×712 PhonePreview. Say: **Device frame**, **Detail preview phone**, **Phone preview frame**
- `Sidebar`. Only the editor has a sidebar. The admin area uses a horizontal nav instead. Say: **Section sidebar**, **Admin nav**
- `Section` _(also in Core concepts)_. The product concept is a `SectionInstance` on a card. An ordinary page region is not. A `<section>` element on the templates page is not a Section. Say: **Section stack**, **Section row**, **Landing section**
- `Menu`. The Navbar contains navigation links and a hamburger button. The hamburger opens the Account menu on desktop and mobile. Say: **Navbar**, **Account menu**, **Admin nav**
- `Payment retry`. A Stripe Checkout retry reuses a durable reservation when Stripe confirms its Session is still open, but Stripe cannot begin while a DuitNow submission is unreviewed. A rejected DuitNow retry is a fresh immutable submission, while an old rejected record remains history. Say: **Stripe choice**, **Rejected state**
- `Checkout expiry`. The local stored expiry is not proof a Checkout Session cannot charge. Only Stripe-confirmed expiry permits the exact reservation/session handoff to DuitNow. Say: **Payment method dialog**, **Payment cancelled**
- `RSVP form`. Two things carry this name. The `rsvp` Section that cards render. The older standalone components/RSVPForm.tsx that the legacy card path uses. Say: **RSVP section**

**Avoid. Nothing in this codebase answers to it.**

- `Hero`. Nothing in the code answers to this name. The card's cover screen is the `landing` Section. The templates page has a gallery hero, which is a different thing on a different surface. Say: **Landing section**, **Gallery hero**
- `Modal / popup`. No flow documented here uses the shadcn Dialog. The add-section picker is an inline panel inside the sidebar. Say: **Add section button**
- `Publish button`. Customer publication is a separate paid-draft action, not a payment side effect. When the paid-draft UI exposes this control, it must flush the latest saved version, require the exact public/read-only acknowledgement, and leave administrator disable/restore as a separate control. Say: **Continue to payment button**, **Lifecycle indicator**
- `Save button`. The editor has no save button. Drafts save on a debounce. The save indicator reports the result. Say: **Save indicator**

### Not yet named

- **Auth pages.** No plate covers /login, /register, /forgot-password, or /reset-password. The register PDPA consent checkbox has no term yet. (`app/(auth)/`)
- **RSVP responses page.** The host's RSVP response table at /dashboard/cards/[id]/rsvp has no plate. (`app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx`)
- **Custom order flow.** Only the custom order link and the admin nav reference /templates/custom and the admin Tempahan Khas queue. (`app/(public)/templates/custom/, app/(admin)/admin/custom-orders/`)
- **Admin card detail.** The /admin payment controls are covered by the Admin DuitNow payments plate, but the individual /admin/cards/[id] lifecycle detail remains wireframe-only outside that payment surface. (`app/(admin)/admin/cards/[id]/`)
- **Section internals.** Each Section gets one term. The parts inside a variant have none. That covers the 8 landing variants, the 6 live RSVP variants, and the wishlist tabs. (`components/sections/`)
- **Legacy card path.** components/InvitationCard.tsx, components/templates/*, and components/card-previews/* draw pre-Section-v2 cards. Only the Section-v2 path has terms. (`components/InvitationCard.tsx`)
- **Email templates.** The Resend order-confirmed and RSVP-notification emails are interfaces too. They have no terms. (`components/emails/`)
- **Error and loading states.** No plate covers the per-group error.tsx, loading.tsx, or not-found.tsx files. (`app/(public)/error.tsx and siblings`)
- **Screenshots for auth-gated routes.** The section editor, dashboard, checkout, and admin plates use wireframes only. This project points at a hosted Supabase. A capture would mean creating real accounts and rows. (`docs/ui-glossary/capture.mjs`)
<!-- END GENERATED: ui-terms -->

---

## Section catalogue

<!-- BEGIN GENERATED: section-catalogue -->
_Generated from `lib/sections/registry.ts`. Do not edit by hand._
_19 Sections. A Section is one content block on a card. A card is a stack of them._

| `type` | Label (ms) | Label (en) | Variants | Default variant | Notes |
|---|---|---|---|---|---|
| `landing` | Pembukaan | Landing | 8 | `photo_hero` | none |
| `welcome` | Aluan | Welcome | 1 | `card_centered` | none |
| `quote` | Petikan | Quote | 1 | `centered` | none |
| `event_info` | Maklumat Majlis | Event Info | 2 | `card_stack` | none |
| `program` | Atur Cara | Program | 2 | `timeline` | none |
| `map` | Peta | Map | 2 | `button_row` | none |
| `calendar` | Kalendar | Calendar | 3 | `buttons` | none |
| `countdown` | Kira Detik | Countdown | 4 | `digital` | none |
| `rsvp` | Maklumbalas | RSVP | 6 | `walimah` | 2 legacy variants hidden |
| `thank_you` | Terima Kasih | Thank You | 1 | `card` | none |
| `contact` | Hubungi | Contact | 1 | `list` | none |
| `child_info` | Maklumat Anak | Child Info | 1 | `centered` | limited to some template types |
| `wishlist` | Hadiah / DuitRaya | Wishlist / Gift | 1 | `tabbed` | none |
| `guestbook` | Ucapan Tetamu | Guestbook | 1 | `wishes_wall` | none |
| `dress_code` | Kod Pakaian | Dress Code | 1 | `swatch` | none |
| `agenda_multi_day` | Jadual Berbilang Hari | Multi-day Agenda | 1 | `day_cards` | limited to some template types |
| `corporate_speakers` | Penceramah | Speakers | 1 | `grid` | premium, limited to some template types |
| `gallery` | Galeri Foto | Photo Gallery | 1 | `designer` | repeatable, 2 legacy variants hidden |
| `love_story` | Kisah Cinta | Love Story | 3 | `chapters` | limited to some template types |

Variant names live in each module's `variants` map: `components/sections/<type>/index.tsx`.
<!-- END GENERATED: section-catalogue -->

---

## Core concepts

Six distinctions the code does not make obvious. You can read everything else
about the data model from `lib/types.ts` and `lib/sections/types.ts`.

**Template, Theme, Gaya, and Variant.** Four words for four different things.
This is the most common mix-up in the repo.
A **Template** is the starting preset a customer picks. It seeds a card with a
Theme and an ordered Section list.
A **Theme** is the card-wide visual data: palette, fonts, animation, background.
A **Gaya** is a named Theme preset. Picking one replaces the whole Theme. It can
also re-suggest Variants for Sections the customer has not locked.
A **Variant** is one Section's visual treatment. It changes that Section only.

**Section and Section renderer.** A Section is a content block a customer
arranges, such as `rsvp` or `landing`. A Section renderer is the React function
that draws one of its Variants. Customers arrange Sections. They never touch
renderers. Say "Section renderer", not "Component", for the React function.

**SectionInstance and SectionModule.** A SectionInstance is one use of a Section
on a card: `{ type, variant, enabled, order, data }`. It lives in the card's
`sections[]` array. A SectionModule is the developer-facing export that defines
a Section: schema, variants, defaults, label. One module has many instances.

**Registry.** The map from `SectionType` to `SectionModule` in
`lib/sections/registry.ts`. The editor, the previews, and the published card all
resolve Sections through it. To add a Section, register it here.

**Draft, Paid draft, and Published card.** A Draft is the customer's unpaid,
unpublished work. The editor caches it in localStorage and saves it to
`cards.custom_data_draft` on a debounce. A Paid draft is the editable,
unpublished result of sufficient manual QR payment; it has no guest URL and is
not promoted by the Stripe publication transition. A Published card is the
snapshot at `/i/[slug]`, created by Stripe fulfilment (or the later manual
publication workflow). Customers cannot publish directly.

**Customer and Guest.** The Customer buys the card and edits it. The Guest
receives the link and submits an RSVP. They never see the same screens.

---

## Malaysian event terms (cultural reference)

These are the events in `TEMPLATE_TAXONOMY.md` §2 explained for agents unfamiliar with Malaysian context.

**Akad nikah.** The Islamic marriage solemnisation ceremony. Often a separate event from the reception. A Malay wedding card may cover both.

**Walimatul Urus.** The wedding reception / feast (Arabic-origin term used in Malaysia). The "marketing" side of a Malay wedding.

**Pertunangan.** Engagement ceremony (Malay).

**Merisik.** Pre-engagement family visit. Less formal than pertunangan. Sometimes invitation-card-worthy.

**Hantaran.** Gift exchange between families during pertunangan. Sometimes a separate event.

**Aqiqah.** Muslim newborn celebration. It typically involves slaughter of livestock as a thanksgiving and a meal with family. Held within the first weeks/months.

**Cukur Jambul.** Newborn's first-haircut ceremony, often paired with Aqiqah.

**Khatam Quran.** A child's celebration upon completing recitation of the Quran. Family + close friends event.

**Khenduri / Kenduri.** General Malay term for a feast or gathering, often religiously themed (`Kenduri Doa Selamat` = prayer for safety / blessings). It can mark housewarming, returning from haj, recovery from illness, etc.

**Doa Selamat.** A short prayer of thanks / petition. The event built around it is often `Kenduri Doa Selamat`.

**Tahlil.** Muslim memorial prayer event. It is typically held on the 7th, 40th, or 100th day after a death. Sombre. See `TEMPLATE_TAXONOMY.md` Tier 4.

**Maulidur Rasul.** Celebration of the Prophet Muhammad's birthday. Sometimes home-hosted with an invitation card.

**Hari Raya Aidilfitri.** Eid al-Fitr. The Muslim celebration that ends Ramadan. The big open-house season in Malaysia.

**Rumah Terbuka.** "Open house". The cultural norm of hosting extended family + friends + colleagues during a major festival.

**DuitRaya.** Cash gifts given to children during Hari Raya. Modern equivalent: e-wallet QR codes (Touch 'n Go, GrabPay, DuitNow).

**囍 / Double Happiness.** Chinese wedding symbol. Defines the visual language of `wedding_chinese`.

**Ang pao / 紅包.** Red envelope cash gift. Given at Chinese New Year, weddings, full-moon celebrations.

**Full Moon Celebration / 滿月酒.** Chinese newborn celebration at one month old. Family banquet.

**Tea Ceremony.** Chinese wedding ceremony where the couple serves tea to elders. Often the morning before the banquet.

**Deepavali / Diwali.** Hindu festival of lights. A major Indian Malaysian celebration.

**Sangeet.** Indian pre-wedding music + dance night. Often invitation-worthy on its own.

**Mehndi.** Henna ceremony before an Indian (especially Hindu/Sikh) wedding.

---

## Sources

- root `AGENTS.md`. Stack, routes, Supabase clients, env vars.
- `docs/ui-glossary/`. The visual glossary. `index.html` wires each term to the
  part it names.
- `docs/FLOW.md`. How services connect and how data moves.
- `docs/TEMPLATE_TAXONOMY.md`. Event types and the Section catalogue rationale.
- `docs/TEMPLATE_GAYA.md`. The Gaya presets.
