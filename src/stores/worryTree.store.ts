import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Worry Tree Store
 *
 * Manages WorryTreeEntries — quick anxiety management exercises using
 * a decision flowchart (Adrian Wells, 1997; Robert Leahy, 2005).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WorryTreeEntry,
  CreateWorryTreeEntryPayload,
  UpdateWorryTreeEntryPayload,
} from '@/domain/exercises'
import { worryTreeEntryDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useWorryTreeStore = defineStore('worryTree', () => {
  const sessionScope = createStoreSessionScope()
  const entries = ref<WorryTreeEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestEntry = computed(() => {
    return sortedEntries.value[0] ?? null
  })

  const getEntryById = computed(() => {
    return (id: string): WorryTreeEntry | undefined => {
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
        entries.value = await operation.wait(worryTreeEntryDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load worry tree entries'
        console.error('Error loading worry tree entries:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createEntry(data: CreateWorryTreeEntryPayload): Promise<WorryTreeEntry> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const entry = await operation.wait(worryTreeEntryDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('worry-tree', entry.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      entries.value.push(entry)
      return entry
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create worry tree entry'
      console.error('Error creating worry tree entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    data: UpdateWorryTreeEntryPayload
  ): Promise<WorryTreeEntry> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(worryTreeEntryDexieRepository.update(id, data))
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update worry tree entry'
      console.error('Error updating worry tree entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(worryTreeEntryDexieRepository.delete(id))
        entries.value = entries.value.filter(e => e.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete worry tree entry'
        console.error('Error deleting worry tree entry:', err)
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
