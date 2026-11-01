import type { DexieMigration } from './types'

export const v31: DexieMigration = {
  version: 31,
  stores: {
    companionIntroductions: 'id, status, updatedAt',
    historyDigests: 'id, kind, subject',
  },
}
