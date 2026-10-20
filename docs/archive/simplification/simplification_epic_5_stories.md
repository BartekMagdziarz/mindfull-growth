# Epic 5 Stories: Calendar View

This document breaks down `Epic 5: Calendar View` into implementation stories. These stories should define the main desktop workspace where users can move across time scales, inspect active objects, and enter planning and reflection flows.

## Recommended Story Order

1. `E5-S1: Calendar View Information Architecture`
2. `E5-S2: Shared Calendar View State And Navigation`
3. `E5-S3: Year And Month Scale Presentation`
4. `E5-S4: Week And Day Scale Presentation`
5. `E5-S5: Plan And Reflection Entry Points`
6. `E5-S6: Object Cards And Status Presentation`
7. `E5-S7: Relevance Surfacing For Monthly Objects In Weekly Views`
8. `E5-S8: Desktop Layout, Interaction Polish, And Test Coverage`

## E5-S1: Calendar View Information Architecture

### Goal

Define the desktop-first structure of `Calendar View` so planning, reflection, navigation, and object visibility all fit into one coherent workspace.

### Scope

- Define the top-level information architecture for `Calendar View`.
- Base the visual direction on the existing neumorphic language used in the current `Journal` and `Emotions` views.
- Clarify how the view is split across:
  - period navigation
  - scale switching
  - calendar surface
  - planning / reflection entry points
  - active object panels or sections
- Keep the view focused on desktop only for v1.
- Ensure the structure can support `year`, `month`, `week`, and `day` scales without becoming four unrelated screens.
- Prefer grouped sections over one mixed stream of all object types, especially at month and week scale.

### Acceptance Criteria

- The product has one documented information architecture for `Calendar View`.
- The architecture is explicitly desktop-first.
- The structure can accommodate all four scales without duplicating the planning model.
- The design direction is reusable for later implementation stories.
- Month and week scales are designed around grouped sections rather than one undifferentiated object feed.
- The visual direction explicitly continues the existing neumorphic style rather than introducing a new visual system.

### Dependencies

- `Epic 1`
- `Epic 4`

### Risks / Open Questions

- How much of the view should remain constant versus change by scale
- Risk of overloading the workspace with too many simultaneous panels

## E5-S2: Shared Calendar View State And Navigation

### Goal

Provide one reusable state and navigation model for moving through periods and changing scale inside `Calendar View`.

### Scope

- Support switching between:
  - `year`
  - `month`
  - `week`
  - `day`
- Support previous / next navigation at each scale.
- Preserve context when zooming between scales according to Epic 1 rules.
- Keep navigation state separate from rendering details.
- Prepare view state to work with on-demand plan / reflection creation.
- Treat `Calendar View` as one section with sub-routes per scale to support deep-linking and preserved context.

### Acceptance Criteria

- `Calendar View` can move between scales and periods using shared logic.
- Scale switching follows the agreed period-navigation rules from Epic 1.
- The state model is reusable across year, month, week, and day surfaces.
- Navigation does not depend on one specific scale implementation.
- Sub-routes can represent the active scale and period without splitting the feature into unrelated views.

### Dependencies

- `Epic 1`
- `E5-S1`

### Risks / Open Questions

- Whether each scale needs remembered sub-context when the user returns

## E5-S3: Year And Month Scale Presentation

### Goal

Define how the user sees strategic and monthly planning information at year and month scales without overwhelming the view.

### Scope

- Define year-scale presentation for:
  - year-level navigation context
  - monthly drill-down
  - high-level planning and reflection entry points
- Include lightweight synthesized month state, such as whether the month has:
  - a plan
  - a reflection
  - active goals
  - relevant strategic context
- Define month-scale presentation for:
  - active goals
  - monthly KR / habit / tracker / initiative context
  - access to monthly planning and monthly reflection
- Surface enough information to support monthly planning decisions without expanding into full object management.

### Acceptance Criteria

- The year scale provides usable navigation and period-level orientation.
- The month scale surfaces active goals and relevant monthly object context clearly.
- The month scale includes clear entry points for creating or editing month plan and month reflection.
- The month presentation does not require the user to leave `Calendar View` to understand the current month.
- The year scale includes clear entry points for yearly planning and yearly reflection.
- The year scale can show lightweight month-level state without expanding into full month detail.

### Dependencies

- `Epic 4`
- `E5-S1`
- `E5-S2`

### Risks / Open Questions

- How much year-level information should be visible before it becomes cluttered
- Whether month scale should prioritize summary or action-first presentation

## E5-S4: Week And Day Scale Presentation

### Goal

Define the operational views where users work most frequently: planning and reflecting at week level, and inspecting daily commitments at day level.

### Scope

- Define week-scale presentation for:
  - weekly objects
  - relevant monthly objects
  - weekly planning and weekly reflection entry points
- Define day-scale presentation for:
  - day-specific assignments
  - progress capture context
  - visibility of open weekly/monthly items that matter today
- Keep the day view aligned with the same planning model as the rest of `Calendar View`.
- Treat day scale as a lightweight drill-down for any selected date rather than as a second full daily workspace.
- Keep `Today` as the more operational daily hub to be handled later in Epic 7.

### Acceptance Criteria

