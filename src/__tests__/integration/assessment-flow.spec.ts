import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAssessmentSession } from '@/composables/useAssessmentSession'
import { connectTestDatabase } from '@/test/testDatabase'
import { getUserDatabase } from '@/services/userDatabase.service'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

describe('assessment flow integration', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const db = await connectTestDatabase()
    await db.assessmentAttempts.clear()
    await db.assessmentResponses.clear()

    const preferences = useUserPreferencesStore()
    preferences.$patch({ locale: 'en', isLoaded: true })
  })

  it('runs intro -> consent -> questions -> review -> submit and supports retake deltas', async () => {
    const session = useAssessmentSession('ipip-bfm-50')

    await session.initialize()
    expect(session.step.value).toBe('intro')

    session.goToConsent()
    session.consentAccepted.value = true
    await session.startNewAttemptAfterConsent()

    expect(session.step.value).toBe('questions')

    const firstScaleItems = session.definition.scales[0].itemIds.slice(0, 8)
    for (const itemId of firstScaleItems) {
      await session.saveResponse(itemId, 2)
    }

    session.openReview()
    expect(session.step.value).toBe('review')

    await session.submit()
    expect(session.step.value).toBe('results')

    const firstAttempt = session.latestCompletedAttempt.value
    if (!firstAttempt) {
      throw new Error('Expected first completed attempt to exist')
    }
    expect(firstAttempt?.status).toBe('completed')
    expect(session.retakeStatus.value.canRetake).toBe(false)

    await getUserDatabase().assessmentAttempts.update(firstAttempt.id, {
      retakeEligibleAt: '2020-01-01T00:00:00.000Z',
    })

    await session.initialize()
    expect(session.retakeStatus.value.canRetake).toBe(true)

    await session.startRetake()
    expect(session.step.value).toBe('questions')

    for (const itemId of firstScaleItems) {
      await session.saveResponse(itemId, 4)
    }

    session.openReview()
    await session.submit()

    const secondComputation = session.effectiveComputation.value
    const extraversion = secondComputation?.computedScales.find(
      (scale) => scale.scaleId === session.definition.scales[0].id,
    )

    expect(extraversion?.deltaFromPrevious).toBeDefined()

    const db = getUserDatabase()
    const attempts = await db.assessmentAttempts.where('assessmentId').equals('ipip-bfm-50').toArray()
    const completedAttempts = attempts.filter((attempt) => attempt.status === 'completed')

    expect(completedAttempts).toHaveLength(2)

    const latestAttempt = completedAttempts.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
    const responsesCount = await db.assessmentResponses.where('attemptId').equals(latestAttempt.id).count()

    expect(responsesCount).toBe(8)
  })
})
