import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Distortion Assessment Store
 *
 * Manages DistortionAssessments — learning + applied exercises for
 * identifying cognitive distortions (David Burns, Feeling Good 1980).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DistortionAssessment,
  CreateDistortionAssessmentPayload,
  UpdateDistortionAssessmentPayload,
} from '@/domain/exercises'
import { distortionAssessmentDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useDistortionAssessmentStore = defineStore('distortionAssessment', () => {
  const sessionScope = createStoreSessionScope()
  const assessments = ref<DistortionAssessment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedAssessments = computed(() => {
    return [...assessments.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestAssessment = computed(() => {
    return sortedAssessments.value[0] ?? null
  })

  const getAssessmentById = computed(() => {
    return (id: string): DistortionAssessment | undefined => {
      return assessments.value.find(a => a.id === id)
    }
  })

  async function loadAssessments(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        assessments.value = await operation.wait(distortionAssessmentDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load distortion assessments'
        console.error('Error loading distortion assessments:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createAssessment(
    data: CreateDistortionAssessmentPayload
  ): Promise<DistortionAssessment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const assessment = await operation.wait(distortionAssessmentDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('cognitive-distortions', assessment.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      assessments.value.push(assessment)
      return assessment
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create distortion assessment'
      console.error('Error creating distortion assessment:', err)
      throw err
    }
  }

  async function updateAssessment(
    id: string,
    data: UpdateDistortionAssessmentPayload
  ): Promise<DistortionAssessment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(distortionAssessmentDexieRepository.update(id, data))
      const index = assessments.value.findIndex(a => a.id === id)
      if (index !== -1) {
        assessments.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update distortion assessment'
      console.error('Error updating distortion assessment:', err)
      throw err
    }
  }

  async function deleteAssessment(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(distortionAssessmentDexieRepository.delete(id))
        assessments.value = assessments.value.filter(a => a.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete distortion assessment'
        console.error('Error deleting distortion assessment:', err)
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
    assessments.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    assessments,
    isLoading,
    error,
    sortedAssessments,
    latestAssessment,
    getAssessmentById,
    loadAssessments,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    reset,
  }
})
