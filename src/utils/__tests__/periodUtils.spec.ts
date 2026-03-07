import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getWeekStart,
  getNextWeekStart,
  getPreviousWeekStart,
  isSameWeek,
  isSameYear,
  formatWeekRangeFromStart,
  getCurrentYear,
  getYearFromDate,
  getWeekRange,
  toLocalISODateString,
  isDateInPeriod,
  isDateRangeOverlapping,
  isPastPeriod,
  isCurrentPeriod,
  isFuturePeriod,
  formatPeriodDateRange,
  parseLocalISODate,
  getDefaultPeriodName,
  suggestNextPeriodDates,
  getWeekRangesBetween,
  getMonthRange,
  getMonthRangesBetween,
  getYearRange,
} from '../periodUtils'

describe('Planning System Date Utilities', () => {
  describe('getWeekStart', () => {
    it('returns Monday for a given date', () => {
      // Wednesday, January 22, 2026
      const wednesday = new Date(2026, 0, 22)
      const result = getWeekStart(wednesday)
      expect(result).toBe('2026-01-19') // Monday, January 19, 2026
    })

    it('returns the same Monday if input is already Monday', () => {
      // Monday, January 19, 2026
      const monday = new Date(2026, 0, 19)
      const result = getWeekStart(monday)
      expect(result).toBe('2026-01-19')
    })

    it('handles Sunday correctly (returns previous Monday)', () => {
      // Sunday, January 25, 2026
      const sunday = new Date(2026, 0, 25)
      const result = getWeekStart(sunday)
      expect(result).toBe('2026-01-19')
    })

    it('returns current week start when no date provided', () => {
      const result = getWeekStart()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('handles year boundaries', () => {
      // Friday, January 2, 2026 - week started in 2025
      const friday = new Date(2026, 0, 2)
      const result = getWeekStart(friday)
      expect(result).toBe('2025-12-29')
    })
  })

  describe('getNextWeekStart', () => {
    it('returns next Monday', () => {
      const wednesday = new Date(2026, 0, 22)
      const result = getNextWeekStart(wednesday)
      expect(result).toBe('2026-01-26')
    })

    it('handles week that crosses month boundary', () => {
      const wednesday = new Date(2026, 0, 29)
      const result = getNextWeekStart(wednesday)
      expect(result).toBe('2026-02-02')
    })

    it('handles year boundary', () => {
      const wednesday = new Date(2026, 11, 30)
      const result = getNextWeekStart(wednesday)
      expect(result).toBe('2027-01-04')
    })
  })

  describe('getPreviousWeekStart', () => {
    it('returns previous Monday', () => {
      const wednesday = new Date(2026, 0, 22)
      const result = getPreviousWeekStart(wednesday)
      expect(result).toBe('2026-01-12')
    })

    it('handles week that crosses month boundary', () => {
      const wednesday = new Date(2026, 0, 7)
      const result = getPreviousWeekStart(wednesday)
      expect(result).toBe('2025-12-29')
    })
  })

  describe('isSameWeek', () => {
    it('returns true for dates in the same week', () => {
      const monday = new Date(2026, 0, 19)
      const friday = new Date(2026, 0, 23)
      expect(isSameWeek(monday, friday)).toBe(true)
    })

    it('returns true for Monday and Sunday of same week', () => {
      const monday = new Date(2026, 0, 19)
      const sunday = new Date(2026, 0, 25)
      expect(isSameWeek(monday, sunday)).toBe(true)
    })

    it('returns false for dates in different weeks', () => {
      const week1 = new Date(2026, 0, 19)
      const week2 = new Date(2026, 0, 26)
      expect(isSameWeek(week1, week2)).toBe(false)
    })
  })

  describe('isSameYear', () => {
    it('returns true for dates in the same year', () => {
      const january = new Date(2026, 0, 1)
      const december = new Date(2026, 11, 31)
      expect(isSameYear(january, december)).toBe(true)
    })

    it('returns false for dates in different years', () => {
      const date2026 = new Date(2026, 5, 15)
      const date2027 = new Date(2027, 5, 15)
      expect(isSameYear(date2026, date2027)).toBe(false)
    })
  })

  describe('formatWeekRangeFromStart', () => {
    it('formats week range within same month', () => {
      const result = formatWeekRangeFromStart('2026-01-19')
      expect(result).toBe('Jan 19 - 25, 2026')
    })

    it('formats week range crossing month boundary', () => {
      const result = formatWeekRangeFromStart('2026-01-26')
      expect(result).toBe('Jan 26 - Feb 1, 2026')
    })

    it('formats week range crossing year boundary', () => {
      const result = formatWeekRangeFromStart('2025-12-29')
      expect(result).toBe('Dec 29 - Jan 4, 2026')
    })
  })

  describe('getCurrentYear', () => {
    it('returns current year as number', () => {
      const result = getCurrentYear()
      const expected = new Date().getFullYear()
      expect(result).toBe(expected)
    })
  })

  describe('getYearFromDate', () => {
    it('extracts year from ISO date string', () => {
      expect(getYearFromDate('2026-01-15')).toBe(2026)
      expect(getYearFromDate('2027-12-31')).toBe(2027)
    })
  })

  describe('getWeekRange', () => {
    it('returns correct week range', () => {
      const wednesday = new Date(2026, 0, 22)
      const range = getWeekRange(wednesday)

      expect(toLocalISODateString(range.start)).toBe('2026-01-19')
      expect(toLocalISODateString(range.end)).toBe('2026-01-25')
    })
  })

  describe('toLocalISODateString', () => {
    it('formats date as local YYYY-MM-DD', () => {
      const date = new Date(2026, 0, 5, 12)
      expect(toLocalISODateString(date)).toBe('2026-01-05')
    })
  })
})

describe('Flexible Period Utilities', () => {
  describe('isDateInPeriod', () => {
    it('returns true when date string is within range', () => {
      expect(isDateInPeriod('2026-01-15', '2026-01-01', '2026-01-31')).toBe(true)
    })

    it('returns true when Date object is within range', () => {
      const date = new Date(2026, 0, 15)
      expect(isDateInPeriod(date, '2026-01-01', '2026-01-31')).toBe(true)
    })

    it('returns false when date is outside range', () => {
      expect(isDateInPeriod('2026-02-01', '2026-01-01', '2026-01-31')).toBe(false)
    })
  })

  describe('period state helpers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-15T12:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('detects past periods', () => {
      expect(isPastPeriod('2026-01-14')).toBe(true)
      expect(isPastPeriod('2026-01-15')).toBe(false)
    })

    it('detects current periods', () => {
      expect(isCurrentPeriod('2026-01-10', '2026-01-20')).toBe(true)
      expect(isCurrentPeriod('2026-01-16', '2026-01-20')).toBe(false)
    })

    it('detects future periods', () => {
      expect(isFuturePeriod('2026-01-16')).toBe(true)
      expect(isFuturePeriod('2026-01-15')).toBe(false)
    })
  })

  describe('formatPeriodDateRange', () => {
    it('formats same-month range', () => {
      expect(formatPeriodDateRange('2026-01-01', '2026-01-31')).toBe('Jan 1 - 31, 2026')
    })

    it('formats cross-month range in same year', () => {
      expect(formatPeriodDateRange('2026-01-15', '2026-02-05')).toBe('Jan 15 - Feb 5, 2026')
    })

    it('formats cross-year range', () => {
      expect(formatPeriodDateRange('2025-12-15', '2026-01-10')).toBe(
        'Dec 15, 2025 - Jan 10, 2026'
      )
    })
  })

  describe('getDefaultPeriodName', () => {
    it('returns year label for standard yearly range', () => {
      expect(getDefaultPeriodName('2026-01-01', '2026-12-31', 'yearly')).toBe('2026')
    })

    it('returns date range for non-standard yearly range', () => {
      expect(getDefaultPeriodName('2026-04-01', '2027-03-31', 'yearly')).toBe(
        'Apr 1, 2026 - Mar 31, 2027'
      )
    })

    it('returns month label for single-month range', () => {
      expect(getDefaultPeriodName('2026-01-01', '2026-01-31', 'monthly')).toBe('January 2026')
    })

    it('returns date range for cross-month range', () => {
      expect(getDefaultPeriodName('2026-01-15', '2026-02-05', 'monthly')).toBe(
        'Jan 15 - Feb 5, 2026'
      )
    })

    it('returns date range for weekly periods', () => {
      expect(getDefaultPeriodName('2026-01-19', '2026-01-25', 'weekly')).toBe(
        'Jan 19 - 25, 2026'
      )
    })
  })

  describe('suggestNextPeriodDates', () => {
    it('suggests yearly dates for reference year', () => {
      const result = suggestNextPeriodDates('yearly', new Date(2026, 5, 15))
      expect(result).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' })
    })

    it('suggests monthly dates for reference month', () => {
      const result = suggestNextPeriodDates('monthly', new Date(2026, 1, 10))
      expect(result).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' })
    })

    it('suggests weekly dates for reference week', () => {
      const result = suggestNextPeriodDates('weekly', new Date(2026, 0, 22))
      expect(result).toEqual({ startDate: '2026-01-19', endDate: '2026-01-25' })
    })
  })

  describe('month/year range helpers', () => {
    it('returns month range for a given date', () => {
      const range = getMonthRange(new Date(2026, 1, 10))
      expect(toLocalISODateString(range.start)).toBe('2026-02-01')
      expect(toLocalISODateString(range.end)).toBe('2026-02-28')
    })

    it('returns year range for a given date', () => {
      const range = getYearRange(new Date(2026, 7, 10))
      expect(toLocalISODateString(range.start)).toBe('2026-01-01')
      expect(toLocalISODateString(range.end)).toBe('2026-12-31')
    })
  })

  describe('parseLocalISODate', () => {
    it('parses local ISO date string without timezone shifts', () => {
      const date = parseLocalISODate('2026-03-05')
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(2)
      expect(date.getDate()).toBe(5)
    })
  })

  describe('isDateRangeOverlapping', () => {
    it('returns true for overlapping ranges', () => {
      expect(
        isDateRangeOverlapping(
          { startDate: '2026-01-01', endDate: '2026-01-31' },
          { startDate: '2026-01-20', endDate: '2026-02-10' }
        )
      ).toBe(true)
    })

    it('returns false for non-overlapping ranges', () => {
      expect(
        isDateRangeOverlapping(
          { startDate: '2026-01-01', endDate: '2026-01-15' },
          { startDate: '2026-01-16', endDate: '2026-01-31' }
        )
      ).toBe(false)
    })
  })

  describe('getWeekRangesBetween', () => {
    it('returns weekly ranges between dates', () => {
      const ranges = getWeekRangesBetween('2026-01-01', '2026-01-20')
      expect(ranges.length).toBeGreaterThan(0)
      expect(ranges[0].startDate).toBe('2025-12-29')
      expect(ranges[ranges.length - 1].endDate).toBe('2026-01-25')
    })
  })

  describe('getMonthRangesBetween', () => {
    it('returns monthly ranges between dates', () => {
      const ranges = getMonthRangesBetween('2026-01-10', '2026-03-05')
      expect(ranges.length).toBe(3)
      expect(ranges[0].startDate).toBe('2026-01-01')
      expect(ranges[2].endDate).toBe('2026-03-31')
    })
  })
})
