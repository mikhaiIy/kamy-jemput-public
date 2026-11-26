# ARCHITECTURE.md

> The implemented Section-v2 card model: how templates are composed, how the editor works, how drafts persist, and how the published card renders. For service connectivity and request flow see `FLOW.md` (authoritative); for approved choices see `DECISIONS.md`.

---

## 1. Core idea

A **Section** is a self-contained block of an invitation card (Landing, Event Info, Map, Countdown, RSVP, …). Each Section is a registered React module with typed data. A **Template preset** is `{ type, theme, sections: SectionInstance[] }` stored in `templates.theme` / `templates.sections`. A **card** carries the immutable first-publication snapshot in `cards.custom_data`, the pre-publication draft in `cards.custom_data_draft`, and a mutable owner revision draft in `cards.revision_draft` only while an administrator-approved window is active. Immutable `card_publications` rows hold the first and later snapshots, and `cards.current_publication_id` is the guarded guest pointer. One registry powers three rendering contexts: the editor's Live preview, the bare preview surface, and the selected current publication at `/i/[slug]`.

Legacy hand-coded template components remain only as historical renderers for stored pre-v2 payloads and as Gallery/Detail preview fallbacks for eligible legacy preview IDs (see `lib/preview-templates.ts`).

## 1.1 Annotated wireframe: editor to fulfilment

```text
Template preset [1]
  Theme + ordered SectionInstances
                 |
                 v
+---------------------------+-----------------------------+-----------------------------+
| LEFT: CARD                | CENTRE: ACTIVE SECTION      | RIGHT: INLINE PREVIEW       |
|                           |                             |                             |
| Gaya panel [2]            | Event Info [3]              | +-------------------------+ |
| [ Songket Zamrud      v ] |                             | |                         | |
|                           | Variant gallery             | | Live preview [5]        | |
| Ordered SectionInstances  | [ classic             v ]   | |                         | |
|  1 Landing                |                             | | Same ordered Sections,  | |
|  2 Event Info  < active   | Event name [_____________]  | | Variants, shared Theme  | |
|  3 Map                    | Enabled    [x]              | |                         | |
|  4 RSVP                   |                             | +-------------------------+ |
| type/data/order/enabled/  | Section fields mutate the   | Non-canonical: not the     |
| variant per instance      | in-memory draft [4]         | public card                |
+---------------------------+-----------------------------+-----------------------------+
                 |
                 +--> localStorage cache + ~1,500 ms debounced `custom_data_draft` save [6]
                                      |
                                      v
              payment completion — first valid wins [7]
        (Stripe webhook  |  confirmed manual review)
                                      |
                                      v
       Stripe / Manual QR: paid order + one editable, unpublished paid draft
                                      |
                       owner acknowledgement + latest saved version
                                      v
                         publish_paid_draft() → Published
                                      |
                    administrator opens seven-day edit window
                                      v
                 private revision_draft → owner save → publish_card_revision()
                                      |
                         new immutable publication → Published
```

1. **The Template preset seeds state**: default shared Theme and ordered SectionInstances.
2. **Gaya panel versus Theme**: the Gaya panel offers curated style presets; selecting one writes the card-wide `Theme` (inline colours win over legacy named palettes). See `docs/TEMPLATE_GAYA.md`. The Gaya panel is the only card-theme control surface and exposes no custom controls — no raw palette/font pickers and no "Custom" Gaya; the approved controls are the curated presets of `lib/themes/presets.ts` and the fonts their presets apply (see `TEMPLATE_GAYA.md` and D15 in `docs/DECISIONS.md`); fonts registered only for Section-level styling — Caveat, Amatic SC, Geist Mono — are not Gaya panel controls.
3. **SectionInstance** carries `type`, `data`, `order`, `enabled`, `variant`; its type resolves through `lib/sections/registry.ts` to the implementing component and Variant gallery.
4. **`SectionEditor` owns mutation** of the in-memory draft (three panes: sortable Section list, schema-driven sub-form with per-Section `customForm` slot, inline phone-frame Live preview).
5. **Live preview vs published card**: the inline preview renders current editor state and is non-canonical; the published card renders the saved snapshot at its stable slug.
6. **Drafts are recoverable**: localStorage cache plus a roughly 1,500 ms debounced PATCH to `/api/cards/[id]/draft` targeting `custom_data_draft`; each successful save advances `draft_version` and sets `last_activity_at`. Neither replaces the published snapshot.
7. **Payment and publication are separate**: the first confirmed Stripe, Bank DuitNow, or Touch ’n Go payment opens one private paid draft; it does not publish or expose a guest URL. `publish_paid_draft` requires the owner, paid state, fixed template, latest `draft_version`, and the exact acknowledgement, then copies that latest saved draft once. After first publication, `open_card_edit_window` is the only transition that creates `revision_draft`; `publish_card_revision` requires the active window, latest version and exact acknowledgement, then advances the guarded current publication pointer. An expired window remains private and locked. `finalize_paid_order` only normalizes/reports the private paid-draft state. See D17, D18, D21, D22, D24, and `FLOW.md`.
8. **Manual-review queue is exhaustive**: the administrative payment surface walks immutable submissions and review IDs with descending `(created_at, id)` keyset pages past Supabase's 1,000-row cap. Insertions do not shift already scanned rows into omissions or repeats; newer rows are available after refresh.

