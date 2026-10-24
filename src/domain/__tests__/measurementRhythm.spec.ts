import { describe, expect, it } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementRhythm } from '@/domain/planning'
import {
  isWeekCoveredByRhythm,
  resolveRhythmDays,
  rhythmLabel,
  sortRhythmWeekdays,
  weekdayOfDay,
} from '@/domain/measurementRhythm'
import { getChildPeriods, parsePeriodRef } from '@/utils/periods'

// 2026-W13 spans Mon 2026-03-30 – Sun 2026-04-05 (a March/April boundary week).
const BOUNDARY_WEEK = parsePeriodRef('2026-W13') as WeekRef
const PLAIN_WEEK = parsePeriodRef('2026-W15') as WeekRef // 13–19 Apr 2026
const MARCH = parsePeriodRef('2026-03') as MonthRef
const APRIL = parsePeriodRef('2026-04') as MonthRef

function rhythm(overrides: Partial<MeasurementRhythm> = {}): MeasurementRhythm {
  return {
    kind: 'weekdays',
    weekdays: ['tue', 'thu'],
    scope: 'placed-weeks',
    since: parsePeriodRef('2026-W10') as WeekRef,
    ...overrides,
  }
}

describe('weekdayOfDay', () => {
  it('maps the app week Monday-first regardless of the time zone', () => {
    const days = getChildPeriods(PLAIN_WEEK) as DayRef[]
    expect(days.map(weekdayOfDay)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
  })
})

describe('sortRhythmWeekdays', () => {
  it('dedupes and orders Monday-first', () => {
    expect(sortRhythmWeekdays(['sun', 'tue', 'tue', 'mon'])).toEqual(['mon', 'tue', 'sun'])
  })
})

describe('resolveRhythmDays', () => {
  it('names the template weekdays of a plain week', () => {
    expect(resolveRhythmDays(PLAIN_WEEK, rhythm())).toEqual(['2026-04-14', '2026-04-16'])
  })

  it('returns nothing for a week before `since`', () => {
    const early = parsePeriodRef('2026-W09') as WeekRef
    expect(isWeekCoveredByRhythm(early, rhythm())).toBe(false)
    expect(resolveRhythmDays(early, rhythm())).toEqual([])
    expect(isWeekCoveredByRhythm(rhythm().since, rhythm())).toBe(true)
  })

  it('keeps all seven days for a daily template', () => {
    const daily = rhythm({ weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })
    expect(resolveRhythmDays(PLAIN_WEEK, daily)).toHaveLength(7)
  })

  it('clips a boundary week to the placed month (monthly cadence attribution)', () => {
    const template = rhythm({ weekdays: ['mon', 'tue', 'sat'] })
    // Mon 30 Mar, Tue 31 Mar belong to March; Sat 4 Apr to April.
    expect(resolveRhythmDays(BOUNDARY_WEEK, template, { monthRefs: [MARCH] })).toEqual([
      '2026-03-30',
      '2026-03-31',
    ])
    expect(resolveRhythmDays(BOUNDARY_WEEK, template, { monthRefs: [APRIL] })).toEqual([
      '2026-04-04',
    ])
    expect(resolveRhythmDays(BOUNDARY_WEEK, template, { monthRefs: [MARCH, APRIL] })).toHaveLength(
      3
    )
  })

  it('clips to the goal window on both ends', () => {
    const template = rhythm({ weekdays: ['mon', 'wed', 'fri'] })
    expect(
      resolveRhythmDays(PLAIN_WEEK, template, {
        goalWindow: { start: '2026-04-14' as DayRef, end: '2026-04-16' as DayRef },
      })
    ).toEqual(['2026-04-15'])
    // Deadline before the week → nothing to place.
    expect(
      resolveRhythmDays(PLAIN_WEEK, template, { goalWindow: { end: '2026-04-10' as DayRef } })
    ).toEqual([])
  })
})

describe('rhythmLabel', () => {
  it('summarizes common templates in Polish', () => {
    expect(rhythmLabel({ weekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })).toBe(
      'codziennie'
    )
    expect(rhythmLabel({ weekdays: ['fri', 'mon', 'tue', 'wed', 'thu'] })).toBe('pn–pt')
    expect(rhythmLabel({ weekdays: ['thu', 'tue'] })).toBe('wt · czw')
    expect(rhythmLabel({ weekdays: ['sat', 'sun'] })).toBe('sb · nd')
  })
})
