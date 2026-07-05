import type { MeasurementTarget, PlanningCadence } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementSubjectType,
} from '@/domain/planningState'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { getChildPeriods, getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'

interface MeasurementRef {
  subjectType: MeasurementSubjectType
  subjectId: string
}

interface MeasurementMonthRef extends MeasurementRef {
  monthRef: MonthRef
}

interface MeasurementMonthViewRef extends MeasurementMonthRef {
  cadence: PlanningCadence
}

interface MeasurementPeriodLinkRef extends MeasurementRef {
  periodRef: MonthRef | WeekRef
  cadence: PlanningCadence
}

interface MeasurementWeekRef extends MeasurementRef {
  weekRef: WeekRef
  cadence: PlanningCadence
  monthRef?: MonthRef
}

interface MeasurementDayRef extends MeasurementRef {
  dayRef: DayRef
  cadence: PlanningCadence
  monthRef?: MonthRef
}

function isAssignmentInMonth(assignment: MeasurementDayAssignment, monthRef: MonthRef): boolean {
  return getPeriodRefsForDate(assignment.dayRef).month === monthRef
}

function isAssignmentInWeek(assignment: MeasurementDayAssignment, weekRef: WeekRef): boolean {
  return getPeriodRefsForDate(assignment.dayRef).week === weekRef
}

async function listSubjectDayAssignments(
  subjectType: MeasurementSubjectType,
  subjectId: string
): Promise<MeasurementDayAssignment[]> {
  const assignments = await planningStateDexieRepository.listMeasurementDayAssignments()
  return assignments.filter(
    assignment => assignment.subjectType === subjectType && assignment.subjectId === subjectId
  )
}

async function ensureMonthPlan(monthRef: MonthRef): Promise<void> {
  if (await periodPlanDexieRepository.getMonthPlan(monthRef)) {
    return
  }

  await periodPlanDexieRepository.createMonthPlan({ monthRef })
}

async function upsertMeasurementMonthState(
  monthRef: MonthRef,
  subjectType: MeasurementSubjectType,
  subjectId: string,
  scheduleScope: MeasurementMonthState['scheduleScope'],
  targetOverride?: MeasurementTarget
): Promise<MeasurementMonthState> {
  await ensureMonthPlan(monthRef)
  return planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope,
    targetOverride,
  })
}

/**
 * Ensure an active month state exists without mutating what's already there —
 * preserves scheduleScope and targetOverride (an upsert with an explicit
 * `targetOverride: undefined` key would clear the stored override).
 */
async function ensureActiveMeasurementMonthState(
  monthRef: MonthRef,
  subjectType: MeasurementSubjectType,
  subjectId: string
): Promise<MeasurementMonthState> {
  const existing = await planningStateDexieRepository.getMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId
  )
  return upsertMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId,
    existing?.scheduleScope ?? 'unassigned',
    existing?.targetOverride
  )
}

async function clearMonthAssignments(
  monthRef: MonthRef,
  subjectType: MeasurementSubjectType,
  subjectId: string
): Promise<void> {
  const [weekStates, dayAssignments] = await Promise.all([
    planningStateDexieRepository.listMeasurementWeekStatesForSubject(subjectType, subjectId),
    listSubjectDayAssignments(subjectType, subjectId),
  ])

  await Promise.all([
    ...weekStates
      .filter(state => state.sourceMonthRef === monthRef)
      .map(state =>
        planningStateDexieRepository.deleteMeasurementWeekState(
          state.weekRef,
          state.subjectType,
          state.subjectId,
          state.sourceMonthRef
        )
      ),
    ...dayAssignments
      .filter(assignment => isAssignmentInMonth(assignment, monthRef))
      .map(assignment =>
        planningStateDexieRepository.deleteMeasurementDayAssignment(
          assignment.dayRef,
          assignment.subjectType,
          assignment.subjectId
        )
      ),
  ])
}

/**
 * Active ⇔ placed (monthly cadence): a month state with scope 'unassigned' only
 * exists while explicit placements (week states sourced from this month, or day
 * assignments inside it) remain. When the last one is removed, the month state —
 * and its target override — is deleted, deactivating the object for the month.
 * A 'whole-month' scope IS a placement and is never cleaned up here.
 */
