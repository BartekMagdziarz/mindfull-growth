import { describe, expect, it } from 'vitest'
import type { Habit } from '@/domain/planning'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { WeekPlanningBundle, WeekReflectionBundle } from '@/services/planningStateQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import { buildPeriodActivity } from '@/services/periodActivity'
import type { WeekV2OverviewData } from '@/services/weekV2Overview'
import { buildWeekV2OverviewViewModel } from '@/services/weekV2Overview'

const WEEK = '2026-W26' as WeekRef // 29 Jun – 5 Jul, boundary week
const TODAY = '2026-07-02' as DayRef

function habit(): Habit {
  return {
    id: 'habit-1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Meditation', isActive: true, priorityIds: [], lifeAreaIds: [], entryMode: 'completion',
    cadence: 'weekly', target: { kind: 'count', operator: 'min', value: 2 }, status: 'open',
  }
}

function entry(dayRef: string): DailyMeasurementEntry {
  return { id: dayRef, createdAt: `${dayRef}T08:00:00.000Z`, updatedAt: `${dayRef}T08:00:00.000Z`, subjectType: 'habit', subjectId: 'habit-1', dayRef: dayRef as DayRef, value: null }
}

function data(): WeekV2OverviewData {
  const subject = habit()
  const entries = [entry('2026-06-30'), entry('2026-07-02')]
  const item = {
    subjectType: 'habit', subject, planning: { scheduledDayRefs: ['2026-06-29' as DayRef, '2026-06-30' as DayRef] },
    measurement: buildMeasurementSummary(subject, entries, WEEK, TODAY), placement: 'assigned',
  }
  return {
    weekRef: WEEK,
    todayRef: TODAY,
    planning: {
      weekRef: WEEK, overlappingMonthRefs: [], weekPlan: {
        id: 'plan', createdAt: '', updatedAt: '', weekRef: WEEK,
        topPriorities: [{ subjectType: 'habit', subjectId: subject.id }],
      },
      relevant: { measurementItems: [item], cadencedItems: [item], trackerItems: [], initiativeItems: [] },
      rawEntries: entries,
    } as unknown as WeekPlanningBundle,
    reflectionBundle: {
      weekRef: WEEK, overlappingMonthRefs: [], relevant: { goalItems: [], measurementItems: [], cadencedItems: [], trackerItems: [], initiativeItems: [] }, objectReflections: [],
    } as unknown as WeekReflectionBundle,
    weeklyReflection: null,
    activity: buildPeriodActivity(
      ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'] as DayRef[],
      TODAY,
      { journalCreatedAts: ['2026-07-03T08:00:00.000Z'], emotionLogs: [{ createdAt: '2026-07-03T08:00:00.000Z', quadrants: ['high-energy-high-pleasantness'] }], exerciseDayRefs: ['2026-07-03' as DayRef] }
    ),
  }
}

describe('buildWeekV2OverviewViewModel', () => {
  it('builds seven full-week day columns and marks days outside the parent month', () => {
    const vm = buildWeekV2OverviewViewModel(data())
    expect(vm.days).toHaveLength(7)
    expect(vm.days.map((day) => day.dayRef)).toEqual(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'])
    expect(vm.days.filter((day) => day.isBoundary).map((day) => day.dayRef)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'])
  })

  it('keeps today/future neutral and distinguishes a past scheduled miss', () => {
    const row = buildWeekV2OverviewViewModel(data()).sections.find((section) => section.key === 'habits')!.groups[0]!.rows[0]!
    expect(row.series.weeks.map((day) => day.status)).toEqual(['missed', 'met', 'no-data', 'in-progress', 'no-data', 'no-data', 'no-data'])
    expect(row.weekSummary?.evaluationStatus).toBe('met')
  })

  it('resolves top priorities and zeroes activity from future days', () => {
    const vm = buildWeekV2OverviewViewModel(data())
    expect(vm.rail.topPriorities).toMatchObject([{ title: 'Meditation', status: 'met' }])
    expect(vm.rail.activity.totals).toEqual({ emotionSessions: 0, journalEntries: 0, exercises: 0 })
  })

  it('deduplicates monthly objects on a boundary week in favour of the parent month', () => {
    const fixture = data()
    const base = fixture.planning.relevant.measurementItems[0]!
    const monthly = { ...base, subject: { ...base.subject, cadence: 'monthly' as const }, sourceMonthRef: '2026-06' as MonthRef } as typeof base
    fixture.planning.relevant.measurementItems = [
      monthly,
      { ...monthly, sourceMonthRef: '2026-07' as MonthRef },
    ]
    const rows = buildWeekV2OverviewViewModel(fixture).sections.flatMap((section) => section.groups.flatMap((group) => group.rows))
    expect(rows).toHaveLength(1)
  })
})
