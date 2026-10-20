# Epic 3 Stories: Planning Domain Core

This document breaks down `Epic 3: Planning Domain Core` into implementation stories. These stories should define the core planning objects, their relationships, and the domain boundaries that later planning state and UI layers will build on.

## Recommended Story Order

1. `E3-S1: Canonical Planning Object Domain Models`
2. `E3-S2: Relationship And Linking Model`
3. `E3-S3: Object Lifecycle And Validation Rules`
4. `E3-S4: Extensibility Model For KR, Habit, And Tracker`
5. `E3-S5: Persistence And Repository Layer`
6. `E3-S6: Domain Query Helpers`
7. `E3-S7: Migration And Test Coverage`

## E3-S1: Canonical Planning Object Domain Models

### Goal

Define the canonical domain models for all core planning objects so the rest of the planning system can build on one consistent semantic foundation.

### Scope

- Define or formalize:
  - `Priority`
  - `Goal`
  - `KeyResult`
  - `Habit`
  - `Tracker`
  - `Initiative`
- Capture the agreed domain rules:
  - `Priority` is yearly
  - `Goal` is cross-period, activated monthly, analyzed monthly
  - `KeyResult` belongs to `Goal`
  - `Habit` is not linked to `Goal`
  - `Tracker` is not linked to `Goal`
  - `Initiative` is a single task
- Keep these models independent from period-specific planning state and UI concerns.
- Allow `Goal`, `Habit`, and `Tracker` to exist without links to `Priority` or `LifeArea`.
- Do not require unique names within an object type at the domain level.
- Support global lifecycle state on:
  - `Goal`: `open | completed | dropped`
  - `KeyResult`: `open | completed | dropped`
  - `Habit`: `open | retired | dropped`
  - `Tracker`: `open | retired | dropped`

### Acceptance Criteria

- The codebase has explicit domain models for all six planning object types.
- The semantic boundary of each object type is expressed in the model and documentation.
- The models do not depend on planning screens, calendar views, or current-period UI.
- The agreed v1 exclusions are represented clearly in the model.
- `Goal`, `Habit`, and `Tracker` can exist without linked `Priority` or `LifeArea`.
- Domain validation does not enforce unique names within an object type.
- The model supports the agreed global lifecycle states for `Goal`, `KeyResult`, `Habit`, and `Tracker`.

### Dependencies

- None

### Risks / Open Questions

- Exact field sets for each object
- Where to draw the line between domain metadata and later planning-state metadata

## E3-S2: Relationship And Linking Model

### Goal

Define explicit, reusable linking rules between planning objects and life areas without introducing implicit roll-up logic.

### Scope

- Define allowed relationships:
  - `Priority <-> LifeArea`
  - `Goal <-> Priority`
  - `Goal <-> LifeArea`
  - `KeyResult -> Goal`
  - `Habit <-> Priority`
  - `Habit <-> LifeArea`
  - `Tracker <-> Priority`
  - `Tracker <-> LifeArea`
  - `Initiative <-> Goal / Priority / LifeArea`
- Represent links explicitly through identifiers or equivalent domain-safe references.
- Prevent forbidden relationships in the model, especially:
  - `Habit -> Goal`
  - `Tracker -> Goal`
  - automatic `KR` roll-up from `Habit` or `Tracker`
- Define cascading ownership behavior from `Goal` to `KeyResult`.

### Acceptance Criteria

- Allowed links are representable explicitly in the model.
- Forbidden links are not accidentally implied by the domain structure.
- The relationship model is reusable later by planning state and object library flows.
- The domain model avoids hidden or inferred ownership outside the agreed rules.
- Deleting a `Goal` is defined to cascade-delete all of its `KeyResult`.

### Dependencies

- `E3-S1`

### Risks / Open Questions

- Which links should be optional versus required
- Whether future analytics may need link metadata beyond plain ids

## E3-S3: Object Lifecycle And Validation Rules

### Goal

Define the core creation, editing, archiving, and deletion expectations for planning objects so their behavior is predictable before UI work begins.

### Scope

- Define base lifecycle expectations for each object type:
  - creation
  - editing
  - archiving / deactivation where relevant
  - deletion
- Define validation rules that belong to the domain layer, such as:
  - required ownership of `KeyResult` by `Goal`
  - yearly scope of `Priority`
  - single-task nature of `Initiative`
- Clarify which rules belong in domain validation versus later planning-state logic.
- Support archive / `isActive` semantics for all main planning object types:
  - `Priority`
  - `Goal`
  - `KeyResult`
  - `Habit`
  - `Tracker`
  - `Initiative`
