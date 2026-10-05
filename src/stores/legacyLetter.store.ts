import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Legacy Letter Store
 *
 * Manages LegacyLetter exercises — write about the meaning you want
 * your life to create (Viktor Frankl).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  LegacyLetter,
  CreateLegacyLetterPayload,
  UpdateLegacyLetterPayload,
} from '@/domain/exercises'
import { legacyLetterDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useLegacyLetterStore = defineStore('legacyLetter', () => {
  const sessionScope = createStoreSessionScope()
  const letters = ref<LegacyLetter[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedLetters = computed(() => {
    return [...letters.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestLetter = computed(() => {
    return sortedLetters.value[0] ?? null
  })

  const getLetterById = computed(() => {
    return (id: string): LegacyLetter | undefined => {
      return letters.value.find(l => l.id === id)
    }
  })

  async function loadLetters(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        letters.value = await operation.wait(legacyLetterDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load legacy letters'
        console.error('Error loading legacy letters:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createLetter(data: CreateLegacyLetterPayload): Promise<LegacyLetter> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const letter = await operation.wait(legacyLetterDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('legacy-letter', letter.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      letters.value.push(letter)
      return letter
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create legacy letter'
      console.error('Error creating legacy letter:', err)
      throw err
    }
  }

  async function updateLetter(id: string, data: UpdateLegacyLetterPayload): Promise<LegacyLetter> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(legacyLetterDexieRepository.update(id, data))
      const index = letters.value.findIndex(l => l.id === id)
      if (index !== -1) {
        letters.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update legacy letter'
      console.error('Error updating legacy letter:', err)
      throw err
    }
  }

  async function deleteLetter(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(legacyLetterDexieRepository.delete(id))
        letters.value = letters.value.filter(l => l.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete legacy letter'
        console.error('Error deleting legacy letter:', err)
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
    letters.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    letters,
    isLoading,
    error,
    sortedLetters,
    latestLetter,
    getLetterById,
    loadLetters,
    createLetter,
    updateLetter,
    deleteLetter,
    reset,
  }
})
