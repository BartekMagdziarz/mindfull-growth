# Epic 4 Stories: Month And Week Planning State

This document breaks down `Epic 4: Month And Week Planning State` into implementation stories. These stories should define the current-state operational layer that activates planning objects in months and weeks and supports reflection on them.

## Recommended Story Order

1. `E4-S1: Canonical MonthPlan And WeekPlan Models`
2. `E4-S2: Goal Activation In MonthPlan`
3. `E4-S3: KR And Habit Planning State`
4. `E4-S4: Initiative Scheduling State`
5. `E4-S5: Tracker Activity And Progress State`
6. `E4-S6: Weekly View Relevance Rules For Monthly Objects`
7. `E4-S7: Month And Week Reflection Models`
8. `E4-S8: Persistence, Queries, And Test Coverage`

## E4-S1: Canonical MonthPlan And WeekPlan Models

### Goal

Define the canonical current-state planning records for months and weeks so the system has one operational model for period-specific planning.

### Scope

- Define `MonthPlan` and `WeekPlan` as current-state records, not session history.
- Define how they reference:
  - `MonthRef`
  - `WeekRef`
  - related domain objects
- Clarify which information belongs directly on the plan records versus in object-specific planning state.
- Keep the model independent from final calendar UI design.
- Plan and reflection records should be created on demand.
- The model should support UI flows where a period initially shows a `Create Plan` / `Create Reflection` action, and later those same entry points become edit flows.

### Acceptance Criteria

- The codebase has explicit `MonthPlan` and `WeekPlan` domain models.
- The models are clearly current-state records rather than historical sessions.
- The models are compatible with the planning domain defined in Epic 3.
- The models do not depend on any specific calendar screen.
- Plan and reflection state can be created lazily for a period instead of requiring eager pre-creation.

### Dependencies

- `Epic 1`
- `Epic 3`

### Risks / Open Questions

- How much should be stored directly on `MonthPlan` / `WeekPlan` versus derived

## E4-S2: Goal Activation In MonthPlan

### Goal

Support the core monthly planning behavior where goals become active in selected months and drive the rest of monthly analysis.

### Scope

- Define how goals are activated within a `MonthPlan`.
- Support multiple active goals in one month.
- Keep `Goal` analysis monthly-only, consistent with the agreed model.
- Make activation explicit rather than inferred from linked objects.
- Treat `Goal.completed` and `Goal.dropped` as global lifecycle states on the base object, not month-level activity states.
- Support month-level activity states for goals:
  - `active`
  - `paused`
- Lack of month activation should effectively mean inactive for that month.
- Completed or dropped goals should not appear in future monthly planning by default, but may later be reopened from object-management flows.

### Acceptance Criteria

- A month plan can explicitly mark goals as active for that month.
- Goal activation is independent from weekly planning state.
- The model supports multiple active goals in the same month.
- Goal activation rules are reusable later by month planning and reflection flows.
- A goal can be paused in one month and active again in a later month while remaining globally open.
- Completed or dropped goals are treated as closed globally rather than as month-only states.

### Dependencies

- `E4-S1`
- `Epic 3`

### Risks / Open Questions

- Whether activation metadata should include notes or rationale in v1

## E4-S3: KR And Habit Planning State

### Goal

Define how key results and habits are represented in monthly and weekly planning without mixing that logic into their core object definitions.

### Scope

- Define planning state for `KeyResult` and `Habit` at month and week level.
- Support both planning modes:
  - specific days
  - `X times in a week/month`
- Support both cadences:
  - weekly
  - monthly
- Keep planning-state data separate from execution/progress entries.
- Keep the structure broad enough to support daily entries later without requiring them.
- Allow monthly KR and habit targets to be broken down into weekly planning allocations without changing the base object definition.
- Treat weekly allocations for a monthly KR or habit as part of the same monthly target, not as an independent separate target.
- Allow actual progress to exceed the monthly target.
- Allow weekly planning to over-allocate against the monthly target if needed, but treat this as explicit over-allocation rather than a separate parallel target system.
- Support global lifecycle on the base objects:
  - `KeyResult`: `open | completed | dropped`
  - `Habit`: `open | retired | dropped`
- Support period activity states at both month and week level:
  - `active`
  - `paused`
- Treat month activity as the parent gate for week activity:
  - if the month is paused, the week cannot be active
- Allow cadence and activity state to remain separate concerns:
  - cadence controls target / analysis shape
  - month/week activity controls whether the object is operational in that period

### Acceptance Criteria

- KR and habit planning state exists independently of the base object definition.
- The model can express both day-based planning and count-based planning.
- The model supports weekly and monthly cadence consistently.
- The planning-state model does not force exact-day progress entries.
- A monthly KR or habit can be distributed across weeks without changing its base cadence.
- Weekly allocations can feed into monthly planning and reporting without being treated as independent final targets.
- The model allows over-target actual execution and can represent over-allocation of planned weekly work against a monthly target.
- `KeyResult` and `Habit` support the agreed split between global lifecycle and period activity state.
- Week activity cannot contradict a paused month state.

### Dependencies

- `E4-S1`
- `Epic 3`

### Risks / Open Questions

- Whether KR and habit should share one planning-state structure or parallel ones
- How much configuration belongs in month state versus week state
- Exact UX and validation behavior when weekly planned allocations exceed the monthly target

## E4-S4: Initiative Scheduling State

### Goal

Define how initiatives are scheduled into months, weeks, and days without turning them into mini-projects.

### Scope

- Define planning state for `Initiative`.
- Support scheduling to:
  - a specific month
  - a specific week
  - a specific day
