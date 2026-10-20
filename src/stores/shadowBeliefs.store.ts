/**
 * Shadow Beliefs Store
 *
 * Manages ShadowBeliefs exercises — surfacing self-sabotaging beliefs.
 */

import { defineStore } from 'pinia'
import type {
  ShadowBeliefs,
  CreateShadowBeliefsPayload,
  UpdateShadowBeliefsPayload,
} from '@/domain/exercises'
import { shadowBeliefsDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useShadowBeliefsStore = defineStore('shadowBeliefs', () => {
  const beliefsList = useExerciseCollection<
    ShadowBeliefs,
    CreateShadowBeliefsPayload,
    UpdateShadowBeliefsPayload
  >({
    repository: shadowBeliefsDexieRepository,
    label: 'shadow beliefs',
    labelPlural: 'shadow beliefs',
    scope: 'shadowBeliefsStore',
    completionSlug: 'shadow-beliefs',
  })

  return {
    beliefsList: beliefsList.items,
    isLoading: beliefsList.isLoading,
    error: beliefsList.error,
    sortedBeliefs: beliefsList.sorted,
    latestBeliefs: beliefsList.latest,
    getBeliefsById: beliefsList.getById,
    loadBeliefs: beliefsList.loadAll,
    createBeliefs: beliefsList.create,
    updateBeliefs: beliefsList.update,
    deleteBeliefs: beliefsList.remove,
    reset: beliefsList.reset,
  }
})
