# CHECKLIST.md — current operational verification

> Evidence-based checklist for verifying the running system, plus known limitations. Not a phase-by-phase history — completed implementation is recorded in code, migrations, and `DECISIONS.md`.

## Automated checks

| Check | Command | Current result |
|---|---|---|
| Lint | `npm run lint` | Pass — zero errors; 7 pre-existing warnings in legacy preview components (2026-09-08) |
| TypeScript | `npx tsc --noEmit --incremental false` | Pass (2026-09-08) |
| Production build | `npm run build` | Previously passed before the dashboard refinement; not rerun for this change |
| Glossary consistency | `node docs/ui-glossary/validate.mjs --check` | Pass — 206 terms, 196 targets; one existing stale-screenshot warning (2026-09-08) |
| Section editor cache regression | `npm run test:section-editor-cache` | Pass — 8 tests, 0 skipped |
| Section editor payment-status navigation | `npm run test:section-editor-navigation` | Pass — 5 tests, 0 skipped; latest edits and in-flight saves flush before navigation, failures stay in-editor, and incomplete drafts remain eligible for status navigation |
| Payment support/guard DB suite | `PAYMENT_TEST_PGLITE=<temporary @electric-sql/pglite dist/index.js> npm run test:payment-support` | Pass — 5 tests, 0 skipped; support validation, customer copy, guarded writes and immutable history remain green |
| Payment receipt/review DB suite | `PAYMENT_TEST_PGLITE=<temporary @electric-sql/pglite dist/index.js> npm run test:payment-receipts` | Pass — 12 tests, 0 skipped; receipt replacement, evidence, totals, payment handoff and deletion-audit guards remain green |
| Paid-draft lifecycle DB suite | `PAID_DRAFT_TEST_PGLITE=<temporary @electric-sql/pglite dist/index.js> npm run test:paid-draft-lifecycle` | Pass — 1 test, 0 skipped; covers submitted/insufficient/top-up and legacy owner draft + image writes, stranger denial, immutable receipt/evidence snapshots, unpaid publication blocking, latest-draft publication, and never-published `card-assets` checks |
| Section registry image-schema validation | `npm run test:section-schemas` | Pass — 4 tests, 0 skipped; actual registry schemas accept stable/legacy/static image references, reject arbitrary relative/traversal/remote values, preserve general URL validation, and audit built-in defaults/presets |
| Protected card-asset normalization | `npm run test:card-assets` | Pass — 10 tests, 0 skipped; includes heroImageUrl alias membership/rendering, public static/template preservation, bucket-scoped Storage SELECT isolation and the fresh-036/additive-037 migration scope |
| Protected card-asset local HTTP/Storage suite | `npm run test:card-assets:local` | Pass — 6 tests, 0 skipped against the isolated Supabase stack; owner/admin/stranger/anonymous, frozen stable and legacy hero references, orphan/cross-card denial, disable/restore, direct public/signed bypasses, malformed paths and uploads |
| Unrelated Storage policy scope | `npm run test:storage-policy:local` | Pass — 1 real isolated Storage test, 0 skipped; unrelated list/download is allowed by its own policy while card-assets and payment buckets remain denied |

## Dashboard and shared UI verification (2026-09-08)

