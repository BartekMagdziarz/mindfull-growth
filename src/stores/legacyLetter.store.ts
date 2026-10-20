/**
 * Legacy Letter Store
 *
 * Manages LegacyLetter exercises — write about the meaning you want
 * your life to create (Viktor Frankl).
 */

import { defineStore } from 'pinia'
import type {
  LegacyLetter,
  CreateLegacyLetterPayload,
  UpdateLegacyLetterPayload,
} from '@/domain/exercises'
import { legacyLetterDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useLegacyLetterStore = defineStore('legacyLetter', () => {
  const letters = useExerciseCollection<
    LegacyLetter,
    CreateLegacyLetterPayload,
    UpdateLegacyLetterPayload
  >({
    repository: legacyLetterDexieRepository,
    label: 'legacy letter',
    scope: 'legacyLetterStore',
    completionSlug: 'legacy-letter',
  })

  return {
    letters: letters.items,
    isLoading: letters.isLoading,
    error: letters.error,
    sortedLetters: letters.sorted,
    latestLetter: letters.latest,
    getLetterById: letters.getById,
    loadLetters: letters.loadAll,
    createLetter: letters.create,
    updateLetter: letters.update,
    deleteLetter: letters.remove,
    reset: letters.reset,
  }
})
