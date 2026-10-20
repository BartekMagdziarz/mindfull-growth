/**
 * Transformative Purpose Store
 *
 * Manages TransformativePurpose exercises — defining a provisional purpose statement.
 */

import { defineStore } from 'pinia'
import type {
  TransformativePurpose,
  CreateTransformativePurposePayload,
  UpdateTransformativePurposePayload,
} from '@/domain/exercises'
import { transformativePurposeDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useTransformativePurposeStore = defineStore('transformativePurpose', () => {
  const purposes = useExerciseCollection<
    TransformativePurpose,
    CreateTransformativePurposePayload,
    UpdateTransformativePurposePayload
  >({
    repository: transformativePurposeDexieRepository,
    label: 'transformative purpose',
    scope: 'transformativePurposeStore',
    completionSlug: 'purpose',
  })

  return {
    purposes: purposes.items,
    isLoading: purposes.isLoading,
    error: purposes.error,
    sortedPurposes: purposes.sorted,
    latestPurpose: purposes.latest,
    getPurposeById: purposes.getById,
    loadPurposes: purposes.loadAll,
    createPurpose: purposes.create,
    updatePurpose: purposes.update,
    deletePurpose: purposes.remove,
    reset: purposes.reset,
  }
})
