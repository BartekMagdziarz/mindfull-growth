import type { DexieMigration } from './types'
import { migrateLogsToMoments } from '@/services/migrations/momentsMigration'

// Momenty (ideas/html-plans/2026-09-26-shame-path-v2-compassion.html §3.3):
// the shame and anger logs merge into one `moments` micro with a `kind`
// answer; the paths run it through catalog variants (`moment-shame`,
// `moment-anger`). Entries move under the definition slug, completions
// and pending plan items under the variant slug. No schema change.
export const v27: DexieMigration = {
  version: 27,
  stores: {},
  upgrade: async trans => {
    await migrateLogsToMoments({
      entries: await trans.table('microExerciseEntries').toArray(),
      completions: await trans.table('exerciseCompletions').toArray(),
      planItems: await trans.table('exercisePlanItems').toArray(),
      putEntry: row => trans.table('microExerciseEntries').put(row),
      putCompletion: row => trans.table('exerciseCompletions').put(row),
      putPlanItem: row => trans.table('exercisePlanItems').put(row),
    })
  },
}
