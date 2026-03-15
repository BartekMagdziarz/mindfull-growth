# Simplification Epics

This document translates the agreed big picture into implementation epics. It is intentionally one level below `big picture` and one level above detailed stories.

## Recommended Delivery Order

1. `Calendar Backbone`
2. `Life Area Assessments`
3. `Planning Domain Core`
4. `Month And Week Planning State`
5. `KR, Habit, And Tracker Measurement Model`
6. `Calendar View`
7. `Objects Library`
8. `Today / Current Focus`
9. `Polish, Migration, And Hardening`

## Epic 1: Calendar Backbone

### Business Goal

Create a single, reliable time model that every planning, filtering, and reflection feature can build on.

### Scope

- Define canonical `PeriodRef` concepts for `year`, `month`, `week`, and `day`.
- Implement calendar rules:
  - week starts on `Monday`
  - week belongs to the year in which it starts
- Build shared utilities for:
  - period calculation
  - period comparison
  - period containment
  - period-based filtering
  - period-based aggregation
- Support navigation between year, month, week, and day views.
- Provide a reusable foundation for assigning objects to periods without relying on loose text tags.

### Out Of Scope

- Detailed planning objects such as `Goal`, `Habit`, or `Tracker`.
- Final calendar UX.
- Reflection content.

### Key Objects / Rules

- `PeriodRef`
- `YearRef`
- `MonthRef`
- `WeekRef`
- `DayRef`
- Inclusion rules between day, week, month, and year

### Risks / Open Questions

- Edge cases around weeks spanning months and years
- Exact representation format for `PeriodRef`
- Whether some helper data should be computed on the fly or stored

## Epic 2: Life Area Assessments

### Business Goal

Unify strategic life area reflection so that `Wheel of Life` and future planning flows work on one consistent model.

### Scope

- Introduce or reshape `LifeAreaAssessment` as the canonical assessment record.
- Align `Wheel of Life` with `LifeAreaAssessment`.
- Preserve `LifeArea` as the stable long-lived definition of a life area.
- Support capturing:
  - current state
  - optional `9/10` vision
  - reflection notes
- By default, one assessment should cover all active `LifeArea`.
- Past assessments may be edited.
- Allow assessments to be created at any time, not rigidly tied to a month.
- Enable later comparison of assessments over time.

### Out Of Scope

- Deep redesign of the existing `Wheel of Life` UX
- Goal, habit, tracker, or initiative planning
- Final annual planning UX

### Key Objects / Rules

- `LifeArea`
- `LifeAreaAssessment`
- `Wheel of Life` as UX flow, not competing domain model
- Clean break from current wheel snapshot data is acceptable if it simplifies the model

### Risks / Open Questions

- How much of existing exercise-specific wording should remain if we favor a clean-break simplified model

## Epic 3: Planning Domain Core

### Business Goal

Define the main planning objects and their relationships so the rest of the planning system has a stable domain foundation.

### Scope

- Introduce or formalize:
  - `Priority`
  - `Goal`
  - `KeyResult`
  - `Habit`
  - `Tracker`
  - `Initiative`
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
- Keep semantic boundaries explicit between these objects.
- Ensure the model is extensible for future subtypes and behavior variants.

### Out Of Scope

- Final planning screens
- Period-specific overrides and plan states
- Automatic linking or roll-up logic between objects

### Key Objects / Rules

- `Priority` is yearly
- `Goal` is cross-period, activated monthly, analyzed monthly
- `KeyResult` belongs to `Goal`
- `Habit` is not linked to `Goal`
- `Tracker` has no target in v1 and is not linked to `Goal`
- `Initiative` is always a single task
- `Goal`, `KeyResult`, `Habit`, and `Tracker` carry global lifecycle state on the base object

### Risks / Open Questions

- Exact field sets for each object
- Exact extensibility strategy for future KR / habit / tracker variants
- Potential UX ambiguity between `KeyResult` and `Habit`

## Epic 4: Month And Week Planning State

### Business Goal

Create the operational planning layer that turns domain objects into active monthly and weekly commitments and reflections.

### Scope

- Define current-state planning records for:
  - `MonthPlan`
  - `WeekPlan`
  - monthly reflection
  - weekly reflection
- Create plan and reflection state on demand rather than eagerly for every period.
- Support monthly activation of goals.
- Support period-specific planning behavior for:
  - `KeyResult`
  - `Habit`
  - `Tracker`
  - `Initiative`
- Support both for `KeyResult` and `Habit`:
  - planning on specific days
  - planning as `X times in a week/month`
- Support for `Initiative`:
  - planning on a specific day
  - planning in a specific week
  - planning in a specific month
- Support for `Tracker`:
  - value/progress entries without requiring planning on specific days
  - no requirement for `X measurements per week/month`
- Support showing monthly objects inside weekly planning when they:
  - are already assigned to that week
  - are assigned to days in that week
  - are active in the month but still unassigned
- Support weekly reflection on both weekly objects and relevant monthly objects.
- Treat global lifecycle state as separate from period activity state.

### Out Of Scope

- Full calendar UI
- Historical planning sessions
- Advanced automation between objects

