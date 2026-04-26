import { describe, expect, it } from 'vitest'
import type { DayRef, PeriodRef, WeekRef, MonthRef } from '@/domain/period'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildCompletionSlots,
  buildDailyBarSlots,
  buildValueLineSlots,
  buildAggregateData,
  buildCounterRingData,
  buildValueSparklineData,
  buildRatingSmoothData,
  buildSummaryNumberData,
  filterToScheduledSlots,
} from '@/services/todayChartData'

// --- Test helpers ---

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
    id: `assign-${dayRef}-${subjectId}`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
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
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...overrides,
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
    cadence: 'weekly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 5 },
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
    cadence: 'weekly',
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

function makeSummary(overrides: Partial<MeasurementSummary> = {}): MeasurementSummary {
  return {
    entryMode: 'counter',
    cadence: 'weekly',
    entryCount: 0,
    periodRef: '2026-W10' as WeekRef as any,
    ...overrides,
  }
}

// Week 2026-W10: Mon 2026-03-09 to Sun 2026-03-15
const WEEK_REF = '2026-W10' as WeekRef as PeriodRef
const TODAY = '2026-03-12' as DayRef // Thursday

describe('buildCompletionSlots', () => {
  it('specific-days weekly: 3 scheduled, 2 done, 1 future', () => {
    const kr = makeKR('kr1')
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-09'),
      makeEntry('keyResult', 'kr1', '2026-03-10'),
    ]
    const assignments = [
      makeAssignment('keyResult', 'kr1', '2026-03-09'),
      makeAssignment('keyResult', 'kr1', '2026-03-10'),
      makeAssignment('keyResult', 'kr1', '2026-03-14'),
    ]
    const planning = makePlanning({
      scheduleScope: 'specific-days',
      scheduledDayRefs: ['2026-03-09', '2026-03-10', '2026-03-14'] as DayRef[],
    })

    const slots = buildCompletionSlots(kr, 'keyResult', entries, assignments, planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(3)
    expect(slots[0].state).toBe('done')
    expect(slots[1].state).toBe('done')
    expect(slots[2].state).toBe('future')
    expect(slots[0].label).toBeTruthy()
  })

  it('whole-week: target 5, 3 entries', () => {
    const kr = makeKR('kr1', { target: { kind: 'count', operator: 'min', value: 5 } })
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-09'),
      makeEntry('keyResult', 'kr1', '2026-03-10'),
      makeEntry('keyResult', 'kr1', '2026-03-11'),
    ]
    const planning = makePlanning({ scheduleScope: 'whole-week' })

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(5)
    expect(slots.filter(s => s.state === 'done')).toHaveLength(3)
    expect(slots.filter(s => s.state === 'today-pending')).toHaveLength(1)
    expect(slots.filter(s => s.state === 'future')).toHaveLength(1)
  })

  it('overachievement: target 3, 4 entries', () => {
    const kr = makeKR('kr1', { target: { kind: 'count', operator: 'min', value: 3 } })
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-09'),
      makeEntry('keyResult', 'kr1', '2026-03-10'),
      makeEntry('keyResult', 'kr1', '2026-03-11'),
      makeEntry('keyResult', 'kr1', '2026-03-12'),
    ]
    const planning = makePlanning({ scheduleScope: 'whole-week' })

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(4) // 4 entries > 3 target
    expect(slots.filter(s => s.state === 'done' || s.state === 'today-done')).toHaveLength(4)
  })

  it('target met from past entries: today-pending slot still appended', () => {
    // Target 3, entries on Mon/Tue/Wed (all before today=Thu). Today has no entry.
    // The user should still be able to record a 4th entry beyond the target.
    const kr = makeKR('kr1', { target: { kind: 'count', operator: 'min', value: 3 } })
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-09'),
      makeEntry('keyResult', 'kr1', '2026-03-10'),
      makeEntry('keyResult', 'kr1', '2026-03-11'),
    ]
    const planning = makePlanning({ scheduleScope: 'whole-week' })

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(4) // 3 done + 1 today-pending (beyond target)
    expect(slots.filter(s => s.state === 'done')).toHaveLength(3)
    expect(slots.filter(s => s.state === 'today-pending')).toHaveLength(1)
    expect(slots[3].isToday).toBe(true)
  })

  it('target met including today: no extra slot needed', () => {
    // Target 3, today already has an entry. No extra slot needed.
    const kr = makeKR('kr1', { target: { kind: 'count', operator: 'min', value: 3 } })
    const entries = [
      makeEntry('keyResult', 'kr1', '2026-03-09'),
      makeEntry('keyResult', 'kr1', '2026-03-10'),
      makeEntry('keyResult', 'kr1', '2026-03-12'), // today
    ]
    const planning = makePlanning({ scheduleScope: 'whole-week' })

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(3) // 3 done, today already has a slot
    expect(slots.filter(s => s.state === 'today-done')).toHaveLength(1)
    expect(slots.filter(s => s.state === 'today-pending')).toHaveLength(0)
  })

  it('tracker (no target): 2 entries + today placeholder', () => {
    const tracker = makeTracker('t1', { entryMode: 'completion' })
    const entries = [
      makeEntry('tracker', 't1', '2026-03-09'),
      makeEntry('tracker', 't1', '2026-03-10'),
    ]
    const planning = makePlanning({ scheduleScope: 'whole-week' })

    const slots = buildCompletionSlots(tracker, 'tracker', entries, [], planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(3) // 2 done + today-pending
    expect(slots.filter(s => s.state === 'done')).toHaveLength(2)
    expect(slots.filter(s => s.state === 'today-pending')).toHaveLength(1)
  })
})

