import type { DayRef, MonthRef, PeriodRef, WeekRef } from '@/domain/period'
import {
  assertPeriodRef,
  getPeriodRefsForDate,
  getPeriodType,
  getWeekOverlappingMonths,
} from '@/utils/periods'

export interface PlanningStateRecordBase {
  id: string
  createdAt: string
  updatedAt: string
}

export type PeriodActivityState = 'active' | 'paused'
export type MeasurementSubjectType = 'keyResult' | 'habit' | 'tracker'
export type ReflectionPeriodType = 'month' | 'week'
export type ReflectionSubjectType = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'initiative'
export type MonthScheduleScope = 'unassigned' | 'specific-days' | 'whole-month'
export type WeekScheduleScope = 'unassigned' | 'specific-days' | 'whole-week'
export type DailyMeasurementEntryValue = number | null

export interface MonthPlan extends PlanningStateRecordBase {
  monthRef: MonthRef
}

export interface WeekPlan extends PlanningStateRecordBase {
  weekRef: WeekRef
}

export interface GoalMonthState extends PlanningStateRecordBase {
  monthRef: MonthRef
  goalId: string
  activityState: PeriodActivityState
}

export interface MeasurementMonthState extends PlanningStateRecordBase {
  monthRef: MonthRef
  subjectType: MeasurementSubjectType
  subjectId: string
  activityState: PeriodActivityState
  scheduleScope: MonthScheduleScope
  successNote?: string
}

export interface MeasurementWeekState extends PlanningStateRecordBase {
  weekRef: WeekRef
  subjectType: MeasurementSubjectType
  subjectId: string
  activityState: PeriodActivityState
  sourceMonthRef?: MonthRef
  scheduleScope: WeekScheduleScope
  successNote?: string
}

export interface MeasurementDayAssignment extends PlanningStateRecordBase {
  dayRef: DayRef
  subjectType: MeasurementSubjectType
  subjectId: string
}

export interface DailyMeasurementEntry extends PlanningStateRecordBase {
  subjectType: MeasurementSubjectType
  subjectId: string
  dayRef: DayRef
  value: DailyMeasurementEntryValue
}

export interface InitiativePlanState extends PlanningStateRecordBase {
  initiativeId: string
  monthRef?: MonthRef
  weekRef?: WeekRef
  dayRef?: DayRef
}

export interface PeriodReflection extends PlanningStateRecordBase {
  periodType: ReflectionPeriodType
  periodRef: MonthRef | WeekRef
  note: string
}

export interface PeriodObjectReflection extends PlanningStateRecordBase {
  periodType: ReflectionPeriodType
  periodRef: MonthRef | WeekRef
  subjectType: ReflectionSubjectType
  subjectId: string
  note: string
}

export type CreateMonthPlanPayload = Omit<MonthPlan, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateMonthPlanPayload = Partial<Omit<MonthPlan, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateWeekPlanPayload = Omit<WeekPlan, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateWeekPlanPayload = Partial<Omit<WeekPlan, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateGoalMonthStatePayload = Omit<GoalMonthState, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateGoalMonthStatePayload = Partial<
  Omit<GoalMonthState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateMeasurementMonthStatePayload = Omit<
  MeasurementMonthState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateMeasurementMonthStatePayload = Partial<
  Omit<MeasurementMonthState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateMeasurementWeekStatePayload = Omit<
  MeasurementWeekState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateMeasurementWeekStatePayload = Partial<
  Omit<MeasurementWeekState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateMeasurementDayAssignmentPayload = Omit<
  MeasurementDayAssignment,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateMeasurementDayAssignmentPayload = Partial<
  Omit<MeasurementDayAssignment, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateDailyMeasurementEntryPayload = Omit<
  DailyMeasurementEntry,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateDailyMeasurementEntryPayload = Partial<
  Omit<DailyMeasurementEntry, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateInitiativePlanStatePayload = Omit<
  InitiativePlanState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateInitiativePlanStatePayload = Partial<
  Omit<InitiativePlanState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreatePeriodReflectionPayload = Omit<PeriodReflection, 'id' | 'createdAt' | 'updatedAt'>
export type UpdatePeriodReflectionPayload = Partial<
  Omit<PeriodReflection, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreatePeriodObjectReflectionPayload = Omit<
  PeriodObjectReflection,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdatePeriodObjectReflectionPayload = Partial<
  Omit<PeriodObjectReflection, 'id' | 'createdAt' | 'updatedAt'>
>

const PERIOD_ACTIVITY_STATES = ['active', 'paused'] as const
const MEASUREMENT_SUBJECT_TYPES = ['keyResult', 'habit', 'tracker'] as const
const REFLECTION_PERIOD_TYPES = ['month', 'week'] as const
const REFLECTION_SUBJECT_TYPES = ['goal', 'keyResult', 'habit', 'tracker', 'initiative'] as const
const MONTH_SCHEDULE_SCOPES = ['unassigned', 'specific-days', 'whole-month'] as const
const WEEK_SCHEDULE_SCOPES = ['unassigned', 'specific-days', 'whole-week'] as const

