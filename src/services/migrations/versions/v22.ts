import type { DexieMigration } from './types'

// Weekly intentions: lightweight week-scoped measurement objects (own table so they
// never leak into habit listings). New table → no data migration needed.
export const v22: DexieMigration = {
  version: 22,
  stores: {
    weeklyIntentions: 'id, weekRef, status, isActive, entryMode',
  },
}
