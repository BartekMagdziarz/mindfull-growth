import type { DexieMigration } from './types'
import { repairPersistenceV33 } from '@/services/migrations/persistenceRepairV33'

// Repair duplicates before creating unique indexes in the following version.
export const v33: DexieMigration = {
  version: 33,
  stores: { dataRepairArchives: 'id, collection, archivedAt' },
  upgrade: repairPersistenceV33,
}
