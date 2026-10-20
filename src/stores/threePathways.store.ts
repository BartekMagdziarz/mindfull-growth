/**
 * Three Pathways to Meaning Store
 *
 * Manages Three Pathways to Meaning explorations (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import type {
  ThreePathwaysToMeaning,
  CreateThreePathwaysPayload,
  UpdateThreePathwaysPayload,
} from '@/domain/exercises'
import { threePathwaysDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useThreePathwaysStore = defineStore('threePathways', () => {
  const explorations = useExerciseCollection<
    ThreePathwaysToMeaning,
    CreateThreePathwaysPayload,
    UpdateThreePathwaysPayload
  >({
    repository: threePathwaysDexieRepository,
    label: 'exploration',
    scope: 'threePathwaysStore',
    completionSlug: 'three-pathways',
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
