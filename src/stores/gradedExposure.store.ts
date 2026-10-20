/**
 * Graded Exposure Hierarchy Store
 *
 * Manages GradedExposureHierarchies — fear ladders for systematic
 * desensitization (Wolpe, 1958; Foa & Kozak, 1986).
 */

import { defineStore } from 'pinia'
import type {
  GradedExposureHierarchy,
  CreateGradedExposureHierarchyPayload,
  UpdateGradedExposureHierarchyPayload,
} from '@/domain/exercises'
import { gradedExposureHierarchyDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useGradedExposureStore = defineStore('gradedExposure', () => {
  const hierarchies = useExerciseCollection<
    GradedExposureHierarchy,
    CreateGradedExposureHierarchyPayload,
    UpdateGradedExposureHierarchyPayload
  >({
    repository: gradedExposureHierarchyDexieRepository,
    label: 'exposure hierarchy',
    labelPlural: 'exposure hierarchies',
    scope: 'gradedExposureStore',
    completionSlug: 'graded-exposure',
  })

  return {
    hierarchies: hierarchies.items,
    isLoading: hierarchies.isLoading,
    error: hierarchies.error,
    sortedHierarchies: hierarchies.sorted,
    latestHierarchy: hierarchies.latest,
    getHierarchyById: hierarchies.getById,
    loadHierarchies: hierarchies.loadAll,
    createHierarchy: hierarchies.create,
    updateHierarchy: hierarchies.update,
    deleteHierarchy: hierarchies.remove,
    reset: hierarchies.reset,
  }
})