### Key Objects / Rules

- Current plan state only, not session history
- `Goal` analysis is monthly
- `KeyResult` and `Habit` can be weekly or monthly
- `Tracker` does not require a planning cadence analogous to `KeyResult` or `Habit`
- Progress entry mode and analysis period are separate concerns
- `Goal` uses global lifecycle plus month-level activity state
- `KeyResult`, `Habit`, and `Tracker` use global lifecycle plus month/week activity state
- Month-level activity gates week-level activity

### Risks / Open Questions

- Exact schema of `MonthPlan` and `WeekPlan`
- How overrides should work between monthly and weekly state
- How much plan-state data should be explicit versus derived

## Epic 5: Calendar View

### Business Goal

Provide a single primary workspace where users can understand and operate on plans, reflections, targets, and results across time scales.

### Scope

- Build a unified `Calendar View` combining the responsibilities previously split between planning hub and period explorer.
- Focus on the desktop app only for now.
- Base the design on the existing neumorphic style used in the current `Journal` and `Emotions` views.
- Support scale switching:
  - year
  - month
  - week
  - day
- Surface in one coherent view:
  - active objects
  - targets
  - results
  - planning state
  - reflection state
- Make it easy to plan and inspect monthly objects from the weekly level.
- Keep important KR, habit, and tracker items visible in frequent-use views even when progress is not tied to exact days.

### Out Of Scope

- Full global object management
- Deep create/edit forms for every object
- Final “today” optimization layer

### Key Objects / Rules

- `Calendar View`
- Year / month / week / day navigation
- Visible distinction between planned, active, completed, and reflected states

### Risks / Open Questions

- Density and complexity of information in a single view
- How to present monthly-but-unassigned items in weekly planning clearly
- How to show Goals, KRs, Trackers, Habits, Initiatives in a non cluttered way, that will not overwhelm users

## Epic 6: Objects Library

### Business Goal

Give users a stable place to browse, search, filter, edit, and inspect all planning objects independently of the calendar workflow.

### Scope

- Create a library view for all goals, key results, habits, trackers, and initiatives.
- Base the design on the existing neumorphic style used in the current `Journal` and `Emotions` views.
- Support filtering by:
  - object type
  - year
  - month
  - week
  - day
  - linked life areas
  - linked priorities
- Provide detail views and edit flows.
- Support navigating from an object to the periods it belongs to and vice versa.
- Allow object detail views to display period reflection history without introducing standalone reflection editing there.

### Out Of Scope

- Primary planning UX
- Year/month/week/day calendar orchestration
- Reflection-heavy period workflows

### Key Objects / Rules

- Cross-object search and filters
- Object detail drill-down
- Links back to relevant periods
- Progressive disclosure principles used for this database to not overwhelm users
- Prefer separate subviews by object family:
  - `Goals` and their `KeyResults`
  - `Habits`
  - `Trackers`
  - `Initiatives`

### Risks / Open Questions

- How much history or derived information should be shown on object detail pages
- How to keep filtering performant as object count grows

## Epic 7: Today / Current Focus

### Business Goal

Provide a lightweight operational view for the user’s most immediate commitments without duplicating planning logic.

### Scope

- Surface what matters today.
- Surface what matters in the current week and month.
- Reuse the same planning model as `Calendar View`.
- Reuse the execution and measurement model established in `Epic 9` rather than inventing separate progress semantics inside `Today`.
- Base the design on the existing neumorphic style used in the current `Journal` and `Emotions` views.
- Make it quick to update progress for relevant KR, habits, trackers, and initiatives.
- Favor fast interaction over deep analysis.

### Out Of Scope

- Becoming a second planning system
- Replacing the full calendar workflow
- Full-object editing

### Key Objects / Rules

- Focused slice of current commitments
- Fast progress capture
- Clear visibility of open items from weekly and monthly context
- Primary sectioning by operational context:
  - `Scheduled for today`
  - `Active this week`
  - `Active this month`
- Weekly planning can decide whether a weekly or monthly object is active in the current week.
- If an object is active in the week, it should stay visible throughout that week.
- In `Today`, the user can temporarily hide an active weekly or monthly object for one day only; it should return the next day.
- Hidden objects should be easy to restore the same day through a lightweight collapsed affordance rather than returning to the main lists immediately.
- Feature to reschedule items scheduled for this specific day:
  - move the item to another day
  - or clear the currently scheduled date without immediately assigning a new one
- Feature to delete items scheduled for this specific day:
  - deleting here removes the whole object, not just today's assignment
- In the KRs, Habits and Trackers cards indicate this period progress in a minimalistic way, so for example user is shown how many times this week/month was a Habit done, but also must be very clearly shown today's "tick-box" or other type of field that needs to be filled today and how many days remain in this period.

### Risks / Open Questions

- Avoiding duplication with `Calendar View`
- Avoiding local `Today` workarounds that bypass the shared measurement contract from `Epic 9`
- Deciding how much planning power belongs here versus in the main calendar
- Avoiding a cluttered “dashboard” feel

## Epic 8: Polish, Migration, And Hardening

### Business Goal