- Clarify the distinction between:
  - global lifecycle state on the base object
  - period activity state handled later in planning-state models

### Acceptance Criteria

- Each object type has explicit lifecycle expectations documented in the domain layer.
- Domain validation catches invalid structures that violate agreed semantics.
- Domain lifecycle rules do not depend on future planning screens.
- The model is ready for local-first persistence without ambiguous object state.
- Archive / active-state behavior is defined for all main planning object types.
- Deleting a `Goal` is documented as cascade-deleting its `KeyResult`.
- The model distinguishes clearly between object lifecycle and period activity.

### Dependencies

- `E3-S1`
- `E3-S2`

### Risks / Open Questions

- Which validation rules must be hard domain constraints versus soft UX guidance

## E3-S4: Extensibility Model For KR, Habit, And Tracker

### Goal

Make the domain flexible enough to support future variants of key results, habits, and trackers without rebuilding the core model.

### Scope

- Define the extensibility approach for `KeyResult`, `Habit`, and `Tracker`.
- Support future specialization through a stable pattern such as `kind + config`, discriminated unions, or an equivalent typed strategy.
- Keep the v1 model simple while allowing later growth in:
  - behavior variants
  - value types
  - progress-capture modes
- Avoid forcing future extensions through ad hoc optional fields spread across the base model.

### Acceptance Criteria

- The domain has a documented extensibility strategy for `KeyResult`, `Habit`, and `Tracker`.
- The v1 model stays simple while leaving room for future variants.
- The strategy does not require redesigning core relationships later.
- The approach fits the existing TypeScript domain style in the repo.

### Dependencies

- `E3-S1`
- `E3-S2`

### Risks / Open Questions

- Whether one extensibility pattern should be shared across all three object types
- Risk of overengineering before concrete v1 variants are finalized

## E3-S5: Persistence And Repository Layer

### Goal

Provide stable persistence boundaries for the planning domain so later epics can build on repositories instead of reaching directly into storage details.

### Scope

- Define repository interfaces and persistence support for:
  - `Priority`
  - `Goal`
  - `KeyResult`
  - `Habit`
  - `Tracker`
  - `Initiative`
- Support standard local-first operations:
  - create
  - update
  - delete
  - get by id
  - list all
- Keep persistence independent from period-specific planning state.
- Ensure relationship data can be stored cleanly.

### Acceptance Criteria

- Each core planning object has a repository boundary.
- Persistence supports storing the agreed links between objects.
- Repository APIs are independent from UI-specific workflows.
- The storage layer is ready for later planning-state and object-library features.

### Dependencies

- `E3-S1`
- `E3-S2`
- `E3-S3`

### Risks / Open Questions

- Whether to keep separate tables per object or introduce some shared persistence patterns
- How much repository querying is needed now versus later epics

## E3-S6: Domain Query Helpers

### Goal

Provide reusable query helpers over the planning domain so later epics can retrieve linked objects consistently without embedding domain logic into UI layers.

### Scope

- Build helpers for common linked lookups such as:
  - goals by priority
  - goals by life area
  - habits by priority
  - trackers by priority
  - initiatives by linked object
  - key results by goal
- Keep the helpers generic and domain-focused.
- Avoid leaking future calendar or planning-state assumptions into these queries.

### Acceptance Criteria

- Later epics can retrieve linked planning objects through shared helpers or repository queries.
- The query layer respects the agreed semantic boundaries.
- The implementation does not assume any specific screen or workflow.
- The query layer is sufficient to support future object library and planning state use cases.

### Dependencies

- `E3-S2`
- `E3-S5`

### Risks / Open Questions

- Which queries belong in repositories versus service/helper functions
- Risk of introducing a premature read-model layer

## E3-S7: Migration And Test Coverage

### Goal

Lock down the planning domain core with tests and make room for safe evolution from the current codebase.

### Scope

- Add automated tests for:
  - domain object rules
  - relationship rules
  - repository behavior
  - query helpers
  - extensibility boundaries
- Define migration expectations from the current codebase where needed.
- Document explicit v1 exclusions to protect against accidental scope creep.

### Acceptance Criteria

- The core planning domain is covered by automated tests.
- Invalid domain relationships are caught by tests.
- Repository and query behavior are validated by tests.
- Migration expectations are explicit, even if implementation starts from a clean slate.

### Dependencies

- `E3-S1`
- `E3-S2`
- `E3-S3`
- `E3-S4`
- `E3-S5`
- `E3-S6`

### Risks / Open Questions

- How much migration is needed given that current planning features were removed earlier
- Keeping tests focused on domain behavior rather than future UI assumptions
