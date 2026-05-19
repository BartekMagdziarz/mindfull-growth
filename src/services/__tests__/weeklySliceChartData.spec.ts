import { describe, expect, it } from 'vitest'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildMonthlyContextFooter,
  buildWeeklySliceCompletionSlots,
} from '@/services/weeklySliceChartData'

// --- Test helpers (mirrors todayChartData.spec.ts) ---

function makeEntry(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  dayRef: string,
  value: number | null = null,
): DailyMeasurementEntry {
  return {
    id: `entry-${dayRef}-${subjectId}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
    value,
  }
}

function makeHabit(id: string, overrides: Partial<Habit> = {}): Habit {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    title: `Habit ${id}`,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'monthly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 15 },
    status: 'open',
    ...overrides,
  }
}

function makeKR(id: string, overrides: Partial<KeyResult> = {}): KeyResult {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    title: `KR ${id}`,
    isActive: true,
    goalId: 'goal-1',
    cadence: 'monthly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 50 },
    status: 'open',
    ...overrides,
  }
}

function makeTracker(id: string, overrides: Partial<Tracker> = {}): Tracker {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    title: `Tracker ${id}`,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'monthly',
    entryMode: 'value',
    status: 'open',
    ...overrides,
  }
}

function makePlanning(overrides: Partial<MeasurementPlanningSummary> = {}): MeasurementPlanningSummary {
  return {
    scheduledDayRefs: [],
    ...overrides,
  }
}

// Week 2026-W10: Mon 2026-03-09 to Sun 2026-03-15 (all within March 2026)
const WEEK_REF = '2026-W10' as WeekRef
const TODAY = '2026-03-12' as DayRef // Thursday of week

describe('buildWeeklySliceCompletionSlots', () => {
  it('returns exactly 7 day-slots (Mon..Sun) regardless of subject target', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      target: { kind: 'count', operator: 'min', value: 30 },
    })
    const slots = buildWeeklySliceCompletionSlots(
      habit,
      'habit',
      [],
      [],
      makePlanning(),
      WEEK_REF,
      TODAY,
      'en',
    )

    expect(slots).toHaveLength(7)
  })

  it('marks days with entries as done, today as today-done if entry exists', () => {
    const habit = makeHabit('h1')
    const entries = [
      makeEntry('habit', 'h1', '2026-03-09'), // Mon
      makeEntry('habit', 'h1', '2026-03-10'), // Tue
      makeEntry('habit', 'h1', '2026-03-12'), // Thu = today
    ]
    const slots = buildWeeklySliceCompletionSlots(
      habit,
      'habit',
      entries,
      [],
      makePlanning(),
      WEEK_REF,
      TODAY,
      'en',
    )

    expect(slots).toHaveLength(7)
    expect(slots[0].state).toBe('done') // Mon
    expect(slots[1].state).toBe('done') // Tue
    expect(slots[2].state).toBe('missed') // Wed (past, no entry)
    expect(slots[3].state).toBe('today-done') // Thu = today, has entry
    expect(slots[4].state).toBe('future') // Fri
    expect(slots[5].state).toBe('future') // Sat
    expect(slots[6].state).toBe('future') // Sun
  })

  it('marks today without entry as today-pending', () => {
    const habit = makeHabit('h1')
    const slots = buildWeeklySliceCompletionSlots(
      habit,
      'habit',
      [],
      [],
      makePlanning(),
      WEEK_REF,
      TODAY,
      'en',
    )
    expect(slots[3].state).toBe('today-pending')
  })

  it('marks specific-day scheduled days appropriately via planning.scheduledDayRefs', () => {
    const habit = makeHabit('h1', { cadence: 'weekly' })
    const planning = makePlanning({
      scheduleScope: 'specific-days',
      scheduledDayRefs: ['2026-03-10', '2026-03-12'] as DayRef[], // Tue, Thu
    })
    const slots = buildWeeklySliceCompletionSlots(
      habit,
      'habit',
      [],
      [],
      planning,
      WEEK_REF,
      TODAY,
      'en',
    )

    // All 7 slots still returned in weekly slice — scheduled flag set on Tue/Thu
    expect(slots).toHaveLength(7)
    expect(slots[1].isScheduled).toBe(true) // Tue
    expect(slots[3].isScheduled).toBe(true) // Thu
    expect(slots[0].isScheduled).toBe(false) // Mon
    expect(slots[4].isScheduled).toBe(false) // Fri
  })

  it('large monthly target (e.g. Meditation 15x/month) still yields 7 slots — differs from buildCompletionSlots', () => {
    const habit = makeHabit('meditate', {
      cadence: 'monthly',
      target: { kind: 'count', operator: 'min', value: 15 },
    })
    const entries = [
      makeEntry('habit', 'meditate', '2026-03-09'),
      makeEntry('habit', 'meditate', '2026-03-11'),
    ]
    const slots = buildWeeklySliceCompletionSlots(
      habit,
      'habit',
      entries,
      [],
      makePlanning(),
      WEEK_REF,
      TODAY,
      'en',
    )

    expect(slots).toHaveLength(7) // NOT 15
    expect(slots.filter((s) => s.state === 'done').length).toBe(2)
  })
})

describe('buildMonthlyContextFooter', () => {
  it('returns undefined for weekly-cadence subjects', () => {
    const habit = makeHabit('h1', { cadence: 'weekly' })
    const footer = buildMonthlyContextFooter(habit, [], WEEK_REF)
    expect(footer).toBeUndefined()
  })

  it('completion + count target → count-progress with entry count vs target', () => {
    // 8 entries in March 2026 (only some are in the W10 week)
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 15 },
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-01'),
      makeEntry('habit', 'h1', '2026-03-03'),
      makeEntry('habit', 'h1', '2026-03-05'),
      makeEntry('habit', 'h1', '2026-03-07'),
      makeEntry('habit', 'h1', '2026-03-09'),
      makeEntry('habit', 'h1', '2026-03-10'),
      makeEntry('habit', 'h1', '2026-03-11'),
      makeEntry('habit', 'h1', '2026-03-12'),
    ]
    const footer = buildMonthlyContextFooter(habit, entries, WEEK_REF)

    expect(footer).toBeDefined()
    expect(footer!.variant).toBe('count-progress')
    expect(footer!.current).toBe(8)
    expect(footer!.target).toBe(15)
    // buildMeasurementSummary evaluates instantly (8 < 15 with operator='min' → missed),
    // not on period end. The mapping preserves 'missed' verbatim.
    expect(footer!.status).toBe('missed')
    expect(footer!.targetOperator).toBe('min')
    expect(footer!.entryCount).toBe(8)
  })

  it('emits status met when entries reach target', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-05'),
      makeEntry('habit', 'h1', '2026-03-10'),
      makeEntry('habit', 'h1', '2026-03-15'),
    ]
    const footer = buildMonthlyContextFooter(habit, entries, WEEK_REF)

    expect(footer!.status).toBe('met')
    expect(footer!.current).toBe(3)
  })

  it('completion + no target → value-label with entry count', () => {
    const tracker = makeTracker('t1', {
      cadence: 'monthly',
      entryMode: 'completion',
    })
    const entries = [
      makeEntry('tracker', 't1', '2026-03-03'),
      makeEntry('tracker', 't1', '2026-03-07'),
    ]
    const footer = buildMonthlyContextFooter(tracker, entries, WEEK_REF)

    expect(footer!.variant).toBe('value-label')
    expect(footer!.aggregationLabel).toBe('days')
    expect(footer!.entryCount).toBe(2)
  })

  it('counter + count target → count-progress with sum vs target', () => {
    const kr = makeKR('kr1', {
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 50 },
    })
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-05', 10),
      makeEntry('keyResult', 'kr1', '2026-03-10', 15),
      makeEntry('keyResult', 'kr1', '2026-03-12', 5),
    ]
    const footer = buildMonthlyContextFooter(kr, entries, WEEK_REF)

    expect(footer!.variant).toBe('count-progress')
    expect(footer!.current).toBe(30)
    expect(footer!.target).toBe(50)
  })

  it('counter + no target → value-label with sum', () => {
    const tracker = makeTracker('t1', {
      cadence: 'monthly',
      entryMode: 'counter',
    })
    const entries = [makeEntry('tracker', 't1', '2026-03-05', 12)]
    const footer = buildMonthlyContextFooter(tracker, entries, WEEK_REF)

    expect(footer!.variant).toBe('value-label')
    expect(footer!.aggregationLabel).toBe('sum')
    expect(footer!.current).toBe(12)
  })

  it('value + value-sum target → value-progress', () => {
    const kr = makeKR('kr1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 120 },
    })
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-05', 40),
      makeEntry('keyResult', 'kr1', '2026-03-10', 35),
    ]
    const footer = buildMonthlyContextFooter(kr, entries, WEEK_REF)

    expect(footer!.variant).toBe('value-progress')
    expect(footer!.current).toBe(75)
    expect(footer!.target).toBe(120)
  })

  it('value + avg target → value-label with avg', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-05', 8),
      makeEntry('habit', 'h1', '2026-03-10', 6),
    ]
    const footer = buildMonthlyContextFooter(habit, entries, WEEK_REF)

    expect(footer!.variant).toBe('value-label')
    expect(footer!.aggregationLabel).toBe('avg')
    expect(footer!.current).toBe(7) // (8+6)/2
  })

  it('rating + rating target → avg-marker with scale and target', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 },
      ratingScaleMin: 1,
      ratingScale: 5,
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-05', 4),
      makeEntry('habit', 'h1', '2026-03-10', 5),
    ]
    const footer = buildMonthlyContextFooter(habit, entries, WEEK_REF)

    expect(footer!.variant).toBe('avg-marker')
    expect(footer!.scaleMin).toBe(1)
    expect(footer!.scaleMax).toBe(5)
    expect(footer!.target).toBe(4)
    expect(footer!.current).toBe(4.5)
    expect(footer!.aggregationLabel).toBe('avg')
  })

  it('rating + no target → value-label with avg', () => {
    const tracker = makeTracker('t1', {
      cadence: 'monthly',
      entryMode: 'rating',
      ratingScale: 5,
    })
    const entries = [
      makeEntry('tracker', 't1', '2026-03-05', 3),
      makeEntry('tracker', 't1', '2026-03-10', 4),
    ]
    const footer = buildMonthlyContextFooter(tracker, entries, WEEK_REF)

    expect(footer!.variant).toBe('value-label')
    expect(footer!.aggregationLabel).toBe('avg')
    expect(footer!.current).toBe(3.5)
  })

  it('uses start-month when week straddles two months', () => {
    // 2026-W13: Mon 2026-03-30 to Sun 2026-04-05 (straddles March/April)
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 10 },
    })
    const entries = [
      // March entries
      makeEntry('habit', 'h1', '2026-03-15'),
      makeEntry('habit', 'h1', '2026-03-20'),
      makeEntry('habit', 'h1', '2026-03-30'),
      // April entry — should NOT be counted because monthRef is March
      makeEntry('habit', 'h1', '2026-04-02'),
    ]
    const footer = buildMonthlyContextFooter(habit, entries, '2026-W13' as WeekRef)

    expect(footer!.monthRef).toBe('2026-03')
    expect(footer!.current).toBe(3) // Only March entries counted
  })
})
