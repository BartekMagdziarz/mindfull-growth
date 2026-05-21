import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildPlanningSnapshot,
  extractMonthlyRatings,
  extractWeeklyRatings,
  summariseExerciseSession,
} from '../profileLLMAssistsHelpers'
import type { ExerciseSessionBundle } from '../reflectionDataQueries'
import type { MonthlyReflection, WeeklyReflection } from '@/domain/reflection'
import type { MonthRef, WeekRef } from '@/domain/period'

// Mock the planning repositories used by buildPlanningSnapshot — they read
// from IndexedDB, which isn't available in the node test environment.
vi.mock('@/repositories/goalDexieRepository', () => ({
  goalDexieRepository: { listAll: vi.fn() },
}))
vi.mock('@/repositories/keyResultDexieRepository', () => ({
  keyResultDexieRepository: { listAll: vi.fn() },
}))
vi.mock('@/repositories/habitDexieRepository', () => ({
  habitDexieRepository: { listAll: vi.fn() },
}))
vi.mock('@/repositories/trackerDexieRepository', () => ({
  trackerDexieRepository: { listAll: vi.fn() },
}))
vi.mock('@/repositories/priorityDexieRepository', () => ({
  priorityDexieRepository: { listAll: vi.fn() },
}))
vi.mock('@/repositories/planningStateDexieRepository', () => ({
  planningStateDexieRepository: { listDailyMeasurementEntriesForDayRange: vi.fn() },
}))

import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'

function makeBundle(overrides: Partial<ExerciseSessionBundle>): ExerciseSessionBundle {
  return {
    id: 'bundle-id',
    type: 'thoughtRecord',
    createdAt: '2026-04-12T09:00:00.000Z',
    raw: {},
    ...overrides,
  }
}

describe('summariseExerciseSession', () => {
  it('prefixes the type and date-only portion of createdAt', () => {
    const summary = summariseExerciseSession(
      makeBundle({ raw: { situation: 'Tough morning.' } }),
    )
    expect(summary.startsWith('thoughtRecord on 2026-04-12.')).toBe(true)
  })

  it('picks the first meaningful field by the priority order', () => {
    // `situation` wins over `hotThought` which would otherwise match.
    const summary = summariseExerciseSession(
      makeBundle({
        raw: {
          situation: 'Presentation at 10am.',
          hotThought: 'I will fail.',
        },
      }),
    )
    expect(summary).toContain('Presentation at 10am.')
    expect(summary).not.toContain('I will fail.')
  })

  it('falls back to freeformReflection when earlier keys are missing', () => {
    const summary = summariseExerciseSession(
      makeBundle({
        raw: { freeformReflection: 'Felt calmer after the walk.' },
      }),
    )
    expect(summary).toContain('Felt calmer after the walk.')
  })

  it('returns the placeholder when no meaningful field is present', () => {
    const summary = summariseExerciseSession(
      makeBundle({
        raw: { randomField: 'ignored', numberField: 42 },
      }),
    )
    expect(summary).toContain('(no free-text details recorded)')
  })

  it('ignores empty-string values and whitespace-only fields', () => {
    const summary = summariseExerciseSession(
      makeBundle({
        raw: {
          situation: '   ',
          hotThought: '',
          reflection: 'Something worth quoting.',
        },
      }),
    )
    expect(summary).toContain('Something worth quoting.')
  })

  it('handles createdAt that is already date-only', () => {
    const summary = summariseExerciseSession(
      makeBundle({ createdAt: '2026-04-12', raw: { note: 'Hello.' } }),
    )
    expect(summary).toContain('2026-04-12')
  })
})

describe('extractWeeklyRatings', () => {
  it('projects all twelve weekly rating keys, null-preserving', () => {
    const reflection: WeeklyReflection = {
      id: 'w1',
      createdAt: '2026-04-12T00:00:00.000Z',
      updatedAt: '2026-04-12T00:00:00.000Z',
      weekRef: '2026-W15' as WeekRef,
      physicalIntensityRating: 3,
      taskLoadRating: null,
      emotionalIntensityRating: 2,
      socialIntensityRating: 4,
      moodRating: 5,
      energyRating: null,
      calmRating: 3,
      connectionRating: 4,
      productivityRating: 3,
      engagementRating: 2,
      emotionalRegulationRating: null,
      selfCareRating: 3,
      promptResponses: {},
      freeformReflection: '',
      aiSummary: '',
    }

    const result = extractWeeklyRatings(reflection)
    expect(result).toEqual({
      physicalIntensityRating: 3,
      taskLoadRating: null,
      emotionalIntensityRating: 2,
      socialIntensityRating: 4,
      moodRating: 5,
      energyRating: null,
      calmRating: 3,
      connectionRating: 4,
      productivityRating: 3,
      engagementRating: 2,
      emotionalRegulationRating: null,
      selfCareRating: 3,
    })
  })
})

