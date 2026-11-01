import type { DexieMigration } from './types'

// Exercise scheduling Phase 2 (docs/exercise-scheduling-design.md §4.4/§5):
// planned repeats (and Phase 3 program steps — one entity, `source`
// discriminator). New table → no data migration needed.
export const v24: DexieMigration = {
  version: 24,
  stores: {
    exercisePlanItems: 'id, exerciseSlug, dayRef, status, source',
  },
}
