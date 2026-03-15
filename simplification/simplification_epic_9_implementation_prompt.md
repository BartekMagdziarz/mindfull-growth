# Epic 9 Implementation Prompt

Use this prompt in a new chat when implementing `Epic 9`.

---

You are working in the repository at:

`/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning`

I want you to implement `Epic 9: KR, Habit, And Tracker Measurement Model`.

Important context:

- `Epics 1-6` are already implemented in code.
- The current code may differ from the older planning docs, so do **not** rely only on documentation.
- Start from the **actual current implementation** in the codebase, inspect it carefully, and treat this work as a **foundation refactor**, not just a new feature.
- This refactor should prepare the app for later implementation of `Today / Current Focus` and final hardening.

## Source Documents To Use

Please inspect and use these files first:

- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/simplification/simplification_epics.md`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/simplification/simplification_epic_9_stories.md`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/simplification/simplification_kr_habit_tracker_types.md`

And inspect the current implementation at minimum in:

- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/domain/planning.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/domain/planningState.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/repositories/planningStateDexieRepository.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/services/planningStateQueries.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/services/calendarViewQueries.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/services/objectsLibraryQueries.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/views/CalendarView.vue`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/views/ObjectsLibraryView.vue`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/services/userDatabase.service.ts`
- `/Users/mg/Documents/GitHub/mindfull-growth/.worktrees/simplify-planning/src/repositories/__tests__/planningMigration.spec.ts`

## What Epic 9 Must Achieve

Refactor the current mixed KR / Habit / Tracker progress model into one simplified shared measurement model.

### Final agreed simplified model

For each `KeyResult`, `Habit`, and `Tracker`:

- shared `Entry mode`
  - `Completion`
  - `Counter`
  - `Value`
  - `Rating`
- shared `Cadence`
  - `Weekly`
  - `Monthly`

For `KeyResult` and `Habit` only:

- required `Target`

Allowed target rules:

- for `Completion` and `Counter`
  - `min in cadence period`
  - `max in cadence period`
- for `Value`
  - `sum >= x`
  - `sum <= x`
  - `average >= x`
  - `average <= x`
  - `last value >= x`
  - `last value <= x`
- for `Rating`
  - `average >= x`
  - `average <= x`

For `Tracker`:

- no target in `v1`

### Execution rules

- `max 1 entry per day` per object
- `actual` is computed from daily entries inside the cadence period
- `actual` may exceed `target`

### Planning visibility rules

Use shared `schedule scope` for `KeyResult`, `Habit`, and `Tracker`, but keep it in period planning state, not on the base object:

- `Unassigned in period`
- `Specific days`
- `Whole week`
- `Whole month`

Important:

- `schedule scope` affects visibility and planning convenience only
- `schedule scope` does **not** affect scoring
- day planning is optional

### Success note

For `KeyResult` and `Habit`, support optional `success note`:

- at month level
- at week level

This is only a reflection aid. It must **not** affect automatic scoring.

## Explicit decisions already made

These are not open questions anymore:

- Remove `TrackerEntry.note` from the Epic 9 measurement core.
- Use a `clean break` for affected local planning data.
- Remove old `over-allocation` logic based on `targetCount`.
- Do **not** support in this epic:
  - percent-based scoring
  - working-days denominator logic
  - planned-days denominator logic
  - minimum sample counts
  - multiple entries per day
  - automatic KR calculation from Habit or Tracker
  - composite / weighted rules

## Current implementation baseline that must be refactored

The current codebase already has a different model in place. Epic 9 must explicitly refactor it.

Current implementation includes:

- `KeyResult` and `Habit` currently have `cadence`, `kind`, `config`
- `Tracker` currently has `analysisPeriod`, `entryMode`, `kind`, `config`
- KR / habit planning semantics currently live in planning state using:
  - `planningMode`
  - `targetCount`
  - `CadencedDayAssignment`
- tracker progress currently lives in `TrackerEntry` records with:
  - `periodType`
  - `periodRef`
  - `value`
  - optional `note`
- existing query services, badges, cards, forms, and tests already depend on those contracts

Epic 9 must **not** leave both the old and new semantics active in parallel.

## What I want you to do

1. Inspect the actual current implementation first.
2. Compare it against the Epic 9 docs.
3. Produce a short implementation plan mapped to the Epic 9 stories.
4. Call out any places where the docs and code differ materially.
5. Then implement Epic 9 end-to-end in coherent steps.
6. Update tests as you go.
7. If a schema migration is required, implement it consistently with the agreed `clean break`.
8. Keep `Calendar View` and `Objects Library` aligned with the new measurement contract.
9. Do not start implementing `Today` itself here, but make sure Epic 9 leaves the right base for it.

## Preferred implementation order

Use this order unless inspection shows a clearly better sequence:

1. Canonical measurement contract and semantic cutover
2. Base domain refactor for KR / Habit / Tracker
3. Shared daily entry model and actual computation
4. Planning-state refactor to `schedule scope`
5. Query / derived-progress refactor
6. `Calendar View` and `Objects Library` refit
7. Dexie schema + clean-break migration
8. Regression coverage and cleanup

## Additional guidance

- Choose the simplest coherent implementation that matches the agreed model.
- If you must choose between preserving current semantics and simplifying the model, prefer the agreed simplified model.
- If a naming collision exists between current tracker `entryMode` and the new shared `Entry mode`, rename carefully and consistently.
- Keep the UI in the current neumorphic style already used in the app.
- Use existing repository/query patterns where they still make sense, but do not preserve outdated semantics just for consistency.

## Expected output from you in that chat

Before coding:

- short summary of current-state findings
- concrete implementation plan
- any blockers or decisions that truly still need input

After coding:

- summary of what changed
- what old contracts were removed or replaced
- what tests were added/updated
- any residual risks or follow-ups for Epic 7 / Epic 8

---
