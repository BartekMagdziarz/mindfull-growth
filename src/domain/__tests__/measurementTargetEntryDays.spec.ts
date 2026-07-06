import { describe, expect, it } from 'vitest'
import type { CreateHabitPayload, Habit } from '@/domain/planning'
import { normalizeHabitPayload } from '@/domain/planning'
import type { CreateMeasurementWeekStatePayload, MeasurementWeekState } from '@/domain/planningState'
import { normalizeMeasurementWeekStatePayload } from '@/domain/planningState'
import { parsePeriodRef } from '@/utils/periods'

/**
 * Contract test for the entryDays condition across BOTH measurement-target
 * normalizers: the base-target normalizer in planning.ts and its twin for
 * targetOverride in planningState.ts. They are intentionally duplicated in the
 * codebase, so this spec guards against them drifting apart — a change to one
 * without the other passes typecheck but silently drops or accepts the field.
 */

function habitPayload(overrides: Partial<CreateHabitPayload>): CreateHabitPayload {
  return {
    title: 'Morning routine',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'rating',
    target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
    status: 'open',
    ...overrides,
  }
}

function weekStatePayload(
  overrides: Partial<CreateMeasurementWeekStatePayload>,
): CreateMeasurementWeekStatePayload {
  return {
    weekRef: parsePeriodRef('2026-W10') as CreateMeasurementWeekStatePayload['weekRef'],
    subjectType: 'habit',
    subjectId: 'habit-1',
    activityState: 'active',
    scheduleScope: 'unassigned',
    ...overrides,
  }
}

describe('entryDays in the base-target normalizer (planning.ts)', () => {
  it('keeps a valid condition for rating, value, and counter modes', () => {
    const rating = normalizeHabitPayload(habitPayload({
      target: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'min', value: 5 },
      },
    }))
    expect(rating.target.entryDays).toEqual({ operator: 'min', value: 5 })

    const counter = normalizeHabitPayload(habitPayload({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 10, entryDays: { operator: 'max', value: 3 } },
    }))
    expect(counter.target.entryDays).toEqual({ operator: 'max', value: 3 })

    const value = normalizeHabitPayload(habitPayload({
      entryMode: 'value',
      target: {
        kind: 'value',
        aggregation: 'sum',
        operator: 'gte',
        value: 100,
        entryDays: { operator: 'min', value: 4 },
      },
    }))
    expect(value.target.entryDays).toEqual({ operator: 'min', value: 4 })
  })

  it('strips the condition for completion mode instead of storing it', () => {
    const completion = normalizeHabitPayload(habitPayload({
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 5, entryDays: { operator: 'min', value: 5 } },
    }))
    expect(completion.target.entryDays).toBeUndefined()
  })

  it('rejects non-integer or sub-1 day counts', () => {
    for (const value of [0, -1, 2.5]) {
      expect(() =>
        normalizeHabitPayload(habitPayload({
          target: {
            kind: 'rating',
            aggregation: 'average',
            operator: 'gte',
            value: 3,
            entryDays: { operator: 'min', value },
          },
        })),
      ).toThrow('target.entryDays.value must be an integer >= 1')
    }
  })

  it('removes the condition when the updated target omits it', () => {
    const existing: Habit = {
      id: 'habit-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...habitPayload({
        target: {
          kind: 'rating',
          aggregation: 'average',
          operator: 'gte',
          value: 3,
          entryDays: { operator: 'min', value: 5 },
        },
      }),
    }
    const updated = normalizeHabitPayload(
      { target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 } },
      existing,
    )
    expect(updated.target.entryDays).toBeUndefined()
  })
})

describe('entryDays in the override normalizer (planningState.ts)', () => {
  it('keeps a valid condition on week target overrides', () => {
    const created = normalizeMeasurementWeekStatePayload(weekStatePayload({
      targetOverride: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'min', value: 4 },
      },
    }))
    expect(created.targetOverride?.entryDays).toEqual({ operator: 'min', value: 4 })
  })

  it('rejects non-integer or sub-1 day counts', () => {
    expect(() =>
      normalizeMeasurementWeekStatePayload(weekStatePayload({
        targetOverride: {
          kind: 'rating',
          aggregation: 'average',
          operator: 'gte',
          value: 3,
          entryDays: { operator: 'min', value: 0 },
        },
      })),
    ).toThrow('targetOverride.entryDays.value must be an integer >= 1')
  })

  it('removes the condition when the updated override omits it', () => {
    const existing: MeasurementWeekState = {
      id: 'ws-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...weekStatePayload({
        targetOverride: {
          kind: 'rating',
          aggregation: 'average',
          operator: 'gte',
          value: 3,
          entryDays: { operator: 'min', value: 4 },
        },
      }),
    }
    const updated = normalizeMeasurementWeekStatePayload(
      {
        targetOverride: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
      },
      existing,
    )
    expect(updated.targetOverride?.entryDays).toBeUndefined()
  })
})

describe('normalizer contract: planning.ts and planningState.ts agree', () => {
  it('produces the identical target for the same input', () => {
    const input = {
      kind: 'rating' as const,
      aggregation: 'average' as const,
      operator: 'gte' as const,
      value: 3,
      entryDays: { operator: 'min' as const, value: 5 },
    }

    const fromBase = normalizeHabitPayload(habitPayload({ target: input })).target
    const fromOverride = normalizeMeasurementWeekStatePayload(
      weekStatePayload({ targetOverride: input }),
    ).targetOverride

    expect(fromOverride).toEqual(fromBase)
  })
})
