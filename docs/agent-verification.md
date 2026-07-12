# Agent verification environment

A repeatable, isolated environment for verifying app features against realistic
dummy data — designed so an agent (Claude Code) can launch it in one step, walk
real flows, and report findings without any risk to the real user's data.

## TL;DR

```bash
npm run dev:verify          # → http://127.0.0.1:5199, auto-logged-in + seeded
npm run test:e2e:verify     # Playwright smoke over the seeded instance
```

First page load on a fresh browser profile creates the account and seeds the
dataset (a few seconds); subsequent loads are instant.

## The verification account

| | |
|---|---|
| user id | `a0000000-0000-4000-8000-verify000001` |
| username | `verify-agent` |
| password | `verify-agent-123` (manual login works, but is normally not needed) |
| database | `MindfullGrowthDB_simplify_a0000000-0000-4000-8000-verify000001` |

Auto-login uses the existing dev bypass: `.env.verification` (loaded by
`vite --mode verification`) sets `VITE_DEV_AUTO_LOGIN_USER_ID`, and
`src/stores/auth.store.ts` logs that user in without a password — dev server
only (`import.meta.env.DEV`), never in prod builds.

Source of truth for the constants: `src/dev/verificationAccount.ts` (kept in
sync with `.env.verification` by `src/dev/__tests__/verificationAccount.spec.ts`).

## Isolation guarantees

- **Separate origin = separate IndexedDB.** The verification instance runs on
  `127.0.0.1:5199`; the real dev server runs on `5173`. IndexedDB is
  per-origin, so nothing here can touch real data. Regular flow e2e tests run
  on their own disposable origin `5183` (their `resetDatabase()` wipes ALL
  IndexedDB on whatever origin they run against — never point them at 5173).
- **Dev-only code.** The seed module (`src/dev/verificationSeed.ts`) is loaded
  via a dynamic import in `main.ts` guarded by `import.meta.env.DEV &&
  VITE_VERIFICATION_MODE === '1'` — statically eliminated from prod builds and
  inert under plain `npm run dev`.
- **Deterministic reset-then-seed.** Re-seeding always deletes the verification
  DB first, so repeated runs never accumulate duplicates.

## Seeding model

The dataset is generated **relative to the real "today"** using the app's own
period utilities, so the structure is identical on any date:

- 2 fully **closed months** (M−2, M−1): month plan with top-3 priorities,
  per-priority effort/verdict assessments, monthly reflection ratings.
- 8 fully **closed weeks**: week plans with top-3, day assignments, measurement
  entries (staggered met/missed), weekly reflection ratings, review notes.
- **Current month + current week: planning-only** (plans exist, reflections do
  not) — matching the app's gates: monthly reflection unlocks in the last 6
  days of a month, weekly reflection unlocks from Saturday. Near those dates
  the "locked" state flips; assert on past periods when it matters.
- Journal entries + emotion logs over the last ~5 weeks (midday-UTC
  timestamps; emotion ids come from the real catalog across all 4 quadrants).

Everything is written through the app's repositories and services
(`linkMeasurementPeriod`, `createWeeklyIntention`, `setMonthTopPriorities`,
`setWeekTopPriorities`, `setMonthlyPriorityAssessment`, structured-reflection
upserts) — never raw IndexedDB — so seeded state always satisfies domain
invariants.

### Dataset map (Polish content, mirrors real usage)

| Object | Contents |
|---|---|
| Life areas ×4 | Zdrowie, Praca, Relacje, Rozwój |
| Priorities ×4 (active) | „Regularny ruch i kondycja" (P1), „Dowieźć projekt Strumień" (P2), „Obecność dla bliskich" (P3), „Codzienna nauka" (P4); P1–P3 are every month's top-3 |
| Goals ×3 | „Przebiec 10 km bez zatrzymania" → P1; „Wydać MVP aplikacji" → P2; „Cel bez miesięcznego planu" (never month-linked → its KR renders as an orphan under „Pozostałe rezultaty") |
| Key results ×7 | „Biegi 3 razy w tygodniu" (weekly completion), „15 km tygodniowo" (weekly value/sum; month override 20 + one week override 8 in the current month), „Dwie funkcje miesięcznie" (monthly counter; week sub-targets on the current month's first two weeks), „Cztery sesje deep work w tygodniu" (weekly completion), „Średnio 7 godzin snu" (weekly value/average gte), „Utrzymać wagę poniżej 80 kg…" (weekly value/last **lte**, long title), „Rezultat bez aktywnego celu" (orphan) |
| Habits ×10 | „Poranne rozciąganie" (P1), „Wspólna kolacja" (P3), „Czytanie 20 minut" (P4) — fixed weekday assignments; „Poranna rutyna" (rating + entryDays min), „Granie wieczorem" (rating + entryDays max), „Poranna checklista" (weighted multi-completion, threshold 3/4), „Maksymalnie 10 kaw w tygodniu" (counter **max**), „Głębokie porządki" (monthly multi, boundary-week entries), „Ruch: 12 dni w miesiącu" (monthly completion target > 7, specific-days from the boundary week), „Prasa poranna (wycofane)" (retired, historical weeks only) |
| Trackers ×3 | „Jakość snu" (rating), „Kawy w ciągu dnia" (counter), „Wieczorne wyciszenie" (multi-completion, no target) |
| Monthly reflections | both closed months; the most recent one is **partial** (coherence + agency unrated → compass dots without a polygon) |
| Weekly intentions | 1–2 per week from a fixed list, priority-linked |
| Week top-3 | „Poranne rozciąganie" + „Cztery sesje deep work…" + that week's intention |
| Month top-3 | P1, P2, P3 (all three months) |
| Priority assessments | varied effort 2–4 and verdicts continue/adjust/pause (closed months only) |
| Journal ~16 / emotion logs ~26 | Polish entries, last ~5 weeks + today |

