import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  AssessmentAttempt,
  AssessmentComputation,
  AssessmentDefinition,
  AssessmentId,
  AssessmentResponse,
} from '@/domain/assessments'
import type { LocaleId } from '@/services/locale.service'
import { assessmentsDexieRepository } from '@/repositories/assessmentsDexieRepository'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { scoreAssessment } from '@/services/assessments/scoringEngine'

interface CompleteAttemptOptions {
  centeredScoringEnabled?: boolean
}

interface RetakeStatus {
  canRetake: boolean
  retakeEligibleAt?: string
}

function plusWeeks(iso: string, weeks: number): string {
  const date = new Date(iso)
  date.setDate(date.getDate() + weeks * 7)
  return date.toISOString()
}

function nowIso(): string {
  return new Date().toISOString()
}

function isRetakeEligible(retakeEligibleAt?: string): boolean {
  if (!retakeEligibleAt) return true
  return nowIso() >= retakeEligibleAt
}

export const useAssessmentStore = defineStore('assessment', () => {
  const attemptsByAssessment = ref<Partial<Record<AssessmentId, AssessmentAttempt[]>>>({})
  const responsesByAttemptId = ref<Record<string, AssessmentResponse[]>>({})
  const activeAttemptIdByAssessment = ref<Partial<Record<AssessmentId, string>>>({})
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const getAttemptsByAssessment = computed(() => {
    return (assessmentId: AssessmentId): AssessmentAttempt[] => {
      return attemptsByAssessment.value[assessmentId] ?? []
    }
  })

  const getLatestCompletedAttemptFromState = computed(() => {
    return (assessmentId: AssessmentId): AssessmentAttempt | undefined => {
      const attempts = attemptsByAssessment.value[assessmentId] ?? []
      return attempts
        .filter((attempt) => attempt.status === 'completed' && Boolean(attempt.completedAt))
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
    }
  })

  const getActiveAttempt = computed(() => {
    return (assessmentId: AssessmentId): AssessmentAttempt | undefined => {
      const attemptId = activeAttemptIdByAssessment.value[assessmentId]
      if (!attemptId) return undefined
      return (attemptsByAssessment.value[assessmentId] ?? []).find((attempt) => attempt.id === attemptId)
    }
  })

  const getResponsesByAttempt = computed(() => {
    return (attemptId: string): AssessmentResponse[] => {
      return responsesByAttemptId.value[attemptId] ?? []
    }
  })

  const getResponseMapByAttempt = computed(() => {
    return (attemptId: string): Record<string, number> => {
      const responses = responsesByAttemptId.value[attemptId] ?? []
      return responses.reduce<Record<string, number>>((acc, response) => {
        acc[response.itemId] = response.responseValue
        return acc
      }, {})
    }
  })

  function upsertAttempt(attempt: AssessmentAttempt): void {
    const current = [...(attemptsByAssessment.value[attempt.assessmentId] ?? [])]
    const index = current.findIndex((entry) => entry.id === attempt.id)

    if (index === -1) {
      current.push(attempt)
    } else {
      current[index] = attempt
    }

    current.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    attemptsByAssessment.value = {
      ...attemptsByAssessment.value,
      [attempt.assessmentId]: current,
    }
  }

  function upsertResponse(attemptId: string, response: AssessmentResponse): void {
    const current = [...(responsesByAttemptId.value[attemptId] ?? [])]
    const index = current.findIndex((entry) => entry.itemId === response.itemId)

    if (index === -1) {
      current.push(response)
    } else {
      current[index] = response
    }

    responsesByAttemptId.value = {
      ...responsesByAttemptId.value,
      [attemptId]: current,
    }
  }

  async function loadAttempts(assessmentId: AssessmentId): Promise<AssessmentAttempt[]> {
    isLoading.value = true
    error.value = null

    try {
      const attempts = await assessmentsDexieRepository.getAttemptsByAssessment(assessmentId)
      attemptsByAssessment.value = {
        ...attemptsByAssessment.value,
        [assessmentId]: attempts,
      }
      return attempts
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load assessment attempts'
      console.error('Error loading assessment attempts:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function loadResponses(attemptId: string): Promise<AssessmentResponse[]> {
    isLoading.value = true
    error.value = null

    try {
      const responses = await assessmentsDexieRepository.getResponsesByAttempt(attemptId)
      responsesByAttemptId.value = {
        ...responsesByAttemptId.value,
        [attemptId]: responses,
      }
      return responses
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load assessment responses'
      console.error('Error loading assessment responses:', err)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function hydrateAssessment(assessmentId: AssessmentId): Promise<void> {
    const attempts = await loadAttempts(assessmentId)
    const inProgress = attempts.find((attempt) => attempt.status === 'in-progress')
    if (!inProgress) return

    activeAttemptIdByAssessment.value = {
      ...activeAttemptIdByAssessment.value,
      [assessmentId]: inProgress.id,
    }

    if (!responsesByAttemptId.value[inProgress.id]) {
      await loadResponses(inProgress.id)
    }
  }

  async function startAttempt(
    assessmentId: AssessmentId,
    language: LocaleId,
  ): Promise<AssessmentAttempt> {
    isSaving.value = true
    error.value = null

    try {
      const definition = getAssessmentDefinition(assessmentId)
      const attempt = await assessmentsDexieRepository.startAttempt({
        assessmentId,
        instrumentVersion: definition.instrumentVersion,
        language,
        scoringKeyVersion: definition.scoringKeyVersion,
        missingDataPolicyVersion: definition.missingDataPolicy.id,
        totalItems: definition.items.length,
      })

      upsertAttempt(attempt)
      activeAttemptIdByAssessment.value = {
        ...activeAttemptIdByAssessment.value,
        [assessmentId]: attempt.id,
      }
      responsesByAttemptId.value = {
        ...responsesByAttemptId.value,
        [attempt.id]: [],
      }

      return attempt
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start assessment attempt'
      console.error('Error starting assessment attempt:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function resumeOrStartAttempt(
    assessmentId: AssessmentId,
    language: LocaleId,
  ): Promise<AssessmentAttempt> {
    error.value = null

    const inProgress = await assessmentsDexieRepository.getInProgressAttempt(assessmentId)
    if (inProgress) {
      upsertAttempt(inProgress)
      activeAttemptIdByAssessment.value = {
        ...activeAttemptIdByAssessment.value,
        [assessmentId]: inProgress.id,
      }
      if (!responsesByAttemptId.value[inProgress.id]) {
        await loadResponses(inProgress.id)
      }
      return inProgress
    }

    return startAttempt(assessmentId, language)
  }

  async function restartAttempt(
    assessmentId: AssessmentId,
    language: LocaleId,
  ): Promise<AssessmentAttempt> {
    const inProgress = await assessmentsDexieRepository.getInProgressAttempt(assessmentId)
    if (inProgress) {
      await abandonAttempt(inProgress.id)
    }
    return startAttempt(assessmentId, language)
  }

  async function saveResponse(
    assessmentId: AssessmentId,
    attemptId: string,
    itemId: string,
    responseValue: number,
  ): Promise<AssessmentResponse> {
    isSaving.value = true
    error.value = null

    try {
      const definition = getAssessmentDefinition(assessmentId)
      const item = definition.items.find((entry) => entry.id === itemId)
      if (!item) {
        throw new Error(`Item ${itemId} not found for assessment ${assessmentId}`)
      }

      const response = await assessmentsDexieRepository.saveResponse({
        attemptId,
        assessmentId,
        itemId,
        responseValue,
        reverseFlagAtTime: item.reverse,
        scoringKeyVersion: definition.scoringKeyVersion,
      })

      upsertResponse(attemptId, response)

      const attempt = await assessmentsDexieRepository.getAttemptById(attemptId)
      if (attempt) {
        upsertAttempt(attempt)
      }

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save assessment response'
      console.error('Error saving assessment response:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function bulkSaveResponses(
    assessmentId: AssessmentId,
    attemptId: string,
    values: Record<string, number>,
  ): Promise<AssessmentResponse[]> {
    isSaving.value = true
    error.value = null

    try {
      const definition = getAssessmentDefinition(assessmentId)
      const payload = Object.entries(values)
        .map(([itemId, responseValue]) => {
          const item = definition.items.find((entry) => entry.id === itemId)
          if (!item) return null
          return {
            attemptId,
            assessmentId,
            itemId,
            responseValue,
            reverseFlagAtTime: item.reverse,
            scoringKeyVersion: definition.scoringKeyVersion,
          }
        })
        .filter((entry): entry is {
          attemptId: string
          assessmentId: AssessmentId
          itemId: string
          responseValue: number
          reverseFlagAtTime: boolean
          scoringKeyVersion: string
        } => entry !== null)

      const responses = await assessmentsDexieRepository.bulkSaveResponses(payload)

      for (const response of responses) {
        upsertResponse(attemptId, response)
      }

      const attempt = await assessmentsDexieRepository.getAttemptById(attemptId)
      if (attempt) {
        upsertAttempt(attempt)
      }

      return responses
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to bulk save assessment responses'
      console.error('Error bulk saving assessment responses:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function resolveAttemptAndResponses(
    assessmentId: AssessmentId,
    attemptId: string,
  ): Promise<{ definition: AssessmentDefinition; attempt: AssessmentAttempt; responses: AssessmentResponse[] }> {
    const definition = getAssessmentDefinition(assessmentId)

    let attempt = (attemptsByAssessment.value[assessmentId] ?? []).find((entry) => entry.id === attemptId)
    if (!attempt) {
      attempt = await assessmentsDexieRepository.getAttemptById(attemptId)
    }

    if (!attempt) {
      throw new Error(`Assessment attempt ${attemptId} not found`)
    }

    const responses = responsesByAttemptId.value[attemptId] ?? (await loadResponses(attemptId))

    return {
      definition,
      attempt,
      responses,
    }
  }

  async function completeAttempt(
    assessmentId: AssessmentId,
    attemptId: string,
    options?: CompleteAttemptOptions,
  ): Promise<{ attempt: AssessmentAttempt; computation: AssessmentComputation }> {
    isSaving.value = true
    error.value = null

    try {
      const { definition, attempt, responses } = await resolveAttemptAndResponses(assessmentId, attemptId)

      const previousAttempt = await assessmentsDexieRepository.getLatestCompletedAttempt(assessmentId)

      const computation = scoreAssessment({
        assessmentId,
        responses,
        previousAttempt,
        centeredScoringEnabled: options?.centeredScoringEnabled,
      })

      const completed = await assessmentsDexieRepository.completeAttempt(attempt.id, {
        computedScales: computation.computedScales,
        overallSummary: computation.overallSummary,
        scoringComputationMetadata: computation.scoringComputationMetadata,
        retakeEligibleAt: plusWeeks(nowIso(), definition.retakePolicy.weeks),
      })

      upsertAttempt(completed)
      activeAttemptIdByAssessment.value = {
        ...activeAttemptIdByAssessment.value,
        [assessmentId]: undefined,
      }

      return {
        attempt: completed,
        computation,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to complete assessment attempt'
      console.error('Error completing assessment attempt:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function recomputeAttempt(
    assessmentId: AssessmentId,
    attemptId: string,
    centeredScoringEnabled?: boolean,
  ): Promise<AssessmentComputation> {
    const { attempt, responses } = await resolveAttemptAndResponses(assessmentId, attemptId)

    const previousAttempt = attempt.completedAt
      ? await assessmentsDexieRepository.getPreviousCompletedAttempt(assessmentId, attempt.completedAt)
      : await assessmentsDexieRepository.getLatestCompletedAttempt(assessmentId)

    return scoreAssessment({
      assessmentId,
      responses,
      previousAttempt,
      centeredScoringEnabled,
    })
  }

  async function abandonAttempt(attemptId: string): Promise<AssessmentAttempt> {
    isSaving.value = true
    error.value = null

    try {
      const abandoned = await assessmentsDexieRepository.abandonAttempt(attemptId)
      upsertAttempt(abandoned)

      if (activeAttemptIdByAssessment.value[abandoned.assessmentId] === abandoned.id) {
        activeAttemptIdByAssessment.value = {
          ...activeAttemptIdByAssessment.value,
          [abandoned.assessmentId]: undefined,
        }
      }

      return abandoned
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to abandon assessment attempt'
      console.error('Error abandoning assessment attempt:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function getRetakeStatus(assessmentId: AssessmentId): RetakeStatus {
    const latest = getLatestCompletedAttemptFromState.value(assessmentId)
    if (!latest) {
      return {
        canRetake: true,
      }
    }

    return {
      canRetake: isRetakeEligible(latest.retakeEligibleAt),
      retakeEligibleAt: latest.retakeEligibleAt,
    }
  }

  return {
    attemptsByAssessment,
    responsesByAttemptId,
    activeAttemptIdByAssessment,
    isLoading,
    isSaving,
    error,
    getAttemptsByAssessment,
    getLatestCompletedAttemptFromState,
    getActiveAttempt,
    getResponsesByAttempt,
    getResponseMapByAttempt,
    loadAttempts,
    loadResponses,
    hydrateAssessment,
    startAttempt,
    resumeOrStartAttempt,
    restartAttempt,
    saveResponse,
    bulkSaveResponses,
    completeAttempt,
    recomputeAttempt,
    abandonAttempt,
    getRetakeStatus,
  }
})
