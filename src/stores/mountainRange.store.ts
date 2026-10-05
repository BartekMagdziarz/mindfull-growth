import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Mountain Range of Meaning Store
 *
 * Manages Mountain Range of Meaning explorations (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MountainRangeOfMeaning,
  CreateMountainRangePayload,
  UpdateMountainRangePayload,
} from '@/domain/exercises'
import { mountainRangeDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useMountainRangeStore = defineStore('mountainRange', () => {
  const sessionScope = createStoreSessionScope()
  const explorations = ref<MountainRangeOfMeaning[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedExplorations = computed(() => {
    return [...explorations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestExploration = computed(() => {
    return sortedExplorations.value[0] ?? null
  })

  const getExplorationById = computed(() => {
    return (id: string): MountainRangeOfMeaning | undefined => {
      return explorations.value.find(item => item.id === id)
    }
  })

  async function loadExplorations(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        explorations.value = await operation.wait(mountainRangeDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load explorations'
        console.error('Error loading explorations:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createExploration(
    data: CreateMountainRangePayload
  ): Promise<MountainRangeOfMeaning> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const item = await operation.wait(mountainRangeDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('mountain-range', item.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      explorations.value.push(item)
      return item
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create exploration'
      console.error('Error creating exploration:', err)
      throw err
    }
  }

  async function updateExploration(
    id: string,
    data: UpdateMountainRangePayload
  ): Promise<MountainRangeOfMeaning> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(mountainRangeDexieRepository.update(id, data))
      const index = explorations.value.findIndex(item => item.id === id)
      if (index !== -1) {
        explorations.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update exploration'
      console.error('Error updating exploration:', err)
      throw err
    }
  }

  async function deleteExploration(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(mountainRangeDexieRepository.delete(id))
        explorations.value = explorations.value.filter(item => item.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete exploration'
        console.error('Error deleting exploration:', err)
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
    explorations.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    explorations,
    isLoading,
    error,
    sortedExplorations,
    latestExploration,
    getExplorationById,
    loadExplorations,
    createExploration,
    updateExploration,
    deleteExploration,
    reset,
  }
})
