import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAssessmentStore } from '@/stores/assessment.store'
import { connectTestDatabase } from '@/test/testDatabase'
import { getAssessmentDefinition } from '@/services/assessments/registry'
import { getUserDatabase } from '@/services/userDatabase.service'

describe('assessment.store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    const db = await connectTestDatabase()
    await db.assessmentAttempts.clear()
    await db.assessmentResponses.clear()
  })

  it('starts an attempt and persists response updates', async () => {
    const store = useAssessmentStore()

    const attempt = await store.startAttempt('ipip-bfm-50', 'en')
    await store.saveResponse('ipip-bfm-50', attempt.id, 'bfm50_001', 4)

    const responseMap = store.getResponseMapByAttempt(attempt.id)
    const activeAttempt = store.getActiveAttempt('ipip-bfm-50')

    expect(responseMap.bfm50_001).toBe(4)
    expect(activeAttempt?.responseCount).toBe(1)
  })

  it('completes attempt with computation and persistence metadata', async () => {
    const store = useAssessmentStore()
    const definition = getAssessmentDefinition('ipip-bfm-50')

    const attempt = await store.startAttempt('ipip-bfm-50', 'en')

    const extraversionItems = definition.scales.find((scale) => scale.id === 'extraversion')?.itemIds ?? []
    for (const itemId of extraversionItems.slice(0, 8)) {
      await store.saveResponse('ipip-bfm-50', attempt.id, itemId, 3)
    }

    const result = await store.completeAttempt('ipip-bfm-50', attempt.id)

    expect(result.attempt.status).toBe('completed')
    expect(result.attempt.completedAt).toBeDefined()
    expect(result.attempt.retakeEligibleAt).toBeDefined()
    expect(result.computation.computedScales.length).toBe(5)
    expect(result.attempt.scoringComputationMetadata?.scoringTimestamp).toBeDefined()
  })

  it('updates retake eligibility state at and after threshold', async () => {
    const store = useAssessmentStore()
    const definition = getAssessmentDefinition('ipip-bfm-50')

    const attempt = await store.startAttempt('ipip-bfm-50', 'en')

    const extraversionItems = definition.scales.find((scale) => scale.id === 'extraversion')?.itemIds ?? []
    for (const itemId of extraversionItems.slice(0, 8)) {
      await store.saveResponse('ipip-bfm-50', attempt.id, itemId, 3)
    }

    const completed = await store.completeAttempt('ipip-bfm-50', attempt.id)

    await store.loadAttempts('ipip-bfm-50')
    expect(store.getRetakeStatus('ipip-bfm-50').canRetake).toBe(false)

    await getUserDatabase().assessmentAttempts.update(completed.attempt.id, {
      retakeEligibleAt: '2020-01-01T00:00:00.000Z',
    })

    await store.loadAttempts('ipip-bfm-50')
    const retakeStatus = store.getRetakeStatus('ipip-bfm-50')

    expect(retakeStatus.canRetake).toBe(true)
    expect(retakeStatus.retakeEligibleAt).toBe('2020-01-01T00:00:00.000Z')
  })
})
