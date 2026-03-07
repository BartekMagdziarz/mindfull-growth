/**
 * Behavioral Experiment Store
 *
 * Manages BehavioralExperiments — designing and running real-world
 * experiments to test the validity of negative beliefs (Bennett-Levy et al., 2004).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BehavioralExperiment,
  CreateBehavioralExperimentPayload,
  UpdateBehavioralExperimentPayload,
} from '@/domain/exercises'
import { behavioralExperimentDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useBehavioralExperimentStore = defineStore('behavioralExperiment', () => {
  const experiments = ref<BehavioralExperiment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedExperiments = computed(() => {
    return [...experiments.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestExperiment = computed(() => {
    return sortedExperiments.value[0] ?? null
  })

  const plannedExperiments = computed(() => {
    return sortedExperiments.value.filter((e) => e.status === 'planned')
  })

  const completedExperiments = computed(() => {
    return sortedExperiments.value.filter((e) => e.status === 'completed')
  })

  const getExperimentById = computed(() => {
    return (id: string): BehavioralExperiment | undefined => {
      return experiments.value.find((e) => e.id === id)
    }
  })

  async function loadExperiments(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      experiments.value = await behavioralExperimentDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load behavioral experiments'
      console.error('Error loading behavioral experiments:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createExperiment(data: CreateBehavioralExperimentPayload): Promise<BehavioralExperiment> {
    error.value = null
    try {
      const experiment = await behavioralExperimentDexieRepository.create(data)
      experiments.value.push(experiment)
      return experiment
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create behavioral experiment'
      console.error('Error creating behavioral experiment:', err)
      throw err
    }
  }

  async function updateExperiment(
    id: string,
    data: UpdateBehavioralExperimentPayload,
  ): Promise<BehavioralExperiment> {
    error.value = null
    try {
      const updated = await behavioralExperimentDexieRepository.update(id, data)
      const index = experiments.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        experiments.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update behavioral experiment'
      console.error('Error updating behavioral experiment:', err)
      throw err
    }
  }

  async function deleteExperiment(id: string): Promise<void> {
    error.value = null
    try {
      await behavioralExperimentDexieRepository.delete(id)
      experiments.value = experiments.value.filter((e) => e.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete behavioral experiment'
      console.error('Error deleting behavioral experiment:', err)
      throw err
    }
  }

  return {
    experiments,
    isLoading,
    error,
    sortedExperiments,
    latestExperiment,
    plannedExperiments,
    completedExperiments,
    getExperimentById,
    loadExperiments,
    createExperiment,
    updateExperiment,
    deleteExperiment,
  }
})