describe('buildDailyBarSlots', () => {
  it('weekly counter: 7 slots with values from entries', () => {
    const habit = makeHabit('h1', { entryMode: 'counter' })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-09', 5),
      makeEntry('habit', 'h1', '2026-03-10', 3),
      makeEntry('habit', 'h1', '2026-03-12', 7),
    ]
    const planning = makePlanning({ scheduleScope: 'whole-week' })

    const slots = buildDailyBarSlots(habit, 'habit', entries, [], planning, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(7)
    expect(slots[0].value).toBe(5) // Monday
    expect(slots[1].value).toBe(3) // Tuesday
    expect(slots[2].value).toBeUndefined() // Wednesday
    expect(slots[3].value).toBe(7) // Thursday (today)
    expect(slots[3].isToday).toBe(true)
    expect(slots[4].isFuture).toBe(true) // Friday
  })

  it('monthly specific-days: only scheduled day slots', () => {
    const monthRef = '2026-03' as MonthRef as PeriodRef
    const habit = makeHabit('h1', { cadence: 'monthly', entryMode: 'counter' })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-05', 10),
      makeEntry('habit', 'h1', '2026-03-15', 8),
    ]
    const assignments = [
      makeAssignment('habit', 'h1', '2026-03-05'),
      makeAssignment('habit', 'h1', '2026-03-15'),
      makeAssignment('habit', 'h1', '2026-03-25'),
    ]
    const planning = makePlanning({ scheduleScope: 'specific-days' })

    const slots = buildDailyBarSlots(habit, 'habit', entries, assignments, planning, monthRef, TODAY, 'en')

    expect(slots).toHaveLength(3)
    expect(slots[0].value).toBe(10)
    expect(slots[0].label).toBe('5')
    expect(slots[1].value).toBe(8)
    expect(slots[2].value).toBeUndefined()
    expect(slots[2].isFuture).toBe(true)
  })

  it('monthly whole-month: entry-day slots + today', () => {
    const monthRef = '2026-03' as MonthRef as PeriodRef
    const habit = makeHabit('h1', { cadence: 'monthly', entryMode: 'counter' })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-01', 4),
      makeEntry('habit', 'h1', '2026-03-05', 6),
    ]
    const planning = makePlanning({ scheduleScope: 'whole-month' })

    const slots = buildDailyBarSlots(habit, 'habit', entries, [], planning, monthRef, TODAY, 'en')

    expect(slots).toHaveLength(3) // 2 entry days + today
    expect(slots[0].label).toBe('1')
    expect(slots[0].value).toBe(4)
    expect(slots[1].label).toBe('5')
    expect(slots[2].isToday).toBe(true)
    expect(slots[2].label).toBe('12')
  })
})