async function cleanupMonthlyMonthState(
  monthRef: MonthRef,
  subjectType: MeasurementSubjectType,
  subjectId: string
): Promise<void> {
  const monthState = await planningStateDexieRepository.getMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId
  )
  if (!monthState || monthState.scheduleScope !== 'unassigned') return

  const [weekStates, dayAssignments] = await Promise.all([
    planningStateDexieRepository.listMeasurementWeekStatesForSubject(subjectType, subjectId),
    listSubjectDayAssignments(subjectType, subjectId),
  ])

  const hasWeekState = weekStates.some(state => state.sourceMonthRef === monthRef)
  const hasDayAssignment = dayAssignments.some(assignment =>
    isAssignmentInMonth(assignment, monthRef)
  )

  if (!hasWeekState && !hasDayAssignment) {
    await planningStateDexieRepository.deleteMeasurementMonthState(monthRef, subjectType, subjectId)
  }
}

async function cleanupWeeklyMonthStates(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  monthRefs: MonthRef[]
): Promise<void> {
  const [weekStates, dayAssignments] = await Promise.all([
    planningStateDexieRepository.listMeasurementWeekStatesForSubject(subjectType, subjectId),
    listSubjectDayAssignments(subjectType, subjectId),
  ])

  await Promise.all(
    monthRefs.map(async monthRef => {
      const hasWeekState = weekStates.some(state => {
        if (state.subjectType !== subjectType || state.subjectId !== subjectId) {
          return false
        }
        return getWeekOverlappingMonths(state.weekRef).includes(monthRef)
      })
      const hasDayAssignment = dayAssignments.some(
        assignment =>
          assignment.subjectType === subjectType &&
          assignment.subjectId === subjectId &&
          isAssignmentInMonth(assignment, monthRef)
      )

      if (!hasWeekState && !hasDayAssignment) {
        await planningStateDexieRepository.deleteMeasurementMonthState(
          monthRef,
          subjectType,
          subjectId
        )
      }
    })
  )
}

export async function linkGoalToMonth(goalId: string, monthRef: MonthRef): Promise<void> {
  await ensureMonthPlan(monthRef)
  await planningStateDexieRepository.upsertGoalMonthState({
    monthRef,
    goalId,
    activityState: 'active',
  })
}

export async function unlinkGoalFromMonth(goalId: string, monthRef: MonthRef): Promise<void> {
  const keyResults = await keyResultDexieRepository.listAll()
  const linkedKeyResults = keyResults.filter(item => item.goalId === goalId)

  await Promise.all(
    linkedKeyResults.map(item =>
      deactivateMeasurementFromMonthView({
        monthRef,
        cadence: item.cadence,
        subjectType: 'keyResult',
        subjectId: item.id,
      })
    )
  )
  await planningStateDexieRepository.deleteGoalMonthState(monthRef, goalId)
}

export async function activateMeasurementInMonth({
  monthRef,
  subjectType,
  subjectId,
  targetOverride,
}: MeasurementMonthRef & { targetOverride?: MeasurementTarget }): Promise<void> {
  await upsertMeasurementMonthState(monthRef, subjectType, subjectId, 'unassigned', targetOverride)
}

export async function updateMeasurementTargetOverride({
  monthRef,
  subjectType,
  subjectId,
  targetOverride,
}: MeasurementMonthRef & { targetOverride?: MeasurementTarget }): Promise<void> {
  const existing = await planningStateDexieRepository.getMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId
  )

  await planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef,
    subjectType,
    subjectId,
    activityState: existing?.activityState ?? 'active',
    scheduleScope: existing?.scheduleScope ?? 'unassigned',
    targetOverride,
  })
}

export async function updateMeasurementWeekTargetOverride({
  weekRef,
  subjectType,
  subjectId,
  cadence,
  monthRef,
  targetOverride,
}: MeasurementWeekRef & { targetOverride?: MeasurementTarget }): Promise<void> {
  if (cadence === 'monthly' && !monthRef) {
    throw new Error('Monthly cadence week target overrides require monthRef')
  }
  const sourceMonthRef = cadence === 'monthly' ? monthRef : undefined
  const existing = await planningStateDexieRepository.getMeasurementWeekState(
    weekRef,
    subjectType,
    subjectId,
    sourceMonthRef
  )

  await planningStateDexieRepository.upsertMeasurementWeekState({
    weekRef,
    sourceMonthRef,
    subjectType,
    subjectId,
    activityState: existing?.activityState ?? 'active',
    scheduleScope: existing?.scheduleScope ?? 'unassigned',
    targetOverride,
  })
}

