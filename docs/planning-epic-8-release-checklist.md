# Epic 8 Release Checklist

## Cutover Scope

- Legacy planning routes, aliases, and labels are removed.
- No redirects or compatibility routes remain for retired planning flows.
- `wheelOfLifeSnapshots` and its deprecated store/repository layer are removed from the runtime code path.
- `LifeAreaAssessment` remains the only supported persistence model for active Wheel of Life flows.

## Automated Gates

- `npm run build`
- `npm run lint`
- `npm run test -- src/repositories/__tests__/planningMigration.spec.ts`
- `npm run test -- src/repositories/__tests__/planningStateDexieRepository.spec.ts`
- `npm run test -- src/services/__tests__/planningStateQueries.spec.ts`
- `npm run test -- src/services/__tests__/todayViewQueries.spec.ts`
- `npm run test -- src/services/__tests__/objectsLibraryQueries.spec.ts`
- `npm run test -- src/views/__tests__/TodayView.spec.ts`
- `npm run test -- src/views/__tests__/CalendarView.spec.ts`
- `npm run test -- src/views/__tests__/ObjectsLibraryView.spec.ts`

## Manual Smoke Checks

- Open `/today` and verify retry, empty, and hidden-item flows.
- Open `/calendar/month/:ref`, `/calendar/week/:ref`, and `/calendar/day/:ref` and verify no legacy entry points remain.
- Open `/objects/goals`, expand an item, and confirm linked-period navigation still lands in Calendar.
- Create, edit, archive, and reopen one planning object in each family.
- Verify `hide for today` expires on the next day and does not persist across day rollover.

## Regression Focus

- Weekly items without valid monthly context are ignored rather than repaired.
- `specific-days` items without day assignments do not show as scheduled.
- Monthly items overlapping week boundaries deduplicate to the active day/month context.
- Query caches refresh after writes to planning objects, planning state, reflections, and daily entries.
- Database upgrade to v9 opens cleanly and drops `wheelOfLifeSnapshots`.
