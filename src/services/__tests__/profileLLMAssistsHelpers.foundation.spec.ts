import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ShadowBeliefs,
  TransformativePurpose,
  ValueMap,
  ValuesDiscovery,
} from '@/domain/exercises'
import type { LifeAreaAssessment } from '@/domain/lifeAreaAssessment'
import type {
  AssessmentAttempt,
  AssessmentId,
  ScaleScore,
} from '@/domain/assessments'

const stubs = vi.hoisted(() => ({
  valuesState: { latestDiscovery: null as ValuesDiscovery | null },
  valueMapState: { latestMap: null as ValueMap | null },
  lifeAreaState: { latestAssessment: undefined as LifeAreaAssessment | undefined },
  shadowState: { latestBeliefs: null as ShadowBeliefs | null },
  purposeState: { latestPurpose: null as TransformativePurpose | null },
  assessmentState: {
    getLatestCompletedAttemptFromState: vi.fn(),
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

import {
  __test__,
  buildFoundationSnapshot,
} from '../profileLLMAssistsHelpers'

beforeEach(() => {
  stubs.valuesState.latestDiscovery = null
  stubs.valueMapState.latestMap = null
  stubs.lifeAreaState.latestAssessment = undefined
  stubs.shadowState.latestBeliefs = null
  stubs.purposeState.latestPurpose = null
  stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn(
    (_id: AssessmentId): AssessmentAttempt | undefined => undefined,
  )
})

function makeAttempt(overrides: Partial<AssessmentAttempt>): AssessmentAttempt {
  return {
    id: 'attempt-1',
    assessmentId: 'ipip-bfm-50',
    instrumentVersion: 'v1',
    language: 'en',
    startedAt: '2026-04-20T10:00:00.000Z',
    completedAt: '2026-04-20T11:00:00.000Z',
    status: 'completed',
    scoringKeyVersion: 'v1',
    missingDataPolicyVersion: 'v1',
    responseCount: 50,
    totalItems: 50,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T11:00:00.000Z',
    ...overrides,
  }
}

function scale(overrides: Partial<ScaleScore> & Pick<ScaleScore, 'scaleId' | 'labelKey'>): ScaleScore {
  return {
    answeredCount: 10,
    itemCount: 10,
    rawMean: 3,
    normalizedMean: 3,
    band: 'medium',
    ...overrides,
  }
}

describe('buildFoundationSnapshot', () => {
  it('returns empty snapshot when every store is empty', async () => {
    const result = await buildFoundationSnapshot()
    expect(result).toEqual({ items: [], snapshot: '' })
  })

  it('formats only the populated tiles when a single store has data', async () => {
    stubs.valuesState.latestDiscovery = {
      id: 'vd-1',
      createdAt: '2026-04-12T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z',
      admirablePeople: [
        { name: 'Frankl', qualities: ['meaning', 'resilience'] },
        { name: 'Marie Curie', qualities: ['curiosity'] },
      ],
      coreValues: ['integrity', 'curiosity', 'care'],
      notes: 'Saw a pattern around endurance.',
    }

    const result = await buildFoundationSnapshot()
    expect(result.items).toHaveLength(1)
    const [item] = result.items
    expect(item.id).toBe('valuesDiscovery')
    expect(item.body.startsWith('## Values discovery (2026-04-12)')).toBe(true)
    expect(item.body).toContain('Frankl (meaning, resilience)')
    expect(item.body).toContain('Marie Curie (curiosity)')
    expect(item.body).toContain('Core values: integrity, curiosity, care')
    expect(item.body).toContain('Notes: Saw a pattern around endurance.')
    expect(result.snapshot).toBe(item.body)
  })

  it('renders ValueMap with ranked values, conflicts, and life-area assignments', async () => {
    stubs.valueMapState.latestMap = {
      id: 'vm-1',
      createdAt: '2026-05-08T12:00:00.000Z',
      updatedAt: '2026-05-08T12:00:00.000Z',
      catalogVersion: '2026-05',
      sort: {},
      customValues: [],
      rankedValues: [
        { valueId: 'honesty', rank: 1, personalMeaning: 'I refuse to soften the truth.' },
        { valueId: 'creativity', rank: 2, personalMeaning: 'Making new forms.' },
        { valueId: 'belonging', rank: 3 },
      ],
      coreValues: ['Honesty', 'Creativity', 'Belonging'],
      globalConflicts: [
        { valueId: 'honesty', conflictingValueId: 'belonging', note: 'Hard tradeoff.' },
      ],
      lifeAreaAssignments: [
        { lifeAreaId: 'career', valueIds: ['creativity', 'honesty'] },
        { lifeAreaId: 'family', valueIds: ['belonging'] },
      ],
    }

    const result = await buildFoundationSnapshot()
    const [item] = result.items
    expect(item.id).toBe('valueMap')
    expect(item.body).toContain('## Value map (2026-05-08)')
    expect(item.body).toContain('Top values (ranked):')
    expect(item.body).toMatch(/1\. Honesty - "I refuse to soften the truth\."/)
    expect(item.body).toMatch(/2\. Creativity - "Making new forms\."/)
    expect(item.body).toMatch(/3\. Belonging\b/)
    expect(item.body).not.toMatch(/3\. Belonging - ""/)
    expect(item.body).toContain('Conflicts:')
    expect(item.body).toContain('Honesty vs Belonging - "Hard tradeoff."')
    expect(item.body).toContain('Life-area assignments:')
    expect(item.body).toContain('career -> [Creativity, Honesty]')
    expect(item.body).toContain('family -> [Belonging]')
  })

  it('falls back to customValues label, then raw id, when valueId is missing from the catalog', async () => {
    stubs.valueMapState.latestMap = {
      id: 'vm-2',
      createdAt: '2026-05-08T12:00:00.000Z',
      updatedAt: '2026-05-08T12:00:00.000Z',
      catalogVersion: '2026-05',
      sort: {},
      customValues: [{ id: 'mentorship', label: 'Mentorship' }],
      rankedValues: [
        { valueId: 'mentorship', rank: 1 },
        { valueId: 'unknown-id', rank: 2 },
      ],
      coreValues: [],
      globalConflicts: [],
      lifeAreaAssignments: [],
    }

    const result = await buildFoundationSnapshot()
    const [item] = result.items
    expect(item.body).toContain('1. Mentorship')
    expect(item.body).toContain('2. unknown-id')
  })

  it('renders WheelOfLife items with snapshotted names and an Overall notes trailer', async () => {
    stubs.lifeAreaState.latestAssessment = {
      id: 'wol-1',
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
      scope: 'full',
      lifeAreaIds: ['health', 'career', 'family', 'finances', 'growth'],
      items: [
        { lifeAreaId: 'health', lifeAreaNameSnapshot: 'Health', score: 7 },
        { lifeAreaId: 'career', lifeAreaNameSnapshot: 'Career', score: 8, note: 'Big project' },
        { lifeAreaId: 'family', lifeAreaNameSnapshot: 'Family', score: 6 },
        { lifeAreaId: 'finances', lifeAreaNameSnapshot: 'Finances', score: 4 },
        { lifeAreaId: 'growth', lifeAreaNameSnapshot: 'Growth', score: 9 },
      ],
      notes: 'Overall trending up.',
    }

    const result = await buildFoundationSnapshot()
    const [item] = result.items
    expect(item.body).toContain('## Wheel of life (2026-04-30)')
    expect(item.body).toContain('Health: 7/10')
    expect(item.body).toContain('Career: 8/10 - "Big project"')
    expect(item.body).toContain('Family: 6/10')
    expect(item.body).toContain('Finances: 4/10')
    expect(item.body).toContain('Growth: 9/10')
    expect(item.body).toContain('Overall notes: Overall trending up.')
  })

  it('renders an IPIP-BFM-50 attempt preserving scale order and resolving labels via messages.en', async () => {
    const attempt = makeAttempt({
      assessmentId: 'ipip-bfm-50',
      completedAt: '2026-04-20T11:00:00.000Z',
      computedScales: [
        scale({ scaleId: 'extraversion', labelKey: 'assessments.ipipBfm50.scales.extraversion', rawMean: 3.4, normalizedMean: 3.4, band: 'medium' }),
        scale({ scaleId: 'agreeableness', labelKey: 'assessments.ipipBfm50.scales.agreeableness', rawMean: 4.1, normalizedMean: 4.1, band: 'high' }),
        scale({ scaleId: 'conscientiousness', labelKey: 'assessments.ipipBfm50.scales.conscientiousness', rawMean: 3.0, normalizedMean: 3.0, band: 'medium' }),
        scale({ scaleId: 'neuroticism', labelKey: 'assessments.ipipBfm50.scales.neuroticism', rawMean: 2.7, normalizedMean: 2.7, band: 'low' }),
        scale({ scaleId: 'openness', labelKey: 'assessments.ipipBfm50.scales.openness', rawMean: 4.5, normalizedMean: 4.5, band: 'high' }),
      ],
    })
    stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn((id: AssessmentId) =>
      id === 'ipip-bfm-50' ? attempt : undefined,
    )

    const result = await buildFoundationSnapshot()
    expect(result.items).toHaveLength(1)
    const body = result.items[0].body
    expect(body.startsWith('## Personality (IPIP-BFM-50) (2026-04-20)')).toBe(true)

    const lines = body.split('\n').slice(1)
    expect(lines[0]).toBe('Extraversion: 3.4 (medium)')
    expect(lines[1]).toBe('Agreeableness: 4.1 (high)')
    expect(lines[2]).toBe('Conscientiousness: 3 (medium)')
    expect(lines[3]).toBe('Neuroticism: 2.7 (low)')
    expect(lines[4]).toBe('Openness: 4.5 (high)')
  })

  it('falls back to the last segment of the labelKey when the i18n path is unknown', () => {
    expect(__test__.resolveScaleLabel('assessments.unknown.scales.someScale')).toBe('SomeScale')
    expect(__test__.resolveScaleLabel('totally.bogus')).toBe('Bogus')
  })

  it('renders PVQ-40 with Top 3 from overallSummary, computed Bottom 3, and an All block', async () => {
    const computedScales: ScaleScore[] = [
      scale({ scaleId: 'selfDirection', labelKey: 'assessments.pvq40.scales.selfDirection', rawMean: 4.5, normalizedMean: 1.5 }),
      scale({ scaleId: 'stimulation', labelKey: 'assessments.pvq40.scales.stimulation', rawMean: 4.0, normalizedMean: 1.0 }),
      scale({ scaleId: 'hedonism', labelKey: 'assessments.pvq40.scales.hedonism', rawMean: 3.5, normalizedMean: 0.5 }),
      scale({ scaleId: 'achievement', labelKey: 'assessments.pvq40.scales.achievement', rawMean: 3.2, normalizedMean: 0.2 }),
      scale({ scaleId: 'power', labelKey: 'assessments.pvq40.scales.power', rawMean: 2.5, normalizedMean: -0.5 }),
      scale({ scaleId: 'security', labelKey: 'assessments.pvq40.scales.security', rawMean: 3.0, normalizedMean: 0 }),
      scale({ scaleId: 'conformity', labelKey: 'assessments.pvq40.scales.conformity', rawMean: 2.0, normalizedMean: -1.0 }),
      scale({ scaleId: 'tradition', labelKey: 'assessments.pvq40.scales.tradition', rawMean: 1.8, normalizedMean: -1.2 }),
      scale({ scaleId: 'benevolence', labelKey: 'assessments.pvq40.scales.benevolence', rawMean: 4.2, normalizedMean: 1.2 }),
      scale({ scaleId: 'universalism', labelKey: 'assessments.pvq40.scales.universalism', rawMean: 4.4, normalizedMean: 1.4 }),
    ]
    const attempt = makeAttempt({
      assessmentId: 'pvq-40',
      completedAt: '2026-04-22T10:00:00.000Z',
      computedScales,
      overallSummary: {
        completedScaleCount: 10,
        totalScaleCount: 10,
        meanOfMeans: 3.3,
        topValues: [
          { scaleId: 'selfDirection', value: 1.5 },
          { scaleId: 'universalism', value: 1.4 },
          { scaleId: 'benevolence', value: 1.2 },
        ],
      },
    })
    stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn((id: AssessmentId) =>
      id === 'pvq-40' ? attempt : undefined,
    )

    const result = await buildFoundationSnapshot()
    const body = result.items[0].body
    expect(body.startsWith('## Schwartz values (PVQ-40) (2026-04-22)')).toBe(true)
    expect(body).toContain('Top 3: Self-Direction, Universalism, Benevolence')
    expect(body).toContain('Bottom 3: Tradition, Conformity, Power')
    expect(body).toContain('All:')
    expect(body).toContain('Self-Direction: 1.5')
    expect(body).toContain('Tradition: -1.2')
  })

  it('renders VLQ scales sorted by gap descending using details from the scoring engine', async () => {
    const computedScales: ScaleScore[] = [
      scale({ scaleId: 'family', labelKey: 'assessments.vlq.scales.family', rawMean: 7, normalizedMean: 7, details: { importance: 9, consistency: 7, gap: 2, weighted: 63 } }),
      scale({ scaleId: 'work', labelKey: 'assessments.vlq.scales.work', rawMean: 5, normalizedMean: 5, details: { importance: 9, consistency: 5, gap: 4, weighted: 45 } }),
      scale({ scaleId: 'health', labelKey: 'assessments.vlq.scales.health', rawMean: 4, normalizedMean: 4, details: { importance: 10, consistency: 4, gap: 6, weighted: 40 } }),
      scale({ scaleId: 'recreation', labelKey: 'assessments.vlq.scales.recreation', rawMean: 8, normalizedMean: 8, details: { importance: 9, consistency: 8, gap: 1, weighted: 72 } }),
    ]
    const attempt = makeAttempt({
      assessmentId: 'vlq',
      completedAt: '2026-04-25T10:00:00.000Z',
      computedScales,
    })
    stubs.assessmentState.getLatestCompletedAttemptFromState = vi.fn((id: AssessmentId) =>
      id === 'vlq' ? attempt : undefined,
    )

    const result = await buildFoundationSnapshot()
    const body = result.items[0].body
    expect(body.startsWith('## Valued living (VLQ) (2026-04-25)')).toBe(true)
    const lines = body.split('\n').slice(1)
    expect(lines[0]).toBe('Health / Self-Care: importance 10, consistency 4 (gap: 6)')
    expect(lines[1]).toBe('Work: importance 9, consistency 5 (gap: 4)')
    expect(lines[2]).toBe('Family: importance 9, consistency 7 (gap: 2)')
    expect(lines[3]).toBe('Recreation: importance 9, consistency 8 (gap: 1)')
  })

  it('sorts multiple items by completedAt ascending and joins bodies with blank lines', async () => {
    stubs.lifeAreaState.latestAssessment = {
      id: 'wol-2',
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T08:00:00.000Z',
      scope: 'partial',
      lifeAreaIds: ['health'],
      items: [{ lifeAreaId: 'health', lifeAreaNameSnapshot: 'Health', score: 7 }],
    }
    stubs.valuesState.latestDiscovery = {
      id: 'vd-2',
      createdAt: '2026-04-12T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z',
      admirablePeople: [{ name: 'Frankl', qualities: ['meaning'] }],
      coreValues: ['integrity'],
    }

    const result = await buildFoundationSnapshot()
    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe('valuesDiscovery')
    expect(result.items[1].id).toBe('wheelOfLife')
    expect(result.snapshot.startsWith('## Values discovery')).toBe(true)
    expect(result.snapshot).toBe(result.items.map((it) => it.body).join('\n\n'))
  })

  it('produces English-only labels regardless of catalog locale presence', async () => {
    stubs.valueMapState.latestMap = {
      id: 'vm-3',
      createdAt: '2026-05-08T12:00:00.000Z',
      updatedAt: '2026-05-08T12:00:00.000Z',
      catalogVersion: '2026-05',
      sort: {},
      customValues: [],
      rankedValues: [
        { valueId: 'acceptance', rank: 1 },
        { valueId: 'curiosity', rank: 2 },
      ],
      coreValues: [],
      globalConflicts: [],
      lifeAreaAssignments: [],
    }

    const result = await buildFoundationSnapshot()
    const body = result.items[0].body
    expect(body).toContain('1. Acceptance')
    expect(body).toContain('2. Curiosity')
    expect(body).not.toContain('Akceptacja')
    expect(body).not.toContain('Ciekawość')
  })
})

describe('per-formatter unit coverage', () => {
  it('formatShadowBeliefs renders self-sabotaging, reframes, advice, notes — omitting empty sections', () => {
    const item = __test__.formatShadowBeliefs({
      id: 'sb-1',
      createdAt: '2026-04-15T10:00:00.000Z',
      updatedAt: '2026-04-15T10:00:00.000Z',
      selfSabotagingBeliefs: ["I don't deserve rest."],
      adviceToOthers: [],
      reframedBeliefs: ['Rest is part of the work.'],
      notes: 'Came up after a long week.',
    })
    expect(item.body.startsWith('## Shadow beliefs (2026-04-15)')).toBe(true)
    expect(item.body).toContain('Self-sabotaging:\n- I don\'t deserve rest.')
    expect(item.body).toContain('Reframes:\n- Rest is part of the work.')
    expect(item.body).not.toContain('Advice to others:')
    expect(item.body).toContain('Notes: Came up after a long week.')
  })

  it('formatTransformativePurpose renders dashes for missing optional fields', () => {
    const item = __test__.formatTransformativePurpose({
      id: 'tp-1',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
      curiosities: ['systems', 'meditation'],
      problems: ['burnout', 'isolation'],
    })
    expect(item.body).toContain('Statement: -')
    expect(item.body).toContain('Intersection: -')
    expect(item.body).toContain('Curiosities: systems, meditation')
    expect(item.body).toContain('Problems I am drawn to: burnout, isolation')
  })

  it('resolveValueLabel falls back through catalog → customValues → raw id', () => {
    expect(__test__.resolveValueLabel('curiosity')).toBe('Curiosity')
    expect(
      __test__.resolveValueLabel('mentorship', [{ id: 'mentorship', label: 'Mentorship' }]),
    ).toBe('Mentorship')
    expect(__test__.resolveValueLabel('nope-nothing-matches')).toBe('nope-nothing-matches')
  })
})
