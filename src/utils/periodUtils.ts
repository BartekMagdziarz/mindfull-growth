/**
 * Period type for date range calculations
 * Used by utility functions for week/month/year operations
 */
export type PeriodType = 'weekly' | 'monthly' | 'yearly'

/**
 * Period information for UI display
 */
export interface PeriodInfo {
  type: PeriodType
  label: string
  dateRange: string
  startDate: Date
  endDate: Date
}

export interface PeriodRange {
  start: Date
  end: Date
}

/**
 * ISO date range for date-only comparisons
 */
export interface IsoDateRange {
  startDate: string
  endDate: string
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
  type: PeriodType,
  date: Date = new Date()
): PeriodRange {
  switch (type) {
    case 'weekly':
      return getWeekRange(date)
    case 'monthly':
      return getMonthRange(date)
    case 'yearly':
      return getYearRange(date)
  }
}

/**
 * Get the previous period range
 */
export function getPreviousPeriodRange(
  type: PeriodType,
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
export function getPeriodKey(type: PeriodType, date: Date = new Date()): string {
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
 * Format a date range for display
 */
export function formatDateRange(start: Date, end: Date, type: PeriodType): string {
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
    case 'yearly':
      return `${start.getFullYear()}`
  }
}

/**
 * Get period label for display
 */
export function getPeriodLabel(type: PeriodType, date: Date): string {
  switch (type) {
    case 'weekly':
      return `Week ${getWeekNumber(date)}`
    case 'monthly':
      return new Date(date).toLocaleDateString('en-US', { month: 'long' })
    case 'yearly':
      return `${date.getFullYear()}`
  }
}

/**
 * Get full period info for UI display
 */
export function getPeriodInfo(type: PeriodType, date: Date = new Date()): PeriodInfo {
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
export function getTypeLabel(type: PeriodType): string {
  switch (type) {
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
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
 * Use this for dates where the local date matters (week starts)
 */
export function toLocalISODateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a local ISO date string (YYYY-MM-DD) into a Date object
 * Uses local timezone to avoid UTC date shifts.
 */
export function parseLocalISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the start of the week (Monday) as an ISO date string
 * Used for weekly period labels and date-based planning ranges
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
 * Check if two dates are in the same week
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  return getWeekStart(date1) === getWeekStart(date2)
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
 * Get the current year as a number
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Get the year from an ISO date string
 */
export function getYearFromDate(dateString: string): number {
  return new Date(dateString).getFullYear()
}

// ============================================================================
// Flexible Period Utilities (Calendar View Support)
// ============================================================================

/**
 * Check if a date falls within a period defined by start and end dates
 * Used for determining "current" periods with user-defined date ranges
 *
 * @param date - The date to check (Date object or ISO string)
 * @param startDate - Period start date (ISO string)
 * @param endDate - Period end date (ISO string)
 * @returns true if the date falls within the period (inclusive)
 */
export function isDateInPeriod(
  date: Date | string,
  startDate: string,
  endDate: string
): boolean {
  const dateStr = typeof date === 'string' ? date : toLocalISODateString(date)
  return dateStr >= startDate && dateStr <= endDate
}

/**
 * Check if two ISO date ranges overlap (inclusive)
 */
export function isDateRangeOverlapping(range: IsoDateRange, target: IsoDateRange): boolean {
  return range.startDate <= target.endDate && range.endDate >= target.startDate
}

/**
 * Check if a period is entirely in the past (ended before today)
 *
 * @param endDate - Period end date (ISO string)
 * @returns true if the period has ended
 */
export function isPastPeriod(endDate: string): boolean {
  const today = toLocalISODateString(new Date())
  return endDate < today
}

/**
 * Check if a period is current (today falls within the period)
 *
 * @param startDate - Period start date (ISO string)
 * @param endDate - Period end date (ISO string)
 * @returns true if today is within the period
 */
export function isCurrentPeriod(startDate: string, endDate: string): boolean {
  const today = toLocalISODateString(new Date())
  return today >= startDate && today <= endDate
}

/**
 * Check if a period is entirely in the future (hasn't started yet)
 *
 * @param startDate - Period start date (ISO string)
 * @returns true if the period hasn't started yet
 */
export function isFuturePeriod(startDate: string): boolean {
  const today = toLocalISODateString(new Date())
  return startDate > today
}

/**
 * Format a custom date range for display
 *
 * @param startDate - Period start date (ISO string)
 * @param endDate - Period end date (ISO string)
 * @returns Formatted string like "Jan 1 - Dec 31, 2026"
 */
export function formatPeriodDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const startMonth = months[start.getMonth()]
  const endMonth = months[end.getMonth()]
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${startYear}`
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${startYear}`
  }

  return `${startMonth} ${start.getDate()}, ${startYear} - ${endMonth} ${end.getDate()}, ${endYear}`
}

/**
 * Get a default period name based on the date range and period type
 *
 * @param startDate - Period start date (ISO string)
 * @param endDate - Period end date (ISO string)
 * @param type - Period type ('yearly' | 'monthly' | 'weekly')
 * @returns Default name like "2026", "January 2026", or "Jan 20 - 26"
 */
/**
 * Format a date range without year, e.g. "Jan 20 - Jan 26"
 */
export function formatPeriodDateRangeNoYear(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  const startMonth = months[start.getMonth()]
  const endMonth = months[end.getMonth()]

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

export function getDefaultPeriodName(
  startDate: string,
  endDate: string,
  type: 'yearly' | 'monthly' | 'weekly'
): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  switch (type) {
    case 'yearly': {
      // If it's a standard calendar year (Jan 1 - Dec 31), just show the year
      const isStandardYear =
        start.getMonth() === 0 &&
        start.getDate() === 1 &&
        end.getMonth() === 11 &&
        end.getDate() === 31 &&
        start.getFullYear() === end.getFullYear()

      if (isStandardYear) {
        return `${start.getFullYear()}`
      }
      // Otherwise show the date range
      return formatPeriodDateRange(startDate, endDate)
    }
    case 'monthly': {
      // If within the same month, show "Month Year"
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${months[start.getMonth()]} ${start.getFullYear()}`
      }
      return formatPeriodDateRange(startDate, endDate)
    }
    case 'weekly': {
      return formatPeriodDateRange(startDate, endDate)
    }
  }
}

/**
 * Suggest default dates for creating a new period
 *
 * @param type - Period type ('yearly' | 'monthly' | 'weekly')
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Object with suggested start and end dates as ISO strings
 */
export function suggestNextPeriodDates(
  type: 'yearly' | 'monthly' | 'weekly',
  referenceDate: Date = new Date()
): { startDate: string; endDate: string } {
  switch (type) {
    case 'yearly': {
      const year = referenceDate.getFullYear()
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      }
    }
    case 'monthly': {
      const monthRange = getMonthRange(referenceDate)
      return {
        startDate: toLocalISODateString(monthRange.start),
        endDate: toLocalISODateString(monthRange.end),
      }
    }
    case 'weekly': {
      const weekRange = getWeekRange(referenceDate)
      return {
        startDate: toLocalISODateString(weekRange.start),
        endDate: toLocalISODateString(weekRange.end),
      }
    }
  }
}

/**
 * Generate weekly ISO date ranges between two dates (inclusive)
 */
export function getWeekRangesBetween(startDate: string, endDate: string): IsoDateRange[] {
  if (!startDate || !endDate) return []
  const start = parseLocalISODate(startDate)
  const end = parseLocalISODate(endDate)
  if (start > end) return []

  const ranges: IsoDateRange[] = []
  let cursor = getWeekRange(start).start

  while (cursor <= end) {
    const range = getWeekRange(cursor)
    ranges.push({
      startDate: toLocalISODateString(range.start),
      endDate: toLocalISODateString(range.end),
    })
    const next = new Date(range.start)
    next.setDate(next.getDate() + 7)
    cursor = next
  }

  return ranges
}

/**
 * Generate monthly ISO date ranges between two dates (inclusive)
 */
export function getMonthRangesBetween(startDate: string, endDate: string): IsoDateRange[] {
  if (!startDate || !endDate) return []
  const start = parseLocalISODate(startDate)
  const end = parseLocalISODate(endDate)
  if (start > end) return []

  const ranges: IsoDateRange[] = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= end) {
    const range = getMonthRange(cursor)
    ranges.push({
      startDate: toLocalISODateString(range.start),
      endDate: toLocalISODateString(range.end),
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  return ranges
}

/**
 * Get today's date as an ISO string
 */
export function getTodayString(): string {
  return toLocalISODateString(new Date())
}
