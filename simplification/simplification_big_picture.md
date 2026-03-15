# Final Big Picture

This document captures the agreed high-level direction for the planning and reflection system. It is the baseline for defining epics and stories.

## Core Assumptions

- The system should support planning and reflection in yearly, monthly, and weekly intervals, with the ability to drill down to the day level.
- `Life Areas` are the stable strategic layer used to analyze the rest of the system.
- Core objects keep their own semantics. We share mechanisms, not meanings.
- The system should be designed for future extension so that new object types, behaviors, and intervals can be added without rebuilding the foundation.

## Time Model

- The system is based on `Year`, `Month`, `Week`, and `Day`.
- A week always starts on `Monday`.
- A week belongs to the year in which it `starts`.
- Periods are represented by explicit `PeriodRef` values, not loose text tags.
- A day is a canonical date. Weeks and months are structural references used for filtering, aggregation, and planning.

## Main Domain Objects

### LifeArea

- A long-lived definition of a life area.

### LifeAreaAssessment

- An assessment of a life area captured at a specific point in time.
- It is not rigidly attached to a month.
- `Wheel of Life` is treated as a UX flow for creating `LifeAreaAssessment`, not as a separate competing domain concept.
- By default, one assessment covers all active `LifeArea`.
- `LifeArea.successPicture` is the current `9/10` vision, while `LifeAreaAssessment` stores the historical assessment snapshot.
- Past assessments may be edited.

### Priority

- A yearly direction of focus.
- It can be linked to multiple `LifeArea`.

### Goal

- A cross-period qualitative result the user wants to achieve.
- It can be linked to multiple `Priority` and multiple `LifeArea`.
- It has global lifecycle state: `open | completed | dropped`.
- It is activated in months through month-level activity state.
- It is always analyzed monthly.

### KeyResult

- A measurable indicator of progress for a `Goal`.
- It belongs to a `Goal`.
- It has global lifecycle state: `open | completed | dropped`.
- It can have month-level and week-level activity state.
- It has either `weekly` or `monthly` cadence.
- It can be planned on specific days or as `X times in a period`.

### Habit

- A standalone recurring behavior.
- It can be linked to `Priority` and `LifeArea`.
- It is not linked to `Goal`.
- It has global lifecycle state: `open | retired | dropped`.
- It can have month-level and week-level activity state.
- It works analogously to `KeyResult` in terms of planning behavior.

### Tracker

- A standalone monitoring object.
- It can be linked to `Priority` and `LifeArea`.
- It is not linked to `Goal`, `Habit`, or `KeyResult`.
- It has global lifecycle state: `open | retired | dropped`.
- It can have month-level and week-level activity state.
- In v1 it has no target.

### Initiative

- A single task or commitment.
- It can stand alone or be linked to `Goal`, `Priority`, and/or `LifeArea`.
- It can be planned for a `day`, `week`, or `month`.

## Semantic Boundaries

- `Priority`: what matters most this year.
- `Goal`: what qualitative result the user wants to achieve.
- `KeyResult`: how progress on a goal is measured.
- `Habit`: what the user wants to do regularly.
- `Tracker`: what the user wants to observe informatively.
- `Initiative`: what one-time task the user wants to complete.

## Plan, Execution, Reflection

- The model should logically separate `Definition`, `Plan`, `Execution`, and `Reflection`.
- The model should also separate:
  - global lifecycle state on the base object
  - period activity state in month/week planning
- The system does not store a full history of planning/reflection sessions.
- The system stores the current plan state and current reflection state for `year`, `month`, and `week`.
- This implies future entities such as `YearPlan`, `MonthPlan`, `WeekPlan`, and matching reflection records.

## Unified Approach for KeyResult, Habit, and Tracker

- `KeyResult`, `Habit`, and `Tracker` should share a broadly similar mechanism for progress entry and presentation.
- The model must separate:
  - analysis period
  - planning mode
  - progress entry mode
- An object can be analyzed weekly or monthly, while its progress can be recorded:
  - per day
  - as a weekly aggregate
  - as a monthly aggregate
- Daily entries are optional. The model allows them, but not every object must store progress tied to exact dates.
- A user may increase progress across a week without storing which exact day the activity happened.
- From a UX perspective, these objects should stay visible in frequently visited views even when progress is not logged daily.

## Period Rules by Object

- `Goal` has global lifecycle state and month-level activity state. It is analyzed monthly.
- `KeyResult` has global lifecycle state, month/week activity state, and can be weekly or monthly.
- `Habit` has global lifecycle state, month/week activity state, and can be weekly or monthly.
- `Tracker` has global lifecycle state, month/week activity state, can be analyzed weekly or monthly, and can have daily, weekly, or monthly entries.
- `Initiative` can be assigned to a month, a week, or a specific day.

## User Process

### Yearly Planning

- Assess life areas.
- Define the `9/10` vision.
- Choose yearly priorities.

### Yearly Reflection

- Compare the current state with the beginning of the year.
- Review priorities and the work done around them.

### Monthly Planning

- Activate, pause, resume, or close goals according to their lifecycle and month-level activity state.
- Set up key results.
- Set up habits.
- Plan initiatives.
- Include relevant trackers.

### Monthly Reflection

- Analyze goals, key results, habits, trackers, and initiatives.
- Add general reflection for the month.

### Weekly Planning

- Show weekly objects for the current week.
- Show monthly objects already assigned to the week or to days within that week.
- Show monthly objects that are active in the month but still unassigned, so the user can plan them into the week.
- Allow monthly target work to be distributed across weeks without turning weekly allocations into separate independent targets.

### Weekly Reflection

- Cover weekly objects for the week.
- Also cover monthly objects that had activity, execution, or relevance during that week.

## UX Direction

- `Planning Hub` and `Period Explorer` are combined into one main view, working name: `Calendar View`.
- `Calendar View` allows switching scale between `year`, `month`, `week`, and `day`.
- In this view, the user sees plan, reflection, active objects, targets, and results.
- `Objects Library` remains a separate view for browsing, filtering, and editing all goals, key results, habits, trackers, and initiatives.
- A simplified `Today / Current Focus` view may still exist, but it should be a focused slice of the same model, not a separate logic system.
- New planning UI should extend the existing neumorphic visual language already used in the current `Journal` and `Emotions` flows, rather than introducing a new design system.

## Explicit v1 Constraints

- No automatic calculation of `KeyResult` from `Habit`.
- No automatic calculation of `KeyResult` from `Tracker`.
- `Tracker` has no target in v1.
- No history of planning/reflection sessions.
- `LifeAreaAssessment` can be performed at any time and is not rigidly attached to a month.
- `MonthPlan`, `WeekPlan`, and matching reflections are created on demand rather than eagerly for every period.

## Deferred to Epics

- Exact `KeyResult` types.
- Exact `Tracker` types.
- Detailed `MonthPlan` and `WeekPlan` model.
- Final UX design of `Calendar View`.
- Exact override and edit rules.
- Precise separation between creating an object and planning it into a period.
- Decisions about when progress should be stored as daily entries versus period counters, and how that should be represented in daily and weekly views.
