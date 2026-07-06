# Planning ↔ Reflection Loop Redesign — Concept

> **Status (2026-06-13):** Phase-1 output of the discovery brainstorm (problem diagnosis +
> target process concept). Design decisions D1–D9 are settled with the user; the active
> design discussion is now the **weekly intention layer** (open sub-decisions 1a–1f in §10).
> This doc is the source of truth for the redesign direction.
>
> **Implementation progress:** scaffolding toward D1/D2 already shipped to `main` (commits
> `e9422ec`, `628f7aa`): reflection is now an inline mode of CalendarView; Review +
> Weekly-Recap steps removed (weekly = demands→actions→state→anchors→journal, monthly =
> ratings→anchors→journal); Plan-vs-Execution rings + create-plan CTA consolidated into the
> "Podsumowanie" Kontext card (week+month) as the future single ritual entry point;
> time-aware cards. The §2 "as-is" wizard description below is therefore partially stale —
> see the project memory note `planning-reflection-redesign` for the exact deltas.
>
> **Matrix redesign shipped (2026-07-03):** the weekly ratings are now an explicit
> 4-areas × 3-sections matrix (`src/domain/reflectionMatrix.ts`): wizard rating steps
> regrouped by life area (plan→days→review→body→emotions→tasks→closeOnes→anchors→journal),
> per-dimension display names dropped in favour of coordinates + per-cell questions/anchors,
> and the stream week card / month heatmap / Kontext card all render the matrix on a
> diverging rose↔sky scale with the Demands column value-inverted. See the D2 amendment
> in §7 — retrospective Demands ratings were retained (revising this doc's earlier claim).

## 1. Problem statement — why the current process "lacks something"

The app supports assigning goals/habits/trackers to days and rich reflection wizards, yet
planning and reflection feel disconnected and "rozliczenie" (accounting for a period) feels
shallow. Root causes identified:

1. **The loop is open at both ends.** Planning produces no intention that reflection could
   evaluate; reflection produces conclusions (`improvements`, `lookingAhead`, `carryForward`)
   that nothing ever reads again. Reflection can only compare numbers vs targets, because the
   plan carries nothing else.
2. **Planning is administration, not commitment.** Activating objects and assigning them to
   days is schedule CRUD. There is no moment of choosing *and giving up* — no top-3, no
   capacity check, no trade-offs. Without scarcity there is no real prioritization, and
   reflection can't distinguish "missed because deprioritized" from "missed because failed".
3. **Objects carry no per-period "why".** A goal has global `whyMatters`, but a habit
   assigned to a week is just a checkbox schedule. (The intuition already existed in the data
   model: `successNote` per month/week state and `PeriodObjectReflection` exist — but
   `PeriodObjectReflection` has **no UI at all** (loaded in query bundles, never read/written
   by components) and `successNote` only shows in `TodayItemCard`, never in reflection.)
4. **Quantitative tracking with no causal texture.** `DailyMeasurementEntry` holds only
   `value`. No miss reasons, no notes — so "Patterns I noticed" relies entirely on memory.
   Meanwhile the app already collects rich context (emotion logs, journal, people/context
   tags) but never joins it with execution; the Review step shows them side by side and the
   user must correlate in their head.
5. **No continuity thread.** The next reflection doesn't open with "last week you said you
   wanted to improve X — how did it go?". Reflections are isolated essays, not a conversation
   with yourself over time.
6. **Ritual without rhythm or place.** Reflection is manually triggered from a calendar card;
   planning lives elsewhere in the UI. The natural "close the week → open the next" moment
   doesn't exist as a flow.

Additionally, weekly and monthly **planning** are currently indistinguishable (both are
object-to-day assignment), while weekly and monthly **reflection** already differentiate well
(week = energy/actions/state; month = purpose/growth/coherence). Planning should mirror that
asymmetry.

## 2. Current state (as-is, abridged)

- **Objects:** Priority (annual), Goal (+`whyMatters`, `successDefinition`), KeyResult,
  Habit, Tracker, Initiative. No time-period links on base objects; presence of state
  records (`goalMonthStates`, `measurementMonthStates`/`WeekStates`,
  `measurementDayAssignments`) defines what's active when.
- **Planning UX:** Annual wizard (priorities/narrative/life areas) → Monthly planner
  (activate, assign to weeks/days, `targetOverride`, `successNote`) → Weekly planner
  (refinement) → Today view.
- **Tracking:** `DailyMeasurementEntry` (value only), Today view entry modes
  (completion/counter/rating/value); aggregation in `measurementProgress.ts`
  (`evaluationStatus: met/missed/no-data`), streaks/rates in `profileLLMAssistsHelpers.ts`.
- **Reflection:** `WeeklyReflectionWizard` (Review → Demands ×4 → Actions ×4 → State ×4 →
  6 anchors → freeform journal + AI summary/questions);
  `MonthlyReflectionWizard` (Review → Weekly Recap → Balance/Purpose/Growth/Coherence/Agency
  → 6 anchors → journal). Persisted in `weeklyReflections`/`monthlyReflections`.
  AI: `reflectionSummaryService.ts` (summary + deepening questions, EN/PL, gender-aware).
- **Existing weekly→monthly feed:** Weekly Recap step + `weeklyTrends`/`weeklyExcerpts` in
  the monthly AI context. **No reflection→next-plan feed of any kind.**

## 3. Target model: Month = direction, Week = commitment

|                    | Monthly planning                                   | Weekly planning                                  |
| ------------------ | -------------------------------------------------- | ------------------------------------------------ |
| Core question      | "What should matter to me this month, and why?"    | "What will I actually do this week, and when?"   |
| Decisions          | Portfolio (what's IN, what I consciously let go), month theme, target calibration, per-object "what success looks like" | Week's top 1–3 (from active objects now; from the month portfolio once it exists), week intention, day assignment, obstacle + if-then plan |
| Character          | Selection & meaning (strategic)                    | Realism & commitment (tactical)                  |
| Accounted for by   | Monthly reflection (per-object verdicts, Purpose/Coherence/Agency) | Weekly reflection (intention vs reality, weekly object flags, Actions/State) |

Today's object-to-day assignment doesn't disappear — it becomes the **last step of weekly
planning** instead of being the whole of "planning".

## 4. Capacity & calibration without forecasting (D6)

**Prospective Demands ratings were dropped.** Forecasting the four Demands dimensions at
week-open (esp. emotional intensity and close ones' needs) asks the user to predict things
they genuinely can't, so they'd "mark anything" — noise, not signal. Consequences:

1. **The realism mechanism is the soft top-3 limit itself** (D3) — choosing ≤3 priorities is
   the capacity check, instead of a demands forecast.
2. **Calibration without AI moves to top-3 hit-rate over time** — "you complete ~1.5 of 3
   priorities on average → maybe pick 2 next week" is locally computable and needs no
   forecast. (Replaces the dropped "expected vs actual demands" calibration.)
3. **Intention accounting is qualitative** — reflection confronts last week's *intention +
   top-3* with actual execution, not expected-vs-actual demands numbers.

Month-level analog (unchanged): monthly reflection rates Balance/Purpose/Growth/Coherence/
Agency; monthly planning can ask "which of these do you want to move this month?" → becomes
the month theme (or seeds it).

## 5. The full loop

- **Month frames weeks:** the weekly wizard opens with month context (theme, portfolio,
  "week 2 of 4, here's where targets stand"). Week top-3 is chosen from the month portfolio.
- **Weeks feed the month:** existing Weekly Recap + new lightweight per-object "works /
  grinds" flags raised during weekly rituals feed the monthly verdicts.
- **Reflection feeds the next plan — DROPPED (2026-06-21, roadmap L3).** The forward-feed idea
  (weekly `improvements`/`lookingAhead` → next-week suggestions; verdicts → next-month portfolio)
  has no backing data — those anchors were removed (D2/1c) and never persisted. Loop closure is
  carried solely by the **confrontation/continuity thread** (next bullet), which is shipped for the
  week. No write-only forward fields are added.
- **Continuity thread:** every reflection opens by confronting the previous period's
  intention and top-3 with what actually happened.

## 6. Rituals

### 6.1 Weekly transition ritual (~12–15 min, one flow: close → open)

**Close the week (retrospective):**
1. **Confrontation** (1–2 min) — last week's intention & top-3 next to actual execution.
   (Empty/skipped on the very first week — nothing to confront yet.)
2. **Object flags** (1 min, D7) — for **weekly-cadence objects only**: a light 3-state flag
   (went well / ok / grinds) + an optional one-line reason. The reason line is where
   "why it didn't happen" lives (replaces the dropped daily miss-note, see §10). Feeds the
   monthly verdicts.
3. **Matrix ratings** (2–3 min, revised 2026-07-03) — the 4×3 rating matrix
   (life areas × Demands/Actions/State), grouped **by area**: four steps
   (body → emotions → tasks → close ones), each asking the area's three questions in
   causal order demand → action → state. Cells have no standalone names — a cell is
   identified by its coordinates ("Stan · Zadania"); question texts + 1–5 anchors carry
   the semantics. `calmRating` is reinterpreted as "on top of tasks / not overwhelmed"
   (field name kept). Shipped: `src/domain/reflectionMatrix.ts` + area steps in
   `WeeklyReflectionWizard`; week cards/heatmaps render the matrix with a diverging
   rose↔sky scale (Demands column value-inverted so rose = strain everywhere).
4. **Anchors + journal** (2–3 min, slimmed: ~3 anchors with optional "expand more"; AI
   optional) — with AI summary as today.

**Open the next week (prospective):**
5. **Week intention** (1 min) — one short free-text field "what should this week be about?",
   optionally pre-filled from last week's `lookingAhead`/`improvements` (sub-decision 1c).
6. **Top 1–3** (1–2 min) — pick ≤3 priorities from the week's active objects (soft limit,
   exceedable with a gentle warning).
7. **Day assignment** (1–2 min) — existing mechanic, now the last placement step.
8. **Obstacle + if-then plan** (1 min) — optional, single implementation intention.

~~Retrospective Demands ratings are gone (D6): the confrontation in step 1 carries the
"plan vs reality" weight, qualitatively, against last week's intention + top-3.~~
**Corrected (2026-07-03):** retrospective Demands ratings stay (see the D2 amendment in
§7) — they are the Demands column of the matrix in step 3. The confrontation still
carries plan-vs-reality qualitatively; it just doesn't replace the load ratings.

**Data review:** the old 7-day grid step was removed when `WeeklyReviewDayCards` was deleted;
if a review surface is wanted back in the ritual it must be revived from git history.

**First build (re-sequenced — see §10):** the "open the week" capture half (steps 5 + 6:
intention + top-3/challenges) comes FIRST — confrontation (step 1) and flags (step 2) can't
be built until a prior week's intention exists to confront. If-then (8) is dropped from MVP
(1e); anchor slimming (4) and the intention/lookingAhead overlap (1c) are later passes.

### 6.2 Monthly ritual (longer, strategic)

1. Month review + Weekly Recap (as today).
2. **Per-object verdicts** — each portfolio object gets *continue / adjust / pause / drop*
   + one-sentence reason, fed by execution data, weekly flags, and previous verdict history
   ("this target was missed 3 months in a row — lower it?"). Revives `PeriodObjectReflection`.
3. Balance/Purpose/… ratings + anchors + journal (as today).
4. **Open next month** — verdicts roll into the new portfolio, theme selection, target
   calibration, explicit "consciously letting go" (OUT) list.

### 6.3 Boundary weeks

When a week ritual coincides with a month boundary, chain: close week → close month → open
month → open week. UX for this chain (length, skippability) is an open topic.

## 7. Settled design decisions

- **D1 — One flow.** Weekly ritual is a single "transition to the new week" wizard
  (reflection flows into planning). Not separate entry points.
- **D2 — Slim the reflection to fit ~12–15 min.** Anchors 6 → ~3 with optional expansion;
  ~~retrospective Demands replaced by confrontation with prospective ones~~; AI steps optional.
  **Amended (2026-07-03):** retrospective Demands ratings STAY — as the Demands row of the
  4-areas × 3-sections rating matrix (body/emotions/tasks/close-ones ×
  demands/actions/state, see the matrix amendment under §6.1 step 3). The original
  replacement mechanism ("confront actuals against the prospective forecast") evaporated
  when D6 dropped the forecast, and the intention/top-3 confrontation measures plan
  execution, not load — Demands is the load context that makes Actions/State interpretable.
  The confrontation step remains, but no longer replaces Demands. D6 itself is unchanged:
  still no prospective Demands forecast at week-open.
- **D3 — Soft limit + explicit OUT.** Top-3 per week as the norm, exceedable with a gentle
  warning; month plan has an explicit "consciously letting go" section. Selection is
  visible, but the user rules.
- **D4 — Verdicts live monthly; weeks raise flags.** Full verdicts
  (continue/adjust/pause/drop + reason) only in the monthly ritual; weekly ritual only
  quick "grinds" flags that feed the monthly decision. Weeks stay light.
- **D5 — Build order: weekly layer first.** Start with the weekly intention layer + weekly
  object flags before any monthly portfolio/verdict work. The detailed weekly content is the
  active discussion (§10, sub-decisions 1a–1f).
- **D6 — Drop prospective Demands.** No multi-dimension demands forecast at week-open
  (unforecastable → noise). Realism = the soft top-3 limit; calibration = top-3 hit-rate over
  time. See §4.
- **D7 — Weekly flags cover weekly-cadence objects only.** Monthly-cadence objects have no
  meaningful weekly verdict, so the weekly flag step lists only weekly-cadence active objects.
- **D8 — Miss-reasons are retrospective, not a daily field.** A completion "miss" is the
  *absence* of a `DailyMeasurementEntry`, so there's no daily-tracking hook to attach a reason
  to. Reasons are captured retrospectively as the optional one-line note on the weekly object
  flag (D7). No note field is added to `DailyMeasurementEntry`. (Resolves the former §10
  "micro-capture at tracking time" item.)
- **D9 — Existing planners stay as ad-hoc edit mode.** The guided ritual is the primary path;
  the monthly/weekly planner grids remain for quick edits outside the ritual.
  **Amended (2026-07-04):** the *monthly* ad-hoc editor edits **portfolio + week placement +
  targets — not days**. Its day-cell calendar was replaced by week rows (§13): objects are
  placed onto weeks or the whole month; existing day assignments render read-only per week
  ("2 dni (wt, czw)"). Day assignment is exclusively the weekly ritual's "days" step, closing
  the month/week overlap §3 diagnosed (both grids were editing the same shared
  `MeasurementDayAssignment` rows from two places).

## 8. Mapping to the existing data model (reuse, not rebuild)

- `WeekPlan` / `MonthPlan` (already first-class records) gain intention fields: `WeekPlan`
  → intention text + top picks (subject refs) + one obstacle/if-then; `MonthPlan` → theme,
  success criteria, focus dimension, OUT list. (No expected-demands field — D6.)
- `PeriodObjectReflection` (currently dead) becomes the verdict/flag record. Weekly flags
  (D7) = same entity at `periodType: 'week'` with a light 3-state flag + optional reason;
  monthly verdicts = `continue|adjust|pause|drop` enum + reason. Decide one entity with a
  nullable verdict vs. a separate lighter weekly-flag shape during weekly-layer design.
- `successNote` (measurement month/week state) surfaces in both the planning step ("what
  success looks like") and the reflection confrontation step.
- `reflectionSummaryService.ts` payload gains intention/plan context (intention, top-3,
  top-3 hit-rate, weekly flags, verdict history) for both summary and questions.
- Calibration metrics (top-3 hit-rate over time, verdict streaks) are computable locally —
  AI is narration on top (consistent with "core works without AI").

## 9. The three meanings of "rozliczenie" and where they live

- **Intentions vs reality** → weekly ritual (confrontation step).
- **Per-object verdicts** → monthly ritual (verdict step + history).
- **Learning from patterns** → cross-cutting: top-3 hit-rate calibration, verdict history,
  emotion↔execution correlations; core computed locally, AI adds narrative + questions.

## 10. Weekly intention layer — resolved (round 3) + first build

**Greenfield fact:** `WeekPlan`/`MonthPlan` are currently empty records (just `weekRef`/
`monthRef` + base). Plan fields are added directly — no migration for them.
**Ripple fact:** `MeasurementSubjectType = 'keyResult'|'habit'|'tracker'`; its literals appear
in ~61 files (`subjectType` in ~69) — this governs the cost of a new object type (see 1b).

Two distinct concepts (round-3 clarification):
- **Weekly intention** = a lightweight, week-scoped measurable object (formerly called
  "challenge" — now one term). Behaves like a KR/habit: same `entryMode` + target, assignable
  to the whole week or specific days, tracked via the normal pipeline. Auto-lives ONLY in the
  week it was created (no carryover). Example: "wake up ≥5× at 6am this week."
- **Top-3** = a separate prioritization layer chosen at the end of planning: ≤3 picks across
  {active KRs, active habits, weekly intentions} = what you want delivered this week. Drives
  the reflection's accounting focus. Stored as refs on `WeekPlan` (`topPriorities`).

Resolutions on the sub-decisions:

- **1a — top-3 = ≤3 picks across active KRs + habits + weekly intentions; NO cadence
  restriction.** The earlier weekly-cadence-only limit existed for clean auto met/missed;
  since accounting moved to a free-text comment (1d), that reason is gone. Weekly-cadence
  objects + intentions read cleanest ("delivered this week?"); monthly-cadence show partial
  progress; the comment covers the rest qualitatively.
- **1b — weekly intention is its own (week-scoped) object. RESOLVED → option (B).**
  Same `entryMode`/target/day-assignment as a habit, maximally easy to create, auto-expires
  with its week. The A/B representation decision is **settled as (B)** after checking the
  codebase: `subjectType` branching is NOT compiler-guided (zero `assertNever`/`: never`
  guards; only 4 switches, the rest scattered `=== 'habit'`/`'tracker'` string compares), so
  a new subjectType (A) would be a ~60-file manual hunt with silent-miss risk and no compiler
  safety net.
  - **(B, chosen) Flavored habit with `weekScope: WeekRef`** — `subjectType:'habit'`, so it
    hits every existing `'habit'` branch unchanged (tracking/target/day-assignment/met-missed
    for free). New logic = only a `weekScope` filter on the few surfaces that list habits
    *outside* their week (library/picker for other weeks, monthly views, profile payload).
    Product-wise still a distinct thing (own light creation flow, "Intencja tygodniowa" label,
    week-locked); only the storage reuses the habit pipeline. Accepted cost: `habits` table
    accumulates ephemeral rows over time (nothing is deleted —
    [[planning-historical-vs-forward-visibility]]), trivially filterable via `weekScope`;
    promote to a first-class type later if it ever warrants it (ideally once exhaustiveness
    guards exist).
  - *(A) New subjectType `'weeklyIntention'`* — rejected for v1: cleanest model + pure
    `habits`, but the ~60-file ripple is unguarded by the compiler here.
- **1c — DROPPED.** No soft free-text week intention at all (see 1f). The week is purely
  concrete (intention-objects + top-3); the soft "theme/direction" narrative lives at the
  MONTH level — this sharpens the month=direction / week=commitment split.
- **1d — per-object free-text COMMENT, not flags (for now).** In the weekly reflection, add a
  short comment to selected objects/intentions. Collect real usage for a few weeks, then
  maybe derive a flag taxonomy from actual patterns. Revives the dead `PeriodObjectReflection`
  (its `note` field exists, just needs UI). "Target was wrong" lives in the comment until it
  proves frequent enough to become the first flag.
- **1e — DROPPED from MVP.** No if-then/implementation-intention step.
- **1f — soft intention step dropped; first build = the "open the week" capture half**
  (re-sequenced: confrontation can't be first — nothing to confront until a prior week's
  plan exists; capture-first also gives immediate daily tracking value).

### First build scope (the "Plan the week" flow)

- **Entry:** "Zaplanuj tydzień" action on the week's "Podsumowanie" Kontext card; opens inline
  (same pattern as reflection — form replaces grid, summary stays below).
- **Step 1 — (optional) create weekly intentions:** lightweight object with `entryMode` +
  target, assignable to the week or specific days; auto-scoped to this week only.
- **Step 2 — pick top-3:** ≤3 across active KRs + habits + weekly intentions (no cadence
  restriction), soft cap with a gentle warning past 3. → `WeekPlan.topPriorities` = array of
  `{subjectType, subjectId}` refs (ref shape depends on the A/B decision).
- **Surfacing in Today:** weekly intentions render as normal tracked objects (day-assigned);
  top-3 gets at most a subtle badge — **no separate top-3 section** (its real use is the
  weekly accounting, per user).
- **Out of first build (→ later builds):** confrontation step (top-3 vs execution: objects
  from data, intentions from progress), per-object comment (`PeriodObjectReflection.note`),
  folding day-assignment into this flow, anchor slimming.

## 10b. Deferred topics (later phases)

- Boundary-week chained ritual UX (length, partial completion, skipping).
- Joining the silos: tagging journal entries / emotion logs with goals/habits; local
  correlation analytics (e.g. low-Calm weeks vs habit completion). **Deferred** (orthogonal
  to loop closure, larger data-model change).
- Calibration analytics surface: where does the top-3 hit-rate insight show up?
- Ritual rhythm: end-of-week nudge/trigger, what "due" looks like, streaks for the ritual.
- Initiatives: where do they fit in the portfolio / top-3 model?
- AI extensions: intention suggestions from last reflection, plan-overload flagging,
  multi-period pattern narration.

## 11. Non-goals (for now)

- Annual planning changes (priorities/narrative wizard stays as is; month portfolio links
  to existing Priorities).
- Rebuilding tracking UX or entry modes.
- Automatic plan mutation by AI — AI suggests, user decides.

## 12. Monthly priority-focus layer — top-3 + effort + verdicts (resolved 2026-06-21)

The redesign gave the month a **portfolio + per-object verdicts + theme + OUT** model (§3, §6.2)
but never a **monthly top-3 focus layer** mirroring the week's. This section fills that gap.
It is the month-level analog of the weekly intention layer (§10), but pitched at the *strategic*
altitude the month owns: the focus picks are **annual Priorities**, not measurement subjects.

### 12.1 Resolved decisions (M1–M3)

- **M1 — The monthly top-3 is over annual `Priority` objects**, not measurement subjects. At
  month-open the user picks ≤3 of their **active Priorities** (status `active` ∧ `years` includes
  the month's year; ≤5 active globally, so the pool is small). This is deliberately *different*
  from the weekly top-3 (which is KRs/habits/intentions) — week = which deliverables; month =
  which strategic directions. The user's own wording made the distinction ("obiekty" for the week,
  "priorytety" for the month).
- **M2 — Effort is a subjective 1–5 self-rating per Priority**, not derived from execution data.
  Priorities are qualitative containers (no `target`, not a `MeasurementSubjectType`), so there is
  nothing to auto-evaluate. In monthly reflection the user rates *their own effort/engagement*
  toward each **active** Priority; the chosen top-3 are the ones they especially want to score
  highly on. (Rolled-up execution of objects linked via `priorityIds` MAY be shown as read-only
  context later — enrichment, not v1.)
- **M3 — Full ritual: top-3 + effort + verdict together.** The monthly review step rates each
  active Priority on (a) effort 1–5, (b) verdict `continue|adjust|pause|drop` (§6.2 / D4), and
  (c) an optional one-line reason. Top-3 picks are starred. This finally revives the dead
  `PeriodObjectReflection` for its intended purpose (§8) — but keyed to Priorities.

### 12.2 How it composes with the existing month model

The Priority **is** the portfolio object. So:
- **Portfolio** (§3) = the set of active Priorities for the month (already derivable).
- **Top-3** = the focus subset the user commits to (new: `MonthPlan.topPriorityIds`).
- **Verdict** (§6.2 step 2) = `continue|adjust|pause|drop`, now attached to a Priority.
- **Effort** (new) = the subjective accountability axis the doc lacked — it makes the month mirror
  the week's "top-3 → confrontation" loop.
- **OUT list / theme** (§6.2) stay as separate future work; a `pause`/`drop` verdict is already a
  lightweight "letting go" signal, so the explicit OUT list can wait.

### 12.3 Data model (reuse, minimal new shape)

1. **`MonthPlan.topPriorityIds?: string[]`** — ≤3 Priority IDs (soft limit, exceedable with a
   gentle warning at the app layer, like the weekly `SOFT_LIMIT`). A plain ID array, **not** a
   `{subjectType, subjectId}` ref, because the subject is always a Priority — this avoids the
   `MEASUREMENT_SUBJECT_TYPES` constraint baked into `normalizeTopPriorities`. New
   `normalizeMonthTopPriorityIds()` (array of trimmed non-empty strings) wired into
   `normalizeMonthPlanPayload` (planningState.ts:423). *(If a mixed portfolio is ever wanted,
   switch to a ref shape then.)*
2. **`PeriodObjectReflection` extended** (planningState.ts:98) to carry the assessment:
   - add `'priority'` to `ReflectionSubjectType` (line 20) + `REFLECTION_SUBJECT_TYPES` (line 179);
   - add `effort?: number | null` (integer 1–5) + `normalizeEffort()`;
   - add `verdict?: 'continue' | 'adjust' | 'pause' | 'drop' | null`;
   - make `note` **optional** (currently required via `normalizeTrimmedText`) so a row can carry
     just effort/verdict. A row is deleted only when note **and** effort **and** verdict are all
     empty — update the weekly delete-on-empty path in `useWeeklyReflectionWizard` accordingly.
   - `assertReflectionSubjectExists` (reflectionDexieRepository) gets a `'priority'` branch →
     `priorityDexieRepository.getById`.
   - **No Dexie migration** — these are non-indexed fields on an existing table; the composite
     index `[periodType+periodRef+subjectType+subjectId]` already covers `subjectType:'priority'`.
3. **Services** (mirror `weeklyIntentionService`):
   - `setMonthTopPriorities(monthRef, priorityIds)` — lazy upsert `MonthPlan` (copy of
     `setWeekTopPriorities`).
   - `setMonthlyPriorityAssessment(monthRef, priorityId, { effort, verdict, note })` — upsert/
     delete the `PeriodObjectReflection` row (`periodType:'month'`, `subjectType:'priority'`).
   - `getActivePrioritiesForMonth(monthRef)` — extract the existing filter from
     `usePlannerState.ts:366-374` (status `active` ∧ `years` ⊇ month's year), sorted by `order`.
4. **`getMonthlyReflectionDataBundle`** (reflectionDataQueries.ts:1147) loads: active Priorities +
   `MonthPlan.topPriorityIds` + existing month `PeriodObjectReflection` rows → exposes a
   `priorityItems: { priority, isTopPriority, effort?, verdict?, note? }[]` for the review step
   (this bundle currently loads zero per-object data for the month).

### 12.4 UX

- **Pick the top-3 (planning, month-open). DECIDED 2026-06-21 = full "Zaplanuj miesiąc" ritual**
  (not the inline card picker). Mirror the weekly unified-wizard pattern *in the monthly wizard*: a
  `priorities` planning step (intro framing + ≤3 picker over active Priorities), date-gated so the
  reflection steps stay locked until month-end. Entered from `MonthKontextCard`; persists via
  `setMonthTopPriorities`. (The lightweight card picker was the cheaper alt — rejected.)
- **Rate effort + verdict (reflection, month-close).** New **"priorities review"** step in
  `MonthlyReflectionWizard` (currently `ratings → anchors → journal`), inserted first. Lists active
  Priorities, stars the top-3, each row: effort 1–5 control + `continue/adjust/pause/drop` picker +
  optional reason. Generalize `ReflectionObjectReview.vue` (today weekly-only, renders
  `WeekObjectItem`) to accept a priority item, or build a sibling. Effort control can reuse the
  `ReflectionDimensionRatings` 1–5 face/scale.
- **Today/stream badge** for monthly top-3 is **out of v1** — its value is the accounting, not a
  surface (same call the user made for the weekly top-3).

### 12.5 AI payload

`ReflectionSummaryContext.priorities: ReflectionPriorityLine[]` already exists and is serialized
into a `[PRIORYTETY]/[TOP PRIORITIES]` section, but the **monthly** wizard never populates it
(`MonthlyReflectionWizard` `summaryContext` omits `priorities`). Populate it from `priorityItems`,
extending `ReflectionPriorityLine` with `effort?` + `verdict?` (additive; weekly keeps working).
Gender/locale infra (`tg()`, `SECTION_LABELS`) is ready.

### 12.6 Build order

- **M-A (pick layer):** `MonthPlan.topPriorityIds` + normalizer + `setMonthTopPriorities` +
  `getActivePrioritiesForMonth` + the "Zaplanuj miesiąc" ritual planning step + `monthlyPlanning.*`
  i18n. Ships the commitment half on its own. *(Data + services SHIPPED 2026-06-22; UI pending.)*
- **M-B (assessment layer):** `PeriodObjectReflection` extension (`'priority'`, `effort`,
  `verdict`, optional `note`, assert branch) + monthly review step + persistence + bundle load.
  Ships effort + verdicts.
- **M-C (AI + history):** populate `summaryContext.priorities`; later, top-3 hit-rate / effort
  trend across months (joins `MonthPlan.topPriorityIds` × prior `PeriodObjectReflection`).

### 12.7 Risks / open

- **`ReflectionSubjectType += 'priority'` ripple.** Grep all usages + every `switch`/`===` on it
  (the union is not exhaustiveness-guarded — §10 1b). Mostly string compares; contained but must be
  swept, esp. `assertReflectionSubjectExists` and any reflection-bundle mappers.
- **`note` → optional ripple.** The weekly per-object comment path deletes a row when the note is
  cleared; that delete must now also check effort/verdict are empty.
- **"Active in month" is year-derived only** (no per-month pause for Priorities). Pausing a Priority
  mid-year drops it from the pool — acceptable for v1.
- **Open UX choice:** Kontext-card inline picker (recommended, cheap) vs. a full "Zaplanuj miesiąc"
  ritual (doc-aligned, larger). M-A assumes the former.

### 12.8 Reconciliation with prior monthly plans (there is no separate one)

Checked for a pre-existing monthly *implementation* plan analogous to the weekly one: **none
exists.** No monthly branch; no monthly UI audit (the weekly work has
`docs/weekly-planning-steps-design-audit.md`, but there is no monthly counterpart); no
monthly-wizard/portfolio/verdict code (`MonthPlan` is bare, `MonthlyReflectionWizard` is still
`ratings→anchors→journal`). The monthly layer was always "the big remaining piece" — its only prior
specification is **§6.2 + D4 + §10b here**, which §12 extends consistently (§12.2).

But §12 must stay aligned with **one adjacent, already-shipped artifact**: the 3-row **stream
calendar** (`docs/calendar-3row-design-brief.md`, now the live "Strumień" view —
[[stream-calendar-view]]). That brief is the *display* side; §12 is the *producer*. Its data
inventory (brief §"Inwentarz danych", "Wkrótce — redesign planowania") already reserves slots to
surface:
- **monthly per-object verdicts** `kontynuuj / dostosuj / wstrzymaj / porzuć` ("pasek werdyktów",
  "churn portfela" — brief line 66) → **use these exact PL labels** as the i18n for §12's
  `continue/adjust/pause/drop`. Already aligned; just reuse them.
- **month theme** (krótka etykieta — brief line 65) → stays separate/future (§12.2 leaves the
  theme/OUT list out of v1; a `pause`/`drop` verdict already signals "letting go").
- the weekly **top-3** as a candidate main calendar metric ("x/3 dotrzymane" — brief line 63).

Merge actions:
1. **New display signal the brief predates.** §12 adds a *monthly top-3 over Priorities* + *effort*
   that the brief's data inventory and month-tile dimension (brief lines 62–66, 72) do **not** list.
   Add a candidate month-tile signal **"x/3 priorytetów"** + an effort micro-print, exactly
   analogous to the weekly "x/3 dotrzymane". Surfacing target = stream **month tile** +
   `StreamDetailPanel` (which already loads `MonthPlanningBundle`/`monthHasPlan`). This is the
   month analog of the weekly top-3 badge we deferred — out of §12 v1, but it is where M-C/“later”
   lands, not a new mechanism.
2. **Stale slot in the brief.** Brief line 64 ("prognoza Wymagań → kalibracja") is obsolete per
   **D6** (prospective Demands dropped); the month has no Demands forecast — its comparative axis is
   the 5 monthly dimensions + (now) effort/verdict. Flag when that brief is next revised.

Net: nothing to "merge back" — §12 is the missing producer for display slots the stream brief
already anticipated, plus one new signal (monthly top-3 + effort) to add to that brief's inventory.

> 2026-07-06: targets gain an optional `entryDays` presence condition (`{operator: min|max, value}`, AND-evaluated, opt-in) — design settled in the local HTML plan `ideas/html-plans/2026-07-06-measurement-min-entry-days.html`. P1 SHIPPED same day: all three target shapes carry the field, both normalizers (planning.ts + planningState.ts) validate it (int ≥ 1, stripped for completion), `buildMeasurementSummary` evaluates the conjunction and exposes `primaryMet`/`presenceMet`/`qualifiedEntryDays` (counter days qualify only with value ≥ 1; zero entries stay no-data), the target-sentence editor grows an "i loguj [co najmniej|co najwyżej] N dni" clause ("+ warunek dni", clearing the value removes it), summaries append "· ≥/≤ N dni", the ContextChip appends "x/N dni". P2 SHIPPED same day: PlannerTargetControls edits the condition on the month override (add "+ dni" / min–max / remove, gated off completion rows), PlannerWeekTargetPill grows a day-count sub-input (week overrides in both planners; month pill adjusts the month override), "Rozłóż równomiernie" splits entry days across placed weeks alongside the value (weeks whose share is 0 get no condition), and the weekly reflection review grid shows a red "why missed" one-liner (metric met / not enough days / limit exceeded / both) from primaryMet/presenceMet.

## 13. Week targets — per-week override + month-target rozpisanie (resolved 2026-07-04)

Companion to the D9 amendment (month planner = week rows). Shipped in four increments:
data+cascade → month planner UI → weekly flow repoint → consumers.

### 13.1 Model

- **`MeasurementWeekState.targetOverride?: MeasurementTarget`** — mirror of the month field,
  non-indexed (no Dexie migration). For weekly-cadence subjects it means "this week's target
  differs" (vacation week 2× instead of 3×); for monthly-cadence subjects it is a **week
  sub-target** — the month target "rozpisany" onto a week.
- **Cascade (week periods): week override → month override → base target.** Centralized in
  `applyMeasurementTargetCascade` (`measurementProgress.ts`) and applied at the three
  query-layer sites in `planningStateQueries.ts`, so Today, weekly reflection, rings, and the
  stream inherit it.
- **Invariant — month accounting never changes:** a month period only ever sees the month
  override; week sub-targets are *weekly commitments*, structurally unable to leak into the
  month verdict. (The month is accounted top-down from its own target, not from the sum of
  weeks.)
- Repo guard mirrors the month one: no overrides for trackers (no target) or weekly
  intentions (their target IS the week target); `kind` must match the base target.

### 13.2 UX

- **Month planner (ad-hoc editor, D9):** week rows with a compact per-week target pill on
  explicitly placed weeks of KRs/habits. Monthly-cadence rows add **"Rozłóż równomiernie"**
  (largest-remainder prefill over placed weeks, extras to earlier weeks: 10/4 → 3/3/2/2) and
  a **soft sum indicator** ("Rozpisane: X z Y ✓ / — N poza tygodniami / — N ponad cel").
  No enforcement — soft-limit philosophy, like the top-3. Sum shown only for `count` and
  `value/sum` targets; for average/rating targets a week override is just a different
  threshold (no sum semantics).
- **Weekly ritual (days step):** "Cel na ten tydzień" pill in the active-object toolbar.
  This **repointed** the weekly flow's target editing — it previously wrote the MONTH
  override via `overlappingMonthRefs[0]` (all weeks at once, possibly the wrong month on a
  boundary week). Monthly-cadence writes attribute to the week's parent month (week-start
  month, same rule as the month-to-date footer).
- **Un-toggling a week deletes its week state** → the sub-target dies with it (no orphaned
  numbers). "Cały miesiąc" for weekly cadence recreates all week states → also resets
  sub-targets (accepted: whole-month is a reset).

### 13.3 Accounting effects

- Monthly-cadence objects **with** a sub-target get a true week-period met/missed
  (`weekMeasurement` on week bundle items): the "2/4 w tym tygodniu" chip in the weekly
  reflection review and Today, and the week ring counts the week verdict. Without a
  sub-target, behavior is unchanged (month-to-date footer, no week verdict).
- Weekly-cadence per-week evaluations (month rings, monthly-reflection weekly breakdowns)
  honor the sub-target — a lowered vacation week no longer reads as falsely "missed".
- Boundary weeks: weekly cadence has ONE week state (visible from both months' planners; the
  soft sum counts it in each month it is placed in — soft, so no conflict). Monthly cadence
  keys states by `sourceMonthRef` → independent sub-targets per month; a sub-target's
  `weekMeasurement` spans the full ISO week.
- Fixed en passant: `linkMeasurementPeriod` / weekly `toggleMeasurementDayAssignment` upserted
  month states with an explicit `targetOverride: undefined` key, silently wiping the month
  calibration on every week/day toggle. Both now preserve existing scope + override.

## 14. Assignment matrix — unified week/month assignment steps (resolved 2026-07-05)

Both wizard assignment steps (weekly "Rozłóż na dni", monthly "Przypisz obiekty do
tygodni") now share one visual + interaction system: `AssignmentMatrix.vue` —
rows = objects in sectioned lists (Cele/Nawyki/Trackery with counts, flat KRs with
goal-inherited icons), columns = period slots (7 days / month weeks), trailing
column = always-visible target pill, row actions = whole-period / clear / detail
strip. Cells toggle placements directly; the select-an-object-then-paint mode, its
active-object toolbar, the sidebar+week-rows split and the tabs are all gone
(`PlannerSidebar`, `PlannerObjectCard`, `PlannerMonthWeeksGrid`, `DayCellIcons`
retired).

### 14.1 Active ⇔ placed

- **Invariant:** a measurement participates in a period iff it has a placement
  there ('whole-month'/'whole-week' scopes count as placements). The explicit
  "Aktywny" toggle is gone — placing activates (as before), and removing the last
  explicit placement of a monthly-cadence object deletes its 'unassigned' month
  state (`cleanupMonthlyMonthState`, mirroring the weekly-cadence cleanup).
- **Overrides die with the row:** clearing a row removes its month override and
  sub-targets (consistent with §13's "sub-target dies with the week"). Target
  pills are disabled on unplaced rows — writing an override there would resurrect
  an active-unassigned state.
- **Grandfathering:** residual active-but-unassigned states (old data; also still
  produced by the goal-creation wizard's activateMeasurementInMonth and Objects
  Library links) render as soft whole-month coverage — honest, since downstream
  (Today sections, month bundle membership) they behave exactly like whole-month.
  First cell edit normalizes them into explicit placements.

### 14.2 Materialization

Editing a single cell of softly-covered rows must not collapse the remaining
coverage (the old day-toggle on a whole-week row left only the clicked day). Two
mutations set the full placement set explicitly:

- `materializeMeasurementWeekPlacements` — whole-month row → explicit whole-week
  states on all weeks minus the clicked one; month scope drops to 'unassigned';
  kept weeks preserve sub-targets.
- `materializeMeasurementDayAssignments` — whole-week row → 'specific-days' +
  day assignments on all days minus the clicked one; empty set clears the week
  placement (and cascades the active ⇔ placed cleanup). Monthly cadence keys week
  states by each day's month (same attribution as toggleMeasurementDayAssignment).

In the week matrix, a whole-month row materializes in two steps (month → explicit
weeks, this week → explicit days).

### 14.3 Step-scoped target editing

- **Week step:** per-row "Cel na ten tydzień" pill (week override, §13 attribution
  to the parent month), editable once placed in the week.
- **Month step:** per-row month-target pill; the expandable strip holds full
  calibration (operator/aggregation via `PlannerTargetControls`) and — for
  summable monthly-cadence targets — per-week sub-targets with "Rozłóż
  równomiernie" and a now permanently visible soft sum.
- Weekly-cadence per-week overrides are **no longer editable from the month
  planner** (they were pills on placed week rows) — the week is where weekly
  commitments are calibrated; the month step keeps to week placement, month
  targets and rozpisanie.

### 14.4 Progressive disclosure (week step)

Main sections list the month portfolio (objects placed/active in an overlapping
month) plus anything already placed this week; remaining open weekly-cadence
objects collapse into "Pozostałe obiekty (N)" at the bottom — the step still
supports pulling extras into the week without drowning the main flow.
