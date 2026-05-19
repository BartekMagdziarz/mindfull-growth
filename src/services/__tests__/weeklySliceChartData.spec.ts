import { describe, expect, it } from 'vitest'
import type { DayRef, WeekRef } from '@/domain/period'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
  MeasurementSubjectType,
} from '@/domain/planningState'
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

function makeAssignment(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  dayRef: string,
): MeasurementDayAssignment {
  return {
    id: `assignment-${dayRef}-${subjectId}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
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
  describe('monthly cadence (or tracker without target) → 7 Mon–Sun slots, never red', () => {
    it('returns exactly 7 day-slots regardless of monthly target size', () => {
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

    it('marks entries as done and past days WITHOUT entry as neutral (future), not missed', () => {
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
      // Monthly habit with no per-day plan: Wednesday wasn't scheduled, so the
      // absence of an entry isn't a "miss" — keep it neutral.
      expect(slots[2].state).toBe('future') // Wed (past, no entry, no plan)
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

    it('weekly tracker without a target → 7 Mon–Sun slots, never red', () => {
      const tracker = makeTracker('t1', {
        cadence: 'weekly',
        entryMode: 'completion',
      })
      const entries = [makeEntry('tracker', 't1', '2026-03-09')] // Mon only
      const slots = buildWeeklySliceCompletionSlots(
        tracker,
        'tracker',
        entries,
        [],
        makePlanning(),
        WEEK_REF,
        TODAY,
        'en',
      )
      expect(slots).toHaveLength(7)
      expect(slots[0].state).toBe('done') // Mon
      expect(slots.filter((s) => s.state === 'missed').length).toBe(0)
    })
  })

  describe('specific-days scope → only scheduled days as slots', () => {
    it('returns one slot per scheduled day in this week (not all 7)', () => {
      const habit = makeHabit('h1', { cadence: 'weekly' })
      const planning = makePlanning({
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-10', '2026-03-12'] as DayRef[], // Tue, Thu
      })
      const assignments = [
        makeAssignment('habit', 'h1', '2026-03-10'),
        makeAssignment('habit', 'h1', '2026-03-12'),
      ]
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        [],
        assignments,
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )

      expect(slots).toHaveLength(2)
      expect(slots[0].dayRef).toBe('2026-03-10') // Tue
      expect(slots[1].dayRef).toBe('2026-03-12') // Thu
    })

    it('marks a scheduled past day without an entry as missed (red)', () => {
      const habit = makeHabit('h1', { cadence: 'weekly' })
      const planning = makePlanning({
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-10'] as DayRef[], // Tue (past)
      })
      const assignments = [makeAssignment('habit', 'h1', '2026-03-10')]
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        [],
        assignments,
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )

      expect(slots).toHaveLength(1)
      expect(slots[0].state).toBe('missed')
    })

    it('marks a scheduled past day with an entry as done', () => {
      const habit = makeHabit('h1', { cadence: 'weekly' })
      const planning = makePlanning({
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-10'] as DayRef[],
      })
      const assignments = [makeAssignment('habit', 'h1', '2026-03-10')]
      const entries = [makeEntry('habit', 'h1', '2026-03-10')]
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        entries,
        assignments,
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )

      expect(slots[0].state).toBe('done')
    })

    it('today with no entry → today-pending; today with entry → today-done', () => {
      const habit = makeHabit('h1', { cadence: 'weekly' })
      const planning = makePlanning({
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-12'] as DayRef[], // Thu = today
      })
      const assignments = [makeAssignment('habit', 'h1', '2026-03-12')]

      const withoutEntry = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        [],
        assignments,
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )
      expect(withoutEntry[0].state).toBe('today-pending')

      const withEntry = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        [makeEntry('habit', 'h1', '2026-03-12')],
        assignments,
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )
      expect(withEntry[0].state).toBe('today-done')
    })

    it('marks a scheduled future day as future (not missed)', () => {
      const habit = makeHabit('h1', { cadence: 'weekly' })
      const planning = makePlanning({
        scheduleScope: 'specific-days',
        scheduledDayRefs: ['2026-03-14'] as DayRef[], // Sat (future)
      })
      const assignments = [makeAssignment('habit', 'h1', '2026-03-14')]
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        [],
        assignments,
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )

      expect(slots[0].state).toBe('future')
    })
  })

  describe('weekly cadence + count target (whole-week / unassigned) → target-count slots', () => {
    it('returns target-count slots with done entries at the front', () => {
      const habit = makeHabit('h1', {
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 5 },
      })
      const entries = [
        makeEntry('habit', 'h1', '2026-03-09'), // Mon
        makeEntry('habit', 'h1', '2026-03-10'), // Tue
      ]
      const planning = makePlanning({ scheduleScope: 'whole-week' })
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        entries,
        [],
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )

      // 2 done + today-pending (Thu) + 2 future = 5 slots (target = 5)
      expect(slots).toHaveLength(5)
      expect(slots[0].state).toBe('done')
      expect(slots[1].state).toBe('done')
    })

    it('mid-week: unfilled slots are future / today-pending — never missed', () => {
      const habit = makeHabit('h1', {
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 5 },
      })
      const entries = [
        makeEntry('habit', 'h1', '2026-03-09'),
        makeEntry('habit', 'h1', '2026-03-10'),
      ]
      const planning = makePlanning({ scheduleScope: 'whole-week' })
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        entries,
        [],
        planning,
        WEEK_REF,
        TODAY,
        'en',
      )

      expect(slots.filter((s) => s.state === 'missed').length).toBe(0)
    })

    it('after week ended with deficit: unfilled slots become missed (red)', () => {
      const habit = makeHabit('h1', {
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 5 },
      })
      const entries = [
        makeEntry('habit', 'h1', '2026-03-09'), // Mon
        makeEntry('habit', 'h1', '2026-03-10'), // Tue
      ]
      const planning = makePlanning({ scheduleScope: 'whole-week' })
      const POST_WEEK = '2026-03-16' as DayRef // Mon of next week — W10 ended
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        entries,
        [],
        planning,
        WEEK_REF,
        POST_WEEK,
        'en',
      )

      expect(slots).toHaveLength(5)
      expect(slots.filter((s) => s.state === 'done').length).toBe(2)
      expect(slots.filter((s) => s.state === 'missed').length).toBe(3)
    })

    it('unassigned scope routes the same as whole-week for weekly+count targets', () => {
      const habit = makeHabit('h1', {
        cadence: 'weekly',
        target: { kind: 'count', operator: 'min', value: 5 },
      })
      const entries = [makeEntry('habit', 'h1', '2026-03-09')]
      const slots = buildWeeklySliceCompletionSlots(
        habit,
        'habit',
        entries,
        [],
        makePlanning(), // no scheduleScope set → 'unassigned'
        WEEK_REF,
        TODAY,
        'en',
      )

      // 1 done + today-pending + 3 future = 5 slots
      expect(slots).toHaveLength(5)
    })
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

  describe('asOfDayRef cut-off', () => {
    // March 2026 weeks: W10 ends 2026-03-15, W11 ends 2026-03-22
    it('counts only entries on or before the cutoff (counter habit, completion mode)', () => {
      const habit = makeHabit('h1', {
        cadence: 'monthly',
        entryMode: 'completion',
        target: { kind: 'count', operator: 'min', value: 15 },
      })
      const entries = [
        makeEntry('habit', 'h1', '2026-03-03'),
        makeEntry('habit', 'h1', '2026-03-09'),
        makeEntry('habit', 'h1', '2026-03-12'),
        makeEntry('habit', 'h1', '2026-03-18'),
        makeEntry('habit', 'h1', '2026-03-25'),
      ]

      const w10 = buildMonthlyContextFooter(habit, entries, '2026-W10' as WeekRef, '2026-03-15' as DayRef)
      const w11 = buildMonthlyContextFooter(habit, entries, '2026-W11' as WeekRef, '2026-03-22' as DayRef)

      // W10 cutoff = 2026-03-15: three entries (3, 9, 12) included; 18, 25 excluded.
      expect(w10!.current).toBe(3)
      expect(w10!.entryCount).toBe(3)
      // W11 cutoff = 2026-03-22: 18 included; 25 still excluded.
      expect(w11!.current).toBe(4)
      expect(w11!.entryCount).toBe(4)
    })

    it('averages only entries through the cutoff for rating subjects', () => {
      const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'rating', ratingScale: 5 })
      const entries = [
        makeEntry('tracker', 't1', '2026-03-03', 5),
        makeEntry('tracker', 't1', '2026-03-09', 3),
        makeEntry('tracker', 't1', '2026-03-22', 1),
      ]

      const w10 = buildMonthlyContextFooter(tracker, entries, '2026-W10' as WeekRef, '2026-03-15' as DayRef)
      const w11 = buildMonthlyContextFooter(tracker, entries, '2026-W11' as WeekRef, '2026-03-22' as DayRef)

      // W10 cutoff: avg of [5, 3] = 4
      expect(w10!.current).toBe(4)
      // W11 cutoff includes the 1: avg of [5, 3, 1] = 3
      expect(w11!.current).toBe(3)
    })

    it('without asOfDayRef the footer behaves as before (full-month aggregate)', () => {
      const habit = makeHabit('h1', { cadence: 'monthly', entryMode: 'completion' })
      const entries = [
        makeEntry('habit', 'h1', '2026-03-03'),
        makeEntry('habit', 'h1', '2026-03-09'),
        makeEntry('habit', 'h1', '2026-03-22'),
      ]

      const footer = buildMonthlyContextFooter(habit, entries, '2026-W10' as WeekRef)

      // No cut-off → all March entries counted regardless of weekRef.
      expect(footer!.current).toBe(3)
      expect(footer!.entryCount).toBe(3)
    })
  })
})
