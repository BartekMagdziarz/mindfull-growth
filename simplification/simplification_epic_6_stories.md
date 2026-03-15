# Epic 6 Stories: Objects Library

This document breaks down `Epic 6: Objects Library` into implementation stories. These stories should define the stable management and inspection surface for planning objects outside the calendar workflow.

## Recommended Story Order

1. `E6-S1: Objects Library Information Architecture`
2. `E6-S2: Shared Search, Filter, And Query State`
3. `E6-S3: Goals And KeyResults Subview`
4. `E6-S4: Habits Subview`
5. `E6-S5: Trackers Subview`
6. `E6-S6: Initiatives Subview`
7. `E6-S7: Object Detail Views And Reflection History`
8. `E6-S8: Edit Flows And Cross-Navigation`
9. `E6-S9: Performance, Polish, And Test Coverage`

## E6-S1: Objects Library Information Architecture

### Goal

Define the desktop-first structure of `Objects Library` so users can browse, inspect, and manage planning objects without depending on the calendar workflow.

### Scope

- Define the top-level information architecture for `Objects Library`.
- Base the visual direction on the existing neumorphic language used in the current `Journal` and `Emotions` views.
- Keep the library separate from `Calendar View`, while preserving clear links between them.
- Organize the library around separate subviews by object family:
  - `Goals` and their `KeyResults`
  - `Habits`
  - `Trackers`
  - `Initiatives`
- Do not introduce a catch-all `All objects` view in v1.
- Apply progressive disclosure to avoid overwhelming the user.

### Acceptance Criteria

- The product has one documented information architecture for `Objects Library`.
- The design direction explicitly continues the existing neumorphic style.
- The library is organized around separate object-family subviews rather than one mixed catalog.
- The information architecture supports browse, detail, and edit flows without depending on calendar screens.
- The v1 library entry structure does not rely on a separate `All objects` catch-all screen.

### Dependencies

- `Epic 3`
- `Epic 5`

### Risks / Open Questions

- How much common structure should be shared across all subviews
- Risk of over-fragmenting the library into too many navigation layers

## E6-S2: Shared Search, Filter, And Query State

### Goal

Provide one reusable search and filter model for the library so all object-family subviews behave consistently.

### Scope

- Support filtering by:
  - object type
  - year
  - month
  - week
  - day
  - linked life areas
  - linked priorities
- Support text search where relevant.
- Define how period-based filters work against object definitions, plan state, and linked period data.
- Treat period filters as `object was relevant in this period`, not only `object was directly assigned to this period`.
- Keep query and filter state reusable across all subviews.

### Acceptance Criteria

- All object-family subviews can use the same shared filter and query model.
- Period, life-area, and priority filters behave consistently across the library.
- The query model is independent from one specific object-family screen.
- The library can answer “show me objects relevant to this period” without relying on `Calendar View`.
- Period filters can surface objects that were relevant to a period even if they were not directly assigned at the base-object level.

### Dependencies

- `Epic 1`
- `Epic 3`
- `Epic 4`
- `E6-S1`

### Risks / Open Questions

- How broad period relevance should be for each object type
- Whether free-text search should be global or subview-specific in v1

## E6-S3: Goals And KeyResults Subview

### Goal

Create a dedicated library subview for goals and their owned key results so users can inspect goal structure and status in one place.

### Scope

- Build the `Goals` subview as a dedicated object-family screen.
- Present goals together with their owned key results.
- Surface relevant goal and KR information, such as:
  - lifecycle state
  - linked priorities
  - linked life areas
  - active/inactive operational context where relevant
  - high-level progress context
- Support drill-down from a goal to its detail view and related key results.

### Acceptance Criteria

- Goals and key results are presented together in one coherent subview.
- The subview respects the ownership relationship `KeyResult -> Goal`.
- Users can browse goals without needing to open the calendar.
- The subview exposes enough linked context to understand how a goal fits into the planning system.

### Dependencies

- `Epic 3`
- `Epic 4`
- `E6-S1`
- `E6-S2`

### Risks / Open Questions

- How much KR detail should be shown directly in the list versus only in detail views
- Whether goal progress should stay summary-only until later analytics work

## E6-S4: Habits Subview

### Goal

Create a dedicated library subview for habits so users can inspect recurring behaviors independently from goals and trackers.

### Scope

- Build the `Habits` subview as a dedicated object-family screen.
- Surface habit-specific information, such as:
  - lifecycle state
  - month/week activity context where relevant
  - cadence
  - linked priorities
  - linked life areas
  - summary progress context
- Support drill-down into habit detail and edit flows.

### Acceptance Criteria

- Habits are browsable in a dedicated subview.
- Habit lifecycle and operational context are visible without entering the calendar.
- The subview is consistent with the shared filter model.
- Habit presentation remains distinct from goals and trackers.

### Dependencies

- `Epic 3`
- `Epic 4`
- `E6-S1`
- `E6-S2`

### Risks / Open Questions

- How much progress history should appear in the list view
- How to distinguish cadence, activity state, and progress without overloading the UI

## E6-S5: Trackers Subview

### Goal

Create a dedicated library subview for trackers so users can inspect monitoring objects separately from target-driven planning objects.

