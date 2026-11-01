import type { DexieMigration } from './types'

export const v19: DexieMigration = {
  version: 19,
  stores: {
    weeklyReflections: 'id, &weekRef',
  },
  upgrade: async trans => {
    // Weekly reflection schema redesigned around demands/actions/state with
    // 4 lifestyle spheres (physical / emotional / tasks / close ones).
    // Old per-dimension fields are dropped and replaced with the new names.
    // Historical ratings are not migrated — user accepted the data loss.
    await trans
      .table('weeklyReflections')
      .toCollection()
      .modify((record: Record<string, unknown>) => {
        delete record.socialIntensityRating
        delete record.engagementRating
        delete record.emotionalRegulationRating
        delete record.selfCareRating

        record.closeOnesNeedsRating = null
        record.physicalCareRating = null
        record.emotionalProcessingRating = null
        record.closeOnesSupportRating = null
      })
  },
}
