import type { DayRef, MonthRef } from '@/domain/period'
import type { MeasurementSubjectType } from '@/domain/planningState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import type {
  TodayAddCandidate,
  TodayInitiativeItem,
  TodayItem,
  TodayMeasurementItem,
} from '@/services/todayViewQueries'
import { toggleMeasurementDayAssignment } from '@/services/planningMutations'
import { getPeriodRefsForDate } from '@/utils/periods'

function assertMeasurementSchedulingAllowed(item: TodayMeasurementItem): void {
  if (!item.canReschedule) {
    throw new Error('Only items explicitly assigned to today can be rescheduled here.')
  }
}

function assertInitiativeSchedulingAllowed(item: TodayInitiativeItem): void {
  if (!item.canReschedule) {
    throw new Error('Only initiatives explicitly assigned to today can be rescheduled here.')
  }
}

async function deleteMeasurementPlanningState(
  subjectType: MeasurementSubjectType,
  subjectId: string
): Promise<void> {
  const [monthStates, weekStates, dayAssignments, entries, hiddenStates] = await Promise.all([
    planningStateDexieRepository.listMeasurementMonthStates(),
    planningStateDexieRepository.listMeasurementWeekStates(),
    planningStateDexieRepository.listMeasurementDayAssignments(),
    planningStateDexieRepository.listDailyMeasurementEntries(),
    planningStateDexieRepository.listTodayHiddenStates(),
  ])

  await Promise.all([
    ...monthStates
      .filter(state => state.subjectType === subjectType && state.subjectId === subjectId)
      .map(state =>
        planningStateDexieRepository.deleteMeasurementMonthState(
          state.monthRef,
          state.subjectType,
          state.subjectId
        )
      ),
    ...weekStates
      .filter(state => state.subjectType === subjectType && state.subjectId === subjectId)
      .map(state =>
        planningStateDexieRepository.deleteMeasurementWeekState(
          state.weekRef,
          state.subjectType,
          state.subjectId,
          state.sourceMonthRef
        )
      ),
    ...dayAssignments
      .filter(
        assignment => assignment.subjectType === subjectType && assignment.subjectId === subjectId
      )
      .map(assignment =>
        planningStateDexieRepository.deleteMeasurementDayAssignment(
          assignment.dayRef,
          assignment.subjectType,
          assignment.subjectId
        )
      ),
    ...entries
      .filter(entry => entry.subjectType === subjectType && entry.subjectId === subjectId)
      .map(entry =>
        planningStateDexieRepository.deleteDailyMeasurementEntry(
          entry.subjectType,
          entry.subjectId,
          entry.dayRef
        )
      ),
    ...hiddenStates
      .filter(state => state.subjectType === subjectType && state.subjectId === subjectId)
      .map(state =>
        planningStateDexieRepository.deleteTodayHiddenState(
          state.dayRef,
          state.subjectType,
          state.subjectId
        )
      ),
  ])
}

async function deleteInitiativePlanningState(initiativeId: string): Promise<void> {
  const hiddenStates = await planningStateDexieRepository.listTodayHiddenStates()
  await Promise.all([
    planningStateDexieRepository.deleteInitiativePlanState(initiativeId),
    ...hiddenStates
      .filter(state => state.subjectType === 'initiative' && state.subjectId === initiativeId)
      .map(state =>
        planningStateDexieRepository.deleteTodayHiddenState(
          state.dayRef,
          state.subjectType,
          state.subjectId
        )
      ),
  ])
}

export async function toggleTodayCompletion(
  item: TodayMeasurementItem,
  dayRef: DayRef
): Promise<void> {
  if (item.todayEntry) {
    await planningStateDexieRepository.deleteDailyMeasurementEntry(
      item.subjectType,
      item.subject.id,
      dayRef
    )
    return
  }

  await planningStateDexieRepository.upsertDailyMeasurementEntry({
    subjectType: item.subjectType,
    subjectId: item.subject.id,
    dayRef,
    value: null,
  })
}

/**
 * Toggle one multi-completion item on today's checklist. The entry stores the
 * checked ids (value stays null); unchecking the last item deletes the entry —
 * a day with nothing checked is represented by no entry, like completion.
 */
export async function toggleTodayMultiItem(
  item: TodayMeasurementItem,
  dayRef: DayRef,
  multiItemId: string
): Promise<void> {
  const current = item.todayEntry?.checkedItemIds ?? []
  const next = current.includes(multiItemId)
    ? current.filter(id => id !== multiItemId)
    : [...current, multiItemId]

  if (next.length === 0) {
    await planningStateDexieRepository.deleteDailyMeasurementEntry(
      item.subjectType,
      item.subject.id,
      dayRef
    )
    return
  }

  await planningStateDexieRepository.upsertDailyMeasurementEntry({
    subjectType: item.subjectType,
    subjectId: item.subject.id,
    dayRef,
    value: null,
    checkedItemIds: next,
  })
}