- The week scale surfaces both weekly objects and relevant monthly objects.
- The day scale surfaces daily commitments without becoming a separate planning system.
- The week scale includes clear entry points for creating or editing week plan and week reflection.
- The week and day scales remain consistent with the current-state planning model from Epic 4.
- The day scale supports exploring arbitrary past or future dates, not only `today`.

### Dependencies

- `Epic 4`
- `E5-S1`
- `E5-S2`

### Risks / Open Questions

- How dense the week view can become before usability breaks down
- How much lightweight editing power belongs in day scale before it starts duplicating `Today`

## E5-S5: Plan And Reflection Entry Points

### Goal

Make planning and reflection flows discoverable and predictable inside `Calendar View` without forcing users into hidden workflows.

### Scope

- Support explicit entry points in relevant periods for:
  - `Create Plan`
  - `Edit Plan`
  - `Create Reflection`
  - `Edit Reflection`
- Reflect the on-demand nature of plan / reflection records.
- Ensure entry points are period-aware:
  - year
  - month
  - week
- Ensure object-level reflection editing remains inside period reflection flows rather than object detail screens.
- Prefer opening plan and reflection flows in a side panel or dedicated subview inside `Calendar View`, rather than inline inside the main calendar surface.

### Acceptance Criteria

- A period with no plan or reflection shows clear create actions.
- A period with existing plan or reflection shows clear edit actions.
- Entry points respect the current period and scale.
- Reflection editing stays anchored to period reflection flows.
- Plan and reflection editing does not overload the main calendar grid with inline form complexity.

### Dependencies

- `Epic 4`
- `E5-S1`
- `E5-S2`

### Risks / Open Questions

- How much friction is acceptable for switching between viewing and editing modes

## E5-S6: Object Cards And Status Presentation

### Goal

Define how planning objects are visually represented in `Calendar View` so users can distinguish type, state, progress, and required action quickly.

### Scope

- Define a shared presentation pattern for object cards or equivalent UI blocks for:
  - goals
  - key results
  - habits
  - trackers
  - initiatives
- Surface, where relevant:
  - object type
  - lifecycle state
  - period activity state
  - progress / results
  - planned versus unplanned state
  - reflection presence
- Keep the presentation compact enough for frequent calendar use.
- Prefer grouping objects by type or function rather than mixing all of them into one feed.

### Acceptance Criteria

- The view has a consistent presentation language for all planning object types.
- Users can distinguish planned, active, paused, completed / dropped / retired, and reflected states visually.
- Progress information is visible without forcing deep object inspection.
- The presentation avoids turning `Calendar View` into a full object-management screen.
- Month and week scales can present grouped object sections without losing overall period context.

### Dependencies

- `Epic 3`
- `Epic 4`
- `E5-S1`

### Risks / Open Questions

- How much detail to show directly on cards before they become noisy
- Whether goals should be rendered differently from the more operational objects

## E5-S7: Relevance Surfacing For Monthly Objects In Weekly Views

### Goal

Make weekly planning and reflection show the right monthly objects in the right way, especially those that are active but not yet assigned.

### Scope

- Surface monthly objects in weekly views when they are:
  - assigned to the current week
  - assigned to days in the current week
  - active in the month but still unassigned
- Distinguish clearly between:
  - already scheduled work
  - work still needing weekly placement
  - objects only relevant for reflection
- Preserve the agreed semantics for monthly target distribution across weeks.
- Use a separate section for active monthly objects that still need weekly planning.

### Acceptance Criteria

- Weekly planning shows relevant monthly objects consistently.
- Active but unassigned monthly objects are visible and distinguishable from already scheduled ones.
- Weekly reflection can surface monthly objects that mattered during the week.
- The presentation does not imply that weekly allocations are independent from monthly targets.
- The UI model supports a separate section for `to plan this week` monthly objects.

### Dependencies

- `Epic 4`
- `E5-S3`
- `E5-S4`
- `E5-S6`

### Risks / Open Questions

- How to avoid overwhelming the weekly view when many monthly objects remain unassigned
- Whether separate sections, tabs, or visual grouping is the clearest approach

## E5-S8: Desktop Layout, Interaction Polish, And Test Coverage

### Goal

Harden the desktop calendar workspace so later epics can build on it safely without redesigning core interactions.

### Scope

- Refine desktop layout behavior across the four scales.
- Add interaction polish for:
  - navigation
  - scale switching
  - plan / reflection entry points
  - object card clarity
- Preserve and reuse the existing neumorphic design language, tokens, and interaction patterns where they fit the planning workspace.
- Add automated tests for core behaviors, such as:
  - navigation between periods and scales
  - correct entry-point state when plan/reflection exists or not
  - visibility of relevant monthly objects in weekly views
  - correct surfacing of basic object states

### Acceptance Criteria

- The desktop `Calendar View` has stable interaction behavior across scales.
- Core navigation and visibility logic is covered by automated tests.
- The view behavior is robust enough for later epics such as `Today / Current Focus`.
- The implementation stays aligned with the agreed domain and planning-state rules.

### Dependencies

- `E5-S1`
- `E5-S2`
- `E5-S3`
- `E5-S4`
- `E5-S5`
- `E5-S6`
- `E5-S7`

### Risks / Open Questions

- How much testing should target pure view-model logic versus rendered component behavior
- Risk of the desktop layout becoming too rigid for later evolution
