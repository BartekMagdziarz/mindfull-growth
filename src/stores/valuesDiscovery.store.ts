import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Values Discovery Store
 *
 * Manages ValuesDiscovery exercises — identifying core values through admiration analysis.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ValuesDiscovery,
  CreateValuesDiscoveryPayload,
  UpdateValuesDiscoveryPayload,
} from '@/domain/exercises'
import { valuesDiscoveryDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useValuesDiscoveryStore = defineStore('valuesDiscovery', () => {
  const sessionScope = createStoreSessionScope()
  const discoveries = ref<ValuesDiscovery[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedDiscoveries = computed(() => {
    return [...discoveries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestDiscovery = computed(() => {
    return sortedDiscoveries.value[0] ?? null
  })

  const getDiscoveryById = computed(() => {
    return (id: string): ValuesDiscovery | undefined => {
      return discoveries.value.find(d => d.id === id)
    }
  })

  async function loadDiscoveries(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        discoveries.value = await operation.wait(valuesDiscoveryDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load values discoveries'
        console.error('Error loading values discoveries:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createDiscovery(data: CreateValuesDiscoveryPayload): Promise<ValuesDiscovery> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const discovery = await operation.wait(valuesDiscoveryDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('values', discovery.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      discoveries.value.push(discovery)
      return discovery
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create values discovery'
      console.error('Error creating values discovery:', err)
      throw err
    }
  }

  async function updateDiscovery(
    id: string,
    data: UpdateValuesDiscoveryPayload
  ): Promise<ValuesDiscovery> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(valuesDiscoveryDexieRepository.update(id, data))
      const index = discoveries.value.findIndex(d => d.id === id)
      if (index !== -1) {
        discoveries.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update values discovery'
      console.error('Error updating values discovery:', err)
      throw err
    }
  }

  async function deleteDiscovery(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(valuesDiscoveryDexieRepository.delete(id))
        discoveries.value = discoveries.value.filter(d => d.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete values discovery'
        console.error('Error deleting values discovery:', err)
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
    discoveries.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    discoveries,
    isLoading,
    error,
    sortedDiscoveries,
    latestDiscovery,
    getDiscoveryById,
    loadDiscoveries,
    createDiscovery,
    updateDiscovery,
    deleteDiscovery,
    reset,
  }
})
