import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Transformative Purpose Store
 *
 * Manages TransformativePurpose exercises — defining a provisional purpose statement.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  TransformativePurpose,
  CreateTransformativePurposePayload,
  UpdateTransformativePurposePayload,
} from '@/domain/exercises'
import { transformativePurposeDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useTransformativePurposeStore = defineStore('transformativePurpose', () => {
  const sessionScope = createStoreSessionScope()
  const purposes = ref<TransformativePurpose[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedPurposes = computed(() => {
    return [...purposes.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestPurpose = computed(() => {
    return sortedPurposes.value[0] ?? null
  })

  const getPurposeById = computed(() => {
    return (id: string): TransformativePurpose | undefined => {
      return purposes.value.find(p => p.id === id)
    }
  })

  async function loadPurposes(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        purposes.value = await operation.wait(transformativePurposeDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load transformative purposes'
        console.error('Error loading transformative purposes:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createPurpose(
    data: CreateTransformativePurposePayload
  ): Promise<TransformativePurpose> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const purpose = await operation.wait(transformativePurposeDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('purpose', purpose.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      purposes.value.push(purpose)
      return purpose
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create transformative purpose'
      console.error('Error creating transformative purpose:', err)
      throw err
    }
  }

  async function updatePurpose(
    id: string,
    data: UpdateTransformativePurposePayload
  ): Promise<TransformativePurpose> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(transformativePurposeDexieRepository.update(id, data))
      const index = purposes.value.findIndex(p => p.id === id)
      if (index !== -1) {
        purposes.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update transformative purpose'
      console.error('Error updating transformative purpose:', err)
      throw err
    }
  }

  async function deletePurpose(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(transformativePurposeDexieRepository.delete(id))
        purposes.value = purposes.value.filter(p => p.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete transformative purpose'
        console.error('Error deleting transformative purpose:', err)
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
    purposes.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    purposes,
    isLoading,
    error,
    sortedPurposes,
    latestPurpose,
    getPurposeById,
    loadPurposes,
    createPurpose,
    updatePurpose,
    deletePurpose,
    reset,
  }
})