Details and exact patterns: `src/dev/verificationSeed.ts`.

## Launching

```bash
npm run dev:verify
```

- Runs `vite --mode verification --port 5199 --strictPort` — fails loudly if
  5199 is taken (either reuse the running instance or kill it first).
- Open `http://127.0.0.1:5199` — you land authenticated (no login screen).
- First load on a fresh browser profile/context seeds the dataset (~a few
  seconds, watch `[verificationSeed]` in the console); later loads skip
  seeding via a versioned localStorage marker.

### Re-seeding

From DevTools on the verification origin:

```js
await window.__verifySeed()                  // reset + seed + reload
await window.__verifySeed({ reload: false }) // reset + seed, no reload
```

Keep a **single tab** open while re-seeding — a second tab holds the database
open and blocks the delete. After changing the dataset in
`verificationSeed.ts`, bump `SEED_VERSION` so existing browser profiles
re-seed automatically on next load.

## Flows to walk

1. **Stream (Strumień)** — default calendar. `/calendar` lands on the current
   month; drill year → month → week → day:
   - year (`/calendar/stream/<YYYY>`): month cards with dimension bars,
     goal/habit rings, priority ribbon with effort rings on closed months;
   - month (`/calendar/stream/<YYYY-MM>`): week cards with the 4×3 reflection
     rating matrix;
   - week (`/calendar/stream/<YYYY-Www>`): day cards with journal dots,
     emotion segments, day rings.
2. **Monthly ritual** — `/calendar/month/<YYYY-MM>?action=reflect`. On a
   closed month (M−1): top-3 picks, per-priority effort/verdict, ratings, M4
   weekly↔monthly confrontation. On the current month: planning-only.
3. **Weekly ritual** — `/calendar/week/<YYYY-Www>?action=reflect`. `plan` and
   `days` steps always available (intentions, top-3, day assignments);
   reflection steps filled on closed weeks, locked on the current week.
4. **Today view** (`/today`) — scheduled objects with seeded entries.

Period refs must match the app's custom Monday-week scheme — compute them with
`getPeriodRefsForDate`/`getPreviousPeriod` from `src/utils/periods` rather than
formatting by hand (see `e2e/verification-smoke.spec.ts`).

## Rules for verification agents

- **Report bugs, do NOT fix them.** Verification usually runs against a shared
  working tree while other work is in flight. Collect findings (what, where,
  repro steps, expected vs actual, console errors) and report them; leave the
  code untouched unless the requester explicitly says otherwise.
- **Never run seeds, resets, or destructive e2e against port 5173** (or any
  origin whose data you don't own). The verification origin `127.0.0.1:5199`
  and the e2e origin `127.0.0.1:5183` are the only disposable ones.
- **Don't log in as the real user** or modify databases other than the
  verification one.
- Console noise matters: check DevTools for errors/warnings while walking the
  flows — a clean walk with dirty console is still a finding.

## Playwright

`playwright.config.ts` defines two projects:

- `chromium` (port 5183): destructive flow specs (journal, emotion log) —
  fresh user per test via UI signup + full IndexedDB reset.
- `verification` (port 5199): read-mostly smoke over the seeded instance
  (`e2e/verification-smoke.spec.ts`) — no reset, every fresh context
  self-seeds on first load.

```bash
npm run test:e2e          # both projects (starts both dev servers)
npm run test:e2e:verify   # verification smoke only
```
