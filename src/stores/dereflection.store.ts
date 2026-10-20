/**
 * Dereflection Practice Store
 *
 * Manages DereflectionPractice exercises — redirect attention from
 * fixation toward meaningful activities (Viktor Frankl).
 */

import { defineStore } from 'pinia'
import type {
  DereflectionPractice,
  CreateDereflectionPayload,
  UpdateDereflectionPayload,
} from '@/domain/exercises'
import { dereflectionDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useDereflectionStore = defineStore('dereflection', () => {
  const practices = useExerciseCollection<
    DereflectionPractice,
    CreateDereflectionPayload,
    UpdateDereflectionPayload
  >({
    repository: dereflectionDexieRepository,
    label: 'dereflection practice',
    scope: 'dereflectionStore',
    completionSlug: 'dereflection',
  })

  return {
    practices: practices.items,
    isLoading: practices.isLoading,
    error: practices.error,
    sortedPractices: practices.sorted,
    latestPractice: practices.latest,
    getPracticeById: practices.getById,
    loadPractices: practices.loadAll,
    createPractice: practices.create,
    updatePractice: practices.update,
    deletePractice: practices.remove,
    reset: practices.reset,
  }
})