describe('buildValueLineSlots', () => {
  it('weekly tracker: 7 slots with undefined for missing days', () => {
    const tracker = makeTracker('t1')
    const entries = [
      makeEntry('tracker', 't1', '2026-03-09', 3.5),
      makeEntry('tracker', 't1', '2026-03-11', 4.2),
    ]

    const slots = buildValueLineSlots(tracker, 'tracker', entries, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(7)
    expect(slots[0].value).toBe(3.5) // Monday
    expect(slots[1].value).toBeUndefined() // Tuesday (gap)
    expect(slots[2].value).toBe(4.2) // Wednesday
    expect(slots[3].isToday).toBe(true)
  })

  it('weekly habit: 7 slots with values on entry days only', () => {
    const habit = makeHabit('h1', {
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-10', 6.8),
      makeEntry('habit', 'h1', '2026-03-12', 7.4),
    ]

    const slots = buildValueLineSlots(habit, 'habit', entries, WEEK_REF, TODAY, 'en')

    expect(slots).toHaveLength(7)
    expect(slots[0].value).toBeUndefined()
    expect(slots[1].value).toBe(6.8)
    expect(slots[3].value).toBe(7.4)
    expect(slots[3].isToday).toBe(true)
  })

  it('monthly: slots for days with entries only', () => {
    const monthRef = '2026-03' as MonthRef as PeriodRef
    const tracker = makeTracker('t1', { cadence: 'monthly' })
    const entries = [
      makeEntry('tracker', 't1', '2026-03-01', 10),
      makeEntry('tracker', 't1', '2026-03-10', 15),
    ]

    const slots = buildValueLineSlots(tracker, 'tracker', entries, monthRef, TODAY, 'en')

    expect(slots).toHaveLength(2)
    expect(slots[0].value).toBe(10)
    expect(slots[1].value).toBe(15)
  })
})

describe('buildAggregateData', () => {
  it('sum/min: 15/20 in-progress', () => {
    const habit = makeHabit('h1', {
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 20 },
    })
    const summary = makeSummary({ actualValue: 15, entryCount: 3 })

    const data = buildAggregateData(habit, summary)

    expect(data).toBeDefined()
    expect(data!.currentValue).toBe(15)
    expect(data!.targetValue).toBe(20)
    expect(data!.scaleMax).toBe(20)
    expect(data!.status).toBe('in-progress')
    expect(data!.operator).toBe('min')
  })

  it('sum/min: overachievement 25/20 met', () => {
    const habit = makeHabit('h1', {
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 20 },
    })
    const summary = makeSummary({ actualValue: 25, entryCount: 5, evaluationStatus: 'met' })

    const data = buildAggregateData(habit, summary)

    expect(data!.scaleMax).toBe(25)
    expect(data!.status).toBe('met')
  })

  it('max operator: 3/5 met', () => {
    const habit = makeHabit('h1', {
      entryMode: 'counter',
      target: { kind: 'count', operator: 'max', value: 5 },
    })
    const summary = makeSummary({ actualValue: 3, entryCount: 2, evaluationStatus: 'met' })

    const data = buildAggregateData(habit, summary)

    expect(data!.operator).toBe('max')
    expect(data!.status).toBe('met')
  })

  it('max operator: 7/5 missed', () => {
    const habit = makeHabit('h1', {
      entryMode: 'counter',
      target: { kind: 'count', operator: 'max', value: 5 },
    })
    const summary = makeSummary({ actualValue: 7, entryCount: 3, evaluationStatus: 'missed' })

    const data = buildAggregateData(habit, summary)

    expect(data!.operator).toBe('max')
    expect(data!.status).toBe('missed')
  })

  it('avg rating: 8.2/>=7 met', () => {
    const kr = makeKR('kr1', {
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const summary = makeSummary({
      entryMode: 'rating',
      actualValue: 8.2,
      entryCount: 5,
      evaluationStatus: 'met',
    })

    const data = buildAggregateData(kr, summary)

    expect(data!.currentValue).toBe(8.2)
    expect(data!.targetValue).toBe(7)
    expect(data!.status).toBe('met')
    expect(data!.aggregation).toBe('average')
    expect(data!.hoverLabel).toContain('avg:')
  })

  it('returns undefined for completion mode', () => {
    const kr = makeKR('kr1', { entryMode: 'completion' })
    const summary = makeSummary({ entryMode: 'completion', actualValue: 3, entryCount: 3 })

    expect(buildAggregateData(kr, summary)).toBeUndefined()
  })

  it('returns undefined for tracker (no target)', () => {
    const tracker = makeTracker('t1')
    const summary = makeSummary({ actualValue: 5, entryCount: 2 })

    expect(buildAggregateData(tracker, summary)).toBeUndefined()
  })
})

describe('filterToScheduledSlots', () => {
  it('returns only scheduled slots when at least one is scheduled', () => {
    const slots = [
      { dayRef: '2026-03-09' as DayRef, isScheduled: true },
      { dayRef: '2026-03-10' as DayRef, isScheduled: false },
      { dayRef: '2026-03-11' as DayRef, isScheduled: true },
      { dayRef: '2026-03-12' as DayRef, isScheduled: false },
      { dayRef: '2026-03-13' as DayRef, isScheduled: true },
    ]

    const result = filterToScheduledSlots(slots)

    expect(result).toHaveLength(3)
    expect(result.map(s => s.dayRef)).toEqual([
      '2026-03-09',
      '2026-03-11',
      '2026-03-13',
    ])
  })

  it('returns all slots unchanged when none are scheduled', () => {
    const slots = [
      { dayRef: '2026-03-09' as DayRef, isScheduled: false },
      { dayRef: '2026-03-10' as DayRef, isScheduled: false },
      { dayRef: '2026-03-11' as DayRef, isScheduled: false },
    ]

    const result = filterToScheduledSlots(slots)

    expect(result).toHaveLength(3)
    expect(result).toBe(slots)
  })

  it('returns every slot when all are scheduled', () => {
    const slots = [
      { dayRef: '2026-03-09' as DayRef, isScheduled: true },
      { dayRef: '2026-03-10' as DayRef, isScheduled: true },
    ]

    const result = filterToScheduledSlots(slots)

    expect(result).toHaveLength(2)
    expect(result.map(s => s.dayRef)).toEqual(['2026-03-09', '2026-03-10'])
  })
})

// Monthly context used across the summary-primitive builder tests.
const MONTH_REF = '2026-03' as MonthRef as PeriodRef

describe('buildCounterRingData', () => {
  it('returns undefined when there is no target', () => {
    const tracker = makeTracker('t1', { entryMode: 'counter' })
    const summary = makeSummary({ entryMode: 'counter' })
    expect(buildCounterRingData(tracker, summary)).toBeUndefined()
  })

  it('returns undefined for rating targets', () => {
    const kr = makeKR('kr1', {
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 4 },
    })
    const summary = makeSummary({ entryMode: 'rating', actualValue: 4 })
    expect(buildCounterRingData(kr, summary)).toBeUndefined()
  })

  it('returns undefined for value targets with avg aggregation', () => {
    const habit = makeHabit('h1', {
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const summary = makeSummary({ entryMode: 'value', actualValue: 7 })
    expect(buildCounterRingData(habit, summary)).toBeUndefined()
  })

  it('builds ring data for count target in progress (empty month)', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 50 },
    })
    const summary = makeSummary({
      entryMode: 'counter',
      cadence: 'monthly',
      entryCount: 0,
    })

    const data = buildCounterRingData(habit, summary)

    expect(data).toEqual({
      current: 0,
      target: 50,
      status: 'in-progress',
      operator: 'min',
    })
  })

  it('builds ring data for met count target', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 50 },
    })
    const summary = makeSummary({
      entryMode: 'counter',
      cadence: 'monthly',
      actualValue: 62,
      entryCount: 20,
      evaluationStatus: 'met',
    })

    const data = buildCounterRingData(habit, summary)

    expect(data).toEqual({
      current: 62,
      target: 50,
      status: 'met',
      operator: 'min',
    })
  })

  it('builds ring data for value-sum target missed', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 120 },
    })
    const summary = makeSummary({
      entryMode: 'value',
      cadence: 'monthly',
      actualValue: 80,
      entryCount: 10,
      evaluationStatus: 'missed',
    })

    const data = buildCounterRingData(habit, summary)

    expect(data).toEqual({
      current: 80,
      target: 120,
      status: 'missed',
      operator: 'gte',
    })
  })

  it('preserves max operator on count targets', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'max', value: 20 },
    })
    const summary = makeSummary({
      entryMode: 'counter',
      cadence: 'monthly',
      actualValue: 25,
      entryCount: 10,
      evaluationStatus: 'missed',
    })

    const data = buildCounterRingData(habit, summary)

    expect(data?.operator).toBe('max')
    expect(data?.status).toBe('missed')
  })
})