export async function saveTodayMeasurementEntry(
  item: TodayMeasurementItem,
  dayRef: DayRef,
  value: number
): Promise<void> {
  await planningStateDexieRepository.upsertDailyMeasurementEntry({
    subjectType: item.subjectType,
    subjectId: item.subject.id,
    dayRef,
    value,
  })
}

export async function clearTodayMeasurementEntry(
  item: TodayMeasurementItem,
  dayRef: DayRef
): Promise<void> {
  await planningStateDexieRepository.deleteDailyMeasurementEntry(
    item.subjectType,
    item.subject.id,
    dayRef
  )
}

export async function moveTodayMeasurementAssignment(
  item: TodayMeasurementItem,
  fromDayRef: DayRef,
  toDayRef: DayRef
): Promise<void> {
  assertMeasurementSchedulingAllowed(item)

  if (fromDayRef === toDayRef) {
    return
  }

  // The target day may sit in another week (or month): go through the same
  // mutation the planning matrix uses, so week/month states are created for
  // the target and cleaned up on the source when it was the last placement.
  const ref = {
    subjectType: item.subjectType,
    subjectId: item.subject.id,
    cadence: item.subject.cadence,
    monthRef: item.sourceMonthRef,
  }
  const alreadyOnTarget = await planningStateDexieRepository.getMeasurementDayAssignment(
    toDayRef,
    item.subjectType,
    item.subject.id
  )
  if (!alreadyOnTarget) {
    await toggleMeasurementDayAssignment({ ...ref, dayRef: toDayRef })
  }
  const stillOnSource = await planningStateDexieRepository.getMeasurementDayAssignment(
    fromDayRef,
    item.subjectType,
    item.subject.id
  )
  if (stillOnSource) {
    await toggleMeasurementDayAssignment({ ...ref, dayRef: fromDayRef })
  }
}

interface DayPlacementRef {
  subjectType: MeasurementSubjectType
  subjectId: string
  cadence: 'weekly' | 'monthly'
  sourceMonthRef?: MonthRef
}

function placementRef(source: TodayAddCandidate | TodayMeasurementItem): DayPlacementRef {
  return {
    subjectType: source.subjectType,
    subjectId: source.subject.id,
    cadence: source.subject.cadence,
    sourceMonthRef: source.sourceMonthRef,
  }
}

async function ensureDayAssignment(ref: DayPlacementRef, dayRef: DayRef): Promise<boolean> {
  const existing = await planningStateDexieRepository.getMeasurementDayAssignment(dayRef, ref.subjectType, ref.subjectId)
  if (existing) return false
  await toggleMeasurementDayAssignment({
    subjectType: ref.subjectType,
    subjectId: ref.subjectId,
    cadence: ref.cadence,
    dayRef,
    monthRef: ref.cadence === 'monthly' ? ref.sourceMonthRef ?? getPeriodRefsForDate(dayRef).month : undefined,
  })
  return true
}

async function removeDayAssignment(ref: DayPlacementRef, dayRef: DayRef): Promise<void> {
  const existing = await planningStateDexieRepository.getMeasurementDayAssignment(dayRef, ref.subjectType, ref.subjectId)
  if (!existing) return
  await toggleMeasurementDayAssignment({
    subjectType: ref.subjectType,
    subjectId: ref.subjectId,
    cadence: ref.cadence,
    dayRef,
    monthRef: ref.cadence === 'monthly' ? ref.sourceMonthRef ?? getPeriodRefsForDate(dayRef).month : undefined,
  })
}

/** "Dodaj do planu": place an open object on this day (creates week/month states as the matrix does). */
export async function addMeasurementToDay(candidate: TodayAddCandidate, dayRef: DayRef): Promise<void> {
  await ensureDayAssignment(placementRef(candidate), dayRef)
}

/** Inverse of `addMeasurementToDay` (undo). */
export async function removeMeasurementFromDay(candidate: TodayAddCandidate, dayRef: DayRef): Promise<void> {
  await removeDayAssignment(placementRef(candidate), dayRef)
}

function scopeCoversDay(item: TodayMeasurementItem, fromDayRef: DayRef, toDayRef: DayRef): boolean {
  const from = getPeriodRefsForDate(fromDayRef)
  const to = getPeriodRefsForDate(toDayRef)
  const scope = item.planning.scheduleScope
  if (scope === 'whole-week') return from.week === to.week
  if (scope === 'whole-month') return (item.sourceMonthRef ?? from.month) === to.month
  if (scope === 'unassigned') return item.subject.cadence === 'weekly' ? from.week === to.week : (item.sourceMonthRef ?? from.month) === to.month
  return false
}