function normalizeTrimmedText(value: unknown, fieldName: string, fallback?: string): string {
  const source = value ?? fallback
  if (typeof source !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  const trimmed = source.trim()
  if (!trimmed) {
    throw new Error(`${fieldName} is required`)
  }

  return trimmed
}

function normalizeOptionalText(
  value: unknown,
  fieldName: string,
  fallback?: string,
): string | undefined {
  const source = value ?? fallback
  if (source === undefined) {
    return undefined
  }

  if (typeof source !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  const trimmed = source.trim()
  return trimmed ? trimmed : undefined
}

function normalizeOptionalId(
  value: unknown,
  fieldName: string,
  fallback?: string,
): string | undefined {
  const source = value ?? fallback
  if (source === undefined) {
    return undefined
  }

  if (typeof source !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  const trimmed = source.trim()
  return trimmed ? trimmed : undefined
}

function normalizeEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  fallback?: T,
): T {
  const source = value ?? fallback
  if (typeof source !== 'string' || !allowedValues.includes(source as T)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
  }

  return source as T
}

function normalizeMonthRef(value: unknown, fieldName: string, fallback?: MonthRef): MonthRef {
  const source = normalizeTrimmedText(value, fieldName, fallback)
  assertPeriodRef(source)
  if (getPeriodType(source) !== 'month') {
    throw new Error(`${fieldName} must be a MonthRef`)
  }

  return source as MonthRef
}

function normalizeWeekRef(value: unknown, fieldName: string, fallback?: WeekRef): WeekRef {
  const source = normalizeTrimmedText(value, fieldName, fallback)
  assertPeriodRef(source)
  if (getPeriodType(source) !== 'week') {
    throw new Error(`${fieldName} must be a WeekRef`)
  }

  return source as WeekRef
}

function normalizeDayRef(value: unknown, fieldName: string, fallback?: DayRef): DayRef {
  const source = normalizeTrimmedText(value, fieldName, fallback)
  assertPeriodRef(source)
  if (getPeriodType(source) !== 'day') {
    throw new Error(`${fieldName} must be a DayRef`)
  }

  return source as DayRef
}

function normalizeReflectionPeriodRef(
  periodType: ReflectionPeriodType,
  value: unknown,
  fieldName: string,
  fallback?: MonthRef | WeekRef,
): MonthRef | WeekRef {
  const source = normalizeTrimmedText(value, fieldName, fallback)
  assertPeriodRef(source)

  if (getPeriodType(source) !== periodType) {
    throw new Error(`${fieldName} must match PeriodReflection.periodType`)
  }

  return source as MonthRef | WeekRef
}

function normalizeDailyMeasurementValue(
  value: unknown,
  fallback?: DailyMeasurementEntryValue,
): DailyMeasurementEntryValue {
  const source = value === undefined ? fallback : value
  if (source === null) {
    return null
  }

  if (typeof source !== 'number' || !Number.isFinite(source)) {
    throw new Error('DailyMeasurementEntry.value must be a finite number or null')
  }

  return source
}

function normalizeSubjectId(value: unknown, fieldName: string, fallback?: string): string {
  return normalizeTrimmedText(value, fieldName, fallback)
}

function normalizeReflectionSubjectId(
  value: unknown,
  fieldName: string,
  fallback?: string,
): string {
  return normalizeTrimmedText(value, fieldName, fallback)
}

export function normalizeMonthPlanPayload(
  data: CreateMonthPlanPayload | UpdateMonthPlanPayload,
  existing?: MonthPlan,
): Omit<MonthPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
  }
}

export function normalizeWeekPlanPayload(
  data: CreateWeekPlanPayload | UpdateWeekPlanPayload,
  existing?: WeekPlan,
): Omit<WeekPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    weekRef: normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef),
  }
}

export function normalizeGoalMonthStatePayload(
  data: CreateGoalMonthStatePayload | UpdateGoalMonthStatePayload,
  existing?: GoalMonthState,
): Omit<GoalMonthState, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    goalId: normalizeTrimmedText(data.goalId, 'goalId', existing?.goalId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState,
    ),
  }
}

export function normalizeMeasurementMonthStatePayload(
  data: CreateMeasurementMonthStatePayload | UpdateMeasurementMonthStatePayload,
  existing?: MeasurementMonthState,
): Omit<MeasurementMonthState, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType,
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState,
    ),
    scheduleScope: normalizeEnum(
      data.scheduleScope,
      'scheduleScope',
      MONTH_SCHEDULE_SCOPES,
      existing?.scheduleScope ?? 'unassigned',
    ),
    successNote: normalizeOptionalText(data.successNote, 'successNote', existing?.successNote),
  }
}

