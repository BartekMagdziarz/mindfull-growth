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

    const slots = buildCompletionSlots(kr, 'keyResult', entries, assignments, planning, WEEK_REF, TODAY)

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

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY)

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

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY)

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

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY)

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

    const slots = buildCompletionSlots(kr, 'keyResult', entries, [], planning, WEEK_REF, TODAY)

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

    const slots = buildCompletionSlots(tracker, 'tracker', entries, [], planning, WEEK_REF, TODAY)

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

    const slots = buildDailyBarSlots(habit, 'habit', entries, [], planning, WEEK_REF, TODAY)

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

    const slots = buildDailyBarSlots(habit, 'habit', entries, assignments, planning, monthRef, TODAY)

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

    const slots = buildDailyBarSlots(habit, 'habit', entries, [], planning, monthRef, TODAY)

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

    const slots = buildValueLineSlots(tracker, 'tracker', entries, WEEK_REF, TODAY)

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

    const slots = buildValueLineSlots(habit, 'habit', entries, WEEK_REF, TODAY)

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

    const slots = buildValueLineSlots(tracker, 'tracker', entries, monthRef, TODAY)

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
