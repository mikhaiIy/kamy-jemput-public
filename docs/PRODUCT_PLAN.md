# PRODUCT_PLAN.md — business direction

> High-level business outlook for kamy jemput. Current product policy lives in `PRODUCT.md`; engineering follow-ups in `PLAN.md`.

## Business

Malaysia-based B2C digital invitation card business: customers browse templates, customise, pay once, and share a hosted web card (not PDF/video) with RSVP tracking. Solo developer using AI tooling. Weddings are the anchor market; the Section-v2 catalogue extends to other occasions (engagement, aqiqah, raya open house, birthdays, corporate events).

## Model

- **Revenue:** one-time template-level price in MYR via Stripe Checkout. Potential future upsell: premium Variants (unresolved — Q3).
- **Custom work:** tiered intake via the public custom-order form (`/api/custom-orders`, admin triage) so out-of-catalogue requests become managed leads instead of ad-hoc dev work. Tier definitions pending Q7 resolution.

## Stack & operating posture

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) on Vercel | Full-stack in one repo, zero-config deploy |
| Database/Auth/Storage | Supabase | Managed Postgres + auth + storage |
| Payments | Stripe Checkout | PCI handled by Stripe |
| Email | Resend | Simple transactional email |

Operating costs sit mainly on Supabase/Vercel/Stripe fees; watch Storage bandwidth as uploaded Section images grow (CDN offload is a later option).

## Launch readiness criteria

- Production environment configured end-to-end (Supabase project with all migrations + `card-assets` bucket, live Stripe keys + webhook, Resend sending domain, real `NEXT_PUBLIC_APP_URL`).
- Manual smoke test in `CHECKLIST.md` passes on production for each active Template preset.
- Pricing confirmed (Q3 resolved at least to "template-price-only at launch").
- Legal/compliance: PDPA consent at registration is enforced; review retention of RSVP guest data before scale.

## Post-launch priorities (order TBD by demand)

1. Add the remaining performance index (`cards.template_id`) and monitoring before meaningful traffic.
2. Resolve premium-variant monetisation (Q3).
3. Catalogue expansion remains config-first (new presets from existing Sections).
4. Revisit multi-language structured text (Q4) only with demonstrated customer need.
