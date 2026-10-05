import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Behavioral Activation Store
 *
 * Manages BehavioralActivation weekly plans — scheduling and tracking
 * mood-boosting activities across categories (Martell, Dimidjian & Herman-Dunn, 2010).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BehavioralActivation,
  CreateBehavioralActivationPayload,
  UpdateBehavioralActivationPayload,
} from '@/domain/exercises'
import { behavioralActivationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useBehavioralActivationStore = defineStore('behavioralActivation', () => {
  const sessionScope = createStoreSessionScope()
  const activations = ref<BehavioralActivation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedActivations = computed(() => {
    return [...activations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestActivation = computed(() => {
    return sortedActivations.value[0] ?? null
  })

  const getActivationById = computed(() => {
    return (id: string): BehavioralActivation | undefined => {
      return activations.value.find(a => a.id === id)
    }
  })

  async function loadActivations(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        activations.value = await operation.wait(behavioralActivationDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load behavioral activations'
        console.error('Error loading behavioral activations:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createActivation(
    data: CreateBehavioralActivationPayload
  ): Promise<BehavioralActivation> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const activation = await operation.wait(behavioralActivationDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('behavioral-activation', activation.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      activations.value.push(activation)
      return activation
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create behavioral activation'
      console.error('Error creating behavioral activation:', err)
      throw err
    }
  }

  async function updateActivation(
    id: string,
    data: UpdateBehavioralActivationPayload
  ): Promise<BehavioralActivation> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(behavioralActivationDexieRepository.update(id, data))
      const index = activations.value.findIndex(a => a.id === id)
      if (index !== -1) {
        activations.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update behavioral activation'
      console.error('Error updating behavioral activation:', err)
      throw err
    }
  }

  async function deleteActivation(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(behavioralActivationDexieRepository.delete(id))
        activations.value = activations.value.filter(a => a.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete behavioral activation'
        console.error('Error deleting behavioral activation:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    sessionScope.reset()
    activations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    activations,
    isLoading,
    error,
    sortedActivations,
    latestActivation,
    getActivationById,
    loadActivations,
    createActivation,
    updateActivation,
    deleteActivation,
    reset,
  }
})
