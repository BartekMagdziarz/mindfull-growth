import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getNextWeekStart,
  getPreviousWeekStart,
  getQuarterStart,
  getNextQuarterStart,
  getPreviousQuarterStart,
  isSameWeek,
  isSameQuarter,
  isSameYear,
  formatWeekRangeFromStart,
  formatQuarterLabel,
  getCurrentYear,
  getQuarterFromStart,
  getYearFromDate,
  getWeekRange,
  getQuarterRange,
  getQuarterNumber,
  toLocalISODateString,
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
      expect(result).toBe('2026-01-19') // Previous Monday
    })

    it('returns current week start when no date provided', () => {
      const result = getWeekStart()
      // Just verify it returns a valid ISO date string (YYYY-MM-DD format)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('handles year boundaries', () => {
      // Friday, January 2, 2026 - week started in 2025
      const friday = new Date(2026, 0, 2)
      const result = getWeekStart(friday)
      expect(result).toBe('2025-12-29') // Monday, December 29, 2025
    })
  })

  describe('getNextWeekStart', () => {
    it('returns next Monday', () => {
      // Wednesday, January 22, 2026
      const wednesday = new Date(2026, 0, 22)
      const result = getNextWeekStart(wednesday)
      expect(result).toBe('2026-01-26') // Next Monday
    })

    it('handles week that crosses month boundary', () => {
      // Wednesday, January 29, 2026
      const wednesday = new Date(2026, 0, 29)
      const result = getNextWeekStart(wednesday)
      expect(result).toBe('2026-02-02') // Monday in February
    })

    it('handles year boundary', () => {
      // Wednesday, December 30, 2026
      const wednesday = new Date(2026, 11, 30)
      const result = getNextWeekStart(wednesday)
      expect(result).toBe('2027-01-04') // Monday in 2027
    })
  })

  describe('getPreviousWeekStart', () => {
    it('returns previous Monday', () => {
      // Wednesday, January 22, 2026
      const wednesday = new Date(2026, 0, 22)
      const result = getPreviousWeekStart(wednesday)
      expect(result).toBe('2026-01-12') // Previous Monday
    })

    it('handles week that crosses month boundary', () => {
      // Wednesday, January 7, 2026
      const wednesday = new Date(2026, 0, 7)
      const result = getPreviousWeekStart(wednesday)
      expect(result).toBe('2025-12-29') // Monday in December 2025
    })
  })

  describe('getQuarterStart', () => {
    it('returns Q1 start for January date', () => {
      const january = new Date(2026, 0, 15)
      const result = getQuarterStart(january)
      expect(result).toBe('2026-01-01')
    })

    it('returns Q1 start for March date', () => {
      const march = new Date(2026, 2, 31)
      const result = getQuarterStart(march)
      expect(result).toBe('2026-01-01')
    })

    it('returns Q2 start for April date', () => {
      const april = new Date(2026, 3, 1)
      const result = getQuarterStart(april)
      expect(result).toBe('2026-04-01')
    })

    it('returns Q3 start for July date', () => {
      const july = new Date(2026, 6, 15)
      const result = getQuarterStart(july)
      expect(result).toBe('2026-07-01')
    })

    it('returns Q4 start for October date', () => {
      const october = new Date(2026, 9, 1)
      const result = getQuarterStart(october)
      expect(result).toBe('2026-10-01')
    })

    it('returns Q4 start for December date', () => {
      const december = new Date(2026, 11, 31)
      const result = getQuarterStart(december)
      expect(result).toBe('2026-10-01')
    })
  })

  describe('getNextQuarterStart', () => {
    it('returns Q2 start from Q1', () => {
      const q1 = new Date(2026, 1, 15) // February
      const result = getNextQuarterStart(q1)
      expect(result).toBe('2026-04-01')
    })

    it('returns Q1 of next year from Q4', () => {
      const q4 = new Date(2026, 10, 15) // November
      const result = getNextQuarterStart(q4)
      expect(result).toBe('2027-01-01')
    })
  })

  describe('getPreviousQuarterStart', () => {
    it('returns Q4 of previous year from Q1', () => {
      const q1 = new Date(2026, 1, 15) // February
      const result = getPreviousQuarterStart(q1)
      expect(result).toBe('2025-10-01')
    })

    it('returns Q2 from Q3', () => {
      const q3 = new Date(2026, 7, 15) // August
      const result = getPreviousQuarterStart(q3)
      expect(result).toBe('2026-04-01')
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

  describe('isSameQuarter', () => {
    it('returns true for dates in the same quarter', () => {
      const january = new Date(2026, 0, 15)
      const march = new Date(2026, 2, 31)
      expect(isSameQuarter(january, march)).toBe(true)
    })

    it('returns false for dates in different quarters', () => {
      const q1 = new Date(2026, 0, 15)
      const q2 = new Date(2026, 3, 15)
      expect(isSameQuarter(q1, q2)).toBe(false)
    })

    it('returns false for same quarter in different years', () => {
      const q1_2026 = new Date(2026, 0, 15)
      const q1_2027 = new Date(2027, 0, 15)
      expect(isSameQuarter(q1_2026, q1_2027)).toBe(false)
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
      // End date is Jan 4, 2026
      expect(result).toBe('Dec 29 - Jan 4, 2026')
    })
  })

  describe('formatQuarterLabel', () => {
    it('formats Q1 label', () => {
      const result = formatQuarterLabel('2026-01-01')
      expect(result).toBe('Q1 2026')
    })

    it('formats Q2 label', () => {
      const result = formatQuarterLabel('2026-04-01')
      expect(result).toBe('Q2 2026')
    })

    it('formats Q3 label', () => {
      const result = formatQuarterLabel('2026-07-01')
      expect(result).toBe('Q3 2026')
    })

    it('formats Q4 label', () => {
      const result = formatQuarterLabel('2026-10-01')
      expect(result).toBe('Q4 2026')
    })
  })

  describe('getCurrentYear', () => {
    it('returns current year as number', () => {
      const result = getCurrentYear()
      const expected = new Date().getFullYear()
      expect(result).toBe(expected)
    })
  })

  describe('getQuarterFromStart', () => {
    it('returns 1 for Q1 start', () => {
      expect(getQuarterFromStart('2026-01-01')).toBe(1)
    })

    it('returns 2 for Q2 start', () => {
      expect(getQuarterFromStart('2026-04-01')).toBe(2)
    })

    it('returns 3 for Q3 start', () => {
      expect(getQuarterFromStart('2026-07-01')).toBe(3)
    })

    it('returns 4 for Q4 start', () => {
      expect(getQuarterFromStart('2026-10-01')).toBe(4)
    })
  })

  describe('getYearFromDate', () => {
    it('extracts year from ISO date string', () => {
      expect(getYearFromDate('2026-01-15')).toBe(2026)
      expect(getYearFromDate('2027-12-31')).toBe(2027)
    })
  })
})

describe('Existing Period Utilities (verification)', () => {
  describe('getWeekRange', () => {
    it('returns correct week range', () => {
      const wednesday = new Date(2026, 0, 22)
      const range = getWeekRange(wednesday)

      expect(toLocalISODateString(range.start)).toBe('2026-01-19')
      expect(toLocalISODateString(range.end)).toBe('2026-01-25')
    })
  })

  describe('getQuarterRange', () => {
    it('returns correct Q1 range', () => {
      const february = new Date(2026, 1, 15)
      const range = getQuarterRange(february)

      expect(toLocalISODateString(range.start)).toBe('2026-01-01')
      expect(toLocalISODateString(range.end)).toBe('2026-03-31')
    })
  })

  describe('getQuarterNumber', () => {
    it('returns correct quarter numbers', () => {
      expect(getQuarterNumber(new Date(2026, 0, 15))).toBe(1)
      expect(getQuarterNumber(new Date(2026, 3, 15))).toBe(2)
      expect(getQuarterNumber(new Date(2026, 6, 15))).toBe(3)
      expect(getQuarterNumber(new Date(2026, 9, 15))).toBe(4)
    })
  })
})
