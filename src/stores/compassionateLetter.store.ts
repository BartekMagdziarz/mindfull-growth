/**
 * Compassionate Letter Store
 *
 * Manages CompassionateLetters — self-compassion writing exercises
 * from Compassion-Focused Therapy (Paul Gilbert, 2009; Kristin Neff, 2003).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CompassionateLetter,
  CreateCompassionateLetterPayload,
  UpdateCompassionateLetterPayload,
} from '@/domain/exercises'
import { compassionateLetterDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useCompassionateLetterStore = defineStore('compassionateLetter', () => {
  const letters = ref<CompassionateLetter[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedLetters = computed(() => {
    return [...letters.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestLetter = computed(() => {
    return sortedLetters.value[0] ?? null
  })

  const getLetterById = computed(() => {
    return (id: string): CompassionateLetter | undefined => {
      return letters.value.find((l) => l.id === id)
    }
  })

  async function loadLetters(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      letters.value = await compassionateLetterDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load compassionate letters'
      console.error('Error loading compassionate letters:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLetter(data: CreateCompassionateLetterPayload): Promise<CompassionateLetter> {
    error.value = null
    try {
      const letter = await compassionateLetterDexieRepository.create(data)
      letters.value.push(letter)
      return letter
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create compassionate letter'
      console.error('Error creating compassionate letter:', err)
      throw err
    }
  }

  async function updateLetter(
    id: string,
    data: UpdateCompassionateLetterPayload,
  ): Promise<CompassionateLetter> {
    error.value = null
    try {
      const updated = await compassionateLetterDexieRepository.update(id, data)
      const index = letters.value.findIndex((l) => l.id === id)
      if (index !== -1) {
        letters.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update compassionate letter'
      console.error('Error updating compassionate letter:', err)
      throw err
    }
  }

  async function deleteLetter(id: string): Promise<void> {
    error.value = null
    try {
      await compassionateLetterDexieRepository.delete(id)
      letters.value = letters.value.filter((l) => l.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete compassionate letter'
      console.error('Error deleting compassionate letter:', err)
      throw err
    }
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
  }
})