describe('buildValueSparklineData', () => {
  it('returns empty data for a month with no entries', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const summary = makeSummary({
      entryMode: 'value',
      cadence: 'monthly',
      entryCount: 0,
      target: habit.target,
    })

    const data = buildValueSparklineData(habit, 'habit', [], MONTH_REF, TODAY, summary, 'en')

    expect(data.points).toEqual([])
    expect(data.hasData).toBe(false)
    expect(data.aggregate).toBe(0)
    expect(data.entryCount).toBe(0)
    expect(data.aggregationLabel).toBe('avg')
    expect(data.targetValue).toBe(7)
  })

  it('builds points and avg label for met average target', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-05', 7.2),
      makeEntry('habit', 'h1', '2026-03-15', 8.1),
      makeEntry('habit', 'h1', '2026-03-25', 7.5),
    ]
    const summary = makeSummary({
      entryMode: 'value',
      cadence: 'monthly',
      actualValue: 7.6,
      entryCount: 3,
      target: habit.target,
      evaluationStatus: 'met',
    })

    const data = buildValueSparklineData(habit, 'habit', entries, MONTH_REF, TODAY, summary, 'en')

    expect(data.points).toHaveLength(3)
    expect(data.hasData).toBe(true)
    expect(data.aggregate).toBeCloseTo(7.6)
    expect(data.aggregationLabel).toBe('avg')
    expect(data.targetValue).toBe(7)
    expect(data.status).toBe('met')
  })

  it('builds last-aggregation label for last target missed', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'last', operator: 'gte', value: 9 },
    })
    const entries = [
      makeEntry('habit', 'h1', '2026-03-01', 8),
      makeEntry('habit', 'h1', '2026-03-10', 7),
    ]
    const summary = makeSummary({
      entryMode: 'value',
      cadence: 'monthly',
      actualValue: 7,
      entryCount: 2,
      target: habit.target,
      evaluationStatus: 'missed',
    })

    const data = buildValueSparklineData(habit, 'habit', entries, MONTH_REF, TODAY, summary, 'en')

    expect(data.aggregationLabel).toBe('last')
    expect(data.status).toBe('missed')
    expect(data.points).toHaveLength(2)
  })

  it('builds tracker sparkline with last label and no status', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'value' })
    const entries = [
      makeEntry('tracker', 't1', '2026-03-02', 72),
      makeEntry('tracker', 't1', '2026-03-12', 74),
    ]
    const summary = makeSummary({
      entryMode: 'value',
      cadence: 'monthly',
      actualValue: 74,
      entryCount: 2,
    })

    const data = buildValueSparklineData(tracker, 'tracker', entries, MONTH_REF, TODAY, summary, 'en')

    expect(data.aggregationLabel).toBe('last')
    expect(data.targetValue).toBeUndefined()
    expect(data.status).toBeUndefined()
    expect(data.hasData).toBe(true)
    expect(data.points).toHaveLength(2)
  })

  it('passes sum-aggregation label through', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'value',
      target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 120 },
    })
    const summary = makeSummary({
      entryMode: 'value',
      cadence: 'monthly',
      actualValue: 120,
      entryCount: 10,
      target: habit.target,
      evaluationStatus: 'met',
    })

    const data = buildValueSparklineData(habit, 'habit', [], MONTH_REF, TODAY, summary, 'en')

    expect(data.aggregationLabel).toBe('sum')
  })
})

