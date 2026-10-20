# Epic 9 Stories: KR, Habit, And Tracker Measurement Model

This document breaks down `Epic 9: KR, Habit, And Tracker Measurement Model` into implementation stories.

These stories are based on the current implemented application state, not only on the earlier abstract plan. The epic should replace the currently mixed contracts around:

- `KeyResult.cadence`
- `Habit.cadence`
- `Tracker.analysisPeriod`
- current tracker `entryMode`
- `CadencedMonthState.planningMode`
- `CadencedMonthState.targetCount`
- `CadencedWeekState.planningMode`
- `CadencedWeekState.targetCount`
- `CadencedDayAssignment`
- `TrackerEntry.periodType`

with one shared measurement model that downstream views can trust.

## Recommended Story Order

1. `E9-S1: Canonical Measurement Contract And Semantic Cutover`
2. `E9-S2: KR, Habit, And Tracker Definition Refactor`
3. `E9-S3: Shared Daily Entry Model And Actual Computation`
4. `E9-S4: Planning-State Refactor To Schedule Scope`
5. `E9-S5: Query And Derived Progress Contract Refactor`
6. `E9-S6: Calendar View And Objects Library Contract Update`
7. `E9-S7: Local Data Migration Or Clean Break`
8. `E9-S8: Regression Coverage And Guardrails`

## E9-S1: Canonical Measurement Contract And Semantic Cutover

### Goal

Define one canonical measurement model and make the semantic cutover explicit before refactoring code that already depends on older planning and tracker contracts.

### Scope

- Document the canonical `v1` measurement model for:
  - `Entry mode`
  - `Cadence`
  - `Target`
  - `Schedule scope`
  - daily execution entries
- Treat the affected planning data transition as an explicit clean break.
- Define how the new model replaces current meanings of:
  - `planningMode`
  - `targetCount`
  - tracker `analysisPeriod`
  - tracker `entryMode`
  - tracker `periodType`
- Decide which current semantics are:
  - translated
  - dropped
  - renamed
  - preserved conceptually
- Treat this as a hard cutover of contracts, not a long-lived compatibility layer.

### Acceptance Criteria

- The product has one explicit canonical measurement contract for KR / habit / tracker.
- The current conflicting semantics are mapped to clear replacement decisions.
- The new model is documented as the only valid source of truth for future progress logic.
- The story makes it clear which older contracts are intentionally removed.
- The story makes it clear that Epic 9 uses a clean break for affected planning data.

### Dependencies

- `Epic 3`
- `Epic 4`

### Risks / Open Questions

- Naming collisions between current and new meanings of `entryMode`
- Leaving accidental dual semantics active in repositories or view-models

## E9-S2: KR, Habit, And Tracker Definition Refactor

### Goal

Refactor base object definitions so KR, habit, and tracker share one simple measurement vocabulary.

### Scope

- Refactor `KeyResult`, `Habit`, and `Tracker` definitions to use:
  - shared `Entry mode`
  - shared `Cadence`
- Add `Target` to `KeyResult` and `Habit`.
- Keep `Tracker` without target in `v1`.
- Preserve existing lifecycle semantics on base objects.
- Update object payload normalizers, repositories, validation, and create/edit contracts.
- Replace the current tracker-only `analysisPeriod` and `entryMode` semantics.
- Keep the model simple enough to support only approved combinations in `v1`.

### Acceptance Criteria

- KR, habit, and tracker definitions use one shared measurement vocabulary.
- KR and habit can express the approved target rules from Epic 9.
- Tracker no longer depends on the old `analysisPeriod + entryMode(period)` contract.
- The domain layer rejects unsupported combinations instead of silently accepting them.

### Dependencies

- `E9-S1`

### Risks / Open Questions

- Whether target structure should be explicit fields or a typed config object
- How much backwards interpretation should remain in repository update paths

## E9-S3: Shared Daily Entry Model And Actual Computation

### Goal

Introduce one shared execution model so KR, habit, and tracker can all produce honest `actual` values from daily entries.

### Scope

- Define the shared daily execution-entry model for KR / habit / tracker.
- Support `max 1 entry per day` per object.
- Support `Entry mode`-appropriate value storage for:
  - `Completion`
  - `Counter`
  - `Value`
  - `Rating`
- Replace the current tracker-only progress model as the sole execution layer.
- Define how `actual` is computed for each allowed target rule from daily entries inside the cadence period.
- Remove tracker entry notes from the Epic 9 measurement contract.

### Acceptance Criteria

- KR, habit, and tracker can all store daily execution entries in one coherent model.
- The system can compute `actual` for KR and habit directly from daily entries.
- Tracker logging remains supported without pass/fail evaluation.
- Daily execution no longer depends on tracker-specific period-granularity semantics.
- `TrackerEntry.note` is no longer part of the final Epic 9 contract.

### Dependencies

- `E9-S1`
- `E9-S2`

### Risks / Open Questions

- How to avoid overfitting the entry schema to current tracker implementation details

## E9-S4: Planning-State Refactor To Schedule Scope

### Goal

Replace the current planning-state mix of `planningMode`, `targetCount`, and raw day assignments with a simpler planning-visibility model.

### Scope

- Refactor KR / habit planning state so target semantics live on the base object, not in period state.
- Introduce shared `schedule scope` for KR / habit / tracker in period planning state:
  - `Unassigned in period`
  - `Specific days`
  - `Whole week`
  - `Whole month`
