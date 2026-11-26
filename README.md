# kamy-jemput

Digital invitation card platform for Malaysian events, built with Next.js 16 App Router, Supabase, Stripe, and Resend. Customers browse a template catalogue, customise their card through per-Section editing with a live preview, pay via Stripe Checkout, and share a hosted invitation page (`/i/[slug]`) that guests can RSVP to.

## Public copy

This repository is a sanitized copy of a private project. It contains no
credentials and no local environment files. Copy `.env.example` to `.env.local`
and fill in your own values before you run it.

## Commands

```sh
npm run dev      # local dev server (default localhost:3000)
npm run build    # production build / TypeScript verification
npm run lint     # ESLint verification
```

There is no single `test` script. Unit suites run one at a time, for example
`npm run test:payment-receipts`. Type checking runs with
`npx tsc --noEmit`. The full check list is in `docs/CHECKLIST.md`.

## Documentation map

| Document | Purpose |
|---|---|
| [`docs/AGENT_ONBOARDING.md`](docs/AGENT_ONBOARDING.md) | First read for any human or coding agent |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Current product capabilities and durable boundaries |
| [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) | High-level business direction |
| [`docs/PLAN.md`](docs/PLAN.md) | Current engineering roadmap |
| [`docs/CHECKLIST.md`](docs/CHECKLIST.md) | Current verification checklist and known limitations |
| [`docs/FLOW.md`](docs/FLOW.md) | Service connectivity and end-to-end data flow (source of truth) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Section-v2 card model and rendering contexts |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Approved decision records |
| [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) | Unresolved questions needing human input |
| [`docs/DEV_SETUP.md`](docs/DEV_SETUP.md) | Local setup and manual customer-flow testing |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Canonical UI terms |
| [`docs/AGENT_WORKFLOW.md`](docs/AGENT_WORKFLOW.md) | Branch/worktree protocol for concurrent work |

Root markdown is intentionally minimal. Durable project docs live under `docs/`; root `AGENTS.md` and `CLAUDE.md` exist only because agent CLIs auto-load them.
