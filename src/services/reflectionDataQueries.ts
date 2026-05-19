/**
 * Builds auto-generated data summaries for the weekly/monthly reflection "Review" step.
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import { getDisplayTitle } from '@/domain/journal'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useJournalStore } from '@/stores/journal.store'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'
import { getUserDatabase } from '@/services/userDatabase.service'
import {
  getWeekRelevantObjects,
  getMonthPlanningBundle,
} from '@/services/planningStateQueries'
import type {
  MeasurementPlanningSummary,
  WeekCadencedReflectionItem,
  WeekMeasurementReflectionItem,
  WeekTrackerReflectionItem,
} from '@/services/planningStateQueries'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import type { MeasureableSubject, MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementSubjectType } from '@/domain/planningState'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import type { WeeklyReflection } from '@/domain/reflection'
import {
  WEEKLY_CONTEXT_KEYS,
  WEEKLY_STATE_KEYS,
  WEEKLY_EVALUATION_KEYS,
} from '@/domain/reflection'
import type { Goal, GoalStatus, MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { MeasurementEvaluationStatus } from '@/services/measurementProgress'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmotionSummary {
  totalLogs: number
  topEmotions: { emotionId: string; name: string; count: number; quadrant: Quadrant }[]
  quadrantDistribution: Record<Quadrant, number>
}

export interface JournalSummary {
  totalEntries: number
  entries: { id: string; title: string; createdAt: string }[]
}

export interface HabitSummary {
  totalActive: number
  metCount: number
  missedCount: number
}

export interface TrackerSummary {
  totalActive: number
}

export interface ExerciseSummary {
  totalCompleted: number
  types: string[]
}

export interface KRWeeklyBreakdown {
  weekRef: WeekRef
  evaluationStatus: MeasurementEvaluationStatus
  actualValue?: number
}

export interface GoalReflectionSummary {
  goal: { id: string; title: string; icon?: string; status: GoalStatus }
  keyResults: {
    id: string
    title: string
    cadence: PlanningCadence
    entryMode: MeasurementEntryMode
    evaluationStatus: MeasurementEvaluationStatus
    actualValue?: number
    target?: MeasurementTarget
    weeklyBreakdown?: KRWeeklyBreakdown[]
  }[]
}

export interface HabitReflectionDetail {
  id: string
  title: string
  icon?: string
  cadence: PlanningCadence
  entryMode: MeasurementEntryMode
  evaluationStatus: MeasurementEvaluationStatus
  actualValue?: number
  target?: MeasurementTarget
  weeklyBreakdown?: KRWeeklyBreakdown[]
}

export interface TrackerReflectionDetail {
  id: string
  title: string
  icon?: string
  entryMode: MeasurementEntryMode
  entries: { dayRef: DayRef; value: number | null }[]
  latestValue?: number
}

export interface WeeklyReflectionDetail {
  weekRef: WeekRef
  freeformReflection: string
  promptResponses: Record<string, string>
}

export interface DailyHabitItem {
  id: string
  name: string
  status: 'completed' | 'missed'
  value?: number
}

export interface DailyActivityBreakdown {
  dayRef: DayRef
  habits: {
    items: DailyHabitItem[]
  }
  emotions: {
    items: { emotionId: string; name: string; quadrant: Quadrant }[]
    totalLogs: number
    quadrantCounts: Record<Quadrant, number>
    sessions: { createdAt: string; emotionIds: string[]; note?: string }[]
  }
  journal: {
    items: { id: string; title: string; body?: string; hasAISuggestions?: boolean }[]
  }
  exercises: {
    count: number
    types: string[]
    items: { id: string; type: string; createdAt: string }[]
  }
  keyResults: {
    items: { id: string; name: string; value: number | null }[]
  }
  trackers: {
    items: { id: string; name: string; value: number | null }[]
  }
}

export interface WeeklySummary {
  weeklyHabits: {
    id: string
    name: string
    evaluationStatus: MeasurementEvaluationStatus
    actualValue?: number
    target?: MeasurementTarget
    entryCount: number
  }[]
  monthlyHabits: {
    id: string
    name: string
    weekEntryCount: number
    weekValue?: number
  }[]
  totalEmotionLogs: number
  totalJournalEntries: number
  totalExercises: number
}

export interface WeekGoalReflectionGroup {
  goal: { id: string; title: string; icon?: string; status: GoalStatus }
  keyResults: WeekCadencedReflectionItem[]
}

/**
 * Flat representation of a goal/habit/tracker that was active during the
 * reflection week. Consumed by the unified weekly objects grid which replaces
 * the older three-panel split. KR items carry the parent goal's icon/title
 * so the tile can show goal-context without the consumer doing extra joins.
 */
