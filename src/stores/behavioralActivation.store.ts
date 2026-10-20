/**
 * Behavioral Activation Store
 *
 * Manages BehavioralActivation weekly plans — scheduling and tracking
 * mood-boosting activities across categories (Martell, Dimidjian & Herman-Dunn, 2010).
 */

import { defineStore } from 'pinia'
import type {
  BehavioralActivation,
  CreateBehavioralActivationPayload,
  UpdateBehavioralActivationPayload,
} from '@/domain/exercises'
import { behavioralActivationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useBehavioralActivationStore = defineStore('behavioralActivation', () => {
  const activations = useExerciseCollection<
    BehavioralActivation,
    CreateBehavioralActivationPayload,
    UpdateBehavioralActivationPayload
  >({
    repository: behavioralActivationDexieRepository,
    label: 'behavioral activation',
    scope: 'behavioralActivationStore',
    completionSlug: 'behavioral-activation',
  })

  return {
    activations: activations.items,
    isLoading: activations.isLoading,
    error: activations.error,
    sortedActivations: activations.sorted,
    latestActivation: activations.latest,
    getActivationById: activations.getById,
    loadActivations: activations.loadAll,
    createActivation: activations.create,
    updateActivation: activations.update,
    deleteActivation: activations.remove,
    reset: activations.reset,
  }
})
