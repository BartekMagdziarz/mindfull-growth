/**
 * Behavioral Experiment Store
 *
 * Manages BehavioralExperiments — designing and running real-world
 * experiments to test the validity of negative beliefs (Bennett-Levy et al., 2004).
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  BehavioralExperiment,
  CreateBehavioralExperimentPayload,
  UpdateBehavioralExperimentPayload,
} from '@/domain/exercises'
import { behavioralExperimentDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useBehavioralExperimentStore = defineStore('behavioralExperiment', () => {
  const experiments = useExerciseCollection<
    BehavioralExperiment,
    CreateBehavioralExperimentPayload,
    UpdateBehavioralExperimentPayload
  >({
    repository: behavioralExperimentDexieRepository,
    label: 'behavioral experiment',
    scope: 'behavioralExperimentStore',
    completionSlug: 'behavioral-experiment',
  })

  const plannedExperiments = computed(() =>
    experiments.sorted.value.filter(e => e.status === 'planned')
  )
  const completedExperiments = computed(() =>
    experiments.sorted.value.filter(e => e.status === 'completed')
  )

  return {
    experiments: experiments.items,
    isLoading: experiments.isLoading,
    error: experiments.error,
    sortedExperiments: experiments.sorted,
    latestExperiment: experiments.latest,
    plannedExperiments,
    completedExperiments,
    getExperimentById: experiments.getById,
    loadExperiments: experiments.loadAll,
    createExperiment: experiments.create,
    updateExperiment: experiments.update,
    deleteExperiment: experiments.remove,
    reset: experiments.reset,
  }
})