- Support rescheduling and clearing scheduled dates in the planning model.
- Keep initiative semantics as a single task, not a checklist or subtask system.
- Allow an initiative to hold both a broader month assignment and a more specific day assignment when that day falls within the same month.

### Acceptance Criteria

- Initiative planning state supports assignment to month, week, or day.
- The model supports rescheduling to another day or clearing a scheduled day.
- The planning-state design preserves the single-task nature of initiatives.
- Initiative scheduling can be reused later by week planning and today views.
- The model can represent refinement from broader period placement to a more specific scheduled day.

### Dependencies

- `E4-S1`
- `Epic 3`

### Risks / Open Questions

- Whether week-level and month-level initiative placement should be mutually exclusive or composable
- Which state transitions should be modeled directly versus handled at service level

## E4-S5: Tracker Activity And Progress State

### Goal

Define how trackers participate in month/week planning and progress capture without forcing them into the same planning cadence model as KR and habit.

### Scope

- Define how a tracker can be active or relevant in a month or week.
- Support progress/value entries at:
  - daily level
  - weekly level
  - monthly level
- Avoid requiring:
  - specific planned days
  - `X measurements per week/month`
- Keep tracker planning-state lightweight while still compatible with `Today` and `Calendar View`.
- Support global lifecycle on the base tracker object:
  - `open | retired | dropped`
- Support period activity states for trackers at both month and week level:
  - `active`
  - `paused`
- Treat month activity as the parent gate for week activity.

### Acceptance Criteria

- Tracker state supports being active in a month or week.
- Tracker state supports daily, weekly, and monthly entries.
- The model does not require tracker scheduling analogous to KR or habit.
- The model is compatible with temporary one-day hiding in `Today`.
- Tracker state supports the agreed split between global lifecycle and period activity state.
- A paused month prevents an active week state for the tracker.

### Dependencies

- `E4-S1`
- `Epic 3`

### Risks / Open Questions

- Whether tracker activation belongs on plan state or should be derived from recent use
- How much tracker metadata is needed to support future value-type variants

## E4-S6: Weekly View Relevance Rules For Monthly Objects

### Goal

Define the rules that decide which monthly objects appear in weekly planning and reflection so weekly workflows reflect the whole month without becoming chaotic.

### Scope

- Define when monthly objects should appear in weekly planning because they:
  - are assigned to the current week
  - are assigned to days in the current week
  - are active in the current month but still unassigned
- Define when monthly objects should appear in weekly reflection because they had:
  - activity
  - execution
  - relevance in the current week
- Keep these rules domain-level and reusable by future views.

### Acceptance Criteria

- The model can determine which monthly KR, habits, trackers, and initiatives are relevant to a given week.
- Weekly planning can include active monthly objects that remain unassigned.
- Weekly reflection can include monthly objects that had relevant activity in that week.
- The relevance rules are not embedded only in UI components.

### Dependencies

- `Epic 1`
- `E4-S2`
- `E4-S3`
- `E4-S4`
- `E4-S5`

### Risks / Open Questions

- How broad “relevance” should be for weekly reflection
- Risk of weekly views becoming overloaded if too many monthly objects are surfaced

## E4-S7: Month And Week Reflection Models

### Goal

Define the current-state reflection layer for months and weeks so the system can store user reflection alongside planning and progress.

### Scope

- Define monthly reflection state.
- Define weekly reflection state.
- Support reflection on:
  - goals
  - key results
  - habits
  - trackers
  - initiatives
  - the period overall
- Keep reflection separate from plan configuration and progress entries.
- Start with simple text reflection at object level plus simple overall reflection for the period.
- Create and edit object-level reflection only within period reflection flows:
  - monthly reflection
  - weekly reflection
- Treat object detail views as read-only consumers of those reflection entries.

### Acceptance Criteria

- The codebase has explicit monthly and weekly reflection models.
- Reflection can exist at both object level and whole-period level.
- Reflection state is separate from planning state and execution/progress data.
- The model supports weekly reflection on relevant monthly objects.
- The initial model supports simple freeform notes without requiring structured reflection fields.
- Object-level reflection entries are authored in period reflection flows, not as standalone object notes.
- Later views such as object detail can display reflection history without becoming a second reflection-editing surface.

### Dependencies

- `E4-S2`
- `E4-S3`
- `E4-S4`
- `E4-S5`
- `E4-S6`

### Risks / Open Questions

- Whether object-level reflection should be optional across all object types

## E4-S8: Persistence, Queries, And Test Coverage

### Goal

Persist the planning-state and reflection-state models safely and lock their behavior down with tests before UI-heavy epics build on them.

### Scope

- Add persistence support for:
  - `MonthPlan`
  - `WeekPlan`
  - month reflection
  - week reflection
  - object-level planning state where needed
  - progress/value entry state where needed
- Add query support for retrieving period state and relevant objects.
- Add automated tests for:
  - activation logic
  - planning-state rules
  - tracker state behavior
  - monthly-to-weekly relevance rules
  - reflection model behavior

### Acceptance Criteria

- Planning and reflection state for month and week can be persisted and retrieved reliably.
- Query logic can retrieve all state needed for later planning and reflection views.
- The main domain rules of Epic 4 are protected by automated tests.
- The implementation does not depend on final calendar UI decisions.

### Dependencies

- `E4-S1`
- `E4-S2`
- `E4-S3`
- `E4-S4`
- `E4-S5`
- `E4-S6`
- `E4-S7`

### Risks / Open Questions

- How normalized versus denormalized the planning-state persistence should be
- Risk of the state model becoming too fragmented across many small records
