import { describe, expect, it } from 'vitest'
import type {
  CreateGoalPayload,
  CreateHabitPayload,
  CreateInitiativePayload,
  CreateKeyResultPayload,
  CreatePriorityPayload,
  CreateTrackerPayload,
} from '@/domain/planning'
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
  it('normalizes Priority payloads and validates YearRef', () => {
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

  it('allows duplicate titles across Goal records', () => {
    const first = normalizeGoalPayload({
      title: 'Shared title',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    } satisfies CreateGoalPayload)

    const second = normalizeGoalPayload({
      title: 'Shared title',
      isActive: false,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'completed',
    } satisfies CreateGoalPayload)

    expect(first.title).toBe('Shared title')
    expect(second.title).toBe('Shared title')
  })

  it('enforces KeyResult ownership and keeps generic config empty in v1', () => {
    expect(() =>
      normalizeKeyResultPayload({
        title: 'Ship landing page',
        isActive: true,
        cadence: 'weekly',
        kind: 'generic',
        config: {},
        status: 'open',
      } as CreateKeyResultPayload),
    ).toThrow('KeyResult.goalId is required')

    expect(() =>
      normalizeKeyResultPayload({
        title: 'Ship landing page',
        isActive: true,
        goalId: 'goal-1',
        cadence: 'weekly',
        kind: 'generic',
        config: { target: 3 } as never,
        status: 'open',
      } as CreateKeyResultPayload),
    ).toThrow('Generic config must stay empty in v1')
  })

  it('rejects forbidden Goal links on Habit and Tracker', () => {
    expect(() =>
      normalizeHabitPayload({
        title: 'Morning run',
        isActive: true,
        goalId: 'goal-1',
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        kind: 'generic',
        config: {},
        status: 'open',
      } as CreateHabitPayload),
    ).toThrow('goalId is not supported for this planning object')

    expect(() =>
      normalizeTrackerPayload({
        title: 'Weight',
        isActive: true,
        goalId: 'goal-1',
        priorityIds: [],
        lifeAreaIds: [],
        analysisPeriod: 'month',
        entryMode: 'day',
        kind: 'generic',
        config: {},
        status: 'open',
      } as CreateTrackerPayload),
    ).toThrow('goalId is not supported for this planning object')
  })

  it('keeps lifecycle separate from archive semantics', () => {
    const normalized = normalizeHabitPayload({
      title: 'Meditation',
      description: '  ',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: ['life-area-1'],
      cadence: 'monthly',
      kind: 'generic',
      config: {},
      status: 'open',
    } satisfies CreateHabitPayload)

    expect(normalized.isActive).toBe(false)
    expect(normalized.status).toBe('open')
    expect(normalized.description).toBeUndefined()
  })

  it('rejects checklist-style fields on Initiative while allowing optional goal links', () => {
    const normalized = normalizeInitiativePayload({
      title: 'Book dentist',
      isActive: true,
      goalId: 'goal-1',
      priorityIds: ['priority-1'],
      lifeAreaIds: ['life-area-1'],
      status: 'open',
    } satisfies CreateInitiativePayload)

    expect(normalized.goalId).toBe('goal-1')
    expect(normalized.status).toBe('open')

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

  it('keeps initiative completion lifecycle separate from archive semantics', () => {
    const normalized = normalizeInitiativePayload({
      title: 'Call landlord',
      isActive: false,
      priorityIds: ['priority-1'],
      lifeAreaIds: [],
      status: 'completed',
    } satisfies CreateInitiativePayload)

    expect(normalized.isActive).toBe(false)
    expect(normalized.status).toBe('completed')
  })
})
