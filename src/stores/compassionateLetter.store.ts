/**
 * Compassionate Letter Store
 *
 * Manages CompassionateLetters — self-compassion writing exercises
 * from Compassion-Focused Therapy (Paul Gilbert, 2009; Kristin Neff, 2003).
 */

import { defineStore } from 'pinia'
import type {
  CompassionateLetter,
  CreateCompassionateLetterPayload,
  UpdateCompassionateLetterPayload,
} from '@/domain/exercises'
import { compassionateLetterDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useCompassionateLetterStore = defineStore('compassionateLetter', () => {
  const letters = useExerciseCollection<
    CompassionateLetter,
    CreateCompassionateLetterPayload,
    UpdateCompassionateLetterPayload
  >({
    repository: compassionateLetterDexieRepository,
    label: 'compassionate letter',
    scope: 'compassionateLetterStore',
    completionSlug: 'compassionate-letter',
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