## 2. Data model (implemented)

Defined in `lib/types.ts`:

- `SectionType` — registered string union of catalogue Sections.
- `SectionInstance<T>` — `{ type, data: SectionDataFor<T>, variant: string, enabled, order, variantAuto? }`. `data` is type-narrowed per Section; `variantAuto` is false once the customer manually locks a Variant (a Gaya preset may then not auto-suggest a different one). Compatibility rule: readers accept prior stored shapes; breaking changes require an approved migration (D12).
- `Theme` — `{ palette, colors?, preset?, fonts { display, body, script? }, animation, background { kind, value } }`. Curated Gaya presets carry literal inline `colors` (`ThemeColors`) that override the named-palette lookup; `preset` records the active Gaya preset id (`lib/themes/presets.ts`) so the editor can highlight the selected Gaya swatch. The six named palettes in `lib/sections/theme.ts` remain as the legacy fallback (unknown names resolve to `plum_gold`).
- `SectionCardData` — `{ templateId, theme, sections, schemaVersion?: 2 }`; Section-v2 payloads are distinguished from `LegacyCardData` by an array-valued `sections` property (`isSectionCard()` in `lib/types.ts`). `schemaVersion?: 2` is optional metadata carried by v2 payloads and is not what dispatch checks.

Module metadata lives in `lib/sections/types.ts`: each registered Section declares its label(s), default data, default Variant, Variant metadata including premium tier and visibility, repeatability, and an optional `customForm` override for sub-forms where the generic schema-driven form is insufficient. The central registry maps `SectionType → SectionModule` (`lib/sections/registry.ts`) and is the single import point for all renderers.

## 3. Rendering contexts

### Editor — `/dashboard/cards/[id]/edit`

`SectionEditor` hydrates from `card.revision_draft ?? card.custom_data_draft ?? card.custom_data`, restores only a version-matching localStorage cache, renders the three-pane UI, exposes per-keystroke Live preview via an inline `SectionInvitationCard`, and serializes debounce/force saves to the applicable draft through `PATCH /api/cards/[id]/draft` (ownership-checked server client). The dashboard and owner/admin bare preview surfaces use the guarded current publication snapshot after a later republication; they never reinterpret the immutable first snapshot as the current public version. The save contract carries the expected `draft_version`; a successful response returns the next version and `last_activity_at`. A 409 conflict blocks publication and offers a reload path rather than guessing which tab is current. For a paid draft or active revision window, the owner publication dialog requires the exact unchecked-to-checked acknowledgement, flushes the latest editor state, then calls `POST /api/cards/[id]/publish`; a revision publish also carries the window id and expected version. If that request's response is lost, retry reuses the same final saved version so the database replay remains read-only. The guest link appears only after its committed response. Section image upload goes to private Storage path `<cardId>/<sectionType>/<UUID>.<ext>` via the browser client under Storage RLS (not a guarded card RPC) and stores a stable `/api/card-assets/...` reference; it works before payment and during an active post-publication window, but uploads are append-only after first publication. Direct browser reads and signed URLs are denied.

#### Section editor tour

