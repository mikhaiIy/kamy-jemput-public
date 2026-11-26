/* Terms — published invitation, section editor, dashboard, checkout, admin. */

window.KAMY_GLOSSARY.terms.push(
  {
    id: "admin-invitation-preview",
    name: "Admin invitation preview iframe",
    target: "admin.invitation-preview",
    cat: "component",
    plate: "admin-workspace",
    def: "Administrator-only saved invitation rendered in the shared Phone preview frame, beside review controls on desktop and above them on mobile. The iframe has its own viewport and scroll; it shows the latest saved draft without publishing it.",
    src: ["app/(admin)/admin/cards/[id]/page.tsx", "app/(preview)/admin/cards/[id]/preview/page.tsx", "components/PhonePreview.tsx"],
    aliases: [],
    prompt: "Check the Admin invitation preview iframe."
  },
  {
    id: "receipt-viewer",
    name: "Receipt viewer",
    target: "receipt.viewer",
    cat: "component",
    def: "Dialog opened by Buka resit over the current screen: authenticated image or PDF preview, original-size image toggle, explicit download, loading and retry states. Admins can open current and prior versions; customers see only their current receipt.",
    plate: "admin-workspace",
    src: ["components/ReceiptViewer.tsx"],
    aliases: [],
    prompt: "Check the Receipt viewer."
  },
  {
    "id": "admin-overview",
    "name": "Admin overview",
    "target": "admin.overview",
    "cat": "region",
    "def": "Task-linked pending counts and latest orders in the shared kamy-jemput palette, with Cormorant headings and Jakarta interface text; each opens its corresponding list.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Admin overview."
  },
  {
    "id": "admin-table-search",
    "name": "Admin table search",
    "target": "admin.search",
    "cat": "field",
    "def": "Case-insensitive search combined with all selected filters. Searches the complete server-loaded list.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Admin table search."
  },
  {
    "id": "admin-table-filters",
    "name": "Admin table filters",
    "target": "admin.filters",
    "cat": "control",
    "def": "Status filter on each table and category filter on templates, with a reset action.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Admin table filters."
  },
  {
    "id": "admin-orders-table",
    "name": "Orders table",
    "target": "admin.orders",
    "cat": "component",
    "def": "Order/customer, template, amount, payment state, payment-confirmed time, lifecycle and invitation management link, with payment age and last customer draft activity for paid orders.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx",
      "app/(admin)/admin/orders/page.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Orders table."
  },
  {
    "id": "admin-payment-table",
    "name": "Payment attempts table",
    "target": "admin.payments",
    "cat": "component",
    "def": "One current receipt per attempt, customer/order links, amount totals, status and submission time in Asia/Kuala_Lumpur (UTC+8); expandable details show history and actions.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Payment attempts table."
  },
  {
    "id": "admin-custom-table",
    "name": "Custom requests table",
    "target": "admin.custom",
    "cat": "component",
    "def": "Customer requests with search, status filters and expandable brief/contact/status editing.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Custom requests table."
  },
  {
    "id": "admin-row-details",
    "name": "Admin row details",
    "target": "admin.details",
    "cat": "region",
    "def": "Focused details revealed by the row action, preserving the surrounding searchable list.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Admin row details."
  },
  {
    "id": "admin-table-pagination",
    "name": "Admin table pagination",
    "target": "admin.pagination",
    "cat": "control",
    "def": "Twenty rows per page, previous/next buttons and page count; filtering resets to the first page.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Admin table pagination."
  },
  {
    "id": "admin-confirmation",
    "name": "Admin confirmation dialog",
    "target": "admin.confirmation",
    "cat": "component",
    "def": "The shared Dialog surface for receipt review/file actions, template deactivation and invitation availability/deletion. All use the global deep-plum palette, white panels and pending dismissal guards.",
    "plate": "admin-workspace",
    "src": [
      "app/(admin)/AdminTable.tsx"
    ],
    "aliases": [],
    "prompt": "Check the Admin confirmation dialog."
  },
  {
    "id": "admin-edit-window",
    "name": "Edit window controls",
    "target": "admindetail.edit-window",
    "cat": "control",
    "plate": "admin-card-detail",
    "def": "The administrator-only Card-detail block for opening or reopening a fixed seven-day post-publication edit window. It requires a bounded reason, records the actor and database-clock deadline, and never edits the invitation directly.",
    "src": ["app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx", "app/api/admin/cards/[id]/edit-window/route.ts"],
    "aliases": ["grant edit window", "reopen editing"],
    "prompt": "Check the Edit window controls."
  },
  {
    "id": "admin-edit-window-deadline",
    "name": "Edit window deadline",
    "target": "admindetail.edit-window-deadline",
    "cat": "field",
    "plate": "admin-card-detail",
    "def": "The fixed seven-day deadline shown from the successful administrator grant. Duplicate retries preserve the original deadline; an expired window remains private and locked.",
    "src": ["app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx", "lib/types.ts"],
    "aliases": ["admin deadline"],
    "prompt": "Keep the Edit window deadline readable on narrow administrator screens."
  },
  {
    "id": "admin-edit-window-reason",
    "name": "Edit window reason",
    "target": "admindetail.edit-window-reason",
    "cat": "field",
    "plate": "admin-card-detail",
    "def": "The required bounded reason for a new administrator grant or reopen. It is audited with the actor and grant time and is not customer invitation content.",
    "src": ["app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx", "app/api/admin/cards/[id]/edit-window/route.ts"],
    "aliases": ["revision reason"],
    "prompt": "Show the edit-window reason validation beside the field."
  },
  {
    "id": "admin-grant-edit-window",
    "name": "Grant edit window button",
    "target": "admindetail.grant-edit-window",
    "cat": "control",
    "plate": "admin-card-detail",
    "def": "The explicit administrator action that starts or reopens one seven-day revision window. It is replay-safe, serializes conflicting grants, and atomically makes the same guest slug private.",
    "src": ["app/(admin)/admin/cards/[id]/GrantEditWindowButton.tsx", "app/api/admin/cards/[id]/edit-window/route.ts"],
    "aliases": ["open limited editing"],
    "prompt": "Disable the Grant edit window button while the audited transition is in flight."
  },
  /* ------------------------------------------------- published invitation */
  { id: "card-gutter", name: "Card gutter", cat: "region", plate: "invitation-card", target: "invite.gutter",
    def: "The full-bleed background behind the invitation column on desktop: the card's own `theme` background darkened by a 6% black overlay.",
    src: ["app/(invite)/i/[slug]/page.tsx"],
    aliases: ["page gutter", "card backdrop"],
    prompt: "Deepen the card gutter overlay from 6% to 10% black." },

  { id: "card-column", name: "Card column", cat: "region", plate: "invitation-card", target: "invite.column",
    def: "The centred 480px-max column the invitation is painted into, with a soft outer shadow and hairline side borders. Full width on mobile.",
    src: ["app/(invite)/i/[slug]/page.tsx"],
    aliases: ["invitation column", "card frame"],
    prompt: "Widen the card column from 480px to 560px." },

  { id: "section-stack", name: "Section stack", cat: "region", plate: "invitation-card", target: "invite.section-stack",
    def: "The rendered list of Sections inside a card: enabled instances only, sorted by `order`, each resolved through the registry, painted over the active Gaya preset's own background with its decorative ambient-motion layer (`.gaya-backdrop`). This is the body of the invitation.",
    src: ["components/SectionInvitationCard.tsx", "lib/sections/registry.ts"],
    aliases: ["card body", "section list (rendered)"],
    prompt: "Add a scroll-progress indicator down the side of the section stack." },

  { id: "landing-section", name: "Landing section", cat: "component", plate: "invitation-card", target: "invite.landing-section",
    def: "The `landing` Section — the cover screen a guest sees first. Eight variants: `photo_hero`, `minimalist`, `kinetic_hero`, `sakura_depth`, `poster_luxe`, `doodle_scrapbook`, `celestial_gate`, `premiere_gate`.",
    src: ["components/sections/landing/index.tsx"],
    aliases: ["cover section"],
    avoidAliases: ["hero", "hero section", "splash"],
    prompt: "Add a scroll-down cue to the landing section's `minimalist` variant." },

  { id: "headline-field", name: "headline", cat: "field", plate: "invitation-card", target: "invite.headline",
    def: "The landing Section's main line — the couple's or host's name. Stored at `sections[i].data.headline`; default `Sarah & Adam`.",
    src: ["components/sections/landing/index.tsx", "lib/types.ts"],
    aliases: ["couple name", "card title"],
    prompt: "Let the `headline` field wrap to two lines in the `photo_hero` variant." },

  { id: "tagline-field", name: "tagline", cat: "field", plate: "invitation-card", target: "invite.tagline",
    def: "The landing Section's occasion line under the headline — `Walimatul Urus` by default. Stored at `sections[i].data.tagline`.",
    src: ["components/sections/landing/index.tsx"],
    aliases: ["occasion line", "subtitle"],
    prompt: "Letterspace the `tagline` field in the landing section." },

  { id: "event-info-section", name: "Event info section", cat: "component", plate: "invitation-card", target: "invite.event-info-section",
    def: "The `event_info` Section: date, time, venue, address. Variants `card_stack` (default) and `single_card`. Its `date` is what the dashboard and the OG image read.",
    src: ["components/sections/event_info/index.tsx"],
    aliases: ["details section", "when and where"],
    prompt: "Add a `parking notes` field to the event info section's schema and both variants." },

  { id: "venue-field", name: "venue", cat: "field", plate: "invitation-card", target: "invite.venue-field",
    def: "The event_info Section's venue name, stored at `sections[i].data.venue`. Distinct from `address`, which is the street line the map Section links from.",
    src: ["components/sections/event_info/index.tsx"],
    aliases: ["location name"],
    prompt: "Show the `venue` field above the date in the `single_card` variant." },

  { id: "countdown-section", name: "Countdown section", cat: "component", plate: "invitation-card", target: "invite.countdown-section",
    def: "The `countdown` Section, counting down to the resolved event date. Variants `digital`, `flip_cards`, `lunar_phases`, `film_leader`.",
    src: ["components/sections/countdown/index.tsx", "lib/sections/resolve-event-date.ts"],
    aliases: ["timer section"],
    prompt: "Freeze the countdown section at zero once the event date has passed." },

  { id: "rsvp-section", name: "RSVP section", cat: "component", plate: "invitation-card", target: "invite.rsvp-section",
    def: "The `rsvp` Section a guest submits from. Six live variants (`walimah` default, `romance_envelope`, `double_happiness`, `marigold`, `confetti_pop`, `boardroom_badge`) plus two legacy ones kept only so old cards still render.",
    src: ["components/sections/rsvp/index.tsx", "app/api/rsvp/[cardId]/route.ts"],
    aliases: ["RSVP block"],
    note: "Not the same thing as `components/RSVPForm.tsx`, which is the older standalone form used by the legacy card path.",
    prompt: "Add a dietary-requirements input to the RSVP section's `walimah` variant." },

  { id: "guestbook-section", name: "Guestbook section", cat: "component", plate: "invitation-card", target: "invite.guestbook-section",
    def: "The `guestbook` Section — the wishes wall where guests leave messages. Single variant `wishes_wall`.",
    src: ["components/sections/guestbook/index.tsx", "components/sections/_wishes_context.tsx"],
    aliases: ["wishes wall", "attendees message"],
    prompt: "Paginate the guestbook section after 20 wishes." },

  { id: "card-footer", name: "Card footer", cat: "component", plate: "invitation-card", target: "invite.card-footer",
    def: "The `kamy jemput` credit line closing every rendered card, in the theme's muted colour.",
    src: ["components/SectionInvitationCard.tsx"],
    aliases: ["card credit"],
    prompt: "Link the card footer to the marketing site." },

  { id: "section-error-boundary", name: "Section error boundary", cat: "state", plate: "invitation-card", target: "invite.section-stack",
    def: "Each Section renders inside a boundary that swallows render errors: a Section with stale or invalid data renders nothing rather than blanking the whole card.",
    src: ["components/SectionInvitationCard.tsx"],
    aliases: [],
    prompt: "Render a quiet placeholder when the section error boundary trips, instead of nothing." },

  { id: "guest-edit-window-notice", name: "Guest edit-window notice", cat: "state", plate: "invitation-card", target: "invite.edit-window-notice",
    def: "The only guest-visible content while the same invitation slug is private for an active or expired administrator-approved window: a safe bounded customer display name followed by `is making edits. Please wait.` It never includes the prior event snapshot, metadata or asset references.",
    src: ["components/GuestEditWindowNotice.tsx", "lib/public-invitation.ts", "lib/guest-visibility.ts"],
    aliases: ["private invitation notice", "revision notice"],
    prompt: "Keep the Guest edit-window notice centered and calm on desktop and mobile." },

  /* ---------------------------------------------------------- section editor */
  { id: "editor-top-bar", name: "Editor top bar", cat: "region", plate: "section-editor", target: "editor.top-bar",
    def: "The editor's own header: back link to the dashboard, template name with the save indicator beneath it, and the payment action or manual-review status action on the right. Separate from the site Navbar.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["editor header"],
    prompt: "Make the editor top bar sticky when the sub-form scrolls." },

  { id: "save-indicator", name: "Save indicator", cat: "state", plate: "section-editor", target: "editor.save-indicator",
    def: "The draft persistence state under the template name, with exactly four values: `Sedia`, `Menyimpan…`, `Disimpan ✓`, and an error state that also renders a `Cuba lagi` button.",
    src: ["components/SectionEditor.tsx", "app/api/cards/[id]/draft/route.ts"],
    aliases: ["autosave status"],
    prompt: "Hold the save indicator on `Disimpan ✓` for 2s before returning to `Sedia`." },

  { id: "continue-to-payment-button", name: "Continue to payment button", cat: "control", plate: "section-editor", target: "editor.pay-button",
    def: "The primary editor action showing the template price. It validates the draft, force-saves it to `custom_data_draft`, and navigates to the owned order's checkout page where the payment method is chosen — it never starts a Stripe session itself. During active manual receipt review, the same area becomes a separate payment-status action: it flushes the latest serialized draft, skips invitation completeness validation, shows `Menyimpan…` while waiting, and keeps retry/conflict feedback in the editor when saving fails. It navigates only after a successful save.",
    src: ["components/SectionEditor.tsx", "app/actions/order.ts", "app/api/stripe/checkout/route.ts"],
    aliases: ["pay button", "checkout button"],
    prompt: "Disable the continue to payment button while the save indicator is still `Menyimpan…`." },

  { id: "validation-banner", name: "Validation banner", cat: "state", plate: "section-editor", target: "editor.validation-banner",
    def: "The `role=\"alert\"` strip under the top bar listing why the draft cannot go to payment yet.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["error banner"],
    prompt: "Make each entry in the validation banner jump to the offending section." },

  { id: "three-pane-layout", name: "Three-pane layout", cat: "region", plate: "section-editor", target: "editor.three-pane",
    def: "The editor's `260px 1fr 360px` grid: section sidebar, sub-form, preview pane.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["editor layout"],
    note: "Used at 1024px and wider. Below that breakpoint the editor renders the canvas-first mobile shell instead — see Live card canvas, Form sheet, Sheet detent control, and Navigation rail.",
    prompt: "Give the three-pane layout a stacked mobile mode with the preview pane in a bottom sheet." },

  { id: "section-sidebar", name: "Section sidebar", cat: "region", plate: "section-editor", target: "editor.sidebar",
    def: "The editor's sticky left pane: the Gaya panel on top, then the section list, then the add section button.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["left pane", "editor sidebar"],
    prompt: "Let the section sidebar scroll independently when a card has many sections." },

  { id: "gaya-panel", name: "Gaya panel", cat: "component", plate: "section-editor", target: "editor.gaya-panel",
    def: "The collapsible card-level theme picker at the top of the sidebar. Choosing a Gaya replaces the draft's whole `theme` and may re-suggest variants for sections that are not variant-locked.",
    src: ["components/SectionEditor.tsx", "lib/themes/presets.ts"],
    aliases: ["theme picker", "Gaya picker"],
    note: "There are 14 presets: songket_emerald, royal_maroon, amber_classic, crimson_lacquer, imperial_gold, marigold_saffron, sakura_blush, midnight_celestial, editorial_cinema, blush_romance, garden_sage, confetti_bright, boardroom_ink, minimal_mono.",
    prompt: "Show the Gaya panel expanded by default on a brand-new draft." },

  { id: "gaya-swatch", name: "Gaya swatch", cat: "component", plate: "section-editor", target: "editor.gaya-swatch",
    def: "The gradient chip standing in for a theme preset, in the Gaya panel header and on each Gaya tile. A `★` marks presets recommended for the card's template type.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["theme swatch", "preset swatch"],
    prompt: "Add the palette's accent and gold as two stops in the Gaya swatch gradient." },

  { id: "section-list", name: "Section list", cat: "component", plate: "section-editor", target: "editor.section-list",
    def: "The reorderable list of the draft's Section instances, wired to dnd-kit's `SortableContext` with a vertical strategy.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["section order list"],
    prompt: "Announce the new position over a live region when the section list is reordered by keyboard." },

  { id: "section-list-header", name: "Section list header", cat: "component", plate: "section-editor", target: "editor.section-list-header",
    def: "The `Bahagian` label separating the Gaya panel from the section list.",
    src: ["components/SectionEditor.tsx"],
    aliases: [],
    prompt: "Show the enabled-section count in the section list header." },

  { id: "section-row", name: "Section row", cat: "component", plate: "section-editor", target: "editor.section-row",
    def: "One Section instance in the sidebar: drag handle, status dot, Malay label, visibility toggle, remove button. The active row gets a gold left border; a disabled one drops to 50% opacity. Selecting an enabled row scrolls the Live preview to its matching enabled Section stack item; selecting a disabled row activates the Sub-form only, since it has no rendered item to scroll to.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["sidebar row", "section item"],
    note: "Repeated Section types get a 1-based ordinal appended, e.g. `Galeri Foto 2`.",
    prompt: "Show the section row's variant name under its label." },

  { id: "drag-handle", name: "Drag handle", cat: "control", plate: "section-editor", target: "editor.drag-handle",
    def: "The `⋮⋮` grip on a section row, labelled `Susun semula`. It carries the dnd-kit listeners and stops click propagation so grabbing it does not also activate the row.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["grip", "reorder handle"],
    prompt: "Widen the drag handle's hit area to 32px without changing its glyph size." },

  { id: "status-dot", name: "Status dot", cat: "state", plate: "section-editor", target: "editor.status-dot",
    def: "The 8px completeness dot on a section row: green `complete`, gold `draft`, red for a section failing validation. Its `aria-label` is the raw status word.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["completion dot"],
    prompt: "Give the status dot a tooltip explaining what is still missing." },

  { id: "section-visibility-toggle", name: "Section visibility toggle", cat: "control", plate: "section-editor", target: "editor.visibility-toggle",
    def: "The `👁` / `⊘` button flipping `sections[i].enabled`. A disabled Section stays on the draft but is skipped by the renderer.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["enable toggle", "hide section"],
    prompt: "Replace the section visibility toggle's emoji with a proper switch control." },

  { id: "remove-section-button", name: "Remove section button", cat: "control", plate: "section-editor", target: "editor.remove-button",
    def: "The `×` on a section row. Confirms through a native `confirm()` before dropping the instance.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["delete section"],
    prompt: "Replace the remove section button's native confirm with an undo toast." },

  { id: "add-section-button", name: "Add section button", cat: "control", plate: "section-editor", target: "editor.add-section-button",
    def: "The `+ Tambah Bahagian` button under the section list, opening the add section picker.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["add block button"],
    note: "The picker hides Section types already on the card unless the module sets `repeatable` — today only `gallery` does.",
    prompt: "Keep the add section button visible while the section list scrolls." },

  { id: "sub-form", name: "Sub-form", cat: "region", plate: "section-editor", target: "editor.sub-form",
    def: "The centre pane: the editing surface for whichever Section is active. Uses the module's `customForm` when it declares one, otherwise the generic schema-driven form built from its zod schema.",
    src: ["components/SectionEditor.tsx", "lib/sections/types.ts"],
    aliases: ["centre pane", "section form"],
    prompt: "Add a `Reset to defaults` action to the sub-form header." },

  { id: "sub-form-header", name: "Sub-form header", cat: "component", plate: "section-editor", target: "editor.sub-form-header",
    def: "The active Section's Malay label with its English label and 1-based position beneath, plus a premium pill when the module's `tier` is `premium`.",
    src: ["components/SectionEditor.tsx"],
    aliases: [],
    prompt: "Show which Gaya is active in the sub-form header." },

  { id: "variant-gallery", name: "Variant gallery", cat: "control", plate: "section-editor", target: "editor.variant-gallery",
    def: "The per-Section treatment picker inside the sub-form. Renders swatch tiles when the module supplies `variantMeta`, otherwise compact chips, ordered recommended-first for the card's template type.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["variant picker", "section style picker"],
    note: "Its on-screen label is `Gaya` — the same word the sidebar uses for the card-level theme preset. Always say `variant gallery` or `Gaya panel` so it is unambiguous.",
    prompt: "Show the variant gallery's `hint` text under each tile, not only on the recommended ones." },

  { id: "variant-tile", name: "Variant tile", cat: "control", plate: "section-editor", target: "editor.variant-tile",
    def: "One option in the variant gallery. Picking it sets `variant` and also sets `variantAuto: false`, locking the Section against future Gaya re-suggestion.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["variant swatch"],
    prompt: "Mark the variant tile that a Gaya suggested but the customer has not yet locked." },

  { id: "form-field", name: "Form field", cat: "control", plate: "section-editor", target: "editor.form-field",
    def: "One input in the sub-form, generated per key of the Section's data. Its error text comes from the `errors` map keyed by field name.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["input", "editor field"],
    prompt: "Show a character counter on `headline` and `tagline` form fields." },

  { id: "live-preview-pane", name: "Live preview pane", cat: "region", plate: "section-editor", target: "editor.preview-pane",
    def: "The editor's sticky right column: the preview toolbar, the framed preview, and the `Kemas kini secara langsung` hint.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["preview column", "right pane"],
    prompt: "Add a `open in new tab` action to the live preview pane toolbar." },

  { id: "preview-mode-toggle", name: "Preview mode toggle", cat: "control", plate: "section-editor", target: "editor.preview-mode-toggle",
    def: "The two-button segmented control switching the preview between `Telefon` (a 340×712 device frame) and `Lebar` (a 460px-max plain column). Uses `aria-pressed`.",
    src: ["components/SectionEditor.tsx", "components/PhonePreview.tsx"],
    aliases: ["phone/wide toggle"],
    prompt: "Remember the preview mode toggle's choice across editor sessions." },

  { id: "phone-preview-frame", name: "Phone preview frame", cat: "component", plate: "section-editor", target: "editor.phone-frame",
    def: "Shared rounded device frame used by the editor and administrator invitation detail. Its 340×712 proportions shrink with available width; the admin version contains a private mobile-viewport iframe.",
    src: ["components/PhonePreview.tsx"],
    aliases: ["editor phone", "preview bezel"],
    prompt: "Reuse the phone preview frame on the template detail page instead of its bespoke 295×640 frame." },

  { id: "live-preview", name: "Live preview", cat: "component", plate: "section-editor", target: "editor.live-preview",
    def: "The in-memory draft rendered inline through the same `SectionInvitationCard` the published card uses. It updates on every keystroke, ahead of the debounced draft save, and scrolls smoothly (within its own scroller, never the page) to the enabled Section stack item matching a newly selected enabled Section row.",
    src: ["components/SectionEditor.tsx", "components/SectionInvitationCard.tsx"],
    aliases: ["inline preview"],
    note: "Not an iframe. The gallery and template detail previews are iframes of a separate route; this one is a component in the same React tree. Note the split: what docs/GLOSSARY.md calls \"Live preview\" is the whole right pane — that is Live preview pane here. This term is only the rendered card inside it.",
    prompt: "Scroll the live preview to the active section when the sidebar selection changes." },

  { id: "editor-hydration-shell", name: "Editor hydration shell", cat: "state", plate: "section-editor", target: "editor.top-bar",
    def: "Before mount the editor renders only its top bar, with `Memuatkan…` in place of the save indicator and a dimmed price. The three panes stay empty to keep dnd-kit and localStorage SSR-safe.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["editor skeleton"],
    prompt: "Add skeleton blocks for the three panes to the editor hydration shell so the layout stops jumping." },

  { id: "editor-help-control", name: "Help control", cat: "control", plate: "section-editor", target: "editor.help-control",
    def: "The `Bantuan` button in the editor top bar, rendered on both viewports. It replays the Section editor tour from step one at any time — for accounts that completed it and accounts that dismissed it alike — without clearing the account-level completion marker and without touching draft data.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["help button", "Bantuan button", "tour replay control"],
    prompt: "Move the help control into an overflow menu beside the preview mode toggle." },

  { id: "section-editor-tour", name: "Section editor tour", cat: "interaction", plate: "section-editor", target: "editor.tour-overlay",
    def: "The five-step desktop / six-step mobile Malay guided tour over the editor, with a separate step list per viewport. At 1024px and wider it walks the Section sidebar, Sub-form, Live preview pane, Save indicator, and Continue to payment button. On the canvas-first mobile shell it walks the Live card canvas, Form sheet, Sheet detent control, Navigation rail, the Section stack screen (Susun Bahagian), and the same Continue to payment button, with autosave folded into the Form sheet step. Every mobile step declares the pane it describes — the four card-and-sheet steps `edit`, Susun Bahagian `stack` — so the tour shows that screen wherever it was opened from; Susun Bahagian also points an animated reorder hint arrow above the first row's drag handle. The tour reconciles the shell through an editor-owned `onRequestPane` callback and restores the pane the customer started on whenever a step needs no particular pane and on every exit (Seterusnya, Kembali, ×, Escape, or completion); it holds no editor state beyond that pane switch. It auto-launches once per account while `users.section_editor_tour_completed_at` is NULL; finishing or dismissing stamps that marker through `app/actions/editor-help.ts` (never through the draft save), and the Help control replays it without clearing the marker. Its overlay is modal — focus is trapped inside its panel (a `Shift+Tab` from the freshly opened, initially focused panel wraps to the last enabled tour button instead of escaping) and restored to the opener on settle — and its state is ephemeral: never draft data, localStorage, or `custom_data_draft`. Desktop placement is Navbar-safe: its fixed overlay stacks above the 58px sticky Navbar (z-index 120 vs 100), measures the rendered panel height, and selects only a fitting above/below position before clamping the complete panel inside the viewport. On mobile the panel is full-bleed minus the gutter, derives its minimum top from the viewport (no Navbar reservation while the Navbar is hidden), stays 76px plus the gutter above the viewport bottom, and sits opposite its target; a step whose target is not yet present during a pane switch degrades to a centred panel with no highlight ring.",
    src: ["components/SectionEditorTour.tsx", "app/actions/editor-help.ts", "app/(dashboard)/dashboard/cards/[id]/edit/page.tsx"],
    aliases: ["editor tour", "guided tour", "onboarding tour"],
    note: "Both viewports share one completion marker, so a customer who settled the tour on either one does not see it again on the other. The desktop list has five stops and the mobile list six; autosave has no step of its own. The sticky desktop Navbar (58px, z-index 100) never covers the desktop panel: the overlay sits above the Navbar and the measured-height panel is clamped below it and inside the viewport.",
    prompt: "Translate the section editor tour's step copy to English." },

  { id: "paid-draft-publication-button", name: "Paid-draft publication button", cat: "control", plate: "section-editor", target: "editor.publish-button",
    def: "The `Terbitkan Jemputan` action shown only for the one owner-editable paid draft. It opens the publication acknowledgement dialog; it never exposes a guest link before the owner publication request commits.",
    src: ["components/SectionEditor.tsx", "app/api/cards/[id]/publish/route.ts"],
    aliases: ["publish paid-draft button", "publication button"],
    prompt: "Keep the paid-draft publication button disabled while a final save is in flight." },

  { id: "publication-acknowledgement-dialog", name: "Publication acknowledgement dialog", cat: "component", plate: "section-editor", target: "editor.publication-dialog",
    def: "Responsive keyboard-accessible confirmation for paid-draft publication. It presents the exact unchecked acknowledgement `I understand that this invitation will become public and read-only.`, flushes the latest save, and reports loading, validation, conflict, failure and retry states.",
    src: ["components/SectionEditor.tsx", "components/ui/dialog.tsx", "lib/publication.ts"],
    aliases: ["publish confirmation", "publication modal"],
    prompt: "Keep the publication acknowledgement dialog usable on a short mobile viewport." },

  { id: "revision-deadline", name: "Revision deadline", cat: "state", plate: "section-editor", target: "editor.revision-deadline",
    def: "The customer-facing deadline strip for an active administrator-approved edit window. It names the database-derived expiry and changes to a locked/support state after expiry; it is not a browser-only timer.",
    src: ["components/SectionEditor.tsx", "components/EditWindowLockedNotice.tsx", "app/(dashboard)/dashboard/cards/[id]/edit/page.tsx"],
    aliases: ["edit-window deadline", "expiry banner"],
    prompt: "Make the Revision deadline strip remain visible while the editor scrolls." },

  { id: "controlled-replacement-status", name: "Controlled replacement status", cat: "state", plate: "section-editor", target: "editor.controlled-replacement",
    def: "The owner-only status strip for a pending administrator-granted replacement: it explains that the target is an editable grant-only draft, shows preparation readiness, and hides ordinary payment/publication actions. Owner saves and target-scoped image uploads remain available while preparation is valid.",
    src: ["components/SectionEditor.tsx", "app/(dashboard)/dashboard/cards/[id]/edit/page.tsx", "app/api/admin/cards/[id]/replacement/route.ts"],
    aliases: ["replacement draft status", "administrator-granted replacement"],
    prompt: "Keep the Controlled replacement status separate from the ordinary Paid-draft indicator." },

  { id: "draft-conflict-state", name: "Draft conflict state", cat: "state", plate: "section-editor", target: "editor.draft-conflict",
    def: "The editor state after a versioned save or publication request receives a conflict. It blocks publication, explains that another saved version exists, and offers a reload action instead of publishing stale content.",
    src: ["components/SectionEditor.tsx", "app/api/cards/[id]/draft/route.ts", "app/api/cards/[id]/publish/route.ts"],
    aliases: ["stale draft state", "save conflict"],
    prompt: "Make the draft conflict state distinguish a stale tab from a network retry." },

  /* --------------------------------------------------------------- dashboard */
  { id: "dashboard-header", name: "Dashboard header", cat: "region", plate: "dashboard", target: "dash.header",
    def: "The heading Jemputan saya, short guidance and New invitation button above the customer invitation gallery.",
    src: ["app/(dashboard)/dashboard/page.tsx"],
    aliases: [],
    prompt: "Greet the customer by name in the dashboard header." },

  { id: "new-invitation-button", name: "New invitation button", cat: "control", plate: "dashboard", target: "dash.new-invitation-button",
    def: "Jemputan baharu opens the template gallery to start a new invitation.",
    src: ["app/(dashboard)/dashboard/page.tsx"],
    aliases: ["create card button"],
    prompt: "Send the new invitation button to the last-used category in the gallery." },

  { id: "date-group", name: "Date group", cat: "region", plate: "dashboard", target: "dash.group-current",
    def: "Customer invitations grouped into Perlu perhatian (every unpublished or unavailable lifecycle), Akan datang (published with a current/future date, plus undated published invitations) and Majlis lepas (all valid dates past). Upcoming sorts by the next event date in Kuala Lumpur; past sorts newest event first. One selected group is shown at a time; empty groups retain their filter and show an empty state.",
    src: ["app/(dashboard)/dashboard/page.tsx", "lib/sections/resolve-event-date.ts"],
    aliases: ["card list group", "Semasa group", "Akan Datang group", "Lepas group"],
    prompt: "Collapse each date group on the dashboard behind a toggle." },

  { id: "card-list", name: "Card list", cat: "region", plate: "dashboard", target: "dash.card-list",
    def: "Responsive gallery of Card rows with small phone renders, grouped by next action and event timing. Sticky group filters show the selected group, with search and six invitations per page.",
    src: ["app/(dashboard)/dashboard/page.tsx"],
    aliases: ["invitation list", "my cards"],
    prompt: "Add a count of cards per date group header." },

  { id: "card-row", name: "Card row", cat: "component", plate: "dashboard", target: "dash.card-row",
    def: "One compact invitation tile in the customer gallery: a scaled phone render, lifecycle, clamped event name, date, one short status or deadline and aligned next actions. Full names, admin/replacement explanations, request outcomes and payment detail open in the per-invitation Butiran dialog. At desktop widths, the phone render remains above the summary and actions; the narrow mobile layout keeps its established smaller phone beside the information and actions.",
    src: ["app/(dashboard)/dashboard/page.tsx", "app/(dashboard)/dashboard/InvitationGallery.tsx", "components/InvitationThumbnail.tsx"],
    aliases: ["invitation row"],
    prompt: "Show a thumbnail of the card's landing section in each card row." },

  { id: "invitation-details-dialog", name: "Invitation details dialog", cat: "component", plate: "dashboard", target: "dash.invitation-details",
    def: "Butiran is the accessible per-invitation Dialog for the full event name, lifecycle context, active or expired edit deadline, customer-safe availability reason, replacement lineage, Mohon Suntingan reason/outcome and manual-payment detail. The tile keeps only the essential status visible so neighboring actions stay aligned.",
    src: ["components/InvitationDetailsDialog.tsx", "app/(dashboard)/dashboard/page.tsx", "components/ui/dialog.tsx"],
    aliases: ["invitation details", "Butiran dialog"],
    prompt: "Open Butiran to read the full invitation context without stretching the tile." },

  { id: "publish-status-badge", name: "Lifecycle indicator", cat: "state", plate: "dashboard", target: "dash.lifecycle-badge",
    def: "The Lifecycle indicator names the derived state: Draf, Sedia untuk diterbitkan, Sedang disiapkan, Diterbitkan, Suntingan diluluskan, Suntingan tamat or Tidak tersedia. A grant-only replacement target uses the truthful Draf penggantian pentadbir label for its private editable paid-draft state. Private drafts never expose guest sharing controls.",
    src: ["app/(dashboard)/dashboard/page.tsx", "lib/types.ts"],
    aliases: ["status badge", "publish badge", "published pill"],
    prompt: "Add an aria-label to each lifecycle indicator spelling out the full state." },

  { id: "paid-draft-indicator", name: "Paid-draft indicator", cat: "state", plate: "dashboard", target: "dash.paid-draft-indicator",
    def: "Sedia untuk diterbitkan identifies a payment-backed, editable and unpublished invitation; its supporting copy confirms payment and owner publication. A controlled replacement target is still private and editable, but displays Draf penggantian pentadbir and makes clear that only administrator cutover can publish it.",
    src: ["app/(dashboard)/dashboard/page.tsx", "lib/types.ts"],
    aliases: [],
    prompt: "Keep the paid-draft indicator visually separate from the Published lifecycle." },

  { id: "manual-payment-message", name: "Manual payment status message", cat: "state", plate: "dashboard", target: "dash.manual-payment-message",
    def: "A compact payment status on the invitation tile. Butiran explains received, remaining, rejected, duplicate or excess amounts and support links without private audit data.",
    src: ["app/(dashboard)/dashboard/page.tsx", "components/InvitationDetailsDialog.tsx", "lib/payments.ts"],
    aliases: [],
    prompt: "Show the manual payment status message beside the paid-draft indicator." },

  { id: "paid-draft-action", name: "Paid-draft edit action", cat: "control", plate: "dashboard", target: "dash.paid-draft-action",
    def: "Semak & terbitkan returns a payment-backed owner to the Section editor to review the saved paid draft; publication still requires the existing explicit acknowledgement. A controlled replacement target instead shows Sambung suntingan and cannot self-publish.",
    src: ["app/(dashboard)/dashboard/page.tsx"],
    aliases: [],
    prompt: "Make the paid-draft edit action the only primary action for an unpublished paid draft." },

  { id: "unavailable-note", name: "Unavailable note", cat: "field", plate: "dashboard", target: "dash.unavailable-note",
    def: "A short unavailable status on the invitation tile. Butiran retains the recorded customer-safe reason, followed by the support action.",
    src: ["app/(dashboard)/dashboard/page.tsx", "components/InvitationDetailsDialog.tsx", "app/api/admin/cards/[id]/publish/route.ts"],
    aliases: ["disable reason line"],
    prompt: "Link the unavailable note to a support article about availability." },

  { id: "rsvp-counters", name: "Card row metrics", cat: "field", plate: "dashboard", target: "dash.rsvp-metrics",
    def: "Two compact figures on a published invitation tile: attending guests (sum of saved pax) and total responses. Lihat RSVP opens the detailed response breakdown.",
    src: ["app/(dashboard)/dashboard/page.tsx"],
    aliases: ["response counts"],
    prompt: "Add response-rate percentage beside the card row metrics.",
    note: "Out of scope by policy: guest management, delivery tracking, and no-response counts are not metrics here." },

  { id: "card-deletion-dialog", name: "Card deletion dialog", cat: "component", plate: "dashboard", target: "dash.delete-dialog",
    def: "Shared deep-plum confirmation surface with a destructive action, cancel focus, pending dismissal guard and inline error messages. Cancellation returns focus to the outlined Padam draf action with its trash icon.",
    src: ["app/(dashboard)/dashboard/DeleteCardButton.tsx"], aliases: ["delete popup"], prompt: "Keep deletion errors inside the Card deletion dialog." },

  { id: "support-contact-dialog", name: "Support contact dialog", cat: "component", plate: "dashboard", target: "dash.support-dialog",
    def: "Opened by Hubungi sokongan on an unavailable or locked invitation. Shows Sila hubungi followed by the configured email and WhatsApp links, without payment-specific wording. The dialog is wide enough for the contact sentence to fit on one line on desktop, with wrapping retained on small screens. Missing contacts show a neutral retry message. The close control or Escape returns focus to the trigger.",
    src: ["components/SupportContactDialog.tsx", "app/(dashboard)/dashboard/page.tsx"], aliases: ["support popup"], prompt: "Keep the Support contact dialog consistent with the configured contact channels." },

  { id: "card-row-actions", name: "Card row actions", cat: "control", plate: "dashboard", target: "dash.row-actions",
    def: "One primary action per lifecycle: Sambung suntingan, Semak & terbitkan, Semak status, Lihat RSVP or Hubungi sokongan. On an expired edit window, an eligible, rejected or stale Mohon Suntingan keeps the filled request primary and the shared Support contact dialog as the outlined secondary; while a request is pending, the same support dialog becomes the filled primary with no empty request slot. All non-Published tiles use shared primary and secondary tracks at the gallery's two-column width, reserving the 40px secondary row below the 44px primary even when empty; the row collapses with the single-column layout. Published invitations add Buka jemputan and Salin pautan, with eligible Mohon Suntingan requests in their separate secondary action area and a consistent reserved request row. Payment details use a full-width outlined Lihat bayaran button with a receipt icon in the secondary slot. The existing Bayar baki label and checkout destination remain conditional on payment state; deletion remains limited by existing payment guards.",
    src: ["app/(dashboard)/dashboard/page.tsx", "app/(dashboard)/dashboard/DeleteCardButton.tsx"],
    aliases: ["row buttons"],
    prompt: "Move the card row actions into an overflow menu on narrow screens." },

  { id: "customer-edit-request-status", name: "Customer edit request status", cat: "state", plate: "dashboard", target: "dash.edit-request-status",
    def: "The compact customer-safe status block for Mohon Suntingan: pending explains that a Published invitation remains public and read-only while an expired edit window remains private and locked; rejection and stale states point to Butiran for their bounded customer-readable reason. It never shows administrator identity or internal lifecycle data.",
    src: ["components/EditRequestDialog.tsx", "components/InvitationDetailsDialog.tsx", "app/(dashboard)/dashboard/page.tsx"],
    aliases: ["Mohon Suntingan status", "edit request status"],
    prompt: "Keep the customer edit request status next to the invitation row action." },

  { id: "customer-edit-request-dialog", name: "Customer edit request dialog", cat: "component", plate: "dashboard", target: "dash.edit-request-dialog",
    def: "The shared semantic-token Dialog opened by Mohon Suntingan. On Published invitations its outlined trigger sits in the secondary action area; on an expired edit window it is the filled primary action until a pending request turns the shared support dialog into the filled primary. The customer-safe status remains in the invitation tile content. It accepts one bounded reason, shows a byte counter, keeps the stable request id for network retries and explains that submission does not open an edit window.",
    src: ["components/EditRequestDialog.tsx", "app/api/cards/[id]/edit-request/route.ts", "components/ui/dialog.tsx"],
    aliases: ["request editing dialog"],
    prompt: "Keep the Mohon Suntingan dialog dismissible until its request is in flight." },

  { id: "admin-edit-request-queue", name: "Admin edit request queue", cat: "component", plate: "admin-workspace", target: "admin.edit-requests",
    def: "The focused administrator table for Mohon Suntingan requests, with pending count, owner and invitation context, bounded customer reason, lifecycle-safe status, current-page search and expandable request details. It is in-app only; it sends no email or WhatsApp notification.",
    src: ["app/(admin)/admin/edit-requests/page.tsx", "app/(admin)/AdminNav.tsx", "app/(admin)/admin/page.tsx"],
    aliases: ["Mohon Suntingan queue", "edit request queue"],
    prompt: "Keep pending Mohon Suntingan requests visible from the Admin nav." },

  { id: "admin-edit-request-review", name: "Admin edit request review controls", cat: "control", plate: "admin-workspace", target: "admin.edit-request-controls",
    def: "Approve or reject controls inside the queue details. Approval delegates the guarded fixed seven-day window; rejection requires a bounded customer-readable reason. Stable decision ids make retries and two-admin races replay-safe.",
    src: ["components/EditRequestReviewControls.tsx", "app/api/admin/edit-requests/[id]/decision/route.ts"],
    aliases: ["request review controls", "edit request decision"],
    prompt: "Keep rejection reasons inside the shared confirmation Dialog." },

  { id: "dashboard-empty-state", name: "Dashboard empty state", cat: "state", plate: "dashboard", target: "dash.empty-state",
    def: "A prompt to create the first invitation, with Pilih reka bentuk opening the template gallery.",
    src: ["app/(dashboard)/dashboard/page.tsx"],
    aliases: ["zero state"],
    prompt: "Show three suggested templates inside the dashboard empty state." },

  { id: "receipt-upload", name: "Receipt upload", cat: "field", plate: "checkout-status", target: "checkout.receipt-upload",
    def: "Required PDF, JPEG, PNG or WebP file input, up to 5 MB; supports replacement before confirmation.", src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"], aliases: [], prompt: "Check the receipt upload." },
  { id: "current-receipt", name: "Current receipt", cat: "component", plate: "checkout-status", target: "checkout.current-receipt",
    def: "Only the latest payment attempt’s current version is shown to the customer. Private download access is rechecked on every request.", src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"], aliases: [], prompt: "Check the current receipt." },
  { id: "payment-balance", name: "Payment balance", cat: "state", plate: "checkout-status", target: "checkout.balance",
    def: "Received and remaining RM totals after manual review. Top-up uses the same QR method with a new receipt; overpayment requires manual refund support.", src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"], aliases: [], prompt: "Check the payment balance." },
  { id: "manual-payment-status", name: "Manual payment status", cat: "state", plate: "checkout-status", target: "checkout.manual-payment-status",
    def: "The customer-safe outcome message for a manual receipt: waiting, rejected with a correction path, insufficient with the server-calculated balance, confirmed as a paid draft, or duplicate with support guidance. Review status does not freeze the owner's live unpublished invitation draft.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "lib/payments.ts"], aliases: [], prompt: "Keep manual payment status messages free of private review details." },
  {
    "id": "receipt-history",
    "name": "Receipt history",
    "cat": "region",
    "plate": "admin-payments",
    "target": "pay.receipt-history",
    "def": "Expandable history within a payment-attempt detail: all receipt versions, current/prior labels, review amounts, reasons, reviewers, times and file-action tombstones.",
    "src": [
      "app/(admin)/admin/payments/page.tsx"
    ],
    "aliases": [],
    "prompt": "Check the receipt history."
  },
  { id: "receipt-review-controls", name: "Receipt review controls", cat: "control", plate: "admin-payments", target: "pay.receipt-review",
    def: "The decision inputs for the current receipt: confirmed received amount, insufficient-balance reason plus private evidence, rejected reason, or a correction of a prior decision. The server enforces current-receipt and concurrency rules.", src: ["app/(admin)/admin/payments/ReviewControls.tsx", "app/(admin)/admin/payments/actions.ts"], aliases: [], prompt: "Check the receipt review controls." },
  { id: "receipt-file-controls", name: "Receipt file controls", cat: "control", plate: "admin-payments", target: "pay.receipt-files",
    def: "Reasoned quarantine/removal and retry actions, available for current, prior and reviewed files. Removed files retain permanent tombstones.", src: ["app/(admin)/admin/payments/page.tsx"], aliases: [], prompt: "Check the receipt file controls." },
  { id: "review-filters", name: "Review filters", cat: "control", plate: "admin-payments", target: "pay.review-filters",
    def: "The administrator search and five outcome filters for the newest-first manual payment queue: pending, insufficient, rejected, confirmed and duplicate. Search covers customer, order and payment reference.", src: ["app/(admin)/AdminTable.tsx", "app/(admin)/admin/payments/page.tsx"], aliases: [], prompt: "Keep review filters usable from the keyboard." },
  { id: "review-evidence", name: "Review evidence panel", cat: "region", plate: "admin-payments", target: "pay.review-evidence",
    def: "The private evidence area beside a review decision. It shows the receipt before the decision, current receipt, price, received, credited, remaining and excess amounts, while private evidence access is authorized separately.", src: ["app/(admin)/admin/payments/page.tsx", "app/(admin)/admin/payments/actions.ts"], aliases: [], prompt: "Keep the review evidence panel private and distinct from the immutable audit history." },
  { id: "review-decision-panel", name: "Review decision panel", cat: "region", plate: "admin-payments", target: "pay.review-decision",
    def: "The administrator decision surface for confirming an amount, recording an insufficient balance, rejecting a receipt, or appending a correction. It never publishes an invitation or creates a second paid draft.", src: ["app/(admin)/admin/payments/ReviewControls.tsx", "app/(admin)/admin/payments/actions.ts"], aliases: [], prompt: "Keep review decisions explicit and reversible only through an append-only correction." },
  { id: "tng-configuration", name: "Touch ’n Go configuration", cat: "component", plate: "admin-settings", target: "pay.tng-config",
    def: "Separate manual method configuration for recipient, QR URL, instructions and enabled state. Does not add a DuitNow slot.", src: ["app/(admin)/admin/payments/page.tsx"], aliases: [], prompt: "Check the touch ’n go configuration." },
  /* ---------------------------------------------------------------- checkout */
  { id: "checkout-invitation-preview", name: "Checkout invitation preview", cat: "region", plate: "checkout-status", target: "checkout.invitation-preview",
    def: "Owner-only phone iframe beside payment details, showing the latest saved invitation for this order. It follows payment details on mobile and has no live RSVP context or public guest URL.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "app/(preview)/dashboard/cards/[id]/preview/page.tsx"], aliases: [], prompt: "Keep the checkout invitation preview alongside the matching payment." },
  { id: "checkout-status-panel", name: "Checkout status panel", cat: "region", plate: "checkout-status", target: "checkout.panel",
    def: "The owned checkout surface. Manual QR uses a wide payment summary above separate QR and receipt areas, stacked on mobile. Partial payment shows the remaining amount and a new-receipt path while the owner may keep editing the invitation. After any first sufficient payment it shows the private editable paid draft; the published invitation link appears only after the owner publication action.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: ["order status panel", "post-payment screen"],
    prompt: "Stop the checkout status panel polling after 60s and offer a manual refresh." },

  { id: "payment-success", name: "Payment success", cat: "state", plate: "checkout-status", target: "checkout.status-heading",
    def: "Reached when the order is paid. It shows the winning payment method and time. Any sufficient confirmed payment shows an editable paid draft that remains unpublished; the Copy link field appears only when the current lifecycle result is Published. An Unavailable invitation shows a blocked state.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: [],
    prompt: "Add a share-to-WhatsApp button to the payment success state." },

  { id: "paid-draft-state", name: "Paid-draft state", cat: "state", plate: "checkout-status", target: "checkout.paid-draft-state",
    def: "The post-payment state for a Stripe-, Bank DuitNow- or Touch ’n Go-confirmed order: the owner can continue editing the saved draft, but publication, guest URL exposure and publication messaging wait for the explicit owner acknowledgement and publication action.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "lib/types.ts"], aliases: [], prompt: "Explain clearly that the paid draft is not published yet." },

  { id: "paid-draft-edit-action", name: "Paid-draft checkout action", cat: "control", plate: "checkout-status", target: "checkout.paid-draft-edit-action",
    def: "The checkout action that opens the editable paid draft after any first sufficient confirmed payment. It returns to the editor without exposing a public invitation link; publication is a separate owner action.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"], aliases: [], prompt: "Make the paid-draft checkout action the clear next step after manual confirmation." },

  { id: "paid-confirmation-metadata", name: "Paid-confirmation metadata", cat: "field", plate: "checkout-status", target: "checkout.paid-metadata",
    def: "The winner line on the payment success state: the completed method (`Stripe` / `DuitNow` / `Touch ’n Go`) and its localized completion time. Seeded from the server render and refreshed by every status poll that reports `paid`; hidden when either value is absent.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "app/api/orders/[orderId]/status/route.ts"],
    aliases: ["winner line", "payment metadata line"],
    prompt: "Show the paid-confirmation metadata only after the first successful poll." },

  { id: "payment-cancelled", name: "Payment cancelled", cat: "state", plate: "checkout-status", target: "checkout.cancel-editor-return",
    def: "Reached when Stripe returns with `?status=cancel`. Shows `Pembayaran Dibatalkan` and a `Kembali ke Editor` control for the bound card (or Dashboard if no card is available); the bound Checkout Session remains protected until Stripe confirms it cannot be paid.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: [],
    prompt: "Explain that the draft is safe in the payment cancelled state." },

  { id: "payment-pending", name: "Payment pending", cat: "state", plate: "checkout-status", target: "checkout.panel",
    def: "The waiting state while the webhook has not yet landed or a durable Checkout reservation is being reconciled: the page says it will update itself, and falls back to a manual check if polling stalls.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: ["processing state"],
    prompt: "Show elapsed time in the payment pending state." },

  { id: "card-link-box", name: "Copy link field", cat: "component", plate: "checkout-status", target: "checkout.card-link-box",
    def: "The tinted box on the Published success state holding the invitation's public `/i/[slug]` URL for copying. Manual paid drafts do not render this field.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "components/CopyLinkButton.tsx"],
    aliases: ["card link box", "share link box"],
    prompt: "Add a QR code beside the card link box." },

  { id: "qr-page-choice", name: "DuitNow QR choice", cat: "control", plate: "checkout-status", target: "checkout.qr-choice",
    def: "The second button in the payment modal. Opens the owned QR payment page.", src: ["components/PaymentMethodDialog.tsx"], aliases: [], prompt: "Keep DuitNow QR choice beside Stripe in the modal." },
  { id: "settings-navigation", name: "Settings navigation pane", cat: "region", plate: "admin-settings", target: "settings.navigation",
    def: "Horizontal settings categories above the Settings content pane, with active links for Bayaran QR and Hubungi sokongan. The selected category uses the shared administrator focus and colour treatment.", src: ["app/(admin)/admin/settings/layout.tsx", "app/(admin)/admin/settings/SettingsNavigation.tsx"], aliases: [], prompt: "Keep the support-contact link active when the support settings route is selected." },
  { id: "settings-content", name: "Settings content pane", cat: "region", plate: "admin-settings", target: "settings.content",
    def: "Full-width editing area below the horizontal settings categories for the selected administrator setting.", src: ["app/(admin)/admin/settings/layout.tsx"], aliases: [], prompt: "Keep the Settings content pane readable on mobile." },
  { id: "qr-image-upload", name: "QR image upload", cat: "control", plate: "admin-settings", target: "settings.qr-upload",
    def: "Image picker and preview for merchant QR artwork. Accepts JPEG, PNG or WebP up to 5 MB; administrator-only API decodes and normalizes to PNG before storing separately from receipts.", src: ["app/(admin)/admin/settings/qr/QrSettingsForm.tsx", "app/api/admin/payment-qr/route.ts"], aliases: [], prompt: "Show an upload failure next to QR image upload." },
  { id: "payment-support-message", name: "Payment support message", cat: "component", plate: "checkout-status", target: "checkout.payment-support-message",
    def: "The exact customer payment-help copy shared by checkout and receipt-error states. It renders one validated email link, one digits-only Malaysian WhatsApp link, both links, or the approved no-link fallback when values are missing or unreadable.", src: ["components/PaymentSupportMessage.tsx", "lib/payment-support.ts", "app/api/orders/[orderId]/status/route.ts"], aliases: ["support contact message"], prompt: "Keep the Payment support message readable when an address or number is long." },
  { id: "support-contact-form", name: "Support contact settings form", cat: "component", plate: "admin-settings", target: "settings.support-form",
    def: "Administrator-only form at /admin/settings/support for optional support email and Malaysian +60 WhatsApp values. The required change reason follows the optional contact fields directly. It validates on the server and includes a live customer-message sample.", src: ["app/(admin)/admin/settings/support/page.tsx", "app/(admin)/admin/settings/support/SupportSettingsForm.tsx", "app/(admin)/admin/settings/support/actions.ts"], aliases: [], prompt: "Keep the Support contact settings form usable at tablet width." },
  { id: "support-email-field", name: "Support email field", cat: "field", plate: "admin-settings", target: "settings.support-email",
    def: "Optional single support address. Surrounding spaces are trimmed, the stored value is lower-case, plus-addressing is allowed, and whitespace, control characters, commas, malformed syntax and a local part over 64 characters are rejected.", src: ["app/(admin)/admin/settings/support/SupportSettingsForm.tsx", "lib/payment-support.ts", "supabase/migrations/032_payment_support_contacts.sql"], aliases: [], prompt: "Show the support email field error next to the field." },
  { id: "support-whatsapp-field", name: "Support WhatsApp field", cat: "field", plate: "admin-settings", target: "settings.support-whatsapp",
    def: "Optional Malaysian WhatsApp contact. Spaces, hyphens and brackets are removed; the stored value must be +60 followed by 8–10 national digits without a trunk zero immediately after the country code. Ownership and WhatsApp registration are not verified.", src: ["app/(admin)/admin/settings/support/SupportSettingsForm.tsx", "lib/payment-support.ts", "supabase/migrations/032_payment_support_contacts.sql"], aliases: [], prompt: "Explain the normalized +60 shape below the support WhatsApp field." },
  { id: "support-change-reason", name: "Support change reason", cat: "field", plate: "admin-settings", target: "settings.support-reason",
    def: "Required bounded reason for an actual support-contact add, replacement, clear or restore. Blank, control-character and over-500-character reasons are rejected; no-op writes do not create history.", src: ["app/(admin)/admin/settings/support/SupportSettingsForm.tsx", "app/(admin)/admin/settings/support/actions.ts", "supabase/migrations/032_payment_support_contacts.sql"], aliases: ["support reason field"], prompt: "Keep the support change reason visible when a stale edit must be retried." },
  { id: "support-message-sample", name: "Support message sample", cat: "component", plate: "admin-settings", target: "settings.support-sample",
    def: "The restrained live sample beside the support form. It updates as the administrator types and shows the exact email, WhatsApp, combined or safe fallback customer message with its links.", src: ["app/(admin)/admin/settings/support/SupportSettingsForm.tsx", "components/PaymentSupportMessage.tsx"], aliases: ["customer message sample"], prompt: "Keep the Support message sample visually distinct without competing with the form." },
  { id: "support-contact-history", name: "Support contact history", cat: "state", plate: "admin-settings", target: "settings.support-history",
    def: "Administrator-only indefinite append-only history, with the latest 100 rows displayed. Each actual change stores before and after contacts, operation, bounded reason, actor, timestamp and config version; a restore selects the old values and writes another audited change through the same guarded RPC.", src: ["app/(admin)/admin/settings/support/page.tsx", "app/(admin)/admin/settings/support/SupportSettingsForm.tsx", "supabase/migrations/032_payment_support_contacts.sql"], aliases: ["support settings audit log"], prompt: "Show before and after values clearly in Support contact history." },
  { id: "payment-method-choice", name: "Payment method dialog", cat: "region", plate: "checkout-status", target: "checkout.method-choice",
    def: "A two-button Payment method dialog offers Stripe and DuitNow QR. The QR choice opens a dedicated page with Bank and Touch ’n Go choices. Stripe is blocked during review and after any confirmed manual amount; only a rejection with zero confirmed manual amount permits Stripe fallback.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: ["method selection"],
    prompt: "Remember the customer's last chosen payment method between visits." },

  { id: "stripe-choice", name: "Stripe choice", cat: "control", plate: "checkout-status", target: "checkout.stripe-choice",
    def: "Starts an owned Stripe Checkout Session only when no manual receipt awaits review and no partial manual amount is confirmed.",
    src: ["components/PaymentMethodDialog.tsx", "components/SectionEditor.tsx", "app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "app/api/stripe/checkout/route.ts"],
    aliases: ["pay by card button"],
    prompt: "Show the card-brand row under the stripe choice." },

  { id: "duitnow-slot-choice", name: "QR payment choice", cat: "control", plate: "checkout-status", target: "checkout.slot-choice",
    def: "Two choices on the dedicated QR page: Bank and Touch ’n Go. Bank uses slot 1. Existing attempts use their frozen recipient snapshot; partial top-ups retain the same method.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "app/api/orders/[orderId]/status/route.ts"],
    aliases: ["slot picker"],
    avoidAliases: ["slot selector"],
    prompt: "Show each slot's payee name inside the duitnow slot choice row." },

  { id: "selected-slot-detail", name: "Selected slot detail", cat: "component", plate: "checkout-status", target: "checkout.slot-detail",
    def: "The tinted detail box revealed when a slot is chosen: payee name, provider/bank, the amount in MYR, the slot's QR image, and its transfer instructions — all from the slot's current enabled configuration.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "lib/payments.ts"],
    aliases: ["recipient details"],
    prompt: "Add a copy-account-number action to the selected slot detail." },

  { id: "transfer-reference-field", name: "Transfer-reference field", cat: "field", plate: "checkout-status", target: "checkout.reference-field",
    def: "Optional payment reference. When supplied, it must be 3–64 permitted printable characters beginning alphanumerically. It never replaces the required receipt.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "lib/payments.ts"],
    aliases: ["reference input"],
    prompt: "Paste-detect long FPX reference strings into the transfer-reference field." },

  { id: "transfer-reference-submit", name: "Receipt submit", cat: "control", plate: "checkout-status", target: "checkout.submit-reference",
    def: "Sends one required private receipt with an optional reference. Shows progress and failure/retry state; the same operation ID makes retries idempotent.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "app/api/orders/[orderId]/status/route.ts"],
    aliases: [],
    prompt: "Disable Receipt submit until a receipt and an available method are selected." },

  { id: "awaiting-review-state", name: "Awaiting-review state", cat: "state", plate: "checkout-status", target: "checkout.awaiting-review",
    def: "A current receipt awaits human payment review. The customer can download or replace the current receipt, return to the editor and edit invitation content/assets; those edits do not change payment records. Stripe remains blocked.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: ["pending review state", "manual review wait"],
    prompt: "Show queue position in the awaiting-review state." },

  { id: "rejected-state", name: "Rejected state", cat: "state", plate: "checkout-status", target: "checkout.rejected-state",
    def: "Shows the administrator rejection reason, receipt replacement control and a return to the editable invitation. Prior metadata remains immutable. Stripe fallback is available only if no manual amount has been confirmed.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx"],
    aliases: ["review rejected state"],
    prompt: "Offer a prefilled retry from the rejected state." },

  /* ------------------------------------------------------- interactions */
  { id: "section-reorder", name: "Section reorder", cat: "interaction", plate: "section-editor", target: "editor.drag-handle",
    def: "Dragging a section row by its handle reorders the draft. Wired with dnd-kit `closestCenter` collision and a vertical sort strategy; the drop rewrites every instance's `order`.",
    src: ["components/SectionEditor.tsx"],
    aliases: ["drag to reorder", "sort sections"],
    prompt: "Make section reorder work from the keyboard, not only by pointer drag." },

  { id: "draft-autosave", name: "Draft autosave", cat: "interaction", plate: "section-editor", target: "editor.save-indicator",
    def: "Edits are cached to localStorage immediately and persisted to `cards.custom_data_draft` on a debounce with an expected `draft_version`. Successful saves advance that version and set `last_activity_at`; there is no save button — the save indicator reports the result.",
    src: ["components/SectionEditor.tsx", "app/api/cards/[id]/draft/route.ts"],
    aliases: ["autosave", "debounced save"],
    prompt: "Flush draft autosave immediately when the editor tab loses focus." },

  { id: "menu-dismiss", name: "Menu dismiss", cat: "interaction", plate: "site-shell", target: "shell.mobile-panel",
    def: "The mobile navigation panel focuses its first link on open and closes on Escape, returning focus to the navbar menu button. It does not close on outside click.",
    src: ["components/NavbarMenu.tsx"],
    aliases: ["escape to close"],
    prompt: "Add outside-click handling to menu dismiss, matching the Escape behaviour." },

  { id: "order-status-polling", name: "Order status polling", cat: "interaction", plate: "checkout-status", target: "checkout.panel",
    def: "The checkout panel polls the owned status endpoint after Stripe returns or while DuitNow review is pending. The endpoint runs paid-order recovery and returns lifecycle plus winning-payment data. During rejected retry payment-method choice it does not adopt the old reviewed submission; only a successful new submission POST can do so. A Published result reveals the link. An Unavailable result stops polling.",
    src: ["app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx", "app/api/orders/[orderId]/status/route.ts"],
    aliases: ["status polling"],
    prompt: "Back off order status polling after the first 30 seconds." },

  /* ------------------------------------------------------------------- admin */
  {
    "id": "admin-nav",
    "name": "Admin nav",
    "cat": "component",
    "plate": "admin-templates",
    "target": "admin.nav",
    "def": "Persistent left administrator sidebar with overview, customer invitations, orders, payment review, template management, custom requests and settings. A separate Cipta & uji group links to the customer Dashboard and template gallery. Replaces the customer Navbar on admin routes; becomes a focus-trapped drawer on mobile.",
    "src": [
      "app/(admin)/AdminNav.tsx",
      "app/(admin)/layout.tsx"
    ],
    "aliases": [
      "admin tabs"
    ],
    "note": "The role check lives in the (admin) layout; `proxy.ts` only checks that someone is signed in.",
    "prompt": "Keep admin destinations separated from customer testing links."
  },

  { id: "admin-nav-item", name: "Admin nav item", cat: "control", plate: "admin-templates", target: "admin.nav-item",
    def: "One entry in the admin nav, marked active by matching the current pathname and using the shared pointer cursor for enabled controls.",
    src: ["app/(admin)/AdminNav.tsx"],
    aliases: [],
    prompt: "Give the active admin nav item an underline instead of a filled background." },

  {
    "id": "template-management-table",
    "name": "Template management table",
    "cat": "component",
    "plate": "admin-templates",
    "target": "admin.template-table",
    "def": "Searchable administrator table with combined name/ID search, category and active-status filters, 20-row pagination, inline price editing and confirmed deactivation.",
    "src": [
      "app/(admin)/admin/templates/page.tsx"
    ],
    "aliases": [
      "templates table"
    ],
    "prompt": "Let the template management table sort by price."
  },

  { id: "table-header", name: "Table header", cat: "component", plate: "admin-templates", target: "admin.table-header",
    def: "The table's `thead` row of column labels.",
    src: ["app/(admin)/admin/templates/page.tsx"],
    aliases: ["column headers"],
    prompt: "Make the table header stick while the template management table scrolls." },

  { id: "admin-template-row", name: "Admin template row", cat: "component", plate: "admin-templates", target: "admin.template-row",
    def: "One editable template row. Its price field and active toggle both commit through `PATCH /api/admin/templates/[id]`.",
    src: ["app/(admin)/admin/templates/TemplateRow.tsx", "app/api/admin/templates/[id]/route.ts"],
    aliases: [],
    prompt: "Show a saved confirmation on the admin template row after a successful PATCH." },

  { id: "template-price-field", name: "Template price field", cat: "field", plate: "admin-templates", target: "admin.price-field",
    def: "The inline numeric input editing `templates.price_myr`. Stored in sen — the customer-facing price divides it by 100.",
    src: ["app/(admin)/admin/templates/TemplateRow.tsx"],
    aliases: ["price input"],
    prompt: "Show the template price field in ringgit and convert to sen on save." },

  { id: "template-active-toggle", name: "Template active toggle", cat: "control", plate: "admin-templates", target: "admin.active-toggle",
    def: "The control flipping `templates.is_active`. Deactivating a template removes its `/templates` showcase card from the gallery entirely (the catalogue is active-only) and shows the coming soon state on its detail page: no Template price and no Customise CTA.",
    src: ["app/(admin)/admin/templates/TemplateRow.tsx"],
    aliases: ["publish toggle"],
    prompt: "Warn before the template active toggle deactivates a template that has live cards." },

  /* ------------------------------------------------- admin DuitNow payments */
  { id: "slot-form", name: "QR settings form", cat: "component", plate: "admin-settings", target: "pay.slot-form",
    def: "The Bank QR settings form at /admin/settings/qr: recipient, bank, instructions, image upload and activation. Touch ’n Go uses the adjacent method choice. There is one QR per method.",
    src: ["app/(admin)/admin/settings/qr/QrSettingsForm.tsx", "app/api/admin/payment-qr/route.ts"],
    aliases: ["duitnow slot form"],
    prompt: "Preview the slot QR image inside the slot form." },

  { id: "slot-enabled-toggle", name: "Slot enabled toggle", cat: "control", plate: "admin-settings", target: "pay.enabled-toggle",
    def: `The checkbox enabling a slot for customers. Enabling requires fully configured recipient details (payee, provider, QR URL); the database RPC re-checks and bumps the slot's version atomically.`,
    src: ["app/(admin)/admin/settings/qr/QrSettingsForm.tsx", "app/api/admin/payment-qr/route.ts"],
    aliases: ["slot enable checkbox"],
    prompt: "Require a second confirmation before the slot enabled toggle turns a live slot off." },

  {
    "id": "payment-notification",
    "name": "Payment review notification",
    "cat": "state",
    "plate": "admin-workspace",
    "target": "admin.payment-notification",
    "def": "The in-dashboard administrator alert for newly pending manual receipts. It links to the payment review queue and does not send email or assign work.",
    "src": [
      "app/(admin)/admin/page.tsx"
    ],
    "aliases": [],
    "prompt": "Keep the payment review notification visible while any pending receipt needs attention."
  },

  {
    "id": "review-queue",
    "name": "Review queue",
    "cat": "region",
    "plate": "admin-payments",
    "target": "pay.review-queue",
    "def": "The newest-first administrator queue for the current manual receipt per payment attempt. Search and filters cover pending, insufficient, rejected, confirmed and duplicate outcomes; older legacy transfer references remain in a separate history section.",
    "src": [
      "app/(admin)/admin/page.tsx",
      "app/(admin)/admin/payments/page.tsx"
    ],
    "aliases": [
      "manual review queue"
    ],
    "prompt": "Add a customer-email filter to the review queue."
  },

  { id: "submission-row", name: "Submission row", cat: "component", plate: "admin-payments", target: "pay.submission-row",
    def: `One current manual payment attempt rendered from its immutable receipt and review projection: customer, method, price, received amount, outcome and submitted time.`,
    src: ["app/(admin)/admin/payments/page.tsx", "lib/payments.ts"],
    aliases: [],
    prompt: "Show the frozen QR thumbnail inside the submission row." },

  { id: "review-controls", name: "Review controls", cat: "control", plate: "admin-payments", target: "pay.review-controls",
    def: "Legacy reference-only review controls for older transfer rows. They remain separate from the current receipt decision panel and cannot publish an invitation.",
    src: ["app/(admin)/admin/payments/ReviewControls.tsx", "app/(admin)/admin/payments/actions.ts"],
    aliases: [],
    prompt: "Disable the review controls until a note or explicit choice is made." },

  {
    "id": "slot-configuration-history",
    "name": "Slot configuration history",
    "cat": "state",
    "plate": "admin-settings",
    "target": "pay.slot-history",
    "def": "Read-only configuration history in Settings: latest 50 changes per method, previous/current recipient, image, instructions, activation, actor and time.",
    "src": [
      "app/(admin)/admin/settings/qr/page.tsx",
      "supabase/migrations/030_payment_qr_settings.sql"
    ],
    "aliases": [
      "slot audit log"
    ],
    "prompt": "Diff-highlight changed fields in the slot configuration history."
  },

  { id: "payment-review-history", name: "Payment review history", cat: "state", plate: "admin-payments", target: "pay.review-history",
    def: "The append-only decision history for a manual payment attempt: outcomes, received/credited/remaining/excess amounts, reviewer, reasons, correction links and timestamps. Receipt files and private evidence remain managed separately.",
    src: ["app/(admin)/admin/payments/page.tsx", "supabase/migrations/031_manual_payment_review.sql"],
    aliases: ["review audit log"],
    prompt: "Filter the payment review history by outcome." },

  /* -------------------------------------------------- admin card detail */
  { id: "availability-controls", name: "Availability controls", cat: "control", plate: "admin-card-detail", target: "admindetail.availability-controls",
    def: "The administrator-only paid-state availability block on the Card-detail page: disable a paid Published invitation (reason required + confirmation) or restore a paid Unavailable one. Every action is recorded through `POST /api/admin/cards/[id]/publish` into the append-only audit table; there is no customer endpoint and no arbitrary visibility boolean.",
    src: ["app/(admin)/admin/cards/[id]/TogglePublishButton.tsx", "app/api/admin/cards/[id]/publish/route.ts"],
    aliases: [],
    avoidAliases: ["publish button", "publish toggle (admin card)"],
    prompt: "Disable the availability controls while a transition request is in flight." },

  { id: "disable-reason-field", name: "Disable reason field", cat: "field", plate: "admin-card-detail", target: "admindetail.disable-reason-field",
    def: "The required textarea behind a reasoned disable. A blank reason is rejected client- and server-side, and the database CHECK constraint refuses a disable row without one — the recorded reason is what the owner sees on the dashboard.",
    src: ["app/(admin)/admin/cards/[id]/TogglePublishButton.tsx", "supabase/migrations/018_lifecycle_availability.sql"],
    aliases: ["reason textarea"],
    prompt: "Add a short list of preset reasons beside the disable reason field." },

  { id: "restore-control", name: "Restore invitation control", cat: "control", plate: "admin-card-detail", target: "admindetail.restore-control",
    def: "The `Pulihkan Jemputan` button offered only for a paid Unavailable invitation — unpublished with its latest recorded action being a disable. Restoring appends a `restored` audit row and re-publishes atomically without resetting the original publication timestamp.",
    src: ["app/(admin)/admin/cards/[id]/TogglePublishButton.tsx", "app/api/admin/cards/[id]/publish/route.ts"],
    aliases: ["restore button"],
    prompt: "Ask for an optional note when the restore invitation control is used." },

  { id: "action-record", name: "Availability action record", cat: "component", plate: "admin-card-detail", target: "admindetail.action-record",
    def: "One append-only row of the availability history table (`card_availability_actions`): action (Dinyahterbitkan / Dipulihkan), acting administrator, optional reason, and timestamp, newest first. Owners see their own cards' records on the dashboard boundary; clients can read but never write.",
    src: ["app/(admin)/admin/cards/[id]/page.tsx", "supabase/migrations/018_lifecycle_availability.sql"],
    aliases: ["availability history entry", "audit record"],
    prompt: "Paginate the availability action record list after 20 entries." },

  { id: "unpaid-block", name: "Unpaid activation block", cat: "state", plate: "admin-card-detail", target: "admindetail.unpaid-block",
    def: "The blocked explanation shown instead of availability controls when a card is unpaid (Editing) or still Publishing: activation is refused with a conflict until the invitation actually reaches Published.",
    src: ["app/(admin)/admin/cards/[id]/TogglePublishButton.tsx", "app/api/admin/cards/[id]/publish/route.ts"],
    aliases: ["blocked activation message"],
    prompt: "Show the order status inside the unpaid activation block." },

  { id: "payment-confirmed-metadata", name: "Payment-confirmed metadata", cat: "field", plate: "admin-card-detail", target: "admindetail.payment-confirmed-metadata",
    def: "The administrator's payment confirmation field: winning payment completion time, localized to Asia/Kuala_Lumpur, with a blank state for unpaid or historical rows without a recorded completion.",
    src: ["app/(admin)/admin/cards/[id]/page.tsx", "app/(admin)/admin/orders/page.tsx"],
    aliases: ["payment-confirmed time", "payment completion time"],
    prompt: "Keep the payment-confirmed metadata separate from the order-created time." },

  { id: "payment-age", name: "Payment age", cat: "field", plate: "admin-card-detail", target: "admindetail.payment-age",
    def: "The administrator-only whole-day count since the winning payment was confirmed. It stays empty when payment has not been confirmed and never implies a paid-draft expiry or hosting duration.",
    src: ["app/(admin)/admin/cards/[id]/page.tsx", "app/(admin)/admin/orders/page.tsx"],
    aliases: ["days since payment"],
    prompt: "Show payment age in the administrator Orders table without implying an expiry date." },

  { id: "admin-lifecycle-state", name: "Administrator lifecycle state", cat: "state", plate: "admin-card-detail", target: "admindetail.lifecycle-state",
    def: "The derived invitation lifecycle shown to administrators: Editing, Paid draft, Publishing, Published, Edit window, Edit window expired, Unavailable or Retired. It is read from payment, publication, current-pointer, window, availability and controlled-replacement facts rather than a customer-writable status field.",
    src: ["app/(admin)/admin/cards/[id]/page.tsx", "app/(admin)/admin/orders/page.tsx", "lib/types.ts"],
    aliases: ["admin lifecycle", "lifecycle state"],
    prompt: "Keep the administrator lifecycle state aligned with the customer dashboard badge." },

  { id: "controlled-replacement-panel", name: "Controlled replacement panel", cat: "region", plate: "admin-card-detail", target: "admindetail.controlled-replacement",
    def: "The administrator-only Card-detail panel for a reasoned replacement grant and atomic cutover. It shows the durable administrator reason, source/target lineage, grant-only entitlement status, target preparation readiness and the action to create or complete the replacement; it makes clear that the owner may edit the pending draft but only administrator cutover can publish it, and never offers payment or ordinary publication controls.",
    src: ["app/(admin)/admin/cards/[id]/ControlledReplacementPanel.tsx", "app/(admin)/admin/cards/[id]/page.tsx", "app/api/admin/cards/[id]/replacement/route.ts"],
    aliases: ["replacement controls", "replacement lineage panel"],
    prompt: "Keep the Controlled replacement panel visibly separate from Availability controls and Edit window controls." },

  { id: "draft-activity", name: "Draft activity", cat: "field", plate: "admin-card-detail", target: "admindetail.draft-activity",
    def: "The last successful customer draft-save time. Reads and polling do not change it; an old row with NULL activity says `Tiada aktiviti pelanggan direkodkan` instead of inventing a timestamp.",
    src: ["app/(admin)/admin/cards/[id]/page.tsx", "app/(admin)/admin/orders/page.tsx", "supabase/migrations/033_paid_draft_publication.sql"],
    aliases: ["last activity", "last draft activity"],
    prompt: "Keep empty historical draft activity honest in the administrator detail." },

  /* ------------------------------------------------- mobile section editor */
  { id: "mobile-live-card-canvas", name: "Live card canvas", cat: "region", plate: "mobile-section-editor", target: "mobile.canvas",
    def: "The full-bleed surface behind the mobile shell: the in-memory draft rendered at native width with no device bezel. The Form sheet covers its lower part at every detent, but the card is never navigated away from while editing. This is the mobile counterpart of the Live preview pane.",
    src: ["components/SectionEditor.tsx", "components/PhonePreview.tsx", "components/SectionInvitationCard.tsx"],
    aliases: ["card canvas", "mobile preview", "canvas"],
    prompt: "Keep the live card canvas visible above the form sheet at every detent." },

  { id: "mobile-form-sheet", name: "Form sheet", cat: "region", plate: "mobile-section-editor", target: "mobile.sheet",
    def: "The draggable bottom sheet holding the active Section's Sub-form on mobile. It sits 76px above the viewport bottom so the Navigation rail stays clear, has its own scroll region, and tracks the software keyboard through `--kb-inset`. The desktop Sub-form and the mobile Form sheet render the same form component.",
    src: ["components/SectionEditor.tsx", "app/globals.css"],
    aliases: ["bottom sheet", "sheet", "mobile form"],
    prompt: "Keep the form sheet's grabber reachable while its body scrolls." },

  { id: "mobile-sheet-detent-control", name: "Sheet detent control", cat: "control", plate: "mobile-section-editor", target: "mobile.detents",
    def: "The three-button control in the Form sheet header that snaps the sheet to `Petak kecil` (peek), `Separuh` (half), or `Penuh` (full); dragging the grabber selects the nearest detent on release. Each button exposes `aria-pressed` for its active detent.",
    src: ["components/SectionEditor.tsx", "app/globals.css"],
    aliases: ["detent toggle", "sheet height control"],
    prompt: "Add an extra-tall detent for long Sections." },

  { id: "mobile-navigation-rail", name: "Navigation rail", cat: "region", plate: "mobile-section-editor", target: "mobile.rail",
    def: "The fixed control strip above the safe area of the mobile shell. Kembali and Seterusnya step through the enabled Sections in order, and the ☰ button opens the full Section stack over the card. On the last enabled Section the forward action becomes the entitlement's primary action — payment, publication, or status review. The rail respects `--kb-inset` so it stays above the software keyboard.",
    src: ["components/SectionEditor.tsx", "app/globals.css"],
    aliases: ["mobile rail", "stepper rail", "bottom rail"],
    prompt: "Show the active Section's Malay label in the navigation rail." },

  { id: "mobile-section-stack-screen", name: "Section stack screen", cat: "region", plate: "mobile-section-editor", target: "mobile.stack",
    def: "The full-screen Section list the ☰ rail button opens over the live card: the Gaya panel, the reorderable Section rows, and the add-Section button. Selecting a row returns to the card at that Section. The Section editor tour opens this screen for its Susun Bahagian step and returns to the card on exit.",
    src: ["components/SectionEditor.tsx", "app/globals.css"],
    aliases: ["Bahagian screen", "mobile Section stack", "stack pane"],
    prompt: "Keep the Section stack screen reachable from the navigation rail." },

  { id: "mobile-reorder-hint-arrow", name: "Reorder hint arrow", cat: "component", plate: "mobile-section-editor", target: "mobile.reorder-arrow",
    def: "The gold animated ↕ arrow the Section editor tour draws beside the first Section row's drag handle during the Susun Bahagian step. It bobs vertically to describe the drag direction, is not interactive (`pointer-events: none`) and not announced (the step copy carries the meaning), and stops moving under `prefers-reduced-motion: reduce` while staying visible.",
    src: ["components/SectionEditorTour.tsx", "app/globals.css"],
    aliases: ["drag hint arrow", "reorder arrow"],
    prompt: "Keep the reorder hint arrow within the viewport at narrow widths." },
)

window.KAMY_GLOSSARY.terms.push(
{
  "id": "dashboard-group-navigation",
  "name": "Dashboard group filters",
  "target": "dash.group-navigation",
  "plate": "dashboard",
  "cat": "control",
  "def": "Three persistent group filters flush beneath the Navbar, sharing its height token and underlapping its border to prevent gaps at fractional browser zoom. The opaque bar has a filled selected state and matching counts. Changing selection replaces the results and retains keyboard focus on the filter; all groups remain accessible, including empty ones.",
  "src": [
    "app/(dashboard)/dashboard/InvitationGallery.tsx"
  ],
  "aliases": [],
  "prompt": "Keep the Dashboard group filters visible while scrolling."
},
{
  "id": "dashboard-invitation-preview",
  "name": "Dashboard invitation preview iframe",
  "target": "dash.invitation-preview",
  "plate": "dashboard",
  "cat": "component",
  "def": "Owner-authenticated saved invitation in a small phone frame, rendered at a scaled 390px mobile viewport. The lazy iframe is inert; the surrounding keyboard-accessible link opens a full preview or published invitation.",
  "src": [
    "components/InvitationThumbnail.tsx",
    "app/(preview)/dashboard/cards/[id]/preview/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Dashboard invitation preview iframe."
},
{
  "id": "admin-invitations-table",
  "name": "Customer invitations table",
  "target": "admin.invitations",
  "plate": "admin-invitations",
  "cat": "component",
  "def": "Compact searchable list at /admin/cards: invitation, customer, lifecycle and a detail link. Status filtering and twenty-row pagination reuse AdminTable.",
  "src": [
    "app/(admin)/admin/cards/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Customer invitations table."
},
{
  "id": "admin-invitation-summary",
  "name": "Admin invitation summary",
  "target": "admindetail.summary",
  "plate": "admin-card-detail",
  "cat": "region",
  "def": "First-view summary of design, payment state, response count and attending guests. Availability reasons and current edit deadlines remain visible.",
  "src": [
    "app/(admin)/admin/cards/[id]/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Admin invitation summary."
},
{
  "id": "admin-payment-disclosure",
  "name": "Payment and activity disclosure",
  "target": "admindetail.payment-disclosure",
  "plate": "admin-card-detail",
  "cat": "control",
  "def": "Closed by default; reveals technical identifiers, payment details, creation/publication dates and draft activity, with order/payment links.",
  "src": [
    "app/(admin)/admin/cards/[id]/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Payment and activity disclosure."
},
{
  "id": "admin-access-disclosure",
  "name": "Access and editing disclosure",
  "target": "admindetail.access-disclosure",
  "plate": "admin-card-detail",
  "cat": "control",
  "def": "Closed by default; reveals reasoned disable/restore controls and administrator-approved seven-day editing controls.",
  "src": [
    "app/(admin)/admin/cards/[id]/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Access and editing disclosure."
},
{
  "id": "admin-history-disclosure",
  "name": "Admin history disclosure",
  "target": "admindetail.history-disclosure",
  "plate": "admin-card-detail",
  "cat": "control",
  "def": "Closed by default; reveals immutable editing and availability records with reasons, actors and timestamps.",
  "src": [
    "app/(admin)/admin/cards/[id]/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Admin history disclosure."
},
{
  "id": "admin-delete-disclosure",
  "name": "Admin deletion disclosure",
  "target": "admindetail.delete-disclosure",
  "plate": "admin-card-detail",
  "cat": "control",
  "def": "Closed by default; separates permanent deletion from routine review. Opens the guarded deletion confirmation.",
  "src": [
    "app/(admin)/admin/cards/[id]/page.tsx"
  ],
  "aliases": [],
  "prompt": "Check the Admin deletion disclosure."
}
);

window.KAMY_GLOSSARY.terms.push(
  { id: "dashboard-search", name: "Invitation search", cat: "control", plate: "dashboard", target: "dash.search",
    def: "Sticky search by invitation name, slug or displayed date. Words match case-insensitively across every group; each filter shows its matching count, while the selected group alone supplies results. Clearing restores the group and focuses the search input.",
    src: ["app/(dashboard)/dashboard/InvitationGallery.tsx"], aliases: [], prompt: "Find an invitation by name with Invitation search." },
  { id: "dashboard-pagination", name: "Invitation pagination", cat: "control", plate: "dashboard", target: "dash.pagination",
    def: "Six invitations per page within the selected group and search. Previous and next controls show the page count; changing a filter or query resets to page one.",
    src: ["app/(dashboard)/dashboard/InvitationGallery.tsx"], aliases: [], prompt: "Check Invitation pagination with more than six drafts." },
  { id: "rsvp-dashboard-header", name: "RSVP dashboard header", cat: "region", plate: "rsvp-dashboard", target: "rsvp.header",
    def: "Respons RSVP with the current publication's invitation name and a return link to Jemputan saya, using the shared cream and deep-plum app styling.",
    src: ["app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx"], aliases: [], prompt: "Keep the RSVP dashboard header consistent with the Dashboard header." },
  { id: "rsvp-share-actions", name: "RSVP sharing actions", cat: "control", plate: "rsvp-dashboard", target: "rsvp.share",
    def: "Salin pautan and Buka jemputan for a published invitation with a readable current publication. Empty responses retain a copy-link prompt.",
    src: ["app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx", "components/CopyLinkButton.tsx"], aliases: [], prompt: "Keep RSVP sharing actions available above guest responses." },
  { id: "rsvp-attendance-summary", name: "RSVP attendance summary", cat: "region", plate: "rsvp-dashboard", target: "rsvp.summary",
    def: "Expected guest count, including additional guests, alongside attending and declining response counts. These are distinct from the total responses displayed above the list.",
    src: ["app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx"], aliases: [], prompt: "Check that the RSVP attendance summary sums pax rather than responses." },
  { id: "rsvp-response-list", name: "RSVP response list", cat: "region", plate: "rsvp-dashboard", target: "rsvp.list",
    def: "Owner-only responses across the invitation's publications, newest first. Each collapsed row shows name, Kuala Lumpur response time, attendance and guest count. Empty lists explain how to start receiving responses.",
    src: ["app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx"], aliases: [], prompt: "Keep the RSVP response list readable on a phone without sideways scrolling." },
  { id: "rsvp-response-details", name: "RSVP response details", cat: "component", plate: "rsvp-dashboard", target: "rsvp.details",
    def: "Keyboard-accessible native disclosure under a guest name, containing contact information and the complete, untruncated message. Missing fields are stated explicitly.",
    src: ["app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx"], aliases: [], prompt: "Expand RSVP response details to read a long message." },
)