export interface WeekObjectItem {
  key: string
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  planning: MeasurementPlanningSummary
  measurement: MeasurementSummary
  parentGoalId?: string
  parentGoalIcon?: string
  parentGoalTitle?: string
  sortOrder: number
}

export interface WeeklyReflectionDataBundle {
  weekRef: WeekRef
  emotionSummary: EmotionSummary
  journalSummary: JournalSummary
  habitSummary: HabitSummary
  exerciseSummary: ExerciseSummary
  dailyBreakdown: DailyActivityBreakdown[]
  weeklySummary: WeeklySummary
  // Chart-ready data for Step 1 (review) — reuses Today visualization rules
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  goalReflectionGroups: WeekGoalReflectionGroup[]
  habitReflectionItems: WeekCadencedReflectionItem[]
  trackerReflectionItems: WeekTrackerReflectionItem[]
  /** Flat, sorted list of objects active during the week (KR→habits→trackers). */
  weekObjectItems: WeekObjectItem[]
}

export interface WeeklyRatingTrendEntry {
  weekRef: WeekRef
  // Context
  physicalIntensityRating: number | null
  taskLoadRating: number | null
  emotionalIntensityRating: number | null
  socialIntensityRating: number | null
  // State
  moodRating: number | null
  energyRating: number | null
  calmRating: number | null
  connectionRating: number | null
  // Evaluation
  productivityRating: number | null
  engagementRating: number | null
  emotionalRegulationRating: number | null
  selfCareRating: number | null
}

export interface WeeklyReflectionSnippet {
  weekRef: WeekRef
  freeformSnippet: string
}

/**
 * Per-day summary for the month calendar visualization in the monthly
 * reflection wizard's review step. One entry per day in the month, in
 * chronological order. `weekday` is ISO (1 = Monday … 7 = Sunday).
 */
export interface DailyCalendarSummary {
  dayRef: DayRef
  dayNumber: number
  weekday: number
  totalEmotions: number
  quadrantCounts: Record<Quadrant, number>
  hasJournal: boolean
}

export interface MonthlyReflectionDataBundle {
  monthRef: MonthRef
  emotionSummary: EmotionSummary
  journalSummary: JournalSummary
  habitSummary: HabitSummary
  trackerSummary: TrackerSummary
  exerciseSummary: ExerciseSummary
  goalSummaries: GoalReflectionSummary[]
  habitDetails: HabitReflectionDetail[]
  trackerDetails: TrackerReflectionDetail[]
  weeklyRatingTrends: WeeklyRatingTrendEntry[]
  weeklyReflectionSnippets: WeeklyReflectionSnippet[]
  weeklyReflectionDetails: WeeklyReflectionDetail[]
  monthWeekRefs: WeekRef[]
  dailyCalendarSummaries: DailyCalendarSummary[]
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
    .map(([emotionId, count]) => {
      const emotion = emotionStore.getEmotionById(emotionId)
      return {
        emotionId,
        name: emotion?.name ?? emotionId,
        count,
        quadrant: emotion ? getQuadrant(emotion) : 'low-energy-low-pleasantness' as Quadrant,
      }
    })

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
    entries: entries.map((e) => ({ id: e.id, title: getDisplayTitle(e), createdAt: e.createdAt })),
  }
}

/**
 * Builds one `DailyCalendarSummary` per day of the given month so the monthly
 * reflection's review step can render a calendar grid where each cell shows
 * the per-day emotion-quadrant distribution and a journal indicator.
 */
function buildDailyCalendarSummaries(monthRef: MonthRef): DailyCalendarSummary[] {
  const monthBounds = getPeriodBounds(monthRef)
  const days: DayRef[] = []
  for (
    let d = monthBounds.start as DayRef;
    d <= (monthBounds.end as DayRef);
    d = addDayRef(d, 1)
  ) {
    days.push(d)
  }

  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const journalStore = useJournalStore()

  const monthStart = monthBounds.start + 'T00:00:00.000Z'
  const monthEnd = monthBounds.end + 'T23:59:59.999Z'

  const monthEmotionLogs = emotionLogStore.sortedLogs.filter(
    (log) => log.createdAt >= monthStart && log.createdAt <= monthEnd
  )
  const monthJournalEntries = journalStore.sortedEntries.filter(
    (entry) => entry.createdAt >= monthStart && entry.createdAt <= monthEnd
  )

  return days.map((dayRef) => {
    const dayStart = dayRef + 'T00:00:00.000Z'
    const dayEnd = dayRef + 'T23:59:59.999Z'

    const quadrantCounts: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
    let totalEmotions = 0
    for (const log of monthEmotionLogs) {
      if (log.createdAt < dayStart || log.createdAt > dayEnd) continue
      for (const emotionId of log.emotionIds) {
        const emotion = emotionStore.getEmotionById(emotionId)
        if (emotion) {
          quadrantCounts[getQuadrant(emotion)]++
          totalEmotions++
        }
      }
    }

    const hasJournal = monthJournalEntries.some(
      (entry) => entry.createdAt >= dayStart && entry.createdAt <= dayEnd,
    )

    // Parse YYYY-MM-DD into day number + ISO weekday (1=Mon … 7=Sun)
    const [yearStr, monthStr, dayStr] = dayRef.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const dayNumber = Number(dayStr)
    const jsWeekday = new Date(Date.UTC(year, month - 1, dayNumber)).getUTCDay()
    const weekday = jsWeekday === 0 ? 7 : jsWeekday

    return {
      dayRef,
      dayNumber,
      weekday,
      totalEmotions,
      quadrantCounts,
      hasJournal,
    }
  })
}

