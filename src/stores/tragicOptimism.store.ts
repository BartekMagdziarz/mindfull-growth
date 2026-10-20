/**
 * Tragic Optimism Store
 *
 * Manages TragicOptimism exercises — find meaning within suffering,
 * guilt, or awareness of limited time (Viktor Frankl's tragic triad).
 */

import { defineStore } from 'pinia'
import type {
  TragicOptimism,
  CreateTragicOptimismPayload,
  UpdateTragicOptimismPayload,
} from '@/domain/exercises'
import { tragicOptimismDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useTragicOptimismStore = defineStore('tragicOptimism', () => {
  const entries = useExerciseCollection<
    TragicOptimism,
    CreateTragicOptimismPayload,
    UpdateTragicOptimismPayload
  >({
    repository: tragicOptimismDexieRepository,
    label: 'tragic optimism entry',
    labelPlural: 'tragic optimism entries',
    scope: 'tragicOptimismStore',
    completionSlug: 'tragic-optimism',
  })

  return {
    entries: entries.items,
    isLoading: entries.isLoading,
    error: entries.error,
    sortedEntries: entries.sorted,
    latestEntry: entries.latest,
    getEntryById: entries.getById,
    loadEntries: entries.loadAll,
    createEntry: entries.create,
    updateEntry: entries.update,
    deleteEntry: entries.remove,
    reset: entries.reset,
  }
})
