import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  CreateDailyMeasurementEntryPayload,
  CreateGoalMonthStatePayload,
  CreateInitiativePlanStatePayload,
  CreateMeasurementDayAssignmentPayload,
  CreateMeasurementMonthStatePayload,
  CreateTodayHiddenStatePayload,
  CreateMeasurementWeekStatePayload,
  DailyMeasurementEntry,
  GoalMonthState,
  InitiativePlanState,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
  TodayHiddenState,
  UpdateDailyMeasurementEntryPayload,
  UpdateGoalMonthStatePayload,
  UpdateInitiativePlanStatePayload,
  UpdateMeasurementDayAssignmentPayload,
  UpdateMeasurementMonthStatePayload,
  UpdateTodayHiddenStatePayload,
  UpdateMeasurementWeekStatePayload,
  TodayHiddenSubjectType,
} from '@/domain/planningState'

export interface PlanningStateRepository {
  getGoalMonthState(monthRef: MonthRef, goalId: string): Promise<GoalMonthState | undefined>
  listGoalMonthStates(): Promise<GoalMonthState[]>
  listGoalMonthStatesForMonths(monthRefs: MonthRef[]): Promise<GoalMonthState[]>
  upsertGoalMonthState(
    data: CreateGoalMonthStatePayload | UpdateGoalMonthStatePayload
  ): Promise<GoalMonthState>
  deleteGoalMonthState(monthRef: MonthRef, goalId: string): Promise<void>

  getMeasurementMonthState(
    monthRef: MonthRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementMonthState | undefined>
  listMeasurementMonthStates(): Promise<MeasurementMonthState[]>
  listMeasurementMonthStatesForMonths(monthRefs: MonthRef[]): Promise<MeasurementMonthState[]>
  listMeasurementMonthStatesForSubject(
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementMonthState[]>
  upsertMeasurementMonthState(
    data: CreateMeasurementMonthStatePayload | UpdateMeasurementMonthStatePayload
  ): Promise<MeasurementMonthState>
  deleteMeasurementMonthState(
    monthRef: MonthRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<void>

  getMeasurementWeekState(
    weekRef: WeekRef,
    subjectType: MeasurementSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<MeasurementWeekState | undefined>
  listMeasurementWeekStates(): Promise<MeasurementWeekState[]>
  listMeasurementWeekStatesForWeeks(weekRefs: WeekRef[]): Promise<MeasurementWeekState[]>
  listMeasurementWeekStatesForSubject(
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementWeekState[]>
  upsertMeasurementWeekState(
    data: CreateMeasurementWeekStatePayload | UpdateMeasurementWeekStatePayload
  ): Promise<MeasurementWeekState>
  deleteMeasurementWeekState(
    weekRef: WeekRef,
    subjectType: MeasurementSubjectType,
    subjectId: string,
    sourceMonthRef?: MonthRef
  ): Promise<void>

  getMeasurementDayAssignment(
    dayRef: DayRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<MeasurementDayAssignment | undefined>
  listMeasurementDayAssignments(): Promise<MeasurementDayAssignment[]>
  listMeasurementDayAssignmentsForDayRange(
    startDayRef: DayRef,
    endDayRef: DayRef
  ): Promise<MeasurementDayAssignment[]>
  upsertMeasurementDayAssignment(
    data: CreateMeasurementDayAssignmentPayload | UpdateMeasurementDayAssignmentPayload
  ): Promise<MeasurementDayAssignment>
  deleteMeasurementDayAssignment(
    dayRef: DayRef,
    subjectType: MeasurementSubjectType,
    subjectId: string
  ): Promise<void>

  getDailyMeasurementEntry(
    subjectType: MeasurementSubjectType,
    subjectId: string,
    dayRef: DayRef
  ): Promise<DailyMeasurementEntry | undefined>
  listDailyMeasurementEntries(): Promise<DailyMeasurementEntry[]>
  listDailyMeasurementEntriesForDayRange(
    startDayRef: DayRef,
    endDayRef: DayRef
  ): Promise<DailyMeasurementEntry[]>
  upsertDailyMeasurementEntry(
    data: CreateDailyMeasurementEntryPayload | UpdateDailyMeasurementEntryPayload
  ): Promise<DailyMeasurementEntry>
  deleteDailyMeasurementEntry(
    subjectType: MeasurementSubjectType,
    subjectId: string,
    dayRef: DayRef
  ): Promise<void>

  getTodayHiddenState(
    dayRef: DayRef,
    subjectType: TodayHiddenSubjectType,
    subjectId: string
  ): Promise<TodayHiddenState | undefined>
  listTodayHiddenStates(): Promise<TodayHiddenState[]>
  listTodayHiddenStatesForDay(dayRef: DayRef): Promise<TodayHiddenState[]>
  upsertTodayHiddenState(
    data: CreateTodayHiddenStatePayload | UpdateTodayHiddenStatePayload
  ): Promise<TodayHiddenState>
  deleteTodayHiddenState(
    dayRef: DayRef,
    subjectType: TodayHiddenSubjectType,
    subjectId: string
  ): Promise<void>

  getInitiativePlanState(initiativeId: string): Promise<InitiativePlanState | undefined>
  listInitiativePlanStates(): Promise<InitiativePlanState[]>
  upsertInitiativePlanState(
    data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload
  ): Promise<InitiativePlanState>
  deleteInitiativePlanState(initiativeId: string): Promise<void>
}
