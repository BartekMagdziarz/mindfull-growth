import { describe, expect, it } from 'vitest'
import type { WeekRef } from '@/domain/period'
import type {
  CreateHabitPayload,
  CreateKeyResultPayload,
  Habit,
  MeasurementRhythm,
} from '@/domain/planning'
import {
  normalizeHabitPayload,
  normalizeKeyResultPayload,
  normalizeTrackerPayload,
} from '@/domain/planning'
import { normalizeMeasurementWeekStatePayload } from '@/domain/planningState'
import { parsePeriodRef } from '@/utils/periods'

const SINCE = parsePeriodRef('2026-W10') as WeekRef

function habitPayload(extra: Partial<CreateHabitPayload> = {}): CreateHabitPayload {
  return {
    title: 'Rozciąganie',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...extra,
  }
}

function keyResultPayload(extra: Partial<CreateKeyResultPayload> = {}): CreateKeyResultPayload {
  return {
    title: 'KR',
    goalId: 'goal-1',
    isActive: true,
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...extra,
  }
}

describe('rhythm normalization on measurable objects', () => {
  it('dedupes and sorts weekdays Monday-first and defaults the scope', () => {
    const habit = normalizeHabitPayload(
      habitPayload({
        rhythm: { kind: 'weekdays', weekdays: ['thu', 'tue', 'thu'], since: SINCE } as never,
      })
    )
    expect(habit.rhythm).toEqual({
      kind: 'weekdays',
      weekdays: ['tue', 'thu'],
      scope: 'placed-weeks',
      since: SINCE,
    })
  })

  it('rejects an empty weekday set, unknown weekdays and a non-week `since`', () => {
    expect(() =>
      normalizeHabitPayload(
        habitPayload({
          rhythm: { kind: 'weekdays', weekdays: [], scope: 'placed-weeks', since: SINCE },
        })
      )
    ).toThrow(/weekdays must not be empty/)
    expect(() =>
      normalizeHabitPayload(
        habitPayload({
          rhythm: {
            kind: 'weekdays',
            weekdays: ['monday'],
            scope: 'placed-weeks',
            since: SINCE,
          } as never,
        })
      )
    ).toThrow(/weekdays must contain only/)
    expect(() =>
      normalizeHabitPayload(
        habitPayload({
          rhythm: {
            kind: 'weekdays',
            weekdays: ['mon'],
            scope: 'placed-weeks',
            since: '2026-03' as WeekRef,
          },
        })
      )
    ).toThrow(/since must be a WeekRef/)
  })

  it('allows every-week only for weekly-cadence habits and trackers', () => {
    const everyWeek: MeasurementRhythm = {
      kind: 'weekdays',
      weekdays: ['mon'],
      scope: 'every-week',
      since: SINCE,
    }
    expect(normalizeHabitPayload(habitPayload({ rhythm: everyWeek })).rhythm?.scope).toBe(
      'every-week'
    )
    expect(
      normalizeTrackerPayload({
        title: 'Waga',
        isActive: true,
        priorityIds: [],
        lifeAreaIds: [],
        cadence: 'weekly',
        entryMode: 'value',
        status: 'open',
        rhythm: everyWeek,
      }).rhythm?.scope
    ).toBe('every-week')
    expect(() =>
      normalizeHabitPayload(habitPayload({ cadence: 'monthly', rhythm: everyWeek }))
    ).toThrow(/every-week/)
    expect(() => normalizeKeyResultPayload(keyResultPayload({ rhythm: everyWeek }))).toThrow(
      /every-week/
    )
    expect(
      normalizeKeyResultPayload(
        keyResultPayload({ rhythm: { ...everyWeek, scope: 'placed-weeks' } })
      ).rhythm?.scope
    ).toBe('placed-weeks')
  })

  it('keeps the stored rhythm on a partial update and removes it on null', () => {
    const existing: Habit = {
      id: 'h1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      ...habitPayload({
        rhythm: { kind: 'weekdays', weekdays: ['tue', 'thu'], scope: 'placed-weeks', since: SINCE },
      }),
    }
    expect(normalizeHabitPayload({ title: 'Nowy tytuł' }, existing).rhythm).toEqual(existing.rhythm)
    expect(normalizeHabitPayload({ rhythm: null }, existing).rhythm).toBeUndefined()
  })
})

describe('week state daysMode normalization', () => {
  const base = {
    weekRef: SINCE,
    subjectType: 'habit' as const,
    subjectId: 'h1',
    activityState: 'active' as const,
    scheduleScope: 'specific-days' as const,
  }

  it('accepts rhythm/custom, keeps the stored mode on partial upserts and rejects garbage', () => {
    expect(normalizeMeasurementWeekStatePayload({ ...base, daysMode: 'rhythm' }).daysMode).toBe(
      'rhythm'
    )
    const existing = {
      ...base,
      id: 'w1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      daysMode: 'custom' as const,
    }
    expect(normalizeMeasurementWeekStatePayload({ ...base }, existing).daysMode).toBe('custom')
    expect(normalizeMeasurementWeekStatePayload({ ...base }).daysMode).toBeUndefined()
    expect(() =>
      normalizeMeasurementWeekStatePayload({ ...base, daysMode: 'auto' as never })
    ).toThrow(/daysMode/)
  })
})