export async function deactivateMeasurementInMonth({
  monthRef,
  subjectType,
  subjectId,
}: MeasurementMonthRef): Promise<void> {
  await clearMonthAssignments(monthRef, subjectType, subjectId)
  await planningStateDexieRepository.deleteMeasurementMonthState(monthRef, subjectType, subjectId)
}

export async function assignMeasurementToWholeMonth({
  monthRef,
  subjectType,
  subjectId,
}: MeasurementMonthRef): Promise<void> {
  const existing = await planningStateDexieRepository.getMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId
  )
  await clearMonthAssignments(monthRef, subjectType, subjectId)
  await upsertMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId,
    'whole-month',
    existing?.targetOverride
  )
}

async function clearWeeklyMeasurementPlacementsInMonth(
  monthRef: MonthRef,
  subjectType: MeasurementSubjectType,
  subjectId: string,
  options?: { preserveMonthState?: boolean; targetOverride?: MeasurementTarget }
): Promise<void> {
  const monthWeekRefs = new Set(getChildPeriods(monthRef) as WeekRef[])
  const [weekStates, dayAssignments, existingMonthState] = await Promise.all([
    planningStateDexieRepository.listMeasurementWeekStatesForSubject(subjectType, subjectId),
    listSubjectDayAssignments(subjectType, subjectId),
    planningStateDexieRepository.getMeasurementMonthState(monthRef, subjectType, subjectId),
  ])

  await Promise.all([
    ...weekStates
      .filter(state => monthWeekRefs.has(state.weekRef))
      .map(state =>
        planningStateDexieRepository.deleteMeasurementWeekState(
          state.weekRef,
          state.subjectType,
          state.subjectId,
          state.sourceMonthRef
        )
      ),
    ...dayAssignments
      .filter(assignment => isAssignmentInMonth(assignment, monthRef))
      .map(assignment =>
        planningStateDexieRepository.deleteMeasurementDayAssignment(
          assignment.dayRef,
          assignment.subjectType,
          assignment.subjectId
        )
      ),
  ])

  if (options?.preserveMonthState) {
    await upsertMeasurementMonthState(
      monthRef,
      subjectType,
      subjectId,
      'unassigned',
      options.targetOverride ?? existingMonthState?.targetOverride
    )
    return
  }

  await planningStateDexieRepository.deleteMeasurementMonthState(monthRef, subjectType, subjectId)
}

export async function assignMeasurementToWholeMonthView({
  monthRef,
  cadence,
  subjectType,
  subjectId,
}: MeasurementMonthViewRef): Promise<void> {
  if (cadence === 'monthly') {
    await assignMeasurementToWholeMonth({ monthRef, subjectType, subjectId })
    return
  }

  const existing = await planningStateDexieRepository.getMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId
  )
  const monthWeekRefs = getChildPeriods(monthRef) as WeekRef[]

  await clearWeeklyMeasurementPlacementsInMonth(monthRef, subjectType, subjectId, {
    preserveMonthState: true,
    targetOverride: existing?.targetOverride,
  })

  await Promise.all(
    monthWeekRefs.map(weekRef =>
      planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef,
        subjectType,
        subjectId,
        activityState: 'active',
        scheduleScope: 'whole-week',
      })
    )
  )
}

export async function deactivateMeasurementFromMonthView({
  monthRef,
  cadence,
  subjectType,
  subjectId,
}: MeasurementMonthViewRef): Promise<void> {
  if (cadence === 'monthly') {
    await deactivateMeasurementInMonth({ monthRef, subjectType, subjectId })
    return
  }

  await clearWeeklyMeasurementPlacementsInMonth(monthRef, subjectType, subjectId)
}

export async function linkMeasurementPeriod({
  subjectType,
  subjectId,
  cadence,
  periodRef,
}: MeasurementPeriodLinkRef): Promise<void> {
  if (cadence === 'monthly') {
    const existing = await planningStateDexieRepository.getMeasurementMonthState(
      periodRef as MonthRef,
      subjectType,
      subjectId
    )
    await upsertMeasurementMonthState(
      periodRef as MonthRef,
      subjectType,
      subjectId,
      existing?.scheduleScope ?? 'unassigned',
      existing?.targetOverride
    )
    return
  }

  const weekRef = periodRef as WeekRef
  const overlappingMonths = getWeekOverlappingMonths(weekRef)
  await Promise.all(
    overlappingMonths.map(overlappingMonth =>
      ensureActiveMeasurementMonthState(overlappingMonth, subjectType, subjectId)
    )
  )
  await planningStateDexieRepository.upsertMeasurementWeekState({
    weekRef,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope: 'unassigned',
  })
}

