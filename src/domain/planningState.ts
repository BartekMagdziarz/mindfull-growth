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
export type CadencedPlanningMode = 'times-per-period' | 'specific-days'
export type PlanningSubjectType = 'keyResult' | 'habit'
export type ReflectionPeriodType = 'month' | 'week'
export type ReflectionSubjectType = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'initiative'
export type TrackerEntryPeriodType = 'day' | 'week' | 'month'
export type TrackerEntryValue = number | string | boolean | null

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

export interface CadencedMonthState extends PlanningStateRecordBase {
  monthRef: MonthRef
  subjectType: PlanningSubjectType
  subjectId: string
  activityState: PeriodActivityState
  planningMode?: CadencedPlanningMode
  targetCount?: number
}

export interface CadencedWeekState extends PlanningStateRecordBase {
  weekRef: WeekRef
  subjectType: PlanningSubjectType
  subjectId: string
  activityState: PeriodActivityState
  sourceMonthRef?: MonthRef
  planningMode?: CadencedPlanningMode
  targetCount?: number
}

export interface CadencedDayAssignment extends PlanningStateRecordBase {
  dayRef: DayRef
  subjectType: PlanningSubjectType
  subjectId: string
}

export interface InitiativePlanState extends PlanningStateRecordBase {
  initiativeId: string
  monthRef?: MonthRef
  weekRef?: WeekRef
  dayRef?: DayRef
}

export interface TrackerMonthState extends PlanningStateRecordBase {
  monthRef: MonthRef
  trackerId: string
  activityState: PeriodActivityState
}

export interface TrackerWeekState extends PlanningStateRecordBase {
  weekRef: WeekRef
  trackerId: string
  activityState: PeriodActivityState
}

export interface TrackerEntry extends PlanningStateRecordBase {
  trackerId: string
  periodType: TrackerEntryPeriodType
  periodRef: DayRef | WeekRef | MonthRef
  value: TrackerEntryValue
  note?: string
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

export type CreateCadencedMonthStatePayload = Omit<
  CadencedMonthState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateCadencedMonthStatePayload = Partial<
  Omit<CadencedMonthState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateCadencedWeekStatePayload = Omit<
  CadencedWeekState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateCadencedWeekStatePayload = Partial<
  Omit<CadencedWeekState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateCadencedDayAssignmentPayload = Omit<
  CadencedDayAssignment,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateCadencedDayAssignmentPayload = Partial<
  Omit<CadencedDayAssignment, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateInitiativePlanStatePayload = Omit<
  InitiativePlanState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateInitiativePlanStatePayload = Partial<
  Omit<InitiativePlanState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateTrackerMonthStatePayload = Omit<
  TrackerMonthState,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateTrackerMonthStatePayload = Partial<
  Omit<TrackerMonthState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateTrackerWeekStatePayload = Omit<TrackerWeekState, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateTrackerWeekStatePayload = Partial<
  Omit<TrackerWeekState, 'id' | 'createdAt' | 'updatedAt'>
>

export type CreateTrackerEntryPayload = Omit<TrackerEntry, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateTrackerEntryPayload = Partial<
  Omit<TrackerEntry, 'id' | 'createdAt' | 'updatedAt'>
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
const CADENCED_PLANNING_MODES = ['times-per-period', 'specific-days'] as const
const PLANNING_SUBJECT_TYPES = ['keyResult', 'habit'] as const
const REFLECTION_PERIOD_TYPES = ['month', 'week'] as const
const REFLECTION_SUBJECT_TYPES = ['goal', 'keyResult', 'habit', 'tracker', 'initiative'] as const
const TRACKER_ENTRY_PERIOD_TYPES = ['day', 'week', 'month'] as const

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
  fallback?: string
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
  fallback?: string
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
  fallback?: T
): T {
  const source = value ?? fallback
  if (typeof source !== 'string' || !allowedValues.includes(source as T)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
  }

  return source as T
}

