/**
 * Builds auto-generated data summaries for the weekly/monthly reflection "Review" step.
 */

import type { MonthRef, WeekRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useJournalStore } from '@/stores/journal.store'
import { getPeriodBounds } from '@/utils/periods'
import { getWeekPlanningBundle, getMonthPlanningBundle } from '@/services/planningStateQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import type { WeeklyReflection } from '@/domain/reflection'
import { WEEKLY_RATING_KEYS } from '@/domain/reflection'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmotionSummary {
  totalLogs: number
  topEmotions: { emotionId: string; name: string; count: number }[]
  quadrantDistribution: Record<Quadrant, number>
}

export interface JournalSummary {
  totalEntries: number
  entries: { id: string; title?: string; createdAt: string }[]
}

export interface HabitSummary {
  totalActive: number
  metCount: number
  missedCount: number
}

export interface ExerciseSummary {
  totalCompleted: number
  types: string[]
}

export interface WeeklyReflectionDataBundle {
  weekRef: WeekRef
  emotionSummary: EmotionSummary
  journalSummary: JournalSummary
  habitSummary: HabitSummary
  exerciseSummary: ExerciseSummary
}

export interface WeeklyRatingTrendEntry {
  weekRef: WeekRef
  moodRating: number | null
  energyRating: number | null
  focusRating: number | null
  socialConnectionRating: number | null
  stressLevelRating: number | null
}

export interface WeeklyReflectionSnippet {
  weekRef: WeekRef
  freeformSnippet: string
}

export interface MonthlyReflectionDataBundle {
  monthRef: MonthRef
  emotionSummary: EmotionSummary
  journalSummary: JournalSummary
  habitSummary: HabitSummary
  exerciseSummary: ExerciseSummary
  weeklyRatingTrends: WeeklyRatingTrendEntry[]
  weeklyReflectionSnippets: WeeklyReflectionSnippet[]
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function buildEmotionSummary(startDate: string, endDate: string): EmotionSummary {
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()

  const logs = emotionLogStore.sortedLogs.filter(
    (log) => log.createdAt >= startDate && log.createdAt <= endDate
  )

  const emotionCounts = new Map<string, number>()
  const quadrantCounts: Record<Quadrant, number> = {
    'high-energy-high-pleasantness': 0,
    'high-energy-low-pleasantness': 0,
    'low-energy-high-pleasantness': 0,
    'low-energy-low-pleasantness': 0,
  }

  for (const log of logs) {
    for (const emotionId of log.emotionIds) {
      emotionCounts.set(emotionId, (emotionCounts.get(emotionId) ?? 0) + 1)
      const emotion = emotionStore.getEmotionById(emotionId)
      if (emotion) {
        quadrantCounts[getQuadrant(emotion)]++
      }
    }
  }

  const topEmotions = [...emotionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotionId, count]) => ({
      emotionId,
      name: emotionStore.getEmotionById(emotionId)?.name ?? emotionId,
      count,
    }))

  return {
    totalLogs: logs.length,
    topEmotions,
    quadrantDistribution: quadrantCounts,
  }
}

function buildJournalSummary(startDate: string, endDate: string): JournalSummary {
  const journalStore = useJournalStore()
  const entries = journalStore.sortedEntries.filter(
    (entry) => entry.createdAt >= startDate && entry.createdAt <= endDate
  )

  return {
    totalEntries: entries.length,
    entries: entries.map((e) => ({ id: e.id, title: e.title, createdAt: e.createdAt })),
  }
}

// ---------------------------------------------------------------------------
// Weekly bundle
// ---------------------------------------------------------------------------

