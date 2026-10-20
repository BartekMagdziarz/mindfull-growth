import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CreateLifeAreaAssessmentPayload,
  LifeAreaAssessment,
  UpdateLifeAreaAssessmentPayload,
} from '@/domain/lifeAreaAssessment'
import { lifeAreaAssessmentDexieRepository } from '@/repositories/lifeAreaAssessmentDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import {
  filterLifeAreaAssessmentsByDateRange,
  filterLifeAreaAssessmentsByScope,
  getLatestLifeAreaAssessment,
  getLatestLifeAreaAssessmentForLifeArea,
  getPreviousLifeAreaAssessmentForLifeArea,
  sortLifeAreaAssessmentsByCreatedAt,
} from '@/utils/lifeAreaAssessments'
import { reportError } from '@/utils/reportError'

export const useLifeAreaAssessmentStore = defineStore('lifeAreaAssessment', () => {
  const sessionScope = createStoreSessionScope()
  const assessments = ref<LifeAreaAssessment[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedAssessments = computed(() => sortLifeAreaAssessmentsByCreatedAt(assessments.value))
  const fullAssessments = computed(() =>
    filterLifeAreaAssessmentsByScope(sortedAssessments.value, 'full')
  )
  const latestAssessment = computed(() => getLatestLifeAreaAssessment(assessments.value))
  const latestFullAssessment = computed(() =>
    getLatestLifeAreaAssessment(assessments.value, 'full')
  )

  const getAssessmentById = computed(() => {
    return (id: string): LifeAreaAssessment | undefined =>
      assessments.value.find(assessment => assessment.id === id)
  })

  const getAssessmentsByLifeArea = computed(() => {
    return (lifeAreaId: string): LifeAreaAssessment[] =>
      sortedAssessments.value.filter(assessment => assessment.lifeAreaIds.includes(lifeAreaId))
  })

  const getAssessmentsByDateRange = computed(() => {
    return (startDate: string, endDate: string): LifeAreaAssessment[] =>
      sortLifeAreaAssessmentsByCreatedAt(
        filterLifeAreaAssessmentsByDateRange(assessments.value, startDate, endDate)
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
      assessments.value.some(assessment => assessment.lifeAreaIds.includes(lifeAreaId))
  })

  async function loadAssessments(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null

      try {
        assessments.value = await operation.wait(lifeAreaAssessmentDexieRepository.listAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load life area assessments'
        reportError('lifeAreaAssessmentStore.loadAssessments', err)
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
    data: CreateLifeAreaAssessmentPayload
  ): Promise<LifeAreaAssessment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null

    try {
      const created = await operation.wait(lifeAreaAssessmentDexieRepository.create(data))
      // Only full assessments are the Wheel of Life exercise — the table is
      // shared with per-life-area partial assessments.
      if (created.scope === 'full') {
        void useExerciseCompletionsStore()
          .record('wheel-of-life', created.id)
          .catch(err => reportError('lifeAreaAssessmentStore.recordCompletion', err))
      }
      assessments.value = sortLifeAreaAssessmentsByCreatedAt([...assessments.value, created])
      return created
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create life area assessment'
      reportError('lifeAreaAssessmentStore.createAssessment', err)
      throw err
    }
  }

  async function updateAssessment(
    id: string,
    data: UpdateLifeAreaAssessmentPayload
  ): Promise<LifeAreaAssessment> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null

    try {
      const updated = await operation.wait(lifeAreaAssessmentDexieRepository.update(id, data))
      const index = assessments.value.findIndex(assessment => assessment.id === id)
      if (index !== -1) {
        assessments.value[index] = updated
        assessments.value = sortLifeAreaAssessmentsByCreatedAt(assessments.value)
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update life area assessment'
      reportError('lifeAreaAssessmentStore.updateAssessment', err)
      throw err
    }
  }

  async function deleteAssessment(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null

      try {
        await operation.wait(lifeAreaAssessmentDexieRepository.delete(id))
        assessments.value = assessments.value.filter(assessment => assessment.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete life area assessment'
        reportError('lifeAreaAssessmentStore.deleteAssessment', err)
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
    reset,
  }
})
