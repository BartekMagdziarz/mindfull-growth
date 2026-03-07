import { computed, ref } from 'vue'
import type { AssessmentComputation, AssessmentId, AssessmentItemDefinition } from '@/domain/assessments'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { useAssessmentStore } from '@/stores/assessment.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

export type AssessmentSessionStep = 'intro' | 'consent' | 'questions' | 'review' | 'results'

function firstUnansweredPage(
  items: AssessmentItemDefinition[],
  responseMap: Record<string, number>,
  pageSize: number,
): number {
  const index = items.findIndex((item) => responseMap[item.id] === undefined)
  if (index === -1) {
    return Math.max(0, Math.ceil(items.length / pageSize) - 1)
  }
  return Math.floor(index / pageSize)
}

export function useAssessmentSession(assessmentId: AssessmentId) {
  const definition = getAssessmentDefinition(assessmentId)
  const assessmentStore = useAssessmentStore()
  const preferencesStore = useUserPreferencesStore()

  const step = ref<AssessmentSessionStep>('intro')
  const currentPage = ref(0)
  const consentAccepted = ref(false)
  const currentAttemptId = ref<string | null>(null)
  const resultComputation = ref<AssessmentComputation | null>(null)
  const isInitializing = ref(false)
  const centeredResultsEnabled = ref<boolean>(definition.defaultCenteringEnabled ?? false)

  const attempts = computed(() => assessmentStore.getAttemptsByAssessment(assessmentId))

  const inProgressAttempt = computed(() => {
    if (currentAttemptId.value) {
      const current = attempts.value.find((attempt) => attempt.id === currentAttemptId.value)
      if (current?.status === 'in-progress') {
        return current
      }
    }
    return attempts.value.find((attempt) => attempt.status === 'in-progress')
  })

  const latestCompletedAttempt = computed(() => {
    return assessmentStore.getLatestCompletedAttemptFromState(assessmentId)
  })

  const retakeStatus = computed(() => assessmentStore.getRetakeStatus(assessmentId))

  const activeAttemptId = computed(() => inProgressAttempt.value?.id ?? currentAttemptId.value)

  const responsesMap = computed(() => {
    if (!activeAttemptId.value) return {}
    return assessmentStore.getResponseMapByAttempt(activeAttemptId.value)
  })

  const answeredCount = computed(() => Object.keys(responsesMap.value).length)
  const totalCount = computed(() => definition.items.length)
  const unansweredCount = computed(() => totalCount.value - answeredCount.value)

  const totalPages = computed(() => Math.ceil(definition.items.length / definition.pageSize))

  const pageItems = computed(() => {
    const start = currentPage.value * definition.pageSize
    const end = start + definition.pageSize
    return definition.items.slice(start, end)
  })

  const unansweredItems = computed(() => {
    return definition.items.filter((item) => responsesMap.value[item.id] === undefined)
  })

  const canSubmit = computed(() => {
    return answeredCount.value > 0 && Boolean(activeAttemptId.value)
  })

  const effectiveComputation = computed(() => {
    if (resultComputation.value) return resultComputation.value
    if (latestCompletedAttempt.value?.computedScales && latestCompletedAttempt.value.overallSummary) {
      return {
        computedScales: latestCompletedAttempt.value.computedScales,
        overallSummary: latestCompletedAttempt.value.overallSummary,
        scoringComputationMetadata: latestCompletedAttempt.value.scoringComputationMetadata ?? {
          centeredScoringEnabled: definition.defaultCenteringEnabled ?? false,
          completedWithMissingData: false,
          missingItemCount: 0,
          scoringTimestamp: latestCompletedAttempt.value.completedAt ?? latestCompletedAttempt.value.updatedAt,
        },
      }
    }
    return null
  })

  async function initialize(): Promise<void> {
    isInitializing.value = true

    try {
      if (!preferencesStore.isLoaded) {
        await preferencesStore.loadPreferences()
      }

      await assessmentStore.hydrateAssessment(assessmentId)

      const currentInProgress = inProgressAttempt.value
      if (currentInProgress) {
        currentAttemptId.value = currentInProgress.id
      }

      const latest = latestCompletedAttempt.value
      if (latest?.scoringComputationMetadata?.centeredScoringEnabled !== undefined) {
        centeredResultsEnabled.value = latest.scoringComputationMetadata.centeredScoringEnabled
      }
    } finally {
      isInitializing.value = false
    }
  }

  function goToIntro(): void {
    step.value = 'intro'
  }

  function goToConsent(): void {
    consentAccepted.value = false
    step.value = 'consent'
  }

  async function startNewAttemptAfterConsent(): Promise<void> {
    const attempt = await assessmentStore.startAttempt(assessmentId, preferencesStore.locale)
    currentAttemptId.value = attempt.id
    currentPage.value = 0
    centeredResultsEnabled.value = definition.defaultCenteringEnabled ?? false
    resultComputation.value = null
    step.value = 'questions'
  }

  async function resumeAttempt(): Promise<void> {
    const attempt = await assessmentStore.resumeOrStartAttempt(assessmentId, preferencesStore.locale)
    currentAttemptId.value = attempt.id

    const responseMap = assessmentStore.getResponseMapByAttempt(attempt.id)
    currentPage.value = firstUnansweredPage(definition.items, responseMap, definition.pageSize)
    step.value = 'questions'
  }

  async function startRetake(): Promise<void> {
    const attempt = await assessmentStore.restartAttempt(assessmentId, preferencesStore.locale)
    currentAttemptId.value = attempt.id
    currentPage.value = 0
    centeredResultsEnabled.value = definition.defaultCenteringEnabled ?? false
    resultComputation.value = null
    step.value = 'questions'
  }

  async function saveResponse(itemId: string, responseValue: number): Promise<void> {
    if (!activeAttemptId.value) return
    await assessmentStore.saveResponse(assessmentId, activeAttemptId.value, itemId, responseValue)
  }

  async function savePageResponses(values: Record<string, number>): Promise<void> {
    if (!activeAttemptId.value) return
    await assessmentStore.bulkSaveResponses(assessmentId, activeAttemptId.value, values)
  }

  function nextPage(): void {
    if (currentPage.value >= totalPages.value - 1) return
    currentPage.value += 1
  }

  function previousPage(): void {
    if (currentPage.value <= 0) return
    currentPage.value -= 1
  }

  function openReview(): void {
    step.value = 'review'
  }

  function backToQuestions(page?: number): void {
    if (typeof page === 'number' && Number.isFinite(page)) {
      currentPage.value = Math.max(0, Math.min(totalPages.value - 1, page))
    }
    step.value = 'questions'
  }

  async function submit(): Promise<void> {
    if (!activeAttemptId.value) {
      throw new Error('No active attempt to submit')
    }

    const { attempt, computation } = await assessmentStore.completeAttempt(
      assessmentId,
      activeAttemptId.value,
      {
        centeredScoringEnabled: centeredResultsEnabled.value,
      },
    )

    currentAttemptId.value = attempt.id
    resultComputation.value = computation
    step.value = 'results'
  }

  async function refreshResults(centeredEnabled: boolean): Promise<void> {
    centeredResultsEnabled.value = centeredEnabled

    if (!definition.supportsCentering || !currentAttemptId.value) return

    resultComputation.value = await assessmentStore.recomputeAttempt(
      assessmentId,
      currentAttemptId.value,
      centeredEnabled,
    )
  }

  return {
    definition,
    step,
    currentPage,
    consentAccepted,
    currentAttemptId,
    attempts,
    inProgressAttempt,
    latestCompletedAttempt,
    retakeStatus,
    responsesMap,
    answeredCount,
    totalCount,
    unansweredCount,
    totalPages,
    pageItems,
    unansweredItems,
    canSubmit,
    centeredResultsEnabled,
    effectiveComputation,
    isInitializing,
    initialize,
    goToIntro,
    goToConsent,
    startNewAttemptAfterConsent,
    resumeAttempt,
    startRetake,
    saveResponse,
    savePageResponses,
    nextPage,
    previousPage,
    openReview,
    backToQuestions,
    submit,
    refreshResults,
  }
}
