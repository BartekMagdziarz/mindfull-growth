/**
 * Distortion Assessment Store
 *
 * Manages DistortionAssessments — learning + applied exercises for
 * identifying cognitive distortions (David Burns, Feeling Good 1980).
 */

import { defineStore } from 'pinia'
import type {
  DistortionAssessment,
  CreateDistortionAssessmentPayload,
  UpdateDistortionAssessmentPayload,
} from '@/domain/exercises'
import { distortionAssessmentDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useDistortionAssessmentStore = defineStore('distortionAssessment', () => {
  const assessments = useExerciseCollection<
    DistortionAssessment,
    CreateDistortionAssessmentPayload,
    UpdateDistortionAssessmentPayload
  >({
    repository: distortionAssessmentDexieRepository,
    label: 'distortion assessment',
    scope: 'distortionAssessmentStore',
    completionSlug: 'cognitive-distortions',
  })

  return {
    assessments: assessments.items,
    isLoading: assessments.isLoading,
    error: assessments.error,
    sortedAssessments: assessments.sorted,
    latestAssessment: assessments.latest,
    getAssessmentById: assessments.getById,
    loadAssessments: assessments.loadAll,
    createAssessment: assessments.create,
    updateAssessment: assessments.update,
    deleteAssessment: assessments.remove,
    reset: assessments.reset,
  }
})