export async function unlinkMeasurementPeriod({
  subjectType,
  subjectId,
  cadence,
  periodRef,
}: MeasurementPeriodLinkRef): Promise<void> {
  if (cadence === 'monthly') {
    await deactivateMeasurementInMonth({
      monthRef: periodRef as MonthRef,
      subjectType,
      subjectId,
    })
    return
  }

  const weekRef = periodRef as WeekRef
  const dayAssignments = await listSubjectDayAssignments(subjectType, subjectId)
  const assignmentsInWeek = dayAssignments.filter(assignment =>
    isAssignmentInWeek(assignment, weekRef)
  )

  await Promise.all(
    assignmentsInWeek.map(assignment =>
      planningStateDexieRepository.deleteMeasurementDayAssignment(
        assignment.dayRef,
        assignment.subjectType,
        assignment.subjectId
      )
    )
  )

  await planningStateDexieRepository.deleteMeasurementWeekState(
    weekRef,
    subjectType,
    subjectId,
    undefined
  )

  if (cadence === 'weekly') {
    await cleanupWeeklyMonthStates(subjectType, subjectId, getWeekOverlappingMonths(weekRef))
  }
}

export async function toggleMeasurementWeekAssignment({
  subjectType,
  subjectId,
  cadence,
  weekRef,
  monthRef,
}: MeasurementWeekRef): Promise<void> {
  const existing = await planningStateDexieRepository.getMeasurementWeekState(
    weekRef,
    subjectType,
    subjectId,
    cadence === 'monthly' ? monthRef : undefined
  )

  if (existing && existing.scheduleScope === 'whole-week') {
    if (cadence === 'monthly') {
      // Un-toggle removes this week's placement. unlinkMeasurementPeriod must
      // not be used here — its monthly branch expects a MonthRef and would
      // silently no-op on a weekRef. If this was the object's last placement in
      // the month, the cleanup deactivates it (active ⇔ placed).
      await planningStateDexieRepository.deleteMeasurementWeekState(
        weekRef,
        subjectType,
        subjectId,
        existing.sourceMonthRef
      )
      if (existing.sourceMonthRef) {
        await cleanupMonthlyMonthState(existing.sourceMonthRef, subjectType, subjectId)
      }
      return
    }
    await unlinkMeasurementPeriod({
      subjectType,
      subjectId,
      cadence,
      periodRef: weekRef,
    })
    return
  }

  if (cadence === 'monthly') {
    if (!monthRef) {
      throw new Error('Monthly cadence week assignments require monthRef')
    }

    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      monthRef,
      subjectType,
      subjectId
    )
    await upsertMeasurementMonthState(
      monthRef,
      subjectType,
      subjectId,
      monthState?.scheduleScope ?? 'unassigned',
      monthState?.targetOverride
    )
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      sourceMonthRef: monthRef,
      subjectType,
      subjectId,
      activityState: 'active',
      scheduleScope: 'whole-week',
    })
    return
  }

  await linkMeasurementPeriod({ subjectType, subjectId, cadence, periodRef: weekRef })
  await planningStateDexieRepository.upsertMeasurementWeekState({
    weekRef,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope: 'whole-week',
  })
}

export async function toggleMeasurementDayAssignment({
  subjectType,
  subjectId,
  cadence,
  dayRef,
  monthRef,
}: MeasurementDayRef): Promise<void> {
  const refs = getPeriodRefsForDate(dayRef)
  const sourceMonthRef = cadence === 'monthly' ? monthRef ?? refs.month : undefined
  const existingAssignment = await planningStateDexieRepository.getMeasurementDayAssignment(
    dayRef,
    subjectType,
    subjectId
  )

  if (existingAssignment) {
    await planningStateDexieRepository.deleteMeasurementDayAssignment(dayRef, subjectType, subjectId)
    const remainingAssignments = (await listSubjectDayAssignments(subjectType, subjectId)).filter(
      assignment =>
        assignment.subjectType === subjectType &&
        assignment.subjectId === subjectId &&
        isAssignmentInWeek(assignment, refs.week)
    )

    if (remainingAssignments.length === 0) {
      await planningStateDexieRepository.deleteMeasurementWeekState(
        refs.week,
        subjectType,
        subjectId,
        sourceMonthRef
      )
      if (cadence === 'weekly') {
        await cleanupWeeklyMonthStates(subjectType, subjectId, getWeekOverlappingMonths(refs.week))
      } else if (sourceMonthRef) {
        await cleanupMonthlyMonthState(sourceMonthRef, subjectType, subjectId)
      }
    }
    return
  }

  if (cadence === 'monthly') {
    const monthState = await planningStateDexieRepository.getMeasurementMonthState(
      sourceMonthRef as MonthRef,
      subjectType,
      subjectId
    )
    await upsertMeasurementMonthState(
      sourceMonthRef as MonthRef,
      subjectType,
      subjectId,
      monthState?.scheduleScope ?? 'unassigned',
      monthState?.targetOverride
    )
  } else {
    await Promise.all(
      getWeekOverlappingMonths(refs.week).map(overlappingMonth =>
        ensureActiveMeasurementMonthState(overlappingMonth, subjectType, subjectId)
      )
    )
  }

  await planningStateDexieRepository.upsertMeasurementWeekState({
    weekRef: refs.week,
    sourceMonthRef,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope: 'specific-days',
  })
  await planningStateDexieRepository.upsertMeasurementDayAssignment({
    dayRef,
    subjectType,
    subjectId,
  })
}

