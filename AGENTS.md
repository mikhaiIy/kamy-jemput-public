# AGENTS.md

## Next.js 16 — Breaking changes

This is **Next.js 16**. Key differences from earlier versions:
- **Proxy replaces Middleware** — the middleware file is `proxy.ts` (root of project), not `middleware.ts`. Exports a named `proxy` function + optional `config` object with `matcher`. API is otherwise the same.
- When in doubt about APIs or conventions, check `node_modules/next/dist/docs/` — it may differ from your training data.

## Commands

```sh
npm run dev      # Start dev server (Next default localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

There is no `typecheck` or `test` script. `eslint` is the only verification step.
For the full local Stripe/Resend flow, follow `docs/DEV_SETUP.md`: run the dev
server on port `3000` and set `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

## Architecture

The app is a Next.js 16 App Router + Supabase + Stripe + Resend digital invitation card platform (`kamy jemput`).

**`docs/FLOW.md` is the authoritative, kept-in-sync inventory** of route groups,
API routes, server actions, service clients and their importers, env vars,
storage behavior, database tables, and migrations. Read it before touching
connectivity — and update it in the same change whenever you add or remove a
service, route, server action, lib import surface, or change the data flow.
Do not duplicate that inventory here.

### Route groups (control which layout wraps each section)

| Group | Path | Layout |
|---|---|---|
| `(public)` | `/`, `/templates`, `/templates/[id]`, `/templates/custom`, `/privacy`, `/terms` | Navbar + Footer |
| `(invite)` | `/i/[slug]` | **No** Navbar / Footer (immersive guest invitation) |
| `(preview)` | `/templates/preview/[id]` | **No** Navbar / Footer (bare card preview in iframe) |
| `(auth)` | `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth pages, no Navbar |
| `(dashboard)` | `/dashboard`, `/dashboard/cards/new`, `/dashboard/cards/[id]/edit`, `/dashboard/cards/[id]/rsvp`, `/dashboard/checkout/[orderId]` | Protected by proxy, Navbar + Footer |
| `(admin)` | `/admin`, `/admin/templates`, `/admin/cards/[id]`, `/admin/custom-orders` | Protected by proxy, admin role check in layout |

### API routes

See `docs/FLOW.md` for the full route/action inventory. Summary:

- Stripe checkout/webhook, guest RSVP, draft save (`PATCH /api/cards/[id]/draft`), custom-order intake, order-status polling, and admin publish/template-toggle routes.
- Server actions: `app/actions/order.ts`, `app/actions/card.ts`, `app/(admin)/admin/custom-orders/actions.ts`, `app/(admin)/admin/cards/[id]/actions.ts`.

## Supabase — 3 clients, choose carefully

This is the most common mistake. Use the right client for the context:

| File | Key used | Where to use |
|---|---|---|
| `lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Browser only** — `"use client"` components, auth forms, customization form |
| `lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Server Components** — page data fetching. Respects RLS. |
| `lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | **Trusted server-only contexts** — API routes, server actions, and admin Server Components after explicit checks. Bypasses RLS. Never import in client code. |

- `proxy.ts` uses `createServerClient` inline (not from lib) to check auth sessions.
- `admin.ts` exports a `Proxy` object (`supabaseAdmin`) so callers do `supabaseAdmin.from(...)` directly.
- The admin client is lazily initialized and throws at runtime (not build time) if env vars are missing.
- Prefer the RLS-aware server client for normal user-owned reads/writes. Use `supabaseAdmin` only when the server intentionally acts as the system, and keep auth/ownership/admin checks close to the write.

## Env vars

```
NEXT_PUBLIC_SUPABASE_URL          # Required — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Required — Supabase anon key (safe in browser)
SUPABASE_SERVICE_ROLE_KEY         # Required — never exposed to client
STRIPE_SECRET_KEY                 # Required — Stripe API key
STRIPE_WEBHOOK_SECRET             # Required — Stripe webhook signing secret
RESEND_API_KEY                    # Required — Resend email API key
FROM_EMAIL                        # Optional — sender email (defaults to noreply@example.com)
NEXT_PUBLIC_APP_URL               # Optional — public app URL (code defaults to localhost:3000)
```

- `NEXT_PUBLIC_*` vars are bundled into client code — only put public data there.
- `lib/stripe.ts` **throws at import time** if `STRIPE_SECRET_KEY` is missing — the build/start will fail if not set.

## Auth & routing

- `proxy.ts` runs on every request (except static assets). It:
  - Refreshes the Supabase session cookie
  - Redirects unauthenticated users from `/dashboard/*` to `/login`
  - Redirects unauthenticated users from `/admin/*` to `/login`
  - Admin role check is deferred to the layout in `(admin)`, not in proxy
