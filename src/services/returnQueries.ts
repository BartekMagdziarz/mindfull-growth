/**
 * Return ritual — detection and inventory (pure reads).
 *
 * The last signal is the latest user-authored write across the tables in
 * `RETURN_SIGNAL_SOURCES`. Logins, open tabs, drafts, settings and anything
 * schedulers write on their own (rhythm day assignments, pending program plan
 * items, AI profile artefacts) are deliberately not signals: an app left open
 * but untouched is a break. The tables carry no timestamp index, so a run
 * reads them whole — a local database of a few thousand rows, once per session.
 *
 * Plan: ideas/html-plans/2026-10-25-return-ritual.html (D1), docs/return-ritual.md.
 */

import type { DayRef } from '@/domain/period'
import {
  buildReturnBreak,
  describeWeekPlacement,
  isReturnBreakHandled,
  parseReturnRitualSettings,
  RETURN_RITUAL_SETTINGS_KEY,
  selectActiveEnrollments,
  selectOverdueGoals,
  selectOverduePlanItems,
  selectStaleIntentions,
  selectWeeksWithoutEntries,
  summarizeSubjectBeforeBreak,
  type ReturnBreak,
  type ReturnInventory,
  type ReturnRitualSettings,
  type ReturnSubjectRef,
  type ReturnSubjectSummary,
} from '@/domain/returnRitual'
import { exercisePlanDexieRepository } from '@/repositories/exercisePlanDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { userDatabaseOperation } from '@/repositories/userDatabaseOperation'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { isMeasurementSubjectOpen } from '@/services/planningVisibility'
import { getPeriodRefsForDate } from '@/utils/periods'
import { reportError } from '@/utils/reportError'

type Row = Record<string, unknown>

export interface ReturnSignalSource {
  table: string
  /** ISO timestamp of the user's write in this row, or undefined when the row is not a signal. */
  at: (row: Row) => string | undefined
}

function iso(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** `updatedAt`, else `createdAt`, else `completedAt` — the common record shapes. */
function stamped(row: Row): string | undefined {
  return iso(row.updatedAt) ?? iso(row.createdAt) ?? iso(row.completedAt)
}

function latest(...values: Array<string | undefined>): string | undefined {
  let best: string | undefined
  for (const value of values) {
    if (value && (!best || value > best)) best = value
  }
  return best
}

const EXERCISE_RECORD_TABLES = [
  'valuesDiscoveries',
  'valueMaps',
  'shadowBeliefs',
  'transformativePurposes',
  'thoughtRecords',
  'distortionAssessments',
  'worryTreeEntries',
  'coreBeliefsExplorations',
  'compassionateLetters',
  'positiveDataLogs',
  'behavioralExperiments',
  'behavioralActivations',
  'structuredProblemSolvings',
  'gradedExposureHierarchies',
  'threePathwaysToMeaning',
  'socraticSelfDialogues',
  'mountainRangesOfMeaning',
  'paradoxicalIntentionLabs',
  'dereflectionPractices',
  'tragicOptimisms',
  'attitudinalShifts',
  'legacyLetters',
  'ifsParts',
  'ifsPartsMaps',
  'ifsUnblendingSessions',
  'ifsDirectAccessSessions',
  'ifsTrailheadEntries',
  'ifsProtectorAppreciations',
  'ifsExileWitnessings',
  'ifsSelfEnergyCheckIns',
  'ifsPartsDialogues',
  'ifsDailyCheckIns',
  'ifsConstellations',
] as const

export const RETURN_SIGNAL_SOURCES: readonly ReturnSignalSource[] = [
  // Day layer
  { table: 'dailyMeasurementEntries', at: stamped },
  { table: 'journalEntries', at: stamped },
  { table: 'emotionLogs', at: stamped },
  { table: 'microExerciseEntries', at: stamped },
  { table: 'exerciseCompletions', at: row => iso(row.completedAt) ?? stamped(row) },
  ...EXERCISE_RECORD_TABLES.map(table => ({ table, at: stamped })),
  // A plan item is the user's only once decided; pending ones are the scheduler's.
  { table: 'exercisePlanItems', at: row => (row.status === 'pending' ? undefined : stamped(row)) },
  // Paths: steps the user completed, never the enrollment row the scheduler touches.
  {
    table: 'programEnrollments',
    at: row => {
      const steps = Array.isArray(row.completedSteps) ? (row.completedSteps as Row[]) : []
      return latest(
        iso(row.completedAt),
        iso(row.startedAt),
        ...steps.map(step => iso(step.completedAt))
      )
    },
  },
  // Week / month layer
  { table: 'weeklyReflections', at: stamped },
  { table: 'monthlyReflections', at: stamped },
  { table: 'periodReflections', at: stamped },
  { table: 'periodObjectReflections', at: stamped },
  { table: 'weekPlans', at: stamped },
  { table: 'monthPlans', at: stamped },
  { table: 'annualPlans', at: stamped },
  // Planning objects (edits are the user's; placements and assignments may be automatic)
  { table: 'priorities', at: stamped },
  { table: 'goals', at: stamped },
  { table: 'keyResults', at: stamped },
  { table: 'habits', at: stamped },
  { table: 'trackers', at: stamped },
  { table: 'weeklyIntentions', at: stamped },
  // Self-discovery
  { table: 'lifeAreaAssessments', at: stamped },
  { table: 'assessmentAttempts', at: stamped },
  // Talking to the companion is using the app.
  { table: 'companionConversations', at: stamped },
]

/** ISO timestamp of the latest user-authored write, or undefined on a fresh account. */
export async function getLastSignalAt(
  sources: readonly ReturnSignalSource[] = RETURN_SIGNAL_SOURCES
): Promise<string | undefined> {
  return userDatabaseOperation(
    'r',
    sources.map(source => source.table),
    async db => {
      const known = new Set(db.tables.map(table => table.name))
      let best: string | undefined
      for (const source of sources) {
        if (!known.has(source.table)) continue
        try {
          const rows = (await db.table(source.table).toArray()) as Row[]
          for (const row of rows) {
            const at = source.at(row)
            if (at && (!best || at > best)) best = at
          }
        } catch (error) {
          reportError(`returnQueries.getLastSignalAt:${source.table}`, error)
        }
      }
      return best
    }
  )
}

export async function getReturnRitualSettings(): Promise<ReturnRitualSettings | undefined> {
  return parseReturnRitualSettings(
    await userSettingsDexieRepository.get(RETURN_RITUAL_SETTINGS_KEY)
  )
}

function todayDayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}

