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
 * Get the day range for a given date (single day)
 */
export function getDayRange(date: Date = new Date()): PeriodRange {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date)
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
    case 'daily':
      return getDayRange(date)
    case 'weekly':
      return getWeekRange(date)
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
    case 'daily':
      prevDate.setDate(prevDate.getDate() - 1)
      return getDayRange(prevDate)
    case 'weekly':
      prevDate.setDate(prevDate.getDate() - 7)
      return getWeekRange(prevDate)
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
    case 'daily':
      return `${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`
    case 'weekly': {
      const startMonth = months[start.getMonth()]
      const endMonth = months[end.getMonth()]
      if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()}-${end.getDate()}`
      }
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
    }
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
    case 'daily':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    case 'weekly':
      return `Week ${getWeekNumber(date)}`
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
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'quarterly':
      return 'Quarterly'
    case 'yearly':
      return 'Yearly'
  }
}