/**
 * "Jutro" / "Dzień" for a week- or month-context row: hide it for the source
 * day and make sure it shows up on the target day. When the target is still
 * covered by the row's own scope (same week for whole-week, same month for
 * whole-month) nothing else is written — the scope stays intact.
 * Returns whether a day assignment had to be created (undo needs to know).
 */
export async function rescheduleContextItem(
  item: TodayMeasurementItem,
  fromDayRef: DayRef,
  toDayRef: DayRef
): Promise<{ createdAssignment: boolean }> {
  if (!item.canHide) {
    throw new Error('Only week and month context items can be rescheduled this way.')
  }
  if (fromDayRef === toDayRef) return { createdAssignment: false }
  if (item.subjectType === 'weeklyIntention' && getPeriodRefsForDate(fromDayRef).week !== getPeriodRefsForDate(toDayRef).week) {
    throw new Error('A weekly intention stays within its own week.')
  }

  const createdAssignment = scopeCoversDay(item, fromDayRef, toDayRef)
    ? false
    : await ensureDayAssignment(placementRef(item), toDayRef)
  await hideTodayItem(item, fromDayRef)
  return { createdAssignment }
}

/** Inverse of `rescheduleContextItem` (undo). */
export async function undoRescheduleContextItem(
  item: TodayMeasurementItem,
  fromDayRef: DayRef,
  toDayRef: DayRef,
  createdAssignment: boolean
): Promise<void> {
  await restoreTodayItem(item, fromDayRef)
  if (createdAssignment) await removeDayAssignment(placementRef(item), toDayRef)
}

export async function clearTodayMeasurementAssignment(
  item: TodayMeasurementItem,
  dayRef: DayRef
): Promise<void> {
  assertMeasurementSchedulingAllowed(item)

  await planningStateDexieRepository.deleteMeasurementDayAssignment(
    dayRef,
    item.subjectType,
    item.subject.id
  )
}

export async function moveTodayInitiative(
  item: TodayInitiativeItem,
  toDayRef: DayRef
): Promise<void> {
  assertInitiativeSchedulingAllowed(item)

  if (item.planState.dayRef === toDayRef) {
    return
  }

  const refs = getPeriodRefsForDate(toDayRef)
  await planningStateDexieRepository.upsertInitiativePlanState({
    initiativeId: item.initiative.id,
    monthRef: refs.month,
    weekRef: refs.week,
    dayRef: toDayRef,
  })
}

export async function clearTodayInitiative(item: TodayInitiativeItem): Promise<void> {
  assertInitiativeSchedulingAllowed(item)

  await planningStateDexieRepository.upsertInitiativePlanState({
    initiativeId: item.initiative.id,
    monthRef: item.planState.monthRef,
    weekRef: item.planState.weekRef,
    dayRef: undefined,
  })
}

export async function hideTodayItem(item: TodayItem, dayRef: DayRef): Promise<void> {
  if (!item.canHide) {
    throw new Error('Only week and month context items can be hidden for today.')
  }

  await planningStateDexieRepository.upsertTodayHiddenState({
    dayRef,
    subjectType: item.kind === 'initiative' ? 'initiative' : item.subjectType,
    subjectId: item.kind === 'initiative' ? item.initiative.id : item.subject.id,
  })
}

export async function restoreTodayItem(item: TodayItem, dayRef: DayRef): Promise<void> {
  await planningStateDexieRepository.deleteTodayHiddenState(
    dayRef,
    item.kind === 'initiative' ? 'initiative' : item.subjectType,
    item.kind === 'initiative' ? item.initiative.id : item.subject.id
  )
}

export async function deleteTodayItem(item: TodayItem): Promise<void> {
  if (!item.canDelete) {
    throw new Error('Only items explicitly scheduled for today can be deleted here.')
  }

  if (item.kind === 'initiative') {
    await deleteInitiativePlanningState(item.initiative.id)
    await initiativeDexieRepository.delete(item.initiative.id)
    return
  }

  await deleteMeasurementPlanningState(item.subjectType, item.subject.id)

  switch (item.subjectType) {
    case 'keyResult':
      await keyResultDexieRepository.delete(item.subject.id)
      return
    case 'habit':
      await habitDexieRepository.delete(item.subject.id)
      return
    case 'tracker':
      await trackerDexieRepository.delete(item.subject.id)
      return
  }
}
