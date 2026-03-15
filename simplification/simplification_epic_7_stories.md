# Epic 7 Stories: Today / Current Focus

This document breaks down `Epic 7: Today / Current Focus` into implementation stories. These stories should define the lightweight operational view for immediate action without duplicating the full planning workflow.

They assume the shared execution / measurement contract from `Epic 9` is already in place. `Today` should consume that model, not introduce local progress semantics.

## Recommended Story Order

1. `E7-S1: Today Information Architecture And Boundaries`
2. `E7-S2: Current Relevance And Query Model`
3. `E7-S3: KR, Habit, And Tracker Today Cards`
4. `E7-S4: Initiative And Scheduled Item Actions`
5. `E7-S5: One-Day Hide And Reappearance Behavior`
6. `E7-S6: Cross-Navigation And Calendar Alignment`
7. `E7-S7: Interaction Polish, Performance, And Test Coverage`

## E7-S1: Today Information Architecture And Boundaries

### Goal

Define the `Today / Current Focus` view as a fast operational surface for immediate commitments without turning it into a second planning system.

### Scope

- Define the top-level information architecture for `Today`.
- Base the visual direction on the existing neumorphic language used in the current `Journal` and `Emotions` views.
- Clarify what belongs in `Today` versus what remains in `Calendar View`.
- Keep the view focused on:
  - today’s commitments
  - open weekly context
  - open monthly context
- Organize the view primarily by operational context:
  - `Scheduled for today`
  - `Active this week`
  - `Active this month`
- Allow only light grouping inside those sections where helpful.
- Preserve the principle that `Today` is a focused slice of the same model, not a separate logic system.

### Acceptance Criteria

- The product has one documented information architecture for `Today`.
- The design direction explicitly continues the existing neumorphic style.
- The view is clearly bounded as operational, not a replacement for calendar planning.
- The architecture supports quick action without becoming a dashboard of everything.
- The primary sectioning of `Today` is by operational context rather than by object type.

### Dependencies

- `Epic 4`
- `Epic 5`

### Risks / Open Questions

- How much weekly and monthly context can be shown before `Today` becomes cluttered
- Risk of overlapping too much with day scale in `Calendar View`

## E7-S2: Current Relevance And Query Model

### Goal

Define which objects should appear in `Today` and why, so the view consistently surfaces the right operational work.

### Scope

- Determine relevance rules for objects that should appear in `Today`, including:
  - items scheduled for today
  - active weekly objects
  - active monthly objects
  - unassigned but still relevant weekly/monthly objects
- Respect the month/week activity rules defined earlier.
- Keep today relevance logic reusable and separate from rendering.
- Make sure the query model understands temporary one-day hiding.
- Allow active weekly and monthly objects without a concrete day assignment to remain visible and actionable in `Today`.

### Acceptance Criteria

- The system can determine which KR, habits, trackers, and initiatives are relevant for `Today`.
- Relevance is derived from the existing planning model rather than custom one-off rules.
- The query model distinguishes truly scheduled items from broader active context.
- Hidden-for-today items are excluded only for the current day.
- Active weekly or monthly KR / habit / tracker objects can still appear in `Today` even when they are not assigned to a specific day.

### Dependencies

- `Epic 1`
- `Epic 4`
- `Epic 9`
- `E7-S1`

### Risks / Open Questions

- How much of the “unassigned but still relevant” logic should surface in `Today`
- Whether all active monthly objects should appear or only the ones with stronger operational relevance

## E7-S3: KR, Habit, And Tracker Today Cards

### Goal

Define the operational card model for KR, habits, and trackers so users can see progress and take the next needed action quickly.

### Scope

- Define shared card behavior for:
  - `KeyResult`
  - `Habit`
  - `Tracker`
- Surface on the card, where relevant:
  - period progress
  - today’s expected action or input
  - days remaining in the active period
  - lifecycle / activity state cues
- Support both:
  - exact-day action fields
  - broader period-progress interactions
- Keep the cards minimalistic and fast to scan.
- Allow fast progress capture even when the object has no concrete day assignment, as long as it is currently relevant in the active week or month.

### Acceptance Criteria

- KR, habit, and tracker cards show period progress in a compact way.
- Cards make today’s required action or input visually obvious when one exists.
- Days remaining in the active period can be shown where relevant.
- The card model remains consistent with the shared progress concepts from earlier epics.
- KR and habit cards support quick progress updates even when they represent broader week/month progress rather than a day-specific action.
- Tracker cards can stay visible without a daily input field when the tracker type does not support meaningful daily input.

### Dependencies

- `Epic 4`
- `Epic 9`
- `E7-S1`
- `E7-S2`

