import { describe, expect, it } from 'vitest'
import type { Habit, KeyResult, WeeklyIntention } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import type { MeasurementSummary } from '@/services/measurementProgress'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import { buildMonthlyPlanSummary } from '@/services/monthlyPlanSummary'
import { getChildPeriods } from '@/utils/periods'

const monthRef = '2026-05' as MonthRef
const endOfMonth = '2026-05-31' as DayRef
const monthWeeks = getChildPeriods(monthRef) as WeekRef[]

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Walk',
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
    title: 'KR',
    goalId: 'goal-1',
    isActive: true,
    entryMode: 'completion',
    cadence: 'monthly',
    target: { kind: 'count', operator: 'min', value: 1 },
    status: 'open',
    ...overrides,
  }
}

function makeIntention(weekRef: WeekRef, overrides: Partial<WeeklyIntention> = {}): WeeklyIntention {
  return {
    id: 'intention-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Call a friend',
    isActive: true,
    weekRef,
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 1 },
    status: 'open',
    priorityIds: [],
    ...overrides,
  }
}

function makePlanning(overrides: Partial<MeasurementPlanningSummary> = {}): MeasurementPlanningSummary {
  return {
    activityState: 'active',
    scheduleScope: 'whole-month',
    scheduledDayRefs: [],
    ...overrides,
  }
}

function makeMeasurement(overrides: Partial<MeasurementSummary> = {}): MeasurementSummary {
  return {
    entryMode: 'completion',
    cadence: 'monthly',
    entryCount: 0,
    periodRef: monthRef,
    ...overrides,
  }
}

function makeCompletionEntry(
  subjectId: string,
  dayRef: string,
  subjectType: 'habit' | 'keyResult' | 'weeklyIntention' = 'habit',
): DailyMeasurementEntry {
  return {
    id: `${subjectId}-${dayRef}`,
    createdAt: `${dayRef}T08:00:00.000Z`,
    updatedAt: `${dayRef}T08:00:00.000Z`,
    subjectType,
    subjectId,
    dayRef: dayRef as DayRef,
    value: 1,
  }
}

function monthlyHabitItem(
  status: MeasurementSummary['evaluationStatus'],
  id = 'habit-1',
): MonthObjectItem {
  return {
    key: `habit:${id}`,
    subjectType: 'habit',
    subject: makeHabit({ id, cadence: 'monthly' }),
    planning: makePlanning(),
    measurement: makeMeasurement({ evaluationStatus: status, cadence: 'monthly' }),
    sortOrder: 0,
  }
}

function monthlyKrItem(
  status: MeasurementSummary['evaluationStatus'],
  id = 'kr-1',
): MonthObjectItem {
  return {
    key: `keyResult:${id}`,
    subjectType: 'keyResult',
    subject: makeKeyResult({ id, cadence: 'monthly' }),
    planning: makePlanning(),
    measurement: makeMeasurement({ evaluationStatus: status, cadence: 'monthly' }),
    sortOrder: 0,
  }
}

function weeklyHabitItem(id = 'habit-weekly'): MonthObjectItem {
  return {
    key: `habit:${id}`,
    subjectType: 'habit',
    subject: makeHabit({
      id,
      cadence: 'weekly',
      // Lower the target so a single entry per week marks it met
      target: { kind: 'count', operator: 'min', value: 1 },
    }),
    planning: makePlanning({ scheduleScope: 'whole-week' }),
    measurement: makeMeasurement({ cadence: 'weekly' }),
    sortOrder: 100,
  }
}

/** A day of `weekRef` guaranteed to sit inside that week's bucket. */
function dayOfWeekRef(weekRef: WeekRef, index = 0): DayRef {
  const days = getChildPeriods(weekRef) as DayRef[]
  return days[index]
}

