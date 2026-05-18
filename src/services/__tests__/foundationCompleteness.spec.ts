import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentAttempt, AssessmentId } from '@/domain/assessments'
import {
  FOUNDATION_BUILD_FLOOR,
  FOUNDATION_ITEMS,
  FOUNDATION_OUTDATED_DAYS,
  computeFoundationStatuses,
  foundationCompletionCount,
  isFoundationOutdated,
} from '@/services/foundationCompleteness'

const stubs = vi.hoisted(() => ({
  valuesState: { latestDiscovery: null as { createdAt: string } | null },
  valueMapState: { latestMap: null as { createdAt: string } | null },
  lifeAreaState: { latestAssessment: undefined as { createdAt: string } | undefined },
  shadowState: { latestBeliefs: null as { createdAt: string } | null },
  purposeState: { latestPurpose: null as { createdAt: string } | null },
  assessmentState: {
    getLatestCompletedAttemptFromState: vi.fn(),
    getActiveAttempt: vi.fn(),
  },
}))

vi.mock('@/stores/valuesDiscovery.store', () => ({
  useValuesDiscoveryStore: () => stubs.valuesState,
}))
vi.mock('@/stores/valueMap.store', () => ({
  useValueMapStore: () => stubs.valueMapState,
}))
vi.mock('@/stores/lifeAreaAssessment.store', () => ({
  useLifeAreaAssessmentStore: () => stubs.lifeAreaState,
}))
vi.mock('@/stores/shadowBeliefs.store', () => ({
  useShadowBeliefsStore: () => stubs.shadowState,
}))
vi.mock('@/stores/transformativePurpose.store', () => ({
  useTransformativePurposeStore: () => stubs.purposeState,
}))
vi.mock('@/stores/assessment.store', () => ({
  useAssessmentStore: () => stubs.assessmentState,
}))

const FROZEN_NOW = new Date('2026-05-09T12:00:00Z')

function isoDaysAgo(days: number, base: Date = FROZEN_NOW): string {
  return new Date(base.getTime() - days * 86_400_000).toISOString()
}

function buildAttempt(overrides: Partial<AssessmentAttempt>): AssessmentAttempt {
  return {
    id: 'attempt-1',
    assessmentId: 'ipip-bfm-50',
    instrumentVersion: 'v1',
    language: 'en',
    startedAt: isoDaysAgo(0),
    status: 'completed',
    scoringKeyVersion: 'v1',
    missingDataPolicyVersion: 'v1',
    responseCount: 50,
    totalItems: 50,
    createdAt: isoDaysAgo(0),
    updatedAt: isoDaysAgo(0),
    ...overrides,
  }
}

beforeEach(() => {
  stubs.valuesState.latestDiscovery = null
  stubs.valueMapState.latestMap = null
  stubs.lifeAreaState.latestAssessment = undefined
  stubs.shadowState.latestBeliefs = null
  stubs.purposeState.latestPurpose = null
  stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn(
    (_id: AssessmentId): AssessmentAttempt | undefined => undefined,
  )
  stubs.assessmentState.getActiveAttempt = vi.fn(
    (_id: AssessmentId): AssessmentAttempt | undefined => undefined,
  )
})

describe('computeFoundationStatuses', () => {
  it('returns ten not-started statuses when every store is empty', () => {
    const statuses = computeFoundationStatuses(FROZEN_NOW)

    expect(statuses).toHaveLength(10)
    expect(statuses.every((s) => s.state === 'not-started')).toBe(true)
    expect(foundationCompletionCount(statuses)).toBe(0)
    expect(isFoundationOutdated(statuses)).toBe(false)
  })

  it('marks valuesDiscovery as completed when its latest entry is two days old', () => {
    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(2) }

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    const values = statuses.find((s) => s.id === 'valuesDiscovery')!
    const others = statuses.filter((s) => s.id !== 'valuesDiscovery')

    expect(values.state).toBe('completed')
    expect(values.daysSince).toBe(2)
    expect(values.lastCompletedAt).toBe(isoDaysAgo(2))
    expect(others.every((s) => s.state === 'not-started')).toBe(true)
  })

  it('marks valuesDiscovery as outdated when its latest entry is 200 days old', () => {
    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(200) }

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    const values = statuses.find((s) => s.id === 'valuesDiscovery')!

    expect(values.state).toBe('outdated')
    expect(values.daysSince).toBe(200)
    expect(isFoundationOutdated(statuses)).toBe(true)
  })

  it('marks an assessment as in-progress when an active attempt exists with no completed attempt', () => {
    stubs.assessmentState.getActiveAttempt = vi.fn((id: AssessmentId) =>
      id === 'ipip-bfm-50' ? buildAttempt({ status: 'in-progress', completedAt: undefined }) : undefined,
    )

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    const target = statuses.find((s) => s.id === 'ipip-bfm-50')!
    const otherAssessments = statuses.filter(
      (s) => s.routeName === 'exercise-assessment' && s.id !== 'ipip-bfm-50',
    )

    expect(target.state).toBe('in-progress')
    expect(target.lastCompletedAt).toBeUndefined()
    expect(target.daysSince).toBeUndefined()
    expect(otherAssessments.every((s) => s.state === 'not-started')).toBe(true)
  })

  it('prefers a completed (outdated) state over an in-progress attempt for the same assessment', () => {
    const completedAt = isoDaysAgo(200)
    stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn((id: AssessmentId) =>
      id === 'ipip-bfm-50' ? buildAttempt({ status: 'completed', completedAt }) : undefined,
    )
    stubs.assessmentState.getActiveAttempt = vi.fn((id: AssessmentId) =>
      id === 'ipip-bfm-50'
        ? buildAttempt({ id: 'attempt-2', status: 'in-progress', completedAt: undefined })
        : undefined,
    )

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    const target = statuses.find((s) => s.id === 'ipip-bfm-50')!

    expect(target.state).toBe('outdated')
    expect(target.lastCompletedAt).toBe(completedAt)
    expect(target.daysSince).toBe(200)
  })

  it('treats exactly 180 days as completed and 181 days as outdated', () => {
    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(180) }
    let statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(statuses.find((s) => s.id === 'valuesDiscovery')!.state).toBe('completed')

    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(181) }
    statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(statuses.find((s) => s.id === 'valuesDiscovery')!.state).toBe('outdated')
  })

  it('foundationCompletionCount counts both completed and outdated entries', () => {
    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(2) }
    stubs.shadowState.latestBeliefs = { createdAt: isoDaysAgo(200) }
    stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn((id: AssessmentId) =>
      id === 'pvq-40' ? buildAttempt({ status: 'completed', completedAt: isoDaysAgo(10) }) : undefined,
    )

    const statuses = computeFoundationStatuses(FROZEN_NOW)

    expect(foundationCompletionCount(statuses)).toBe(3)
    expect(isFoundationOutdated(statuses)).toBe(true)
  })

  it('FOUNDATION_ITEMS contains 4 values, 4 personality, 2 lifeBalance entries with unique ids', () => {
    const groups = FOUNDATION_ITEMS.map((item) => item.group)
    const ids = FOUNDATION_ITEMS.map((item) => item.id)

    expect(FOUNDATION_ITEMS).toHaveLength(10)
    expect(groups.filter((g) => g === 'values')).toHaveLength(4)
    expect(groups.filter((g) => g === 'personality')).toHaveLength(4)
    expect(groups.filter((g) => g === 'lifeBalance')).toHaveLength(2)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('exposes the documented constants', () => {
    expect(FOUNDATION_OUTDATED_DAYS).toBe(180)
    expect(FOUNDATION_BUILD_FLOOR).toBe(3)
  })
})
