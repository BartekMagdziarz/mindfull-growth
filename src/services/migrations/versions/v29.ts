import type { DexieMigration } from './types'

export const v29: DexieMigration = {
  version: 29,
  stores: { companionConversations: 'id, periodRef, updatedAt' },
}
