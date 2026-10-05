import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Graded Exposure Hierarchy Store
 *
 * Manages GradedExposureHierarchies — fear ladders for systematic
 * desensitization (Wolpe, 1958; Foa & Kozak, 1986).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GradedExposureHierarchy,
  CreateGradedExposureHierarchyPayload,
  UpdateGradedExposureHierarchyPayload,
} from '@/domain/exercises'
import { gradedExposureHierarchyDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useGradedExposureStore = defineStore('gradedExposure', () => {
  const sessionScope = createStoreSessionScope()
  const hierarchies = ref<GradedExposureHierarchy[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedHierarchies = computed(() => {
    return [...hierarchies.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestHierarchy = computed(() => {
    return sortedHierarchies.value[0] ?? null
  })

  const getHierarchyById = computed(() => {
    return (id: string): GradedExposureHierarchy | undefined => {
      return hierarchies.value.find(h => h.id === id)
    }
  })

  async function loadHierarchies(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        hierarchies.value = await operation.wait(gradedExposureHierarchyDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load exposure hierarchies'
        console.error('Error loading exposure hierarchies:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createHierarchy(
    data: CreateGradedExposureHierarchyPayload
  ): Promise<GradedExposureHierarchy> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const hierarchy = await operation.wait(gradedExposureHierarchyDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('graded-exposure', hierarchy.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      hierarchies.value.push(hierarchy)
      return hierarchy
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create exposure hierarchy'
      console.error('Error creating exposure hierarchy:', err)
      throw err
    }
  }

  async function updateHierarchy(
    id: string,
    data: UpdateGradedExposureHierarchyPayload
  ): Promise<GradedExposureHierarchy> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(gradedExposureHierarchyDexieRepository.update(id, data))
      const index = hierarchies.value.findIndex(h => h.id === id)
      if (index !== -1) {
        hierarchies.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update exposure hierarchy'
      console.error('Error updating exposure hierarchy:', err)
      throw err
    }
  }

  async function deleteHierarchy(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(gradedExposureHierarchyDexieRepository.delete(id))
        hierarchies.value = hierarchies.value.filter(h => h.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete exposure hierarchy'
        console.error('Error deleting exposure hierarchy:', err)
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
    hierarchies.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    hierarchies,
    isLoading,
    error,
    sortedHierarchies,
    latestHierarchy,
    getHierarchyById,
    loadHierarchies,
    createHierarchy,
    updateHierarchy,
    deleteHierarchy,
    reset,
  }
})
