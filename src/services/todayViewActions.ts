import type { DayRef } from '@/domain/period'
import type { MeasurementSubjectType } from '@/domain/planningState'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import type {
  TodayInitiativeItem,
  TodayItem,
  TodayMeasurementItem,
} from '@/services/todayViewQueries'
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

  await planningStateDexieRepository.upsertMeasurementDayAssignment({
    dayRef: toDayRef,
    subjectType: item.subjectType,
    subjectId: item.subject.id,
  })
  await planningStateDexieRepository.deleteMeasurementDayAssignment(
    fromDayRef,
    item.subjectType,
    item.subject.id
  )
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