### Risks / Open Questions

- How much card detail is useful before speed of use degrades
- Which tracker types can or should surface a “today field” in v1

## E7-S4: Initiative And Scheduled Item Actions

### Goal

Support fast handling of initiatives and other day-scheduled items directly from `Today`.

### Scope

- Surface initiatives and other day-scheduled items relevant to today.
- Support rescheduling behavior directly from `Today`:
  - move to another day
  - clear today’s scheduled date without immediately assigning a new one
- Support deletion behavior directly from `Today`, where deleting removes the whole object, but only for objects explicitly scheduled for the current day.
- Keep these actions fast and operational rather than form-heavy.

### Acceptance Criteria

- Today can show day-scheduled initiatives and other relevant scheduled items.
- Users can reschedule items from the `Today` view according to the agreed behavior.
- Deleting from `Today` follows the agreed rule of deleting the whole object.
- Delete is not exposed for objects that are merely active context without a concrete day assignment.
- These actions do not require entering the full calendar workflow for common cases.

### Dependencies

- `Epic 4`
- `E7-S1`
- `E7-S2`

### Risks / Open Questions

- Which object types beyond initiatives should expose the full reschedule interaction from `Today`
- How much confirmation UX is needed before destructive actions

## E7-S5: One-Day Hide And Reappearance Behavior

### Goal

Define the temporary hide behavior so users can remove noise for the current day without changing the underlying planning model.

### Scope

- Support one-day hide for active weekly or monthly objects shown in `Today`.
- Ensure hidden items return automatically the next day.
- Keep hide state distinct from:
  - lifecycle state
  - period activity state
  - deletion
  - rescheduling
- Provide a lightweight restore path for items hidden today.
- Keep hidden items out of the main operational sections while still allowing easy undo.
- Make the rule reusable for all supported object types where this behavior is allowed.

### Acceptance Criteria

- Users can hide eligible objects for the current day only.
- Hidden objects reappear automatically on the next day without manual reset.
- One-day hide does not mutate the underlying month/week activity state.
- The behavior is clearly distinct from delete and reschedule actions.
- After hiding an item, users get immediate undo feedback.
- `Today` provides a collapsed `Hidden for today` section or equivalent minimal affordance where hidden items can be restored the same day without cluttering the main view.

### Dependencies

- `Epic 1`
- `Epic 4`
- `E7-S2`

### Risks / Open Questions

- Whether hide state should be stored per day per object or derived from lighter ephemeral state

## E7-S6: Cross-Navigation And Calendar Alignment

### Goal

Make `Today` work as a focused entry point into the same planning model as `Calendar View`, not a disconnected surface.

### Scope

- Support navigation from `Today` to:
  - relevant week in `Calendar View`
  - relevant month in `Calendar View`
  - object detail where appropriate
- Ensure state shown in `Today` matches the same source of truth as `Calendar View`.
- Prevent `Today` from introducing separate planning or reflection semantics.

### Acceptance Criteria

- Users can move from `Today` into the broader calendar context when needed.
- `Today` and `Calendar View` remain aligned on object state and period state.
- The view does not create a second set of planning concepts.
- Cross-navigation is available without overwhelming the quick-action use case.

### Dependencies

- `Epic 5`
- `Epic 6`
- `E7-S1`
- `E7-S2`

### Risks / Open Questions

- How much cross-navigation is useful before it distracts from the quick-action purpose
- Whether some actions should intentionally bounce the user into `Calendar View`

## E7-S7: Interaction Polish, Performance, And Test Coverage

### Goal

Harden `Today` as a fast daily surface that stays clear, consistent, and responsive under real use.

### Scope

- Add interaction polish for:
  - quick progress capture
  - one-day hide
  - reschedule / delete actions
  - card clarity
- Add performance-oriented handling for:
  - loading today’s relevant objects
  - updating cards quickly
  - keeping interactions snappy
- Add automated tests for:
  - today relevance rules
  - card state rendering
  - hide / reappearance behavior
  - reschedule and delete flows
  - alignment with `Calendar View`

### Acceptance Criteria

- `Today` remains fast enough to support frequent daily use.
- Core today-specific behavior is protected by automated tests.
- Quick interactions stay consistent with the agreed planning model.
- The final experience preserves the focused, operational purpose of the view.

### Dependencies

- `E7-S1`
- `E7-S2`
- `E7-S3`
- `E7-S4`
- `E7-S5`
- `E7-S6`

### Risks / Open Questions

- How much optimization is necessary before real daily usage data exists
- Risk of slowly accreting too much complexity into what should remain a lightweight surface
