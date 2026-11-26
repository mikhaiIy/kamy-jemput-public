# System Flow & Service Architecture

> Source of truth for how services connect to code and how data moves through the
> app. Keep this file in sync with real routes, service clients, env vars, and
> migrations. Root `CLAUDE.md` defines the update policy.

---

## Services at a Glance

| Service | Purpose | Env vars it needs |
|---|---|---|
| **Supabase** | Postgres database, Auth, File Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | Hosted one-time card payments via Checkout Sessions (optional method) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Manual QR** | One Bank QR and one Touch ’n Go QR, configured in admin settings. Private customer receipts, administrator evidence, queue projection and guarded database RPCs (migrations 029–035) | none |
| **Payment support** | Administrator-managed support email and Malaysian +60 WhatsApp contact values, customer-safe fallback/message links, and immutable change history (migration 032) | none |
| **Resend** | Transactional emails | `RESEND_API_KEY`, `FROM_EMAIL`, `NEXT_PUBLIC_APP_URL` |

`NEXT_PUBLIC_APP_URL` is also used by Stripe redirect URLs. The app currently
defaults to `http://localhost:3000` when the variable is missing, so local
Stripe webhook testing should run the dev server on port `3000` or set the env
var to the actual port.

---

## Route Groups

| Group | Public paths | Layout / protection |
|---|---|---|
| `(public)` | `/`, `/templates`, `/templates/[id]`, `/templates/custom`, `/privacy`, `/terms` | Navbar + Footer |
| `(invite)` | `/i/[slug]` | Bare guest invitation, no Navbar/Footer (the card is the whole experience) |
| `(preview)` | `/templates/preview/[id]`, `/admin/cards/[id]/preview`, `/dashboard/cards/[id]/preview` | Bare preview surfaces, no Navbar/Footer; saved customer previews require their owner or an administrator on the corresponding route |
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth pages, no Navbar |
| `(dashboard)` | `/dashboard`, `/dashboard/cards/new`, `/dashboard/cards/[id]/edit`, `/dashboard/cards/[id]/rsvp`, `/dashboard/checkout/[orderId]` | Protected by `proxy.ts`, Navbar + Footer. New v2 templates redirect from `/cards/new` to `/cards/[id]/edit` after a draft card is created. |
| `(admin)` | `/admin`, `/admin/orders`, `/admin/templates`, `/admin/cards`, `/admin/cards/[id]`, `/admin/custom-orders`, `/admin/payments`, `/admin/edit-requests`, `/admin/settings/qr`, `/admin/settings/support` | Protected by `proxy.ts`; role check in `(admin)/layout.tsx`; persistent Admin nav and content pane, no customer Navbar or Footer |

---

## Supabase: 3 Clients, 3 Contexts

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  ->  lib/supabase/client.ts   browser client
                                ->  lib/supabase/server.ts   Server Components / route auth checks
                                ->  proxy.ts                 auth/session cookie refresh

