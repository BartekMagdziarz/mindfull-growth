/**
 * Worry Tree Store
 *
 * Manages WorryTreeEntries — quick anxiety management exercises using
 * a decision flowchart (Adrian Wells, 1997; Robert Leahy, 2005).
 */

import { defineStore } from 'pinia'
import type {
  WorryTreeEntry,
  CreateWorryTreeEntryPayload,
  UpdateWorryTreeEntryPayload,
} from '@/domain/exercises'
import { worryTreeEntryDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useWorryTreeStore = defineStore('worryTree', () => {
  const entries = useExerciseCollection<
    WorryTreeEntry,
    CreateWorryTreeEntryPayload,
    UpdateWorryTreeEntryPayload
  >({
    repository: worryTreeEntryDexieRepository,
    label: 'worry tree entry',
    labelPlural: 'worry tree entries',
    scope: 'worryTreeStore',
    completionSlug: 'worry-tree',
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