export async function getWeeklyReflectionDataBundle(
  weekRef: WeekRef
): Promise<WeeklyReflectionDataBundle> {
  const bounds = getPeriodBounds(weekRef)
  const startDate = bounds.start + 'T00:00:00.000Z'
  const endDate = bounds.end + 'T23:59:59.999Z'

  const emotionSummary = buildEmotionSummary(startDate, endDate)
  const journalSummary = buildJournalSummary(startDate, endDate)

  // Habits from planning bundle
  let habitSummary: HabitSummary = { totalActive: 0, metCount: 0, missedCount: 0 }
  try {
    const planningBundle = await getWeekPlanningBundle(weekRef)
    const measurements = planningBundle.relevant?.measurementItems ?? []
    const habits = measurements.filter((m) => m.subjectType === 'habit')
    let metCount = 0
    let missedCount = 0
    for (const habit of habits) {
      const summary = buildMeasurementSummary(
        habit.subject,
        planningBundle.rawEntries,
        weekRef
      )
      if (summary.evaluationStatus === 'met') metCount++
      else if (summary.evaluationStatus === 'missed') missedCount++
    }
    habitSummary = { totalActive: habits.length, metCount, missedCount }
  } catch {
    // Planning data may not exist for this period
  }

  const exerciseSummary: ExerciseSummary = { totalCompleted: 0, types: [] }

  return {
    weekRef,
    emotionSummary,
    journalSummary,
    habitSummary,
    exerciseSummary,
  }
}

// ---------------------------------------------------------------------------
// Monthly bundle
// ---------------------------------------------------------------------------

export async function getMonthlyReflectionDataBundle(
  monthRef: MonthRef
): Promise<MonthlyReflectionDataBundle> {
  const bounds = getPeriodBounds(monthRef)
  const startDate = bounds.start + 'T00:00:00.000Z'
  const endDate = bounds.end + 'T23:59:59.999Z'

  const emotionSummary = buildEmotionSummary(startDate, endDate)
  const journalSummary = buildJournalSummary(startDate, endDate)

  // Habits from month planning bundle
  let habitSummary: HabitSummary = { totalActive: 0, metCount: 0, missedCount: 0 }
  try {
    const planningBundle = await getMonthPlanningBundle(monthRef)
    const habits = planningBundle.measurementItems.filter((m) => m.subjectType === 'habit')
    let metCount = 0
    let missedCount = 0
    for (const habit of habits) {
      const summary = buildMeasurementSummary(
        habit.subject,
        planningBundle.rawEntries,
        monthRef
      )
      if (summary.evaluationStatus === 'met') metCount++
      else if (summary.evaluationStatus === 'missed') missedCount++
    }
    habitSummary = { totalActive: habits.length, metCount, missedCount }
  } catch {
    // Planning data may not exist
  }

  const exerciseSummary: ExerciseSummary = { totalCompleted: 0, types: [] }

  // Weekly rating trends and snippets
  const weeklyReflections = await structuredReflectionDexieRepository.getWeeklyForMonth(monthRef)
  const weeklyRatingTrends = buildWeeklyRatingTrends(weeklyReflections)
  const weeklyReflectionSnippets = buildWeeklySnippets(weeklyReflections)

  return {
    monthRef,
    emotionSummary,
    journalSummary,
    habitSummary,
    exerciseSummary,
    weeklyRatingTrends,
    weeklyReflectionSnippets,
  }
}

// ---------------------------------------------------------------------------
// Weekly trends helpers
// ---------------------------------------------------------------------------

function buildWeeklyRatingTrends(reflections: WeeklyReflection[]): WeeklyRatingTrendEntry[] {
  return [...reflections]
    .sort((a, b) => a.weekRef.localeCompare(b.weekRef))
    .map((r) => ({
      weekRef: r.weekRef,
      [WEEKLY_RATING_KEYS[0]]: r[WEEKLY_RATING_KEYS[0]],
      [WEEKLY_RATING_KEYS[1]]: r[WEEKLY_RATING_KEYS[1]],
      [WEEKLY_RATING_KEYS[2]]: r[WEEKLY_RATING_KEYS[2]],
      [WEEKLY_RATING_KEYS[3]]: r[WEEKLY_RATING_KEYS[3]],
      [WEEKLY_RATING_KEYS[4]]: r[WEEKLY_RATING_KEYS[4]],
    })) as WeeklyRatingTrendEntry[]
}

function buildWeeklySnippets(reflections: WeeklyReflection[]): WeeklyReflectionSnippet[] {
  return [...reflections]
    .sort((a, b) => a.weekRef.localeCompare(b.weekRef))
    .filter((r) => r.freeformReflection.trim().length > 0)
    .map((r) => ({
      weekRef: r.weekRef,
      freeformSnippet:
        r.freeformReflection.length > 120
          ? r.freeformReflection.slice(0, 120) + '...'
          : r.freeformReflection,
    }))
}