export function normalizeMeasurementWeekStatePayload(
  data: CreateMeasurementWeekStatePayload | UpdateMeasurementWeekStatePayload,
  existing?: MeasurementWeekState,
): Omit<MeasurementWeekState, 'id' | 'createdAt' | 'updatedAt'> {
  const weekRef = normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef)
  const sourceMonthRef = normalizeOptionalId(
    data.sourceMonthRef,
    'sourceMonthRef',
    existing?.sourceMonthRef,
  )

  if (sourceMonthRef) {
    assertPeriodRef(sourceMonthRef)
    if (getPeriodType(sourceMonthRef) !== 'month') {
      throw new Error('sourceMonthRef must be a MonthRef')
    }

    const overlappingMonths = getWeekOverlappingMonths(weekRef)
    if (!overlappingMonths.includes(sourceMonthRef as MonthRef)) {
      throw new Error('sourceMonthRef must overlap MeasurementWeekState.weekRef')
    }
  }

  return {
    weekRef,
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType,
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState,
    ),
    sourceMonthRef: sourceMonthRef as MonthRef | undefined,
    scheduleScope: normalizeEnum(
      data.scheduleScope,
      'scheduleScope',
      WEEK_SCHEDULE_SCOPES,
      existing?.scheduleScope ?? 'unassigned',
    ),
    successNote: normalizeOptionalText(data.successNote, 'successNote', existing?.successNote),
  }
}

export function normalizeMeasurementDayAssignmentPayload(
  data: CreateMeasurementDayAssignmentPayload | UpdateMeasurementDayAssignmentPayload,
  existing?: MeasurementDayAssignment,
): Omit<MeasurementDayAssignment, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    dayRef: normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType,
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
  }
}

export function normalizeDailyMeasurementEntryPayload(
  data: CreateDailyMeasurementEntryPayload | UpdateDailyMeasurementEntryPayload,
  existing?: DailyMeasurementEntry,
): Omit<DailyMeasurementEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType,
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    dayRef: normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef),
    value: normalizeDailyMeasurementValue(data.value, existing?.value),
  }
}

export function normalizeInitiativePlanStatePayload(
  data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload,
  existing?: InitiativePlanState,
): Omit<InitiativePlanState, 'id' | 'createdAt' | 'updatedAt'> {
  const hasMonthRef = Object.prototype.hasOwnProperty.call(data, 'monthRef')
  const hasWeekRef = Object.prototype.hasOwnProperty.call(data, 'weekRef')
  const hasDayRef = Object.prototype.hasOwnProperty.call(data, 'dayRef')

  const monthRef =
    hasMonthRef || existing?.monthRef
      ? hasMonthRef && data.monthRef === undefined
        ? undefined
        : normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef)
      : undefined
  const weekRef =
    hasWeekRef || existing?.weekRef
      ? hasWeekRef && data.weekRef === undefined
        ? undefined
        : normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef)
      : undefined
  const dayRef =
    hasDayRef || existing?.dayRef
      ? hasDayRef && data.dayRef === undefined
        ? undefined
        : normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef)
      : undefined

  if (dayRef && weekRef && getPeriodRefsForDate(dayRef).week !== weekRef) {
    throw new Error('dayRef must belong to weekRef')
  }

  if (dayRef && monthRef && getPeriodRefsForDate(dayRef).month !== monthRef) {
    throw new Error('dayRef must belong to monthRef')
  }

  if (weekRef && monthRef && !getWeekOverlappingMonths(weekRef).includes(monthRef)) {
    throw new Error('weekRef must overlap monthRef')
  }

  return {
    initiativeId: normalizeTrimmedText(data.initiativeId, 'initiativeId', existing?.initiativeId),
    monthRef,
    weekRef,
    dayRef,
  }
}

export function normalizePeriodReflectionPayload(
  data: CreatePeriodReflectionPayload | UpdatePeriodReflectionPayload,
  existing?: PeriodReflection,
): Omit<PeriodReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const periodType = normalizeEnum(
    data.periodType,
    'periodType',
    REFLECTION_PERIOD_TYPES,
    existing?.periodType,
  )

  return {
    periodType,
    periodRef: normalizeReflectionPeriodRef(
      periodType,
      data.periodRef,
      'periodRef',
      existing?.periodRef,
    ),
    note: normalizeTrimmedText(data.note, 'note', existing?.note),
  }
}

export function normalizePeriodObjectReflectionPayload(
  data: CreatePeriodObjectReflectionPayload | UpdatePeriodObjectReflectionPayload,
  existing?: PeriodObjectReflection,
): Omit<PeriodObjectReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const periodType = normalizeEnum(
    data.periodType,
    'periodType',
    REFLECTION_PERIOD_TYPES,
    existing?.periodType,
  )

  return {
    periodType,
    periodRef: normalizeReflectionPeriodRef(
      periodType,
      data.periodRef,
      'periodRef',
      existing?.periodRef,
    ),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      REFLECTION_SUBJECT_TYPES,
      existing?.subjectType,
    ),
    subjectId: normalizeReflectionSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    note: normalizeTrimmedText(data.note, 'note', existing?.note),
  }
}

export function isMonthPlanPeriodRef(periodRef: PeriodRef): periodRef is MonthRef {
  return getPeriodType(periodRef) === 'month'
}

export function isWeekPlanPeriodRef(periodRef: PeriodRef): periodRef is WeekRef {
  return getPeriodType(periodRef) === 'week'
}
