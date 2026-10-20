import { describe, expect, it } from 'vitest'
import type { DayRef, WeekRef } from '@/domain/period'
import {
  classifyWeek,
  statusFromWeekTally,
  tallyWeekStates,
  weekPhase,
} from '@/domain/weeklyCadence'

// 2026-W39 = Mon 28 Sep … Sun 4 Oct (weeks count from the year's first Monday).
const W38 = '2026-W38' as WeekRef
const W39 = '2026-W39' as WeekRef
const W40 = '2026-W40' as WeekRef
const TODAY = '2026-10-01' as DayRef

describe('weeklyCadence', () => {
  it('places weeks relative to today', () => {
    expect(weekPhase(W38, TODAY)).toBe('past')
    expect(weekPhase(W39, TODAY)).toBe('current')
    expect(weekPhase(W40, TODAY)).toBe('future')
    expect(weekPhase(W39, '2026-10-04' as DayRef)).toBe('current')
  })

  it('classifies a week by assignment, time and evaluation', () => {
    expect(classifyWeek(W38, false, 'met', TODAY)).toBe('unplanned')
    expect(classifyWeek(W38, true, 'missed', TODAY)).toBe('missed')
    expect(classifyWeek(W38, true, undefined, TODAY)).toBe('no-data')
    expect(classifyWeek(W39, true, 'met', TODAY)).toBe('met')
    expect(classifyWeek(W39, true, 'missed', TODAY)).toBe('ongoing')
    expect(classifyWeek(W40, true, 'met', TODAY)).toBe('future')
  })

  it('counts only decided assigned weeks', () => {
    const tally = tallyWeekStates([
      'met',
      'missed',
      'no-data',
      'ongoing',
      'future',
      'unplanned',
      'met',
    ])
    expect(tally).toEqual({ met: 2, planned: 4, missed: 1, ongoing: 1 })
  })

  it('is met over a span only when every decided week was met', () => {
    expect(statusFromWeekTally(tallyWeekStates(['met', 'met', 'ongoing']))).toBe('met')
    expect(statusFromWeekTally(tallyWeekStates(['met', 'no-data']))).toBe('missed')
    expect(statusFromWeekTally(tallyWeekStates(['no-data', 'ongoing']))).toBe('no-data')
    expect(statusFromWeekTally(tallyWeekStates([]))).toBe('no-data')
  })
})
