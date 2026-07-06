import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { DayRef, WeekRef } from '@/domain/period'
import { applyMeasurementTargetCascade, buildMeasurementSummary } from '@/services/measurementProgress'

function makeEntry(
  subjectId: string,
  dayRef: string,
  value: number | null = 1,
  overrides: Partial<DailyMeasurementEntry> = {},
): DailyMeasurementEntry {
  return {
    id: `${subjectId}-${dayRef}`,
    createdAt: `${dayRef}T08:00:00.000Z`,
    updatedAt: `${dayRef}T08:00:00.000Z`,
    subjectType: 'habit',
    subjectId,
    dayRef: dayRef as DayRef,
    value,
    ...overrides,
  }
}

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Morning walk',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...overrides,
  }
}

function makeKeyResult(overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id: 'kr-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Long run',
    goalId: 'goal-1',
    isActive: true,
    entryMode: 'value',
    cadence: 'weekly',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 20 },
    status: 'open',
    ...overrides,
  }
}

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Mood',
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    entryMode: 'rating',
    cadence: 'weekly',
    status: 'open',
    ...overrides,
  }
}

describe('buildMeasurementSummary', () => {
  const weekRef = '2026-W10' as WeekRef

  it('marks weekly completion as met when the count target is reached', () => {
    const habit = makeHabit()
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09'),
      makeEntry(habit.id, '2026-03-10'),
      makeEntry(habit.id, '2026-03-11'),
    ], weekRef)

    expect(summary.actualValue).toBe(3)
    expect(summary.evaluationStatus).toBe('met')
  })

  it('marks weekly completion as missed when the count target is not reached', () => {
    const habit = makeHabit()
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09'),
      makeEntry(habit.id, '2026-03-10'),
    ], weekRef)

    expect(summary.actualValue).toBe(2)
    expect(summary.evaluationStatus).toBe('missed')
  })

  it('returns no-data when a targeted subject has no entries for the period', () => {
    const summary = buildMeasurementSummary(makeHabit(), [], weekRef)

    expect(summary.actualValue).toBeUndefined()
    expect(summary.evaluationStatus).toBe('no-data')
  })

  it('sums counter values and supports min and max targets', () => {
    const minHabit = makeHabit({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 8 },
    })
    const maxHabit = makeHabit({
      id: 'habit-2',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'max', value: 8 },
    })

    expect(buildMeasurementSummary(minHabit, [
      makeEntry(minHabit.id, '2026-03-09', 5),
      makeEntry(minHabit.id, '2026-03-10', 3),
    ], weekRef).evaluationStatus).toBe('met')
    expect(buildMeasurementSummary(maxHabit, [
      makeEntry(maxHabit.id, '2026-03-09', 5),
      makeEntry(maxHabit.id, '2026-03-10', 4),
    ], weekRef).evaluationStatus).toBe('missed')
  })

  it('uses sum aggregation for value targets', () => {
    const kr = makeKeyResult({
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 20 },
    })
    const summary = buildMeasurementSummary(kr, [
      makeEntry(kr.id, '2026-03-09', 12),
      makeEntry(kr.id, '2026-03-10', 8),
    ], weekRef)

    expect(summary.actualValue).toBe(20)
    expect(summary.evaluationStatus).toBe('met')
  })

  it('uses average aggregation for value targets', () => {
    const kr = makeKeyResult({
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const summary = buildMeasurementSummary(kr, [
      makeEntry(kr.id, '2026-03-09', 6),
      makeEntry(kr.id, '2026-03-10', 8),
    ], weekRef)

    expect(summary.actualValue).toBe(7)
    expect(summary.evaluationStatus).toBe('met')
  })

  it('uses last aggregation for value targets', () => {
    const kr = makeKeyResult({
      target: { kind: 'value', aggregation: 'last', operator: 'gte', value: 7 },
    })
    const summary = buildMeasurementSummary(kr, [
      makeEntry(kr.id, '2026-03-09', 9),
      makeEntry(kr.id, '2026-03-10', 6),
    ], weekRef)

    expect(summary.actualValue).toBe(6)
    expect(summary.evaluationStatus).toBe('missed')
  })

  it('averages rating values', () => {
    const habit = makeHabit({
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 },
    })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 3),
      makeEntry(habit.id, '2026-03-10', 5),
    ], weekRef)

    expect(summary.actualValue).toBe(4)
    expect(summary.evaluationStatus).toBe('met')
  })

  it('ignores entries outside the requested period', () => {
    const habit = makeHabit()
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09'),
      makeEntry(habit.id, '2026-03-10'),
      makeEntry(habit.id, '2026-03-16'),
    ], weekRef)

    expect(summary.entryCount).toBe(2)
    expect(summary.actualValue).toBe(2)
  })

  it('ignores entries from other subjects', () => {
    const habit = makeHabit()
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09'),
      makeEntry('other-habit', '2026-03-10'),
    ], weekRef)

    expect(summary.entryCount).toBe(1)
    expect(summary.actualValue).toBe(1)
  })

  it('leaves evaluationStatus undefined for trackers without targets', () => {
    const tracker = makeTracker()
    const summary = buildMeasurementSummary(tracker, [
      makeEntry(tracker.id, '2026-03-09', 6, { subjectType: 'tracker' }),
    ], weekRef)

    expect(summary.actualValue).toBe(6)
    expect(summary.evaluationStatus).toBeUndefined()
  })

  describe('with asOfDayRef cut-off', () => {
    const monthRef = '2026-03' as unknown as WeekRef

    it('drops entries past the cut-off day for weekly aggregates', () => {
      const tracker = makeTracker()
      const summary = buildMeasurementSummary(
        tracker,
        [
          makeEntry(tracker.id, '2026-03-09', 4, { subjectType: 'tracker' }),
          makeEntry(tracker.id, '2026-03-10', 8, { subjectType: 'tracker' }),
          makeEntry(tracker.id, '2026-03-12', 10, { subjectType: 'tracker' }),
        ],
        weekRef,
        '2026-03-10' as DayRef,
      )

      expect(summary.entryCount).toBe(2)
      expect(summary.actualValue).toBe(6)
    })

    it('includes entries dated exactly on the cut-off day', () => {
      const habit = makeHabit()
      const summary = buildMeasurementSummary(
        habit,
        [
          makeEntry(habit.id, '2026-03-09'),
          makeEntry(habit.id, '2026-03-10'),
        ],
        weekRef,
        '2026-03-10' as DayRef,
      )

      expect(summary.entryCount).toBe(2)
      expect(summary.actualValue).toBe(2)
    })

    it('treats months cumulatively up to the cut-off day', () => {
      const kr = makeKeyResult({ cadence: 'monthly' })
      const summary = buildMeasurementSummary(
        kr,
        [
          makeEntry(kr.id, '2026-03-02', 5, { subjectType: 'keyResult' }),
          makeEntry(kr.id, '2026-03-09', 7, { subjectType: 'keyResult' }),
          makeEntry(kr.id, '2026-03-25', 12, { subjectType: 'keyResult' }),
        ],
        monthRef,
        '2026-03-15' as DayRef,
      )

      expect(summary.entryCount).toBe(2)
      expect(summary.actualValue).toBe(12)
    })

    it('reflects cut-off in evaluationStatus (mid-period min target shows missed)', () => {
      const habit = makeHabit()
      const summary = buildMeasurementSummary(
        habit,
        [
          makeEntry(habit.id, '2026-03-09'),
          makeEntry(habit.id, '2026-03-12'),
          makeEntry(habit.id, '2026-03-13'),
        ],
        weekRef,
        '2026-03-09' as DayRef,
      )

      expect(summary.entryCount).toBe(1)
      expect(summary.evaluationStatus).toBe('missed')
    })

    it('returns no-data when no entries exist on or before the cut-off', () => {
      const habit = makeHabit()
      const summary = buildMeasurementSummary(
        habit,
        [
          makeEntry(habit.id, '2026-03-11'),
          makeEntry(habit.id, '2026-03-12'),
        ],
        weekRef,
        '2026-03-09' as DayRef,
      )

      expect(summary.entryCount).toBe(0)
      expect(summary.actualValue).toBeUndefined()
      expect(summary.evaluationStatus).toBe('no-data')
    })
  })
})