interface MeasurementWeekPlacementSetRef extends MeasurementRef {
  monthRef: MonthRef
  cadence: PlanningCadence
  weekRefs: WeekRef[]
}

interface MeasurementDayAssignmentSetRef extends MeasurementRef {
  weekRef: WeekRef
  cadence: PlanningCadence
  dayRefs: DayRef[]
}

/**
 * Replace a subject's explicit week placements in a month with exactly `weekRefs`
 * (each 'whole-week'). Materializes a soft "whole month" row into explicit
 * placements when the user starts editing individual week cells — coverage of the
 * remaining weeks must not silently collapse to the single clicked week.
 * Monthly cadence: the month scope drops to 'unassigned' (placement is now
 * explicit) and week sub-targets on kept weeks survive; an empty set deactivates
 * the object for the month (active ⇔ placed).
 */
export async function materializeMeasurementWeekPlacements({
  monthRef,
  cadence,
  subjectType,
  subjectId,
  weekRefs,
}: MeasurementWeekPlacementSetRef): Promise<void> {
  const monthWeekRefs = getChildPeriods(monthRef) as WeekRef[]
  const monthWeekSet = new Set(monthWeekRefs)
  for (const weekRef of weekRefs) {
    if (!monthWeekSet.has(weekRef)) {
      throw new Error('weekRefs must be weeks of monthRef')
    }
  }

  const keepSet = new Set(weekRefs)
  const dayAssignments = await listSubjectDayAssignments(subjectType, subjectId)
  const staleDayAssignments = dayAssignments.filter(assignment => {
    const assignmentWeek = getPeriodRefsForDate(assignment.dayRef).week
    return monthWeekSet.has(assignmentWeek) && !keepSet.has(assignmentWeek)
  })
  await Promise.all(
    staleDayAssignments.map(assignment =>
      planningStateDexieRepository.deleteMeasurementDayAssignment(
        assignment.dayRef,
        assignment.subjectType,
        assignment.subjectId
      )
    )
  )

  if (cadence === 'monthly') {
    if (weekRefs.length === 0) {
      await deactivateMeasurementInMonth({ monthRef, subjectType, subjectId })
      return
    }

    const existing = await planningStateDexieRepository.getMeasurementMonthState(
      monthRef,
      subjectType,
      subjectId
    )
    await upsertMeasurementMonthState(
      monthRef,
      subjectType,
      subjectId,
      'unassigned',
      existing?.targetOverride
    )
    await Promise.all(
      monthWeekRefs.map(weekRef =>
        keepSet.has(weekRef)
          ? planningStateDexieRepository.upsertMeasurementWeekState({
              weekRef,
              sourceMonthRef: monthRef,
              subjectType,
              subjectId,
              activityState: 'active',
              scheduleScope: 'whole-week',
            })
          : planningStateDexieRepository.deleteMeasurementWeekState(
              weekRef,
              subjectType,
              subjectId,
              monthRef
            )
      )
    )
    return
  }

  await Promise.all(
    monthWeekRefs.map(async weekRef => {
      if (!keepSet.has(weekRef)) {
        await planningStateDexieRepository.deleteMeasurementWeekState(
          weekRef,
          subjectType,
          subjectId,
          undefined
        )
        return
      }
      await Promise.all(
        getWeekOverlappingMonths(weekRef).map(overlappingMonth =>
          ensureActiveMeasurementMonthState(overlappingMonth, subjectType, subjectId)
        )
      )
      await planningStateDexieRepository.upsertMeasurementWeekState({
        weekRef,
        subjectType,
        subjectId,
        activityState: 'active',
        scheduleScope: 'whole-week',
      })
    })
  )

  const affectedMonths = new Set<MonthRef>()
  for (const weekRef of monthWeekRefs) {
    for (const overlappingMonth of getWeekOverlappingMonths(weekRef)) {
      affectedMonths.add(overlappingMonth)
    }
  }
  await cleanupWeeklyMonthStates(subjectType, subjectId, [...affectedMonths])
}

