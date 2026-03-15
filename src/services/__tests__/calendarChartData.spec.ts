import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MeasureableSubject } from '@/services/measurementProgress'
import {
  buildMonthWeeklyChartPoints,
  buildWeekDailyChartPoints,
  buildMonthlyTrendChartPoints,
  buildWeeklyTrendChartPoints,
} from '@/services/calendarChartData'
import { parsePeriodRef } from '@/utils/periods'

function makeEntry(
  subjectType: 'habit' | 'keyResult' | 'tracker',
  subjectId: string,
  dayRef: string,
  value: number | null = null,
): DailyMeasurementEntry {
  return {
    id: `entry-${dayRef}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    subjectType,
    subjectId,
    dayRef: dayRef as any,
    value,
  }
}

function makeWeeklyHabit(id: string, targetValue: number): MeasureableSubject {
  return {
    id,
    title: 'Test habit',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: targetValue },
    priorityIds: [],
    lifeAreaIds: [],
    status: 'open',
  } as any
}

function makeMonthlyHabit(id: string, targetValue: number): MeasureableSubject {
  return {
    id,
    title: 'Monthly habit',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    cadence: 'monthly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: targetValue },
    priorityIds: [],
    lifeAreaIds: [],
    status: 'open',
  } as any
}

describe('buildMonthWeeklyChartPoints', () => {
  it('returns one point per overlapping week with aggregated values', () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const subject = makeWeeklyHabit('h1', 3)

    const entries = [
      makeEntry('habit', 'h1', '2026-03-02'),
      makeEntry('habit', 'h1', '2026-03-03'),
      makeEntry('habit', 'h1', '2026-03-04'),
      makeEntry('habit', 'h1', '2026-03-10'),
    ]

    const points = buildMonthWeeklyChartPoints(subject, entries, monthRef)

    expect(points.length).toBeGreaterThanOrEqual(4)
    expect(points.every(p => p.periodRef.includes('W'))).toBe(true)

    const weekWithEntries = points.find(p => p.actualValue !== undefined && p.actualValue > 0)
    expect(weekWithEntries).toBeDefined()
    expect(weekWithEntries!.targetValue).toBe(3)
  })

  it('marks weeks with no entries as no-data when target exists', () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const subject = makeWeeklyHabit('h2', 1)

    const points = buildMonthWeeklyChartPoints(subject, [], monthRef)

    expect(points.every(p => p.status === 'no-data')).toBe(true)
  })

  it('uses parentEvaluation when provided (monthly cadence drill-down)', () => {
    const monthRef = parsePeriodRef('2026-03') as MonthRef
    const subject = makeMonthlyHabit('h-m1', 20)

    const entries = [
      makeEntry('habit', 'h-m1', '2026-03-02'),
      makeEntry('habit', 'h-m1', '2026-03-10'),
    ]

    const points = buildMonthWeeklyChartPoints(subject, entries, monthRef, 'missed')

    // Weeks with entries inherit the parent evaluation; weeks without are no-data.
    const withEntries = points.filter(p => p.actualValue !== undefined)
    const withoutEntries = points.filter(p => p.actualValue === undefined)
    expect(withEntries.length).toBeGreaterThan(0)
    expect(withEntries.every(p => p.status === 'missed')).toBe(true)
    expect(withoutEntries.every(p => p.status === 'no-data')).toBe(true)
    expect(points.every(p => p.targetValue === undefined)).toBe(true)
  })
})

describe('buildWeekDailyChartPoints', () => {
  it('returns 7 daily points for a week', () => {
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const subject = makeWeeklyHabit('h3', 5)

    const entries = [
      makeEntry('habit', 'h3', '2026-03-09'),
      makeEntry('habit', 'h3', '2026-03-11'),
    ]

    const points = buildWeekDailyChartPoints(subject, 'habit', entries, weekRef)

    expect(points).toHaveLength(7)

    const filledPoints = points.filter(p => p.status === 'no-target')
    expect(filledPoints).toHaveLength(2)
    expect(filledPoints.every(p => p.actualValue === 1)).toBe(true)

    const emptyPoints = points.filter(p => p.status === 'no-data')
    expect(emptyPoints).toHaveLength(5)
  })

  it('uses entry value for counter mode', () => {
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const subject = {
      ...makeWeeklyHabit('h4', 10),
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 10 },
    } as any

    const entries = [makeEntry('habit', 'h4', '2026-03-10', 5)]

    const points = buildWeekDailyChartPoints(subject, 'habit', entries, weekRef)
    const filledPoint = points.find(p => p.periodRef === '2026-03-10')
    expect(filledPoint?.actualValue).toBe(5)
    expect(filledPoint?.status).toBe('no-target')
  })

  it('ignores entries for other subjects', () => {
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const subject = makeWeeklyHabit('h5', 1)

    const entries = [makeEntry('habit', 'other-id', '2026-03-10')]

    const points = buildWeekDailyChartPoints(subject, 'habit', entries, weekRef)
    expect(points.every(p => p.status === 'no-data')).toBe(true)
  })

  it('uses parentEvaluation when provided (weekly cadence drill-down)', () => {
    const weekRef = parsePeriodRef('2026-W10') as WeekRef
    const subject = makeWeeklyHabit('h6', 3)

    const entries = [
      makeEntry('habit', 'h6', '2026-03-09'),
      makeEntry('habit', 'h6', '2026-03-11'),
    ]

    const points = buildWeekDailyChartPoints(subject, 'habit', entries, weekRef, 'met')

    const filledPoints = points.filter(p => p.actualValue !== undefined)
    expect(filledPoints.every(p => p.status === 'met')).toBe(true)

    const emptyPoints = points.filter(p => p.actualValue === undefined)
    expect(emptyPoints.every(p => p.status === 'no-data')).toBe(true)
  })
})

describe('buildMonthlyTrendChartPoints', () => {
  it('returns 5 monthly bars with correct isCurrent marking', () => {
    const currentMonthRef = parsePeriodRef('2026-03') as MonthRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeMonthlyHabit('m1', 10)

    const entries = [
      // Entries spread across multiple months
      makeEntry('habit', 'm1', '2025-11-05'),
      makeEntry('habit', 'm1', '2025-12-10'),
      makeEntry('habit', 'm1', '2026-01-15'),
      makeEntry('habit', 'm1', '2026-02-20'),
      makeEntry('habit', 'm1', '2026-03-05'),
    ]

    const points = buildMonthlyTrendChartPoints(subject, entries, currentMonthRef, todayRef)

    expect(points).toHaveLength(5)

    // Last bar is current month
    expect(points[4].isCurrent).toBe(true)
    // Current month should have neutral status (in-progress)
    expect(points[4].status).toBe('no-target')

    // Past bars are not current
    expect(points[0].isCurrent).toBe(false)
    expect(points[1].isCurrent).toBe(false)
    expect(points[2].isCurrent).toBe(false)
    expect(points[3].isCurrent).toBe(false)

    // All bars have targetValue
    expect(points.every(p => p.targetValue === 10)).toBe(true)

    // Period refs are month refs
    expect(points[4].periodRef).toBe('2026-03')
    expect(points[3].periodRef).toBe('2026-02')
    expect(points[0].periodRef).toBe('2025-11')
  })

  it('evaluates past months as met/missed', () => {
    const currentMonthRef = parsePeriodRef('2026-03') as MonthRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeMonthlyHabit('m2', 2)

    // Feb has 3 entries (met), Jan has 1 (missed)
    const entries = [
      makeEntry('habit', 'm2', '2026-01-05'),
      makeEntry('habit', 'm2', '2026-02-05'),
      makeEntry('habit', 'm2', '2026-02-15'),
      makeEntry('habit', 'm2', '2026-02-25'),
    ]

    const points = buildMonthlyTrendChartPoints(subject, entries, currentMonthRef, todayRef)

    // Leading no-data months (Nov, Dec) are trimmed; Jan is index 0, Feb is index 1
    expect(points.length).toBeGreaterThanOrEqual(3)
    const jan = points.find(p => p.periodRef === '2026-01')
    const feb = points.find(p => p.periodRef === '2026-02')
    expect(jan!.status).toBe('missed') // 1 < 2
    expect(feb!.status).toBe('met')    // 3 >= 2
  })

  it('returns empty when viewing a past month with no entries', () => {
    const pastMonthRef = parsePeriodRef('2026-01') as MonthRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeMonthlyHabit('m3', 5)

    const points = buildMonthlyTrendChartPoints(subject, [], pastMonthRef, todayRef)

    // All points are no-data, so trimming removes everything
    expect(points).toHaveLength(0)
  })

  it('trims leading no-data months for newly created objects', () => {
    const currentMonthRef = parsePeriodRef('2026-03') as MonthRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeMonthlyHabit('m4', 2)

    // Only one entry in the current month
    const entries = [makeEntry('habit', 'm4', '2026-03-05')]

    const points = buildMonthlyTrendChartPoints(subject, entries, currentMonthRef, todayRef)

    // Should only show the current month (leading no-data months trimmed)
    expect(points).toHaveLength(1)
    expect(points[0].periodRef).toBe('2026-03')
    expect(points[0].isCurrent).toBe(true)
  })
})

describe('buildWeeklyTrendChartPoints', () => {
  // W10 = Mar 9-15, so todayRef 2026-03-14 is in W10
  it('returns 5 weekly bars with correct isCurrent marking', () => {
    const currentWeekRef = parsePeriodRef('2026-W10') as WeekRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeWeeklyHabit('w1', 3)

    const entries = [
      makeEntry('habit', 'w1', '2026-02-09'), // W06
      makeEntry('habit', 'w1', '2026-02-16'), // W07
      makeEntry('habit', 'w1', '2026-02-23'), // W08
      makeEntry('habit', 'w1', '2026-03-02'), // W09
      makeEntry('habit', 'w1', '2026-03-14'), // W10
    ]

    const points = buildWeeklyTrendChartPoints(subject, entries, currentWeekRef, todayRef)

    expect(points).toHaveLength(5)

    // Last bar is current week
    expect(points[4].isCurrent).toBe(true)
    expect(points[4].status).toBe('no-target') // in-progress, neutral

    // Past bars are not current
    expect(points.slice(0, 4).every(p => p.isCurrent === false)).toBe(true)

    // All bars have targetValue
    expect(points.every(p => p.targetValue === 3)).toBe(true)

    // Period refs are week refs
    expect(points[4].periodRef).toBe('2026-W10')
  })

  it('trims leading no-data weeks for newly created objects', () => {
    const currentWeekRef = parsePeriodRef('2026-W10') as WeekRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeWeeklyHabit('w-new', 1)

    // Only one entry in the current week
    const entries = [makeEntry('habit', 'w-new', '2026-03-14')]

    const points = buildWeeklyTrendChartPoints(subject, entries, currentWeekRef, todayRef)

    // Should only show the current week (leading no-data weeks trimmed)
    expect(points).toHaveLength(1)
    expect(points[0].periodRef).toBe('2026-W10')
    expect(points[0].isCurrent).toBe(true)
  })

  it('evaluates past weeks as met/missed', () => {
    // In 2026, W01 starts Jan 5. W08 = Feb 23-Mar 1, W09 = Mar 2-8, W10 = Mar 9-15.
    const currentWeekRef = parsePeriodRef('2026-W10') as WeekRef
    const todayRef = '2026-03-14' as DayRef
    const subject = makeWeeklyHabit('w2', 2)

    // W08 has 1 entry (missed), W09 has 3 entries (met)
    const entries = [
      makeEntry('habit', 'w2', '2026-02-25'), // W08 (Wed)
      makeEntry('habit', 'w2', '2026-03-02'), // W09 (Mon)
      makeEntry('habit', 'w2', '2026-03-03'), // W09 (Tue)
      makeEntry('habit', 'w2', '2026-03-04'), // W09 (Wed)
    ]

    const points = buildWeeklyTrendChartPoints(subject, entries, currentWeekRef, todayRef)

    // Leading no-data weeks are trimmed; W08 has data so it starts there
    const w08 = points.find(p => p.periodRef === '2026-W08')
    const w09 = points.find(p => p.periodRef === '2026-W09')
    expect(w08).toBeDefined()
    expect(w09).toBeDefined()
    expect(w09!.status).toBe('met')    // 3 >= 2
    expect(w08!.status).toBe('missed') // 1 < 2
  })
})
