import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Micro Exercise Entry Store
 *
 * Manages MicroExerciseEntries — results of the data-driven 2–5 minute
 * exercises run by MicroExerciseRunner (design D1: one table for all
 * micro exercises instead of bespoke tables).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CreateMicroExerciseEntryPayload, MicroExerciseEntry } from '@/domain/microExercises'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { backfillMoment, type BackfillMomentInput } from '@/services/momentBackfillService'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useMicroExerciseEntryStore = defineStore('microExerciseEntry', () => {
  const sessionScope = createStoreSessionScope()
  const entries = ref<MicroExerciseEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const entriesBySlug = computed(() => {
    return (exerciseSlug: string): MicroExerciseEntry[] =>
      sortedEntries.value.filter(entry => entry.exerciseSlug === exerciseSlug)
  })

  async function loadEntries(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        entries.value = await operation.wait(microExerciseEntryDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load micro exercise entries'
        console.error('Error loading micro exercise entries:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * `completionSlug` is the catalog slug the run was started as — a
   * variant (e.g. `moment-shame`) records its completion under its own
   * slug while the entry lives under the definition's (`moments`).
   */
  async function createEntry(
    data: CreateMicroExerciseEntryPayload,
    completionSlug: string = data.exerciseSlug
  ): Promise<MicroExerciseEntry> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const entry = await operation.wait(microExerciseEntryDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record(completionSlug, entry.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      entries.value.push(entry)
      return entry
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create micro exercise entry'
      console.error('Error creating micro exercise entry:', err)
      throw err
    }
  }

  /** A Moment written down later from the weekly reflection (no exercise completion). */
  async function createBackfilledMoment(input: BackfillMomentInput): Promise<MicroExerciseEntry> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const entry = await operation.wait(backfillMoment(input))
      entries.value.push(entry)
      return entry
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to backfill moment'
      console.error('Error backfilling moment:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(microExerciseEntryDexieRepository.delete(id))
        entries.value = entries.value.filter(entry => entry.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete micro exercise entry'
        console.error('Error deleting micro exercise entry:', err)
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
    entriesBySlug,
    loadEntries,
    createEntry,
    createBackfilledMoment,
    deleteEntry,
    reset,
  }
})
