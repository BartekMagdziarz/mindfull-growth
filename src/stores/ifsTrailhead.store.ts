import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  IFSTrailheadEntry,
  CreateIFSTrailheadPayload,
  UpdateIFSTrailheadPayload,
} from '@/domain/exercises'
import { ifsTrailheadDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSTrailheadStore = defineStore('ifsTrailhead', () => {
  const entries = useExerciseCollection<
    IFSTrailheadEntry,
    CreateIFSTrailheadPayload,
    UpdateIFSTrailheadPayload
  >({
    repository: ifsTrailheadDexieRepository,
    label: 'trailhead entry',
    labelPlural: 'trailhead entries',
    scope: 'ifsTrailheadStore',
    completionSlug: 'trailhead',
  })

  const hasEnoughForAnalysis = computed(() => entries.items.value.length >= 3)

  return {
    entries: entries.items,
    isLoading: entries.isLoading,
    error: entries.error,
    sortedEntries: entries.sorted,
    latestEntry: entries.latest,
    getEntryById: entries.getById,
    hasEnoughForAnalysis,
    loadEntries: entries.loadAll,
    createEntry: entries.create,
    updateEntry: entries.update,
    deleteEntry: entries.remove,
    reset: entries.reset,
  }
})
