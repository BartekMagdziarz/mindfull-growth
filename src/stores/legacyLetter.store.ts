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

export const useLegacyLetterStore = defineStore('legacyLetter', () => {
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
      return letters.value.find((l) => l.id === id)
    }
  })

  async function loadLetters(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      letters.value = await legacyLetterDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load legacy letters'
      console.error('Error loading legacy letters:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLetter(data: CreateLegacyLetterPayload): Promise<LegacyLetter> {
    error.value = null
    try {
      const letter = await legacyLetterDexieRepository.create(data)
      letters.value.push(letter)
      return letter
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create legacy letter'
      console.error('Error creating legacy letter:', err)
      throw err
    }
  }

  async function updateLetter(
    id: string,
    data: UpdateLegacyLetterPayload,
  ): Promise<LegacyLetter> {
    error.value = null
    try {
      const updated = await legacyLetterDexieRepository.update(id, data)
      const index = letters.value.findIndex((l) => l.id === id)
      if (index !== -1) {
        letters.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update legacy letter'
      console.error('Error updating legacy letter:', err)
      throw err
    }
  }

  async function deleteLetter(id: string): Promise<void> {
    error.value = null
    try {
      await legacyLetterDexieRepository.delete(id)
      letters.value = letters.value.filter((l) => l.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete legacy letter'
      console.error('Error deleting legacy letter:', err)
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