- Keep day assignment support only as a representation of `Specific days`, not as a separate scoring contract.
- Add optional period-level `success note` for KR and habit at both month and week level.
- Preserve existing month/week activity-state rules.
- Remove current over-allocation logic that depends on `targetCount` living in period state.

### Acceptance Criteria

- KR and habit no longer rely on period-state `targetCount` as their scoring source of truth.
- Tracker can use the same planning visibility model as KR and habit.
- `schedule scope` affects visibility and planning convenience only.
- Period activity state remains separate from lifecycle state and from execution entries.
- The code no longer depends on the old `planningMode / targetCount` contract.
- `success note` is supported at both month and week planning levels.
- Legacy over-allocation semantics are removed from both the model and its derived contracts.

### Dependencies

- `E9-S1`
- `E9-S2`
- `Epic 4`

### Risks / Open Questions

- Whether current `CadencedDayAssignment` can be evolved or should be replaced

## E9-S5: Query And Derived Progress Contract Refactor

### Goal

Update the shared query layer so all downstream views consume one honest progress model based on the new definitions, entries, and planning state.

### Scope

- Refactor planning and calendar query services to derive:
  - `target`
  - `actual`
  - evaluation status
  - schedule visibility
  - reflection support context
- Remove dependence on:
  - `planningMode`
  - `targetCount`
  - tracker-only progress assumptions
  - old over-allocation semantics if retired
- Keep the output reusable for:
  - `Calendar View`
  - `Objects Library`
  - future `Today`
- Ensure query contracts remain explicit and testable.

### Acceptance Criteria

- Shared query services expose one progress contract for KR / habit / tracker.
- Calendar and library consumers no longer need to interpret old planning-state semantics themselves.
- The new derived contract is stable enough for `Today` to build on later.
- Query logic does not mix old and new measurement semantics.

### Dependencies

- `E9-S2`
- `E9-S3`
- `E9-S4`

### Risks / Open Questions

- Whether some current query DTOs should be replaced rather than incrementally adapted
- Risk of hidden coupling between query helpers and current badge/detail wording

## E9-S6: Calendar View And Objects Library Contract Update

### Goal

Refit already-implemented UI surfaces to the new measurement model so they stop exposing stale semantics.

### Scope

- Update `Calendar View` cards, badges, details, and panel flows to the new measurement model.
- Update `Objects Library` create/edit forms, defaults, detail fields, and badges to the new measurement model.
- Remove stale UI concepts tied to the old model, such as:
  - tracker `analysisPeriod`
  - tracker old `entryMode`
  - `planningMode`
  - `targetCount`
  - old over-allocation cues if they no longer exist
- Keep UI creation flows constrained so users can build only supported combinations.
- Preserve existing neumorphic style while changing semantics.

### Acceptance Criteria

- Calendar and library UI show the new model consistently.
- Users can create and edit KR / habit / tracker objects using the new supported fields.
- Existing badges and details no longer leak removed measurement semantics.
- The updated UI becomes the stable contract that `Today` can later consume.

### Dependencies

- `Epic 5`
- `Epic 6`
- `E9-S2`
- `E9-S3`
- `E9-S4`
- `E9-S5`

### Risks / Open Questions

- How much composer simplification is possible without making advanced cases confusing
- Whether some current UI labels should be renamed to avoid semantic residue from the old model

## E9-S7: Local Data Migration Or Clean Break

### Goal

Handle the schema and semantic transition safely for current local data without leaving half-translated planning records behind.

### Scope

- Define the explicit migration strategy for affected local planning data.
- Cover:
  - Dexie schema changes
  - object shape changes
  - planning-state changes
  - execution-entry changes
- Ensure the chosen strategy matches the user’s tolerance for losing low-value intermediate data.

### Acceptance Criteria

- The migration strategy for Epic 9 is explicit.
- The app does not end up with mixed old/new measurement records after upgrade.
- Schema upgrades and semantic transitions are testable.
- The chosen strategy is consistent with the broader simplification direction.
- Epic 9 uses a clean break rather than best-effort semantic translation for affected planning data.

### Dependencies

- `E9-S2`
- `E9-S3`
- `E9-S4`

### Risks / Open Questions

- How much transitional cleanup logic is needed in repositories after migration

## E9-S8: Regression Coverage And Guardrails

### Goal

Protect the measurement refactor with enough test coverage and invariants that downstream work can build on it safely.

### Scope

- Add or update automated coverage for:
  - domain validation
  - repository validation
  - Dexie migration behavior
  - query-layer derived progress
  - `Calendar View` and `Objects Library` semantic contracts
- Add guardrails so unsupported combinations fail explicitly.
- Ensure tests protect against accidental reintroduction of old semantics.

### Acceptance Criteria

- The measurement model refactor has regression coverage across domain, persistence, queries, and UI contracts.
- Unsupported combinations are protected by tests.
- Old semantic fields do not silently keep influencing the new model.
- Epic 9 leaves a stable base for Epic 7 and Epic 8.

### Dependencies

- `E9-S2`
- `E9-S3`
- `E9-S4`
- `E9-S5`
- `E9-S6`
- `E9-S7`

### Risks / Open Questions

- How much current test coverage should be rewritten versus migrated
- Risk of leaving low-value but misleading compatibility paths untested
