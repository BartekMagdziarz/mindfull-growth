# Exercises on "Dzisiaj" — Suggestions, Repeats & Programs

> **Status (2026-07-04):** Design settled with the user (decisions D1–D6 below). This doc
> is the source of truth for surfacing exercises in the Today view via three mechanisms:
> daily micro-exercise suggestions (type 1), user-scheduled repeats (type 2), and guided
> multi-week programs / "ścieżki" (type 3). Implementation phased 1→3; nothing shipped yet.
>
> **Key architectural consequence of the Today-surface decision (D5):** all three types
> live in the Today wellness column (Zone A) as compact tiles, following the
> `JournalCard`/`EmotionCard` direct-store pattern. Zone B, `todayViewQueries`,
> `today.store` and the dormant initiative plumbing are **not touched**.
>
> **Self-sufficiency:** this doc is written so each phase can be planned and implemented
> in a fresh session from the doc + repo alone. §7 carries per-phase scope and
> "done when" criteria; **Appendix A** carries the as-is codebase anchors (patterns,
> files, symbols) discovered during design — start there before re-exploring. Line
> numbers are as of 2026-07-04 and may drift (concurrent sessions commit to `main`);
> symbol names are the durable reference.

## 1. Feature statement

Three ways the app proposes exercises to the user, all surfaced on "Dzisiaj":

1. **Micro-exercises** — 2–5 minute exercises (gratitude list, savoring, grounding, …).
   A daily rotating suggestion card. Mix of new micro content and existing exercises that
   already fit the duration (worry-tree, IFS daily check-in, self-energy 8C, positive-data
   log entry).