- Public login and template gallery inspected in the isolated development app; narrow-screen layout renders correctly. The shared palette is restored to the existing deep-plum Kamy logo colors.
- Actual customer Dashboard, admin invitation list and Card-detail page components rendered with temporary in-memory fixtures for browser layout checks at 390 px and 1280 px. The Dashboard invitation preview iframe uses the protected saved-invitation route in the app; review fixtures used public sample designs. No customer or payment records were created for these layout checks.
- The admin invitation list exposes invitation, customer, status and the detail link. The Card-detail page starts with four disclosures closed; opening payment details reveals its existing records. Customer and admin detail pages have no horizontal page overflow at 390 px.
- The shared confirmation dialog was exercised with a local-state demonstration: Cancel receives initial focus, cancelling restores opener focus, and pending confirmation disables repeat submission and dismissal buttons.
- Authenticated customer checks now pass against the isolated app on port 49618 using the existing local lifecycle examples: three selected group filters (7 attention, 1 upcoming, 1 past), case-insensitive search, matching counts across groups, no-match guidance, search reset, six-item pagination and sticky controls below the Navbar. Filter selection retains focus on the clicked control.
- Responsive customer Dashboard and RSVP checks used 390px and 1280px viewport overrides (the browser's existing zoom yielded approximately 354px and 1163px CSS viewports). Neither page overflowed horizontally. The actual Padam draf action opened its shared dialog with Batal focused; cancelling returned focus to Padam draf. No deletion was submitted.
- The requested RSVP example showed three responses, two attending responses, one decline and five expected guests. Expanding a guest revealed the full message and the explicit missing-contact value. The shared customer background computes to #faf8f4.
- Follow-up spacing check: the actual Navbar and Dashboard components rendered with six in-memory examples. At the desktop browser zoom, the sticky filter bar underlapped the Navbar border by 0.568px (no positive gap); the first three primary button top coordinates matched exactly and each secondary slot measured 40px. On mobile the empty secondary slot collapsed to zero height, with no horizontal overflow. A fresh live-account check was not performed because automatic approval review rejected the local fixture sign-in; these follow-up checks cover rendered layout only.
- The Account menu was checked with the actual Navbar and interactive NavbarMenu backed by local service stubs. Desktop retains inline primary navigation and reveals Logout only through the hamburger; mobile adds navigation above the Akaun area without horizontal overflow. Opening focuses the first visible action; Escape restores hamburger focus, outside clicks and tabbing away close the menu, and mobile navigation closes it. The shared Logout action keeps its quiet styling and 44px target.
- A stubbed sign-out failure verified disabled/progress state, the shared retry dialog, and closing that dialog without losing the menu; focus returns to Logout. The component also retains its pending state while the menu is hidden and provides the hamburger as a fallback focus target. These fixture checks do not sign a user out or call Supabase. Customer settings remain a future destination.

- Authenticated admin browser and database mutation checks remain pending; the earlier static admin fixtures do not verify sessions or writes. The new admin invitation relation query was separately validated against the isolated Supabase schema with a read-only request.

## Manual smoke test (requires `docs/DEV_SETUP.md` setup)

Prerequisites: migrations 001–037 applied in numeric order on the target project, private `card-assets` bucket created before applying 010, Stripe CLI forwarding to `/api/stripe/webhook`, dev server on port 3000 with `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

1. Register with PDPA consent; log in.
2. Browse `/templates`; open a Template showcase card; Detail preview iframe renders.
3. For each active Section-v2 Template preset: start `/dashboard/cards/new?template=<id>` → editor opens at `/dashboard/cards/[id]/edit` with the preset's Section stack and preset-specific fields.
4. Edit fields → Live preview updates per keystroke; reload recovers the draft (localStorage + server draft).
5. Upload a Section image pre-payment (works because the draft card exists pre-checkout); confirm the stable `/api/card-assets/...` value does not show `URL tidak sah`, save succeeds, and Continue to payment opens the payment surface.
6. Pick a Variant from the Variant gallery and a Gaya swatch from the Gaya panel; verify whole-card re-theme.
7. Pay with test card `4242 4242 4242 4242`; the success state shows payment confirmed and **Draf Berbayar**; the webhook does not publish or reveal a link.
8. In the paid-draft editor, make a final edit, confirm the latest version is saved, explicitly acknowledge publication, and publish; only then does the card link appear. Open `/i/[slug]` in incognito; submit RSVP; response appears in dashboard RSVP view; wish animates into another open tab live.

For manual review, submit a receipt, open the editor from the dashboard or
checkout status, and verify invitation text/layout/Gaya/Section/image edits save
during submitted, insufficient and same-method top-up states. Payment status is
separate; after sufficient confirmation, publication uses the latest saved edit.

## Known limitations / gaps

- Database lifecycle and payment suites are available with the temporary PGlite test dependency; full browser E2E remains manual.
- Full browser E2E must be exercised manually after each environment rebuild (see steps above).
- Direct browser Storage `update` is not a supported editor operation because it
  requires an object SELECT result; the editor uses owner-scoped `upsert=false`
  inserts. Owner delete policy remains available for authorized cleanup, and
  unreferenced bytes are not automatically removed.
- Legacy customer image URLs from unknown origins or ambiguous legacy cover
  objects are intentionally unavailable after cutover; only exact configured
  Supabase-origin references are normalized in memory.
- Stored `heroImageUrl` aliases render and authorize only when the current
  `coverPhotoUrl` field is absent. Unreferenced legacy objects are retained but
  unavailable through the protected route after cutover. Existing downloads or
  caches cannot be retroactively revoked.
- Premium Variant markers are informational only — no paid gating yet (Q3).
- `LocalisedText` is `string`; bilingual structured text unsupported (Q4).
- Legacy renderers exist solely for historical stored payloads and eligible legacy preview IDs; do not build new features against them.
