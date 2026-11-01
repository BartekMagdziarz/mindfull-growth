import type { DexieMigration } from './types'

// Pillar 3: cached per-ISO-period (week/month) profile summaries. New table,
// no data migration. Unique on [periodRef+kind] for upsert-by-period.
export const v21: DexieMigration = {
  version: 21,
  stores: {
    profilePeriodSummaries: 'id, &[periodRef+kind]',
  },
}
