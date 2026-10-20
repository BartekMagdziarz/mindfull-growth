# Epic 2 Stories: Life Area Assessments

This document breaks down `Epic 2: Life Area Assessments` into implementation stories. These stories should unify `Wheel of Life` and future strategic reflection around one assessment model.

## Recommended Story Order

1. `E2-S1: Canonical LifeAreaAssessment Domain Model`
2. `E2-S2: Persistence And Repository Layer`
3. `E2-S3: Wheel Of Life Alignment`
4. `E2-S4: Assessment History And Comparison Helpers`
5. `E2-S5: Life Area Detail Integration`
6. `E2-S6: Migration And Test Coverage`

## E2-S1: Canonical LifeAreaAssessment Domain Model

### Goal

Define `LifeAreaAssessment` as the canonical model for evaluating life areas over time and clarify its boundary relative to `LifeArea` and `Wheel of Life`.

### Scope

- Define the `LifeAreaAssessment` entity.
- Define how an assessment references active `LifeArea`.
- Capture assessment content for each evaluated life area, including:
  - current state / score
  - optional reflection notes
  - optional `9/10` vision snapshot
- Clarify what remains on the persistent `LifeArea` definition versus what belongs to an assessment snapshot.
- Make the model usable both from `Wheel of Life` and future annual planning flows.
- By default, a single assessment should cover all active `LifeArea`.
- `LifeArea.successPicture` remains the current-state version of the `9/10` vision, while `LifeAreaAssessment` stores the historical snapshot version.
- Past assessments may be edited.

### Acceptance Criteria

- The codebase has one explicit domain model for life area assessments.
- The model distinguishes stable life-area metadata from time-based assessment data.
- The model can support multiple assessments over time for the same life area.
- The model is not tied to a single screen or exercise flow.
- A canonical assessment flow can evaluate all active life areas at once.
- The model supports both current `9/10` state on `LifeArea` and historical `9/10` snapshot data on assessments.
- Existing assessment records are editable.

### Dependencies

- None

### Risks / Open Questions

- Whether future specialized flows should ever allow partial assessments despite the default all-active-area rule

## E2-S2: Persistence And Repository Layer

### Goal

Provide a durable storage and repository model for life area assessments that can replace or absorb the current wheel snapshot persistence.

### Scope

- Add persistence support for `LifeAreaAssessment`.
- Define repository interfaces for:
  - create
  - update
  - delete
  - get by id
  - list all
  - query by life area
  - query by date range
- Support local-first storage patterns consistent with the rest of the app.
- Prepare the storage model for multiple assessments over time.
- Favor a simplified model even if that means a clean break from current wheel snapshot data.

### Acceptance Criteria

- Assessments can be created, loaded, updated, and deleted through a dedicated repository.
- The repository supports retrieving assessments by life area and by time range.
- The persistence model is compatible with future comparison and timeline features.
- The repository boundary is independent of `Wheel of Life` screen logic.

### Dependencies

- `E2-S1`

### Risks / Open Questions

- Whether to introduce a new table or evolve the existing wheel snapshot table while still treating the result as a clean-break model

## E2-S3: Wheel Of Life Alignment

### Goal

Make `Wheel of Life` operate on the canonical assessment model without requiring a deep UX redesign.

### Scope

- Align the `Wheel of Life` flow to create and display `LifeAreaAssessment` data.
- Reconcile existing wheel-specific fields with the canonical assessment structure.
- Preserve the current high-level exercise experience where practical.
- Keep `Wheel of Life` as a UX entry point, not a separate domain model.

### Acceptance Criteria

- Completing `Wheel of Life` creates or updates canonical `LifeAreaAssessment` records rather than a competing parallel model.
- Existing wheel flows still function from the user's perspective without a full redesign.
- The domain boundary becomes explicit: `Wheel of Life` is an interface over assessments.
- The system avoids maintaining two separate sources of truth for life area evaluation.
- The alignment is allowed to favor domain simplification over preserving old stored wheel data.

### Dependencies

- `E2-S1`
- `E2-S2`

### Risks / Open Questions

- How much current wheel-specific reflection structure should be preserved
- Whether the current timeline UI can be reused directly or needs adaptation

## E2-S4: Assessment History And Comparison Helpers

### Goal

Provide reusable logic for viewing life area assessments over time and comparing current state with past assessments.

### Scope

- Build helpers for retrieving ordered assessment history.
- Build helpers for comparing assessments across time.
- Support later use cases such as:
  - latest assessment
  - previous assessment
  - assessments within a date range
  - delta by life area over time
- Keep the logic reusable across exercise, life area, and future planning views.

### Acceptance Criteria

- The system can retrieve assessment history in chronological order.
- The system can compare assessments for the same life area over time.
- Comparison helpers are usable outside `Wheel of Life`.
- The implementation does not assume a single fixed review cadence.

### Dependencies

- `E2-S1`
- `E2-S2`

### Risks / Open Questions

- Whether comparisons should be limited to same-shape assessments or tolerate partial overlaps
- How much derived comparison logic belongs in generic helpers versus specific views

## E2-S5: Life Area Detail Integration

### Goal

Expose the unified assessment model inside life area detail flows so users can see how an area evolves over time.

### Scope

- Integrate `LifeAreaAssessment` into life area detail views.
- Replace direct dependence on wheel-specific snapshot assumptions where needed.
- Show assessment history relevant to one life area.
- Prepare the life area detail flow for future yearly planning/reflection usage.

### Acceptance Criteria

- A life area detail view can display assessment history sourced from the canonical model.
- The detail flow no longer depends on wheel-only assumptions.
- The integration supports future comparison and trend features.
- The user can understand that `Wheel of Life` entries are part of one shared assessment history.

### Dependencies

- `E2-S1`
- `E2-S2`
- `E2-S4`

### Risks / Open Questions

- How much assessment detail should be shown directly on the life area page
- Whether the view should prioritize latest state, trend, or narrative context

## E2-S6: Migration And Test Coverage

### Goal

Safely transition from the current wheel-specific implementation to the unified life area assessment model and lock down expected behavior with tests.

### Scope

- Define migration strategy from `WheelOfLifeSnapshot` data where needed.
- Add automated tests for:
  - domain model rules
  - repository behavior
  - history and comparison helpers
  - wheel-to-assessment alignment
- Validate compatibility with existing life area detail expectations where applicable.
- A clean break is acceptable if it meaningfully simplifies the model.

### Acceptance Criteria

- Migration strategy is explicit even if the chosen strategy is a clean break with no preservation of legacy wheel snapshot data.
- The new canonical model is covered by automated tests.
- Regressions in assessment history, repository behavior, or alignment logic are caught by tests.
- Migration behavior is explicit rather than implicit.

### Dependencies

- `E2-S1`
- `E2-S2`
- `E2-S3`
- `E2-S4`
- `E2-S5`

### Risks / Open Questions

- Risk of hidden coupling in existing wheel store and life area detail logic
