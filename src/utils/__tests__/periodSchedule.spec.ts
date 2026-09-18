import { describe, expect, it } from 'vitest'
import { periodsInDateRange } from '@/utils/periodSchedule'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import type { WeekRef } from '@/domain/period'
import { formatWeekRange } from '@/utils/periodLabels'

describe('period schedules', () => {
  it('includes full boundary weeks exactly once across a year boundary', () => {
    const refs = periodsInDateRange('2026-12-30', '2027-01-06', 'weekly')
    expect(refs).toEqual([
      getPeriodRefsForDate('2026-12-30').week,
      getPeriodRefsForDate('2027-01-06').week,
    ])
    expect(getPeriodBounds(refs[0] as WeekRef)).toEqual({ start: '2026-12-28', end: '2027-01-03' })
    const label = formatWeekRange(refs[0] as WeekRef, 'pl')
    expect(label).toContain('2026')
    expect(label).toContain('2027')
  })
  it('rejects invalid, missing and reversed dates', () => {
    for (const [start, end] of [
      ['', '2026-01-01'],
      ['2026-02-30', '2026-03-01'],
      ['2026-02-02', '2026-02-01'],
    ]) {
      expect(periodsInDateRange(start, end, 'weekly')).toEqual([])
    }
  })
  it('handles leap days and inclusive months', () => {
    expect(periodsInDateRange('2028-02-29', '2028-03-01', 'monthly')).toEqual([
      '2028-02',
      '2028-03',
    ])
  })
})
