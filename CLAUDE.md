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
