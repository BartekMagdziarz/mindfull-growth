import type { DexieMigration } from './types'

export const v30: DexieMigration = {
  version: 30,
  stores: {
    approvedProfileItems: 'id, category, status, updatedAt',
    profileProposals: 'id, &dedupeKey, status, updatedAt',
    profileChanges: 'id, itemId, at',
    profileTasks: 'id, status',
  },
}
