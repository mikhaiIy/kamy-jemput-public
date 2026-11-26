# AGENT_WORKFLOW.md — concurrent collaboration protocol

Agent-agnostic protocol for any AI agent, model, human developer, or automation working on this repository without overwriting another effort.

## Principles

- **One isolated branch per concurrent effort**, created from the currently checked-out base of the repository (or `origin/main` if starting fresh). Do not assume fixed historical baseline tags or branch names; inspect `git branch`/`git log` first.
- **One isolated worktree per effort** when working side-by-side on one clone:

```sh
git worktree add ../kamy-jemput-<effort> -b <effort-branch>
```

Branch names: simple lowercase kebab-case describing the effort or tool stack (e.g. `docs-consolidation`, `rsvp-variants`, `cursor`). Commits inside a branch represent phases, fixes, docs, or verification work for that attempt.

## Safety rules

- Never push to shared branches without review. Never rewrite history on branches others may have fetched.
- Keep secrets out of commits: `.env*`, keys, archives. `.env.local` is gitignored.
- Migrations are append-only: never edit an already-applied migration file; add a new numbered migration instead.
- Respect the approved path list of the task you are executing; if none is given, stay within files your change requires plus the canonical docs you must update.

## Review and merge

1. Keep each effort small and lint-clean (`npm run lint`; `node docs/ui-glossary/validate.mjs --check` after UI changes).
2. Summarise changed paths and verification results in the final report or PR description.
3. Merge order is first-reviewed-first-merged; later efforts rebase onto the updated base before continuing rather than force-pushing over it.
4. If two efforts touch the same canonical doc, reconcile in the rebase step — don't duplicate conflicting status claims across docs.

## Canonical docs duty

Every merged change that affects behaviour must land with its documentation updates (`FLOW.md`, `ARCHITECTURE.md`, `CHECKLIST.md`, decisions/questions) in the same branch, so the canonical set never lags behind code on main.