/** The current break above the threshold, whether or not it was handled. */
export async function detectReturnBreak(
  today: DayRef = todayDayRef()
): Promise<ReturnBreak | undefined> {
  return buildReturnBreak(await getLastSignalAt(), today)
}

/** The break Today should offer the ritual for: detected and not yet handled. */
export async function getPendingReturnBreak(
  today: DayRef = todayDayRef()
): Promise<ReturnBreak | undefined> {
  const brk = await detectReturnBreak(today)
  if (!brk) return undefined
  return isReturnBreakHandled(await getReturnRitualSettings(), brk) ? undefined : brk
}

/** Everything step 2 and 3 of the ritual decide over, grouped. */
export async function buildReturnInventory(brk: ReturnBreak): Promise<ReturnInventory> {
  const [
    habits,
    keyResults,
    trackers,
    goals,
    intentions,
    planItems,
    enrollments,
    weekStates,
    monthStates,
    dayAssignments,
    entries,
  ] = await Promise.all([
    habitDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    goalDexieRepository.listAll(),
    weeklyIntentionDexieRepository.listAll(),
    exercisePlanDexieRepository.listAll(),
    programEnrollmentDexieRepository.listAll(),
    planningStateDexieRepository.listMeasurementWeekStates(),
    planningStateDexieRepository.listMeasurementMonthStates(),
    planningStateDexieRepository.listMeasurementDayAssignments(),
    planningStateDexieRepository.listDailyMeasurementEntries(),
  ])

  const openGoalIds = new Set(goals.filter(goal => goal.status === 'open').map(goal => goal.id))
  const subjects: ReturnSubjectSummary[] = [
    ...habits.map(subject => ({ subjectType: 'habit' as const, subject })),
    ...keyResults
      .filter(subject => openGoalIds.has(subject.goalId))
      .map(subject => ({ subjectType: 'keyResult' as const, subject })),
    ...trackers.map(subject => ({ subjectType: 'tracker' as const, subject })),
  ]
    .filter(entry => isMeasurementSubjectOpen(entry.subject))
    .map(entry => ({
      ...entry,
      ...summarizeSubjectBeforeBreak(
        { subjectType: entry.subjectType, subjectId: entry.subject.id },
        entries,
        brk.breakStart
      ),
    }))

  const subjectRefs: ReturnSubjectRef[] = subjects.map(entry => ({
    subjectType: entry.subjectType,
    subjectId: entry.subject.id,
    cadence: entry.subject.cadence,
  }))

  const todayRefs = getPeriodRefsForDate(brk.today)
  const columns = brk.currentWeekMostlyBehind ? [...brk.weeks, todayRefs.week] : [...brk.weeks]
  const goalById = new Map(goals.map(goal => [goal.id, goal]))
  const weekPlacements = columns.flatMap(weekRef =>
    subjects.map(subject =>
      describeWeekPlacement(subject, weekRef, {
        weekStates,
        monthStates,
        dayAssignments,
        entries,
        goal:
          subject.subjectType === 'keyResult'
            ? goalById.get((subject.subject as { goalId: string }).goalId)
            : undefined,
      })
    )
  )

  return {
    break: brk,
    columns,
    currentWeekRef: todayRefs.week,
    currentMonthRef: todayRefs.month,
    weeksWithoutEntries: selectWeeksWithoutEntries(brk.weeks, subjectRefs, {
      weekStates,
      monthStates,
      dayAssignments,
      entries,
    }),
    weekPlacements,
    staleIntentions: selectStaleIntentions(intentions, brk.today),
    overduePlanItems: selectOverduePlanItems(planItems, brk.today),
    activeEnrollments: selectActiveEnrollments(enrollments),
    overdueGoals: selectOverdueGoals(goals, brk.today),
    subjects,
  }
}
