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

export const useDistortionAssessmentStore = defineStore('distortionAssessment', () => {
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
      return assessments.value.find((a) => a.id === id)
    }
  })

  async function loadAssessments(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      assessments.value = await distortionAssessmentDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load distortion assessments'
      console.error('Error loading distortion assessments:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createAssessment(
    data: CreateDistortionAssessmentPayload,
  ): Promise<DistortionAssessment> {
    error.value = null
    try {
      const assessment = await distortionAssessmentDexieRepository.create(data)
      assessments.value.push(assessment)
      return assessment
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create distortion assessment'
      console.error('Error creating distortion assessment:', err)
      throw err
    }
  }

  async function updateAssessment(
    id: string,
    data: UpdateDistortionAssessmentPayload,
  ): Promise<DistortionAssessment> {
    error.value = null
    try {
      const updated = await distortionAssessmentDexieRepository.update(id, data)
      const index = assessments.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        assessments.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update distortion assessment'
      console.error('Error updating distortion assessment:', err)
      throw err
    }
  }

  async function deleteAssessment(id: string): Promise<void> {
    error.value = null
    try {
      await distortionAssessmentDexieRepository.delete(id)
      assessments.value = assessments.value.filter((a) => a.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete distortion assessment'
      console.error('Error deleting distortion assessment:', err)
      throw err
    }
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
  }
})
