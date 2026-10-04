import type {
  Goal,
  GoalClosingKeyResultSnapshot,
  GoalClosingMonthState,
  GoalClosingReflection,
  GoalFollowUpKind,
  GoalOutcome,
  GoalSuccessMet,
  Habit,
  KeyResult,
} from '@/domain/planning'
import { goalStatusForOutcome } from '@/domain/planning'
import { GOAL_CLOSING_MET_SHARE, evaluateClosingMonths } from '@/domain/goalClosing'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { applyMeasurementTargetOverride, buildMeasurementSummary } from '@/services/measurementProgress'
import { getMonthPlanningBundle } from '@/services/planningStateQueries'
import { addDaysToDayRef, getChildPeriods, getPeriodRefsForDate } from '@/utils/periods'
import { periodsInDateRange } from '@/utils/periodSchedule'

/**
 * Closing a goal (ideas/html-plans/2026-10-04-goal-closing-ritual.html).
 *
 * The ritual collects a draft and closes the goal in one go: the frozen key-result
 * snapshot, the goal's status + closingReflection, the key results' statuses and
 * any habits spun off a key result. Nothing here closes a goal on a date alone.
 */

export interface GoalClosingDraft {
  outcome: GoalOutcome
  successMet?: GoalSuccessMet
  successNote?: string
  confidenceInHindsight?: number
  confidenceNote?: string
  obstaclesHit?: string
  workedWell?: string
  wasDifficult?: string
  learned?: string
  followUp?: { kind: GoalFollowUpKind; note?: string }
  /** Key results to carry on as habits (follow-up 'habit'). */
  habitFromKeyResultIds?: string[]
}

export interface GoalClosingSnapshot {
  goal: Goal
  keyResults: KeyResult[]
  /** Goal window months, oldest first (active months; else start→target). */
  months: MonthRef[]
  weeksPlanned: number
  keyResultSnapshots: GoalClosingKeyResultSnapshot[]
}

export interface GoalClosingResult {
  goal: Goal
  createdHabits: Habit[]
}

/** How long „Później” hides the closing invite. */
export const GOAL_CLOSING_DEFER_DAYS = 7

function todayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}

function formatReadoutNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
}

/**
 * Month-by-month state of one key result. Weekly-cadence objects are judged by
 * their planned weeks inside the month (a month aggregate against a weekly
 * target reads as nonsense); monthly-cadence objects by the month summary.
 */
async function snapshotKeyResult(
  keyResult: KeyResult,
  months: MonthRef[],
): Promise<GoalClosingKeyResultSnapshot> {
  const monthStates: { monthRef: MonthRef; state: GoalClosingMonthState }[] = []
  let weeksMet = 0
  let weeksPlanned = 0
  let lastValue: number | undefined

  for (const monthRef of months) {
    const bundle = await getMonthPlanningBundle(monthRef)
    const item = bundle.measurementItems.find(
      (candidate) => candidate.subjectType === 'keyResult' && candidate.subject.id === keyResult.id,
    )
    if (!item) {
      monthStates.push({ monthRef, state: 'unplanned' })
      continue
    }

    if (keyResult.cadence === 'weekly') {
      const monthWeeks = getChildPeriods(monthRef) as WeekRef[]
      const weeks = item.plannedWeekRefs.length ? item.plannedWeekRefs : monthWeeks
      const statuses = weeks.map((weekRef) => {
        const subject = applyMeasurementTargetOverride(keyResult, item.weekTargetOverrides?.[weekRef])
        const summary = buildMeasurementSummary(subject, bundle.rawEntries, weekRef)
        if (summary.actualValue !== undefined) lastValue = summary.actualValue
        return summary.evaluationStatus ?? 'no-data'
      })
      const decided = statuses.filter((status) => status !== 'no-data')
      const met = statuses.filter((status) => status === 'met').length
      weeksMet += met
      weeksPlanned += weeks.length
      if (decided.length === 0) {
        monthStates.push({ monthRef, state: 'no-data' })
      } else {
        monthStates.push({ monthRef, state: met / weeks.length >= GOAL_CLOSING_MET_SHARE ? 'met' : 'missed' })
      }
      continue
    }

    const status = item.measurement?.evaluationStatus ?? 'no-data'
    if (item.measurement?.actualValue !== undefined) lastValue = item.measurement.actualValue
    monthStates.push({ monthRef, state: status })
  }

  const verdict = evaluateClosingMonths(monthStates)
  let lastReadout: string | undefined
  if (keyResult.entryMode === 'value' || keyResult.entryMode === 'rating') {
    lastReadout = lastValue === undefined ? undefined : formatReadoutNumber(lastValue)
  } else if (keyResult.cadence === 'weekly' && weeksPlanned > 0) {
    lastReadout = `${weeksMet}/${weeksPlanned} tyg.`
  } else if (verdict.monthsPlanned > 0) {
    lastReadout = `${verdict.monthsMet}/${verdict.monthsPlanned} mies.`
  }

  return {
    id: keyResult.id,
    title: keyResult.title,
    entryMode: keyResult.entryMode,
    cadence: keyResult.cadence,
    evaluation: verdict.evaluation,
    monthsMet: verdict.monthsMet,
    monthsPlanned: verdict.monthsPlanned,
    months: monthStates,
    lastReadout,
  }
}

