import type { DexieMigration } from './types'

export const v17: DexieMigration = {
  version: 17,
  stores: {
    valueMaps: 'id, createdAt',
  },
}
