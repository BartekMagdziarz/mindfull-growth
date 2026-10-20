# Epic 1 Stories: Calendar Backbone

This document breaks down `Epic 1: Calendar Backbone` into implementation stories. These stories should establish the canonical time model and reusable period logic for the rest of the planning system.

## Recommended Story Order

1. `E1-S1: Canonical PeriodRef Model`
2. `E1-S2: Period Calculation And Boundary Rules`
3. `E1-S3: Period Navigation Helpers`
4. `E1-S4: Period Membership And Assignment Helpers`
5. `E1-S5: Shared Filtering And Aggregation Primitives`
6. `E1-S6: Calendar Edge Cases And Test Coverage`

## E1-S1: Canonical PeriodRef Model

### Goal

Define the canonical language and data structure for `year`, `month`, `week`, and `day` so the rest of the system can rely on one consistent model.

### Scope

- Define `YearRef`, `MonthRef`, `WeekRef`, and `DayRef`.
- Define the canonical representation format for each:
  - `YearRef`: `2026`
  - `MonthRef`: `2026-03`
  - `WeekRef`: `2026-W11`
  - `DayRef`: `2026-03-12`
- Define parse / validate / serialize helpers.
- Ensure the model captures the agreed rules:
  - week starts on `Monday`
  - week belongs to the year in which it starts

### Acceptance Criteria

- The codebase has one canonical representation for each period type.
- Invalid period references are rejected consistently.
- Period references can be serialized and deserialized safely.
- The agreed week ownership rule is represented explicitly in the model.

### Dependencies

- None

### Risks / Open Questions

- Whether period refs should be stored as plain strings, typed objects, or both

## E1-S2: Period Calculation And Boundary Rules

### Goal

Make the system able to derive period references and date boundaries from real dates in a reliable, testable way.

### Scope

- Compute `YearRef`, `MonthRef`, `WeekRef`, and `DayRef` from a date.
- Compute start and end dates for each period type.
- Compute which month(s) a week overlaps.
- Support year-boundary and month-boundary behavior.
- Use the user's local calendar date rather than UTC day boundaries for planning logic.

### Acceptance Criteria

- Given any date, the system can derive all relevant period references.
- A day at the start of a year can belong to a week that started in the previous year.
- A week can overlap multiple months and the helper logic returns that correctly.
- Start and end boundaries for year, month, week, and day are deterministic and covered by tests.

### Dependencies

- `E1-S1`

### Risks / Open Questions

- Off-by-one errors around midnight and date parsing

## E1-S3: Period Navigation Helpers

### Goal

Provide reusable logic for moving between periods and switching time scale without embedding calendar behavior directly into views.

### Scope

- Support previous / next navigation for year, month, week, and day.
- Support moving from one scale to another while keeping sensible context.
- Support parent / child relationships:
  - year -> month
  - month -> week
  - week -> day
- Provide helper logic for “zooming” in and out of calendar scales.
- When moving from `month` to `week`:
  - if the user selected a concrete day, open that day's week
  - otherwise, open the week containing the first day of the month

### Acceptance Criteria

- The system can move to previous and next period for all supported scales.
- The system can switch between scales without losing calendar context unnecessarily.
- Parent / child navigation rules are implemented and documented.
- The logic is reusable outside UI components.

### Dependencies

- `E1-S1`
- `E1-S2`

### Risks / Open Questions

- Whether zoom behavior should always preserve the currently selected date

## E1-S4: Period Membership And Assignment Helpers

### Goal

Create reusable logic for attaching things to periods and determining whether they belong in a target year, month, week, or day.

### Scope

- Define the foundational helper model for assigning things to:
  - a specific day
  - a specific week
  - a specific month
- Support determining whether an assigned item is relevant to a target period.
- Support overlap and containment checks between assigned periods and viewed periods.
- Make this logic generic enough to reuse later for goals, key results, habits, trackers, and initiatives.

### Acceptance Criteria

- The system can determine whether a day-assigned item belongs in a given week or month view.
- The system can determine whether a week-assigned item belongs in a given month or year view.
- The system can determine whether a month-assigned item is relevant to a given week when later stories provide the scheduling rules.
- The helper model does not depend on any specific planning object type.

### Dependencies

- `E1-S1`
- `E1-S2`

### Risks / Open Questions

- How much assignment logic should live in generic helpers versus object-specific planning layers
- Risk of over-generalizing too early

## E1-S5: Shared Filtering And Aggregation Primitives

### Goal

Provide a shared foundation for querying and summarizing period-linked data consistently across future views and features.

### Scope

- Build shared helpers for period-based filtering.
- Build shared helpers for grouping data by period.
- Build shared helpers for simple period-level aggregation counts.
- Make these helpers reusable by future planning, reflection, and library views.

### Acceptance Criteria

- A future feature can ask for “items relevant to this week/month/year” using shared primitives.
- Period grouping and counting behavior is consistent across helpers.
- The helpers are generic enough to work with multiple object types later.
- The implementation does not assume any specific UI view.

### Dependencies

- `E1-S1`
- `E1-S2`
- `E1-S4`

### Risks / Open Questions

- Whether some aggregation should remain view-specific rather than generic
- Performance implications once object counts grow

## E1-S6: Calendar Edge Cases And Test Coverage

### Goal

Lock down the time model with explicit tests so later epics can build on it safely.

### Scope

- Add test coverage for:
  - year boundaries
  - month boundaries
  - weeks spanning months
  - weeks spanning years
  - previous / next navigation
  - period membership checks
- Document known edge-case expectations in test cases.

### Acceptance Criteria

- The main calendar rules are covered by automated tests.
- Edge cases around year and month transitions are explicitly asserted.
- Future changes to period logic will fail loudly if they break agreed behavior.
- The test suite acts as living documentation for the calendar backbone.

### Dependencies

- `E1-S1`
- `E1-S2`
- `E1-S3`
- `E1-S4`
- `E1-S5`

### Risks / Open Questions

- Keeping tests readable while covering enough boundary cases
- Avoiding duplicated assertions across helper test suites
