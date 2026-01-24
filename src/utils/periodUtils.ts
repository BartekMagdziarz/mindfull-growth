import type { PeriodicEntryType, PeriodInfo } from '@/domain/periodicEntry'

export interface PeriodRange {
  start: Date
  end: Date
}

/**
 * Get the week range (Monday to Sunday) for a given date
 */
export function getWeekRange(date: Date = new Date()): PeriodRange {
  const start = new Date(date)
  const day = start.getDay()
  // Adjust to Monday (day 0 = Sunday, so we go back 6 days; otherwise go back day-1 days)
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Get the month range for a given date
 */
export function getMonthRange(date: Date = new Date()): PeriodRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Get the quarter range for a given date
 */
export function getQuarterRange(date: Date = new Date()): PeriodRange {
  const quarter = Math.floor(date.getMonth() / 3)
  const startMonth = quarter * 3

  const start = new Date(date.getFullYear(), startMonth, 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), startMonth + 3, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Get the year range for a given date
 */
export function getYearRange(date: Date = new Date()): PeriodRange {
  const start = new Date(date.getFullYear(), 0, 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date.getFullYear(), 11, 31)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Get period range based on type
 */
export function getPeriodRange(
  type: PeriodicEntryType,
  date: Date = new Date()
): PeriodRange {
  switch (type) {
    case 'weekly':
      return getWeekRange(date)
    case 'monthly':
      return getMonthRange(date)
    case 'quarterly':
      return getQuarterRange(date)
    case 'yearly':
      return getYearRange(date)
  }
}

/**
 * Get the previous period range
 */
export function getPreviousPeriodRange(
  type: PeriodicEntryType,
  currentStart: Date
): PeriodRange {
  const prevDate = new Date(currentStart)

  switch (type) {
    case 'weekly':
      prevDate.setDate(prevDate.getDate() - 7)
      return getWeekRange(prevDate)
    case 'monthly':
      prevDate.setMonth(prevDate.getMonth() - 1)
      return getMonthRange(prevDate)
    case 'quarterly':
      prevDate.setMonth(prevDate.getMonth() - 3)
      return getQuarterRange(prevDate)
    case 'yearly':
      prevDate.setFullYear(prevDate.getFullYear() - 1)
      return getYearRange(prevDate)
  }
}

/**
 * Format date as ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get a unique key for a period (used for lookups)
 */
export function getPeriodKey(type: PeriodicEntryType, date: Date = new Date()): string {
  const range = getPeriodRange(type, date)
  return `${type}-${toISODateString(range.start)}`
}

/**
 * Get week number within the year
 */
export function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

/**
 * Get quarter number (1-4)
 */
export function getQuarterNumber(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

/**
 * Format a date range for display
 */
export function formatDateRange(start: Date, end: Date, type: PeriodicEntryType): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  switch (type) {
    case 'weekly': {
      const startMonth = months[start.getMonth()]
      const endMonth = months[end.getMonth()]
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()}-${end.getDate()}`
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
    }
    case 'monthly':
      return `${months[start.getMonth()]} ${start.getFullYear()}`
    case 'quarterly':
      return `Q${getQuarterNumber(start)} ${start.getFullYear()}`
    case 'yearly':
      return `${start.getFullYear()}`
  }
}

/**
 * Get period label for display
 */
export function getPeriodLabel(type: PeriodicEntryType, date: Date): string {
  switch (type) {
    case 'weekly':
      return `Week ${getWeekNumber(date)}`
    case 'monthly':
      return new Date(date).toLocaleDateString('en-US', { month: 'long' })
    case 'quarterly':
      return `Q${getQuarterNumber(date)}`
    case 'yearly':
      return `${date.getFullYear()}`
  }
}

/**
 * Get full period info for UI display
 */
export function getPeriodInfo(type: PeriodicEntryType, date: Date = new Date()): PeriodInfo {
  const range = getPeriodRange(type, date)
  return {
    type,
    label: getPeriodLabel(type, range.start),
    dateRange: formatDateRange(range.start, range.end, type),
    startDate: range.start,
    endDate: range.end,
  }
}

/**
 * Check if a date falls within a period range
 */
export function isDateInRange(date: Date, range: PeriodRange): boolean {
  const timestamp = date.getTime()
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime()
}

/**
 * Check if two period ranges are the same
 */
export function isSamePeriod(range1: PeriodRange, range2: PeriodRange): boolean {
  return (
    toISODateString(range1.start) === toISODateString(range2.start) &&
    toISODateString(range1.end) === toISODateString(range2.end)
  )
}

/**
 * Get type label for display
 */
export function getTypeLabel(type: PeriodicEntryType): string {
  switch (type) {
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'quarterly':
      return 'Quarterly'
    case 'yearly':
      return 'Yearly'
  }
}

// ============================================================================
// Planning System Utilities (Epic 4)
// ============================================================================

/**
 * Format a date as ISO date string (YYYY-MM-DD) using LOCAL timezone
 * This differs from toISODateString which uses UTC and can shift dates
 * Use this for dates where the local date matters (week starts, quarter starts)
 */
export function toLocalISODateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the start of the week (Monday) as an ISO date string
 * Used for WeeklyPlan and Commitment weekStartDate fields
 */
export function getWeekStart(date: Date = new Date()): string {
  const range = getWeekRange(date)
  return toLocalISODateString(range.start)
}

/**
 * Get the start of the next week (next Monday) as an ISO date string
 */
export function getNextWeekStart(date: Date = new Date()): string {
  const nextWeek = new Date(date)
  nextWeek.setDate(nextWeek.getDate() + 7)
  return getWeekStart(nextWeek)
}

/**
 * Get the start of the previous week (previous Monday) as an ISO date string
 */
export function getPreviousWeekStart(date: Date = new Date()): string {
  const prevWeek = new Date(date)
  prevWeek.setDate(prevWeek.getDate() - 7)
  return getWeekStart(prevWeek)
}

/**
 * Get the start of the quarter as an ISO date string
 * Used for Project quarterStart and QuarterlyPlan quarterStart fields
 * Q1: Jan 1, Q2: Apr 1, Q3: Jul 1, Q4: Oct 1
 */
export function getQuarterStart(date: Date = new Date()): string {
  const range = getQuarterRange(date)
  return toLocalISODateString(range.start)
}

/**
 * Get the start of the next quarter as an ISO date string
 */
export function getNextQuarterStart(date: Date = new Date()): string {
  const nextQuarter = new Date(date)
  nextQuarter.setMonth(nextQuarter.getMonth() + 3)
  return getQuarterStart(nextQuarter)
}

/**
 * Get the start of the previous quarter as an ISO date string
 */
export function getPreviousQuarterStart(date: Date = new Date()): string {
  const prevQuarter = new Date(date)
  prevQuarter.setMonth(prevQuarter.getMonth() - 3)
  return getQuarterStart(prevQuarter)
}

/**
 * Check if two dates are in the same week
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  return getWeekStart(date1) === getWeekStart(date2)
}

/**
 * Check if two dates are in the same quarter
 */
export function isSameQuarter(date1: Date, date2: Date): boolean {
  return getQuarterStart(date1) === getQuarterStart(date2)
}

/**
 * Check if two dates are in the same year
 */
export function isSameYear(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear()
}

/**
 * Format a week range for display from a week start date string
 * Example: "Jan 20 - Jan 26, 2026"
 *
 * @param weekStartDate - ISO date string of week start (Monday)
 * @returns Formatted week range string
 */
export function formatWeekRangeFromStart(weekStartDate: string): string {
  const start = new Date(weekStartDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const startMonth = months[start.getMonth()]
  const endMonth = months[end.getMonth()]
  const year = end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
}

/**
 * Format a quarter label for display from a quarter start date string
 * Example: "Q1 2026"
 *
 * @param quarterStart - ISO date string of quarter start
 * @returns Formatted quarter label string
 */
export function formatQuarterLabel(quarterStart: string): string {
  const date = new Date(quarterStart)
  const quarter = getQuarterNumber(date)
  const year = date.getFullYear()
  return `Q${quarter} ${year}`
}

/**
 * Get the current year as a number
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Get the quarter number (1-4) from a quarter start date string
 */
export function getQuarterFromStart(quarterStart: string): 1 | 2 | 3 | 4 {
  const date = new Date(quarterStart)
  return getQuarterNumber(date) as 1 | 2 | 3 | 4
}

/**
 * Get the year from an ISO date string
 */
export function getYearFromDate(dateString: string): number {
  return new Date(dateString).getFullYear()
}
