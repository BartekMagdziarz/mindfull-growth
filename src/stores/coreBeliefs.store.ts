/**
 * Core Beliefs Exploration Store
 *
 * Manages CoreBeliefsExplorations — Downward Arrow exercises that drill
 * from automatic thoughts to deep core beliefs (Judith Beck, 1995).
 */

import { defineStore } from 'pinia'
import type {
  CoreBeliefsExploration,
  CreateCoreBeliefsExplorationPayload,
  UpdateCoreBeliefsExplorationPayload,
} from '@/domain/exercises'
import { coreBeliefsExplorationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useCoreBeliefsStore = defineStore('coreBeliefs', () => {
  const explorations = useExerciseCollection<
    CoreBeliefsExploration,
    CreateCoreBeliefsExplorationPayload,
    UpdateCoreBeliefsExplorationPayload
  >({
    repository: coreBeliefsExplorationDexieRepository,
    label: 'core beliefs exploration',
    scope: 'coreBeliefsStore',
    completionSlug: 'core-beliefs',
  })

  return {
    explorations: explorations.items,
    isLoading: explorations.isLoading,
    error: explorations.error,
    sortedExplorations: explorations.sorted,
    latestExploration: explorations.latest,
    getExplorationById: explorations.getById,
    loadExplorations: explorations.loadAll,
    createExploration: explorations.create,
    updateExploration: explorations.update,
    deleteExploration: explorations.remove,
    reset: explorations.reset,
  }
})
