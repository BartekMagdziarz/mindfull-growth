# Final Simplified KR, Habit, And Tracker Model

This document captures the agreed simplified `v1` model for `KeyResult`, `Habit`, and `Tracker`. The goal is to cover the most useful initial use-cases with a small, understandable ruleset rather than a large set of predefined types.

## Design Principles

- Use one shared behavioral model instead of many domain-specific item types.
- Keep `v1` intentionally simple, even if some use-cases must be translated into simpler targets.
- Separate:
  - object definition
  - period planning visibility
  - execution entries
  - reflection
- Allow planning on specific days without making day assignment part of scoring logic.

## Core Shared Fields

Each `KeyResult`, `Habit`, and `Tracker` should define:

- `Entry mode`
  - `Completion`
  - `Counter`
  - `Value`
  - `Rating`
- `Cadence`
  - `Weekly`
  - `Monthly`

Optional supporting metadata may still exist where useful, for example:

- unit / label for `Value`
- scale label for `Rating`

These are presentation details, not separate behavioral types.

## KR And Habit Target Model

`KeyResult` and `Habit` add one required `Target` configuration.

### Targets For `Completion` And `Counter`

- `min in cadence period`
- `max in cadence period`

### Targets For `Value`

- `sum >= x`
- `sum <= x`
- `average >= x`
- `average <= x`
- `last value >= x`
- `last value <= x`

### Targets For `Rating`

- `average >= x`
- `average <= x`

## Tracker Model

`Tracker` uses the same `Entry mode` and `Cadence`, but does not have a `Target` in `v1`.

Trackers exist for logging and later review, not for pass/fail evaluation.

## Execution Model

### Daily Entries

- `v1` supports `max 1 entry per day` per object.
- If the user wants to record multiple focus sessions or many emotion logs in one day, they aggregate those into one daily value or use a `Counter`.
- This applies equally to `KeyResult`, `Habit`, and `Tracker`.

### Actual Result Calculation

The system computes `actual` from daily entries inside the object's cadence period.

Examples:

- `Completion / Counter`
  - count of entries or count value in the period
- `Value`
  - sum, average, or last value in the period
- `Rating`
  - average rating in the period

`actual` may exceed `target`.

## Schedule Scope

`Schedule scope` is shared by `KeyResult`, `Habit`, and `Tracker`, but it belongs to period planning state rather than the object definition itself.

Its purpose is visibility and planning support, not scoring.

### Supported Scope Values

- `Unassigned in period`
- `Specific days`
- `Whole week`
- `Whole month`

### Meaning

- `Specific days`
  - the object should be especially visible on selected dates
- `Whole week`
  - the object should stay visible through the current week
- `Whole month`
  - the object should stay visible through the current month
- `Unassigned in period`
  - the object is active but not yet explicitly placed

### Important Rule

`Schedule scope` does **not** define the denominator or scoring rule.

It only affects:

- what is visible in planning
- what is surfaced in `Calendar View`
- what is surfaced in `Today`
- rescheduling and day-level planning convenience

It does **not** cap what can be logged.

Examples:

- a weekly habit with target `min 4` can still be scheduled on all 7 days
- a weekly KR with target `min 3` can still be visible on all working days
- a monthly tracker can be visible only on the last three days of the month

## Soft Success Note

For `KeyResult` and `Habit`, period planning may include an optional text field:

- `Success note`

This is a human aid for reflection, not part of scoring logic.

Examples:

- `If I do 4 instead of 5 this week, I will still consider it a good result.`
- `If I miss one day because of travel, the month is still acceptable.`

This note should be entered in monthly or weekly planning and shown again during the related reflection flow.

## What The Simplified Model Covers Well

### Directly Supported

- `Medytacja min. 4 razy w tygodniu`
- `Trening Zone 2 min. 8 razy w miesiącu`
- `Max 1 dzień ze słodyczami w tygodniu`
- `5h pracy w skupieniu tygodniowo`
- `Średnia ocena wyborów żywieniowych >= 3.5`
- `Waga na koniec okresu <= X`
- `1 muscle-up w miesiącu`
- `Tracker suplementów`
- `Tracker liczby odwiedzin u rodziców`
- `Tracker czasu biegu na 5 km, widoczny tylko pod koniec miesiąca`

### Supported Via Schedule Scope

- weekly habit with `min 4` target but visible every day of the week
- weekly KR with `min 3` target but visible on all working days
- monthly tracker visible only in a chosen week or on chosen days

## What Is Explicitly Deferred

The simplified model does **not** support natively in this epic:

- percentages of days
- percentages of planned days
- `working days` or other denominator logic in scoring
- minimum sample count rules
- multiple entries per day
- automatic KR calculation from `Habit` or `Tracker`
- composite rules
- weighted rules
- advanced threshold-day formulas

These may come later if real usage justifies the added complexity.

## Translation Strategy For Deferred Use-Cases

Some richer goals can still be approximated in `v1` by translating them into simpler targets.

Examples:

- `80% dni z journalingiem`
  - translate to a concrete weekly or monthly `min count`
- `90% zaplanowanych sesji`
  - translate to a concrete `min count`
- `80% dni poniżej 2000 kcal`
  - use a `Completion` KR for `day under 2000 kcal` with a concrete count target
  - optionally keep a separate `Value` tracker for calories

## Examples In The Final Model

### Habit: Meditation

- `Entry mode`: `Completion`
- `Cadence`: `Weekly`
- `Target`: `min 4 in period`
- `Schedule scope`: optional, for example `Whole week` or `Specific days`

### KR: Work Shutdown Routine

- `Entry mode`: `Completion`
- `Cadence`: `Weekly`
- `Target`: `min 3 in period`
- `Schedule scope`: optional, for example all working days of the week

### Habit: Focused Work

- `Entry mode`: `Value`
- `Cadence`: `Weekly`
- `Target`: `sum >= 300`
- unit: `minutes`

### KR: Nutrition Choices

- `Entry mode`: `Rating`
- `Cadence`: `Monthly`
- `Target`: `average >= 3.5`

### Tracker: Supplements

- `Entry mode`: `Completion`
- `Cadence`: `Weekly` or `Monthly`
- no target

### Tracker: 5 km Test Run

- `Entry mode`: `Value`
- `Cadence`: `Monthly`
- no target
- `Schedule scope`: `Specific days` near the end of the month

## Recommended Next Epic Direction

The next implementation epic should be built around:

- shared `Entry mode`
- shared `Cadence`
- `Target` rules for `KeyResult` and `Habit`
- no-target logging model for `Tracker`
- shared `Schedule scope` in period planning state
- daily single-entry execution
- reflection support using:
  - `target`
  - `actual`
  - `success note`
  - manual reflection
