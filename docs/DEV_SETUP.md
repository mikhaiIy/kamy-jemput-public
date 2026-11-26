# Dev Setup Guide — kamy jemput

Step-by-step for getting the project running locally and testing the full customer flow.

---

## Part 1 — First Time Setup

### 1. Clone the repo

```sh
git clone <repo-url>
cd kamy-jemput
```

### 2. Install dependencies

```sh
npm install
```

### 3. Create your `.env.local` file

Create a file called `.env.local` in the project root (never commit this file — it's gitignored).

```
# Supabase — get from: https://supabase.com/dashboard/project/oxgpzxlambsonlsawxij/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://oxgpzxlambsonlsawxij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste anon/public key here — starts with eyJ...>
SUPABASE_SERVICE_ROLE_KEY=<paste service_role key here — starts with eyJ...>

# Stripe — get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=<paste sk_test_... key here>
STRIPE_WEBHOOK_SECRET=<leave blank for now — see Part 2>

# Resend — get from: https://resend.com/api-keys
RESEND_API_KEY=<paste re_... key here>
FROM_EMAIL=onboarding@resend.dev

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Ask Mikhail for the Supabase and Stripe keys** — you share the same project and test account. Only the `STRIPE_WEBHOOK_SECRET` will be different for each of you.

### 4. Run the DB migrations (on every new target project)

Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/oxgpzxlambsonlsawxij/editor) and run any migration that has not already been applied on **that** project, strictly in numeric order (migrations are append-only; never re-order or edit applied files):

1. `supabase/migrations/001_initial_schema.sql` — core tables (`users`, `templates`, `orders`, `cards`, `rsvp_responses`) and initial 5 template rows.
2. `supabase/migrations/002_rls_policies.sql` — Row Level Security policies for user-owned data.
3. `supabase/migrations/003_seed_templates.sql` — seeds the 8 template ids and prices.
4. `supabase/migrations/004_template_v2_schema.sql` — adds `templates.type`, `templates.theme`, `templates.sections`, and `cards.custom_data_draft`.
5. `supabase/migrations/005_seed_template_v2_presets.sql` — seeds the first Section-v2 Malay wedding preset (`malay-wedding-v2`) and the general-wedding preset.
6. `supabase/migrations/006_seed_tier2_tier3_presets.sql` — seeds Tier-2 (raya, engagement, aqiqah, anniversary, baby-shower) + Tier-3 (corporate-dinner) v2 presets.
7. `supabase/migrations/007_custom_orders.sql` — adds the `custom_orders` table with a status check constraint, admin notes, RLS, and an updated-at trigger.
8. `supabase/migrations/008_seed_chinese_v2_and_tier3.sql` — promotes chinese-wedding-v2 to a real Section-v2 preset and completes the catalog seeds.
9. `supabase/migrations/009_port_legacy_templates_to_v2.sql` — ports the 5 original templates to Section-v2 so every active template is v2.
10. **Create the private `card-assets` Storage bucket first** (Dashboard → Storage → New bucket, name `card-assets`, private). No migration creates it: `010` and `016` add the legacy policies on top of an existing bucket, and `036` completes the private cutover, so Section image upload fails until it exists.
11. `supabase/migrations/010_storage_policies_card_assets.sql` — storage RLS policies for `card-assets` (requires step 10's bucket).
12. `supabase/migrations/011_rsvp_themed_variants.sql` — switches each template's RSVP section to the themed variant that fits the occasion (idempotent).
13. `supabase/migrations/012_template_gaya_defaults.sql` — gives every Section-v2 template a default Gaya (style preset) in its `theme`.
14. `supabase/migrations/013_seed_sakura_story_template.sql` — seeds the "Sakura Story" Section-v2 template.
15. `supabase/migrations/014_seed_celestial_story_template.sql` — seeds the "Celestial Story" dark Section-v2 template.
16. `supabase/migrations/015_seed_cinema_story_template.sql` — seeds the "Cinema Story" film-premiere Section-v2 template.
17. `supabase/migrations/016_security_hardening.sql` — restricts direct table writes and replaces `card-assets` mutation policies with authenticated owner/unpublished-card policies plus 5 MB file-size and MIME-type restrictions.
18. `supabase/migrations/017_section_editor_tour_completion.sql` — adds the nullable `users.section_editor_tour_completed_at` marker for the Section editor tour (NULL = never completed; the server action in `app/actions/editor-help.ts` is the sole write surface).
19. `supabase/migrations/018_lifecycle_availability.sql` — adds the administrator availability audit and lifecycle functions.
20. `supabase/migrations/019_lifecycle_integrity.sql` — adds strict publication and draft-save guards.
21. `supabase/migrations/020_checkout_lifecycle_integrity.sql` — adds durable Stripe Checkout reservations and lifecycle integrity functions.
22. `supabase/migrations/021_duitnow_payments.sql` — DuitNow purchase flow: adds `orders.payment_method` / `payment_completed_at`, creates the two seeded slots, the append-only slot-history / transfer-submission / payment-review tables, lifecycle triggers, and the security-definer RPCs (`admin_update_duitnow_slot`, `submit_duitnow_transfer`, `admin_review_duitnow_submission`, `complete_order_payment`).
23. `supabase/migrations/022_duitnow_pending_review_card_guard.sql` — prevents deletion of a fulfillment card while its DuitNow submission awaits review.
24. `supabase/migrations/023_payment_lifecycle_integration.sql` — integrates guarded payment/lifecycle recovery with administrator availability changes.
25. `supabase/migrations/024_duitnow_slot_acl_hardening.sql` — revokes direct service-role DML on DuitNow slots and immutable payment/audit tables. Trusted server reads and execution of owned security-definer RPCs remain available; the boundary is ACL-based, never a caller-set session/GUC bypass.
26. `supabase/migrations/025_duitnow_audit_actors.sql` — replaces the slot-update and review RPC signatures so the Server Action's authenticated administrator ID is revalidated and persisted as the immutable slot-change/review actor.
27. `supabase/migrations/026_duitnow_audit_delete_protection.sql` — replaces cascading payment-audit foreign keys with restrictive ones and prevents deletion of an order or fulfillment card once an immutable transfer submission exists, including after rejection.
28. `supabase/migrations/027_payment_completion_reference_integrity.sql` — routes the legacy Stripe payment-recording wrapper through the atomic payment-completion transition and applies the shared trimmed printable transfer-reference validation in both the DuitNow submission RPC and database CHECK.
29. `supabase/migrations/028_checkout_duitnow_exclusivity.sql` — requires Stripe-confirmed expiry and exact reservation release before a DuitNow submission, makes the locked submission RPC reject any remaining Checkout binding, rejects Stripe reservation/session attachment while a manual submission is unreviewed, and clears every Checkout guard if DuitNow wins while retaining a Stripe winner's persisted Session identity.
30. `supabase/migrations/029_manual_payment_receipts.sql` — adds private customer receipt uploads, immutable receipt versions and access/removal tombstones for Bank DuitNow and Touch ’n Go.
31. `supabase/migrations/030_payment_qr_settings.sql` — adds administrator-managed private QR artwork and separate Touch ’n Go settings history.
32. `supabase/migrations/031_manual_payment_review.sql` — adds the append-only review/correction ledger, private administrator evidence, five-outcome queue, total allocation, `manual_paid_draft` entitlement and no-publication manual-payment boundary.
33. `supabase/migrations/032_payment_support_contacts.sql` — adds the administrator-managed support-contact singleton, immutable history and guarded service-role RPC.
34. `supabase/migrations/033_paid_draft_publication.sql` — applies the shared paid-draft boundary to Stripe and manual winners, adds versioned draft saves/activity, exact owner publication acknowledgement/audit, fixed-template and published-snapshot guards, paid-draft asset access, and service-only lifecycle RPCs.
35. `supabase/migrations/034_never_published_card_assets.sql` — closes the disabled-published-snapshot Storage gap by requiring `published_at IS NULL` in every `card-assets` owner policy predicate.
36. `supabase/migrations/035_separate_invitation_review_editing.sql` — keeps invitation draft/text/layout/Gaya/Section/image editing available during manual review while receipt/evidence/review records remain immutable; preserves payment, publication and deletion guards.
37. `supabase/migrations/036_private_card_assets.sql` — makes `card-assets` private, removes browser/public object reads, keeps owner-only draft uploads with bounded names/MIME/size, and leaves legacy object paths available only through the protected application endpoint.
38. `supabase/migrations/037_scope_card_assets_select_policy.sql` — corrective additive migration for targets that already applied an earlier 036: scopes the restrictive `card-assets` SELECT predicate without changing payment-QR, receipt, evidence or other bucket policies.
39. `supabase/migrations/038_approved_edit_windows.sql` — adds administrator-audited seven-day post-publication edit windows, immutable later publications, current-publication guestbook boundaries, expiry enforcement, and append-only revision assets.
40. `supabase/migrations/039_approved_edit_window_repairs.sql` — preserves ordinary unpaid deletion after non-payment draft activity, advances the edit-window generation, serializes RSVP pointer checks, and keeps first-publication retries unavailable-safe and stale-intent-safe.

Only run each migration once per target project unless the SQL says it is safe to re-run.

---

## Part 2 — Every Time You Start Dev

You need **two terminals** running at the same time.

### Terminal 1 — Stripe webhook forwarding

Install Stripe CLI if you haven't:
```sh
# Arch Linux
yay -S stripe-cli

# Mac
brew install stripe/stripe-cli/stripe

# Or download from: https://github.com/stripe/stripe-cli/releases/latest
```

Login (first time only):
```sh
stripe login
```

Start forwarding:
```sh
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It will print a line like:
```
> Ready! Your webhook signing secret is whsec_abc123...
```

**Copy that `whsec_...` value** and paste it into `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

> This secret is unique to your machine. Do not share it — it changes every time you restart `stripe listen`.

### Terminal 2 — Dev server

```sh
npm run dev -- -p 3000
```

> **Always restart the dev server after editing `.env.local`** — Next.js only reads env vars at startup.

Open [http://localhost:3000](http://localhost:3000)

---

## Part 3 — Customer Flow Test (Roleplay as Customer)

Go through these steps to verify the full flow works end to end.

### Step 1 — Register

1. Go to `http://localhost:3000/register`
2. Sign up with your email and a password
3. Check the PDPA consent checkbox
4. Click **Daftar**

### Step 2 — Browse templates

Verify the template browsing policy at desktop (1440×900) and mobile (390×844) widths:

1. Go to `http://localhost:3000/templates`
2. Confirm only seeded **active** Template showcase cards render — a template deactivated via the admin Template active toggle (or missing from `templates`) must not appear at all
3. Search by template name, mood, and description text; combine the search with a Category filter pill and confirm the result count reports the combined total
4. Search for nonsense until the empty-results state appears, then exercise both reset controls independently: clearing the search and re-selecting the `Semua` category pill
5. Simulate an active-row query failure (e.g. point `NEXT_PUBLIC_SUPABASE_URL` at an unreachable host and restart the dev server) and confirm the gallery error state appears instead of the grid or the empty-results state
6. Open each active template's detail page and confirm the phone-frame Detail preview iframe renders, then click **Sesuaikan Template Ini →**
7. Open a known but inactive template URL directly (`/templates/<inactive-id>`) and confirm the Coming soon state with no Template price and no Customise CTA
8. Open an unknown id (`/templates/does-not-exist`) and confirm the unchanged not-found page
9. Finish with `npm run lint && node docs/ui-glossary/validate.mjs --check`

### Step 3 — Customise your card

Every active template is Section-v2, so repeat this step for **each seeded active Section-v2 Template preset** (all of them, not just one):

1. Start `/dashboard/cards/new?template=<preset-id>` for the preset.
2. The editor at `/dashboard/cards/[id]/edit` must open with that preset's own Section stack (Sections, order, defaults) — verify it matches the preset's catalogue description.
3. In the active Section sub-form, fill the preset's own required fields (e.g. event name, date, venue) — field sets differ per preset, so confirm the preset-specific fields render and accept input.
4. Confirm the three panes: left Section list, middle active Section sub-form, right live preview.
5. Edit a field → Live preview updates per keystroke; reload the page → draft is recovered.
6. Upload a Section image pre-payment (works because a draft card row exists pre-checkout).
7. Click **Teruskan ke Pembayaran →** — you land on the checkout page for the order, where the payment method is chosen.

Drafts save to `cards.custom_data_draft` server-side via a debounced PATCH; because a draft card row is created pre-payment, Section image upload works before checkout too.

### Step 3b — Section editor tour (desktop 1440×900, mobile 390×844)

The editor ships a five-step desktop / six-step mobile Malay guided tour with a step list per viewport. Desktop walks the Section sidebar, Sub-form, Live preview pane, Save indicator, and Continue to payment button; the mobile shell walks the Live card canvas, Form sheet, Sheet detent control, Navigation rail, the Section stack screen (Susun Bahagian), and the same Continue to payment button:

1. With a **fresh account** (`users.section_editor_tour_completed_at` is NULL), open `/dashboard/cards/[id]/edit` — after the loading shell the tour starts automatically; step through it and confirm each highlight lands on the right surface at each step (five on desktop, six on mobile).
2. Finish (**Selesai**) — or dismiss (**×**) in a separate run — then reload the page, open a different card's editor, and sign in from a second browser with the same account: the automatic launch stays closed in all three cases.
3. Click **Bantuan** in the editor top bar: the tour restarts from step one, both for accounts that completed it and accounts that dismissed it, without clearing the completion marker.
4. With DevTools → Network open, advance, finish, dismiss, and replay the tour: the only tour traffic is the helper completion server action — no `PATCH /api/cards/[id]/draft` fires for tour-only interaction, and `cards.custom_data_draft` is byte-identical before and after.
5. Keyboard check at desktop width: opening the tour moves focus into its panel, Tab cycles only through the tour's own controls (Escape dismisses), and settling returns focus to the control that opened it.
   - Regression check for the focus trap with **initial panel focus**: right after the tour opens (focus is on the tour panel itself, before any button has been visited), press **Shift+Tab** — it must be captured and land on the last enabled tour button, never leaving the modal; press **Tab** instead and it must land on the first enabled tour button. Then confirm normal wrapping between the enabled buttons only (disabled ones are skipped) and that Tab/Shift+Tab can never escape the panel from any position.
6. Navbar-safe placement at 1440×900: run all four visual checks before merge: (a) each of the five highlights lands on its target; (b) with both above-target and below-target cases, the complete **measured-height** panel — including `Panduan Penyunting · Langkah n / 5` — stays below the 58px sticky Navbar and inside the viewport; (c) the dimmed overlay covers the Navbar (z-index 120 > 100); and (d) every tour sentence uses active Malay, with no `dikemas kini` or `disimpan` wording. Also reduce viewport height: when neither side fits, only the panel body scrolls while its header and navigation controls stay visible.
7. Mobile tour at 390×844: with a fresh account the tour auto-launches on the canvas-first shell; each of the six steps highlights a real element, the panel is full-bleed minus the gutter, sits opposite its target, and never sits under the 76px navigation rail. Each step declares the screen it describes: steps 1–4 show the card-and-sheet screen, and step five (**Susun Bahagian**) switches to the Section stack screen, frames the first Section row, and shows the gold animated ↕ arrow above the drag handle. Seterusnya, Kembali, ×, and Escape each return to the pane the customer started on (the card when the tour began on the card). **Bantuan** is present and replays from step one. Replay the tour after opening the ☰ Section stack screen: steps 1–4 switch to the card-and-sheet screen, step five opens the stack screen, and exiting returns to the Section stack screen (the pane the customer started on) rather than crashing. Escape and **×** both settle it, and a reload does not relaunch. With `prefers-reduced-motion: reduce` emulated, the arrow is visible but static.

### Step 4 — Pay (choose a method at checkout)

#### Option A — Stripe (test card)

Click **Bayar dengan Kad (Stripe)**. You'll be taken to Stripe's payment page. Use the test card:

| Field | Value |
|---|---|
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date e.g. `12/29` |
| CVV | Any 3 digits e.g. `123` |
| Name | Anything |

Click **Pay**. Stripe CLI testing continues unchanged (Terminal 1 `stripe listen` forwarding as in Part 2).

#### Stripe retry and first-payment-wins checks

1. Start a Stripe checkout, then reload the checkout page and click **Bayar dengan Kad** again. The durable reservation must recover the same persisted Stripe Checkout Session rather than create another charge opportunity.
2. With a bound Stripe Session, try to submit a DuitNow reference. An open Session must be expired by Stripe and its exact reservation released before the submission can continue; an unbound, unknown, or complete Session must block manual submission. Never decide this from a local timeout. After a valid Stripe-vs-DuitNow completion race, the first completion alone must set `payment_method` and open the private paid draft; neither winner nor loser may publish, change the saved draft, expose a link or send a publication email.
3. For a missing persisted Session binding or a metadata mismatch, inspect the Stripe webhook response: it must be HTTP 5xx so Stripe retries the integrity fault. It must not acknowledge it with HTTP 400 or mark an order paid.

4. After Stripe reports paid, verify the checkout and dashboard show **Draf
   Berbayar**, not a public link. Open the paid-draft editor, make a final
   change, wait for the successful versioned save, then use the publication
   control supplied by the editor UI. Leave the acknowledgement unchecked and
   verify publication is rejected; check the exact sentence
   `I understand that this invitation will become public and read-only.` and
   publish. The public link and publication email may appear only after this
   committed owner action.

#### Option B — DuitNow manual transfer (local test)

1. As an **admin**, open `/admin` (the same payment surface remains at `/admin/payments`). Fill slot 1's label, payee name, provider, and a public QR image URL, tick **Aktifkan slot**, and **Simpan Slot** (the RPC refuses to enable an incomplete slot and every change appends versioned history). After applying migrations 024–025, verify that a direct `service_role` SQL `UPDATE public.duitnow_payment_slots ...` is denied while this form still saves, increments the version, and appends its history row with the signed-in administrator as actor.
2. As the **customer**, on the checkout page pick the enabled slot under *DuitNow — pindahan manual*. The selected slot detail shows payee, provider, QR image, instructions, and amount. Enter a valid trimmed printable transfer reference (3–64 characters, beginning with an alphanumeric character) and click **Hantar Rujukan untuk Semakan**. Also try a control character or an invalid leading/punctuation character: it must be rejected as `REFERENCE_INVALID` by the client/API and the submission RPC.
3. The page switches to **Menunggu Semakan Manual** — nothing publishes on submission, and the owner can keep editing the invitation and uploading images in the live editor while it awaits review. Payment status remains a separate flow. While it is waiting, try **Bayar dengan Kad** from another checkout tab: Stripe reservation/session creation must return the manual-review conflict and create no charge opportunity. After a rejection, Stripe becomes selectable again. An insufficient decision shows received and remaining RM and requires a same-method top-up.
4. Confirm the immutable-audit deletion guard: as the customer (Dashboard) **and** as an admin, attempt to delete the card for this order after submission — both attempts must fail with `IMMUTABLE_PAYMENT_AUDIT_PROTECTED`. This remains true after a rejected review.
5. Back in `/admin`, find the submission in the newest-first review table. It supports five filters: pending, insufficient, rejected, confirmed and duplicate. Open the row and verify the stored order price, current receipt, optional reference, received/credited/remaining/excess RM, reason and private evidence. Use **Rekod jumlah diterima**, **Baki belum dibayar** or **Tolak resit**; the insufficient path requires a valid private evidence file and a reason. The owner may continue editing the invitation throughout this review; a sufficient total opens exactly one editable paid draft, leaves the invitation unpublished and sends no publication confirmation. A later upload is a Duplicate; correct it with a mandatory reason and verify the correction is appended once and retries are idempotent. Rejection returns the customer to the replacement flow. Migrations 031 and 035 keep payment records immutable while separating them from live draft editing.
6. As the paid-draft owner, return to the editor, change content/Gaya/Sections, and confirm each successful save returns a newer `draft_version` and sets `last_activity_at`. Make a final edit and ensure the publication action first flushes that save; a failed save or stale version must block publication. Check that the exact unchecked acknowledgement text is required: `I understand that this invitation will become public and read-only.`
7. For a queue larger than Supabase's 1,000-row select cap, verify that the queue exhaustively follows descending `(created_at, id)` keyset pages. Insert a newer submission while it is loading: rows already in the scan must not be repeated or skipped; refresh to see the new row. The `/admin` overview should show the pending-review notification count.

8. As an administrator, open `/admin/orders` and an `/admin/cards/<id>` detail. Confirm paid rows show the payment-confirmed time, days since payment, derived lifecycle, and last successful customer draft activity. Historical rows without `last_activity_at` must say that no customer activity was recorded, not invent a timestamp. A draft-only administrator preview must not create a guest URL or RSVP context.

### Step 5 — Check the result

After paying, Stripe redirects you to:
```
http://localhost:3000/dashboard/checkout/<order-id>?status=success
```

- The page should show **Pembayaran Berjaya!** with the winning method (Stripe or DuitNow) and its localized completion time
- Once the webhook fires (within ~2 seconds), the page changes to **Draf Berbayar** with no guest link. For a DuitNow/Touch ’n Go confirmation the page updates on its next poll after the admin review. The guest link appears only after the owner publishes with the exact acknowledgement.
- Post-load winners update the same state without a reload: leave the checkout page open on the choice/awaiting screen, complete the payment from another tab (Stripe or admin review), and verify the success view appears with the correct winning method and completion time
- After publication, click **Lihat Kad Anda ↗** to see your live invitation card. Payment alone must never reveal this link.

### Step 6 — Check the dashboard

Go to `http://localhost:3000/dashboard` — your new card should appear with:
- Status badge: **Draf Berbayar** after any first sufficient confirmed payment, or **Diterbit** only after the owner publication action. A paid draft remains editable but has no guest URL until that action.
- RSVP count
- **Salin Pautan** button to copy the shareable link

### Step 7 — Test RSVP as a guest

1. Copy the card URL (e.g. `http://localhost:3000/i/abc12345`)
2. Open it in a new tab (or incognito)
3. Fill in the RSVP form and submit
4. Go back to the dashboard → click **RSVP** on the card to see the response

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Template not found` error on form submit | Confirm all migrations `001` through `021` were applied in Supabase SQL Editor in filename order, and that the private `card-assets` Storage bucket exists before `010` |
| Webhook returns 500 | Check that `STRIPE_WEBHOOK_SECRET` is set in `.env.local` and dev server was restarted |
| Stripe redirects to port 3000 | Make sure `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local` |
| Success page shows `Processing` | Stripe CLI is not running — start `stripe listen` in Terminal 1 |
| `Invalid API key` error | Supabase keys are wrong — get fresh `eyJ...` JWT keys from Supabase Settings → API |
| Email not sending | `RESEND_API_KEY` is empty — get a key from resend.com. Email failures won't block the payment flow. |

## Payment receipt uploads (#69)

Apply migrations 029–037 after 028 in numeric order. They create the private `payment-receipts` bucket and metadata tables, extend the review/payment lifecycle, keep invitation editing separate from immutable payment evidence, and protect `card-assets` behind the application asset endpoint; do not make either customer bucket public or grant browser reads. No additional env vars are required. Configure two Bank DuitNow slots and the separate Touch ’n Go form at `/admin/payments`. Run on port 3000 with `NEXT_PUBLIC_APP_URL=http://localhost:3000` for Stripe expiry/handoff.

Run `npm run test:section-editor-cache`, `npm run test:payment-receipts`, `npm run test:card-assets`, `npm run test:card-assets:local`, `npm run test:storage-policy:local`, `npm run lint`, `npm run build`, and `node docs/ui-glossary/validate.mjs --check`. For the PostgreSQL integration suites, install `@electric-sql/pglite` in a temporary directory and set `PAYMENT_TEST_PGLITE` to its dist/index.js for the payment tests and `PAID_DRAFT_TEST_PGLITE` for `npm run test:paid-draft-lifecycle`. These suites create isolated in-memory databases and apply the real migrations; they never touch hosted data. The managed local Supabase instance should also receive migrations 034, 035, 036 and 037 after migration 033 before the regression smoke test; `test:card-assets:local` and `test:storage-policy:local` additionally require the worktree app/stack at their allocated isolated ports.

Support-contact validation and audit checks run with `npm run test:payment-support`.
When `PAYMENT_TEST_PGLITE` is set, that suite also applies migration 032 in an
isolated in-memory database and checks role/ACL enforcement, stale versions,
before/after history, clear/restore writes, no-op behavior and immutable rows.

Human visual review: inspect owned checkout, `/admin`, `/admin/payments`, and `/privacy` at 1440×900 and 390×844. Exercise both methods, optional reference, mandatory receipt, progress/errors/retry, current download, replacement, rejection reason, partial top-up, overpayment support, success, prior-version downloads, received amounts, quarantine and interrupted removal retry. Use separate owner, other-customer and admin accounts; an anonymous or other-customer request must not read the receipt endpoint or Storage path.

Files are retained indefinitely. Quarantine/removal uses reasoned administrator controls for any version. Retry a failed removal until the tombstone says removed. Never delete immutable metadata. See `FLOW.md` for ambiguous upload recovery and storage policy.

## Protected invitation-image rollout and recovery

Apply this sequence to a target environment. Do not rewrite `cards.custom_data`,
`card_publication_actions.published_snapshot`, payment evidence, or existing
Storage objects as part of the cutover.

1. **Preflight.** Confirm the deployment contains `app/api/card-assets`,
   `lib/card-assets.ts`, the owner/admin/guest integration suite, and the
   current migrations through `037`. Confirm every image URL in published
   snapshots is either a stable `/api/card-assets/<card UUID>/…` reference or a
   `card-assets` public URL from the exact configured Supabase origin. Unknown
   origins and paths are intentionally not migrated automatically.
2. **Deploy the compatible application first.** Roll out the endpoint and
   renderer changes while `card-assets` is still readable, then verify Live
   preview, owner/admin bare previews, public invitations, and OG output. The
   renderer converts known legacy URLs in memory; it does not fetch arbitrary
   URLs or rewrite an immutable snapshot.
3. **Run migrations 036 and 037.** Set `card-assets` private and remove
   browser/public object reads only after every serving instance has the
   compatible endpoint. Migration 037 is required for targets that already
   recorded an earlier 036 with an unscoped restrictive SELECT predicate; it
   changes only the `card-assets` policy and must not relax payment-QR,
   receipt, evidence or other bucket restrictions.
   Verify a raw `/storage/v1/object/public/card-assets/...` URL is not 200,
   browser signed-URL creation is denied, owner upload still works on a never-
   published draft, and the endpoint sends `Cache-Control: no-store` and
   `X-Content-Type-Options: nosniff`.
4. **Post-cutover checks.** Exercise anonymous, stranger, owner and admin
   requests; referenced and orphan assets; disable/restore; malformed,
   traversal, cross-card and unknown-origin values; and desktop/mobile editor
   image upload. Do not add a CDN, Next image optimizer, redirect, or reusable
   signed URL in front of this endpoint.

**Recovery.** Migrations 036 and 037 are additive and should remain applied. If the new
application build fails, restore the last compatible build that includes this
endpoint and keep the bucket private; do not roll back by making customer
uploads public. Repair or redeploy the endpoint, then repeat the preflight and
post-cutover checks. Previously downloaded or browser/CDN-cached bytes cannot be
retroactively revoked; `no-store` applies to new protected responses only.

**Target guard (non-executable example for this checkout).** Before every local
Supabase operation, derive the active managed worktree and compare
`.env.local`, `.supabase-worktree/supabase/config.toml`, the project ID, API/DB
ports, and Docker project/container labels. The committed harness never embeds
a worktree, project or port. It requires explicit expectations from the caller:
`SUPABASE_EXPECTED_WORKDIR`, `SUPABASE_EXPECTED_CONFIG_PATH`,
`SUPABASE_EXPECTED_PROJECT_ID`, `SUPABASE_EXPECTED_API_PORT`,
`SUPABASE_EXPECTED_DB_PORT`, and `SUPABASE_EXPECTED_CONTAINER`; it then derives
the current worktree/config/container and fails closed on any mismatch. For the
approved issue #74 run, the asserted target is worktree
`/home/mikhaily/.bb/worktrees/env_tft5whtu4j/kamy-jemput`, config
`/home/mikhaily/.bb/worktrees/env_tft5whtu4j/kamy-jemput/.supabase-worktree/supabase/config.toml`,
project `kamy-wt-ac00fdae07b3bad0`, API `48240`, DB `48241`, container
`supabase_db_kamy-wt-ac00fdae07b3bad0`. These values describe that run; they are
not executable defaults. The repository default stack (`54321`/`54322`) and
other worktrees are never valid substitutes. Fail closed on any mismatch, and
never use bare `supabase migration up --local` from a repository-default config.
The focused local acceptance runner in `scripts/local-supabase-target.mjs` is
the required guard; it must be invoked only from the explicitly asserted
managed worktree.

The HTTP integration runners also require an explicit loopback app target:
`PUBLIC_BOUNDARY_TEST_APP_URL` or `PRIVATE_ASSET_TEST_APP_URL`. The package
scripts never overwrite these values or silently choose port `3010`.

For this checkout only (non-executable example; derive and verify each value
again before use):

```text
SUPABASE_EXPECTED_WORKDIR=/home/mikhaily/.bb/worktrees/env_tft5whtu4j/kamy-jemput
SUPABASE_EXPECTED_CONFIG_PATH=/home/mikhaily/.bb/worktrees/env_tft5whtu4j/kamy-jemput/.supabase-worktree/supabase/config.toml
SUPABASE_EXPECTED_PROJECT_ID=kamy-wt-ac00fdae07b3bad0
SUPABASE_EXPECTED_API_PORT=48240
SUPABASE_EXPECTED_DB_PORT=48241
SUPABASE_EXPECTED_CONTAINER=supabase_db_kamy-wt-ac00fdae07b3bad0
```

## Approved edit-window verification (issue #74)

After first publication, an administrator may grant a bounded-reason, audited
seven-day window from the Card-detail page. The grant atomically makes the same
slug private and preserves the first snapshot, payment evidence, template
entitlement and original `published_at`. The owner edits the revision draft,
then saves the final version and acknowledges publication before republishing.
The current publication pointer changes only in that guarded transaction.

Verify these boundaries with isolated fixtures: duplicate grant requests do not
restart the deadline; conflicting active grants reject; owner saves/uploads and
republication fail at the exact database deadline; an expired window stays
private and locked until a fresh grant; disable prevails over an active window;
restore does not republish old content; and a stale draft version cannot publish.
The same slug must return only the bounded customer-name notice while private,
including page HTML/RSC, metadata, OG, RSVP, asset and guestbook realtime
requests. Realtime topics and RSVP rows include the selected publication id,
and the database guard locks the card row while validating the pointer, so
superseded publications cannot receive or expose new guestbook activity. A
fresh grant advances `draft_version`, making old-window saves conflict even
when no save occurred in the new window. The focused SQL and runner are
`scripts/approved-edit-windows.integration.sql` and
`npm run test:approved-edit-windows:local`.
The companion `npm run test:approved-edit-window-races:local` opens separate
database connections for conflicting grants and disable-versus-save/publish
transitions; an observer checks `pg_stat_activity` sees the contender waiting
on a row lock before the holder is released. The HTTP boundary suite publishes
through `POST /api/cards/[id]/publish`, retries the same first-publication
request, and verifies a stale first request cannot publish during a later edit
window.

## Isolated Supabase for BB worktrees

The BB Worktree Setup plugin provisions each new managed worktree through the
machine-local entry point at `~/.bb-setup/kamy-jemput.sh`. That entry point is
outside this repository and the plugin cache, so plugin updates do not overwrite
it. It installs the lockfile, allocates an isolated Supabase project, applies the
checkout's migrations, creates the local fixture bucket, seeds the test accounts,
and writes the worktree's connection values to `.env.local`. No repository
`.bb-env-setup.sh`, Supabase helper script, or manual Python command is required.

Create worktrees through BB's new-worktree environment flow. A plain `git
worktree add` outside BB's managed worktree directory creates an unmanaged
checkout and does not run the plugin. Check the installation with
`bb worktree-setup status`. Next is a separate process started on the allocated
app port by the working agent.

The machine-local wrapper requires Python 3.11+, Supabase CLI, and Docker access
for the account running BB's host daemon. If the account already belongs to the
Docker socket group but the daemon has stale supplementary groups, the wrapper
refreshes membership through non-interactive `sudo -u <same-user>` with the CLI
PATH preserved. It never runs as root, changes group membership, or changes socket
permissions. Other Docker failures remain fatal. Initial image downloads can take
several minutes; failures write a private `.supabase-worktree/error.log`.

Each canonical worktree path gets a stable project ID, a reserved block of ports,
and its own database/Auth/Storage volumes. A host-wide lock serializes allocation
and startup; `~/.cache/kamy-worktree/ports.json` retains reservations even for stopped
stacks. Generated config and state live in ignored `.supabase-worktree/`. Migrations
are symlinked to this checkout, so `up` applies new files, including uncommitted ones.
It never runs `db reset`, uses a linked project, or migrates the shared local stack.
Changes to the base config require stopping the isolated stack and removing only
`.supabase-worktree/supabase/config.toml` before running `up` again.

Successful provisioning replaces only the three Supabase connection variables and
`NEXT_PUBLIC_APP_URL` in `.env.local`; other credentials are preserved. This repo
currently tracks `.env.local` despite its ignore rule, so do not stage that file.
Restart existing Next processes after provisioning. Use the printed app port for
Stripe forwarding: `stripe listen --forward-to http://localhost:<port>/api/stripe/webhook`.
Auth redirects are configured for that same app URL.

Migrations provide the template catalogue, and provisioning creates the private
`card-assets` fixture bucket. Migration 029 creates private `payment-receipts`;
migrations 036 and 037 remove browser/public `card-assets` object reads while
preserving owner uploads.
No accounts, orders, or receipts are copied from another database. Setup seeds
`kamy@gmail.com` (customer) and `kamy.admin@gmail.com` (administrator), both with
password `123`. These confirmed email/password fixtures are inserted directly into
the isolated local Auth database with bcrypt hashes, bypassing signup password
length checks without weakening the app or hosted Auth configuration. Existing
accounts, passwords and roles are preserved on repeat runs. The two inserts and
role assignment are transactional. The fixture SQL is part of the worktree helper,
never a production migration.
The repository's missing `seed.sql` is disabled in the generated config.

The plugin writes an untracked `.bb-env-teardown.sh` into each managed worktree.
BB runs that hook when the final thread is archived or deleted, then removes the
managed directory. The hook stops only that worktree's Supabase project and keeps
its Docker volumes; it does not reset a database, run remote migrations, or purge
data. BB 0.41 keeps an archive grace period of about five minutes. Git branch
references may remain after directory removal and are cleaned separately only
after confirming that the branch is no longer needed. Removing a worktree with
plain Git does not run the teardown hook.


## Revised payment screens

Apply migration 030 after 029. Open `/admin/settings/qr` to upload one Bank QR and
one Touch ’n Go QR (JPEG/PNG/WebP, up to 5 MB). Enter recipient details and enable
the method. Customer receipt files remain in the separate private receipt bucket.
The Section editor's Continue to payment button opens a two-choice modal: Stripe
opens hosted Checkout; DuitNow QR opens `/dashboard/checkout/[orderId]/qr`.
When a manual receipt is under review, the editor remains available and the same
top-bar action becomes a separate payment-status button. It saves the latest
draft first, shows loading/error/conflict recovery in the editor, does not
require invitation completeness, and does not start a new
payment method.
Verify upload, replacement, rejection, partial top-up, and QR-unavailable states on
mobile and desktop. Apply migration 032, then open `/admin/settings/support` to
manage optional payment support contacts, preview the four customer message modes,
and review/restore the latest 100 immutable history rows. The earlier Slot form
instructions above describe the legacy transfer flow, retained only for
audit/review context.

For hosts with global libvips installed, use `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`
to install the prebuilt Sharp decoder. The machine-local BB setup uses this flag.
