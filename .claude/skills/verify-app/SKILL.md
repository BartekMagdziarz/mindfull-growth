---
name: verify-app
description: Verify app features against the seeded, isolated verification instance (port 5199). Use when asked to "zweryfikuj X", "sprawdź czy X działa", "przejdź flow X", verify a deployment/feature, or exercise the app on dummy data without touching real user data.
---

# Verify the app on the seeded verification instance

Full reference: `docs/agent-verification.md` (account, dataset map, isolation
guarantees). This skill is the operational checklist.

## 1. Launch

```bash
npm run dev:verify
```

Run it in the background. It serves `http://127.0.0.1:5199` with
`--strictPort`: if the port is already taken, an instance is running — reuse
it instead of starting another. The first page load on a fresh browser
profile auto-creates the `verify-agent` account and seeds the dataset (a few
seconds, `[verificationSeed]` logs in the console); every load lands already
authenticated.

## 2. Drive the app

Two interchangeable options:

- **Browser (exploratory):** use claude-in-chrome against
  `http://127.0.0.1:5199`. Best for visual checks, new features, screenshots.
- **Playwright (scripted):** `npm run test:e2e:verify` runs the smoke suite
  (`e2e/verification-smoke.spec.ts`); extend it or write a one-off spec under
  the `verification` project for repeatable checks.

Compute period refs with `getPeriodRefsForDate`/`getPreviousPeriod` from
`src/utils/periods` — never format `YYYY-Www` week refs by hand (custom
Monday-week scheme).

## 3. What the seeded world contains

Relative to the real today: 2 fully closed months + 8 closed weeks (plans,
top-3, entries, reflections, assessments), current month/week planning-only,
journal + emotion logs over the last ~5 weeks. Key routes:

- stream: `/calendar/stream/<YYYY>` → `/<YYYY-MM>` → `/<YYYY-Www>`
- monthly ritual: `/calendar/month/<YYYY-MM>?action=reflect`
- weekly ritual: `/calendar/week/<YYYY-Www>?action=reflect`
- today: `/today`

Dataset object names (Polish) are listed in `docs/agent-verification.md` —
use them for assertions (e.g. habit „Poranne rozciąganie" is in every week's
top-3).

## 4. Re-seed when state gets dirty

DevTools console on the 5199 origin (single tab only):

```js
await window.__verifySeed()
```

After editing the dataset in `src/dev/verificationSeed.ts`, bump
`SEED_VERSION` there.

## 5. Report — don't fix

- Collect findings: what, where (route + component), repro steps, expected vs
  actual, console errors/warnings. Report them to the requester; do NOT patch
  app code in the shared tree unless explicitly asked to.
- NEVER run seeds, resets, or the flow e2e against port 5173 or `localhost` —
  only `127.0.0.1:5199` (verification) and `127.0.0.1:5183` (disposable e2e
  origin) are safe to mutate.
