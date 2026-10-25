/**
 * Verification-only "return after a break" scenario (dev-only).
 *
 * Rewrites the seeded verification database so that the last user-authored
 * write lies `days` ago: everything the user would have written during the
 * break is removed (day entries, journal, emotions, reflections, plans,
 * intentions, decided plan items, path steps), everything older is backdated
 * to the cutoff, and the break weeks are left undecided (no week states, no
 * day assignments) while whole-month placements stay — exactly what the
 * rhythm scheduler's floor leaves behind after a real break.
 *
 * Reachability: imported ONLY from `verificationSeed.ts` (DEV + verification
 * mode). Manual use on the verification origin:
 *   await window.__verifyReturnScenario(24)   // reloads afterwards
 */

import type { DayRef } from '@/domain/period'
import { RETURN_RITUAL_SETTINGS_KEY } from '@/domain/returnRitual'
import { getUserDatabase } from '@/services/userDatabaseService'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

type Row = Record<string, unknown>

const BACKDATE_TABLES = [
  'priorities',
  'goals',
  'keyResults',
  'habits',
  'trackers',
  'lifeAreaAssessments',
  'assessmentAttempts',
  'assessmentResponses',
  'annualPlans',
  'measurementMonthStates',
  'goalMonthStates',
  'priorityLinks',
  'lifeAreas',
  'userProfiles',
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

/** Rows written during the break that the user could not have written. */
const DELETE_AFTER_TIMESTAMP_TABLES = [
  'journalEntries',
  'emotionLogs',
  'microExerciseEntries',
  'exerciseCompletions',
  'companionConversations',
  'companionIntroductions',
  'historyDigests',
  'profilePeriodSummaries',
  'profileBuildLogs',
] as const

function stampOf(row: Row): string | undefined {
  const value = row.updatedAt ?? row.createdAt ?? row.completedAt
  return typeof value === 'string' ? value : undefined
}

function backdate(row: Row, cutoffIso: string): Row {
  const next = { ...row }
  for (const field of ['createdAt', 'updatedAt', 'completedAt', 'startedAt']) {
    const value = next[field]
    if (typeof value === 'string' && value > cutoffIso) next[field] = cutoffIso
  }
  return next
}

export interface ReturnScenarioResult {
  cutoffDay: DayRef
  cutoffIso: string
}

export async function enterReturnScenario(days = 24): Promise<ReturnScenarioResult> {
  const db = getUserDatabase()
  const today = getPeriodRefsForDate(new Date()).day
  const cutoffDay = addDaysToDayRef(today, -days)
  const cutoffRefs = getPeriodRefsForDate(cutoffDay)
  const cutoffIso = new Date(`${cutoffDay}T12:00:00`).toISOString()
  const known = new Set(db.tables.map(table => table.name))

  await db.transaction('rw', db.tables, async () => {
    for (const name of BACKDATE_TABLES) {
      if (!known.has(name)) continue
      const table = db.table(name)
      const rows = (await table.toArray()) as Row[]
      for (const row of rows) {
        const stamp = stampOf(row)
        if (stamp && stamp > cutoffIso) await table.put(backdate(row, cutoffIso))
      }
    }
    for (const name of DELETE_AFTER_TIMESTAMP_TABLES) {
      if (!known.has(name)) continue
      const table = db.table(name)
      const rows = (await table.toArray()) as Row[]
      for (const row of rows) {
        const stamp = stampOf(row)
        if (stamp && stamp > cutoffIso) await table.delete(row.id as string)
        else await table.put(backdate(row, cutoffIso))
      }
    }

    // Day layer: nothing logged, nothing decided, after the cutoff.
    for (const row of (await db.dailyMeasurementEntries.toArray()) as unknown as Row[]) {
      if ((row.dayRef as string) > cutoffDay)
        await db.dailyMeasurementEntries.delete(row.id as string)
      else await db.dailyMeasurementEntries.put(backdate(row, cutoffIso) as never)
    }
    for (const row of (await db.measurementDayAssignments.toArray()) as unknown as Row[]) {
      if ((row.dayRef as string) > cutoffDay)
        await db.measurementDayAssignments.delete(row.id as string)
      else await db.measurementDayAssignments.put(backdate(row, cutoffIso) as never)
    }
    for (const row of (await db.measurementWeekStates.toArray()) as unknown as Row[]) {
      if ((row.weekRef as string) > cutoffRefs.week)
        await db.measurementWeekStates.delete(row.id as string)
      else await db.measurementWeekStates.put(backdate(row, cutoffIso) as never)
    }
    for (const row of (await db.todayHiddenStates.toArray()) as unknown as Row[]) {
      await db.todayHiddenStates.delete(row.id as string)
    }

    // Week / month layer: rituals after the cutoff never happened.
    for (const [name, field] of [
      ['weeklyReflections', 'weekRef'],
      ['weekPlans', 'weekRef'],
      ['monthlyReflections', 'monthRef'],
      ['monthPlans', 'monthRef'],
      ['periodReflections', 'periodRef'],
      ['periodObjectReflections', 'periodRef'],
    ] as const) {
      const table = db.table(name)
      for (const row of (await table.toArray()) as Row[]) {
        const ref = String(row[field] ?? '')
        const limit = ref.includes('-W') ? cutoffRefs.week : cutoffRefs.month
        if (ref > limit) await table.delete(row.id as string)
        else await table.put(backdate(row, cutoffIso))
      }
    }
    for (const row of (await db.weeklyIntentions.toArray()) as unknown as Row[]) {
      if ((row.weekRef as string) > cutoffRefs.week)
        await db.weeklyIntentions.delete(row.id as string)
      else await db.weeklyIntentions.put({ ...backdate(row, cutoffIso), status: 'open' } as never)
    }

    // Plan items the user decided after the cutoff never were; pending ones stay overdue.
    for (const row of (await db.exercisePlanItems.toArray()) as unknown as Row[]) {
      if (row.status !== 'pending' && stampOf(row) && (stampOf(row) as string) > cutoffIso) {
        await db.exercisePlanItems.delete(row.id as string)
      } else {
        await db.exercisePlanItems.put(backdate(row, cutoffIso) as never)
      }
    }

    // Paths: steps completed after the cutoff are undone; the path stays active.
    for (const row of (await db.programEnrollments.toArray()) as unknown as Row[]) {
      const steps = Array.isArray(row.completedSteps) ? (row.completedSteps as Row[]) : []
      const kept = steps.filter(step => String(step.completedAt ?? '') <= cutoffIso)
      const next: Row = {
        ...backdate(row, cutoffIso),
        completedSteps: kept,
        currentStepIndex: kept.length,
        weekLog: Array.isArray(row.weekLog)
          ? (row.weekLog as Row[]).filter(entry => String(entry.weekRef ?? '') <= cutoffRefs.week)
          : row.weekLog,
      }
      if (typeof row.completedAt === 'string' && row.completedAt > cutoffIso) {
        delete next.completedAt
        next.status = 'active'
      }
      await db.programEnrollments.put(next as never)
    }

    await db.userSettings.delete(RETURN_RITUAL_SETTINGS_KEY)
    await db.drafts.clear()
  })

  return { cutoffDay, cutoffIso }
}