describe('extractMonthlyRatings', () => {
  it('projects all five monthly rating keys, null-preserving', () => {
    const reflection: MonthlyReflection = {
      id: 'm1',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      monthRef: '2026-04' as MonthRef,
      balanceRating: 4,
      purposeRating: null,
      growthRating: 3,
      coherenceRating: 5,
      agencyRating: null,
      promptResponses: {},
      freeformReflection: '',
      aiSummary: '',
    }

    const result = extractMonthlyRatings(reflection)
    expect(result).toEqual({
      balanceRating: 4,
      purposeRating: null,
      growthRating: 3,
      coherenceRating: 5,
      agencyRating: null,
    })
  })
})

describe('buildPlanningSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(planningStateDexieRepository.listDailyMeasurementEntriesForDayRange).mockResolvedValue([])
  })

  it('returns empty arrays and empty snapshot when repositories return nothing', async () => {
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(keyResultDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])

    const snapshot = await buildPlanningSnapshot()

    expect(snapshot.activeGoals).toEqual([])
    expect(snapshot.activeKeyResults).toEqual([])
    expect(snapshot.activeHabits).toEqual([])
    expect(snapshot.activeTrackers).toEqual([])
    expect(snapshot.snapshot).toBe('')
  })

  it('filters by "open" status and excludes isActive === false for habits and trackers', async () => {
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([
      { id: 'g1', title: 'Ship MVP', status: 'open' } as never,
      { id: 'g2', title: 'Archived', status: 'archived' } as never,
    ])
    vi.mocked(keyResultDexieRepository.listAll).mockResolvedValue([
      { id: 'kr1', title: '10 users onboarded', status: 'open', goalId: 'g1' } as never,
      { id: 'kr2', title: 'Old KR', status: 'completed', goalId: 'g1' } as never,
    ])
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([
      { id: 'h1', title: 'Morning walk', status: 'open', isActive: true } as never,
      { id: 'h2', title: 'Paused habit', status: 'open', isActive: false } as never,
      { id: 'h3', title: 'Closed habit', status: 'closed', isActive: true } as never,
    ])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([
      { id: 't1', title: 'Weight', status: 'open', isActive: true } as never,
      { id: 't2', title: 'Hidden tracker', status: 'open', isActive: false } as never,
    ])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])

    const snapshot = await buildPlanningSnapshot()

    expect(snapshot.activeGoals.map((g) => g.title)).toEqual(['Ship MVP'])
    expect(snapshot.activeKeyResults.map((k) => k.title)).toEqual([
      '10 users onboarded',
    ])
    expect(snapshot.activeHabits.map((h) => h.title)).toEqual(['Morning walk'])
    expect(snapshot.activeTrackers.map((t) => t.title)).toEqual(['Weight'])

    expect(snapshot.snapshot).toContain('Active goals')
    expect(snapshot.snapshot).toContain('- Ship MVP')
    expect(snapshot.snapshot).toContain('Active key results')
    expect(snapshot.snapshot).toContain('- 10 users onboarded')
    expect(snapshot.snapshot).toContain('Active habits')
    expect(snapshot.snapshot).toContain('- Morning walk')
    expect(snapshot.snapshot).toContain('Active trackers')
    expect(snapshot.snapshot).toContain('- Weight')
    expect(snapshot.snapshot).not.toContain('Archived')
    expect(snapshot.snapshot).not.toContain('Paused habit')
    expect(snapshot.snapshot).not.toContain('Hidden tracker')
  })

  it('keeps habits/trackers with isActive === undefined (treats missing as active)', async () => {
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(keyResultDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([
      { id: 'h1', title: 'Legacy habit', status: 'open' } as never,
    ])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])

    const snapshot = await buildPlanningSnapshot()
    expect(snapshot.activeHabits.map((h) => h.title)).toEqual(['Legacy habit'])
  })

  it('survives an individual repository failure and logs a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([
      { id: 'g1', title: 'Ship MVP', status: 'open' } as never,
    ])
    vi.mocked(keyResultDexieRepository.listAll).mockRejectedValue(new Error('boom'))
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])

    const snapshot = await buildPlanningSnapshot()

    expect(snapshot.activeGoals.map((g) => g.title)).toEqual(['Ship MVP'])
    expect(snapshot.activeKeyResults).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('survives measurement entry repository failure and omits metrics', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(keyResultDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([
      {
        id: 'h1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        title: 'Morning walk',
        status: 'open',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        entryMode: 'completion',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
      } as never,
    ])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(planningStateDexieRepository.listDailyMeasurementEntriesForDayRange)
      .mockRejectedValue(new Error('entry boom'))

    const snapshot = await buildPlanningSnapshot()

    expect(snapshot.snapshot).toContain('- Morning walk [habit, weekly]')
    expect(snapshot.snapshot).not.toContain('30d completion')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('includes execution metric lines for active habits, key results and trackers', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-20T12:00:00.000Z'))
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(keyResultDexieRepository.listAll).mockResolvedValue([
      {
        id: 'kr1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        title: 'Long run distance',
        goalId: 'g1',
        status: 'open',
        isActive: true,
        entryMode: 'value',
        cadence: 'weekly',
        target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 42 },
      } as never,
    ])
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([
      {
        id: 'h1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        title: 'Morning walk',
        status: 'open',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        entryMode: 'completion',
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 1 },
      } as never,
    ])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([
      {
        id: 't1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        title: 'Mood',
        status: 'open',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        entryMode: 'rating',
        cadence: 'weekly',
        ratingScaleMin: 1,
        ratingScale: 10,
      } as never,
    ])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(planningStateDexieRepository.listDailyMeasurementEntriesForDayRange).mockResolvedValue([
      {
        id: 'h1-2026-03-18',
        createdAt: '2026-03-18T08:00:00.000Z',
        updatedAt: '2026-03-18T08:00:00.000Z',
        subjectType: 'habit',
        subjectId: 'h1',
        dayRef: '2026-03-18',
        value: 1,
      },
      {
        id: 'kr1-2026-03-18',
        createdAt: '2026-03-18T08:00:00.000Z',
        updatedAt: '2026-03-18T08:00:00.000Z',
        subjectType: 'keyResult',
        subjectId: 'kr1',
        dayRef: '2026-03-18',
        value: 28,
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `t1-recent-${index}`,
        createdAt: `2026-03-${18 - index}T08:00:00.000Z`,
        updatedAt: `2026-03-${18 - index}T08:00:00.000Z`,
        subjectType: 'tracker' as const,
        subjectId: 't1',
        dayRef: `2026-03-${18 - index}` as never,
        value: 7,
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `t1-baseline-${index}`,
        createdAt: `2026-02-0${index + 1}T08:00:00.000Z`,
        updatedAt: `2026-02-0${index + 1}T08:00:00.000Z`,
        subjectType: 'tracker' as const,
        subjectId: 't1',
        dayRef: `2026-02-0${index + 1}` as never,
        value: 6,
      })),
    ] as never)

    const snapshot = await buildPlanningSnapshot()

    expect(snapshot.snapshot).toContain('- Morning walk [habit, weekly]')
    expect(snapshot.snapshot).toContain('Streak: 1 weeks * 30d completion:')
    expect(snapshot.snapshot).toContain('- Long run distance [key result, weekly]')
    expect(snapshot.snapshot).toContain('Progress: 28/42 (67%)')
    expect(snapshot.snapshot).toContain('Last entry: 2026-03-18')
    expect(snapshot.snapshot).toContain('- Mood [tracker, weekly]')
    expect(snapshot.snapshot).toContain('30d avg:')
    expect(snapshot.snapshot).toContain('trend rising')

    vi.useRealTimers()
  })

  it('includes strategic priority context without drafts', async () => {
    vi.mocked(goalDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(keyResultDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(habitDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(trackerDexieRepository.listAll).mockResolvedValue([])
    vi.mocked(priorityDexieRepository.listAll).mockResolvedValue([
      {
        id: 'p2',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        title: 'Second active',
        years: ['2026'],
        status: 'active',
        order: 2,
        lifeAreaIds: [],
        whyNow: '',
        desiredDirection: 'Build capacity',
        tradeoffs: '',
        progressSignals: ['more recovery'],
        riskSignals: [],
      } as never,
      {
        id: 'p1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        title: 'First active',
        years: ['2026', '2027'],
        status: 'active',
        order: 1,
        lifeAreaIds: [],
        whyNow: 'Current leverage',
        desiredDirection: 'Health as foundation',
        tradeoffs: 'Fewer evening launches',
        progressSignals: [],
        riskSignals: ['skipping sleep'],
      } as never,
      {
        id: 'paused',
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        title: 'Paused direction',
        years: ['2026'],
        status: 'paused',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
      } as never,
      {
        id: 'closed',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-12-31T00:00:00.000Z',
        title: 'Closed direction',
        years: ['2025'],
        status: 'closed',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
        closingReflection: {
          closedAt: '2025-12-31T00:00:00.000Z',
          summary: 'It mattered.',
          learned: 'Need clearer boundaries.',
        },
      } as never,
      {
        id: 'draft',
        createdAt: '2026-01-04T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
        title: 'Draft direction',
        years: ['2026'],
        status: 'draft',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
      } as never,
    ])

    const snapshot = await buildPlanningSnapshot()

    expect(snapshot.priorities.active.map(priority => priority.title)).toEqual([
      'First active',
      'Second active',
    ])
    expect(snapshot.snapshot).toContain('Active priorities')
    expect(snapshot.snapshot).toContain('[2026, 2027] First active')
    expect(snapshot.snapshot).toContain('Direction: Health as foundation')
    expect(snapshot.snapshot).toContain('Risk signals: skipping sleep')
    expect(snapshot.snapshot).toContain('Paused priorities')
    expect(snapshot.snapshot).toContain('[2026] Paused direction')
    expect(snapshot.snapshot).toContain('Closed priority reflections')
    expect(snapshot.snapshot).toContain('Summary: It mattered.')
    expect(snapshot.snapshot).toContain('Learned: Need clearer boundaries.')
    expect(snapshot.snapshot).not.toContain('Draft direction')
  })
})
