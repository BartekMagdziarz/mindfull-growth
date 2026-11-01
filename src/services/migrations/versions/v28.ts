import type { DexieMigration } from './types'
import { migrateEnrollmentsContent } from '@/services/programContentMigration'

// Shame path v2 (ideas/html-plans/2026-09-26-shame-path-v2-compassion.html §7):
// the step list changed shape, so enrollments created under content v1
// get their completed steps re-mapped by exercise slug; their pending
// step plan items are dropped and re-materialized by the scheduler.
export const v28: DexieMigration = {
  version: 28,
  stores: {},
  upgrade: async trans => {
    await migrateEnrollmentsContent({
      enrollments: await trans.table('programEnrollments').toArray(),
      planItems: await trans.table('exercisePlanItems').toArray(),
      putEnrollment: row => trans.table('programEnrollments').put(row),
      deletePlanItem: id => trans.table('exercisePlanItems').delete(id),
    })
  },
}
