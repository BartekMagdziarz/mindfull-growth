import type { DexieMigration } from './types'

// Exercise scheduling Phase 3 (docs/exercise-scheduling-design.md §4.5/§5):
// program ("ścieżka") enrollments; step delivery reuses exercisePlanItems.
// New table → no data migration needed.
export const v25: DexieMigration = {
  version: 25,
  stores: {
    programEnrollments: 'id, programSlug, status',
  },
}
