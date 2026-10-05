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
import { evaluateClosingMonths } from '@/domain/goalClosing'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import type { MeasurementEvaluationStatus } from '@/services/measurementProgress'
import { getMonthPlanningBundle, getWeekPlanningBundle } from '@/services/planningStateQueries'
import { addDaysToDayRef, getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
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
  /** Goal window months that have started by today, oldest first (active months; else start→target). */
  months: MonthRef[]
  /** Distinct weeks overlapping `months` that have started by today, oldest first. */
  weeks: WeekRef[]
  /** Weeks at least one key result was planned in, each counted once. */
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

interface ClosingWindow {
  /** Goal window months that have started by today, oldest first. */
  months: MonthRef[]
  /** Distinct weeks overlapping those months that have started by today, oldest first. */
  weeks: WeekRef[]
  today: DayRef
}

/**
 * State of one period from its evaluation. A period that has not ended yet
 * (today included) and is not met so far is 'ongoing' — shown, never counted.
 */
function closingPeriodState(
  status: MeasurementEvaluationStatus,
  periodEnd: DayRef,
  today: DayRef,
): GoalClosingMonthState {
  if (status === 'met') return 'met'
  return periodEnd >= today ? 'ongoing' : status
}

/**
 * Period-by-period state of one key result, in its own cadence.
 *
 * Weekly key results are judged week by week from the week planning bundle —
 * the same item (target cascade month→week, entries of the whole week) the
 * weekly plan and reflection show; only weeks the key result was assigned to
 * (MonthMeasurementPlanningItem.plannedWeekRefs) count. Each week is evaluated once,
 * even when it straddles two months. Monthly key results are judged by the
 * month bundle's month summary.
 */
async function snapshotKeyResult(
  keyResult: KeyResult,
  window: ClosingWindow,
): Promise<GoalClosingKeyResultSnapshot> {
  let lastValue: number | undefined

  if (keyResult.cadence === 'weekly') {
    // Assigned weeks come from the month plans (week states, day assignments);
    // a boundary week is assigned once even when both months list it.
    const assigned = new Set<WeekRef>()
    for (const monthRef of window.months) {
      const bundle = await getMonthPlanningBundle(monthRef)
      const item = bundle.measurementItems.find(
        (candidate) => candidate.subjectType === 'keyResult' && candidate.subject.id === keyResult.id,
      )
      item?.plannedWeekRefs.forEach((weekRef) => assigned.add(weekRef))
    }

    const weekStates: { weekRef: WeekRef; state: GoalClosingMonthState }[] = []
    for (const weekRef of window.weeks) {
      const item = assigned.has(weekRef)
        ? (await getWeekPlanningBundle(weekRef, window.today)).relevant.cadencedItems.find(
            (candidate) => candidate.subjectType === 'keyResult' && candidate.subject.id === keyResult.id,
          )
        : undefined
      if (!item) {
        weekStates.push({ weekRef, state: 'unplanned' })
        continue
      }
      if (item.measurement.actualValue !== undefined) lastValue = item.measurement.actualValue
      weekStates.push({
        weekRef,
        state: closingPeriodState(item.measurement.evaluationStatus ?? 'no-data', getPeriodBounds(weekRef).end, window.today),
      })
    }

    const verdict = evaluateClosingMonths(weekStates)
    const lastReadout = keyResult.entryMode === 'value' || keyResult.entryMode === 'rating'
      ? lastValue === undefined ? undefined : formatReadoutNumber(lastValue)
      : verdict.monthsPlanned > 0 ? `${verdict.monthsMet}/${verdict.monthsPlanned} tyg.` : undefined

    return {
      id: keyResult.id,
      title: keyResult.title,
      entryMode: keyResult.entryMode,
      cadence: keyResult.cadence,
      evaluation: verdict.evaluation,
      monthsMet: 0,
      monthsPlanned: 0,
      months: [],
      weeksMet: verdict.monthsMet,
      weeksPlanned: verdict.monthsPlanned,
      weeks: weekStates,
      lastReadout,
    }
  }

  const monthStates: { monthRef: MonthRef; state: GoalClosingMonthState }[] = []
  for (const monthRef of window.months) {
    const bundle = await getMonthPlanningBundle(monthRef)
    const item = bundle.measurementItems.find(
      (candidate) => candidate.subjectType === 'keyResult' && candidate.subject.id === keyResult.id,
    )
    if (!item) {
      monthStates.push({ monthRef, state: 'unplanned' })
      continue
    }
    if (item.measurement?.actualValue !== undefined) lastValue = item.measurement.actualValue
    monthStates.push({
      monthRef,
      state: closingPeriodState(item.measurement?.evaluationStatus ?? 'no-data', getPeriodBounds(monthRef).end, window.today),
    })
  }

  const verdict = evaluateClosingMonths(monthStates)
  let lastReadout: string | undefined
  if (keyResult.entryMode === 'value' || keyResult.entryMode === 'rating') {
    lastReadout = lastValue === undefined ? undefined : formatReadoutNumber(lastValue)
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

/**
 * Weeks any key result was planned in: weekly ones from their week states,
 * monthly ones from the weeks their month plan placed them in. Each week once.
 */
async function countPlannedWeeks(
  snapshots: GoalClosingKeyResultSnapshot[],
  window: ClosingWindow,
): Promise<number> {
  const started = new Set(window.weeks)
  const planned = new Set<string>()
  for (const snapshot of snapshots) {
    for (const week of snapshot.weeks ?? []) {
      if (week.state !== 'unplanned') planned.add(week.weekRef)
    }
  }
  const monthlyIds = new Set(snapshots.filter((item) => item.cadence === 'monthly').map((item) => item.id))
  if (monthlyIds.size) {
    for (const monthRef of window.months) {
      const bundle = await getMonthPlanningBundle(monthRef)
      for (const item of bundle.measurementItems) {
        if (item.subjectType !== 'keyResult' || !monthlyIds.has(item.subject.id)) continue
        for (const weekRef of item.plannedWeekRefs) {
          if (started.has(weekRef)) planned.add(weekRef)
        }
      }
    }
  }
  return planned.size
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
  const today = todayRef()
  // Only what has happened: months and weeks that started by today.
  const months = (await resolveGoalMonths(goal)).filter((monthRef) => getPeriodBounds(monthRef).start <= today)
  const weekSet = new Set<WeekRef>()
  for (const monthRef of months) {
    for (const weekRef of getChildPeriods(monthRef) as WeekRef[]) {
      if (getPeriodBounds(weekRef).start <= today) weekSet.add(weekRef)
    }
  }
  const window: ClosingWindow = { months, weeks: [...weekSet].sort(), today }
  const keyResultSnapshots: GoalClosingKeyResultSnapshot[] = []
  for (const keyResult of keyResults) {
    keyResultSnapshots.push(await snapshotKeyResult(keyResult, window))
  }
  const weeksPlanned = await countPlannedWeeks(keyResultSnapshots, window)
  return { goal, keyResults, months, weeks: window.weeks, weeksPlanned, keyResultSnapshots }
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