`components/SectionEditorTour.tsx` renders an optional five-step desktop / six-step mobile Malay tour over the editor with a step list per viewport, highlighting each target via stable `data-editor-tour` attributes. At 1024px and wider the desktop list walks the Section sidebar, Sub-form, Live preview pane, Save indicator, and Continue to payment button; below that breakpoint the mobile list walks the Live card canvas, Form sheet, Sheet detent control, Navigation rail, the Section stack screen (Susun Bahagian, with an animated reorder hint arrow at the first row's drag handle), and the same Continue to payment button, with autosave folded into the Form sheet step. The Susun Bahagian mobile step points an animated reorder hint arrow above the first row's drag handle. Pane selection is the tour's one deliberate exception to its state-free contract: every mobile step declares the pane it describes — the four card-and-sheet steps `pane: "edit"`, Susun Bahagian `pane: "stack"` — and the tour reconciles the shell through an editor-owned `onRequestPane` callback (`setMobilePane`), restoring the pane the customer started on whenever a step needs no particular pane and on every exit — Seterusnya, Kembali, ×, Escape, and completion. The tour still reaches no data: it never sets `activeIdx`, `sheetDetent`, or any draft field, and never manipulates panes through the DOM. The edit page reads `users.section_editor_tour_completed_at` (migration 017) and passes the flag down: only a signed-in account whose marker is still NULL auto-launches the tour, always after the hydration shell so the target DOM exists; a failed profile read suppresses the automatic launch rather than looking like a fresh account. The shared `matchMedia` signal (`min-width: 1024px`, exported as `DESKTOP_TOUR_QUERY`/`useIsDesktopViewport` from `SectionEditorTour.tsx`) selects which step list the tour renders — it no longer suppresses the tour on mobile. Finishing **or** dismissing stamps the marker through `completeSectionEditorTourAction()` (`app/actions/editor-help.ts`) — a service-role write scoped to the caller's own row and idempotent while the marker is NULL. The persistent Bantuan control in the editor top bar replays the tour from step one at any time without clearing the marker. The overlay is modal: focus moves into the panel on open, Tab is trapped to the panel's enabled controls while Escape dismisses, and focus returns to the opener when the tour settles. The trap treats any active element outside the enabled-button list as escaped — including the panel itself on open — so a `Shift+Tab` pressed while the freshly opened panel holds focus wraps to the last enabled button instead of leaving the modal. Placement invariant: because the dashboard Navbar is a 58px-tall sticky bar with z-index 100, the tour overlay stacks above it (z-index 120), measures the rendered panel height whenever its step, error state, or viewport changes, and selects an above/below candidate only when the complete panel fits. It clamps the chosen panel below the Navbar and inside the viewport. On the mobile viewport the Navbar is hidden, so the minimum top is only the gutter; the panel is full-bleed minus that gutter, reserves the 76px navigation rail plus the gutter above the viewport bottom, respects `--kb-inset`, and uses an opposite-side rule (a target in the lower half puts the panel in the upper area, otherwise below). When a mobile step target is not yet present during a pane switch, `measure()` resolves no rect and the tour falls back to a centred panel with no highlight ring rather than crashing or highlighting the wrong element. Customer-facing tour copy uses active, plain Malay on both viewports. Helper-state invariant: the tour keeps only ephemeral state — open/step/highlight plus the remembered starting pane it restores — it is neither in-memory draft data nor localStorage nor `custom_data_draft`, no tour interaction invokes `updateData`, the debounced draft save, or `PATCH /api/cards/[id]/draft`, and its only shell write is `mobilePane` through `onRequestPane`. Mobile support for non-Malay tour copy is out of scope (D16, amended by KJ-2).

### Published card — `/i/[slug]`

`InvitationCard` dispatches on data shape: an array-valued `sections` property (the single `isSectionCard()` discriminator) → `SectionInvitationCard`, otherwise the legacy renderer for historical payloads. `SectionInvitationCard`:

- resolves colours/fonts with `colorsFor()`/`fontFor()` from the card `Theme`;
- resolves the effective event date across date-bearing Sections (`lib/sections/resolve-event-date.ts`): valid Event info is primary, Landing is only its fallback, and valid multi-day agenda values supplement grouping; malformed values are ignored;
- filters disabled instances, sorts by `order`, resolves each through the registry — unknown Section types and unknown Variants fall back safely (default Variant / skip);
- isolates errors per Section so one failing Section cannot blank the whole card;
- maps customer image fields through `lib/card-assets.ts` before rendering. Landing, Child Info, Corporate Speakers, Gallery, Love Story, Gaya background, and legacy cover/gallery fields all use the card-scoped application endpoint; unknown or malformed customer image values are blanked rather than fetched. The only preserved non-customer image namespace is the strict local `/templates/<safe path>.<image extension>` / known-public-placeholder allowlist;
- exposes `window.__KAMY_CARD_ID__` so the RSVP Section can POST without prop drilling, and wraps wishes realtime via `WishesProvider`.

### Customer asset boundary

`lib/card-assets.ts` is the shared normalization boundary for Live preview,
owner/admin bare previews, and the public invitation. The endpoint at
`/api/card-assets/[cardId]/[...assetPath]` authenticates every request and
streams from the private `card-assets` bucket. Owners and administrators may
read validated assets for the card, including draft-only or orphan uploads;
guests may read only an exact reference in the frozen published snapshot of a
paid, currently Published card. The selected row is the only guest-visible
publication; availability disable or a private edit window therefore blocks
guest image requests immediately while preserving authorized owner/admin access.
Superseded publication references are not guest-readable through this route.

The same boundary is used for frozen membership collection. A legacy Landing
record with only `heroImageUrl` is normalized to `coverPhotoUrl` in memory for
both rendering and exact-reference checks; a present `coverPhotoUrl` wins,
including an explicit empty value. The editor registry uses the shared strict
image-reference predicate for uploaded app references, exact configured-origin
legacy `card-assets` URLs, and safe public template/static paths. Map, contact,
and other general URL fields retain ordinary absolute-URL validation.

New uploads use stable UUID object names and app references. Existing known
Supabase public URLs are converted in memory only when their origin, bucket,
card and path are exact; immutable payment/publication evidence is never
rewritten or moved. The endpoint rejects unknown origins, cross-card paths,
traversal and malformed names, does not proxy arbitrary URLs, and sends
`no-store`/`nosniff` responses. The current invite Open Graph renderer is
text-only and does not introduce a second customer-image access path. The
editor performs only owner `upsert=false` inserts; clearing a field leaves the
private object for authorized cleanup. Direct browser update/delete is not a
supported compatibility path for the editor: Storage update would require a
direct object SELECT, which is intentionally denied, while the existing owner
delete policy remains available for authorized cleanup.

Built-in `THEME_PRESETS` backgrounds are gradient/solid CSS and carry no
customer image URLs. Template showcase thumbnails remain public static assets
under `/templates/...` and are not card-assets; the normalizer preserves only
that narrow allowlist (plus the repository's known placeholder SVGs). No
customer upload is made public to preserve those assets.

### Bare preview surface — `/templates/preview/[id]`

Renders a DB Section-v2 row, or a legacy component for supported preview IDs. Used by the Gallery preview iframe (lazy-loaded per Template showcase card) and the Detail preview iframe on `/templates/[id]`.

### Controlled replacement lineage

Issue #75 adds a separate administrator-controlled path for correcting a paid
invitation. A `card_replacement_grants` row links one predecessor publication
to one separately entitled target order/card. The target keeps the source owner
and template and starts with a copy of the latest published snapshot, but its
image references are remapped from `/api/card-assets/<source-card>/...` to
`/api/card-assets/<target-card>/...`; arbitrary URLs, predecessor references and
cross-card paths are rejected. Source publication rows, source bytes and RSVP
rows remain attached to the predecessor.

The target is a normal owner-editable unpublished draft for saving and
target-scoped uploads, with `orders.entitlement_source =
'controlled_replacement'` as its only paid entitlement. It must not enter
Stripe, DuitNow, receipt, revenue or ordinary paid-draft publication flows.
`card_replacement_asset_copies` records the source hash/size/MIME and a
pending-to-ready target copy; a ready row is immutable and retries are
idempotent. `card_replacement_asset_preparations` binds the copied set to the
exact target `draft_version` and JSON snapshot, so an owner edit after a copy
plan cannot make an old preparation publish newer content.

Cutover is the only publication path for the target. The service locks both
orders in ascending UUID order and then both cards in ascending UUID order,
rechecks the current predecessor publication, target draft version and
prepared asset set, inserts a `controlled_replacement` publication for the
target, and marks the predecessor non-public in one transaction. A
`card_replacement_cutovers` row makes the predecessor's Retired state terminal;
retired cards cannot be restored, edited, republished, granted another edit
window or deleted through ordinary lifecycle paths. A still-public predecessor
may be disabled for moderation while its replacement is pending, but a pending
target cannot be restored or published. Migration 042 restores the append-only
card-assets policy boundary for published, expired and disabled histories and
binds a grant to the source publication reviewed by the administrator. The
owner and administrator surfaces retain reason and direct lineage details,
while every guest-facing page, RSC, metadata/OG, RSVP, realtime and asset
boundary rejects a retired predecessor before selecting any private snapshot.

## 4. Lifecycle boundaries

```
template preset ──createDraftCardAction──> pending order + unpublished card
        (custom_data and custom_data_draft seeded from the preset)
       │
editor edits ──debounced PATCH──> cards.custom_data_draft
       │                            (requires an unpublished card and draft marker;
       │                             remains owner-writable during manual review)
       │
customer uploads manual QR receipt ──immutable submission──> frozen slot config
       │                              + amount + exact custom_data_draft
       │
payment completion ──────────> record payment metadata, keep one private
       │                        editable paid draft
       │
       └─ manual review total ─> record payment metadata, keep custom_data_draft,
                                set manual_paid_draft, never publish

owner acknowledgement + latest saved version ─> publish_paid_draft()
                                                copy snapshot, publish once

Only the selected current Published branch is guest-accessible. A paid manual
draft remains editable by its owner until the later publication workflow; it has
no guest URL. After first publication, an administrator-approved edit window
atomically clears public visibility and keeps the same slug private while the
owner edits `revision_draft`. The database clock enforces the seven-day deadline
on every save, upload and publication transition. `publish_card_revision` writes
an immutable later `card_publications` row and advances the pointer only after
the owner acknowledgement/version checks succeed. Expiry leaves the draft
retained but locked; a fresh audited grant is required. The current pointer and
all missing/corrupt publication data fail closed.
```

`createDraftCardAction` creates the required card before payment. `complete_order_payment` does not create a fallback card. A unique index allows one card per order.

While a manual QR receipt awaits review or an amount is partially confirmed, the owner may continue editing the live unpublished draft and its images. Immutable payment evidence, receipt versions, review decisions and payment-time snapshots do not change, and the order/fulfilment deletion guard remains active. Replacing a receipt preserves the attempt and its frozen draft; a confirmed partial payment needs a new same-method top-up attempt. The first sufficient total sets `orders.manual_paid_draft = true`, keeps the saved draft unpublished and opens exactly one owner-editable paid draft. It never publishes, sends a publication email or exposes `/i/[slug]`. Stripe follows the same entitlement boundary after its signed webhook. Stripe fallback after rejection requires zero confirmed manual amount. Migration 031 extends the order-locked reservation and attachment guards to new receipt attempts, retaining the exact Stripe-confirmed handoff from migration 028. Historical reference-only submissions remain reviewable, but cannot be created through the revoked legacy RPC.

Slot configuration has the same durable boundary: migration 024 denies direct `service_role` DML on both slots and their immutable payment/audit records. The owned `SECURITY DEFINER` slot-management RPC is the only slot writer, atomically advancing the version and appending history; migration 025 receives and revalidates the signed-in administrator ID so immutable slot and review audits identify the actual actor. PostgreSQL ACLs enforce this rather than a caller-controlled session/GUC setting.

`complete_order_payment` is the Stripe-only payment transition and locks the pending order and its card in one transaction. A missing card or draft makes Stripe receive HTTP 500. The transaction then rolls back, and Stripe can retry. It records `manual_paid_draft` while leaving `custom_data_draft` and `is_published = false` intact; the caller-provided snapshot is not authoritative. The manual review transition likewise locks the order, attempt and card, validates the stored evidence and calculated totals, and marks the order paid without publishing.

`publish_paid_draft` is the only first-publication transition. It locks the paid order and card, checks the owner, fixed template, availability, live saved draft and expected `draft_version`, requires the route's explicit `{ acknowledged: true }` confirmation together with the exact acknowledgement text, stores that acknowledgement and the published snapshot in one append-only audit row, then copies the latest draft to `custom_data`, clears `custom_data_draft`, creates the first `card_publications` row, sets its guarded current pointer, and sets `published_at` once. A payment winner copies nothing and publishes nothing. Later manual receipts are duplicate records; one correction may append against a duplicate with a required reason, and retries return the original result without creating a second paid draft or entitlement.

`open_card_edit_window` is the only post-publication edit grant. An authenticated administrator supplies a bounded reason and an idempotency request id; the RPC locks the order and card, rejects conflicting active grants, returns the original result for a duplicate request, preserves `custom_data`/payment/template facts, copies the current immutable publication into `revision_draft`, and atomically makes the same slug private. The database clock sets `expires_at = granted_at + 7 days`. `save_card_draft` accepts the revision only while that exact window is active, and records owner activity in immutable history. `publish_card_revision` requires the owner, active window, exact acknowledgement and expected version, then inserts one immutable later publication, advances `current_publication_id`, closes the window and restores public visibility while retaining the original `published_at`. It is replay-safe. At or after expiry, save/upload/publish fail server-side and the card stays private until a new audited grant. Availability disable wins over every revision transition; restore does not publish stale content or bypass a window.

`PATCH /api/cards/[id]/draft` passes the owner and expected `draft_version` to `save_card_draft`. Before first publication it requires `is_published = false` and a non-null `custom_data_draft`; during a revision window it requires the exact active window, `revision_draft`, current pointer and an unexpired database deadline. A stale version, consumed marker or expired window returns HTTP 409. The successful save increments `draft_version` and sets `last_activity_at`; these same-row guards prevent a stale save from restoring a cleared marker or mutating the first/current publication snapshot.

### Customer Mohon Suntingan request flow

`card_edit_requests` is the append-only decision ledger for issue #80. A
customer submission is accepted only for the owner's paid Published invitation
or the owner's expired revision window. It stores the current publication id,
active edit-window id (when present), latest availability-action id and
`draft_version` observed under the existing order-then-card locks. A partial
unique index permits one pending request per invitation. The customer-facing
projection returns only the reason, status, bounded rejection/stale reason and
window deadline; administrator actor identity and internal generation columns
never cross the customer API boundary.

`POST /api/cards/[id]/edit-request` authenticates the owner and calls the
service-role-only `submit_card_edit_request` RPC. The RPC performs the owner,
paid, availability, publication and lifecycle checks again at transaction time.
It returns the original result for the same request id and rejects a different
pending intent. Submission does not alter `cards.is_published`, the current
publication pointer or any edit-window row: a Published invitation remains
public and read-only, while an expired edit window remains private and locked.

`POST /api/admin/edit-requests/[id]/decision` authenticates an administrator
and calls `review_card_edit_request`. The reviewer discovers the card without
locking the request, then locks order, card and request in that order. It
rechecks ownership, paid state, latest availability action, current publication,
window expiry and draft generation. A mismatch, disable, retirement,
replacement or guarded `open_card_edit_window` rejection resolves the pending
row to terminal `stale` and never opens a window. Reject writes the bounded
customer-readable reason. Approve delegates to the stable guarded
`open_card_edit_window` signature using the decision id, then records the
approved window on the request in the same transaction. Any failure rolls back
both the window and the decision. Terminal exact retries return the recorded
result; a different decision cannot change it.

Migration 043 rejects approval ids already used by another request or edit
window and verifies that a non-replayed grant is the card's new active future
window before recording the approved request.

The Dashboard reads request rows through owner RLS and renders `Mohon
Suntingan` only for Published and Edit window expired Card rows. The Admin nav
and overview show the pending count, and `/admin/edit-requests` uses the shared
Admin table plus a bounded-reason rejection Dialog. This is an in-app queue;
there is no outbound notification side effect.

The database trigger rejects direct publication changes. Payment completion and recorded administrator availability actions use guarded database functions. The trigger also protects paid cards and cards whose DuitNow submission is still awaiting review from deletion.

The checkout success view reads the winning `payment_method` / `payment_completed_at` from client state that every status poll refreshes: whichever completion lands after page load (a Stripe webhook or a confirmed DuitNow review) still shows the correct winner and completion time without a reload.

### The derived lifecycle states

State is **derived** from durable facts (`deriveCardLifecycle` in
`lib/types.ts`) — there is no customer-writable lifecycle column:

- **Editing** — the related order is not paid. Draft writes and owner deletion
  are allowed, both guarded by transactional RPCs so a payment transition can
  never race them. A durable Checkout reservation is not a fifth state but
  temporarily protects deletion: a bound open Session is expired and confirmed
  first, while an unbound/ambiguous reservation remains intact. A permitted
  deletion removes the pending order with the card so no orphan order can be
  checked out afterwards.
- **Paid draft** — the first confirmed Stripe, Bank DuitNow, or Touch ’n Go
  payment set `orders.manual_paid_draft = true`, with an unpublished card and a
  non-null saved draft. The owner may edit it; no guest URL, publication
  confirmation or second entitlement exists. `draft_version` guards saves and
  publication, while `last_activity_at` records only successful customer draft
  saves (historical rows may be NULL).
- **Publishing** — a compatibility/recovery state for an older paid row that
  has not yet been normalized to the paid-draft entitlement. New payment
  completion and `finalize_paid_order` never publish; they leave or normalize a
  private draft. The owner status probe can recover the entitlement without
  exposing a slug.
- **Published** — paid and public. The only guest-accessible state.
- **Unavailable** — paid, unpublished, and latest audit action `disabled`.
  Distinguished from Publishing by `card_availability_actions`, an append-only
  administrator audit table (disable always records a nonblank reason; DB CHECK
  enforced). An audit-read failure fails the operation rather than defaulting to
  "no disable", because republishing an Unavailable invitation is worse than
  retrying.
- **Edit window** — paid and first-published, currently private because an
  active administrator-approved seven-day window owns `revision_draft`. The
  owner may save existing content, Section order/variants, the Gaya panel and
  append-only new image UUIDs, but cannot replace the purchased template or
  alter payment facts.
- **Edit window expired** — the same private revision after the database
  deadline. The retained draft is not discarded or auto-published; owner saves,
  uploads and publication are locked until a fresh administrator grant.

Invariants: only `publish_paid_draft` promotes `custom_data_draft` into the
immutable first snapshot. Later publication is only through
`publish_card_revision`, which appends a `card_publications` row and moves one
guarded current pointer. The first sufficient payment opens exactly one paid
draft instead of publishing, and its owner may edit that draft until the
explicit publication acknowledgement. No customer-facing flow can create a
second paid draft or entitlement. Grant/save/publication acknowledgement and
version checks are atomic; retries return the existing result without
overwriting immutable snapshots or adding another publication. A disabled card
returns Unavailable and is never restored by customer publication or an old
revision.
Migration 033 adds `draft_version` and `last_activity_at`; `save_card_draft`
requires owner and expected version and repeats the unpublished/non-null draft
guards on its same-row `UPDATE`. A stale save or publication request cannot
recreate a cleared marker. Migration 020 adds the Checkout-reservation hardening layer: a
bound open or ambiguous Checkout Session protects the Editing card from
delete-or-retry races until Stripe reconciliation confirms it cannot be paid. An
administrative disable retains the original `published_at`. A missing
pre-created Card during finalization is a retryable/remediable failure — cards
are never recreated from `orders.custom_data`, which avoids duplicate or
malformed publications. Availability transitions are reasoned and recorded via
the `set_card_availability` RPC: disable requires a paid Published card plus a
nonblank reason; restore requires a paid Unavailable card.

### Event-date grouping

The dashboard first separates invitations needing attention from Published invitations, then groups Published invitations by event date in Asia/Kuala_Lumpur using
`lib/sections/resolve-event-date.ts` (`collectEventDates`,
`classifyEventDates`, `klTodayKey`): strict parsing rejects malformed or
impossible calendar values instead of rolling over, date-only values stay
calendar-stable, and grouping keys are Kuala Lumpur day strings so groups are
deterministic. The server passes safe search metadata and rendered Card row
slots to `InvitationGallery`; the client shows one selected group and six
invitations per page, with sticky filters and search. These controls do not
fetch or mutate data independently.

## 5. Deliberate limits

- No free-form visual canvas; the Section stack is intentionally constrained.
- `LocalisedText` is `string`; bilingual copy is manual — this is the approved language model (D14), not a pending limitation. Any structured multi-language future must be additive under D12.
- Premium Variant tiers are informational today; paid gating is unresolved (Q3).
- Section schemas are code-first (D2); no runtime dependency constraints between Sections beyond preset authoring.

## Manual payment evidence

Issue #69 separates payment attempts, immutable receipt versions/reviews, and mutable current receipt/access state. Issue #70 adds the append-only review ledger, private administrator evidence bucket, one-row-per-attempt queue and concurrency-safe total allocation. The frozen Section-v2 draft lives on the attempt, never inside receipt metadata. Replacement preserves that attempt; a confirmed partial payment requires a new top-up attempt. The first sufficient total creates one editable paid draft without publication; duplicate receipts and reasoned corrections never create another entitlement. See `FLOW.md` for the table, RPC, authorization and private-content inventory.
