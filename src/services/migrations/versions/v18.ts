import type { DexieMigration } from './types'

export const v18: DexieMigration = {
  version: 18,
  stores: {
    goals: 'id, status, isActive, *priorityIds, *lifeAreaIds',
  },
}
