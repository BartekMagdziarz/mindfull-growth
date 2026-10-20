# Epic 8 Stories: Polish, Migration, And Hardening

This document breaks down `Epic 8: Polish, Migration, And Hardening` into implementation stories. These stories should make the planning system robust enough to replace or extend current flows safely while preserving the agreed product model.

They assume the shared execution / measurement contract from `Epic 9` and the `Today` workflow from `Epic 7` are already in place.

## Recommended Story Order

1. `E8-S1: Migration Strategy And Cutover Boundaries`
2. `E8-S2: Legacy Data Handling And Model Cleanup`
3. `E8-S3: Routing, Navigation, And Entry-Point Cleanup`
4. `E8-S4: Calendar And Plan-State Edge Case Hardening`
5. `E8-S5: Query, Store, And Performance Hardening`
6. `E8-S6: UX Consistency, Empty States, And Error Handling`
7. `E8-S7: Release Readiness And Regression Coverage`

## E8-S1: Migration Strategy And Cutover Boundaries

### Goal

Define how the product moves from current flows into the simplified planning system without leaving ambiguous ownership between old and new behavior.

### Scope

- Define the cutover strategy for replacing or retiring current planning-related flows.
- Favor one larger cutover after the new planning system is ready rather than a long staged rollout.
- Decide which legacy routes, screens, and entry points remain temporarily and which are removed once replacements exist.
- Document transition boundaries between:
  - legacy planning-related flows
  - the new planning model
  - unaffected product areas
- Favor simplification over preserving low-value historical structures where the user already agreed that clean breaks are acceptable.

### Acceptance Criteria

- The product has one documented cutover strategy for moving from old to new planning flows.
- Ownership of each planning-related entry point is unambiguous.
- The migration approach prefers simplification over preserving obsolete behavior when there is no important user value in keeping it.
- The cutover plan reduces the risk of parallel systems lingering indefinitely.
- The cutover strategy assumes old planning flows can be removed entirely once the new system is ready.

### Dependencies

- `Epic 2`
- `Epic 3`
- `Epic 4`
- `Epic 5`
- `Epic 6`
- `Epic 7`
- `Epic 9`

### Risks / Open Questions

- How aggressively current planning-related routes should be removed versus briefly redirected during final cutover

## E8-S2: Legacy Data Handling And Model Cleanup

### Goal

Harden the data layer by deciding what legacy data is migrated, what is dropped, and how incomplete or outdated records are handled safely.

### Scope

- Define the treatment of current or intermediate planning-related data structures.
- Apply the agreed simplification rule that clean breaks are acceptable when legacy data has low value.
- Assume no existing planning data has to be preserved as a product requirement.
- Identify any legacy records that must still be interpreted, reshaped, ignored, or discarded.
- Define fail-soft behavior for incomplete or outdated data so the app can still load safely.
- Keep migration and cleanup logic explicit rather than hidden inside unrelated domain code.

### Acceptance Criteria

- The system has documented rules for handling legacy planning-related data.
- Clean-break decisions are explicit rather than accidental.
- Invalid or incomplete old data does not break the new planning experience.
- Data cleanup responsibilities are isolated enough to remain testable.
- The migration approach does not spend effort preserving low-value historical planning data.

### Dependencies

- `Epic 2`
- `Epic 3`
- `Epic 4`
- `E8-S1`

### Risks / Open Questions

- How much fallback behavior is needed before real migration cases are inspected

## E8-S3: Routing, Navigation, And Entry-Point Cleanup

### Goal

Ensure the app routes and primary entry points consistently lead users into the new planning experience instead of fragmented historical paths.

### Scope

- Audit and clean up planning-related routes and navigation links.
- Align entry points so users can reach:
  - `Calendar View`
  - `Objects Library`
  - `Today / Current Focus`
  - planning and reflection flows
- Remove or redirect legacy planning routes where appropriate.
- Keep the route structure coherent with the desktop-first planning experience.

### Acceptance Criteria

- Planning-related navigation has one coherent structure.
- Obsolete routes are either removed or intentionally redirected.
- Entry points into the new planning system are easy to discover and consistent across the app.
- Route cleanup does not leave orphaned references to retired planning flows.

### Dependencies

- `Epic 5`
- `Epic 6`
- `Epic 7`
- `E8-S1`

### Risks / Open Questions

- Hidden links or assumptions in existing flows that still point to retired planning routes
- Whether some routes should remain as compatibility redirects for a transition period

## E8-S4: Calendar And Plan-State Edge Case Hardening

### Goal

