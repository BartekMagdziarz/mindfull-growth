import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  CadencedDayAssignment,
  CadencedMonthState,
  CadencedWeekState,
  CreateCadencedDayAssignmentPayload,
  CreateCadencedMonthStatePayload,
  CreateCadencedWeekStatePayload,
  CreateGoalMonthStatePayload,
  CreateInitiativePlanStatePayload,
  CreateTrackerEntryPayload,
  CreateTrackerMonthStatePayload,
  CreateTrackerWeekStatePayload,
  GoalMonthState,
  InitiativePlanState,
  PlanningSubjectType,
  TrackerEntry,
  TrackerMonthState,
  TrackerWeekState,
  UpdateCadencedDayAssignmentPayload,
  UpdateCadencedMonthStatePayload,
  UpdateCadencedWeekStatePayload,
  UpdateGoalMonthStatePayload,
  UpdateInitiativePlanStatePayload,
  UpdateTrackerEntryPayload,
  UpdateTrackerMonthStatePayload,
  UpdateTrackerWeekStatePayload,
} from '@/domain/planningState'

export interface PlanningStateRepository {
  getGoalMonthState(monthRef: MonthRef, goalId: string): Promise<GoalMonthState | undefined>
  listGoalMonthStates(): Promise<GoalMonthState[]>
  upsertGoalMonthState(
    data: CreateGoalMonthStatePayload | UpdateGoalMonthStatePayload
  ): Promise<GoalMonthState>
  deleteGoalMonthState(monthRef: MonthRef, goalId: string): Promise<void>

  getCadencedMonthState(
    monthRef: MonthRef,
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<CadencedMonthState | undefined>
  listCadencedMonthStates(): Promise<CadencedMonthState[]>
  upsertCadencedMonthState(
    data: CreateCadencedMonthStatePayload | UpdateCadencedMonthStatePayload
  ): Promise<CadencedMonthState>
  deleteCadencedMonthState(
    monthRef: MonthRef,
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<void>

  getCadencedWeekState(
    weekRef: WeekRef,
    subjectType: PlanningSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<CadencedWeekState | undefined>
  listCadencedWeekStates(): Promise<CadencedWeekState[]>
  upsertCadencedWeekState(
    data: CreateCadencedWeekStatePayload | UpdateCadencedWeekStatePayload
  ): Promise<CadencedWeekState>
  deleteCadencedWeekState(
    weekRef: WeekRef,
    subjectType: PlanningSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<void>

  getCadencedDayAssignment(
    dayRef: DayRef,
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<CadencedDayAssignment | undefined>
  listCadencedDayAssignments(): Promise<CadencedDayAssignment[]>
  upsertCadencedDayAssignment(
    data: CreateCadencedDayAssignmentPayload | UpdateCadencedDayAssignmentPayload
  ): Promise<CadencedDayAssignment>
  deleteCadencedDayAssignment(
    dayRef: DayRef,
    subjectType: PlanningSubjectType,
    subjectId: string
  ): Promise<void>

  getInitiativePlanState(initiativeId: string): Promise<InitiativePlanState | undefined>
  listInitiativePlanStates(): Promise<InitiativePlanState[]>
  upsertInitiativePlanState(
    data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload
  ): Promise<InitiativePlanState>
  deleteInitiativePlanState(initiativeId: string): Promise<void>

  getTrackerMonthState(
    monthRef: MonthRef,
    trackerId: string
  ): Promise<TrackerMonthState | undefined>
  listTrackerMonthStates(): Promise<TrackerMonthState[]>
  upsertTrackerMonthState(
    data: CreateTrackerMonthStatePayload | UpdateTrackerMonthStatePayload
  ): Promise<TrackerMonthState>
  deleteTrackerMonthState(monthRef: MonthRef, trackerId: string): Promise<void>

  getTrackerWeekState(weekRef: WeekRef, trackerId: string): Promise<TrackerWeekState | undefined>
  listTrackerWeekStates(): Promise<TrackerWeekState[]>
  upsertTrackerWeekState(
    data: CreateTrackerWeekStatePayload | UpdateTrackerWeekStatePayload
  ): Promise<TrackerWeekState>
  deleteTrackerWeekState(weekRef: WeekRef, trackerId: string): Promise<void>

  getTrackerEntry(
    trackerId: string,
    periodRef: TrackerEntry['periodRef']
  ): Promise<TrackerEntry | undefined>
  listTrackerEntries(): Promise<TrackerEntry[]>
  upsertTrackerEntry(
    data: CreateTrackerEntryPayload | UpdateTrackerEntryPayload
  ): Promise<TrackerEntry>
  deleteTrackerEntry(trackerId: string, periodRef: TrackerEntry['periodRef']): Promise<void>
}