describe('applyMeasurementTargetCascade', () => {
  const weekRef = '2026-W11' as WeekRef
  const monthRef = '2026-03'
  const monthOverride = { kind: 'count', operator: 'min', value: 8 } as const
  const weekOverride = { kind: 'count', operator: 'min', value: 2 } as const

  it('prefers the week override for week periods', () => {
    const subject = applyMeasurementTargetCascade(makeHabit(), weekRef, {
      monthOverride,
      weekOverride,
    })
    expect('target' in subject && subject.target).toEqual(weekOverride)
  })

  it('falls back to the month override for week periods without a week override', () => {
    const subject = applyMeasurementTargetCascade(makeHabit(), weekRef, {
      monthOverride,
    })
    expect('target' in subject && subject.target).toEqual(monthOverride)
  })

  it('never applies a week override to month periods', () => {
    const subject = applyMeasurementTargetCascade(
      makeHabit({ cadence: 'monthly' }),
      monthRef as Parameters<typeof applyMeasurementTargetCascade>[1],
      { monthOverride, weekOverride },
    )
    expect('target' in subject && subject.target).toEqual(monthOverride)
  })

  it('keeps the base target when no overrides exist', () => {
    const habit = makeHabit()
    const subject = applyMeasurementTargetCascade(habit, weekRef, {})
    expect(subject).toBe(habit)
  })

  it('ignores overrides for subjects without a target', () => {
    const tracker = makeTracker()
    const subject = applyMeasurementTargetCascade(tracker, weekRef, {
      weekOverride,
    })
    expect(subject).toBe(tracker)
  })
})