describe('buildRatingSmoothData', () => {
  it('returns empty data for a month with no entries', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'rating' })
    const summary = makeSummary({ entryMode: 'rating', cadence: 'monthly', entryCount: 0 })

    const data = buildRatingSmoothData(tracker, summary)

    expect(data).toEqual({
      averageValue: 0,
      scaleMin: 1,
      scaleMax: 10,
      entryCount: 0,
      targetValue: undefined,
      targetOperator: undefined,
      status: undefined,
    })
  })

  it('builds data for met rating target with gte operator', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const summary = makeSummary({
      entryMode: 'rating',
      cadence: 'monthly',
      actualValue: 8.2,
      entryCount: 15,
      target: habit.target,
      evaluationStatus: 'met',
    })

    const data = buildRatingSmoothData(habit, summary)

    expect(data.averageValue).toBeCloseTo(8.2)
    expect(data.targetValue).toBe(7)
    expect(data.targetOperator).toBe('gte')
    expect(data.status).toBe('met')
    expect(data.entryCount).toBe(15)
  })

  it('builds data for missed rating target', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 7 },
    })
    const summary = makeSummary({
      entryMode: 'rating',
      cadence: 'monthly',
      actualValue: 5.1,
      entryCount: 8,
      target: habit.target,
      evaluationStatus: 'missed',
    })

    const data = buildRatingSmoothData(habit, summary)

    expect(data.status).toBe('missed')
    expect(data.targetValue).toBe(7)
  })

  it('preserves lte operator when provided', () => {
    const habit = makeHabit('h1', {
      cadence: 'monthly',
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'lte', value: 3 },
    })
    const summary = makeSummary({
      entryMode: 'rating',
      cadence: 'monthly',
      actualValue: 2.5,
      entryCount: 10,
      target: habit.target,
      evaluationStatus: 'met',
    })

    const data = buildRatingSmoothData(habit, summary)

    expect(data.targetOperator).toBe('lte')
    expect(data.status).toBe('met')
  })

  it('returns undefined target fields for trackers without a target', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'rating' })
    const summary = makeSummary({
      entryMode: 'rating',
      cadence: 'monthly',
      actualValue: 6.7,
      entryCount: 5,
    })

    const data = buildRatingSmoothData(tracker, summary)

    expect(data.averageValue).toBeCloseTo(6.7)
    expect(data.targetValue).toBeUndefined()
    expect(data.targetOperator).toBeUndefined()
    expect(data.status).toBeUndefined()
  })
})