SUPABASE_SERVICE_ROLE_KEY      ->  lib/supabase/admin.ts    trusted server-only system operations
```

### Why 3 clients?

- **`client.ts`** is browser-only. It is used by client components for auth and
  storage uploads. It respects RLS.
- **`server.ts`** is for Server Components, Server Actions, and Route Handlers
  that need the current user's session. It respects RLS.
- **`admin.ts`** uses the service-role key and bypasses RLS. Use it only in
  trusted server-only contexts after explicit auth/ownership/admin checks.
- **`proxy.ts`** refreshes Supabase session cookies and performs coarse
  redirects for `/dashboard/*` and `/admin/*`. It is not the only security
  boundary; protected mutations still check auth in their own handler/action.

### Files that import each client

| Client file | Imported by |
|---|---|
| `lib/supabase/client.ts` | Auth client components (`app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `components/LogoutButton.tsx`), Section customization form storage upload (`components/sections/_image_upload.tsx`), guestbook wishes realtime context (`components/sections/_wishes_context.tsx`) |
| `lib/supabase/server.ts` | Server Components and layouts (`app/(public)/page.tsx`, `app/(public)/templates/page.tsx`, `app/(public)/templates/[id]/page.tsx`, `app/(preview)/templates/preview/[id]/page.tsx`, `app/(invite)/i/[slug]/page.tsx`, `app/(dashboard)/layout.tsx` + dashboard pages, `app/(admin)/layout.tsx`, `components/Navbar.tsx`), Server Actions (`app/actions/order.ts`, `app/actions/card.ts`, `app/actions/editor-help.ts`, `app/(admin)/admin/custom-orders/actions.ts`, `app/(admin)/admin/cards/[id]/actions.ts`, `app/(admin)/admin/settings/support/actions.ts`), Route Handlers (`app/auth/callback/route.ts`, `app/api/stripe/checkout/route.ts`, `app/api/orders/[orderId]/status/route.ts`, `app/api/custom-orders/route.ts`, `app/api/cards/[id]/draft/route.ts`, `app/api/cards/[id]/publish/route.ts`, `app/api/cards/[id]/edit-request/route.ts`, `app/api/admin/templates/[id]/route.ts`, `app/api/admin/cards/[id]/publish/route.ts`, `app/api/admin/cards/[id]/edit-window/route.ts`, `app/api/admin/cards/[id]/replacement/route.ts`, `app/api/admin/edit-requests/[id]/decision/route.ts`) |
| `lib/supabase/admin.ts` | Stripe checkout/webhook routes (`app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`), RSVP route (`app/api/rsvp/[cardId]/route.ts`), order-status and DuitNow submission route (`app/api/orders/[orderId]/status/route.ts`), custom-order intake (`app/api/custom-orders/route.ts`), draft-save and paid-draft/revision publication APIs (`app/api/cards/[id]/draft/route.ts`, `app/api/cards/[id]/publish/route.ts`), controlled replacement grant/preparation/cutover API (`app/api/admin/cards/[id]/replacement/route.ts`), admin publish/edit-window/template/edit-request API routes, Server Actions (`app/actions/order.ts`, `app/actions/card.ts`, `app/actions/editor-help.ts`, `app/(admin)/admin/custom-orders/actions.ts`, `app/(admin)/admin/cards/[id]/actions.ts`, `app/(admin)/admin/payments/actions.ts`, `app/(admin)/admin/settings/support/actions.ts`), admin Server Components including `payments/page.tsx`, `settings/support/page.tsx`, the guarded bare preview at `app/(preview)/admin/cards/[id]/preview/page.tsx`, and the paid-and-public invitation lookup. The dev preview-variant route has no Supabase mutation surface. |
| `lib/public-invitation.ts` | Server-only paid/current-publication loader used by the invite page, metadata, OG image, RSVP route and protected asset route; it owns the service-role reads and passes only validated publication/window/profile inputs to the pure decision helper. |
| `lib/public-invitation-decision.ts` | Runtime-neutral current visibility decision shared by the server loader and boundary tests; it returns only the selected current publication or the bounded edit notice and never accepts a private draft or historical snapshot. |
| `lib/card-assets.ts` | Pure asset-reference normalization and snapshot field inventory. The protected asset route (`app/api/card-assets/[cardId]/[...assetPath]/route.ts`) uses `supabaseAdmin` only after session/owner/admin or frozen-snapshot authorization. |
| `lib/card-replacement-assets.ts` | Pure controlled-replacement snapshot remapping, predecessor-to-target asset planning and target-card image-reference safety checks used by the administrator replacement route. |
| `lib/card-image-reference.ts` | Shared strict Zod image-field schema used by Landing, Child Info, Corporate Speakers, Gallery, and Love Story registry modules; accepts stable app refs, exact known-origin legacy card-assets refs, and the narrow public static allowlist without changing general URL validation. |
| `lib/preview-templates.ts` | Template gallery (`app/(public)/templates/page.tsx`), template detail page (`app/(public)/templates/[id]/page.tsx`), and bare preview route (`app/(preview)/templates/preview/[id]/page.tsx`). Defines the legacy template IDs that support live previews. |

Edge-runtime exception: the Open Graph image routes (`app/opengraph-image.tsx`, `app/(invite)/i/[slug]/opengraph-image.tsx`) run on the Edge runtime where cookie handling does not apply. The invite OG route uses the same server-only current-publication loader as the page, metadata, RSVP and asset boundaries; its service-role client is lazily created with fetch-compatible `@supabase/supabase-js` calls and the pure decision helper returns no private draft data. It performs no writes and sends `Cache-Control: no-store`.

Best-practice note: prefer the RLS-aware server client for normal user-owned
reads/writes. Use the admin client when the server is intentionally acting as
the system, and keep the authorization check close to the write.

---

## Payments: Stripe Checkout + DuitNow manual slots + support contacts

```
STRIPE_SECRET_KEY      ->  lib/stripe.ts
                             -> app/api/stripe/checkout/route.ts
                             -> app/api/stripe/webhook/route.ts

STRIPE_WEBHOOK_SECRET  ->  app/api/stripe/webhook/route.ts
```

A pending order supports Stripe Checkout, Bank DuitNow (slot 1; slot 2 retained for historical records), and Touch ’n Go (a separate manual QR configuration). The first sufficient confirmed payment through any method uses the shared first-payment-wins boundary: it marks the order paid and opens exactly one editable, unpublished paid draft. Stripe completion uses `complete_order_payment` and deliberately ignores any caller-supplied draft snapshot; manual review uses the issue #70 review transition and preserves immutable receipt/evidence snapshots. Payment confirmation never publishes, exposes a guest URL or sends a publication email. Partial confirmations do not publish. Excess money is shown for manual refund support; there are no automated refunds. The owner later publishes the latest saved draft through `publish_paid_draft` after the exact publication acknowledgement.

### Manual QR receipts (migrations 029–035)

1. `page.tsx` authenticates and checks order ownership, loads the related card's latest availability action for the initial lifecycle, the enabled Bank slot (1), `tng_payment_config`, legacy history, `manual_payment_state`, and the sanitized support-contact singleton. The Checkout status panel shows the Receipt upload control, optional Transfer-reference field, Current receipt, and remaining amount.
2. `POST /api/orders/[orderId]/status` accepts bounded multipart form data. It verifies ownership, expires/reconciles the exact bound Stripe Session using the existing handoff, then calls `uploadReceipt` in `lib/payment-receipts.ts`. The helper checks file bytes and framing, size (1–5,242,880 bytes), reference format and ownership before private Storage upload. Original file names and declared MIME types are not trusted or stored. A stable operation UUID and SHA-256 form the immutable object path; uploads never overwrite.
3. `submit_manual_receipt` (service-role-only) locks the order, rechecks owner/method/Stripe guards and Storage object presence, then atomically creates an attempt or appends a replacement version, updating its separate current pointer. No submission state exists without a stored receipt. Replayed upload IDs must match their payload. Replacements use an expected-current receipt ID to reject stale tabs. Each version binds to one attempt. Confirmed attempts cannot be replaced; top-ups create new attempts with the same method. Legacy `submit_duitnow_transfer` execution is revoked; historical submissions/reviews remain readable and reviewable.
4. `GET /api/orders/[orderId]/status` returns only the latest attempt's current receipt and customer-safe review projection, plus aggregate received/credited/remaining/excess sen from `manual_payment_state`, the sanitized support contact and a server boolean for Stripe availability. Reviewer IDs, administrator evidence paths, prior versions and audit history are never returned to customers. The checkout loader and existing status polling refresh the support contact without exposing its history. `GET ...?receipt=<uuid>` calls `readReceipt`: authenticate on every request, check order/owner/current latest version or administrator role, then stream an available private object as an attachment with no-store and nosniff. `components/ReceiptViewer.tsx`, used by the administrator payment page and customer checkout current-receipt panel, fetches this same authenticated endpoint with no-store when its dialog opens. It displays an image or browser PDF preview using a temporary blob URL, revokes it and aborts outstanding reads when closed, and offers an explicit download through the original endpoint. Loading, retry, unavailable-file and image/PDF-error messages stay inside the dialog and use the payment support message when the customer context supplies it. Receipt bytes never enter audit records or persistent browser storage. It issues no signed URL. Prior attempts and prior versions are admin-only; quarantine/removal denies downloads to everyone.
5. `/admin/payments` shows one newest-first queue row per attempt, with search and five filters: pending, insufficient, rejected, confirmed and duplicate. Expand Admin row details for stored order price, current receipt, optional customer reference, received/credited/remaining/excess amounts, review reason/actor/time, private evidence and version history. The review panel offers Confirmed, Insufficient and Rejected actions; Insufficient requires a server-validated private evidence file and a reason. A sufficient total sets `manual_paid_draft` exactly once without publishing; later receipts are Duplicate and one reasoned correction may be appended. `/admin` shows an in-dashboard pending-review notification. Legacy transfers appear only when present. Review decisions have no email or assignment/escalation side effects.
6. `manageReceiptAction` invokes `manage_payment_receipt` to quarantine or start removal, then removes the Storage object and appends the removed tombstone. Access is blocked before external deletion. Storage failures leave a retryable removing state; repeated actions do not duplicate tombstones. File controls remain separate from review and are available for prior and reviewed versions. QR configuration is handled by the administrator settings API below.

New service-client import surface: `lib/payment-receipts.ts` receives a trusted Supabase client from the order-status route and checkout page; `lib/payment-support-server.ts` reads the sanitized support singleton through that same trusted client and returns the empty fallback on read failure. Neither helper imports a singleton service client. `lib/manual-payment-message.ts` owns the pure customer-safe outcome copy and is re-exported by `lib/payments.ts`; its editable wording is enabled only from the derived unpublished lifecycle. `lib/section-editor-navigation.ts` is a client-safe helper imported by `SectionEditor` to flush the latest serialized draft before manual-review status navigation, with explicit loading/error handling and no invitation validation. Server actions retain their existing server/admin/Resend imports. The publication route imports the shared acknowledgement contract and existing Resend helper; no new credentials are required.

The owned editor page also reads `manual_payment_attempts` and legacy transfer
submissions through the admin client after its RLS ownership check. A submitted
or insufficient attempt keeps the owner on the live editor and adds a separate
QR payment-status action. That action flushes the latest serialized draft before
navigating, shows saving/error/conflict recovery in the editor, and does not
validate invitation completeness;
pending-review invitation text, layout, Gaya panel, Sections and images remain
editable, including during a same-method top-up. Dashboard Card row actions
expose both `Sambung Edit` and payment status/balance when manual history exists.
Receipt versions, evidence snapshots and review decisions remain immutable, and
the existing Stripe handoff guard still blocks a competing card payment. Draft
PATCH maps stale-version and non-editable/published conflicts to readable HTTP
409 responses; manual review is not an invitation-editing lock.
The Checkout status panel shows a wide total/received/remaining summary and
separate QR and receipt areas, stacked on smaller screens.

Manual paid drafts use this same Checkout status panel, with one receipt area
and the paid-draft edit action; there is no separate success panel above it.
The panel must not expose a guest URL until the owner completes the publication
flow. The paid-draft editor may save content and images while the card remains
unpublished; each successful save advances the draft version and records
customer activity.
Additional support receipt upload is opened explicitly after payment is complete. Rejected, insufficient, duplicate and overpayment/manual-refund states, unavailable QR/image errors, and receipt errors render the same exact support message built by `PaymentSupportMessage`; a missing configuration uses the no-link fallback. The component creates `mailto:` and digits-only `https://wa.me/` links only from validated values. Stripe is shown and callable only when the server reports a configured key and the existing pending/no-receipt/no-confirmed-manual-amount guards allow it.
The right-hand Checkout invitation preview uses `PhonePreview` with an iframe at
`/dashboard/cards/[id]/preview` in `(preview)`. That dynamic bare route imports
the RLS-aware server client, checks authentication and `user_id` ownership, then
renders the latest saved draft through `CardRenderer` without live RSVP context.
It does not use or reveal a public invitation URL. On small screens it follows
the payment area.

`ReceiptViewer` renders private PDFs with the lazily loaded `pdfjs-dist` library
and its bundled local worker via `ReceiptPdfPreview`. Pages render to a bounded
canvas with previous/next controls; invalid, empty or password-protected PDFs
show an explicit error while the authenticated download remains available.
No receipt bytes are sent to a third-party PDF service. Blob URLs and PDF worker
resources are released when the dialog closes. Existing stored files remain
immutable, including malformed historical fixtures.

### Stripe flow

1. Customer finishes customising in `/dashboard/cards/[id]/edit` (a pending order and unpublished draft card already exist, created by `createDraftCardAction`).
2. Continue to payment navigates to `/dashboard/checkout/[orderId]`; the customer chooses Stripe there.
3. The Continue to payment button saves the draft, then opens `PaymentMethodDialog` with exactly two choices: Stripe and DuitNow QR. Stripe calls `POST /api/stripe/checkout` directly; QR navigates to `/dashboard/checkout/[orderId]/qr`. The shared owned checkout loader handles this route too. The route reserves the owned order/card pair, then creates or recovers one Stripe Session with a stable reservation idempotency key. The locked reservation/attachment RPCs reject an order with any unreviewed frozen DuitNow submission, so no card-charge opportunity can be created during manual review; a rejected submission permits Stripe only if no manual amount has been confirmed. Migration 029 checks new attempts in both locked reservation and attachment RPCs.
4. The route binds the Session to the reservation before returning its URL; a retry reuses only that Stripe-confirmed open Session, and releases an expired Session only through the exact-token release RPC. Stripe redirects back to `/dashboard/checkout/[orderId]?status=success` or `?status=cancel`.
5. Stripe calls `POST /api/stripe/webhook` with a signed event.
6. The webhook verifies the signature and resolves the order from the saved `stripe_session_id`. Metadata is a consistency check. It calls `complete_order_payment(orderId, 'stripe', sessionId)`.
7. The database function locks the pending order and its card. It records Stripe as the winner, marks the shared paid-draft entitlement and leaves the latest saved draft private and editable.
8. The webhook acknowledges payment only after that transaction commits. It does not publish, expose a link or send a publication email.
9. The owner later saves any final edits, acknowledges the exact publication sentence and calls `POST /api/cards/[id]/publish`; that transaction copies the latest saved draft, records one immutable acknowledgement audit row and starts hosting with `published_at`.

The function does not create a fallback card. A missing card or draft causes HTTP 500. The transaction rolls back, so Stripe can retry.

Duplicate, late, or concurrent completions cannot change a paid order or its card. They do not send another email.

The draft-save route uses the same draft marker. It only updates an unpublished row with a non-null `custom_data_draft`. Otherwise, it returns HTTP 409. An owner status check can run `finalize_paid_order` to recover a paid Publishing invitation. It cannot republish an Unavailable invitation.

---

## Resend

```
RESEND_API_KEY  ->  lib/resend.ts
FROM_EMAIL      ->  lib/resend.ts
NEXT_PUBLIC_APP_URL -> lib/resend.ts
```

| Trigger | File | Email component |
|---|---|---|
| Owner's first publication succeeds | `app/api/cards/[id]/publish/route.ts` | `components/emails/OrderConfirmedEmail.tsx` |
| Guest submits RSVP | `app/api/rsvp/[cardId]/route.ts` | `components/emails/RSVPNotificationEmail.tsx` |

Email failures are intentionally non-fatal to payment and RSVP writes. A
revision publication sends no second first-publication email.

---

## API Routes and Server Actions

| Route / file | Method | Purpose |
|---|---|---|
| `app/actions/order.ts` | Server Action | `createDraftCardAction` calls the atomic `create_draft_order_and_card` RPC, which seeds the pending order and unpublished card from one locked active Section-v2 preset. |
| `app/actions/card.ts` | Server Action | `deleteCardAction(cardId)` deletes only an Editing pair through `delete_card_if_editing`. Checkout reservations protect the pair; after any immutable DuitNow submission, including a rejected one, audit preservation intentionally prevents deleting its order/card. |
| `app/actions/editor-help.ts` | Server Action | `completeSectionEditorTourAction()` — stamps the signed-in account's `users.section_editor_tour_completed_at` marker for the Section editor tour. Accepts no card id or draft payload; never reads or writes `cards`. Idempotent (writes only while the marker is NULL). |
| `app/api/stripe/checkout/route.ts` | POST | Reserves an owned editable order/card, uses a reservation-derived Stripe idempotency key, and persists the matching Session before returning its URL. |
| `app/api/stripe/webhook/route.ts` | POST | Verifies a signed paid event and its saved Session binding, then calls `complete_order_payment` to open one private paid draft. It never publishes or emails. |
| `app/api/rsvp/[cardId]/route.ts` | POST | Guest RSVP submission, no login required. Uses the one current-publication guest boundary, records `publication_id`, and broadcasts only on the matching publication topic. Private/expired windows return the same not-found response. |
| `app/api/card-assets/[cardId]/[...assetPath]/route.ts` | GET | Authenticated application-controlled image stream. Owners/admins may read validated paths for their card; anonymous or other users may read only exact paths referenced by the selected current immutable publication of a paid, currently Published card. It never redirects or creates a signed URL and returns no-store/nosniff bytes. |
| `app/api/orders/[orderId]/status/route.ts` | GET, POST | GET runs paid-order recovery, derives lifecycle, returns winning-payment/reservation metadata, and returns the customer's immutable DuitNow submission/review. Controlled-replacement orders return durable grant entitlement metadata only: no payment method/time, receipt, revenue or payment-confirmation email. POST rejects payment/receipt attempts for that source. GET with a receipt query streams authorized private content. |
| `app/api/cards/[id]/draft/route.ts` | PATCH | Saves the pre-publication draft, a pending controlled-replacement target draft, or the owner `revision_draft` for an active administrator-approved window with `expectedDraftVersion`; the guarded RPC enforces ownership, current pointer, exact window and DB-clock expiry, records immutable owner activity, and returns 409 for stale/expired/non-editable conflicts. Pending replacement owners may save; ordinary publication and new grants remain blocked. |
| `app/api/cards/[id]/publish/route.ts` | POST | Owner-only first publication or explicitly acknowledged revision publication. The revision path requires the exact active window id and expected version, appends an immutable publication and advances the current pointer; retries are replay-safe and do not overwrite snapshots. |
| `app/api/dev/preview-variant/route.ts` | POST | Always non-mutating: returns 404 in production and 410 in other environments. It cannot mutate protected/current publication data or serve as a public boundary bypass. |
| `app/api/admin/cards/[id]/publish/route.ts` | POST | Admin availability controls accepting validated `{ command: "disable", reason }` / `{ command: "restore" }` commands (never an arbitrary visibility boolean); executes the transactional `set_card_availability` RPC which appends to `card_availability_actions` atomically with the visibility flip. Rejects malformed commands, missing/blank disable reasons, unpaid activation, Publishing activation, and invalid transitions. No customer endpoint exists. |
| `app/api/admin/cards/[id]/edit-window/route.ts` | POST | Administrator-only bounded-reason grant. Calls `open_card_edit_window` with a replay-safe request id; the RPC serializes order/card locks, starts the seven-day DB-clock window, preserves the current publication and atomically makes the slug private. |
| `app/api/admin/cards/[id]/replacement/route.ts` | POST | Administrator-only controlled replacement grant or cutover. A grant binds the reviewed source publication before creating the separate target order/card and durable entitlement, remaps only predecessor-scoped image references, and prepares idempotent target copies/readiness. Cutover requires the source publication and replacement `draft_version` rendered for administrator review, revalidates both plus target assets, then calls the atomic deterministic-lock RPC; stale/missing review versions are rejected and ordinary payment/publication routes never publish the target. |
| `app/api/admin/templates/[id]/route.ts` | PATCH | Admin toggle template active state and price |
| `app/api/custom-orders/route.ts` | POST | Public-facing custom order intake. Server-validates payload, optionally binds to logged-in user. |
| `app/(admin)/admin/custom-orders/actions.ts` | Server Action | `updateCustomOrderAction(id, { status, adminNotes })`. Admin role check before write. |
| `app/(admin)/admin/cards/[id]/actions.ts` | Server Action | `adminDeleteCardAction(cardId)`. Admin role check before write; paid cards are protected from deletion by trigger |
| `app/(admin)/admin/payments/actions.ts` | Server Action | `uploadReviewEvidenceAction`, `reviewManualPaymentAction`, legacy `reviewDuitNowSubmissionAction`, `reviewReceiptAction`, and `manageReceiptAction`. Each admin mutation revalidates the role; manual review passes the authenticated actor to the transactional review RPC and sends no email |
| `app/(admin)/admin/settings/support/actions.ts` | Server Action | `saveSupportContactAction` checks the signed-in administrator, validates email/WhatsApp/reason/version, reads a selected prior row for restore, and calls the service-role-only guarded `update_payment_support_config` RPC. Every actual change appends before/after actor/time/reason history; stale versions are rejected and no-ops do not append. |

---

## End-to-End User Flow

```
1. VISITOR ARRIVES
   GET /
   -> server.ts checks session for auth-aware CTA

2. BROWSE TEMPLATES
   GET /templates
      -> static catalogue metadata in page code; only entries backed by an
         active templates.is_active row reach the gallery — missing or inactive
         rows are omitted entirely, so the catalogue never shows an
         unavailable-price (Akan Datang) card
      -> if the active-row query fails, the gallery renders its error state in
         place of the search field, filter strip, count, grid, and empty state
         (a failed lookup must not look like an empty active catalogue)
      -> client-side combined filtering: a case-insensitive search across the
         template name, mood, and static description ANDed with the selected
         category pill; only matching showcase cards render and the polite
         result count reports the combined total
      -> a zero-result success shows the empty-results state with two reset
         controls: one clears the search, one re-selects the Semua category pill
      -> previewable = Section-v2 DB row OR eligible legacy preview id; each
         previewable showcase card lazy-loads /templates/preview/[id]
   GET /templates/[id]
      -> phone-frame iframe preview
      -> known id without an active row: Coming soon state — no Template price
         (the static catalogue fallback price is never used) and no Customise
         CTA; unknown ids keep the unchanged notFound() route
   GET /templates/preview/[id]
      -> bare card preview
      -> Section-v2 row in DB, or a legacy component for a supported ID

3. REGISTER / LOGIN
   GET /register
      -> email/password + PDPA consent, or Google OAuth
   GET /login
      -> email/password, Google OAuth, forgot-password link
   GET /forgot-password
      -> supabase.auth.resetPasswordForEmail()
   GET /auth/callback
      -> Supabase code exchange
   GET /reset-password
      -> supabase.auth.updateUser({ password })

4. CUSTOMIZE
   Every active template is Section-v2 since migration 009.

     GET /dashboard/cards/new?template=<id>
       -> verifies template is active and v2 (type + theme + sections populated)
       -> createDraftCardAction(): creates pending order + unpublished cards row
          (custom_data and custom_data_draft seeded from template preset)
       -> redirect to /dashboard/cards/<cardId>/edit

     GET /dashboard/cards/[id]/edit
       -> loads revision_draft during an approved edit window, otherwise
          card.custom_data_draft || the guarded current publication snapshot ||
          card.custom_data
       -> components/SectionEditor.tsx (three-pane editor)
       -> per-keystroke live preview via inline SectionInvitationCard
       -> versioned localStorage cache: kamy:card-draft:<cardId>; a paid-draft
          reload restores cached edits only when they match the server version
       -> PATCH /api/cards/[id]/draft debounced ~1500ms after change
       -> save_card_draft RPC writes while the related order is pending (including
          manual review) or owns the one paid-draft entitlement; expected
          draft_version guards stale saves and a stale save after publication or
          an invalid payment/lifecycle state receives 409
       -> paid-draft editor publication control serializes a final save, then
          POST /api/cards/[id]/publish with the exact unchecked-to-checked
          acknowledgement; save or version conflicts never publish stale data;
          a lost publish response retries that same final version idempotently
       -> Section image upload path: card-assets/<cardId>/<sectionType>/<UUID>.<ext>
          The draft stores a stable /api/card-assets/<cardId>/<sectionType>/<file>
          reference, never a public or expiring URL. Migrations 033–037 require
          the card to be unpublished and never
          published (`published_at IS NULL`) for every owner asset policy, so
          an administratively unavailable card retains its frozen snapshot;
          migration 035 keeps payment-review locks separate from this edit path.
          The render and membership boundary also maps an old Landing
          `heroImageUrl`-only record when `coverPhotoUrl` is absent; a present
          current field wins. It does not edit immutable snapshots.
       -> desktop tour (first visit for the account only):
            edit page reads users.section_editor_tour_completed_at (NULL =
            never completed) and SectionEditorTour.tsx auto-launches the
            five-step Malay tour over the editor; finishing OR dismissing
            stamps the marker through app/actions/editor-help.ts — a write
            fully separate from PATCH /api/cards/[id]/draft; the editor top
            bar's Bantuan control replays the tour without clearing the marker
       -> tour placement invariant: the sticky dashboard Navbar is 58px tall
          with z-index 100 (components/Navbar.tsx), so the tour overlay stacks
          above it (z-index 120). The rendered panel height is measured for
          every step, error-state, and viewport change; placement chooses a
          side only when that complete height fits, then clamps both its top
          (at least 70px) and bottom inside the viewport. Short viewports
          constrain only the panel body to scroll while its header and controls
          remain visible.

5. PAY
   Editor's "Continue to payment":
     validates enabled Sections, force-saves the draft, then navigates to
     /dashboard/checkout/[orderId] — payment-method selection lives there
   During manual review, "Semak Status Bayaran" uses the same serialized save
     queue but skips invitation validation; it navigates only after the latest
     save succeeds and leaves the editor mounted with retry/conflict feedback on
     failure.
   At /dashboard/checkout/[orderId] the customer picks:
     a) Stripe (shown only when the server has STRIPE_SECRET_KEY):
        POST /api/stripe/checkout (order must be exactly pending)
        -> Stripe-hosted Checkout Session -> redirect back with ?status=success|cancel
     b) Manual QR: Bank DuitNow or Touch ’n Go, transfer, then upload the
        required receipt using multipart POST /api/orders/[orderId]/status.
        Versions remain private; an admin reviews actual received sen.
        Partial totals require a new receipt and same-method top-up; the first
        sufficient total opens one editable paid draft without publishing.

6. PAYMENT COMPLETION (first valid completion wins)
   Stripe POST /api/stripe/webhook invokes complete_order_payment:
     -> locks the order/card; only a still-pending order can win
     -> records orders.payment_method + payment_completed_at once
     -> sets the shared paid-draft entitlement and leaves the draft private
     -> sends no publication email or guest link
   Admin review at /admin/payments invokes admin_review_manual_payment:
     -> locks order, attempt and card; recalculates totals from immutable reviews
     -> records Confirmed / Insufficient / Rejected / Duplicate append-only rows
     -> credits only the remaining stored price; records excess separately
     -> on the first sufficient total, records payment metadata and sets
        manual_paid_draft without clearing the draft or publishing the card
     -> makes one duplicate correction possible with a required reason; retries
        are idempotent and cannot create another paid draft or entitlement
   GET /api/orders/[orderId]/status can recover an interrupted paid row through
   finalize_paid_order. It normalizes a legacy paid row to paid_draft when a
   live draft exists, never publishes, and cannot restore an Unavailable invitation.

7. GUEST OPENS CARD
   GET /i/[slug]
       -> one current-publication boundary: page, metadata, and OG image
          require paid + public + a valid current publication pointer; the
          private edit-window/expired and Unavailable states are never rendered
          with prior invitation data
       -> InvitationCard detects data shape:
          array-valued `sections` property (isSectionCard) => SectionInvitationCard
          otherwise => legacy renderer
   POST /api/rsvp/[cardId]
       -> admin.ts checks the same current Published boundary and resolves the
          selected immutable publication
       -> admin.ts inserts rsvp_responses with that publication_id
       -> resend.ts sends RSVP notification
       -> if message non-empty: HTTP POST to <SUPABASE_URL>/realtime/v1/api/broadcast
          on topic `wishes:<cardId>:<publicationId>` with the same immutable
          publication id in the payload; the client accepts only an exact
          topic/payload match, so only guests viewing the selected publication
          animate the new ucapan live (no page reload)

   When an administrator grants an edit window, the same slug returns only the
   safe bounded profile-name notice. On expiry the notice remains private and
   the owner is locked; a fresh grant is required. No guest page, RSC,
   metadata, OG, RSVP, asset stream or realtime path reads the prior snapshot.

   CONTROLLED REPLACEMENT
   Administrator opens the replacement panel on `/admin/cards/[id]` and submits
   a bounded reason plus a replay-safe request id:
       -> `POST /api/admin/cards/[id]/replacement` grant locks the paid
          predecessor order/card, creates a separate target order/card and
          controlled-replacement entitlement, and copies the latest published
          snapshot with target-card-scoped image references
       -> target owner edits `custom_data_draft` and may upload new target
          assets while preparation is pending; the target has no payment,
          receipt or ordinary paid-draft publication path
       -> the server plans source-to-target object copies, validates MIME/size/
          SHA-256 bytes, uploads with no overwrite, marks ready idempotently,
          and binds preparation to the exact target draft version
   Administrator submits cutover:
       -> the route rechecks the current source publication, target draft and
          every referenced target asset before calling `cutover_card_replacement`
       -> the RPC locks both orders in ascending UUID order, then both cards in
          ascending UUID order, publishes the validated target and retires the
          predecessor atomically; retries return the original result
       -> predecessor snapshots, publication history, assets, payment evidence
          and RSVPs remain in place; no RSVP is copied or moved
   A retired predecessor slug reaches only the generic unavailable/not-found
   boundary. The page, RSC, metadata, OG, RSVP, realtime and asset routes do
   not disclose its name, reason, replacement URL or historical details.

8. CARD OWNER DASHBOARD
   GET /dashboard
       -> protected Card list displayed as small phone renders:
          Perlu perhatian (all non-Published), Akan datang (current/future or
          undated Published), Majlis lepas (fully past Published), dates in KL
       -> owner-authenticated /dashboard/cards/[id]/preview for each lazy iframe;
          fixed 390px mobile viewport, scaled into an inert thumbnail link
       -> per-state Card row actions/metrics; active/expired window deadline and
          support direction are explicit; no account-wide Stats row
   GET /dashboard/cards/[id]/rsvp
       -> owner reads RSVP responses through RLS-aware server client

9. ADMIN
   GET /admin
       -> Admin overview: pending receipt/order/custom-request counts and latest orders
   GET /admin/orders
       -> searchable Orders table; payment status and confirmed time; lifecycle,
          days since payment and last customer draft activity; seven-day edit
          window deadline/expired state and invitation links;
          order-to-payment deep link /admin/payments?q=<order UUID>
   GET /admin/payments
       -> searchable Payment attempts table, current receipt per attempt,
          expandable review/version history; separate file-management controls
   GET /admin/templates
       -> combined search/category/active-status filters, price editing,
          confirmed active-state toggle and bare template preview links
   GET /admin/custom-orders
       -> searchable Custom requests table with status filtering and expandable
          brief/contact/status/notes editing
   GET /admin/settings/qr
       -> Bank/TNG image settings and latest 50 configuration changes per method
   GET /admin/settings/support
       -> optional support email and Malaysian +60 WhatsApp values, live exact
          customer-message sample, required reason, and immutable before/after
          history with restore through the same guarded write path
   GET /admin/cards/[id]
       -> draft-or-published preview, payment-confirmed time, days since payment,
          derived lifecycle and honest last-activity state, current publication /
          edit-window audit details, grant/reopen control, controlled replacement
          grant/cutover lineage, recorded availability and deletion controls,
          and direct order/payment navigation
   POST /api/admin/cards/[id]/edit-window
       -> administrator-only bounded reason + replay-safe request id; opens or
          replays one seven-day DB-clock window through `open_card_edit_window`
   POST /api/admin/cards/[id]/replacement
       -> administrator-only bounded reason + replay-safe request id; creates
          or replays a controlled replacement grant, prepares target-scoped
          assets, or completes/replays atomic cutover

```

The pre-payment draft-card flow (see End-to-End User Flow, steps 4–6) creates an
unpublished card row up-front so Section image upload and server-side draft save
are available from the first edit; the guarded publication RPC later promotes
that draft instead of double-inserting. See
`CHECKLIST.md` for current verification state.

### Invitation lifecycle (derived states)

There is deliberately **no customer-writable lifecycle column**. State is
derived from durable facts (`lib/types.ts#deriveCardLifecycle`):

| State | Derivation | Customer sees |
|---|---|---|
| **Editing** | related order not paid | editor, delete allowed |
| **Paid draft** | order paid, `manual_paid_draft = true`, card unpublished with a saved draft | editable paid draft, no guest URL |
| **Publishing** | legacy paid row not yet normalized, card unpublished, not a paid draft, latest audit action ≠ disabled | compatibility/status recovery only; no automatic publication |
| **Published** | order paid and `is_published = true` | guest-accessible `/i/[slug]`, metrics, share |
| **Unavailable** | order paid, card unpublished, latest audit action = `disabled` | recorded disable reason + support contact only |
| **Edit window** | first publication exists, card private, active non-expired administrator window | same slug shows only the safe edit notice; owner editor and append-only asset upload |
| **Edit window expired** | first publication exists, card private, active window deadline reached | same private notice; retained revision is locked until a new grant |
| **Retired** | a completed controlled-replacement cutover names this card as predecessor | terminal owner/admin lineage and reason; guest boundary is generic unavailable only |

Only the selected current Published publication is guest-accessible.
`cards.custom_data` stays the immutable first-publication snapshot: written once
by the owner publication transition. `card_publications` stores that row and
each later approved revision, while `cards.current_publication_id` is the sole
guest pointer. Every first sufficient payment creates the same private
paid-draft entitlement; Stripe and manual payments both keep `custom_data_draft`
for owner editing until the later publication workflow. An administrative
disable retains the original `published_at` and prevails over any window. A
pending controlled-replacement target is an owner-editable paid draft with a
separate grant entitlement: its owner may save and upload target-scoped assets,
but ordinary publication, payment/receipt flows, edit-window grants and
destructive lineage writes are rejected. Retired is terminal and cannot be
restored, edited, republished or deleted through ordinary paths.

**Strict first-publication precondition (migration 033, superseding the older
payment-transition body):** the promotion
`UPDATE` itself carries two same-row guards — `is_published = false` AND
`custom_data_draft is not null` — and copies only the live draft, with no
fallback to the previous snapshot (`CARD_NOT_PROMOTABLE` on a missing marker).
The owner publication endpoint retries a version conflict instead of publishing
stale content; payment webhook replay and owner status polling only normalize or
report a private paid draft and never publish it. A missing marker remains an
integrity/remediation failure, never permission to publish the old snapshot or
recreate draft state.
Successful first publication clears the marker in the same atomic update.
During an active window the draft-save RPC targets `revision_draft` and repeats
the exact-window, current-pointer and database-expiry guards; late saves,
uploads or publication against an expired/superseded window match no row (the
route maps that to HTTP 409) and cannot reopen or replay publication. A new
admin grant preserves unsent edits but is separately audited.

---

## Frontend: Key Components

| Component | File | Type | Purpose |
|---|---|---|---|
| `KamyLogo` | `components/KamyLogo.tsx` | Server-safe | Brand logo |
| `Navbar` | `components/Navbar.tsx` | Server | Sticky nav with auth-aware links |
| `Footer` | `components/Footer.tsx` | Server | Footer links |
| `CopyLinkButton` | `components/CopyLinkButton.tsx` | Client | Copies `/i/[slug]` URL |
| `SupportContactDialog` | `components/SupportContactDialog.tsx` | Client | Shared semantic-token dialog for the configured customer support email and WhatsApp links. Dashboard unavailable rows use it as their primary action; expired edit-window rows use it as the outlined secondary beneath an available `Mohon Suntingan` request, or as the filled primary while that request is pending. |
| `InvitationDetailsDialog` | `components/InvitationDetailsDialog.tsx` | Client | Shared semantic-token `Butiran` dialog for the full customer-safe invitation context: long event name, lifecycle/deadline detail, availability and replacement reasons, Mohon Suntingan outcome/reason, and manual-payment detail. It receives the already-authorized dashboard projection and adds no mutation surface. |
| `InvitationCard` | `components/InvitationCard.tsx` | Client | Dispatch shell. Section-v2 -> `SectionInvitationCard`; legacy -> `LegacyInvitationCard` (defined in same file). Customer image fields are normalized to the protected asset endpoint before either renderer receives them. Guest callers receive only the selected immutable publication snapshot. |
| `SectionInvitationCard` | `components/SectionInvitationCard.tsx` | Client | Renders ordered enabled Section instances through `lib/sections/registry.ts`. Before rendering Foto Hero, Minimalis, or Kinetik, `lib/sections/normalize-section-for-render.ts` copies compatible legacy Landing fields into missing current fields without changing stored data. `lib/card-assets.ts` maps Landing, Child Info, Speakers, Gallery, Love Story and Gaya background image references to the current card-scoped endpoint, preserves only approved public static/template paths, and blanks unknown URLs. Exposes `window.__KAMY_CARD_ID__` so the RSVP Section can POST without prop-drilling; wishes realtime includes the current publication id. |
| `SectionEditor` | `components/SectionEditor.tsx` | Client | Three-pane Section editor: sidebar (dnd-kit sortable, status dots, toggle/remove, + Add Section picker) / center (schema-driven generic form with per-Section `customForm` slot + Variant gallery + image upload) / right (phone-frame inline Live preview). Draft saves carry and advance `draft_version`; versioned localStorage recovery uses `lib/section-editor-cache.ts` and restores only structurally valid data at the loaded version. The paid-draft state and administrator-approved revision state each add an accessible publication acknowledgement dialog, serialized final save, conflict/retry state, and a post-commit public-link result. Active revision windows show the database deadline; expiry locks save/upload/publication and directs the owner to support. |
| `SectionEditorTour` | `components/SectionEditorTour.tsx` | Client | Five-step desktop / six-step mobile Malay guided tour of the Section editor, with a step list per viewport selected on the shared `useIsDesktopViewport()` signal. Desktop (>=1024px) walks the Section sidebar, Sub-form, Live preview pane, Save indicator, and Continue to payment button; the canvas-first mobile shell walks the Live card canvas, Form sheet, Sheet detent control, Navigation rail, the Section stack screen (Susun Bahagian, with an animated reorder hint arrow at the first row's drag handle), and the same Continue to payment button, with autosave folded into the Form sheet step. Each mobile step declares the pane it describes, so the tour may drive one piece of ephemeral shell state — `mobilePane` — only through the editor-owned `onRequestPane` callback (`setMobilePane`), reconciling to the step's pane and restoring the pane the customer started on whenever a step needs no particular pane and at every exit (Seterusnya, Kembali, ×, Escape, completion); it never reaches into the DOM and never touches `sheetDetent`, `activeIdx`, or draft data. Auto-launches once per account from the server-provided completion flag; finish/dismiss persist through `app/actions/editor-help.ts` only, and both viewports share the one account-level marker. Holds ephemeral open/step/highlight state — no draft data, no localStorage writes. Desktop placement: its fixed overlay stacks above the 58px sticky Navbar (z-index 120 vs 100); measured panel height selects a fitting side and clamps the complete panel below the Navbar and inside the viewport. Mobile placement: the Navbar is hidden, so the minimum top is the gutter, the panel is full-bleed minus that gutter, the bottom clamp reserves the 76px navigation rail plus the gutter, `--kb-inset` is respected, and the panel sits opposite its target; a target not yet present during a pane switch falls back to a centred panel with no highlight ring. Only the panel body scrolls on short viewports. |
| `CardRenderer` | `components/CardRenderer.tsx` | Server-safe | Owner/admin bare preview shell. Passes card identity so Section-v2 and legacy renderers use the protected asset endpoint; public template/showcase demos remain static and separate. |
| `ImageUploadField` | `components/sections/_image_upload.tsx` | Client | Owner-scoped browser Storage insert to the private `card-assets` bucket using Storage RLS plus bounded MIME/size checks, UUID filenames, `upsert=false`, and stable app references; it is not a card-mutation RPC. |
| `MalayWeddingCard` | `components/card-previews/MalayWeddingCard.tsx` | Client | Rich legacy preview component |
| `ChineseWeddingCard` | `components/card-previews/ChineseWeddingCard.tsx` | Client | Rich legacy preview component |
| `GeneralWeddingCard` | `components/card-previews/GeneralWeddingCard.tsx` | Client | Rich legacy preview component |

### Theme and style controls

The site shell and an invitation card have separate control surfaces:

- **Site/app chrome:** `app/globals.css` owns the `:root` colour tokens used by
  navigation, forms, dashboards, gallery, and editor UI. Its Tailwind v4
  `@theme inline` block maps those tokens (and the default sans/display/mono
  fonts) to utilities. It also sets the global body background, foreground and
  font, the default border colour, and static phone-preview scrollbar and
  gallery-showcase focus/hover/reduced-motion rules. These values style the app
  and its preview frame; they do **not** dynamically re-theme invitation content.
- **Invitation cards:** a Section-v2 template/default stores `theme` alongside
  `sections`; the resulting card carries that payload and the editor changes
  `data.theme`. Section renderers resolve it with `colorsFor()` and `fontFor()`
  in `lib/sections/theme.ts`. Curated choices and their literal palette/font
  payloads live in `THEME_PRESETS` in `lib/themes/presets.ts`; see
  `docs/TEMPLATE_GAYA.md` for the Gaya catalogue and editor behavior.

Theme resolution is intentionally backward compatible. A preset's inline
`theme.colors` wins over its legacy named `theme.palette`. The six named
palettes resolve in `lib/sections/theme.ts`, with unknown named values falling
back to `plum_gold`. `fontFor()` turns a registered CSS-variable name into a
font family with a generic `serif`, `sans-serif`, or `cursive` fallback; an
absent optional font slot returns no override so the renderer/CSS fallback can
apply. `DEFAULT_THEME` is the legacy/default baseline (`amber_rose`, Playfair,
Jakarta, Great Vibes, fade, and a solid amber background), not a global site
setting.

#### Fonts

`app/layout.tsx` registers these Google Fonts through `next/font/google`:

- `Cormorant_Garamond` -> `--font-cormorant`
- `Plus_Jakarta_Sans` -> `--font-jakarta`
- `Playfair_Display` -> `--font-playfair`
- `Great_Vibes` -> `--font-great-vibes`
- `Geist_Mono` -> `--font-geist-mono`
- `Cinzel` -> `--font-cinzel`
- `Fraunces` -> `--font-fraunces`
- `Dancing_Script` -> `--font-dancing`
- `Caveat` -> `--font-caveat`
- `Amatic_SC` -> `--font-amatic`
- `Bodoni_Moda` -> `--font-bodoni`

The root `<html>` class assigns every variable (plus `h-full antialiased`), so
Gaya presets may reference them throughout the card tree. The legacy
`components/card-previews/ChineseWeddingCard.tsx` is a localized exception: it
loads `Ma_Shan_Zheng` and `Noto_Serif_SC` in component-scoped CSS rather than
registering them globally.

#### Intentional hard-coded boundaries

These literals are baselines or bounded rendering exceptions, not
user-editable site-theme controls:

- the root site tokens and static phone-preview/showcase interaction styles in
  `app/globals.css`, plus the browser viewport `themeColor` in `app/layout.tsx`;
- the six named palette literals and `DEFAULT_THEME` in
  `lib/sections/theme.ts`, and each curated preset's palette/font/background
  literals in `lib/themes/presets.ts`;
- the editor's fixed fallback Gaya swatch when no preset is active;
- component-scoped Chinese typography and other legacy card styling; and
- deliberately self-themed RSVP variants, which use their cultural signature
  unless that Section's `inheritTheme` (`Padankan warna kad`) setting is enabled.

---

## Storage: Supabase Storage

- Bucket: `card-assets` is private. Browser roles have no
  `storage.objects` SELECT path for this bucket; the scoped restrictive
  policy leaves unrelated buckets subject to their existing policies. The
  only customer-image byte reader is
  `GET /api/card-assets/[cardId]/[...assetPath]`.
- New Section-v2 upload path: `<cardId>/<sectionType>/<UUID>.<ext>`.
  `ImageUploadField` stores the stable app reference
  `/api/card-assets/<cardId>/<sectionType>/<file>`, not a public or expiring
  URL. The database bucket limit is 5 MB and allows JPEG, PNG, WebP and GIF.
- Legacy cover objects remain at `covers/<user_id>/<old-file>.<ext>`; the
  protected route accepts them only when the URL has the exact configured
  Supabase origin, the path belongs to the card owner, and the current draft or
  published snapshot references that exact object. This exact-reference rule
  prevents same-owner cross-card probing; unreferenced legacy covers remain in
  Storage but are unavailable through the new route after cutover. Existing raw
  public URL snapshots are normalized in memory; immutable snapshots and
  objects are not rewritten or moved.
- A draft card row is created pre-payment (`createDraftCardAction`), so Section
  image upload is available from the first edit, before checkout. Migrations
  033–037 keep the owner/path/type boundary available while an unpaid card or
  the one unpublished paid draft is being edited, including during manual
  review; migration 038 adds only append-only new UUID uploads during an
  active, unexpired revision window. The guarded RPC checks the database clock
  on every upload; expired, Published-without-window and Unavailable cards
  cannot receive new assets.
- The route authenticates every request. Owner/admin reads are card-scoped;
  guest reads require paid + `is_published = true`, a valid
  `current_publication_id`, and an exact match in that immutable publication's
  snapshot. Orphan, draft-only, superseded, cross-card, malformed, traversal
  and unknown-origin values return 404. Responses stream allowlisted image
  bytes with `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and
  no redirect, CDN, optimizer or signed-URL step.
- The editor uses only owner `insert` uploads with `upsert=false`. Clearing an
  image reference does not delete its private bytes. Migrations 034, 038 and
  042 keep update/delete append-only before first publication, while 038/042
  allow only a new UUID upload during a valid, publication-backed edit window.
  The 042 repair also restores path/MIME/current-publication checks and keeps
  pending replacement targets in the never-published branch; expired,
  disabled and historical objects cannot be overwritten or deleted. The
  browser Storage SDK may return a no-op for an RLS-denied delete, so the
  integration check verifies the historical bytes remain unchanged.
- Controlled replacement copies are never broad card-to-card reads. The server
  resolves each referenced predecessor object against the frozen source
  publication, records its SHA-256/size/MIME and writes a same-relative-path
  object under the replacement card's UUID. Target references are remapped to
  that target UUID; source objects and snapshots remain unchanged. Copy rows are
  idempotent (`pending` → `ready`), ready rows cannot be overwritten, and
  preparation binds readiness to the exact target draft version. The pending
  target owner may insert additional target-scoped assets; once preparation
  exists, update/delete of copied target objects is denied so a retry cannot
  publish a newer or unrelated byte.

---

## Database Tables

```
users           id, email, name, phone, role,
                section_editor_tour_completed_at, created_at
payment_support_config       singleton id=true, version, email, whatsapp,
                             updated_by, updated_at
payment_support_contact_history append-only: id, config_version,
                             previous/new email and WhatsApp, operation, reason,
                             changed_by, changed_at
templates       id, name, category, thumbnail_url, config_schema, price_myr,
                is_active, type, theme, sections
orders          id, user_id, template_id, status, stripe_session_id, price_myr,
                custom_data, payment_method, payment_completed_at,
                manual_paid_draft,
                entitlement_source, replacement_grant_id,
                checkout_reservation_token, checkout_reserved_at,
                stripe_session_expires_at, created_at
cards           id, order_id, user_id, template_id, slug, custom_data,
                custom_data_draft, revision_draft, draft_version,
                last_activity_at, is_published, published_at,
                current_publication_id, active_edit_window_id, created_at
card_publication_actions append-only: id, card_id, owner_id, draft_version,
                exact acknowledgement, published_snapshot, created_at
card_edit_windows append-only: id, card_id, owner_id, administrator,
                bounded reason, granted/expires timestamps, request id
card_publications append-only: card/revision, immutable snapshot, source
                edit window, actor, acknowledgement, draft version, published_at
card_edit_activity append-only: owner save/publication actor, window, version,
                activity and timestamp
card_edit_requests append-only decision ledger: id, card/owner, stable
                submission id, bounded reason, status/decision, submitted
                publication/window/availability/draft generation, decision
                actor/reason/id/time and approved window pointer
card_availability_actions    append-only: id, card_id, admin_id,
                             action (disabled|restored), reason, created_at
card_replacement_grants     append-only direct lineage grant: predecessor /
                             replacement cards and orders/publication, owner,
                             administrator, request id, reason, granted_at
card_replacement_asset_copies source/target object path, source hash/size/MIME,
                             pending/ready state and copied-byte metadata
card_replacement_asset_preparations grant, source publication, exact target
                             draft version/hash/snapshot and prepared_at
card_replacement_cutovers   append-only atomic cutover: predecessor/replacement
                             cards/orders/publications, administrator, request,
                             reason, result and created_at
rsvp_responses  id, card_id, current publication_id, guest_name, guest_contact,
                attending, pax, message, created_at
duitnow_payment_slots        slot_number (1|2), version, enabled, label,
                             payee_name, provider, qr_image_url, instructions,
                             updated_at
duitnow_slot_history         append-only: slot_number, version, previous_config,
                             config, changed_by, changed_at
duitnow_transfer_submissions append-only: id, order_id, user_id, slot_number,
                             slot_version, slot_snapshot (frozen), amount_sen,
                             transfer_reference, draft_snapshot (frozen), created_at
duitnow_payment_reviews      append-only: id, submission_id (unique), order_id,
                             slot_version, transfer_reference,
                             outcome (confirmed|rejected), reviewer, note, created_at
manual_payment_attempts      append-only attempt lineage: id, order_id, user_id,
                             price_sen, method, frozen recipient/draft,
                             current_receipt_id, state, prior_attempt_id, created_at
payment_receipts              immutable receipt versions: id, attempt_id, version,
                             private object path, type, size, SHA-256, reference, created_at
manual_payment_reviews        append-only decision/correction ledger: receipt,
                             outcome, received/credited/remaining/excess sen,
                             reviewer, reason, private evidence metadata, timestamp
payment_receipt_access         mutable current/prior file access state
payment_receipt_events         immutable quarantine/removal tombstones
custom_orders   id, user_id, event_type, brief, contact_name, contact_phone,
                contact_email, budget_band, reference_links, status,
                admin_notes, created_at, updated_at
```

RLS policies are in `supabase/migrations/002_rls_policies.sql`. The service-role
admin client bypasses RLS, so handlers using it must perform auth and ownership
checks before mutation.

### Migrations

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Core tables and initial 5 template rows |
| `supabase/migrations/002_rls_policies.sql` | Row Level Security policies |
| `supabase/migrations/003_seed_templates.sql` | Seeds 8 template ids and prices |
| `supabase/migrations/004_template_v2_schema.sql` | Adds `templates.type`, `templates.theme`, `templates.sections`, and `cards.custom_data_draft` |
| `supabase/migrations/005_seed_template_v2_presets.sql` | Seeds `malay-wedding-v2` (`wedding_malay`) and `general-wedding` (`wedding_general`) v2 presets |
| `supabase/migrations/006_seed_tier2_tier3_presets.sql` | Seeds Tier-2 (`open-house-raya`, `engagement-malay`, `aqiqah`, `anniversary`, `baby-shower`) + Tier-3 (`corporate-dinner`) v2 presets |
| `supabase/migrations/007_custom_orders.sql` | Adds `custom_orders` table with a text status `CHECK` constraint, admin notes, updated-at trigger, and RLS for owner-read / admin-manage |
| `supabase/migrations/008_seed_chinese_v2_and_tier3.sql` | Promotes chinese-wedding-v2 to a Section-v2 preset and completes catalogue seeds |
| `supabase/migrations/009_port_legacy_templates_to_v2.sql` | Ports all original legacy templates to Section-v2 (every active template is v2 after this) |
| `supabase/migrations/010_storage_policies_card_assets.sql` | Broad storage policies for the manually created public `card-assets` bucket |
| `supabase/migrations/011_rsvp_themed_variants.sql` | Idempotently switches each template's RSVP section to its occasion-fitting themed variant |
| `supabase/migrations/012_template_gaya_defaults.sql` | Gives every Section-v2 template a default Gaya preset in its `theme` |
| `supabase/migrations/013_seed_sakura_story_template.sql` | Seeds the Sakura Story v2 template |
| `supabase/migrations/014_seed_celestial_story_template.sql` | Seeds the Celestial Story dark v2 template |
| `supabase/migrations/015_seed_cinema_story_template.sql` | Seeds the Cinema Story film-premiere v2 template |
| `supabase/migrations/016_security_hardening.sql` | Restricts direct table writes; replaces `card-assets` mutation policies with authenticated owner/unpublished-card policies plus 5 MB/MIME restrictions |
| `supabase/migrations/017_section_editor_tour_completion.sql` | Adds nullable `users.section_editor_tour_completed_at`: NULL = the account has never finished/dismissed the editor tour; a value = completion. Sole write surface is `app/actions/editor-help.ts` (service role). |
| `supabase/migrations/018_lifecycle_availability.sql` | Lifecycle: append-only `card_availability_actions` audit table (owner/admin read RLS, service-role-only writes, nonblank-reason CHECK for disables); transactional RPCs `finalize_paid_order`, `update_card_draft_if_editing`, `delete_card_if_editing`, `set_card_availability` (service_role execute only); revised `card-assets` mutation policies initially require the owner card's order to remain unpaid (migration 033 extends them to the private paid-draft state) |
| `supabase/migrations/019_lifecycle_integrity.sql` | Integrity hardening (replaces only migration 018's `finalize_paid_order` and `update_card_draft_if_editing` bodies): both mutations carry same-row guards — `is_published = false` AND `custom_data_draft is not null` — so a first publication can promote only a live draft marker with no fallback to the old snapshot (`CARD_NOT_PROMOTABLE` on a missing marker), and stale draft autosaves can never recreate the cleared marker; migration 033 supersedes the old payment-publication body; grants restated as service_role-execute-only |
| `supabase/migrations/020_checkout_lifecycle_integrity.sql` | Adds one-card/one-Session constraints and service-role-only atomic draft, reservation, attachment, Stripe-confirmed release, legacy payment-recording, and guarded-deletion RPCs. Reservations lock order then card, protect ambiguous Stripe creates, and are not lifecycle states; paid-and-public RLS replaces anonymous public-looking-card reads. Migration 027 routes the legacy payment-recording wrapper through shared completion; migration 033 later separates payment from owner publication. |
| `supabase/migrations/021_duitnow_payments.sql` | DuitNow purchase flow: orders winning-payment metadata, two seeded slots, append-only slot history / transfer submissions / payment reviews, RLS+ACL lockdown, immutability/draft-lock/paid-card/publication triggers, and security-definer RPCs (`admin_update_duitnow_slot`, `submit_duitnow_transfer`, `admin_review_duitnow_submission`, shared `complete_order_payment`) |
| `supabase/migrations/022_duitnow_pending_review_card_guard.sql` | Initial pending-review fulfillment-card guard, later superseded by migration 026's final immutable-payment-audit deletion protection after any submission. |
| `supabase/migrations/023_payment_lifecycle_integration.sql` | Allows lifecycle recovery and recorded administrator availability actions through the payment publication guard while retaining order-then-card locks. |
| `supabase/migrations/024_duitnow_slot_acl_hardening.sql` | Revokes direct service-role DML on DuitNow slots and immutable payment/audit tables, retaining only trusted reads and `admin_update_duitnow_slot` execute access. The owned security-definer RPC remains the only slot writer; ACLs, not caller-set session settings, enforce that boundary. |
| `supabase/migrations/025_duitnow_audit_actors.sql` | Replaces the slot-update and manual-review RPC signatures with actor-aware, admin-validated versions. The authenticated administrator ID is written to immutable `changed_by` / `reviewer` audit fields, and the unauditable signatures are removed. |
| `supabase/migrations/026_duitnow_audit_delete_protection.sql` | Replaces payment-audit cascades with restrictive foreign keys and guards order/card deletion once an immutable transfer submission exists, including after rejection. |
| `supabase/migrations/027_payment_completion_reference_integrity.sql` | Routes the legacy Stripe payment-recording wrapper through `complete_order_payment` so it cannot mark an order paid without the shared completion/winner guards, and enforces the shared trimmed 3–64-character printable DuitNow transfer-reference format in both the submission RPC and table CHECK. Migration 033 later makes that completion a private paid-draft transition and reserves publication for the owner endpoint. |
| `supabase/migrations/028_checkout_duitnow_exclusivity.sql` | Makes method exclusion symmetric: the locked submission RPC rejects every remaining Checkout reservation/binding, and reservation/attachment reject any unreviewed DuitNow submission. Payment completion retains only a Stripe winner's Session identity and clears a DuitNow winner's guard; migration 029 further restricts fallback to orders without confirmed manual amounts. |
| `supabase/migrations/029_manual_payment_receipts.sql` | Private customer receipt Storage, attempts/versions/reviews/tombstones, separate Touch ’n Go configuration, receipt validation and extended Stripe exclusion. |
| `supabase/migrations/030_payment_qr_settings.sql` | Private merchant QR Storage, administrator QR configuration/history and safe Bank/Touch ’n Go QR settings. |
| `supabase/migrations/031_manual_payment_review.sql` | Adds the `manual_paid_draft` entitlement, attempt lineage, five-outcome append-only review/correction ledger, private administrator evidence Storage, one-row-per-attempt queue, total allocation and manual-review lifecycle guards. Manual review never calls Stripe publication. |
| `supabase/migrations/032_payment_support_contacts.sql` | Creates the singleton administrator support-contact config and immutable history. Browser table access and direct writes are revoked; `update_payment_support_config` is a locked, service-role-only, admin-checked RPC with email/WhatsApp/reason validation, optimistic version checks, no-op handling, and audited restore/change writes. |
| `supabase/migrations/033_paid_draft_publication.sql` | Makes every first sufficient payment (Stripe, Bank DuitNow, Touch ’n Go) create one private paid-draft entitlement; adds versioned draft saves and customer activity, exact owner publication acknowledgement/audit, fixed-template and published-snapshot guards, legacy paid-row normalization, paid-draft asset access, and service-only lifecycle RPCs. Payment/status recovery never publishes; only `publish_paid_draft` promotes the latest saved draft. |
| `supabase/migrations/034_never_published_card_assets.sql` | Corrects every `card-assets` owner `USING` / `WITH CHECK` boundary to require the card is both unpublished and never published (`published_at IS NULL`), preserving legitimate unpaid/paid-draft writes while keeping published and administratively unavailable snapshots immutable. |
| `supabase/migrations/035_separate_invitation_review_editing.sql` | Replaces only the legacy and receipt-based card-trigger draft locks so the owner can edit the live unpublished invitation during manual review and top-up; preserves publication, payment handoff/concurrency, template, paid-card and immutable-audit deletion guards. |
| `supabase/migrations/036_private_card_assets.sql` | Makes `card-assets` private, removes its public/anonymous browser object reads and broad legacy policies without globally restricting unrelated buckets, retains owner-only never-published draft uploads with safe path/MIME/size bounds, and preserves old objects for protected compatibility rendering. |
| `supabase/migrations/037_scope_card_assets_select_policy.sql` | Corrects already-applied 036 installations whose restrictive SELECT predicate was unscoped; changes only the `card-assets` policy to `USING (bucket_id <> 'card-assets')`, preserving unrelated bucket SELECT/list policy behavior. |
| `supabase/migrations/038_approved_edit_windows.sql` | Adds administrator-audited seven-day post-publication edit windows, immutable publication revisions and one current-publication pointer; guards owner save/upload/republication by DB-clock expiry/version, keeps first snapshot/payment/template facts immutable, scopes RSVP/realtime/assets to the current publication, and makes missing/corrupt state fail closed. |
| `supabase/migrations/039_approved_edit_window_repairs.sql` | Allows ordinary unpaid draft deletion to cascade only non-payment edit activity, advances `draft_version` on every fresh grant/reopen, serializes RSVP pointer validation with card transitions, and makes first-publication retries unavailable-safe and stale-intent-safe. |
| `supabase/migrations/040_controlled_replacements.sql` | Adds administrator-only controlled replacement grants, explicit grant-only order entitlement, target-scoped asset copy/readiness/preparation records, atomic deterministic-lock cutover and terminal Retired derivation; keeps pending targets owner-editable while rejecting ordinary payment/publication/edit-window/destructive lineage paths and makes retired guest boundaries generic. |
| `supabase/migrations/041_card_edit_requests.sql` | Adds one-pending-per-invitation Mohon Suntingan requests for Published and expired revision windows; binds each request to publication/window/availability/draft generation, exposes owner/admin read RLS, keeps all mutation service-role-only, resolves changed targets to terminal stale, and delegates approval to the guarded seven-day `open_card_edit_window` RPC under order-then-card locks. |
| `supabase/migrations/042_controlled_replacement_repairs.sql` | Repairs the applied replacement boundary without rewriting 040: restores append-only owner Storage guards and MIME/current-publication checks, permits only pending-predecessor disable, binds grant creation to the reviewed source publication, and exposes the versioned cutover contract. |
| `supabase/migrations/043_card_edit_request_review_repairs.sql` | Repairs approval operation-id replay after the controlled replacement guards: rejects IDs already used by another request/window and verifies that a non-replayed grant is the card's new active future window before recording approval. |

## Security Notes

- `NEXT_PUBLIC_*` vars are browser-visible. Only put public values there.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `RESEND_API_KEY` must never reach client code or Git history.
- Customer invitation image bytes are private Storage content. Browser roles have
  no direct `card-assets` SELECT/list/signed-URL path; the application endpoint
  performs the owner/admin or frozen-snapshot check on every request.
- Controlled-replacement target images stay under the target card UUID and are
  authorized by the same owner/card boundary. A retired predecessor is checked
  before any snapshot, profile, asset, RSVP or realtime lookup, so its guest URL
  can return only the generic unavailable/not-found surface. Grant-only orders
  never enter payment receipts, payment-confirmation metadata, revenue counts
  or payment email flows.
- `payment-receipts` and `payment-review-evidence` are a separate immutable
  payment-evidence boundary. The existing authenticated `readReceipt` route and
  administrator evidence control render historical files; migration 036 does
  not rewrite, expose, or remap those objects. A historical card image with an
  unknown origin/path is intentionally blanked rather than granted a broad
  compatibility fetch.
- Stripe Checkout is used so the app never handles raw card numbers.
- `proxy.ts` is a coarse redirect layer. Server Actions and Route Handlers must
  still verify auth/ownership/admin role themselves.
- Do not commit `.env*`, `.next`, `node_modules`, archives, or generated caches.

## Receipt storage, retention and failure recovery

`payment-receipts` is private with a 5 MB bucket limit and PDF/JPEG/PNG/WebP allowlist. Migration 029 installs a restrictive Storage policy excluding this bucket from every browser operation, including any broad permissive policy. Only the server uploads/streams/removes objects, after explicit authorization. Paths are `<order UUID>/<upload UUID>/<SHA-256>`; no customer names occur in paths. File framing validation is not malware scanning; suspicious content can be quarantined. Migration 031 adds a separate private `payment-review-evidence` bucket with the same bounded formats for administrator-only insufficient-payment evidence; it is never included in the customer status projection.

Current and prior content is retained indefinitely in the first release. No customer deletion or automatic purge exists. A privacy request is handled by authorized administrators under the harmful-file/legal/operational removal policy. Removing content never removes D18 records. Upload can succeed in Storage while its database transaction fails: the private unreferenced object is inaccessible to users, and retrying the same file/operation can finish attachment. Do not delete ambiguous uploads during retry. Operational cleanup of unreferenced objects requires administrator investigation; attached files must use the reasoned tombstone action.

Migrations `029_manual_payment_receipts.sql` and `031_manual_payment_review.sql` add:

| Table | Purpose |
|---|---|
| `manual_payment_attempts` | Owned order/price/method/frozen recipient and draft; current receipt pointer, prior-attempt lineage and mutable review state |
| `payment_receipts` | Immutable receipt ID, attempt, version, private path, content type, size, SHA-256, optional reference, timestamp |
| `manual_payment_reviews` | Append-only confirmed/insufficient/rejected/duplicate decision and correction rows with received, credited, remaining and excess sen, reason, reviewer and evidence metadata |
| `manual_payment_queue` | Service-role-only one-row-per-attempt projection for the newest-first administrator queue and five filters |
| `payment-review-evidence` (Storage) | Private administrator evidence file; server action creates an opaque path and signed short-lived admin link only |
| `payment_receipt_access` | Separate mutable available/quarantined/removing/removed state |
| `payment_receipt_events` | Immutable reasoned quarantine/removal intent/completion tombstones |
| `tng_payment_config` | One separate Touch ’n Go recipient/QR configuration; version frozen into attempts |

All manual-payment tables have RLS enabled and no browser grants. Service-role DML is revoked; guarded security-definer functions are the only writers. Immutable metadata tables reject updates/deletes; review corrections append instead of mutating prior decisions. Receipt foreign keys protect orders from deletion; card triggers protect fulfilment cards from deletion once payment evidence exists while migration 035 leaves the live unpublished draft owner-editable during submitted/insufficient/top-up review and after payment until publication. The customer status function exposes only current safe state. Existing completion, reservation and attachment functions are extended for Touch ’n Go, partial-payment exclusion and the paid-draft boundary. The support-contact singleton and history follow the same boundary: no browser reads, service-role-only SELECT/RPC access, an explicit admin check in the action and RPC, a `FOR UPDATE` singleton lock, optimistic version rejection, and an immutable indefinite audit trail. Customer loaders read only current sanitized values; they never read or return history.

## BB-managed local worktree lifecycle

The BB Worktree Setup plugin invokes the machine-local
`~/.bb-setup/kamy-jemput.sh` entry point for each new managed worktree. The
entry point installs the lockfile, derives a stable per-worktree Supabase project
and port block, applies the checkout's migrations, creates the local fixture
bucket, seeds the confirmed test accounts, and writes only the worktree's
connection values to `.env.local`. The entry point and its runtime wrapper live
outside the repository and plugin cache; no repository setup hook or Supabase
helper is required. Unmanaged directories do not participate in this lifecycle.

Generated state lives in ignored `.supabase-worktree/`, while the host-wide lock
and port reservations live under `~/.cache/kamy-worktree/`. Migrations are linked
to the checkout, so a new migration is applied on the next provisioning run. The
process never resets the database, uses a linked project, or migrates the shared
local stack. It also refreshes stale Docker supplementary groups through a
non-interactive same-user process when the account already belongs to the socket
group; it grants no new host permissions.

Provisioning creates the private `card-assets` bucket and applies migration 029
for the private `payment-receipts` bucket. Migrations 036 and 037 remove
browser/public `card-assets` object reads while preserving owner uploads. It
seeds `kamy@gmail.com` (customer) and
`kamy.admin@gmail.com` (administrator), both with password `123`, only in the
isolated local Auth database. Existing accounts are preserved on repeat runs;
hosted password rules and production migrations are unchanged. The Next process
uses the allocated app port, and Stripe forwarding must target that port.

The plugin writes an untracked `.bb-env-teardown.sh` into each managed worktree.
BB runs it when the final thread is archived or deleted, then removes the managed
directory. Teardown stops only that worktree's Supabase project and retains its
Docker volumes; it does not remove immutable data or purge storage. Branch
references may remain after directory removal and are cleaned separately after
checking that no work is needed. See `DEV_SETUP.md` for prerequisites and failure
handling.


## Payment choice, QR settings and support contacts (#69/#72 UI revision)

- `components/PaymentMethodDialog.tsx` is used by `SectionEditor` after draft save
  and by the checkout recovery page. Its Stripe action is rendered only when the
  server reports a configured Stripe key and opens Stripe-hosted Checkout;
  its QR action opens the dedicated owned QR page. A Stripe success return waits for
  confirmation without offering a second payment. Cancellation permits method selection.
- `/dashboard/checkout/[orderId]/qr/page.tsx` uses the owned checkout loader. The
  QR payment choice has exactly Bank and Touch ’n Go, with one displayed QR at a time.
  Bank uses slot 1. Historical slot 2 data and frozen receipts remain readable;
  new slot-2 uploads are rejected before Storage. Awaiting review hides the upload
  form behind an explicit replacement action; partial top-ups preserve the method.
- `/admin/settings` redirects to `/admin/settings/qr`. The enclosing administrator
  layout checks role. `settings/layout.tsx` provides the Settings navigation pane and
  Settings content pane. The navigation places QR and `/admin/settings/support` horizontally above the full-width content pane.
  `QrSettingsForm` edits Bank or Touch ’n Go using an image file input and preview;
  URL attachment forms have been removed. `SupportSettingsForm` at the support route
  edits optional email and WhatsApp values, shows the exact live customer-message
  sample, requires a bounded reason, displays the latest 100 rows from the
  indefinitely retained before/after history and prepares a previous value for
  audited restore. Its form stacks before the sample at narrower widths; settings
  categories stay in a horizontal row above the content at every screen size.
- `POST /api/admin/payment-qr` imports server/admin Supabase clients, `normalizePaymentQr` from `lib/payment-qr.ts`, which uses Sharp. It checks session/admin role before reading a bounded multipart body,
  accepts up to 5 MB of JPEG/PNG/WebP, decodes with a 16-million-pixel cap, and
  normalizes to metadata-free PNG. SHA-256 paths make identical uploads reusable.
  It persists through `admin_update_duitnow_slot` or `configure_tng`, passing the
  verified administrator. Identical setting writes are no-ops under database locks.
- `GET /api/payment-qr/[file]` uses the admin client to stream only hash-named PNGs
  from the private `payment-qr` bucket, intentionally public merchant artwork.
  It never reads `payment-receipts`. Browser bucket access is blocked; uploaded
  objects are retained for frozen payment snapshots and audit references.
  A failed config save may leave an unreferenced QR object; retries reuse it.
- Migration `030_payment_qr_settings.sql` creates the QR bucket and restrictive
  browser policy, adds immutable administrator-only `tng_config_history`
  (previous/current config, administrator, time), and updates config RPCs for safe
  relative artwork URLs and replay handling. Bank history remains in
  `duitnow_slot_history`; receipt D18 records are unchanged.
### Administrator workspace and sign-in routing

`app/(admin)/layout.tsx` retains its server session/role checks and renders
`AdminNav` with the signed-in email. The fixed desktop sidebar becomes a Radix
Dialog drawer on mobile. `admin.css` uses the shared site palette (logo-matched deep plum, warm cream, white and gold accents), Cormorant
Garamond headings and Plus Jakarta Sans interface text. It scopes controls in the
components cascade layer; `AdminNav` reuses `KamyLogo`. Global base styles in
`app/globals.css` give enabled buttons, links, disclosure and selection controls a
pointer cursor. Disabled controls remain unavailable; drag-handle utility cursors
can override the base rule. Customer Dashboard/gallery links remain
available for deliberate testing and assisted creation; they use existing owned
creation/payment flows. The redesign does not grant unpaid publication.

`AdminTable` provides combined search/status/category filters, 20-row client pages,
refresh, empty results and expandable details. On mobile, the selected details
open in a focused panel outside the horizontally scrollable table. `lib/admin-records.ts` is a pure
keyset-page loader used by invitations, orders, receipts and custom requests: descending
(created_at,id) through all pages, returning an error instead of partial data on a
failed query. Client-paged tables search their complete fetched list; the
server-paginated edit-request queue labels search as current-page-only and
carries its query through page navigation. New records appear on refresh. Administrator date and timestamp displays explicitly
use `Asia/Kuala_Lumpur` (UTC+8), independently of the server timezone. Timestamps use explicit 12-hour
English AM/PM labels; date-only lists retain their Malay date format.
`lib/auth/require-admin.ts` checks the session and RLS-readable administrator role
before each admin page uses the service client. The layout shares this request-cached
guard; data reads do not depend on layout rendering order.
Receipt state labels use the five manual outcomes: pending, insufficient, rejected,
confirmed and duplicate. The queue shows the stored price, received/credited/
remaining/excess totals and private evidence controls; duplicate correction is
append-only and requires a reason. A sufficient manual total opens one paid draft
without publication or refund automation. Stripe completion has the same paid-
draft boundary. Only the owner publication flow can make the latest saved draft
public, and administrator disable/restore remains a separate reasoned control.

Email/password login and the OAuth callback share `lib/auth/redirect.ts` to reject
external, malformed and authentication-loop redirect destinations. After successful
sign-in they read the current user's role via the RLS-aware client: administrators
default to `/admin`, customers to `/dashboard`. A valid explicit in-app destination
wins. Proxy login redirects preserve the original protected path and query. Customer
visits by an administrator are not forcibly redirected. Callback exchange failure
returns to login. No new auth endpoint or credentials are introduced.

QR configuration audit display moved from the payment list into Settings. Support
contact configuration is separate from QR artwork and does not change Terms, Privacy,
guest invitation contacts, generic unavailable-card support or administrator payment
screens. Both fields may be cleared; a missing or failed support read produces the
approved no-link fallback. The focused `npm run test:payment-support` suite covers
normalization, all four messages and links; its optional PostgreSQL audit/security
case runs when `PAYMENT_TEST_PGLITE` points to the local PGlite module.


### Administrator invitation phone preview

`/admin/cards/[id]` uses the shared `PhonePreview` frame around an iframe at
`/admin/cards/[id]/preview`. The new route lives in `(preview)` so it has the
bare root layout rather than administrator navigation. Proxy still protects the
`/admin` prefix, and the preview page independently calls `requireAdmin` before
reading `cards.custom_data_draft` / `custom_data` through the service client.
Draft data is never exposed through the public invitation route. `CardRenderer`
receives the same latest saved payload as the detail page, with no `cardId` or real
RSVP submission context. The iframe gives viewport units, responsive breakpoints
and scrolling their own mobile-sized context. No data is passed in the URL.

`PhonePreview` retains its 340×712 outer frame on desktop and preserves that
aspect ratio when available width is smaller. The admin frame is beside the review
controls on wide screens and above them on mobile; the editor retains its existing
phone/wide modes. This is a generic functional device frame, not an Apple-provided
marketing bezel or an iOS browser emulator.

Design reference: [Apple's product-image guidance](https://developer.apple.com/app-store/marketing/guidelines/)
recommends legible, accurately proportioned screen content; official product-bezel
assets are supplied for App Store marketing. The admin tool reuses its own frame.


### Shared app appearance and dashboard navigation

`app/globals.css` is the app color authority. Shared `Button`, `Badge` and
`Dialog` primitives use its semantic tokens across public, auth, customer and
admin surfaces. Email and Open Graph renderers use equivalent literal colors
because they do not load the app stylesheet. Invitation Gaya palettes remain
independent. `ConfirmationDialog` composes the shared Dialog and Button for
customer deletion and Section removal; pending actions guard dismissal.

`NavbarMenu` owns the responsive Account menu. Signed-in users open account
actions from the hamburger at every viewport width; desktop keeps primary
navigation inline, and mobile combines those links with the Akaun area.
Signed-out visitors keep their desktop login/register controls and the mobile
navigation menu. `LogoutButton` remains mounted during menu dismissal and
retains its existing browser Supabase sign-out and shared error-dialog flow.
Customer settings are a future destination; no settings route or account-data
read/write is introduced by this menu change.

The customer Card list presents compact invitation tiles with small phone
renders through `components/InvitationThumbnail.tsx`. At desktop widths, the
phone render remains above the summary and actions so the customer reads the
invitation as a preview followed by its next step; the narrow mobile layout
keeps its established smaller phone beside the information and actions. The
iframe uses the
existing owner-only saved-preview route; it does not publish data or enable
guest RSVP. `InvitationDetailsDialog` moves the full event name, customer-safe
reasons, replacement lineage, request outcomes and manual-payment detail into
an accessible `Butiran` surface. Published rows
expose RSVP, open and copy-link actions, with an eligible `Mohon Suntingan`
control in the secondary action area. An expired edit window keeps the
invitation private and locked while placing `Mohon Suntingan` as the filled
primary action and the shared `SupportContactDialog` as its outlined secondary
action. Once that request is pending, the request slot is replaced immediately
by the same Support contact dialog as the filled primary, with no empty action
row. Unavailable rows use the same dialog as their primary support action.
Non-Published tiles use the same two-row primary/secondary action tracks once
the gallery is wide enough for its two `290px` columns and `20px` gap; an empty
secondary track stays below the primary so lifecycle variants share a baseline.
The track collapses in the single-column layout. Published invitations keep
their separate guest-link and request row.
Published secondary action rows reserve their request-row height on desktop
when a pending request has no trigger, but collapse that empty space on the
narrow single-column layout. A failed owner query raises the route error state.
Upcoming invitations sort by their next valid date; past invitations by most
recent event, using the existing Kuala Lumpur date parser. The active edit
window is resolved by its exact stored pointer.

`dashboard/InvitationGallery.tsx` receives only group labels, search text and
server-rendered Card row slots from the owned dashboard loader. It filters
locally by invitation name, slug and displayed date, shows matching counts for
all three groups, and renders only the selected group's six-item page. The
filters and search stay below the Navbar while scrolling. Selection keeps
keyboard focus on the control and returns the result area to view without
anchor navigation. No new database write, route or service client is involved.

The RSVP dashboard uses the RLS-aware server client after owner verification.
It reads the exact `current_publication_id` snapshot for the current event name
and the invitation's responses across publications. Failed reads raise the
route error instead of showing zero guests. Shared cream/plum surfaces display
expected guests, attending/declining response counts and native guest-detail
disclosures with full contact/message values and Kuala Lumpur timestamps.
Sharing requires the published flag and a readable current publication.

`/admin/cards` calls `requireAdmin` before keyset-loading invitations with the
service client. The server derives lifecycle from order, availability, current
publication and active edit-window facts, then passes only summary cells to
`AdminTable`. Search covers invitation name, slug, identifier and owner. The
admin detail page retains its protected reads and writes; four native details
controls disclose payment/activity, access/editing, history and deletion.
`AdminNav` now links to this invitation list separately from Orders.

Administrator availability and edit-window changes invalidate the invitation
index; successful administrator deletion returns to /admin/cards and invalidates
the invitation/order lists. Legacy invitation gift reservations now use the shared
Dialog surface; the existing local reservation behavior is unchanged.

### Customer Mohon Suntingan request flow (issue #80)

1. `GET /dashboard` reads the signed-in owner's cards through the RLS-aware
   server client, then reads the owner's `card_edit_requests` rows. Published
   and `edit_window_expired` Card rows render the `Mohon Suntingan` Dialog. The
   Published trigger is an outlined secondary action below the guest-link row;
   an expired-window trigger is the filled primary action, with the shared
   `SupportContactDialog` beneath it; after submission, the pending request
   state keeps only Support contact as the filled primary. The form validates a trimmed reason at
   500 UTF-8 bytes and creates a stable request id before calling `POST
   /api/cards/[id]/edit-request`. A network retry keeps that id. The pending
   status reflects the current state: a Published invitation remains public
   and read-only, while an expired edit window remains private and locked; no
   window, deadline or publication pointer changes at submission.
2. The route authenticates the customer and passes the authenticated user id to
   the service-role-only `submit_card_edit_request` RPC. The RPC locks the
   related order, then Card row, checks owner/payment/availability/current
   publication/window eligibility and captures the publication id, active window
   id, latest availability action id and `draft_version`. A partial unique
   index permits one pending request per invitation. Same request ids return
   the original customer-safe result; a different pending intent returns a
   conflict. Published content remains the only guest-visible boundary.
3. `GET /admin` and the persistent `AdminNav` count pending rows. `GET
   /admin/edit-requests` loads the queue and owner/invitation context through
   the service client, applies the selected status in the database and exposes
   bounded URL pagination before local search/details. The search field is
   explicitly limited to the currently loaded page and its query is preserved
   when navigating pages. The review control offers `Luluskan 7 hari` or a
   rejection Dialog requiring a bounded customer-readable reason. It never
   sends email, WhatsApp or another external notification.
4. `POST /api/admin/edit-requests/[id]/decision` authenticates the administrator
   and calls `review_card_edit_request`. The RPC discovers the related Card
   without locking the request, then locks order, Card row and request row in
   that order. It rechecks ownership, paid state, latest availability action,
   current publication, active-window expiry and captured draft generation.
   Disable/restore, republication, direct grant, retirement, replacement or
   any later lifecycle mismatch resolves the row to terminal `stale` with a
   safe reason. Stale is not a grant and frees the pending slot.
5. Rejection records the decision id, admin actor, bounded customer-readable
   reason and DB decision time without changing the invitation. Approval calls
   the stable `open_card_edit_window` RPC with the decision id under the same
   order-then-Card lock order, then records the resulting window on the request
   in the same transaction. The existing guarded RPC performs the privacy flip
   and seven-day DB-clock deadline. If it fails or the request update cannot
   commit, the transaction rolls back both window and decision. An exact
   decision retry returns the recorded result; it never opens a second window
   or extends the original deadline. RLS permits owner/admin reads and ACLs
   plus the trigger/RPC capability make all table writes service-only.

The combined #75/#80 local acceptance command
`npm run test:controlled-replacement-edit-requests:local` runs the SQL lifecycle
regression and a two-connection approval-versus-cutover race. With the local
app URL supplied, it also checks retired predecessor upload, guest
HTML/metadata/OG, asset and RSVP boundaries. Fixture writes stay in the
managed local Supabase project and the SQL acceptance transaction rolls back
its durable rows.