Protect the planning system against tricky calendar and state edge cases that can quietly break trust if left unresolved.

### Scope

- Harden edge cases around:
  - weeks spanning months and years
  - monthly objects shown inside weekly planning and reflection
  - month activity gating week activity
  - lifecycle state versus period activity state
  - on-demand creation of plans and reflections
  - hidden-for-today behavior across local date boundaries
- Validate aggregation rules from day and week behavior into monthly understanding where relevant.
- Keep state invariants explicit and testable.

### Acceptance Criteria

- Core edge cases around time boundaries and state transitions are documented and covered.
- Period activity rules remain consistent with lifecycle rules.
- Weekly and monthly planning state stays coherent when objects move, pause, resume, or over-allocate.
- Local-date behavior for `Today` remains predictable across day changes.

### Dependencies

- `Epic 1`
- `Epic 4`
- `Epic 5`
- `Epic 7`

### Risks / Open Questions

- Which edge cases deserve explicit repair logic versus just defensive validation
- Risk of subtle inconsistencies between aggregated period state and raw progress entries

## E8-S5: Query, Store, And Performance Hardening

### Goal

Keep the simplified planning system responsive as object counts and period history grow.

### Scope

- Review and harden query patterns for:
  - `Calendar View`
  - `Objects Library`
  - `Today`
  - reflection history display
- Improve store, selector, or repository behavior where repeated planning queries become expensive.
- Focus on pragmatic performance improvements around:
  - period filtering
  - relevance calculation
  - object aggregation
  - fast card updates
- Preserve correctness first; avoid premature denormalization unless needed.

### Acceptance Criteria

- High-frequency planning surfaces remain responsive under realistic data volume.
- Performance-sensitive query paths are identified and protected.
- Optimizations do not undermine the agreed domain rules or create hidden secondary sources of truth.
- The hardening approach stays compatible with local-first behavior.

### Dependencies

- `Epic 5`
- `Epic 6`
- `Epic 7`
- `E8-S4`

### Risks / Open Questions

- How much optimization is really needed before real usage data exists
- Whether some expensive queries should stay computed dynamically versus cached

## E8-S6: UX Consistency, Empty States, And Error Handling

### Goal

Polish the simplified planning experience so it feels coherent, forgiving, and visually aligned across all major views.

### Scope

- Preserve and consistently apply the existing neumorphic design language already used in `Journal` and `Emotions`.
- Review empty states across:
  - `Calendar View`
  - `Objects Library`
  - `Today`
  - assessment and reflection entry points
- Define graceful handling for:
  - missing plan or reflection records
  - empty periods
  - inactive or paused objects
  - failed loads or invalid state
- Prefer fail-soft fallback behavior that leaves the user in a safe empty or partial state instead of introducing repair flows in v1.
- Keep copy, cues, and visual language consistent so the simplified planning model feels understandable across the product.

### Acceptance Criteria

- Core planning views remain visually and behaviorally consistent.
- Empty and low-data states feel intentional rather than broken.
- Error handling does not leak confusing internal states to the user.
- The final polish preserves the agreed neumorphic style instead of drifting into a second visual language.
- Incomplete or outdated data falls back to a safe state without blocking core app usage.

### Dependencies

- `Epic 2`
- `Epic 5`
- `Epic 6`
- `Epic 7`

### Risks / Open Questions

- How much microcopy and empty-state guidance is needed before it becomes too verbose
- Risk of visual inconsistency if different planning surfaces evolve separately

## E8-S7: Release Readiness And Regression Coverage

### Goal

Establish enough confidence to ship the simplified planning system without breaking adjacent product behavior.

### Scope

- Define the final regression surface for:
  - domain logic
  - plan and reflection state
  - navigation
  - key user flows
  - migration or cleanup behavior
- Add or consolidate automated coverage where planning logic is most brittle.
- Identify manual verification paths for high-risk flows that are awkward to cover automatically.
- Document release-readiness criteria for considering the new planning system safe to ship.
- Assume release will happen as one larger cutover once the new planning experience is ready for real use.

### Acceptance Criteria

- The product has a documented regression and release-readiness checklist for the new planning system.
- High-risk planning behaviors have appropriate automated coverage.
- Remaining manual checks are explicit and scoped.
- Shipping confidence does not depend on undocumented tribal knowledge.
- Release-readiness criteria support one larger switch from old planning flows to the new system.

### Dependencies

- `E8-S1`
- `E8-S2`
- `E8-S3`
- `E8-S4`
- `E8-S5`
- `E8-S6`

### Risks / Open Questions

- How much release process formalization is warranted for a still-evolving planning system
