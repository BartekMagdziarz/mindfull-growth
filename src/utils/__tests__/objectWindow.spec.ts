import { describe, expect, it } from 'vitest'
import type { YearRef } from '@/domain/period'
import { OPEN_WINDOW_PROGRESS, computeGoalWindow, computeYearsWindow } from '@/utils/objectWindow'

const TODAY = '2026-09-12'

describe('computeGoalWindow', () => {
  it('uses explicit dates and places today inside the window', () => {
    const window = computeGoalWindow({ startDate: '2026-09-02', targetDate: '2026-09-22' }, TODAY)
    expect(window.start).toBe('2026-09-02')
    expect(window.end).toBe('2026-09-22')
    expect(window.state).toBe('running')
    expect(window.progress).toBeCloseTo(0.5, 5)
    expect(window.daysToEnd).toBe(10)
  })

  it('falls back to linked months when no dates are set', () => {
    const window = computeGoalWindow({ monthRefs: ['2026-09', '2026-08'] }, TODAY)
    expect(window.start).toBe('2026-08-01')
    expect(window.end).toBe('2026-09-30')
    expect(window.state).toBe('running')
    expect(window.daysToEnd).toBe(18)
  })

  it('prefers the target date over the last linked month for the end', () => {
    const window = computeGoalWindow({ monthRefs: ['2026-08', '2026-09'], targetDate: '2026-09-26' }, TODAY)
    expect(window.start).toBe('2026-08-01')
    expect(window.end).toBe('2026-09-26')
  })

  it('is open-ended without target date or months and uses the created day as start', () => {
    const window = computeGoalWindow({ createdAt: '2026-05-04T08:15:00.000Z' }, TODAY)
    expect(window.start).toBe('2026-05-04')
    expect(window.end).toBeNull()
    expect(window.state).toBe('open')
    expect(window.progress).toBe(OPEN_WINDOW_PROGRESS)
    expect(window.daysToEnd).toBeNull()
  })

  it('marks overdue windows and clamps progress to the end', () => {
    const window = computeGoalWindow({ startDate: '2026-01-01', targetDate: '2026-08-31' }, TODAY)
    expect(window.state).toBe('overdue')
    expect(window.progress).toBe(1)
    expect(window.daysToEnd).toBe(-12)
  })

  it('reports due-today and upcoming', () => {
    expect(computeGoalWindow({ startDate: '2026-09-01', targetDate: TODAY }, TODAY).state).toBe('due-today')
    const upcoming = computeGoalWindow({ startDate: '2026-10-01', targetDate: '2026-12-01' }, TODAY)
    expect(upcoming.state).toBe('upcoming')
    expect(upcoming.progress).toBe(0)
  })

  it('returns an empty window when nothing is known', () => {
    expect(computeGoalWindow({}, TODAY).state).toBe('empty')
  })
})

describe('computeYearsWindow', () => {
  it('always includes the current year and pads to three dots', () => {
    const result = computeYearsWindow([], TODAY)
    expect(result.years.map((dot) => dot.ref)).toEqual(['2026', '2027', '2028'])
    expect(result.years[0].state).toBe('current')
    expect(result.progress).toBeCloseTo((0 + 254 / 364) / 2, 3)
  })

  it('classifies past, current and future years and runs ink up to today', () => {
    const result = computeYearsWindow(['2025' as YearRef, '2026' as YearRef, '2027' as YearRef], TODAY)
    expect(result.years.map((dot) => dot.state)).toEqual(['done', 'current', 'future'])
    expect(result.progress).toBeGreaterThan(0.5)
    expect(result.progress).toBeLessThan(1)
  })

  it('keeps ink at the last dot when the current year is the last one', () => {
    const result = computeYearsWindow(['2024' as YearRef, '2025' as YearRef, '2026' as YearRef], TODAY)
    expect(result.progress).toBe(1)
  })
})
