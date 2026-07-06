# mindfull-growth

Local-first personal-growth app: Vue 3 + Vite + Pinia + Dexie (IndexedDB).
No backend — auth and all data live in the browser, per-user database
`MindfullGrowthDB_simplify_<userId>`, per-origin (host:port). UI is bilingual
(PL/EN); the user works in Polish.

## Commands

```bash
npm run dev              # real dev server, port 5173 — REAL USER DATA lives on this origin
npm run dev:verify       # isolated, seeded, auto-logged-in verification instance (port 5199)
npm run typecheck        # vue-tsc --noEmit
npm run test:run         # vitest
npm run test:e2e         # Playwright: flow specs (5183) + verification smoke (5199)
npm run test:e2e:verify  # verification smoke only
```

Use npm for this project. Do not switch to bun, pnpm, or yarn unless the user
explicitly asks for a package-manager migration.

## Gates (before any commit)

`npx vue-tsc --noEmit` → 0 errors · `npx vitest run` → green · `git status` clean.

## Conventions

- Conventional commits, lowercase, committed directly to `main` (no PRs).
- Concurrent sessions may commit to `main` in this same checkout: check HEAD
  before committing and stage explicit paths only (`git add <files>`), never
  `git add -A`.
- Data writes go through repositories/services (`src/repositories/`,
  `src/services/`) — never raw IndexedDB.
- Dev-only code: `import.meta.env.DEV` guard + dynamic `import()` (see
  `src/main.ts`), so it drops out of prod builds.

## Verifying features ("zweryfikuj X")

Use the `verify-app` skill. One command (`npm run dev:verify`) gives a seeded,
auto-logged-in instance on `127.0.0.1:5199`, fully isolated from real data.
Full guide: `docs/agent-verification.md`. Report bugs — don't fix them in the
shared tree. Never run seeds or destructive e2e against port 5173.

Do not spend Claude/Fable context on direct Browser or Computer use for app
verification. Delegate exploratory UI/runtime checks, browser automation,
screenshots, and console inspection through the `codex-computer-use` skill.
If Codex CLI is unavailable or blocked, report the blocker and ask how to
proceed instead of falling back to Claude's own Browser/Computer use.

## Codex delegation

Use Codex CLI as a separate worker when that saves Claude/Fable context or adds
an independent implementation/review/runtime perspective:

- `codex-review`: independent reviews of uncommitted changes, branch diffs,
  commits, regressions, missing tests, or requirement mismatches.
- `codex-implementation`: small, bounded implementation patches. Claude still
  scopes the work, inspects the diff, runs/checks verification, and reports the
  final result.
- `codex-computer-use`: local UI/runtime verification that would otherwise
  require Browser/Computer use.

Codex must not commit, push, deploy, edit global config, or overwrite unrelated
user changes unless the user explicitly asks for that exact action.

## Planning

For larger roadmaps, architecture plans, multi-step implementation plans, or
UI/data-flow plans, use the `html-plan` skill and write a standalone artifact
under `ideas/html-plans/<date>-<slug>.html`. Keep short/simple plans in chat.