/** Adds `amount` days to a `YYYY-MM-DD` ref without depending on internal helpers. */
function addDayRef(dayRef: DayRef, amount: number): DayRef {
  const [yearStr, monthStr, dayStr] = dayRef.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const next = new Date(Date.UTC(year, month - 1, day + amount))
  const y = next.getUTCFullYear().toString().padStart(4, '0')
  const m = (next.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = next.getUTCDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}` as DayRef
}

// ---------------------------------------------------------------------------
// Exercise helpers
// ---------------------------------------------------------------------------

export interface ExerciseEntry {
  createdAt: string
  type: string
}

const EXERCISE_TABLES: { table: string; type: string }[] = [
  // CBT
  { table: 'thoughtRecords', type: 'thoughtRecord' },
  { table: 'distortionAssessments', type: 'distortionAssessment' },
  { table: 'worryTreeEntries', type: 'worryTree' },
  { table: 'coreBeliefsExplorations', type: 'coreBeliefs' },
  { table: 'compassionateLetters', type: 'compassionateLetter' },
  { table: 'positiveDataLogs', type: 'positiveDataLog' },
  { table: 'behavioralExperiments', type: 'behavioralExperiment' },
  { table: 'behavioralActivations', type: 'behavioralActivation' },
  { table: 'structuredProblemSolvings', type: 'structuredProblemSolving' },
  { table: 'gradedExposureHierarchies', type: 'gradedExposure' },
  // Logotherapy
  { table: 'threePathwaysToMeaning', type: 'threePathways' },
  { table: 'socraticSelfDialogues', type: 'socraticDialogue' },
  { table: 'mountainRangesOfMeaning', type: 'mountainRange' },
  { table: 'paradoxicalIntentionLabs', type: 'paradoxicalIntention' },
  { table: 'dereflectionPractices', type: 'dereflection' },
  { table: 'tragicOptimisms', type: 'tragicOptimism' },
  { table: 'attitudinalShifts', type: 'attitudinalShift' },
  { table: 'legacyLetters', type: 'legacyLetter' },
  // IFS (excluding ifsParts — shared entity, not an exercise)
  { table: 'ifsPartsMaps', type: 'partsMapping' },
  { table: 'ifsUnblendingSessions', type: 'unblending' },
  { table: 'ifsDirectAccessSessions', type: 'directAccess' },
  { table: 'ifsTrailheadEntries', type: 'trailhead' },
  { table: 'ifsProtectorAppreciations', type: 'protectorAppreciation' },
  { table: 'ifsExileWitnessings', type: 'exileWitnessing' },
  { table: 'ifsSelfEnergyCheckIns', type: 'selfEnergy' },
  { table: 'ifsPartsDialogues', type: 'partsDialogue' },
  { table: 'ifsDailyCheckIns', type: 'ifsDailyCheckIn' },
  { table: 'ifsConstellations', type: 'constellation' },
  // Self-Discovery
  { table: 'valueMaps', type: 'valueMap' },
  { table: 'valuesDiscoveries', type: 'valuesDiscovery' },
  { table: 'shadowBeliefs', type: 'shadowBeliefs' },
  { table: 'transformativePurposes', type: 'transformativePurpose' },
]

export async function getExerciseEntriesForPeriod(
  startDate: string,
  endDate: string,
): Promise<ExerciseEntry[]> {
  const db = getUserDatabase()
  const results: ExerciseEntry[] = []

  await Promise.all(
    EXERCISE_TABLES.map(async ({ table, type }) => {
      try {
        const entries = await db.table(table).toArray()
        for (const entry of entries) {
          if (entry.createdAt >= startDate && entry.createdAt <= endDate) {
            results.push({ createdAt: entry.createdAt, type })
          }
        }
      } catch {
        // Table may not exist in older schema versions
      }
    })
  )

  return results
}

/**
 * Fuller exercise record shape used by the psychological profile builder.
 * Unlike `ExerciseEntry`, this carries the raw row so downstream code can
 * look at free-text fields (situation, hotThought, freeformReflection, …).
 */
export interface ExerciseSessionBundle {
  id: string
  type: string
  createdAt: string
  raw: Record<string, unknown>
}

/**
 * Loads every exercise session across all exercise tables whose createdAt
 * falls within [startDate, endDate]. Returns full rows (not just timestamps)
 * so summarisation code can inspect per-type fields.
 */
export async function getExerciseSessionBundlesForPeriod(
  startDate: string,
  endDate: string,
): Promise<ExerciseSessionBundle[]> {
  const db = getUserDatabase()
  const results: ExerciseSessionBundle[] = []

  await Promise.all(
    EXERCISE_TABLES.map(async ({ table, type }) => {
      try {
        const entries = await db.table(table).toArray()
        for (const entry of entries) {
          if (
            entry &&
            typeof entry.createdAt === 'string' &&
            entry.createdAt >= startDate &&
            entry.createdAt <= endDate
          ) {
            results.push({
              id: typeof entry.id === 'string' ? entry.id : `${type}-${entry.createdAt}`,
              type,
              createdAt: entry.createdAt,
              raw: entry as Record<string, unknown>,
            })
          }
        }
      } catch {
        // Table may not exist in older schema versions
      }
    })
  )

  return results
}

function buildExerciseSummary(exerciseEntries: ExerciseEntry[]): ExerciseSummary {
  return {
    totalCompleted: exerciseEntries.length,
    types: [...new Set(exerciseEntries.map((e) => e.type))],
  }
}

// ---------------------------------------------------------------------------
// Daily breakdown
// ---------------------------------------------------------------------------

function buildDailyBreakdown(
  weekRef: WeekRef,
  rawEntries: import('@/domain/planningState').DailyMeasurementEntry[],
  reflectionItems: WeekMeasurementReflectionItem[],
  exerciseEntries: ExerciseEntry[],
  startDate: string,
  endDate: string,
): DailyActivityBreakdown[] {
  const days = getChildPeriods(weekRef) as DayRef[]
  const emotionLogStore = useEmotionLogStore()
  const emotionStore = useEmotionStore()
  const journalStore = useJournalStore()

  // Pre-filter for the week
  const weekEmotionLogs = emotionLogStore.sortedLogs.filter(
    (log) => log.createdAt >= startDate && log.createdAt <= endDate
  )
  const weekJournalEntries = journalStore.sortedEntries.filter(
    (entry) => entry.createdAt >= startDate && entry.createdAt <= endDate
  )

  const habits = reflectionItems.filter((m) => m.subjectType === 'habit')
  const krs = reflectionItems.filter((m) => m.subjectType === 'keyResult')
  const trackers = reflectionItems.filter((m) => m.subjectType === 'tracker')

  return days.map((dayRef) => {
    const dayStart = dayRef + 'T00:00:00.000Z'
    const dayEnd = dayRef + 'T23:59:59.999Z'

    // Habits — schedule-aware logic
    // Note: completion-mode habits store value: null — entry existence = done
    const dayHabitEntries = new Map(
      rawEntries
        .filter((e) => e.dayRef === dayRef && e.subjectType === 'habit')
        .map((e) => [e.subjectId, e.value] as const)
    )

    const habitItems: DailyHabitItem[] = []
    for (const habit of habits) {
      const hasEntry = dayHabitEntries.has(habit.subject.id)
      const entryValue = dayHabitEntries.get(habit.subject.id) ?? undefined

      if (habit.planning.scheduleScope === 'specific-days') {
        const isScheduledToday = habit.planning.scheduledDayRefs.includes(dayRef)
        if (isScheduledToday) {
          habitItems.push({
            id: habit.subject.id,
            name: habit.subject.title,
            status: hasEntry ? 'completed' : 'missed',
            value: entryValue ?? undefined,
          })
        } else if (hasEntry) {
          // Done on an unscheduled day — still show as completed
          habitItems.push({
            id: habit.subject.id,
            name: habit.subject.title,
            status: 'completed',
            value: entryValue ?? undefined,
          })
        }
        // else: not scheduled today, no entry → skip
      } else {
        // whole-week / whole-month / unassigned — only show when done
        if (hasEntry) {
          habitItems.push({
            id: habit.subject.id,
            name: habit.subject.title,
            status: 'completed',
            value: entryValue ?? undefined,
          })
        }
      }
    }

    // Emotions
    const dayEmotionLogs = weekEmotionLogs.filter(
      (log) => log.createdAt >= dayStart && log.createdAt <= dayEnd
    )
    const seenEmotionIds = new Set<string>()
    const emotionItems: { emotionId: string; name: string; quadrant: Quadrant }[] = []
    const dayQuadrantCounts: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
    for (const log of dayEmotionLogs) {
      for (const emotionId of log.emotionIds) {
        const emotion = emotionStore.getEmotionById(emotionId)
        if (emotion) {
          dayQuadrantCounts[getQuadrant(emotion)]++
        }
        if (!seenEmotionIds.has(emotionId)) {
          seenEmotionIds.add(emotionId)
          if (emotion) {
            emotionItems.push({
              emotionId,
              name: emotion.name,
              quadrant: getQuadrant(emotion),
            })
          }
        }
      }
    }
    const emotionSessions = dayEmotionLogs.map((log) => ({
      createdAt: log.createdAt,
      emotionIds: [...log.emotionIds],
      note: log.note,
    }))

    // Journal
    const dayJournalEntries = weekJournalEntries.filter(
      (entry) => entry.createdAt >= dayStart && entry.createdAt <= dayEnd
    )

    // Exercises
    const dayExercises = exerciseEntries.filter(
      (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
    )

    // Key Results — only days with entries
    // Note: completion-mode KRs store value: null — entry existence = done
    const krItems = rawEntries
      .filter((e) => e.dayRef === dayRef && e.subjectType === 'keyResult')
      .map((e) => {
        const kr = krs.find((k) => k.subject.id === e.subjectId)
        return { id: e.subjectId, name: kr?.subject.title ?? '', value: e.value }
      })

    // Trackers — only days with entries
    // Note: completion-mode trackers store value: null — entry existence = done
    const trackerItems = rawEntries
      .filter((e) => e.dayRef === dayRef && e.subjectType === 'tracker')
      .map((e) => {
        const tracker = trackers.find((t) => t.subject.id === e.subjectId)
        return { id: e.subjectId, name: tracker?.subject.title ?? '', value: e.value }
      })

    return {
      dayRef,
      habits: { items: habitItems },
      emotions: {
        items: emotionItems,
        totalLogs: dayEmotionLogs.length,
        quadrantCounts: dayQuadrantCounts,
        sessions: emotionSessions,
      },
      journal: {
        items: dayJournalEntries.map((e) => ({
          id: e.id,
          title: getDisplayTitle(e),
          body: e.body,
          hasAISuggestions: Array.isArray(e.chatSessions) && e.chatSessions.length > 0,
        })),
      },
      exercises: {
        count: dayExercises.length,
        types: [...new Set(dayExercises.map((e) => e.type))],
        items: dayExercises.map((e, idx) => ({
          id: `${dayRef}-${idx}`,
          type: e.type,
          createdAt: e.createdAt,
        })),
      },
      keyResults: { items: krItems },
      trackers: { items: trackerItems },
    }
  })
}

// ---------------------------------------------------------------------------
// Weekly summary
// ---------------------------------------------------------------------------

function buildWeeklySummary(
  reflectionItems: WeekMeasurementReflectionItem[],
  rawEntries: import('@/domain/planningState').DailyMeasurementEntry[],
  weekRef: WeekRef,
  emotionSummary: EmotionSummary,
  journalSummary: JournalSummary,
  exerciseSummary: ExerciseSummary,
): WeeklySummary {
  const habits = reflectionItems.filter((m) => m.subjectType === 'habit')
  const weekBounds = getPeriodBounds(weekRef)
  const weekStart = weekBounds.start
  const weekEnd = weekBounds.end

  // Weekly habits: whole-week or unassigned scope with weekly cadence
  const weeklyHabits = habits
    .filter(
      (h) =>
        h.subject.cadence === 'weekly' &&
        h.planning.scheduleScope !== 'specific-days'
    )
    .map((h) => ({
      id: h.subject.id,
      name: h.subject.title,
      evaluationStatus: h.measurement.evaluationStatus ?? ('no-data' as MeasurementEvaluationStatus),
      actualValue: h.measurement.actualValue,
      target: h.measurement.target,
      entryCount: h.measurement.entryCount,
    }))

  // Monthly habits: count entries within this week only
  const monthlyHabits = habits
    .filter((h) => h.subject.cadence === 'monthly')
    .map((h) => {
      // Note: completion-mode habits store value: null — entry existence = done
      const weekEntries = rawEntries.filter(
        (e) =>
          e.subjectType === 'habit' &&
          e.subjectId === h.subject.id &&
          e.dayRef >= weekStart &&
          e.dayRef <= weekEnd
      )
      const weekValue = weekEntries.reduce((sum, e) => sum + (e.value ?? 0), 0)
      return {
        id: h.subject.id,
        name: h.subject.title,
        weekEntryCount: weekEntries.length,
        weekValue: weekValue || undefined,
      }
    })
    .filter((h) => h.weekEntryCount > 0)

  return {
    weeklyHabits,
    monthlyHabits,
    totalEmotionLogs: emotionSummary.totalLogs,
    totalJournalEntries: journalSummary.totalEntries,
    totalExercises: exerciseSummary.totalCompleted,
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

  // Exercises from database
  const exerciseEntries = await getExerciseEntriesForPeriod(startDate, endDate)
  const exerciseSummary = buildExerciseSummary(exerciseEntries)

  // Habits and measurements from reflection bundle (broader than planning)
  let habitSummary: HabitSummary = { totalActive: 0, metCount: 0, missedCount: 0 }
  let dailyBreakdown: DailyActivityBreakdown[] = []
  let weeklySummary: WeeklySummary = {
    weeklyHabits: [],
    monthlyHabits: [],
    totalEmotionLogs: emotionSummary.totalLogs,
    totalJournalEntries: journalSummary.totalEntries,
    totalExercises: exerciseSummary.totalCompleted,
  }

  let rawEntries: DailyMeasurementEntry[] = []
  let allDayAssignments: MeasurementDayAssignment[] = []
  let goalReflectionGroups: WeekGoalReflectionGroup[] = []
  let habitReflectionItems: WeekCadencedReflectionItem[] = []
  let trackerReflectionItems: WeekTrackerReflectionItem[] = []
  let weekObjectItems: WeekObjectItem[] = []

  try {
    const relevant = await getWeekRelevantObjects(weekRef)
    const reflectionMeasurements = relevant.reflection.measurementItems
    const habits = reflectionMeasurements.filter((m) => m.subjectType === 'habit')

    let metCount = 0
    let missedCount = 0
    for (const habit of habits) {
      if (habit.measurement.evaluationStatus === 'met') metCount++
      else if (habit.measurement.evaluationStatus === 'missed') missedCount++
    }
    habitSummary = { totalActive: habits.length, metCount, missedCount }

    dailyBreakdown = buildDailyBreakdown(
      weekRef,
      relevant.rawEntries,
      reflectionMeasurements,
      exerciseEntries,
      startDate,
      endDate,
    )

    weeklySummary = buildWeeklySummary(
      reflectionMeasurements,
      relevant.rawEntries,
      weekRef,
      emotionSummary,
      journalSummary,
      exerciseSummary,
    )

    rawEntries = relevant.rawEntries
    habitReflectionItems = relevant.reflection.cadencedItems.filter(
      (item) => item.subjectType === 'habit',
    )
    trackerReflectionItems = relevant.reflection.trackerItems

    // Load day assignments for the whole set of overlapping months so bar/dot
    // charts can show scheduled-day markers.
    allDayAssignments = await loadDayAssignmentsForMonths(relevant.overlappingMonthRefs)

    // Build goal -> KRs groups for the reflection summary. We pull goals from
    // the reflection bundle's goalItems and match KRs by goalId.
    const keyResultItems = relevant.reflection.cadencedItems.filter(
      (item) => item.subjectType === 'keyResult',
    )
    const goalMap = new Map<string, Goal>()
    for (const goalItem of relevant.reflection.goalItems) {
      goalMap.set(goalItem.goal.id, goalItem.goal)
    }
    // Also include any goals referenced by KRs but not in goalItems (defensive)
    if (keyResultItems.length > 0) {
      const core = await loadPlanningCoreObjects()
      for (const goal of core.goals) {
        if (!goalMap.has(goal.id)) {
          const hasKR = keyResultItems.some(
            (kr) => 'goalId' in kr.subject && kr.subject.goalId === goal.id,
          )
          if (hasKR) goalMap.set(goal.id, goal)
        }
      }
    }

    const krsByGoal = new Map<string, WeekCadencedReflectionItem[]>()
    for (const kr of keyResultItems) {
      if ('goalId' in kr.subject) {
        const list = krsByGoal.get(kr.subject.goalId) ?? []
        list.push(kr)
        krsByGoal.set(kr.subject.goalId, list)
      }
    }

    goalReflectionGroups = [...krsByGoal.entries()].flatMap(([goalId, keyResults]) => {
      const goal = goalMap.get(goalId)
      if (!goal) return []
      return [
        {
          goal: {
            id: goal.id,
            title: goal.title,
            icon: goal.icon,
            status: goal.status,
          },
          keyResults,
        },
      ]
    })

    // Flatten into a unified list for the weekly objects grid: KR-by-goal,
    // then habits, then trackers. Each section gets a deterministic sortOrder
    // band so the grid renders the same order across sessions.
    weekObjectItems = []
    goalReflectionGroups.forEach((group, goalIndex) => {
      group.keyResults.forEach((kr, krIndex) => {
        weekObjectItems.push({
          key: `keyResult:${kr.subject.id}`,
          subjectType: 'keyResult',
          subject: kr.subject,
          planning: kr.planning,
          measurement: kr.measurement,
          parentGoalId: group.goal.id,
          parentGoalIcon: group.goal.icon,
          parentGoalTitle: group.goal.title,
          sortOrder: 1000 * goalIndex + krIndex,
        })
      })
    })
    habitReflectionItems.forEach((habit, i) => {
      weekObjectItems.push({
        key: `habit:${habit.subject.id}`,
        subjectType: 'habit',
        subject: habit.subject,
        planning: habit.planning,
        measurement: habit.measurement,
        sortOrder: 100_000 + i,
      })
    })
    trackerReflectionItems.forEach((tracker, i) => {
      weekObjectItems.push({
        key: `tracker:${tracker.subject.id}`,
        subjectType: 'tracker',
        subject: tracker.subject,
        planning: tracker.planning,
        measurement: tracker.measurement,
        sortOrder: 200_000 + i,
      })
    })
  } catch {
    // Planning data may not exist — build daily breakdown without measurements
    dailyBreakdown = buildDailyBreakdown(weekRef, [], [], exerciseEntries, startDate, endDate)
  }

  return {
    weekRef,
    emotionSummary,
    journalSummary,
    habitSummary,
    exerciseSummary,
    dailyBreakdown,
    weeklySummary,
    rawEntries,
    allDayAssignments,
    goalReflectionGroups,
    habitReflectionItems,
    trackerReflectionItems,
    weekObjectItems,
  }
}

export async function loadDayAssignmentsForMonths(
  monthRefs: MonthRef[],
): Promise<MeasurementDayAssignment[]> {
  if (monthRefs.length === 0) return []
  const boundsKeys = new Set<string>()
  const bounds: { start: DayRef; end: DayRef }[] = []
  for (const monthRef of monthRefs) {
    const b = getPeriodBounds(monthRef)
    const key = `${b.start}:${b.end}`
    if (!boundsKeys.has(key)) {
      boundsKeys.add(key)
      bounds.push({ start: b.start as DayRef, end: b.end as DayRef })
    }
  }
  const starts = bounds.map((b) => b.start).sort()
  const ends = bounds.map((b) => b.end).sort()
  const start = starts[0]
  const end = ends[ends.length - 1]
  if (!start || !end) return []
  return planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(start, end)
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

  const monthWeekRefs = getChildPeriods(monthRef) as WeekRef[]

  // Habits, trackers, and goals from month planning bundle
  let habitSummary: HabitSummary = { totalActive: 0, metCount: 0, missedCount: 0 }
  let trackerSummary: TrackerSummary = { totalActive: 0 }
  let goalSummaries: GoalReflectionSummary[] = []
  let habitDetails: HabitReflectionDetail[] = []
  let trackerDetails: TrackerReflectionDetail[] = []

  try {
    const planningBundle = await getMonthPlanningBundle(monthRef)

    // Habits — individual details with weekly breakdown
    const habits = planningBundle.measurementItems.filter((m) => m.subjectType === 'habit')
    let metCount = 0
    let missedCount = 0
    habitDetails = habits.map((habit) => {
      const monthSummary = buildMeasurementSummary(
        habit.subject,
        planningBundle.rawEntries,
        monthRef
      )
      if (monthSummary.evaluationStatus === 'met') metCount++
      else if (monthSummary.evaluationStatus === 'missed') missedCount++

      const h = habit.subject as import('@/domain/planning').Habit
      const weeklyBreakdown: KRWeeklyBreakdown[] = h.cadence === 'weekly'
        ? monthWeekRefs.map((weekRef) => {
            const ws = buildMeasurementSummary(habit.subject, planningBundle.rawEntries, weekRef)
            return { weekRef, evaluationStatus: ws.evaluationStatus ?? 'no-data', actualValue: ws.actualValue }
          })
        : []

      return {
        id: h.id,
        title: h.title,
        icon: h.icon,
        cadence: h.cadence,
        entryMode: h.entryMode,
        evaluationStatus: monthSummary.evaluationStatus ?? 'no-data',
        actualValue: monthSummary.actualValue,
        target: monthSummary.target,
        weeklyBreakdown: weeklyBreakdown.length > 0 ? weeklyBreakdown : undefined,
      }
    })
    habitSummary = { totalActive: habits.length, metCount, missedCount }

    // Trackers — individual details with daily entries
    const trackers = planningBundle.trackerItems ?? []
    trackerSummary = { totalActive: trackers.length }
    trackerDetails = trackers.map((t) => {
      const subjectEntries = planningBundle.rawEntries
        .filter((e) => e.subjectId === t.subject.id && e.subjectType === 'tracker')
        .sort((a, b) => a.dayRef.localeCompare(b.dayRef))
      const lastEntry = subjectEntries.at(-1)
      return {
        id: t.subject.id,
        title: t.subject.title,
        icon: (t.subject as import('@/domain/planning').Tracker).icon,
        entryMode: t.subject.entryMode,
        entries: subjectEntries.map((e) => ({ dayRef: e.dayRef, value: e.value })),
        latestValue: lastEntry?.value ?? undefined,
      }
    })

    // Goals with KR progress + weekly breakdown
    goalSummaries = planningBundle.goalItems.map((goalItem) => {
      const krs = planningBundle.cadencedItems.filter(
        (m) =>
          m.subjectType === 'keyResult' &&
          'goalId' in m.subject &&
          m.subject.goalId === goalItem.goal.id
      )
      return {
        goal: {
          id: goalItem.goal.id,
          title: goalItem.goal.title,
          icon: goalItem.goal.icon,
          status: goalItem.goal.status,
        },
        keyResults: krs.map((kr) => {
          const summary = buildMeasurementSummary(
            kr.subject,
            planningBundle.rawEntries,
            monthRef
          )
          const krSubject = kr.subject as import('@/domain/planning').KeyResult
          const weeklyBreakdown: KRWeeklyBreakdown[] = krSubject.cadence === 'weekly'
            ? monthWeekRefs.map((weekRef) => {
                const ws = buildMeasurementSummary(kr.subject, planningBundle.rawEntries, weekRef)
                return { weekRef, evaluationStatus: ws.evaluationStatus ?? 'no-data', actualValue: ws.actualValue }
              })
            : []

          return {
            id: kr.subject.id,
            title: kr.subject.title,
            cadence: krSubject.cadence,
            entryMode: krSubject.entryMode,
            evaluationStatus: summary.evaluationStatus ?? 'no-data',
            actualValue: summary.actualValue,
            target: summary.target,
            weeklyBreakdown: weeklyBreakdown.length > 0 ? weeklyBreakdown : undefined,
          }
        }),
      }
    })
  } catch {
    // Planning data may not exist
  }

  const exerciseSummary: ExerciseSummary = { totalCompleted: 0, types: [] }

  // Weekly rating trends, snippets, and full details
  const weeklyReflections = await structuredReflectionDexieRepository.getWeeklyForMonth(monthRef)
  const weeklyRatingTrends = buildWeeklyRatingTrends(weeklyReflections)
  const weeklyReflectionSnippets = buildWeeklySnippets(weeklyReflections)
  const weeklyReflectionDetails = buildWeeklyDetails(weeklyReflections)

  // Per-day calendar data for review-step calendar visualization
  const dailyCalendarSummaries = buildDailyCalendarSummaries(monthRef)

  return {
    monthRef,
    emotionSummary,
    journalSummary,
    habitSummary,
    trackerSummary,
    exerciseSummary,
    goalSummaries,
    habitDetails,
    trackerDetails,
    weeklyRatingTrends,
    weeklyReflectionSnippets,
    weeklyReflectionDetails,
    monthWeekRefs,
    dailyCalendarSummaries,
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
      // Context
      [WEEKLY_CONTEXT_KEYS[0]]: r[WEEKLY_CONTEXT_KEYS[0]],
      [WEEKLY_CONTEXT_KEYS[1]]: r[WEEKLY_CONTEXT_KEYS[1]],
      [WEEKLY_CONTEXT_KEYS[2]]: r[WEEKLY_CONTEXT_KEYS[2]],
      [WEEKLY_CONTEXT_KEYS[3]]: r[WEEKLY_CONTEXT_KEYS[3]],
      // State
      [WEEKLY_STATE_KEYS[0]]: r[WEEKLY_STATE_KEYS[0]],
      [WEEKLY_STATE_KEYS[1]]: r[WEEKLY_STATE_KEYS[1]],
      [WEEKLY_STATE_KEYS[2]]: r[WEEKLY_STATE_KEYS[2]],
      [WEEKLY_STATE_KEYS[3]]: r[WEEKLY_STATE_KEYS[3]],
      // Evaluation
      [WEEKLY_EVALUATION_KEYS[0]]: r[WEEKLY_EVALUATION_KEYS[0]],
      [WEEKLY_EVALUATION_KEYS[1]]: r[WEEKLY_EVALUATION_KEYS[1]],
      [WEEKLY_EVALUATION_KEYS[2]]: r[WEEKLY_EVALUATION_KEYS[2]],
      [WEEKLY_EVALUATION_KEYS[3]]: r[WEEKLY_EVALUATION_KEYS[3]],
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

function buildWeeklyDetails(reflections: WeeklyReflection[]): WeeklyReflectionDetail[] {
  return [...reflections]
    .sort((a, b) => a.weekRef.localeCompare(b.weekRef))
    .map((r) => ({
      weekRef: r.weekRef,
      freeformReflection: r.freeformReflection,
      promptResponses: r.promptResponses,
    }))
}
