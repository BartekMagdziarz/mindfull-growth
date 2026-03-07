import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import { getWeekRange, type PeriodRange } from './periodUtils'

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