/** Months of the goal window: its active months, else the start→target span. */
async function resolveGoalMonths(goal: Goal): Promise<MonthRef[]> {
  const states = await planningStateDexieRepository.listGoalMonthStates()
  const active = states
    .filter((state) => state.goalId === goal.id && state.activityState === 'active')
    .map((state) => state.monthRef)
  if (active.length) return [...new Set(active)].sort()
  if (goal.startDate && goal.targetDate) {
    return periodsInDateRange(goal.startDate, goal.targetDate, 'monthly') as MonthRef[]
  }
  return []
}

export async function buildGoalClosingSnapshot(goalId: string): Promise<GoalClosingSnapshot> {
  const goal = await goalDexieRepository.getById(goalId)
  if (!goal) {
    throw new Error(`Goal with id ${goalId} not found`)
  }
  const keyResults = (await keyResultDexieRepository.listAll()).filter(
    (item) => item.goalId === goalId && item.isActive,
  )
  const months = await resolveGoalMonths(goal)
  const weeks = new Set<WeekRef>()
  for (const monthRef of months) {
    for (const weekRef of getChildPeriods(monthRef) as WeekRef[]) weeks.add(weekRef)
  }
  const keyResultSnapshots: GoalClosingKeyResultSnapshot[] = []
  for (const keyResult of keyResults) {
    keyResultSnapshots.push(await snapshotKeyResult(keyResult, months))
  }
  return { goal, keyResults, months, weeksPlanned: weeks.size, keyResultSnapshots }
}

function habitPayloadFromKeyResult(keyResult: KeyResult, goal: Goal) {
  return {
    title: keyResult.title,
    description: `Z celu „${goal.title}”`,
    isActive: true,
    icon: goal.icon,
    priorityIds: [...goal.priorityIds],
    lifeAreaIds: [...goal.lifeAreaIds],
    entryMode: keyResult.entryMode,
    cadence: keyResult.cadence,
    target: keyResult.target,
    ratingScaleMin: keyResult.ratingScaleMin,
    ratingScale: keyResult.ratingScale,
    multiItems: keyResult.multiItems,
    multiDailyThreshold: keyResult.multiDailyThreshold,
    status: 'open' as const,
  }
}

/**
 * Close the goal with the ritual's draft. Repositories are called in sequence
 * (habits → key results → goal) so a failure before the goal update leaves the
 * goal open and the ritual retryable.
 */
export async function closeGoal(
  goalId: string,
  draft: GoalClosingDraft,
  snapshot?: GoalClosingSnapshot,
): Promise<GoalClosingResult> {
  const snap = snapshot ?? (await buildGoalClosingSnapshot(goalId))
  const { goal } = snap
  const status = goalStatusForOutcome(draft.outcome)

  const alreadyCreated = new Set(goal.closingReflection?.followUp?.createdHabitIds ?? [])
  const createdHabits: Habit[] = []
  const wantsHabits = draft.followUp?.kind === 'habit' ? draft.habitFromKeyResultIds ?? [] : []
  for (const keyResultId of wantsHabits) {
    const keyResult = snap.keyResults.find((item) => item.id === keyResultId)
    if (!keyResult) continue
    createdHabits.push(await habitDexieRepository.create(habitPayloadFromKeyResult(keyResult, goal)))
  }

  for (const keyResult of snap.keyResults) {
    if (keyResult.status !== status) {
      await keyResultDexieRepository.update(keyResult.id, { status })
    }
  }

  const followUp: GoalClosingReflection['followUp'] = draft.followUp
    ? {
        kind: draft.followUp.kind,
        note: draft.followUp.note,
        createdHabitIds: [...alreadyCreated, ...createdHabits.map((habit) => habit.id)],
      }
    : undefined

  const closingReflection: GoalClosingReflection = {
    closedAt: goal.closingReflection?.closedAt ?? todayRef(),
    outcome: draft.outcome,
    successMet: draft.successMet,
    successNote: draft.successNote,
    confidenceInHindsight: draft.confidenceInHindsight,
    confidenceNote: draft.confidenceNote,
    obstaclesHit: draft.obstaclesHit,
    workedWell: draft.workedWell,
    wasDifficult: draft.wasDifficult,
    learned: draft.learned,
    followUp,
    keyResults: snap.keyResultSnapshots,
    window: {
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      weeksPlanned: snap.weeksPlanned,
    },
  }

  const updated = await goalDexieRepository.update(goalId, { status, closingReflection })
  return { goal: updated, createdHabits }
}

/** „Później” on the invite: keep the goal open and quiet for a week. */
export async function deferGoalClosing(goalId: string, days = GOAL_CLOSING_DEFER_DAYS): Promise<Goal> {
  return goalDexieRepository.update(goalId, { closingDeferredUntil: addDaysToDayRef(todayRef(), days) })
}

/** Back to „Otwarty”: drops the reflection, reopens the goal's key results. */
export async function reopenGoal(goalId: string): Promise<Goal> {
  const keyResults = (await keyResultDexieRepository.listAll()).filter((item) => item.goalId === goalId)
  for (const keyResult of keyResults) {
    if (keyResult.status !== 'open') {
      await keyResultDexieRepository.update(keyResult.id, { status: 'open' })
    }
  }
  return goalDexieRepository.update(goalId, { status: 'open' })
}