2. **Repeats** — after completing any exercise the user can schedule a repeat ("za 3 dni /
   tydzień / 2 tygodnie / miesiąc / własna data"). Due and overdue repeats surface on Today.
3. **Programs ("ścieżki")** — the user enrols in a curated sequence of existing exercises
   (e.g. a 4-week IFS path); the app feeds the current step to Today at the right pace.

## 2. Current state (as-is, abridged)

- **Exercise subsystem:** ~42 hand-authored exercises across 4 modalities
  (self-discovery / CBT / logotherapy / IFS). No shared `Exercise` interface — the catalog
  is the hardcoded template of `src/views/ExercisesView.vue` (lines 33–508); each exercise
  is a bespoke wizard component + own domain interface (`src/domain/exercises.ts`) + own
  Dexie table (33 tables) + own repository + own Pinia store. Only the 9 psychometric
  assessments are data-driven (`src/data/assessments/*.meta.json` +
  `src/services/assessments/registry.ts`), with `estimatedMinutes` and
  `retakePolicy`/`retakeEligibleAt`.
- **No unified completion signal:** "last completed" requires loading ~36 stores
  (`ExercisesView.vue` onMounted does exactly that).
- **No exercise metadata:** duration/difficulty/tags/repeatability are not modeled for
  bespoke exercises (only prose descriptions).
- **Today view** (`src/views/TodayView.vue`): 3-zone grid (168px wellness column / 360px
  planning sections / 1fr overview). Zone A already contains a **placeholder
  `src/components/today/ExerciseCard.vue`** ("exercisesComing", opacity 0.6). Zone A cards
  read stores directly in `TodayView.vue` (journal/emotion pattern, `:305-351`) and are
  date-scoped via the `dayRef` prop.
- **Planning layer:** no recurrence engine, no reminder/snooze/follow-up mechanism
  anywhere. Scheduling = per-period placement rows (month→week→day). A follow-up
  mechanism is net-new.
- **Foundation** (`src/services/foundationCompleteness.ts`): 6 coverage groups, item
  states `not-started/in-progress/completed/outdated` (180 days), routes per item — the
  closest thing to a guided path today.
- **Stream calendar day cards** (`src/components/calendar/stream/streamData.ts`,
  `streamModel.ts:102`): journal flag + emotion segments + goal/habit rings; exercises
  absent.

## 3. Gaps this design fills

1. **Exercise identity as data** — a catalog module so "exercise X" is referenceable by
   slug with metadata (duration, category, micro flag, suggested repeat interval).
2. **Unified completion log** — one indexed table answering "what was completed when"
   cheaply, for Today tiles, suggestions, auto-completing plans, and the stream calendar.
3. **A generic scheduled-exercise mechanism** — one plan entity covering both repeats and
   program steps.

## 4. Target architecture

### 4.1 Exercise catalog — `src/data/exerciseCatalog.ts` (new)

Static TS module (content versions with code, like assessments), one entry per exercise:

```ts
interface ExerciseCatalogEntry {
  slug: string                    // stable id, reuses route slugs ('worry-tree', 'erq', …)
  kind: 'wizard' | 'assessment' | 'micro'
  category: 'self-discovery' | 'cbt' | 'logotherapy' | 'ifs' | 'micro'
  route: string
  i18nKey: string                 // exercises.cards.<slug>
  icon: string                    // Material Symbols name
  estimatedMinutes: number
  micro?: boolean                 // eligible for the daily suggestion card
  suggestedRepeatDays?: number    // prefill for "zaplanuj powtórkę"
  aiAssisted?: boolean
  legacyTable?: string            // Dexie table holding this exercise's result records
                                  // (v23 completion-backfill source; absent for kind:'micro')
}
```

For `kind: 'assessment'` entries the backfill source is `assessmentAttempts`
(rows with `status === 'completed'`, slug = `assessmentId`) rather than a per-exercise
table.

Types in `src/domain/exerciseCatalog.ts`, data in `src/data/exerciseCatalog.ts`.
Existing exercises flagged `micro: true`: `worry-tree`, `daily-ifs-checkin`,
`self-energy`, plus "add one positive-data-log entry" as a micro entry point.

**Refactor rider:** `ExercisesView.vue` renders its cards from the catalog instead of
~450 hardcoded template lines. Single source of truth; a new tab `micro`
("Szybkie ćwiczenia") joins the existing four.

### 4.2 Unified completion log — table `exerciseCompletions` (new)

```
exerciseCompletions: 'id, exerciseSlug, dayRef, completedAt'
{ id, exerciseSlug, dayRef, completedAt, recordId?, source: 'standalone'|'plan'|'program' }
```

- Written by `src/services/exerciseCompletionService.ts` →
  `recordCompletion(slug, recordId?)`. Call sites: one line in each exercise store's
  `create*` action (mechanical, enumerated in Phase 1), and the assessment completion path
  in `useAssessmentSession.ts`.
- One-time backfill of historical completions from the 33 exercise tables inside the
  Dexie `version(23).upgrade` (local data, small volumes).
- `recordCompletion` also performs plan auto-completion (see 4.4) and program advancement
  (see 4.5).

### 4.3 Type 1 — micro-exercise engine (D1)

A small data-driven runner, NOT bespoke wizards per micro exercise:

- `MicroExerciseDefinition` in `src/data/microExercises.ts`: ordered steps of typed
  inputs — `textList` (n prompts), `textarea`, `slider`, `emotionPick` (reuses
  `EmotionSelector`), `breathTimer`, `info`.
- One table `microExerciseEntries: 'id, exerciseSlug, createdAt'` with a `responses`
  map (step key → value). One store, one repository.
- One host view `src/views/exercises/MicroExerciseView.vue` at
  `/exercises/micro/:slug` + `src/components/exercises/MicroExerciseRunner.vue`
  (dot indicators, `AppCard` steps, neo tokens — same look as existing wizards).

**Initial micro content (6) — step outlines** (final copy authored in Phase 1, EN/PL,
step keys map to `exerciseWizards.micro.<slug>.<step>.*`):

1. `gratitude-list` — info intro → `textList` (3 prompts: "za co jesteś dziś
   wdzięczny/a") → optional `textarea` (why the first one matters).
2. `savoring-moment` — `textarea` (best moment of the day) → `slider` (pleasantness
   0–100) → `textarea` (sensory details, to deepen the savoring).
3. `self-compassion-break` — Neff's 3-part structure as info+`textarea` steps:
   mindfulness (name what hurts) → common humanity → kind words to yourself.
   Tone consistent with `compassionate-letter`.
4. `grounding-54321` — guided `textList` sequence: 5 things you see → 4 you feel →
   3 you hear → 2 you smell → 1 you taste.
5. `box-breathing` — `breathTimer` (4-4-4-4, ~2 min) with optional `emotionPick`
   before/after (reuses the emotion-before/after convention from existing wizards).
6. `one-small-win` — `textarea` (today's small win) → `textarea` (what it says
   about you).

**Today surface:** the Zone A placeholder `ExerciseCard.vue` becomes "Ćwiczenie na dziś":
- Deterministic local suggestion (`src/services/exerciseSuggestion.ts`): seeded by
  `dayRef` (stable within a day), candidates = catalog entries with `micro`, ranked
  never-done first, then longest-ago (from `exerciseCompletions`), with category
  rotation; exclude done-in-last-3-days. "Pokaż inne" cycles deterministically
  (seed + offset). No LLM in v1.
- Card states: suggestion → done-today (checkmark + count of completions that day).

### 4.4 Type 2 — repeats: entity `ExercisePlanItem`

One plan entity covers repeats AND program steps (single mechanism, `source` field):

```
exercisePlanItems: 'id, exerciseSlug, dayRef, status, source'
{ id, exerciseSlug, dayRef, status: 'pending'|'done'|'skipped',
  source: 'manual'|'repeat'|'program', sourceRef?,   // program slug for source:'program'
  note?, createdAt, updatedAt }
```

Domain `src/domain/exercisePlan.ts`, repository, `src/services/exercisePlanService.ts`
(create / move / skip / auto-complete), store `src/stores/exercisePlan.store.ts`.

- **Scheduling UX:** after a save (`@saved` result state in host views) a shared
  `RepeatPlanPrompt.vue` chip row: za 3 dni / tydzień / 2 tygodnie / miesiąc / własna
  data; prefilled from `suggestedRepeatDays`. Assessments prefill from
  `retakeEligibleAt`; Foundation `outdated` items may suggest a refresh plan.
- **Overdue policy (D3):** `pending` plans with `dayRef < today` remain visible with a
  "zaległe" marker. `dayRef` is NOT rewritten daily — the query is
  `status === 'pending' && dayRef <= today`.
- **Auto-completion:** `recordCompletion(slug, day D)` finds the oldest pending plan for
  that slug with `dayRef <= D` and marks it `done` (+`recordId`). The user never ticks a
  plan manually.
- **Today surface (D5):** a new compact Zone A tile `PlannedExercisesCard.vue`
  ("Powtórki" / planned exercises): next due item + overdue badge; click deep-links to
  the exercise runner; secondary affordances (move/skip) in a small popover or on the
  exercises page — NOT a Zone B section, no `TodayItemRow` involvement.

### 4.5 Type 3 — programs ("ścieżki")

Static definitions + one enrollment entity; delivery rides on `ExercisePlanItem`.

```ts
// src/data/programCatalog.ts (+ src/domain/program.ts)
interface ProgramDefinition {
  slug: string
  i18nKey: string                 // programs.<slug>
  steps: Array<{
    exerciseSlug: string          // wizard, assessment or micro — catalog unifies them
    minGapDays: number            // min gap since previous step's completion (D2)
    optional?: boolean
    introKey?: string             // "why this step" guidance copy
  }>
}
```

```
programEnrollments: 'id, programSlug, status'
{ id, programSlug, status: 'active'|'completed'|'abandoned',
  startedAt, currentStepIndex,
  completedSteps: [{ stepIndex, completedAt, recordId? }] }
```

- **Pacing (D2): sequential unlock with minimum gaps**, not fixed calendar dates. A small
  `src/services/programSchedulerService.ts` runs on Today load: for each active
  enrollment, ensure the current step has a pending `ExercisePlanItem(source:'program')`
  dated at the earliest eligible day (`prevStepCompletedAt + minGapDays`). Idempotent.
  Completion (via auto-complete) advances `currentStepIndex`; last step → enrollment
  `completed`. A missed day shifts the schedule instead of breaking it.
- **Initial programs (from existing content, no new exercises needed):**
  1. "Poznaj swoje części" (IFS, ~4 weeks): parts-mapping → unblending → trailhead →
     protector-appreciation → exile-witnessing → self-energy → parts-dialogue.
  2. "Fundament samopoznania": walks the 6 Foundation coverage groups
     (`foundationCompleteness.ts`); the foundation build gate becomes the path finale.
  3. "CBT: myśli pod lupą": cognitive-distortions (learn) → thought-record ×3 (gapped) →
     core-beliefs.
- **UI:** "Ścieżki" tab in `/exercises`; program detail view (step timeline with states —
  visual pattern: `FoundationTile`/`FoundationProgressHeader`); enroll/pause/abandon.
- **Today surface (D5):** a Zone A tile `ProgramCard.vue`: active program name, step
  progress (n/m), current step CTA. Click → runner or program detail. Rendered only when
  an enrollment is active (like the intentions section pattern).

### 4.6 Today view — summary of changes

Zone A (wellness column) only:

1. `ExerciseCard.vue` placeholder → live "Ćwiczenie na dziś" (type 1).
2. New `PlannedExercisesCard.vue` tile (type 2) — rendered when any plan is due/overdue.
3. New `ProgramCard.vue` tile (type 3) — rendered when an enrollment is active.

All three read new stores directly in `TodayView.vue` (journal/emotion card pattern) and
respect the visible `dayRef` (historical days show that day's completions, no CTAs).
Zone B, Zone C, `todayViewQueries.ts`, `today.store.ts`, `todayViewActions.ts`: unchanged.

### 4.7 Stream calendar

`StreamDayVM` (`streamModel.ts:102`) gains `exerciseCount` (from `exerciseCompletions`
by `dayRef`); loaded in `loadStreamWeek` alongside journal/emotion; rendered as a small
chip in `StreamDayCard.vue`. Exercises start existing in day history.

### 4.8 Journal integration (deferred follow-up to D4)

Later: a section in the Journal edit view offering exercises whose results can be linked
to the entry (precedent: `WorryTreeEntry.journalEntryId`). Micro entries keep their own
records (`microExerciseEntries`) and link via `journalEntryId?` — they never become
journal entries themselves. Out of scope for phases 1–3; recorded here so the data model
keeps the door open (`recordId` on completions + optional `journalEntryId` on micro
entries).

## 5. Data model / Dexie

New tables only (no reshaping of existing rows). Schema lives in
`src/services/userDatabase.service.ts` (`class UserDatabase extends Dexie`); current
version is **22** as of 2026-07-04 — verify the latest `this.version(N)` before bumping.
One version bump per phase, matching trunk-based delivery:

- **v23 (Phase 1):** `exerciseCompletions: 'id, exerciseSlug, dayRef, completedAt'`,
  `microExerciseEntries: 'id, exerciseSlug, createdAt'` + upgrade backfilling
  completions from the legacy exercise tables (`legacyTable` per catalog entry, one
  completion row per record's `createdAt`) and from completed `assessmentAttempts`.
- **v24 (Phase 2):** `exercisePlanItems: 'id, exerciseSlug, dayRef, status, source'`.
- **v25 (Phase 3):** `programEnrollments: 'id, programSlug, status'`.

## 6. Settled decisions

- **D1 — Micro engine, not bespoke wizards.** Micro exercises run on one generic
  data-driven runner + one table. The 33-bespoke-tables pattern is not extended.
- **D2 — Sequential program pacing.** Program steps unlock by
  previous-completion + `minGapDays`; no fixed calendar dates, no catch-up debt.
- **D3 — Overdue repeats carry forward.** Pending plans stay visible past their date
  with a "zaległe" marker (deliberately different from measurement-day semantics).
- **D4 — Micro results are own records**, not journal entries. Follow-up (deferred): a
  Journal-view section offering exercises linkable to the current entry (§4.8).
- **D5 — Today placement: wellness column only** (user decision 2026-07-04). Types 1–3
  are compact Zone A tiles; type 2 and 3 do NOT get Zone B sections. Consequence: the
  Today measurement pipeline and the dormant initiative plumbing stay untouched.
- **D6 — One plan entity for repeats and programs.** `ExercisePlanItem` with a `source`
  discriminator; programs materialize steps as plan items instead of having their own
  delivery path.

## 7. Phasing

Each phase independently shippable and verified via the verify-app instance before
commit (seed additions + `SEED_VERSION` bump per phase).

### Phase 1 — identity + micro (type 1)

1. `src/domain/exerciseCatalog.ts` + `src/data/exerciseCatalog.ts`; refactor
   `ExercisesView.vue` to render from it (+ `micro` tab).
2. Dexie v23; `exerciseCompletionDexieRepository`, `microExerciseEntryDexieRepository`;
   `exerciseCompletionService` + `recordCompletion` call sites (exercise stores'
   `create*`, `useAssessmentSession`); backfill upgrade.
3. Micro engine: `src/data/microExercises.ts` (6 definitions + EN/PL content),
   `MicroExerciseRunner.vue`, `MicroExerciseView.vue`, route, store.
4. Today: live `ExerciseCard.vue` + `exerciseSuggestion.ts`.
5. Stream day chip (§4.7). Seeds: a few historical completions.

**Done when:** `ExercisesView` renders entirely from the catalog (incl. the new `micro`
tab) with no behavior change for existing cards; every exercise/assessment save writes
an `exerciseCompletions` row; the v23 backfill populated historical completions; the
Today card suggests a micro exercise (stable within a day, "pokaż inne" works), starts
it, and shows the done state; all 6 micro exercises playable end-to-end in PL and EN;
stream day cards show the exercise chip; seeded instance (5199) demonstrates all of the
above; gates green.

### Phase 2 — repeats (type 2)

1. Dexie v24; `src/domain/exercisePlan.ts`, repository, `exercisePlanService.ts`,
   `exercisePlan.store.ts` (incl. auto-complete wiring into `recordCompletion`).
2. `RepeatPlanPrompt.vue` mounted in host views' saved state (+ assessment results);
   prefill logic (`suggestedRepeatDays`, `retakeEligibleAt`).
3. Today tile `PlannedExercisesCard.vue` (due + overdue). Seeds: one due plan, one
   overdue plan.

**Done when:** every exercise's saved state (and assessment results) offers the repeat
chip row with correct prefill; created plans persist and surface on the Today tile on
their day; overdue plans stay visible with the "zaległe" marker; completing the exercise
auto-ticks the matching plan (no manual tick exists); move/skip work from the tile's
affordances; seeded due + overdue plans verified on 5199; gates green.

### Phase 3 — programs (type 3)

1. Dexie v25; `src/domain/program.ts`, `src/data/programCatalog.ts` (3 programs + EN/PL
   content), enrollment repository + store, `programSchedulerService.ts`.
2. UI: "Ścieżki" tab, program detail view (timeline), enroll/pause/abandon flows.
3. Today tile `ProgramCard.vue`. Seeds: one active enrollment mid-path.

**Done when:** the three programs are enrollable from the "Ścieżki" tab; the scheduler
idempotently materializes exactly one pending plan item for the current step at the
correct earliest-eligible day; completing the step's exercise advances the enrollment
(last step → `completed`); pause/abandon behave sanely (no orphaned pending plan items);
the program detail timeline reflects step states; the Today tile shows the active
program with step progress; seeded mid-path enrollment verified on 5199; gates green.

## 8. Content & i18n notes

- All new user-facing copy lands in parallel `src/locales/{en,pl}/` files
  (`npm run check-locales` guards parity); copy addressed to the user uses `tg()`,
  plurals `tp()`, arrays `tList()`.
- New namespaces: `exercises.cards.<micro-slug>`, `exerciseWizards.micro.<slug>.*`,
  `programs.<slug>.*`, `planning.today.wellness.*` extensions for the three tiles.
- Micro/program copy follows the existing PL terminology conventions (IFS canonical
  terms, gendered forms in both locales).

## 9. Deferred / open

- Emotion-aware suggestions (bias the daily pick by today's emotion-log quadrants) and
  AI-assistant integration for suggestion copy — v2 of `exerciseSuggestion.ts`.
- Journal-view exercise section with entry linking (§4.8).
- Streaks/badges for micro exercises (generic `computeStreak` exists in
  `src/utils/streaks.ts`, currently unused by exercises).
- Notifications/reminders outside the app — no notification surface exists app-wide;
  out of scope.
- Program authoring UI (programs stay code-defined for now).

## Appendix A — as-is codebase anchors (for fresh-session implementation)

Discovered during the 2026-07-04 design exploration. Symbol names are durable; line
numbers may drift.

### Today wellness column (Zone A)

- `src/views/TodayView.vue` — 3-zone grid, `grid-template-columns: 168px 360px 1fr`
  (Zone A is the narrow 168px column — tiles must be compact). Zone A template ≈ lines
  24–47: `TodayDateSwitcher` → `JournalCard` → `EmotionCard` → `ExerciseCard`
  (placeholder). Wellness cards are wired **directly to stores in the view script**
  (≈ lines 305–351, journal/emotion refs) — the pattern the three new tiles follow.
  The view is date-scoped via the `dayRef` prop (routes `today` / `today-day` in
  `src/router/index.ts`); tiles must respect the visible day (historical days: that
  day's completions, no CTAs).
- Placeholder to replace: `src/components/today/ExerciseCard.vue` (currently
  opacity 0.6, i18n `planning.today.wellness.exercisesComing` in
  `src/locales/{en,pl}/planning.json`).
- Visual reference for tiles: `src/components/today/JournalCard.vue` /
  `EmotionCard.vue` (`neo-raised`, radius 1.4rem, state empty/done, link-out).

### Exercise subsystem

- Hardcoded catalog to replace: `src/views/ExercisesView.vue` — 4 tabs
  (`self-discovery|cbt|logotherapy|ifs`), grid of `<ExerciseCard>` with per-card i18n
  keys/icons/routes/`ai-assisted`; `onMounted` loads ~36 stores + 9 assessments to
  compute per-card `lastCompleted` (replaced by `exerciseCompletions` after Phase 1).
- Card component: `src/components/exercises/ExerciseCard.vue`; category accents:
  `src/constants/exerciseColorRoles.ts` (`EXERCISE_CATEGORY_CLASSES` — extend for
  `micro`).
- Domain: `src/domain/exercises.ts` — one interface per exercise +
  `Create<X>Payload`/`Update<X>Payload` pairs; no shared base type (by design, stays
  that way — the catalog is the unifier).
- Store pattern (where `recordCompletion` hooks in): `src/stores/worryTree.store.ts` —
  setup store, `create*` action calls the repo; add the one-line completion call in
  each exercise store's `create*` (enumerate by grepping `src/stores/` for exercise
  stores). Assessments hook instead in `src/composables/useAssessmentSession.ts`
  (attempt-completion path).
- Host-view pattern (where `RepeatPlanPrompt` mounts): `src/views/exercises/*.vue`
  (34 files), e.g. `WorryTreeView.vue` — back button + wizard component, listens
  `@saved` → `store.create<X>`, past-entries list below. Wizards live in
  `src/components/exercises/*Wizard.vue` (dot indicators, `AppCard`, neo tokens — the
  look `MicroExerciseRunner.vue` should match).
- Repositories: interfaces `src/repositories/exercisesRepository.ts`, impls
  `src/repositories/exercisesDexieRepository.ts` (create = `crypto.randomUUID()` +
  ISO timestamps + `toPlain()` + `.add()`); for the new planning-adjacent entities
  follow `src/repositories/weeklyIntentionDexieRepository.ts`.
- Assessments engine (data-driven precedent for the micro runner):
  `src/domain/assessments.ts` (`AssessmentDefinition.estimatedMinutes`,
  `retakePolicy`, `AssessmentAttempt.retakeEligibleAt` — Phase 2 prefill),
  `src/services/assessments/registry.ts`, runner
  `src/views/exercises/AssessmentView.vue`.
- Routes: exercise routes block in `src/router/index.ts` (lazy host views) — register
  `/exercises/micro/:slug` and the program detail route there.

### Dexie schema

- `src/services/userDatabase.service.ts` — `class UserDatabase extends Dexie`; table
  fields typed `Table<T, string>` near the top; versions declared sequentially
  (`this.version(N).stores({...})`); **new tables need no `.upgrade`** (see v21/v22
  comments); reshape example with `.upgrade`: v19/v20. The 33 exercise tables are
  declared in the class field block — the source list for the v23 backfill (plus
  `assessmentAttempts: 'id, assessmentId'`).
- DB name: `MindfullGrowthDB_simplify_<userId>`; singleton `getUserDatabase()`.

### Foundation (program #2 + outdated→repeat suggestions)

- `src/services/foundationCompleteness.ts` — `FOUNDATION_ITEMS` (16 slots → group +
  route), `deriveState` → `not-started/in-progress/completed/outdated`
  (`FOUNDATION_OUTDATED_DAYS` = 180), `isFoundationBuildUnlocked`,
  `computeFoundationGroupProgress`; Big Five merged slot
  (`FOUNDATION_BIG_FIVE_VARIANTS`).
- Program-timeline visual pattern: `src/components/profile/FoundationTile.vue`,
  `FoundationProgressHeader.vue`, `FoundationPillarsGauge.vue`.

### Stream calendar

- `src/components/calendar/stream/streamModel.ts` — `StreamDayVM` (`dayRef,
  weekdayIndex, dayNumber, isToday, isFuture, journalWritten, emotionCount,
  emotionSegments, rings`) — add `exerciseCount`.
- `streamData.ts` — `loadStreamWeek(weekRef)` builds day VMs; follow the
  journal/emotion pattern (load store/repo, filter by day bounds, blank when
  `isFuture`). Render in `StreamDayCard.vue`.

### i18n

- Helper: `src/composables/useT.ts` — `t` (fallback EN→raw key), `tp` (PL 3 plural
  forms), `tg` (gendered `key.m`/`key.f` — variants must exist in BOTH `en/` and
  `pl/`), `tList` (arrays, elements may be gendered objects).
- Parity gate: `npm run check-locales` (`scripts/check-locale-keys.mjs`).
- Files: `src/locales/{en,pl}/exercises.json` (catalog chrome),
  `exerciseWizards.json` (step content — add the `micro.*` namespace),
  `planning.json` (`planning.today.*` — tile strings), new `programs.json` for
  Phase 3.

### Seeds & verification

- `src/dev/verificationSeed.ts` — `SEED_VERSION` (**2** as of 2026-07-04; bump per
  phase), `seedVerificationData()` creates entities via repos imported at top;
  deterministic only (no `Date.now()` randomness — helpers like `weekDays`,
  `isMet`); re-seed hook `window.__verifySeed()`.
- Verify on the isolated instance: verify-app skill / `npm run dev:verify`
  (port 5199, auto-login). Never seed or e2e against 5173 (real data).

### Conventions (from CLAUDE.md, restated for completeness)

- Gates before any commit: `npx vue-tsc --noEmit` (0 errors) + `npx vitest run`
  (green). Conventional commits, lowercase, straight to `main`.
- Concurrent sessions share this checkout: check `HEAD` before committing, stage
  explicit paths only (`git add <files>`), never `git add -A`.
- Data writes go through repositories/services — never raw IndexedDB.
