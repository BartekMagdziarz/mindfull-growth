import { describe, expect, it } from 'vitest'
import type {
  CreateHabitPayload,
  CreateInitiativePayload,
  CreateKeyResultPayload,
  CreatePriorityPayload,
  CreateTrackerPayload,
} from '@/domain/planning'
import {
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
      isActive: true,
      year: parsePeriodRef('2026') as YearRef,
      lifeAreaIds: ['la-1', 'la-1', ' la-2 '],
    } satisfies CreatePriorityPayload)

    expect(normalized).toEqual({
      title: '2026 Focus',
      description: 'Annual direction',
      isActive: true,
      year: '2026',
      lifeAreaIds: ['la-1', 'la-2'],
    })

    expect(() =>
      normalizePriorityPayload({
        title: 'Invalid year',
        isActive: true,
        year: '0000' as YearRef,
        lifeAreaIds: [],
      } satisfies CreatePriorityPayload),
    ).toThrow('Priority.year must be a valid YearRef')
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
})
