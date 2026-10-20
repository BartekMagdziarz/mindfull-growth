/**
 * Mountain Range of Meaning Store
 *
 * Manages Mountain Range of Meaning explorations (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import type {
  MountainRangeOfMeaning,
  CreateMountainRangePayload,
  UpdateMountainRangePayload,
} from '@/domain/exercises'
import { mountainRangeDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useMountainRangeStore = defineStore('mountainRange', () => {
  const explorations = useExerciseCollection<
    MountainRangeOfMeaning,
    CreateMountainRangePayload,
    UpdateMountainRangePayload
  >({
    repository: mountainRangeDexieRepository,
    label: 'exploration',
    scope: 'mountainRangeStore',
    completionSlug: 'mountain-range',
  })

  return {
    explorations: explorations.items,
    isLoading: explorations.isLoading,
    error: explorations.error,
    sortedExplorations: explorations.sorted,
    latestExploration: explorations.latest,
    getExplorationById: explorations.getById,
    loadExplorations: explorations.loadAll,
    createExploration: explorations.create,
    updateExploration: explorations.update,
    deleteExploration: explorations.remove,
    reset: explorations.reset,
  }
})
