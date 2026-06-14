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
- **Reflection feeds the next plan (loop closure):** monthly per-object verdicts
  (*continue / adjust / pause / drop*) pre-populate next month's portfolio; weekly
  `improvements`/`lookingAhead` answers surface as next week's intention suggestions.
  Nothing lands in a write-only text field anymore.
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
3. **Actions/State ratings** (2 min) — as today.
4. **Anchors + journal** (2–3 min, slimmed: ~3 anchors with optional "expand more"; AI
   optional) — with AI summary as today.

**Open the next week (prospective):**
5. **Week intention** (1 min) — one short free-text field "what should this week be about?",
   optionally pre-filled from last week's `lookingAhead`/`improvements` (sub-decision 1c).
6. **Top 1–3** (1–2 min) — pick ≤3 priorities from the week's active objects (soft limit,
   exceedable with a gentle warning).
7. **Day assignment** (1–2 min) — existing mechanic, now the last placement step.
8. **Obstacle + if-then plan** (1 min) — optional, single implementation intention.

Retrospective Demands ratings are gone (D6): the confrontation in step 1 carries the
"plan vs reality" weight, qualitatively, against last week's intention + top-3.

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
  retrospective Demands replaced by confrontation with prospective ones; AI steps optional.
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