Make the planning system robust enough to replace or extend current flows safely and support future evolution.

### Scope

- Data migrations from any current or intermediate models
- Routing and navigation cleanup
- Edge-case handling for calendar and plan-state logic
- Final hardening after the measurement-model refactor and the `Today` workflow are in place
- Performance tuning for filtering and aggregation
- Test coverage for domain logic, repositories, stores, and core interaction flows
- UX polish for clarity and consistency while preserving the existing neumorphic design language used in current core views

### Out Of Scope

- New product concepts outside the agreed big picture
- Advanced analytics beyond what is needed for the core planning experience

### Key Objects / Rules

- Migration safety
- Backward compatibility where needed
- Testable domain boundaries

### Risks / Open Questions

- Migration complexity from existing local-first data
- Risk of hidden coupling with current exercise and history features
- Need for explicit fallback behavior when old data is incomplete

## Epic 9: KR, Habit, And Tracker Measurement Model

### Business Goal

Introduce and stabilize a simple shared execution / measurement model for `KeyResult`, `Habit`, and `Tracker` so downstream surfaces can rely on one honest source of progress, targets, and quick logging.

### Scope

- Start from the current implemented baseline rather than from the older abstract plan:
  - `KeyResult` and `Habit` currently define `cadence`, `kind`, and empty `config`
  - `Tracker` currently defines `analysisPeriod`, `entryMode`, `kind`, and empty `config`
  - KR / habit planning semantics currently live in period state via `planningMode`, `targetCount`, and day assignments
  - tracker progress currently lives in `TrackerEntry` records with `periodType`, `periodRef`, `value`, and optional `note`
- Introduce a shared configuration model for:
  - `Entry mode`
  - `Cadence`
- Support these `Entry mode` values:
  - `Completion`
  - `Counter`
  - `Value`
  - `Rating`
- Support these `Cadence` values:
  - `Weekly`
  - `Monthly`
- Add `Target` rules for `KeyResult` and `Habit`:
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
- Keep `Tracker` targetless in `v1`.
- Support `max 1 entry per day` per object.
- Introduce shared `schedule scope` in period planning state for `KeyResult`, `Habit`, and `Tracker`:
  - `Unassigned in period`
  - `Specific days`
  - `Whole week`
  - `Whole month`
- Treat `schedule scope` as visibility / planning support, not as part of scoring logic.
- Allow `actual` to exceed `target`.
- Support an optional period-level `success note` for `KeyResult` and `Habit` at both month and week level to aid later reflection.
- Refactor existing assumptions from `Epic 4` where target and planning semantics currently live in period state rather than in the shared object model.
- Update query and view-model contracts used by `Calendar View`, `Objects Library`, and `Today` so they depend on the new shared measurement layer.
- Update existing create/edit forms and badges already implemented in `Objects Library` and `Calendar View` so they reflect the new model rather than the current `cadence / analysisPeriod / planningMode / targetCount` mix.
- Use a clean break for existing local data affected by this semantic shift.
- Treat this epic as a foundation/refactor, not only as a new feature.

### Out Of Scope

- Percent-based scoring
- `Working days` or other denominator logic in scoring
- `Planned days` as a denominator in scoring
- Minimum sample-count rules
- Multiple entries per day
- Automatic KR calculation from `Habit` or `Tracker`
- Composite or weighted rule logic

### Key Objects / Rules

- Shared measurement engine underneath `KeyResult`, `Habit`, and `Tracker`
- `Entry mode` plus `Cadence` are part of object definition
- `Target` applies only to `KeyResult` and `Habit`
- `Tracker` logs values without pass/fail evaluation
- `schedule scope` lives in period planning state, not object definition
- `schedule scope` influences visibility and planning convenience only
- `schedule scope` does not cap logging or define success
- `actual` is calculated from daily entries within the cadence period
- `success note` is not scored automatically; it supports reflection only
- This epic should land before further work that depends on honest KR / Habit / Tracker progress semantics, especially `Today`
- The epic must explicitly translate or replace the current contracts:
  - `Tracker.analysisPeriod`
  - current `Tracker.entryMode` (`day | week | month`)
  - `CadencedMonthState.planningMode`
  - `CadencedMonthState.targetCount`
  - `CadencedWeekState.planningMode`
  - `CadencedWeekState.targetCount`
  - `CadencedDayAssignment`
  - `TrackerEntry.periodType`
- `TrackerEntry.note` is intentionally removed from the Epic 9 measurement core.
- Existing over-allocation logic based on month and week `targetCount` is part of the old contract and is intentionally removed under the new model.
- The epic must not leave both the old and new measurement semantics active in parallel.

### Risks / Open Questions

- Cross-cutting refactor cost across domain, period state, queries, badges, and forms
- Semantic migration cost from the currently implemented `planningMode / targetCount / tracker entry period` model into the simplified measurement model
- Naming collision risk between the current tracker `entryMode` field and the new shared `Entry mode` concept
- Whether the simplified rule set is enough for early real-world use without percent-based logic
- How creation flows should steer users away from unsupported use-cases without feeling restrictive
- When it becomes worth reintroducing richer denominator-based evaluation