/**
 * Replace a subject's day assignments in a week with exactly `dayRefs`
 * (scope 'specific-days'). Materializes a soft "whole week" row into explicit
 * days when the user starts editing individual day cells. An empty set removes
 * the week placement entirely and — per active ⇔ placed — deactivates the
 * object in months left without any placement.
 * Monthly cadence: week states are keyed by each day's month (same attribution
 * as toggleMeasurementDayAssignment), so a boundary week may hold one state per
 * overlapped month; months losing their last day lose their state (and, via
 * cleanup, possibly the month activation). Week target overrides on surviving
 * states are preserved.
 */
export async function materializeMeasurementDayAssignments({
  weekRef,
  cadence,
  subjectType,
  subjectId,
  dayRefs,
}: MeasurementDayAssignmentSetRef): Promise<void> {
  const weekDayRefs = getChildPeriods(weekRef) as DayRef[]
  const weekDaySet = new Set(weekDayRefs)
  for (const dayRef of dayRefs) {
    if (!weekDaySet.has(dayRef)) {
      throw new Error('dayRefs must be days of weekRef')
    }
  }

  const keepSet = new Set(dayRefs)
  const existingAssignments = (await listSubjectDayAssignments(subjectType, subjectId)).filter(
    assignment => isAssignmentInWeek(assignment, weekRef)
  )
  const overlappingMonths = getWeekOverlappingMonths(weekRef)
  const monthsWithDays = new Set(dayRefs.map(dayRef => getPeriodRefsForDate(dayRef).month))

  // Week states first: the repository guard rejects day assignments without an
  // active 'specific-days' week state covering the day's month.
  if (cadence === 'monthly') {
    await Promise.all(
      overlappingMonths
        .filter(overlappingMonth => monthsWithDays.has(overlappingMonth))
        .map(async overlappingMonth => {
          await ensureActiveMeasurementMonthState(overlappingMonth, subjectType, subjectId)
          await planningStateDexieRepository.upsertMeasurementWeekState({
            weekRef,
            sourceMonthRef: overlappingMonth,
            subjectType,
            subjectId,
            activityState: 'active',
            scheduleScope: 'specific-days',
          })
        })
    )
  } else if (dayRefs.length > 0) {
    await Promise.all(
      overlappingMonths.map(overlappingMonth =>
        ensureActiveMeasurementMonthState(overlappingMonth, subjectType, subjectId)
      )
    )
    await planningStateDexieRepository.upsertMeasurementWeekState({
      weekRef,
      subjectType,
      subjectId,
      activityState: 'active',
      scheduleScope: 'specific-days',
    })
  }

  await Promise.all([
    ...existingAssignments
      .filter(assignment => !keepSet.has(assignment.dayRef))
      .map(assignment =>
        planningStateDexieRepository.deleteMeasurementDayAssignment(
          assignment.dayRef,
          assignment.subjectType,
          assignment.subjectId
        )
      ),
    ...dayRefs
      .filter(dayRef => !existingAssignments.some(assignment => assignment.dayRef === dayRef))
      .map(dayRef =>
        planningStateDexieRepository.upsertMeasurementDayAssignment({
          dayRef,
          subjectType,
          subjectId,
        })
      ),
  ])

  if (cadence === 'monthly') {
    await Promise.all(
      overlappingMonths
        .filter(overlappingMonth => !monthsWithDays.has(overlappingMonth))
        .map(async overlappingMonth => {
          await planningStateDexieRepository.deleteMeasurementWeekState(
            weekRef,
            subjectType,
            subjectId,
            overlappingMonth
          )
          await cleanupMonthlyMonthState(overlappingMonth, subjectType, subjectId)
        })
    )
    return
  }

  if (dayRefs.length === 0) {
    await planningStateDexieRepository.deleteMeasurementWeekState(
      weekRef,
      subjectType,
      subjectId,
      undefined
    )
    await cleanupWeeklyMonthStates(subjectType, subjectId, overlappingMonths)
  }
}