- Supabase Auth uses email/password (registration requires the PDPA consent checkbox) plus Google OAuth on login/register via `supabase.auth.signInWithOAuth({ provider: "google" })` with code exchange at `app/auth/callback/route.ts`.
- The logout button (`components/LogoutButton.tsx`) is a client component that calls `supabase.auth.signOut()` then redirects to `/`.

## UI conventions

- **shadcn/ui** components live in `components/ui/` (button, input, dialog, select, tabs, badge, separator, card, label, textarea).
- `cn()` helper from `lib/utils.ts` (clsx + tailwind-merge) for className merging.
- **Tailwind CSS v4** — uses `@import "tailwindcss"` in CSS and `@tailwindcss/postcss` plugin (not the old `@tailwind base/components/utilities`). CSS variables for theming are defined in `app/globals.css`.
- App colors come from the semantic tokens in `app/globals.css`: the logo’s deep-plum primary (`#2c1a4a`), gold accent (`#c9984a`), warm cream background and white panels. Use those tokens for app controls, including dialogs. Customer invitation palettes remain owned by their Gaya presets.
- Fonts: registered via `next/font/google` in `app/layout.tsx` with CSS variables (`--font-cormorant`, `--font-jakarta`, `--font-playfair`, `--font-great-vibes`, `--font-geist-mono`, plus display/script fonts used by Gaya presets such as Cinzel, Fraunces, Dancing Script, Caveat, Amatic SC, Bodoni Moda). The legacy `components/card-previews/ChineseWeddingCard.tsx` is a localized exception: it loads `Ma_Shan_Zheng` and `Noto_Serif_SC` via component-scoped CSS `@import`. See `docs/FLOW.md` for the full list.
- Component convention: **Server-safe** components (no `"use client"`) vs **Client** components (with `"use client"`). The `InvitationCard` and all rich previews in `card-previews/` are client components.

## UI naming. Use the canonical term

`docs/GLOSSARY.md` holds the canonical name for every part of the interface,
under **UI terms**. Use those names when you write about the UI, name a
variable, or write a commit message. Aliases are fine as input. Write the
canonical name in output.

Six words name more than one thing in this repo. Never use them bare:

| Bare word | Say instead |
|---|---|
| Gaya | **Gaya panel** (card theme preset) or **Variant gallery** (per-Section picker) |
| Preview | **Gallery preview iframe**, **Detail preview iframe**, **Live preview**, or **Bare preview surface** |
| Card | **Template showcase card**, **Card column**, **Card row**, or **Section stack** |
| Template | **Template showcase card**, **Template info panel**, or **Template management table** |
| Theme | **Gaya panel** or **Gaya swatch** |
| Section | **Section stack**, **Section row**, or a named Section such as **Landing section** |

After you change the UI, update `docs/ui-glossary/data/` and run:

```sh
node docs/ui-glossary/validate.mjs
```

That command regenerates the **UI terms** and **Section catalogue** sections of
`docs/GLOSSARY.md`. It fails if a term has no place on a wireframe. It also
fails if a place on a wireframe has no term. Treat a stale glossary as a bug,
the same as a stale `docs/FLOW.md`.

Humans read `docs/ui-glossary/index.html`. It shows each term wired by a line to
the exact part it names.

## Data model

See `lib/types.ts` for core types (`SectionCardData`, `SectionInstance`, `Theme`, `Template`, `Order`, `Card`, …) and `docs/ARCHITECTURE.md` for the Section-v2 model. Section-v2 defaults live in `templates.theme` and `templates.sections`; v2 drafts live in `cards.custom_data_draft`. Full table/migration inventory: `docs/FLOW.md`.

## Key documentation files

- `docs/FLOW.md` — system architecture, service connectivity, end-to-end user flow. **Keep it up to date** when adding services, routes, or changing data flow.
- `docs/ARCHITECTURE.md` — implemented Section-v2 card model and rendering contexts.
- `docs/PRODUCT.md` / `docs/PRODUCT_PLAN.md` — current product policy; high-level business direction (context, not source of truth).
- `docs/GLOSSARY.md` — canonical terms. The UI terms and Section catalogue sections are generated. Do not hand-edit them.
- `docs/ui-glossary/` — the visual glossary. Open `index.html` to see each term connected to the part it names.
- `docs/AGENT_ONBOARDING.md` — start here for agent-agnostic project context and current phase progress.
- `docs/MOBILE_EDITOR.md` — KJ-1 research: why the Section editor fails on a phone, the candidate mobile shells, and the recommended phased hybrid. Companion prototype: `docs/mobile-editor-lab/index.html`.
- `docs/AGENT_WORKFLOW.md` — branch/worktree protocol for multi-agent experiments.
- `node_modules/next/dist/docs/` — Next.js 16 official docs (authoritative for API references).
