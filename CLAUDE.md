# CLAUDE.md

@AGENTS.md

## docs/FLOW.md maintenance

`docs/FLOW.md` is the source of truth for how services connect to code and how data moves through the system. Keep it up to date:

- Whenever a new service, env var, API route, server action, or Supabase client is added or removed, update the relevant section in `docs/FLOW.md`.
- Whenever the end-to-end user flow changes (new page, new step, changed redirect), update the flow narrative in `docs/FLOW.md`.
- Whenever a lib file (`lib/stripe.ts`, `lib/resend.ts`, `lib/supabase/*.ts`) is modified in a way that changes which files import it or what env vars it reads, update the import table in `docs/FLOW.md`.
- Do not let `docs/FLOW.md` drift from the actual code — treat a stale `docs/FLOW.md` as a bug.

## Verification

There is no `typecheck` or `test` script. Verify changes with:

```sh
npm run lint
```

If you touched the UI (terms, wireframe surfaces, Sections), also run
`node docs/ui-glossary/validate.mjs` after updating `docs/ui-glossary/data/`.
