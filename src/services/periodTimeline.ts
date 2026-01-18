import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import type { PeriodRange } from '@/utils/periodUtils'

export interface TimelineJournalEntry {
  id: string
  title?: string
  body: string
  createdAt: string
}

export interface TimelineEmotionLog {
  id: string
  emotionIds: string[]
  note?: string
  createdAt: string
}

export interface WeeklyDaySummary {
  isoDate: string
  weekdayLabel: string
  dateLabel: string
  journalEntries: TimelineJournalEntry[]
  emotionLogs: TimelineEmotionLog[]
  topEmotionIds: string[]
  topPeopleTagIds: string[]
  topContextTagIds: string[]
  journalCount: number
  emotionCount: number
}

interface WeeklySummaryInput {
  journalEntries: JournalEntry[]
  emotionLogs: EmotionLog[]
  range: PeriodRange
}

const TOP_EMOTION_COUNT = 3
const TOP_TAG_COUNT = 2

function toLocalISODate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function normalizeToEndOfDay(date: Date): Date {
  const normalized = new Date(date)
  normalized.setHours(23, 59, 59, 999)
  return normalized
}

function isDateInRange(date: Date, range: PeriodRange): boolean {
  return date >= range.start && date <= range.end
}

function filterJournalEntries(entries: JournalEntry[], range: PeriodRange): JournalEntry[] {
  return entries.filter((entry) => isDateInRange(new Date(entry.createdAt), range))
}

function filterEmotionLogs(logs: EmotionLog[], range: PeriodRange): EmotionLog[] {
  return logs.filter((log) => isDateInRange(new Date(log.createdAt), range))
}

function groupByLocalDate<T extends { createdAt: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = toLocalISODate(new Date(item.createdAt))
    const bucket = map.get(key)
    if (bucket) {
      bucket.push(item)
    } else {
      map.set(key, [item])
    }
  }
  return map
}

function getTopEmotionIds(
  journalEntries: JournalEntry[],
  emotionLogs: EmotionLog[],
  limit: number
): string[] {
  const counts = new Map<string, number>()

  for (const entry of journalEntries) {
    for (const emotionId of entry.emotionIds ?? []) {
      counts.set(emotionId, (counts.get(emotionId) ?? 0) + 1)
    }
  }

  for (const log of emotionLogs) {
    for (const emotionId of log.emotionIds ?? []) {
      counts.set(emotionId, (counts.get(emotionId) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([emotionId]) => emotionId)
}

function getTopTagIds(
  journalEntries: JournalEntry[],
  emotionLogs: EmotionLog[],
  tagType: 'people' | 'context',
  limit: number
): string[] {
  const counts = new Map<string, number>()

  for (const entry of journalEntries) {
    const tagIds = tagType === 'people' ? entry.peopleTagIds : entry.contextTagIds
    for (const tagId of tagIds ?? []) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
    }
  }

  for (const log of emotionLogs) {
    const tagIds = tagType === 'people' ? log.peopleTagIds : log.contextTagIds
    for (const tagId of tagIds ?? []) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tagId]) => tagId)
}

export function buildWeeklyDaySummaries(input: WeeklySummaryInput): WeeklyDaySummary[] {
  const range = {
    start: normalizeToStartOfDay(input.range.start),
    end: normalizeToEndOfDay(input.range.end),
  }

  const periodEntries = filterJournalEntries(input.journalEntries, range)
  const periodLogs = filterEmotionLogs(input.emotionLogs, range)
  const entriesByDate = groupByLocalDate(periodEntries)
  const logsByDate = groupByLocalDate(periodLogs)

  const startKey = toLocalISODate(range.start)
  const startDate = parseLocalISODate(startKey)
  const summaries: WeeklyDaySummary[] = []

  for (let i = 0; i < 7; i += 1) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    const key = toLocalISODate(currentDate)

    const dayEntryItems = entriesByDate.get(key) ?? []
    const dayLogItems = logsByDate.get(key) ?? []

    const dayEntries = [...dayEntryItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        createdAt: entry.createdAt,
      }))

    const dayLogs = [...dayLogItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((log) => ({
        id: log.id,
        emotionIds: log.emotionIds ?? [],
        note: log.note,
        createdAt: log.createdAt,
      }))

    summaries.push({
      isoDate: key,
      weekdayLabel: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      journalEntries: dayEntries,
      emotionLogs: dayLogs,
      topEmotionIds: getTopEmotionIds(dayEntryItems, dayLogItems, TOP_EMOTION_COUNT),
      topPeopleTagIds: getTopTagIds(dayEntryItems, dayLogItems, 'people', TOP_TAG_COUNT),
      topContextTagIds: getTopTagIds(dayEntryItems, dayLogItems, 'context', TOP_TAG_COUNT),
      journalCount: dayEntries.length,
      emotionCount: dayLogs.length,
    })
  }

  return summaries
}