### Scope

- Build the `Trackers` subview as a dedicated object-family screen.
- Surface tracker-specific information, such as:
  - lifecycle state
  - month/week activity context where relevant
  - linked priorities
  - linked life areas
  - value-entry context
  - summary trends or latest values where appropriate
- Preserve the distinction that trackers do not have targets in v1.

### Acceptance Criteria

- Trackers are browsable in a dedicated subview.
- The subview does not imply target semantics for trackers.
- Tracker lifecycle and activity context are visible without entering the calendar.
- The presentation is aligned with the shared library patterns while remaining tracker-specific.

### Dependencies

- `Epic 3`
- `Epic 4`
- `E6-S1`
- `E6-S2`

### Risks / Open Questions

- How much latest-value or trend information belongs in the list versus detail
- How to keep tracker cards informative without suggesting target completion semantics

## E6-S6: Initiatives Subview

### Goal

Create a dedicated library subview for initiatives so users can manage one-time commitments independently from recurring or measured objects.

### Scope

- Build the `Initiatives` subview as a dedicated object-family screen.
- Surface initiative-specific information, such as:
  - current schedule context
  - linked goal / priority / life area
  - completion state
  - period relevance
- Support drill-down into initiative detail and edit flows.

### Acceptance Criteria

- Initiatives are browsable in a dedicated subview.
- The subview preserves initiative semantics as single tasks rather than projects.
- Schedule context is visible without opening the calendar.
- The subview fits the shared library structure while remaining initiative-specific.

### Dependencies

- `Epic 3`
- `Epic 4`
- `E6-S1`
- `E6-S2`

### Risks / Open Questions

- How much scheduling detail should be shown directly in the list
- Whether completed initiatives should be hidden by default or remain visible

## E6-S7: Object Detail Views And Reflection History

### Goal

Define object detail views that give full context for a single object, including linked periods and read-only reflection history, without creating a second reflection-editing surface.

### Scope

- Define detail-view structure for each object family.
- Surface:
  - core definition fields
  - lifecycle state
  - linked entities
  - linked periods
  - relevant plan-state context
  - read-only period reflection history
- Show monthly and weekly reflection entries for an object where relevant.
- Keep reflection editing out of object detail views.
- Show linked-period and reflection history in a shortened view first, with the ability to expand to fuller history.

### Acceptance Criteria

- Each object family has a clear detail-view model.
- Object detail views can display reflection history sourced from period reflections.
- Reflection history is read-only from the object-detail level.
- Users can understand how the object connects to periods and other entities from one place.
- Detail views use progressive disclosure for period and reflection history rather than dumping full history by default.

### Dependencies

- `Epic 4`
- `E6-S1`
- `E6-S2`
- `E6-S3`
- `E6-S4`
- `E6-S5`
- `E6-S6`

### Risks / Open Questions

- How much period history should be shown before detail views become too dense
- Whether list-to-detail transitions should preserve active library filters

## E6-S8: Edit Flows And Cross-Navigation

### Goal

Support editing and navigation from the library without turning it into a replacement for the calendar-based planning workflow.

### Scope

- Provide edit flows for object definitions from the library.
- Provide quick archive / unarchive actions from library lists where appropriate.
- Support cross-navigation:
  - from object to linked periods
  - from period context back to object detail
  - from object detail to related entities where useful
- Keep editing focused on object definition and linkage, not period reflection editing.
- Clarify where the boundary sits between:
  - object editing in the library
  - period planning in `Calendar View`

### Acceptance Criteria

- Users can edit objects from the library without depending on calendar screens.
- Users can archive or unarchive supported objects directly from list-level interactions where appropriate.
- Cross-navigation between object detail and relevant periods is supported.
- The library does not become a second planning/reflection system.
- The boundary between definition editing and period planning remains explicit.

### Dependencies

- `Epic 3`
- `Epic 4`
- `Epic 5`
- `E6-S7`

### Risks / Open Questions

- How much period-state editing should be allowed from object detail before it duplicates `Calendar View`
- Whether some edits should intentionally redirect the user into the calendar workflow

## E6-S9: Performance, Polish, And Test Coverage

### Goal

Make the library robust enough to support growing object counts and repeated navigation without becoming slow or confusing.

### Scope

- Add performance-oriented handling for:
  - filtering
  - searching
  - list rendering
  - detail loading
- Add interaction polish consistent with the neumorphic design language.
- Add automated tests for:
  - filter behavior
  - subview navigation
  - detail-view rendering
  - reflection history visibility
  - cross-navigation behavior

### Acceptance Criteria

- The library remains usable with a meaningful number of objects.
- Core filter and navigation behavior is covered by automated tests.
- Reflection history and linked-period behavior are tested.
- The final experience stays consistent with the existing visual language and the agreed library boundaries.

### Dependencies

- `E6-S1`
- `E6-S2`
- `E6-S3`
- `E6-S4`
- `E6-S5`
- `E6-S6`
- `E6-S7`
- `E6-S8`

### Risks / Open Questions

- How much optimization is needed before real usage data exists
- Risk of the library becoming too feature-dense compared with the calendar workflow
