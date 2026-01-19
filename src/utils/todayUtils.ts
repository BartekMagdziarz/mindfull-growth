import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import type { PeriodicEntry } from '@/domain/periodicEntry'
import {
  getWeekRange,
  toISODateString,
  getPreviousPeriodRange,
  formatDateRange,
  getWeekNumber,
  type PeriodRange,
} from './periodUtils'

export interface WeekSummary {
  journalCount: number
  emotionLogCount: number
  streak: number
  topEmotionIds: string[]
}

/**
 * Get today's date range (start to end of day in local timezone)
 */
export function getTodayRange(): PeriodRange {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { start, end }
}

/**
 * Check if a timestamp falls within today (local timezone)
 */
function isToday(timestamp: string): boolean {
  const date = new Date(timestamp)
  const today = getTodayRange()
  return date >= today.start && date <= today.end
}

/**
 * Filter journal entries created today
 */
export function getTodayJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => isToday(entry.createdAt))
}

/**
 * Filter emotion logs created today
 */
export function getTodayEmotionLogs(logs: EmotionLog[]): EmotionLog[] {
  return logs.filter((log) => isToday(log.createdAt))
}

/**
 * Get the week that should be reviewed based on user's preferred review day.
 * If today is the review day, we review the week that just ended (previous week).
 * The week runs Monday-Sunday, so if review day is Sunday, we review Mon-Sun of that same week.
 */
export function getReviewWeekRange(preferredDay: number): PeriodRange {
  const today = new Date()
  const currentDayOfWeek = today.getDay()

  // If today is the preferred review day, get the week that just ended
  if (currentDayOfWeek === preferredDay) {
    // For Sunday (0), the current week just ended, so review current week
    // For other days, we need to get the previous week
    if (preferredDay === 0) {
      // Sunday - review the Mon-Sun week that includes today
      return getWeekRange(today)
    } else {
      // Other days - review the previous complete week
      return getPreviousPeriodRange('weekly', getWeekRange(today).start)
    }
  }

  // Not the review day - return current week for reference
  return getWeekRange(today)
}

/**
 * Check if weekly review is due based on user's preferred day
 */
export function isWeeklyReviewDue(
  preferredDay: number,
  weeklyEntries: PeriodicEntry[]
): boolean {
  const today = new Date()
  const currentDayOfWeek = today.getDay()

  // Only show prompt on the preferred review day
  if (currentDayOfWeek !== preferredDay) {
    return false
  }

  // Get the week to review
  const reviewWeek = getReviewWeekRange(preferredDay)
  const periodStartDate = toISODateString(reviewWeek.start)

  // Check if entry exists for this week
  const existingEntry = weeklyEntries.find(
    (e) => e.type === 'weekly' && e.periodStartDate === periodStartDate
  )

  return !existingEntry
}

/**
 * Get a formatted label for the week to be reviewed
 */
export function getReviewWeekLabel(preferredDay: number): string {
  const reviewWeek = getReviewWeekRange(preferredDay)
  const weekNum = getWeekNumber(reviewWeek.start)
  const dateRange = formatDateRange(reviewWeek.start, reviewWeek.end, 'weekly')
  return `Week ${weekNum} (${dateRange})`
}

/**
 * Check if a date is within the current week (Monday-Sunday)
 */
function isInCurrentWeek(timestamp: string): boolean {
  const date = new Date(timestamp)
  const weekRange = getWeekRange(new Date())
  return date >= weekRange.start && date <= weekRange.end
}

/**
 * Filter entries from the current week
 */
export function getThisWeekJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => isInCurrentWeek(entry.createdAt))
}

/**
 * Filter emotion logs from the current week
 */
export function getThisWeekEmotionLogs(logs: EmotionLog[]): EmotionLog[] {
  return logs.filter((log) => isInCurrentWeek(log.createdAt))
}

/**
 * Calculate journaling streak (consecutive days with at least one journal OR emotion entry)
 */
export function calculateStreak(entries: JournalEntry[], logs: EmotionLog[]): number {
  // Combine all timestamps
  const allTimestamps = [
    ...entries.map((e) => e.createdAt),
    ...logs.map((l) => l.createdAt),
  ]

  if (allTimestamps.length === 0) {
    return 0
  }

  // Get unique dates (local timezone, YYYY-MM-DD format)
  const uniqueDates = new Set<string>()
  allTimestamps.forEach((ts) => {
    const date = new Date(ts)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    uniqueDates.add(dateStr)
  })

  // Check if today or yesterday has an entry (streak must be current)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  // If neither today nor yesterday has an entry, streak is 0
  if (!uniqueDates.has(todayStr) && !uniqueDates.has(yesterdayStr)) {
    return 0
  }

  // Count consecutive days
  let streak = 0
  let checkDate = uniqueDates.has(todayStr) ? today : yesterday

  while (true) {
    const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`

    if (uniqueDates.has(checkStr)) {
      streak++
      checkDate = new Date(checkDate)
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Get top emotions by frequency from a list of emotion IDs
 */
function getTopEmotions(emotionIds: string[], limit: number = 3): string[] {
  const frequency = new Map<string, number>()

  emotionIds.forEach((id) => {
    frequency.set(id, (frequency.get(id) || 0) + 1)
  })

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}

/**
 * Get week summary with stats and top emotions
 */
export function getWeekSummary(entries: JournalEntry[], logs: EmotionLog[]): WeekSummary {
  const weekEntries = getThisWeekJournalEntries(entries)
  const weekLogs = getThisWeekEmotionLogs(logs)

  // Collect all emotion IDs from the week
  const allEmotionIds: string[] = []

  weekEntries.forEach((entry) => {
    if (entry.emotionIds) {
      allEmotionIds.push(...entry.emotionIds)
    }
  })

  weekLogs.forEach((log) => {
    allEmotionIds.push(...log.emotionIds)
  })

  return {
    journalCount: weekEntries.length,
    emotionLogCount: weekLogs.length,
    streak: calculateStreak(entries, logs),
    topEmotionIds: getTopEmotions(allEmotionIds),
  }
}
