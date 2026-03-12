import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import {
  assertPeriodRef,
  comparePeriodRefs,
  containsDay,
  countItemsByPeriod,
  filterItemsByPeriod,
  getAssignmentBounds,
  getChildPeriods,
  getNextPeriod,
  getParentPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getPeriodType,
  getPreviousPeriod,
  getWeekOverlappingMonths,
  groupItemsByPeriod,
  isAssignmentRelevantToPeriod,
  isPeriodRef,
  parsePeriodRef,
  periodIntersectsPeriod,
  serializePeriodRef,
  zoomPeriod,
} from '@/utils/periods'

describe('period helpers', () => {
  it('parses and validates canonical refs', () => {
    expect(isPeriodRef('2026')).toBe(true)
    expect(isPeriodRef('2026-03')).toBe(true)
    expect(isPeriodRef('2025-W52')).toBe(true)
    expect(isPeriodRef('2026-03-12')).toBe(true)

    expect(isPeriodRef('2026-13')).toBe(false)
    expect(isPeriodRef('2026-02-30')).toBe(false)
    expect(isPeriodRef('2025-W53')).toBe(false)
    expect(isPeriodRef('2026-W5')).toBe(false)

    expect(getPeriodType(parsePeriodRef('2026-03-12'))).toBe('day')
    expect(serializePeriodRef(parsePeriodRef('2026-W10'))).toBe('2026-W10')
    expect(() => parsePeriodRef('2025-W53')).toThrow('Invalid period ref')
    expect(() => assertPeriodRef('2026-00')).toThrow('Invalid period ref')
  })

  it('derives refs and bounds using monday-owned weeks', () => {
    const refs = getPeriodRefsForDate('2026-01-01')

    expect(refs.year).toBe('2026')
    expect(refs.month).toBe('2026-01')
    expect(refs.day).toBe('2026-01-01')
    expect(refs.week).toBe('2025-W52')

    expect(getPeriodBounds(parsePeriodRef('2025-W52'))).toEqual({
      start: '2025-12-29',
      end: '2026-01-04',
    })
    expect(getWeekOverlappingMonths(parsePeriodRef('2026-W08') as WeekRef)).toEqual([
      '2026-02',
      '2026-03',
    ])
  })

  it('uses the local calendar date when resolving timestamp strings', () => {
    const localTimestamp = new Date(2026, 2, 12, 0, 30).toISOString()

    expect(getPeriodRefsForDate(localTimestamp).day).toBe('2026-03-12')
    expect(getPeriodRefsForDate(localTimestamp).week).toBe('2026-W10')
  })

  it('navigates between periods and zoom levels without losing context', () => {
    expect(getPreviousPeriod(parsePeriodRef('2026-01'))).toBe('2025-12')
    expect(getNextPeriod(parsePeriodRef('2025-W52'))).toBe('2026-W01')
    expect(getPreviousPeriod(parsePeriodRef('2026-W01'))).toBe('2025-W52')

    expect(zoomPeriod(parsePeriodRef('2026-03'), 'week')).toBe('2026-W08')
    expect(zoomPeriod(parsePeriodRef('2026-03'), 'week', '2026-03-12' as DayRef)).toBe('2026-W10')
    expect(zoomPeriod(parsePeriodRef('2026-W08'), 'month')).toBe('2026-02')

    expect(getParentPeriod(parsePeriodRef('2026-03-12') as DayRef)).toBe('2026-W10')
    expect(getParentPeriod(parsePeriodRef('2026-W08') as WeekRef)).toBe('2026-02')
    expect(getParentPeriod(parsePeriodRef('2026-03') as MonthRef)).toBe('2026')
  })

  it('returns immediate child periods in deterministic order', () => {
    expect(getChildPeriods(parsePeriodRef('2026-W10') as WeekRef)).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ])

    expect(getChildPeriods(parsePeriodRef('2026-03') as MonthRef)).toEqual([
      '2026-W08',
      '2026-W09',
      '2026-W10',
      '2026-W11',
      '2026-W12',
      '2026-W13',
    ])
  })

  it('evaluates containment, overlap and assignment relevance', () => {
    const targetWeek = parsePeriodRef('2026-W10') as WeekRef
    const marchAssignment = {
      periodType: 'month' as const,
      periodRef: parsePeriodRef('2026-03') as MonthRef,
    }

    expect(containsDay(targetWeek, parsePeriodRef('2026-03-12') as DayRef)).toBe(true)
    expect(periodIntersectsPeriod(parsePeriodRef('2026-W08'), parsePeriodRef('2026-03'))).toBe(true)
    expect(getAssignmentBounds(marchAssignment)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    })
    expect(isAssignmentRelevantToPeriod(marchAssignment, targetWeek)).toBe(true)
  })

  it('filters, groups and counts period-linked items consistently', () => {
    const weekTarget = parsePeriodRef('2026-W10') as WeekRef
    const items = [
      { id: 'day', period: parsePeriodRef('2026-03-12') as DayRef },
      {
        id: 'week',
        period: { periodType: 'week' as const, periodRef: parsePeriodRef('2026-W10') as WeekRef },
      },
      {
        id: 'month',
        period: { periodType: 'month' as const, periodRef: parsePeriodRef('2026-03') as MonthRef },
      },
      { id: 'other', period: parsePeriodRef('2026-04-02') as DayRef },
    ]

    expect(filterItemsByPeriod(items, weekTarget, (item) => item.period).map((item) => item.id)).toEqual([
      'day',
      'week',
      'month',
    ])

    const grouped = groupItemsByPeriod(
      [
        { id: 'a', period: parsePeriodRef('2026-03-12') as DayRef },
        { id: 'b', period: parsePeriodRef('2026-03-12') as DayRef },
        { id: 'c', period: parsePeriodRef('2026-W10') as WeekRef },
      ],
      (item) => item.period,
    )

    expect(grouped).toEqual([
      { periodRef: '2026-W10', items: [{ id: 'c', period: '2026-W10' }] },
      {
        periodRef: '2026-03-12',
        items: [
          { id: 'a', period: '2026-03-12' },
          { id: 'b', period: '2026-03-12' },
        ],
      },
    ])

    expect(
      countItemsByPeriod(
        [
          { id: 'a', period: parsePeriodRef('2026-03-12') as DayRef },
          { id: 'b', period: parsePeriodRef('2026-03-12') as DayRef },
          { id: 'c', period: parsePeriodRef('2026-W10') as WeekRef },
        ],
        (item) => item.period,
      ),
    ).toEqual([
      { periodRef: '2026-W10', count: 1 },
      { periodRef: '2026-03-12', count: 2 },
    ])
  })

  it('compares period refs by start date and then breadth', () => {
    expect(comparePeriodRefs(parsePeriodRef('2026'), parsePeriodRef('2026-01'))).toBeLessThan(0)
    expect(comparePeriodRefs(parsePeriodRef('2026-W10'), parsePeriodRef('2026-03-12'))).toBeLessThan(0)
  })
})
