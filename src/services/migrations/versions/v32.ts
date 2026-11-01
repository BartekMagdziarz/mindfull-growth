import type { DexieMigration } from './types'

export const v32: DexieMigration = {
  version: 32,
  stores: { journalDrafts: 'id, updatedAt' },
}