describe('buildSummaryNumberData', () => {
  it('returns days-logged for tracker completion', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'completion' })
    const summary = makeSummary({
      entryMode: 'completion',
      cadence: 'monthly',
      entryCount: 17,
    })

    const data = buildSummaryNumberData(tracker, 'tracker', [], MONTH_REF, summary)

    expect(data).toEqual({
      value: 17,
      entryCount: 17,
      sublabelKind: 'days-logged',
    })
  })

  it('returns total-sum for tracker counter', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'counter' })
    const summary = makeSummary({
      entryMode: 'counter',
      cadence: 'monthly',
      actualValue: 450,
      entryCount: 22,
    })

    const data = buildSummaryNumberData(tracker, 'tracker', [], MONTH_REF, summary)

    expect(data).toEqual({
      value: 450,
      entryCount: 22,
      sublabelKind: 'total-sum',
    })
  })

  it('returns zeroed data for an empty month (completion)', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'completion' })
    const summary = makeSummary({
      entryMode: 'completion',
      cadence: 'monthly',
      entryCount: 0,
    })

    const data = buildSummaryNumberData(tracker, 'tracker', [], MONTH_REF, summary)

    expect(data.value).toBe(0)
    expect(data.entryCount).toBe(0)
    expect(data.sublabelKind).toBe('days-logged')
  })

  it('returns zeroed value for a counter tracker with no entries', () => {
    const tracker = makeTracker('t1', { cadence: 'monthly', entryMode: 'counter' })
    const summary = makeSummary({
      entryMode: 'counter',
      cadence: 'monthly',
      entryCount: 0,
    })

    const data = buildSummaryNumberData(tracker, 'tracker', [], MONTH_REF, summary)

    expect(data.value).toBe(0)
    expect(data.sublabelKind).toBe('total-sum')
  })
})
