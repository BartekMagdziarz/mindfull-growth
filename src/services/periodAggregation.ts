import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import type {
  PeriodAggregatedData,
  EmotionFrequency,
  TagEmotionAssociation,
} from '@/domain/periodicEntry'
import type { PeriodRange } from '@/utils/periodUtils'
import { toISODateString } from '@/utils/periodUtils'

export interface AggregationInput {
  journalEntries: JournalEntry[]
  emotionLogs: EmotionLog[]
  periodRange: PeriodRange
}

/**
 * Filter journal entries that fall within the given period range
 */
function filterJournalEntriesInRange(
  entries: JournalEntry[],
  range: PeriodRange
): JournalEntry[] {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.createdAt)
    return entryDate >= range.start && entryDate <= range.end
  })
}

/**
 * Filter emotion logs that fall within the given period range
 */
function filterEmotionLogsInRange(
  logs: EmotionLog[],
  range: PeriodRange
): EmotionLog[] {
  return logs.filter((log) => {
    const logDate = new Date(log.createdAt)
    return logDate >= range.start && logDate <= range.end
  })
}

/**
 * Calculate emotion frequency from journal entries and emotion logs
 */
function calculateEmotionFrequency(
  journalEntries: JournalEntry[],
  emotionLogs: EmotionLog[]
): EmotionFrequency[] {
  const frequencyMap = new Map<string, number>()

  // Count emotions from journal entries
  for (const entry of journalEntries) {
    for (const emotionId of entry.emotionIds ?? []) {
      frequencyMap.set(emotionId, (frequencyMap.get(emotionId) ?? 0) + 1)
    }
  }

  // Count emotions from emotion logs
  for (const log of emotionLogs) {
    for (const emotionId of log.emotionIds ?? []) {
      frequencyMap.set(emotionId, (frequencyMap.get(emotionId) ?? 0) + 1)
    }
  }

  // Convert to array and sort by count descending
  const frequencies: EmotionFrequency[] = Array.from(frequencyMap.entries()).map(
    ([emotionId, count]) => ({ emotionId, count })
  )

  return frequencies.sort((a, b) => b.count - a.count)
}

interface TagEmotionEntry {
  tagId: string
  tagType: 'people' | 'context'
  emotionIds: string[]
}

/**
 * Calculate tag-emotion associations from journal entries and emotion logs
 */
function calculateTagEmotionAssociations(
  journalEntries: JournalEntry[],
  emotionLogs: EmotionLog[]
): TagEmotionAssociation[] {
  const tagMap = new Map<string, TagEmotionEntry>()

  // Helper to add tag-emotion associations
  function addAssociation(
    tagId: string,
    tagType: 'people' | 'context',
    emotionIds: string[]
  ) {
    const key = `${tagType}-${tagId}`
    const existing = tagMap.get(key)
    if (existing) {
      existing.emotionIds.push(...emotionIds)
    } else {
      tagMap.set(key, { tagId, tagType, emotionIds: [...emotionIds] })
    }
  }

  // Process journal entries
  for (const entry of journalEntries) {
    const emotionIds = entry.emotionIds ?? []
    if (emotionIds.length === 0) continue

    for (const peopleTagId of entry.peopleTagIds ?? []) {
      addAssociation(peopleTagId, 'people', emotionIds)
    }
    for (const contextTagId of entry.contextTagIds ?? []) {
      addAssociation(contextTagId, 'context', emotionIds)
    }
  }

  // Process emotion logs
  for (const log of emotionLogs) {
    const emotionIds = log.emotionIds ?? []
    if (emotionIds.length === 0) continue

    for (const peopleTagId of log.peopleTagIds ?? []) {
      addAssociation(peopleTagId, 'people', emotionIds)
    }
    for (const contextTagId of log.contextTagIds ?? []) {
      addAssociation(contextTagId, 'context', emotionIds)
    }
  }

  // Convert to TagEmotionAssociation with top emotions
  const associations: TagEmotionAssociation[] = []

  for (const [, entry] of tagMap) {
    // Count emotion occurrences for this tag
    const emotionCounts = new Map<string, number>()
    for (const emotionId of entry.emotionIds) {
      emotionCounts.set(emotionId, (emotionCounts.get(emotionId) ?? 0) + 1)
    }

    // Get top 3 emotions by frequency
    const sortedEmotions = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotionId]) => emotionId)

    associations.push({
      tagId: entry.tagId,
      tagType: entry.tagType,
      frequency: countTagOccurrences(entry.tagId, entry.tagType, journalEntries, emotionLogs),
      topEmotionIds: sortedEmotions,
    })
  }

  // Sort by frequency descending
  return associations.sort((a, b) => b.frequency - a.frequency)
}

/**
 * Count how many times a tag appears across entries and logs
 */
function countTagOccurrences(
  tagId: string,
  tagType: 'people' | 'context',
  journalEntries: JournalEntry[],
  emotionLogs: EmotionLog[]
): number {
  let count = 0

  for (const entry of journalEntries) {
    const tagIds = tagType === 'people' ? entry.peopleTagIds : entry.contextTagIds
    if ((tagIds ?? []).includes(tagId)) {
      count++
    }
  }

  for (const log of emotionLogs) {
    const tagIds = tagType === 'people' ? log.peopleTagIds : log.contextTagIds
    if ((tagIds ?? []).includes(tagId)) {
      count++
    }
  }

  return count
}

/**
 * Aggregate data for a period from journal entries and emotion logs
 */
export function aggregatePeriodData(input: AggregationInput): PeriodAggregatedData {
  const { journalEntries, emotionLogs, periodRange } = input

  // Filter entries within the period range
  const periodJournalEntries = filterJournalEntriesInRange(journalEntries, periodRange)
  const periodEmotionLogs = filterEmotionLogsInRange(emotionLogs, periodRange)

  // Calculate aggregations
  const emotionFrequency = calculateEmotionFrequency(periodJournalEntries, periodEmotionLogs)
  const tagEmotionAssociations = calculateTagEmotionAssociations(
    periodJournalEntries,
    periodEmotionLogs
  )

  return {
    periodStartDate: toISODateString(periodRange.start),
    periodEndDate: toISODateString(periodRange.end),
    journalEntryIds: periodJournalEntries.map((e) => e.id),
    emotionLogIds: periodEmotionLogs.map((l) => l.id),
    emotionFrequency,
    tagEmotionAssociations,
  }
}

/**
 * Get the total emotion count from aggregated data
 */
export function getTotalEmotionCount(data: PeriodAggregatedData): number {
  return data.emotionFrequency.reduce((sum, ef) => sum + ef.count, 0)
}

/**
 * Check if there is any data for the period
 */
export function hasAnyData(data: PeriodAggregatedData): boolean {
  return data.journalEntryIds.length > 0 || data.emotionLogIds.length > 0
}