function normalizeNonNegativeInteger(
  value: unknown,
  fieldName: string,
  fallback?: number
): number | undefined {
  const source = value ?? fallback
  if (source === undefined) {
    return undefined
  }

  if (typeof source !== 'number' || !Number.isInteger(source) || source < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`)
  }

  return source
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

function normalizeTrackerEntryPeriodRef(
  periodType: TrackerEntryPeriodType,
  value: unknown,
  fieldName: string,
  fallback?: DayRef | WeekRef | MonthRef
): DayRef | WeekRef | MonthRef {
  const source = normalizeTrimmedText(value, fieldName, fallback)
  assertPeriodRef(source)

  if (getPeriodType(source) !== periodType) {
    throw new Error(`${fieldName} must match TrackerEntry.periodType`)
  }

  return source as DayRef | WeekRef | MonthRef
}

function normalizeReflectionPeriodRef(
  periodType: ReflectionPeriodType,
  value: unknown,
  fieldName: string,
  fallback?: MonthRef | WeekRef
): MonthRef | WeekRef {
  const source = normalizeTrimmedText(value, fieldName, fallback)
  assertPeriodRef(source)

  if (getPeriodType(source) !== periodType) {
    throw new Error(`${fieldName} must match PeriodReflection.periodType`)
  }

  return source as MonthRef | WeekRef
}

function normalizePlanningConfig(
  planningModeValue: unknown,
  targetCountValue: unknown,
  existing?: { planningMode?: CadencedPlanningMode; targetCount?: number }
): { planningMode?: CadencedPlanningMode; targetCount?: number } {
  const planningMode =
    planningModeValue === undefined && existing?.planningMode === undefined
      ? undefined
      : normalizeEnum(
          planningModeValue,
          'planningMode',
          CADENCED_PLANNING_MODES,
          existing?.planningMode
        )
  const targetCount = normalizeNonNegativeInteger(
    targetCountValue,
    'targetCount',
    existing?.targetCount
  )

  if (planningMode === undefined && targetCount !== undefined) {
    throw new Error('targetCount requires planningMode')
  }

  if (planningMode === 'times-per-period' && targetCount === undefined) {
    throw new Error('times-per-period requires targetCount')
  }

  if (planningMode === 'specific-days' && targetCount !== undefined) {
    throw new Error('specific-days does not support targetCount')
  }

  return { planningMode, targetCount }
}

function normalizeTrackerEntryValue(
  value: unknown,
  fallback?: TrackerEntryValue
): TrackerEntryValue {
  const source = value ?? fallback
  if (source === null) {
    return null
  }

  if (typeof source === 'number') {
    if (Number.isNaN(source)) {
      throw new Error('TrackerEntry.value must not be NaN')
    }

    return source
  }

  if (typeof source === 'string') {
    return source.trim()
  }

  if (typeof source === 'boolean') {
    return source
  }

  throw new Error('TrackerEntry.value must be a number, string, boolean, or null')
}

function normalizeTrackerId(value: unknown, fieldName: string, fallback?: string): string {
  return normalizeTrimmedText(value, fieldName, fallback)
}

function normalizePlanningSubjectId(value: unknown, fieldName: string, fallback?: string): string {
  return normalizeTrimmedText(value, fieldName, fallback)
}

function normalizeReflectionSubjectId(
  value: unknown,
  fieldName: string,
  fallback?: string
): string {
  return normalizeTrimmedText(value, fieldName, fallback)
}

export function normalizeMonthPlanPayload(
  data: CreateMonthPlanPayload | UpdateMonthPlanPayload,
  existing?: MonthPlan
): Omit<MonthPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
  }
}

export function normalizeWeekPlanPayload(
  data: CreateWeekPlanPayload | UpdateWeekPlanPayload,
  existing?: WeekPlan
): Omit<WeekPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    weekRef: normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef),
  }
}

export function normalizeGoalMonthStatePayload(
  data: CreateGoalMonthStatePayload | UpdateGoalMonthStatePayload,
  existing?: GoalMonthState
): Omit<GoalMonthState, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    goalId: normalizeTrimmedText(data.goalId, 'goalId', existing?.goalId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
  }
}

export function normalizeCadencedMonthStatePayload(
  data: CreateCadencedMonthStatePayload | UpdateCadencedMonthStatePayload,
  existing?: CadencedMonthState
): Omit<CadencedMonthState, 'id' | 'createdAt' | 'updatedAt'> {
  const planningConfig = normalizePlanningConfig(data.planningMode, data.targetCount, existing)

  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      PLANNING_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizePlanningSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
    ...planningConfig,
  }
}

export function normalizeCadencedWeekStatePayload(
  data: CreateCadencedWeekStatePayload | UpdateCadencedWeekStatePayload,
  existing?: CadencedWeekState
): Omit<CadencedWeekState, 'id' | 'createdAt' | 'updatedAt'> {
  const planningConfig = normalizePlanningConfig(data.planningMode, data.targetCount, existing)
  const weekRef = normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef)
  const sourceMonthRef = normalizeOptionalId(
    data.sourceMonthRef,
    'sourceMonthRef',
    existing?.sourceMonthRef
  )

  if (sourceMonthRef) {
    assertPeriodRef(sourceMonthRef)
    if (getPeriodType(sourceMonthRef) !== 'month') {
      throw new Error('sourceMonthRef must be a MonthRef')
    }

    const overlappingMonths = getWeekOverlappingMonths(weekRef)
    if (!overlappingMonths.includes(sourceMonthRef as MonthRef)) {
      throw new Error('sourceMonthRef must overlap CadencedWeekState.weekRef')
    }
  }

  return {
    weekRef,
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      PLANNING_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizePlanningSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
    sourceMonthRef: sourceMonthRef as MonthRef | undefined,
    ...planningConfig,
  }
}

export function normalizeCadencedDayAssignmentPayload(
  data: CreateCadencedDayAssignmentPayload | UpdateCadencedDayAssignmentPayload,
  existing?: CadencedDayAssignment
): Omit<CadencedDayAssignment, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    dayRef: normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      PLANNING_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizePlanningSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
  }
}

export function normalizeInitiativePlanStatePayload(
  data: CreateInitiativePlanStatePayload | UpdateInitiativePlanStatePayload,
  existing?: InitiativePlanState
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

export function normalizeTrackerMonthStatePayload(
  data: CreateTrackerMonthStatePayload | UpdateTrackerMonthStatePayload,
  existing?: TrackerMonthState
): Omit<TrackerMonthState, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    trackerId: normalizeTrackerId(data.trackerId, 'trackerId', existing?.trackerId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
  }
}

export function normalizeTrackerWeekStatePayload(
  data: CreateTrackerWeekStatePayload | UpdateTrackerWeekStatePayload,
  existing?: TrackerWeekState
): Omit<TrackerWeekState, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    weekRef: normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef),
    trackerId: normalizeTrackerId(data.trackerId, 'trackerId', existing?.trackerId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
  }
}

export function normalizeTrackerEntryPayload(
  data: CreateTrackerEntryPayload | UpdateTrackerEntryPayload,
  existing?: TrackerEntry
): Omit<TrackerEntry, 'id' | 'createdAt' | 'updatedAt'> {
  const periodType = normalizeEnum(
    data.periodType,
    'periodType',
    TRACKER_ENTRY_PERIOD_TYPES,
    existing?.periodType
  )

  return {
    trackerId: normalizeTrackerId(data.trackerId, 'trackerId', existing?.trackerId),
    periodType,
    periodRef: normalizeTrackerEntryPeriodRef(
      periodType,
      data.periodRef,
      'periodRef',
      existing?.periodRef
    ),
    value: normalizeTrackerEntryValue(data.value, existing?.value),
    note: normalizeOptionalText(data.note, 'note', existing?.note),
  }
}

export function normalizePeriodReflectionPayload(
  data: CreatePeriodReflectionPayload | UpdatePeriodReflectionPayload,
  existing?: PeriodReflection
): Omit<PeriodReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const periodType = normalizeEnum(
    data.periodType,
    'periodType',
    REFLECTION_PERIOD_TYPES,
    existing?.periodType
  )

  return {
    periodType,
    periodRef: normalizeReflectionPeriodRef(
      periodType,
      data.periodRef,
      'periodRef',
      existing?.periodRef
    ),
    note: normalizeTrimmedText(data.note, 'note', existing?.note),
  }
}

export function normalizePeriodObjectReflectionPayload(
  data: CreatePeriodObjectReflectionPayload | UpdatePeriodObjectReflectionPayload,
  existing?: PeriodObjectReflection
): Omit<PeriodObjectReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const periodType = normalizeEnum(
    data.periodType,
    'periodType',
    REFLECTION_PERIOD_TYPES,
    existing?.periodType
  )

  return {
    periodType,
    periodRef: normalizeReflectionPeriodRef(
      periodType,
      data.periodRef,
      'periodRef',
      existing?.periodRef
    ),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      REFLECTION_SUBJECT_TYPES,
      existing?.subjectType
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
