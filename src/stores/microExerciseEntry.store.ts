/**
 * Micro Exercise Entry Store
 *
 * Manages MicroExerciseEntries — results of the data-driven 2–5 minute
 * exercises run by MicroExerciseRunner (design D1: one table for all
 * micro exercises instead of bespoke tables).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CreateMicroExerciseEntryPayload,
  MicroExerciseEntry,
} from '@/domain/microExercises'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useMicroExerciseEntryStore = defineStore('microExerciseEntry', () => {
  const entries = ref<MicroExerciseEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const entriesBySlug = computed(() => {
    return (exerciseSlug: string): MicroExerciseEntry[] =>
      sortedEntries.value.filter((entry) => entry.exerciseSlug === exerciseSlug)
  })

  async function loadEntries(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      entries.value = await microExerciseEntryDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load micro exercise entries'
      console.error('Error loading micro exercise entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createEntry(data: CreateMicroExerciseEntryPayload): Promise<MicroExerciseEntry> {
    error.value = null
    try {
      const entry = await microExerciseEntryDexieRepository.create(data)
      void useExerciseCompletionsStore()
        .record(entry.exerciseSlug, entry.id)
        .catch((err) => console.error('Failed to record exercise completion:', err))
      entries.value.push(entry)
      return entry
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create micro exercise entry'
      console.error('Error creating micro exercise entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      await microExerciseEntryDexieRepository.delete(id)
      entries.value = entries.value.filter((entry) => entry.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete micro exercise entry'
      console.error('Error deleting micro exercise entry:', err)
      throw err
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    entries.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    entries,
    isLoading,
    error,
    sortedEntries,
    entriesBySlug,
    loadEntries,
    createEntry,
    deleteEntry,
    reset,
  }
})
