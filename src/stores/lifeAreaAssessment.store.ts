import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CreateLifeAreaAssessmentPayload,
  LifeAreaAssessment,
  UpdateLifeAreaAssessmentPayload,
} from '@/domain/lifeAreaAssessment'
import { lifeAreaAssessmentDexieRepository } from '@/repositories/lifeAreaAssessmentDexieRepository'
import {
  filterLifeAreaAssessmentsByDateRange,
  filterLifeAreaAssessmentsByScope,
  getLatestLifeAreaAssessment,
  getLatestLifeAreaAssessmentForLifeArea,
  getPreviousLifeAreaAssessmentForLifeArea,
  sortLifeAreaAssessmentsByCreatedAt,
} from '@/utils/lifeAreaAssessments'

export const useLifeAreaAssessmentStore = defineStore('lifeAreaAssessment', () => {
  const assessments = ref<LifeAreaAssessment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedAssessments = computed(() => sortLifeAreaAssessmentsByCreatedAt(assessments.value))
  const fullAssessments = computed(() => filterLifeAreaAssessmentsByScope(sortedAssessments.value, 'full'))
  const latestAssessment = computed(() => getLatestLifeAreaAssessment(assessments.value))
  const latestFullAssessment = computed(() => getLatestLifeAreaAssessment(assessments.value, 'full'))

  const getAssessmentById = computed(() => {
    return (id: string): LifeAreaAssessment | undefined =>
      assessments.value.find((assessment) => assessment.id === id)
  })

  const getAssessmentsByLifeArea = computed(() => {
    return (lifeAreaId: string): LifeAreaAssessment[] =>
      sortedAssessments.value.filter((assessment) => assessment.lifeAreaIds.includes(lifeAreaId))
  })

  const getAssessmentsByDateRange = computed(() => {
    return (startDate: string, endDate: string): LifeAreaAssessment[] =>
      sortLifeAreaAssessmentsByCreatedAt(
        filterLifeAreaAssessmentsByDateRange(assessments.value, startDate, endDate),
      )
  })

  const getLatestAssessmentForLifeArea = computed(() => {
    return (lifeAreaId: string): LifeAreaAssessment | undefined =>
      getLatestLifeAreaAssessmentForLifeArea(assessments.value, lifeAreaId)
  })

  const getPreviousAssessmentForLifeArea = computed(() => {
    return (lifeAreaId: string, beforeCreatedAt: string): LifeAreaAssessment | undefined =>
      getPreviousLifeAreaAssessmentForLifeArea(assessments.value, lifeAreaId, beforeCreatedAt)
  })

  const hasAssessmentsForLifeArea = computed(() => {
    return (lifeAreaId: string): boolean =>
      assessments.value.some((assessment) => assessment.lifeAreaIds.includes(lifeAreaId))
  })

  async function loadAssessments(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      assessments.value = await lifeAreaAssessmentDexieRepository.listAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load life area assessments'
      console.error('Error loading life area assessments:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createAssessment(
    data: CreateLifeAreaAssessmentPayload,
  ): Promise<LifeAreaAssessment> {
    error.value = null

    try {
      const created = await lifeAreaAssessmentDexieRepository.create(data)
      assessments.value = sortLifeAreaAssessmentsByCreatedAt([...assessments.value, created])
      return created
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create life area assessment'
      console.error('Error creating life area assessment:', err)
      throw err
    }
  }

  async function updateAssessment(
    id: string,
    data: UpdateLifeAreaAssessmentPayload,
  ): Promise<LifeAreaAssessment> {
    error.value = null

    try {
      const updated = await lifeAreaAssessmentDexieRepository.update(id, data)
      const index = assessments.value.findIndex((assessment) => assessment.id === id)
      if (index !== -1) {
        assessments.value[index] = updated
        assessments.value = sortLifeAreaAssessmentsByCreatedAt(assessments.value)
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update life area assessment'
      console.error('Error updating life area assessment:', err)
      throw err
    }
  }

  async function deleteAssessment(id: string): Promise<void> {
    error.value = null

    try {
      await lifeAreaAssessmentDexieRepository.delete(id)
      assessments.value = assessments.value.filter((assessment) => assessment.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete life area assessment'
      console.error('Error deleting life area assessment:', err)
      throw err
    }
  }

  return {
    assessments,
    isLoading,
    error,
    sortedAssessments,
    fullAssessments,
    latestAssessment,
    latestFullAssessment,
    getAssessmentById,
    getAssessmentsByLifeArea,
    getAssessmentsByDateRange,
    getLatestAssessmentForLifeArea,
    getPreviousAssessmentForLifeArea,
    hasAssessmentsForLifeArea,
    loadAssessments,
    createAssessment,
    updateAssessment,
    deleteAssessment,
  }
})
