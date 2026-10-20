# mindfull-growth

Local-first personal-growth app: Vue 3 + Vite + Pinia + Dexie (IndexedDB).
No backend — auth and all data live in the browser, per-user database
`MindfullGrowthDB_simplify_<userId>`, per-origin (host:port). UI is Polish-first
(English only for exercises and questionnaires); the user works in Polish.

## Commands

```bash
npm run dev              # real dev server, port 5173 — REAL USER DATA lives on this origin
npm run dev:verify       # isolated, seeded, auto-logged-in verification instance (port 5199)
npm run dev:demo         # demo account „Julia” with half a year of history (port 5205), docs/demo-account.md
npm run typecheck        # vue-tsc --noEmit
npm run test:run         # vitest
npm run test:e2e         # Playwright: flow specs (5183) + verification smoke (5199)
npm run test:e2e:verify  # verification smoke only
```

Use npm for this project. Do not switch to bun, pnpm, or yarn unless the user
explicitly asks for a package-manager migration. Node 22.12+ or 24 (vite 8 /
vitest 5 engines; the Homebrew default `node` 23.7 only warns). npm 10.9's
`npm update` crashes in arborist on this dependency graph (`reading
'edgesOut'`) — run it as `npx npm@latest update`; `npm ci` and `npm install
<pkg>` work on npm 10.9.

## Gates (before any commit)

`npx vue-tsc --noEmit` → 0 errors · `npx vitest run` → green · `npx eslint .` → 0
problems · `npm run format:check` → clean · `npm run check-locales` → green ·
`npm run check:design-system` → OK (ratchet) · `git status` clean.

## Conventions

- Conventional commits, lowercase, committed directly to `main` (no PRs).
- Concurrent sessions may commit to `main` in this same checkout: check HEAD
  before committing and stage explicit paths only (`git add <files>`), never
  `git add -A`.
- Data writes go through repositories/services (`src/repositories/`,
  `src/services/`) — never raw IndexedDB.
- Dev-only code: `import.meta.env.DEV` guard + dynamic `import()` (see
  `src/main.ts`), so it drops out of prod builds.
- Language (decision 2026-10-20): the product is Polish-first. Feature areas
  (`src/features/*`, rituals, Today, calendar) are written in Polish directly;
  English is maintained only where it already exists — exercises,
  questionnaires and shared components under `t()`/`tg()`. Keep `check-locales`
  green for those namespaces; do not add English for new feature UI.
- `src/services/` file names: `xxxService.ts` for side effects and
  orchestration, `xxxQueries.ts` for pure reads/projections, `xxxMutations.ts`
  for writes. No `.service.ts` infix.
- `src/features/<area>/` = a screen or area with its own css and view-models;
  `src/components/` = pieces shared between areas. New screens go to
  `features/`.
- Soft size ceiling: ~800 lines for a `.vue`, ~1 000 for a `.ts` (data files
  and seeds excepted). Split before adding to a file over the ceiling.
- Tests sit next to the code in `__tests__/`; `src/__tests__/` is only for
  cross-store integration and performance specs.
- The `?ui=legacy` interface and the month v2 experiment were removed on
  2026-10-20; Planning Next is the only UI.

## Design system

One visual language (sky lightness, tonal ladder, four weights, shape = role).
Any change to how something looks — new view, component, chip, chart, colour,
shadow, radius, font size — goes through the `design-system` skill:

- Read `src/design-system/README.md` first; use anatomies (`mg-v2-*`) and
  tokens (`--mg-*`), never literals (`#hex`, `rgb()`, px/rem `font-size`,
  `border-radius`, local `box-shadow`, `neo-*`, `rounded-*` other than
  `rounded-full`, `shadow-neu-*`, `text-[Npx]`).
- If the system lacks what you need, extend the SHARED layer (token role in
  `src/design-system/tokens.css`, anatomy in `base.css`, `Ds*`/`App*`
  component) and log the decision in `docs/design-decisions.md` — do not
  special-case a view.
- `npm run check:design-system` is a ratchet against
  `scripts/design-system-baseline.json`: a file may not gain violations. The
  PostToolUse hook in `.claude/settings.json` runs it on every edited file;
  fix the finding, don't add it to the baseline. Run `--update-baseline` only
  when debt went down.
- Judge every visual change on 5199 screenshots at 1512 × 982 @2x next to a
  sibling view. Rules and processes: `docs/design-system-governance.md`.

## Verifying features ("zweryfikuj X")

Use the `verify-app` skill. One command (`npm run dev:verify`) gives a seeded,
auto-logged-in instance on `127.0.0.1:5199`, fully isolated from real data.
Full guide: `docs/agent-verification.md`. Report bugs — don't fix them in the
shared tree. Never run seeds or destructive e2e against port 5173.

Judge layout ONLY at the canonical viewport 1512 × 982 CSS px, DPR 2 (the
user's real window; `CANONICAL_VIEWPORT` in `playwright.config.ts`). Never at
Playwright's 1280 × 720 default or at a width you picked yourself.

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

## Incidental findings

Bugs or ideas noticed while working on something else go to `docs/backlog.md`
(template and rules at the top of that file), not into an unrelated fix. Write
each entry as a full hand-off: repro, root cause with files and lines, why it is
a bug, proposed fix, acceptance criteria. Before fixing a backlog item, re-check
its line numbers and mark it `w toku`.

## Planning

For larger roadmaps, architecture plans, multi-step implementation plans, or
UI/data-flow plans, use the `html-plan` skill and write a standalone artifact
under `ideas/html-plans/<date>-<slug>.html`. Keep short/simple plans in chat.
