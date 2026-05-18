import { describe, expect, it } from 'vitest'
import type {
  CreateHabitPayload,
  CreateInitiativePayload,
  CreateKeyResultPayload,
  CreatePriorityPayload,
  CreateTrackerPayload,
} from '@/domain/planning'
import type { CreateGoalPayload } from '@/domain/planning'
import {
  normalizeGoalPayload,
  normalizeHabitPayload,
  normalizeInitiativePayload,
  normalizeKeyResultPayload,
  normalizePriorityPayload,
  normalizeTrackerPayload,
} from '@/domain/planning'
import type { YearRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

describe('planning domain normalization', () => {
  it('normalizes priority payloads and validates YearRef', () => {
    const normalized = normalizePriorityPayload({
      title: '  2026 Focus  ',
      description: '  Annual direction  ',
      icon: '  self_improvement  ',
      years: [parsePeriodRef('2027') as YearRef, parsePeriodRef('2026') as YearRef, parsePeriodRef('2026') as YearRef],
      status: 'active',
      order: 2,
      lifeAreaIds: ['la-1', 'la-1', ' la-2 '],
      whyNow: '  There is leverage now  ',
      desiredDirection: '  Build durable health  ',
      tradeoffs: '  Fewer evening launches  ',
      progressSignals: ['  more sleep ', 'more sleep', 'better energy'],
      riskSignals: ['  skipped recovery '],
    } satisfies CreatePriorityPayload)

    expect(normalized).toEqual({
      title: '2026 Focus',
      description: 'Annual direction',
      icon: 'self_improvement',
      years: ['2026', '2027'],
      status: 'active',
      order: 2,
      lifeAreaIds: ['la-1', 'la-2'],
      whyNow: 'There is leverage now',
      desiredDirection: 'Build durable health',
      tradeoffs: 'Fewer evening launches',
      progressSignals: ['more sleep', 'better energy'],
      riskSignals: ['skipped recovery'],
      closingReflection: undefined,
    })

    expect(() =>
      normalizePriorityPayload({
        title: 'Invalid year',
        years: ['0000' as YearRef],
        status: 'active',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
      } satisfies CreatePriorityPayload),
    ).toThrow('Priority.years must contain only valid YearRefs')
  })

  it('enforces priority strategic semantics', () => {
    const paused = normalizePriorityPayload({
      title: 'Paused direction',
      years: ['2026' as YearRef],
      status: 'paused',
      order: 1,
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })

    expect(paused.order).toBeUndefined()

    const closed = normalizePriorityPayload({
      title: 'Closed direction',
      years: ['2026' as YearRef],
      status: 'closed',
      lifeAreaIds: [],
      progressSignals: [],
      riskSignals: [],
    })

    expect(closed.status).toBe('closed')
    expect(closed.closingReflection).toBeUndefined()

    expect(() =>
      normalizePriorityPayload({
        title: 'No years',
        years: [],
        status: 'draft',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
      }),
    ).toThrow('Priority.years must contain at least one YearRef')

    expect(() =>
      normalizePriorityPayload({
        title: 'Bad reflection',
        years: ['2026' as YearRef],
        status: 'active',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
        closingReflection: { closedAt: '2026-12-31T00:00:00.000Z' },
      }),
    ).toThrow('Priority.closingReflection is only supported for closed priorities')
  })

  it('requires key results to use the shared measurement contract', () => {
    const normalized = normalizeKeyResultPayload({
      title: 'Ship onboarding refresh',
      isActive: true,
      goalId: 'goal-1',
      cadence: 'weekly',
      entryMode: 'counter',
      target: {
        kind: 'count',
        operator: 'min',
        value: 3,
      },
      status: 'open',
    } satisfies CreateKeyResultPayload)

    expect(normalized.entryMode).toBe('counter')
    expect(normalized.target).toEqual({
      kind: 'count',
      operator: 'min',
      value: 3,
    })

    expect(() =>
      normalizeKeyResultPayload({
        title: 'Broken metric',
        isActive: true,
        goalId: 'goal-1',
        cadence: 'weekly',
        entryMode: 'value',
        target: {
          kind: 'count',
          operator: 'min',
          value: 1,
        },
        status: 'open',
      } as CreateKeyResultPayload),
    ).toThrow('target.kind must be one of: value')
  })

  it('validates habit target combinations for value and rating modes', () => {
    const valueHabit = normalizeHabitPayload({
      title: 'Read pages',
      isActive: true,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['life-area-1'],
      cadence: 'monthly',
      entryMode: 'value',
      target: {
        kind: 'value',
        aggregation: 'sum',
        operator: 'gte',
        value: 120,
      },
      status: 'open',
    } satisfies CreateHabitPayload)

    expect(valueHabit.target).toEqual({
      kind: 'value',
      aggregation: 'sum',
      operator: 'gte',
      value: 120,
    })

    expect(() =>
      normalizeHabitPayload({
        title: 'Mood check',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'rating',
        target: {
          kind: 'rating',
          aggregation: 'last',
          operator: 'gte',
          value: 4,
        },
        status: 'open',
      } as unknown as CreateHabitPayload),
    ).toThrow('target.aggregation must be one of: average')
  })

  it('rejects old planning fields and tracker targets', () => {
    expect(() =>
      normalizeHabitPayload({
        title: 'Morning run',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        target: {
          kind: 'count',
          operator: 'min',
          value: 4,
        },
        status: 'open',
        kind: 'generic',
      } as CreateHabitPayload),
    ).toThrow('kind is not supported for this planning object')

    expect(() =>
      normalizeTrackerPayload({
        title: 'Weight',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'monthly',
        entryMode: 'value',
        target: {
          kind: 'value',
          aggregation: 'last',
          operator: 'lte',
          value: 80,
        },
        status: 'open',
      } as CreateTrackerPayload),
    ).toThrow('target is not supported for this planning object')

    expect(() =>
      normalizeTrackerPayload({
        title: 'Energy',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'rating',
        analysisPeriod: 'week',
        status: 'open',
      } as CreateTrackerPayload),
    ).toThrow('analysisPeriod is not supported for this planning object')
  })

  it('rejects completion entryMode combined with non-count targets', () => {
    expect(() =>
      normalizeHabitPayload({
        title: 'Meditate',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'completion',
        target: {
          kind: 'value',
          aggregation: 'sum',
          operator: 'gte',
          value: 30,
        },
        status: 'open',
      } as unknown as CreateHabitPayload),
    ).toThrow(/target\.kind must be one of: count/)

    expect(() =>
      normalizeKeyResultPayload({
        title: 'Daily check-in',
        isActive: true,
        goalId: 'goal-1',
        cadence: 'weekly',
        entryMode: 'completion',
        target: {
          kind: 'rating',
          aggregation: 'average',
          operator: 'gte',
          value: 4,
        },
        status: 'open',
      } as unknown as CreateKeyResultPayload),
    ).toThrow(/target\.kind must be one of: count/)
  })

  it('keeps initiative lifecycle separate from archive semantics', () => {
    const normalized = normalizeInitiativePayload({
      title: 'Call landlord',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: [],
      status: 'completed',
    } satisfies CreateInitiativePayload)

    expect(normalized.isActive).toBe(false)
    expect(normalized.status).toBe('completed')

    expect(() =>
      normalizeInitiativePayload({
        title: 'Book dentist',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
        checklist: ['step-1'],
      } as CreateInitiativePayload),
    ).toThrow('checklist is not supported for this planning object')
  })

  describe('normalizeGoalPayload SMART fields', () => {
    function buildBaseGoal(extra: Partial<CreateGoalPayload> = {}): CreateGoalPayload {
      return {
        title: 'My goal',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        status: 'open',
        ...extra,
      }
    }

    it('accepts a complete SMART payload and trims optional text fields', () => {
      const normalized = normalizeGoalPayload(
        buildBaseGoal({
          targetDate: '2026-12-31',
          successDefinition: '  Ran the 10K  ',
          whyMatters: '  Health  ',
          confidenceRating: 7,
          obstacles: '  Travel weeks  ',
          resources: '  Coach  ',
        }),
      )

      expect(normalized.targetDate).toBe('2026-12-31')
      expect(normalized.successDefinition).toBe('Ran the 10K')
      expect(normalized.whyMatters).toBe('Health')
      expect(normalized.confidenceRating).toBe(7)
      expect(normalized.obstacles).toBe('Travel weeks')
      expect(normalized.resources).toBe('Coach')
    })

    it('accepts undefined for all new SMART fields', () => {
      const normalized = normalizeGoalPayload(buildBaseGoal())
      expect(normalized.targetDate).toBeUndefined()
      expect(normalized.successDefinition).toBeUndefined()
      expect(normalized.whyMatters).toBeUndefined()
      expect(normalized.confidenceRating).toBeUndefined()
      expect(normalized.obstacles).toBeUndefined()
      expect(normalized.resources).toBeUndefined()
    })

    it('rejects malformed targetDate strings', () => {
      expect(() =>
        normalizeGoalPayload(buildBaseGoal({ targetDate: 'not-a-date' })),
      ).toThrow(/targetDate must be ISO date YYYY-MM-DD/)
    })

    it('rejects confidenceRating outside 1..10', () => {
      expect(() => normalizeGoalPayload(buildBaseGoal({ confidenceRating: 0 }))).toThrow(
        /confidenceRating must be an integer between 1 and 10/,
      )
      expect(() => normalizeGoalPayload(buildBaseGoal({ confidenceRating: 11 }))).toThrow(
        /confidenceRating must be an integer between 1 and 10/,
      )
      expect(() =>
        normalizeGoalPayload(buildBaseGoal({ confidenceRating: 5.5 })),
      ).toThrow(/confidenceRating must be an integer between 1 and 10/)
    })

    it('preserves existing SMART values when patching with undefined', () => {
      const existing = {
        ...normalizeGoalPayload(
          buildBaseGoal({ targetDate: '2026-12-31', confidenceRating: 8 }),
        ),
        id: 'goal-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }

      const patched = normalizeGoalPayload({ title: 'My goal' }, existing)
      expect(patched.targetDate).toBe('2026-12-31')
      expect(patched.confidenceRating).toBe(8)
    })
  })
})
