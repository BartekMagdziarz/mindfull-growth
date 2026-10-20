/**
 * Paradoxical Intention Lab Store
 *
 * Manages Paradoxical Intention Lab exercises (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import type {
  ParadoxicalIntentionLab,
  CreateParadoxicalIntentionPayload,
  UpdateParadoxicalIntentionPayload,
} from '@/domain/exercises'
import { paradoxicalIntentionDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useParadoxicalIntentionStore = defineStore('paradoxicalIntention', () => {
  const labs = useExerciseCollection<
    ParadoxicalIntentionLab,
    CreateParadoxicalIntentionPayload,
    UpdateParadoxicalIntentionPayload
  >({
    repository: paradoxicalIntentionDexieRepository,
    label: 'lab',
    scope: 'paradoxicalIntentionStore',
    completionSlug: 'paradoxical-intention',
  })

  return {
    labs: labs.items,
    isLoading: labs.isLoading,
    error: labs.error,
    sortedLabs: labs.sorted,
    latestLab: labs.latest,
    getLabById: labs.getById,
    loadLabs: labs.loadAll,
    createLab: labs.create,
    updateLab: labs.update,
    deleteLab: labs.remove,
    reset: labs.reset,
  }
})
