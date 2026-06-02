import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentAttempt, AssessmentId } from '@/domain/assessments'
import {
  FOUNDATION_GROUP_MIN_REQUIRED,
  FOUNDATION_ITEMS,
  FOUNDATION_OUTDATED_DAYS,
  computeFoundationGroupProgress,
  computeFoundationStatuses,
  foundationCompletionCount,
  isFoundationBuildUnlocked,
  isFoundationOutdated,
} from '@/services/foundationCompleteness'

const stubs = vi.hoisted(() => ({
  valuesState: { latestDiscovery: null as { createdAt: string } | null },
  valueMapState: { latestMap: null as { createdAt: string } | null },
  lifeAreaState: { latestAssessment: undefined as { createdAt: string } | undefined },
  shadowState: { latestBeliefs: null as { createdAt: string } | null },
  purposeState: { latestPurpose: null as { createdAt: string } | null },
  threePathwaysState: { latestExploration: null as { createdAt: string } | null },
  mountainRangeState: { latestExploration: null as { createdAt: string } | null },
  partsMapState: { latestMap: null as { createdAt: string } | null },
  assessmentState: {
    completed: {} as Record<string, AssessmentAttempt | undefined>,
    active: {} as Record<string, AssessmentAttempt | undefined>,
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
vi.mock('@/stores/threePathways.store', () => ({
  useThreePathwaysStore: () => stubs.threePathwaysState,
}))
vi.mock('@/stores/mountainRange.store', () => ({
  useMountainRangeStore: () => stubs.mountainRangeState,
}))
vi.mock('@/stores/ifsPartsMap.store', () => ({
  useIFSPartsMapStore: () => stubs.partsMapState,
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

/** Mark an assessment completed `days` ago. */
function completeAssessment(id: AssessmentId, days: number): void {
  stubs.assessmentState.completed[id] = buildAttempt({
    assessmentId: id,
    status: 'completed',
    completedAt: isoDaysAgo(days),
  })
}

beforeEach(() => {
  stubs.valuesState.latestDiscovery = null
  stubs.valueMapState.latestMap = null
  stubs.lifeAreaState.latestAssessment = undefined
  stubs.shadowState.latestBeliefs = null
  stubs.purposeState.latestPurpose = null
  stubs.threePathwaysState.latestExploration = null
  stubs.mountainRangeState.latestExploration = null
  stubs.partsMapState.latestMap = null
  stubs.assessmentState.completed = {}
  stubs.assessmentState.active = {}
  stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn(
    (id: AssessmentId) => stubs.assessmentState.completed[id],
  )
  stubs.assessmentState.getActiveAttempt = vi.fn(
    (id: AssessmentId) => stubs.assessmentState.active[id],
  )
})

describe('FOUNDATION_ITEMS', () => {
  it('has 16 items across 6 groups (3 / 3 / 5 / 2 / 1 / 2) with unique ids', () => {
    const groups = FOUNDATION_ITEMS.map((item) => item.group)
    const ids = FOUNDATION_ITEMS.map((item) => item.id)

    expect(FOUNDATION_ITEMS).toHaveLength(16)
    expect(groups.filter((g) => g === 'values')).toHaveLength(3)
    expect(groups.filter((g) => g === 'meaning')).toHaveLength(3)
    expect(groups.filter((g) => g === 'personality')).toHaveLength(5)
    expect(groups.filter((g) => g === 'emotions')).toHaveLength(2)
    expect(groups.filter((g) => g === 'relationships')).toHaveLength(1)
    expect(groups.filter((g) => g === 'lifeBalance')).toHaveLength(2)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries the two Big Five depth variants on the merged slot', () => {
    const bigFive = FOUNDATION_ITEMS.find((item) => item.id === 'bigFive')!
    expect(bigFive.group).toBe('personality')
    expect(bigFive.variants?.map((v) => v.assessmentId)).toEqual([
      'ipip-bfm-50',
      'ipip-neo-120',
    ])
  })
})

describe('computeFoundationStatuses', () => {
  it('returns sixteen not-started statuses when every store is empty', () => {
    const statuses = computeFoundationStatuses(FROZEN_NOW)

    expect(statuses).toHaveLength(16)
    expect(statuses.every((s) => s.state === 'not-started')).toBe(true)
    expect(foundationCompletionCount(statuses)).toBe(0)
    expect(isFoundationOutdated(statuses)).toBe(false)
  })

  it('marks a self-discovery item completed when its latest entry is two days old', () => {
    stubs.threePathwaysState.latestExploration = { createdAt: isoDaysAgo(2) }

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    const target = statuses.find((s) => s.id === 'threePathways')!

    expect(target.state).toBe('completed')
    expect(target.daysSince).toBe(2)
    expect(target.lastCompletedAt).toBe(isoDaysAgo(2))
  })

  it('marks a self-discovery item outdated past the staleness horizon', () => {
    stubs.partsMapState.latestMap = { createdAt: isoDaysAgo(200) }

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(statuses.find((s) => s.id === 'ifsPartsMap')!.state).toBe('outdated')
    expect(isFoundationOutdated(statuses)).toBe(true)
  })

  it('treats exactly 180 days as completed and 181 days as outdated', () => {
    stubs.mountainRangeState.latestExploration = { createdAt: isoDaysAgo(180) }
    let statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(statuses.find((s) => s.id === 'mountainRange')!.state).toBe('completed')

    stubs.mountainRangeState.latestExploration = { createdAt: isoDaysAgo(181) }
    statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(statuses.find((s) => s.id === 'mountainRange')!.state).toBe('outdated')
  })

  it('marks a single-instrument assessment in-progress when only an active attempt exists', () => {
    stubs.assessmentState.active['hexaco-60'] = buildAttempt({
      assessmentId: 'hexaco-60',
      status: 'in-progress',
      completedAt: undefined,
    })

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    const target = statuses.find((s) => s.id === 'hexaco-60')!

    expect(target.state).toBe('in-progress')
    expect(target.lastCompletedAt).toBeUndefined()
  })
})

describe('Big Five merged slot', () => {
  it('is satisfied by the quick variant and points navigation at it', () => {
    completeAssessment('ipip-bfm-50', 5)

    const bigFive = computeFoundationStatuses(FROZEN_NOW).find((s) => s.id === 'bigFive')!

    expect(bigFive.state).toBe('completed')
    expect(bigFive.completedVariantId).toBe('ipip-bfm-50')
    expect(bigFive.routeParams).toEqual({ assessmentId: 'ipip-bfm-50' })
    expect(bigFive.variants).toHaveLength(2)
  })

  it('reports the most recent depth when both are completed', () => {
    completeAssessment('ipip-bfm-50', 90)
    completeAssessment('ipip-neo-120', 10)

    const bigFive = computeFoundationStatuses(FROZEN_NOW).find((s) => s.id === 'bigFive')!

    expect(bigFive.state).toBe('completed')
    expect(bigFive.completedVariantId).toBe('ipip-neo-120')
    expect(bigFive.routeParams).toEqual({ assessmentId: 'ipip-neo-120' })
    expect(bigFive.daysSince).toBe(10)
  })

  it('is in-progress when a depth has an active attempt and none is completed', () => {
    stubs.assessmentState.active['ipip-neo-120'] = buildAttempt({
      assessmentId: 'ipip-neo-120',
      status: 'in-progress',
      completedAt: undefined,
    })

    const bigFive = computeFoundationStatuses(FROZEN_NOW).find((s) => s.id === 'bigFive')!

    expect(bigFive.state).toBe('in-progress')
    expect(bigFive.completedVariantId).toBe('ipip-neo-120')
  })

  it('offers both depths to choose from while not started', () => {
    const bigFive = computeFoundationStatuses(FROZEN_NOW).find((s) => s.id === 'bigFive')!

    expect(bigFive.state).toBe('not-started')
    expect(bigFive.variants?.map((v) => v.assessmentId)).toEqual([
      'ipip-bfm-50',
      'ipip-neo-120',
    ])
  })
})

describe('group coverage + unlock', () => {
  it('counts completed and outdated items per group', () => {
    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(2) } // values
    stubs.partsMapState.latestMap = { createdAt: isoDaysAgo(200) } // personality (outdated)

    const progress = computeFoundationGroupProgress(computeFoundationStatuses(FROZEN_NOW))
    const byGroup = Object.fromEntries(progress.map((g) => [g.group, g]))

    expect(byGroup.values.completed).toBe(1)
    expect(byGroup.values.total).toBe(3)
    expect(byGroup.values.satisfied).toBe(true)
    expect(byGroup.personality.completed).toBe(1) // outdated still counts
    expect(byGroup.meaning.satisfied).toBe(false)
  })

  it('unlocks only when every group has at least one completed item', () => {
    completeAssessment('hexaco-60', 5) // personality
    completeAssessment('erq', 5) // emotions
    completeAssessment('ecr-rs', 5) // relationships

    stubs.valuesState.latestDiscovery = { createdAt: isoDaysAgo(2) } // values
    stubs.mountainRangeState.latestExploration = { createdAt: isoDaysAgo(2) } // meaning

    // Missing lifeBalance → still locked.
    let statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(isFoundationBuildUnlocked(statuses)).toBe(false)

    // Add lifeBalance coverage (Wheel of life) → unlocked.
    stubs.lifeAreaState.latestAssessment = { createdAt: isoDaysAgo(2) }
    statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(isFoundationBuildUnlocked(statuses)).toBe(true)
  })

  it('does NOT unlock from three items all in one group', () => {
    // Three personality items, nothing elsewhere — the old flat floor would
    // have unlocked; coverage must not.
    completeAssessment('hexaco-60', 5)
    completeAssessment('ipip-bfm-50', 5)
    stubs.shadowState.latestBeliefs = { createdAt: isoDaysAgo(2) }

    const statuses = computeFoundationStatuses(FROZEN_NOW)
    expect(foundationCompletionCount(statuses)).toBe(3)
    expect(isFoundationBuildUnlocked(statuses)).toBe(false)
  })
})

describe('constants', () => {
  it('exposes the staleness horizon and per-group minimums', () => {
    expect(FOUNDATION_OUTDATED_DAYS).toBe(180)
    expect(FOUNDATION_GROUP_MIN_REQUIRED).toEqual({
      values: 1,
      meaning: 1,
      personality: 1,
      emotions: 1,
      relationships: 1,
      lifeBalance: 1,
    })
  })
})