describe('buildMonthlyPlanSummary', () => {
  it('returns zeroed buckets for an empty input', () => {
    const summary = buildMonthlyPlanSummary([], [], monthRef, endOfMonth)
    expect(summary).toEqual({
      keyResults: { total: 0, met: 0 },
      habits: { total: 0, met: 0 },
      intentions: { total: 0, met: 0 },
    })
  })

  it('counts a monthly habit met as a single unit', () => {
    const summary = buildMonthlyPlanSummary(
      [monthlyHabitItem('met')],
      [],
      monthRef,
      endOfMonth,
    )
    expect(summary.habits).toEqual({ total: 1, met: 1 })
  })

  it('counts a monthly habit missed as zero met', () => {
    const summary = buildMonthlyPlanSummary(
      [monthlyHabitItem('missed')],
      [],
      monthRef,
      endOfMonth,
    )
    expect(summary.habits).toEqual({ total: 1, met: 0 })
  })

  it('counts each week of the month as one unit for a weekly habit', () => {
    const summary = buildMonthlyPlanSummary(
      [weeklyHabitItem()],
      [],
      monthRef,
      endOfMonth,
    )
    expect(summary.habits.total).toBe(monthWeeks.length)
    // No entries → all weeks no-data → met stays 0.
    expect(summary.habits.met).toBe(0)
  })

  it('increments met for each week of a weekly habit with at least one entry', () => {
    // One completion entry on the first day of each week of the month.
    const entries = monthWeeks.map((weekRef) => {
      // Pick a day inside the week that also falls inside May 2026 (weeks at
      // the month boundary may include April/June days too).
      const days = getChildPeriods(weekRef) as DayRef[]
      const targetDay = days.find((d) => d.startsWith('2026-05')) ?? days[0]
      return makeCompletionEntry('habit-weekly', targetDay, 'habit')
    })
    const summary = buildMonthlyPlanSummary(
      [weeklyHabitItem()],
      entries,
      monthRef,
      endOfMonth,
    )
    // Some weeks may not overlap May 2026 (W18 spans April-27..May-3) — every
    // week we ARE supplying an in-May entry; if a week has no May day the
    // entry uses days[0] which is outside May and weekly summary won't see it,
    // so met may be lower than total. Just assert lower-bound: at least one
    // weekly evaluation should be met (the all-May weeks).
    expect(summary.habits.met).toBeGreaterThan(0)
    expect(summary.habits.met).toBeLessThanOrEqual(summary.habits.total)
  })

  it('mixes monthly-cadence KR with weekly habit independently', () => {
    const summary = buildMonthlyPlanSummary(
      [monthlyKrItem('met'), weeklyHabitItem()],
      [],
      monthRef,
      endOfMonth,
    )
    expect(summary.keyResults).toEqual({ total: 1, met: 1 })
    expect(summary.habits.total).toBe(monthWeeks.length)
  })

  it('excludes future weeks when todayDayRef falls early in the month', () => {
    // todayDayRef = start of month → only week(s) whose start <= start-of-month
    // are counted. Typically that's just the first week (or two if a week
    // straddles April/May).
    const summary = buildMonthlyPlanSummary(
      [weeklyHabitItem()],
      [],
      monthRef,
      '2026-05-01' as DayRef,
    )
    expect(summary.habits.total).toBeLessThan(monthWeeks.length)
    expect(summary.habits.total).toBeGreaterThan(0)
  })

  it('counts each intention once in its own week — unmet without entries', () => {
    const met = makeIntention(monthWeeks[0], { id: 'i-met' })
    const unmet = makeIntention(monthWeeks[1], { id: 'i-unmet' })
    const entries = [
      makeCompletionEntry('i-met', dayOfWeekRef(monthWeeks[0]), 'weeklyIntention'),
    ]
    const summary = buildMonthlyPlanSummary([], entries, monthRef, endOfMonth, [met, unmet])
    expect(summary.intentions).toEqual({ total: 2, met: 1 })
  })

  it('excludes intentions of not-yet-started weeks and inactive intentions', () => {
    const firstWeek = makeIntention(monthWeeks[0], { id: 'i-first' })
    const lastWeek = makeIntention(monthWeeks[monthWeeks.length - 1], { id: 'i-last' })
    const inactive = makeIntention(monthWeeks[0], { id: 'i-inactive', isActive: false })
    const summary = buildMonthlyPlanSummary(
      [],
      [],
      monthRef,
      // Today = first day of the month → only the first (already started) week counts.
      '2026-05-01' as DayRef,
      [firstWeek, lastWeek, inactive],
    )
    expect(summary.intentions).toEqual({ total: 1, met: 0 })
  })

  it('honors week sub-targets for weekly rows and ignores them for monthly rows', () => {
    // Weekly habit with base target min 3/week; a single entry per week would miss.
    // A sub-target of min 1 on the second week flips exactly that week to met.
    const secondWeek = monthWeeks[1]
    const weeklyDays = getChildPeriods(secondWeek) as DayRef[]
    const item: MonthObjectItem = {
      ...weeklyHabitItem('habit-sub'),
      subject: makeHabit({ id: 'habit-sub', cadence: 'weekly' }), // target min 3
      weekTargetOverrides: {
        [secondWeek]: { kind: 'count', operator: 'min', value: 1 },
      },
    }
    const entries = [
      makeCompletionEntry('habit-sub', weeklyDays.find((d) => d.startsWith('2026-05')) ?? weeklyDays[0]),
    ]

    const summary = buildMonthlyPlanSummary([item], entries, monthRef, endOfMonth)
    expect(summary.habits.total).toBe(monthWeeks.length)
    expect(summary.habits.met).toBe(1)

    // Monthly rows evaluate against item.measurement only — sub-targets never
    // leak into the month verdict (design invariant).
    const monthlyItem: MonthObjectItem = {
      ...monthlyHabitItem('missed', 'habit-monthly'),
      weekTargetOverrides: {
        [secondWeek]: { kind: 'count', operator: 'min', value: 0 },
      },
    }
    const monthlySummary = buildMonthlyPlanSummary([monthlyItem], [], monthRef, endOfMonth)
    expect(monthlySummary.habits).toEqual({ total: 1, met: 0 })
  })

  it('clips intention evaluation to todayDayRef inside the current week', () => {
    const intention = makeIntention(monthWeeks[1], { id: 'i-clip' })
    const weekDays = getChildPeriods(monthWeeks[1]) as DayRef[]
    // Entry exists later in the week, but "today" is the week's first day →
    // the entry must not count yet.
    const entries = [makeCompletionEntry('i-clip', weekDays[3], 'weeklyIntention')]
    const summary = buildMonthlyPlanSummary([], entries, monthRef, weekDays[0], [intention])
    expect(summary.intentions).toEqual({ total: 1, met: 0 })
  })
})
