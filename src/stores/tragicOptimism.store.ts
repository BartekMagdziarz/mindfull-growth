import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Tragic Optimism Store
 *
 * Manages TragicOptimism exercises — find meaning within suffering,
 * guilt, or awareness of limited time (Viktor Frankl's tragic triad).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  TragicOptimism,
  CreateTragicOptimismPayload,
  UpdateTragicOptimismPayload,
} from '@/domain/exercises'
import { tragicOptimismDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useTragicOptimismStore = defineStore('tragicOptimism', () => {
  const sessionScope = createStoreSessionScope()
  const entries = ref<TragicOptimism[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestEntry = computed(() => {
    return sortedEntries.value[0] ?? null
  })

  const getEntryById = computed(() => {
    return (id: string): TragicOptimism | undefined => {
      return entries.value.find(e => e.id === id)
    }
  })

  async function loadEntries(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        entries.value = await operation.wait(tragicOptimismDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load tragic optimism entries'
        console.error('Error loading tragic optimism entries:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createEntry(data: CreateTragicOptimismPayload): Promise<TragicOptimism> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const entry = await operation.wait(tragicOptimismDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('tragic-optimism', entry.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      entries.value.push(entry)
      return entry
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create tragic optimism entry'
      console.error('Error creating tragic optimism entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    data: UpdateTragicOptimismPayload
  ): Promise<TragicOptimism> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(tragicOptimismDexieRepository.update(id, data))
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update tragic optimism entry'
      console.error('Error updating tragic optimism entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(tragicOptimismDexieRepository.delete(id))
        entries.value = entries.value.filter(e => e.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete tragic optimism entry'
        console.error('Error deleting tragic optimism entry:', err)
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
    entries.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    entries,
    isLoading,
    error,
    sortedEntries,
    latestEntry,
    getEntryById,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    reset,
  }
})