describe('entryDays condition (conjunction)', () => {
  const weekRef = '2026-W10' as WeekRef

  function makeRatingHabit(entryDays: { operator: 'min' | 'max'; value: number }): Habit {
    return makeHabit({
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3, entryDays },
    })
  }

  it('marks missed when the primary metric holds but too few entry days (min)', () => {
    const habit = makeRatingHabit({ operator: 'min', value: 5 })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 3),
    ], weekRef)

    expect(summary.actualValue).toBe(3)
    expect(summary.evaluationStatus).toBe('missed')
    expect(summary.primaryMet).toBe(true)
    expect(summary.presenceMet).toBe(false)
    expect(summary.qualifiedEntryDays).toBe(1)
  })

  it('marks met when both the primary metric and the min day count hold', () => {
    const habit = makeRatingHabit({ operator: 'min', value: 5 })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 3),
      makeEntry(habit.id, '2026-03-10', 4),
      makeEntry(habit.id, '2026-03-11', 3),
      makeEntry(habit.id, '2026-03-12', 5),
      makeEntry(habit.id, '2026-03-13', 3),
    ], weekRef)

    expect(summary.evaluationStatus).toBe('met')
    expect(summary.primaryMet).toBe(true)
    expect(summary.presenceMet).toBe(true)
    expect(summary.qualifiedEntryDays).toBe(5)
  })

  it('marks missed when the day count holds but the primary metric fails', () => {
    const habit = makeRatingHabit({ operator: 'min', value: 3 })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 2),
      makeEntry(habit.id, '2026-03-10', 2),
      makeEntry(habit.id, '2026-03-11', 2),
    ], weekRef)

    expect(summary.evaluationStatus).toBe('missed')
    expect(summary.primaryMet).toBe(false)
    expect(summary.presenceMet).toBe(true)
  })

  it('marks missed when a max day limit is exceeded despite a met metric', () => {
    const habit = makeRatingHabit({ operator: 'max', value: 3 })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 4),
      makeEntry(habit.id, '2026-03-10', 4),
      makeEntry(habit.id, '2026-03-11', 4),
      makeEntry(habit.id, '2026-03-12', 4),
    ], weekRef)

    expect(summary.evaluationStatus).toBe('missed')
    expect(summary.primaryMet).toBe(true)
    expect(summary.presenceMet).toBe(false)
    expect(summary.qualifiedEntryDays).toBe(4)
  })

  it('does not count an explicitly logged zero as a counter execution day', () => {
    const habit = makeHabit({
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 4, entryDays: { operator: 'min', value: 3 } },
    })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 2),
      makeEntry(habit.id, '2026-03-10', 2),
      makeEntry(habit.id, '2026-03-11', 0),
    ], weekRef)

    expect(summary.actualValue).toBe(4)
    expect(summary.primaryMet).toBe(true)
    expect(summary.qualifiedEntryDays).toBe(2)
    expect(summary.presenceMet).toBe(false)
    expect(summary.evaluationStatus).toBe('missed')
  })

  it('returns no-data with zero entries, for min and max conditions alike', () => {
    for (const operator of ['min', 'max'] as const) {
      const summary = buildMeasurementSummary(makeRatingHabit({ operator, value: 3 }), [], weekRef)
      expect(summary.evaluationStatus).toBe('no-data')
      expect(summary.primaryMet).toBeUndefined()
      expect(summary.presenceMet).toBeUndefined()
      expect(summary.qualifiedEntryDays).toBe(0)
    }
  })

  it('leaves the breakdown fields undefined for targets without the condition', () => {
    const habit = makeHabit({
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
    })
    const summary = buildMeasurementSummary(habit, [
      makeEntry(habit.id, '2026-03-09', 4),
    ], weekRef)

    expect(summary.evaluationStatus).toBe('met')
    expect(summary.primaryMet).toBeUndefined()
    expect(summary.presenceMet).toBeUndefined()
    expect(summary.qualifiedEntryDays).toBeUndefined()
  })

  it('carries the condition through week target overrides', () => {
    const habit = makeHabit({
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
    })
    const subject = applyMeasurementTargetCascade(habit, weekRef, {
      weekOverride: {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte',
        value: 3,
        entryDays: { operator: 'min', value: 2 },
      },
    })
    const summary = buildMeasurementSummary(subject, [
      makeEntry(habit.id, '2026-03-09', 4),
    ], weekRef)

    expect(summary.evaluationStatus).toBe('missed')
    expect(summary.presenceMet).toBe(false)
  })
})
