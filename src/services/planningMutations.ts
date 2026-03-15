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

export async function clearMeasurementMonthPlacement({
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
    'unassigned',
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

export async function clearMeasurementPlacementInMonthView({
  monthRef,
  cadence,
  subjectType,
  subjectId,
}: MeasurementMonthViewRef): Promise<void> {
  if (cadence === 'monthly') {
    await clearMeasurementMonthPlacement({ monthRef, subjectType, subjectId })
    return
  }

  const existing = await planningStateDexieRepository.getMeasurementMonthState(
    monthRef,
    subjectType,
    subjectId
  )
  await clearWeeklyMeasurementPlacementsInMonth(monthRef, subjectType, subjectId, {
    preserveMonthState: true,
    targetOverride: existing?.targetOverride,
  })
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
      upsertMeasurementMonthState(overlappingMonth, subjectType, subjectId, 'unassigned')
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

export async function clearMeasurementPlacementInWeek({
  weekRef,
  subjectType,
  subjectId,
  cadence,
  monthRef,
}: MeasurementWeekRef): Promise<void> {
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

  const sourceMonthRef = cadence === 'monthly' ? monthRef : undefined
  await planningStateDexieRepository.upsertMeasurementWeekState({
    weekRef,
    sourceMonthRef,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope: 'unassigned',
  })
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
        upsertMeasurementMonthState(overlappingMonth, subjectType, subjectId, 'unassigned')
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
