import type { MeasurementEntryDaysCondition, MeasurementTarget } from '@/domain/planning'
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
export type MeasurementSubjectType = 'keyResult' | 'habit' | 'tracker' | 'weeklyIntention'
export type TodayHiddenSubjectType = MeasurementSubjectType | 'initiative'
export type ReflectionPeriodType = 'month' | 'week'
export type ReflectionSubjectType = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'initiative' | 'weeklyIntention' | 'priority'
export type PriorityVerdict = 'continue' | 'adjust' | 'pause' | 'drop'
export type MonthScheduleScope = 'unassigned' | 'specific-days' | 'whole-month'
export type WeekScheduleScope = 'unassigned' | 'specific-days' | 'whole-week'
export type DailyMeasurementEntryValue = number | null

export interface MonthPlan extends PlanningStateRecordBase {
  monthRef: MonthRef
  /** ≤3 active Priority ids picked as this month's focus (soft limit; drives monthly reflection). */
  topPriorityIds?: string[]
}

export interface WeekTopPriorityRef {
  subjectType: MeasurementSubjectType
  subjectId: string
}

export interface WeekPlan extends PlanningStateRecordBase {
  weekRef: WeekRef
  /** ≤3 measurement subjects the user picked as this week's priorities (drives reflection focus). */
  topPriorities?: WeekTopPriorityRef[]
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
  targetOverride?: MeasurementTarget
  successNote?: string
}

export interface MeasurementWeekState extends PlanningStateRecordBase {
  weekRef: WeekRef
  subjectType: MeasurementSubjectType
  subjectId: string
  activityState: PeriodActivityState
  sourceMonthRef?: MonthRef
  scheduleScope: WeekScheduleScope
  /** Per-week target override (weekly cadence) or per-week sub-target (monthly cadence). */
  targetOverride?: MeasurementTarget
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

export interface TodayHiddenState extends PlanningStateRecordBase {
  dayRef: DayRef
  subjectType: TodayHiddenSubjectType
  subjectId: string
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
  /** Subjective effort/engagement self-rating 1–5 (monthly priority assessment). */
  effort?: number | null
  /** Monthly per-priority verdict. */
  verdict?: PriorityVerdict | null
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

export type CreateTodayHiddenStatePayload = Omit<TodayHiddenState, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateTodayHiddenStatePayload = Partial<
  Omit<TodayHiddenState, 'id' | 'createdAt' | 'updatedAt'>
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
const MEASUREMENT_SUBJECT_TYPES = ['keyResult', 'habit', 'tracker', 'weeklyIntention'] as const
const TODAY_HIDDEN_SUBJECT_TYPES = ['keyResult', 'habit', 'tracker', 'weeklyIntention', 'initiative'] as const
const REFLECTION_PERIOD_TYPES = ['month', 'week'] as const
const REFLECTION_SUBJECT_TYPES = ['goal', 'keyResult', 'habit', 'tracker', 'initiative', 'weeklyIntention', 'priority'] as const
const PRIORITY_VERDICTS = ['continue', 'adjust', 'pause', 'drop'] as const
const MONTH_SCHEDULE_SCOPES = ['unassigned', 'specific-days', 'whole-month'] as const
const WEEK_SCHEDULE_SCOPES = ['unassigned', 'specific-days', 'whole-week'] as const
const COUNT_TARGET_OPERATORS = ['min', 'max'] as const
const COMPARISON_OPERATORS = ['gte', 'lte'] as const
const VALUE_TARGET_AGGREGATIONS = ['sum', 'average', 'last'] as const

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
  fallback?: MonthRef | WeekRef
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
  fallback?: DailyMeasurementEntryValue
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeFiniteNumber(value: unknown, fieldName: string, fallback?: number): number {
  const source = value ?? fallback
  if (typeof source !== 'number' || !Number.isFinite(source)) {
    throw new Error(`${fieldName} must be a finite number`)
  }

  return source
}

function normalizeNonNegativeInteger(value: unknown, fieldName: string, fallback?: number): number {
  const source = value ?? fallback
  if (typeof source !== 'number' || !Number.isInteger(source) || source < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`)
  }

  return source
}

function normalizeEntryDaysCondition(
  value: unknown
): MeasurementEntryDaysCondition | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!isPlainObject(value)) {
    throw new Error('targetOverride.entryDays must be an object')
  }

  const operator = normalizeEnum(
    value.operator,
    'targetOverride.entryDays.operator',
    COUNT_TARGET_OPERATORS,
    'min'
  )
  const days = value.value
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1) {
    throw new Error('targetOverride.entryDays.value must be an integer >= 1')
  }

  return { operator, value: days }
}

function normalizeMeasurementTarget(
  value: unknown,
  fallback?: MeasurementTarget
): MeasurementTarget {
  const source = value ?? fallback
  if (!isPlainObject(source)) {
    throw new Error('targetOverride must be an object')
  }

  const kind = normalizeEnum(
    source.kind,
    'targetOverride.kind',
    ['count', 'value', 'rating'] as const,
    fallback?.kind
  )

  // No fallback to the existing override's entryDays — editors send the full
  // target object, so omitting entryDays removes the condition (twin of the
  // base-target normalizer in planning.ts; change both together).
  const entryDays = normalizeEntryDaysCondition(source.entryDays)

  switch (kind) {
    case 'count':
      return {
        kind,
        operator: normalizeEnum(
          source.operator,
          'targetOverride.operator',
          COUNT_TARGET_OPERATORS,
          fallback?.kind === 'count' ? fallback.operator : 'min'
        ),
        value: normalizeNonNegativeInteger(
          source.value,
          'targetOverride.value',
          fallback?.kind === 'count' ? fallback.value : undefined
        ),
        ...(entryDays ? { entryDays } : {}),
      }
    case 'value':
      return {
        kind,
        aggregation: normalizeEnum(
          source.aggregation,
          'targetOverride.aggregation',
          VALUE_TARGET_AGGREGATIONS,
          fallback?.kind === 'value' ? fallback.aggregation : 'sum'
        ),
        operator: normalizeEnum(
          source.operator,
          'targetOverride.operator',
          COMPARISON_OPERATORS,
          fallback?.kind === 'value' ? fallback.operator : 'gte'
        ),
        value: normalizeFiniteNumber(
          source.value,
          'targetOverride.value',
          fallback?.kind === 'value' ? fallback.value : undefined
        ),
        ...(entryDays ? { entryDays } : {}),
      }
    case 'rating':
      return {
        kind,
        aggregation: normalizeEnum(
          source.aggregation,
          'targetOverride.aggregation',
          ['average'] as const,
          'average'
        ),
        operator: normalizeEnum(
          source.operator,
          'targetOverride.operator',
          COMPARISON_OPERATORS,
          fallback?.kind === 'rating' ? fallback.operator : 'gte'
        ),
        value: normalizeFiniteNumber(
          source.value,
          'targetOverride.value',
          fallback?.kind === 'rating' ? fallback.value : undefined
        ),
        ...(entryDays ? { entryDays } : {}),
      }
  }
}

function normalizeReflectionSubjectId(
  value: unknown,
  fieldName: string,
  fallback?: string
): string {
  return normalizeTrimmedText(value, fieldName, fallback)
}

function normalizeReflectionEffort(
  value: unknown,
  fallback?: number | null
): number | null | undefined {
  const source = value === undefined ? fallback : value
  if (source === undefined) {
    return undefined
  }
  if (source === null) {
    return null
  }
  if (typeof source !== 'number' || !Number.isInteger(source) || source < 1 || source > 5) {
    throw new Error('effort must be an integer between 1 and 5, or null')
  }
  return source
}

function normalizeReflectionVerdict(
  value: unknown,
  fallback?: PriorityVerdict | null
): PriorityVerdict | null | undefined {
  const source = value === undefined ? fallback : value
  if (source === undefined) {
    return undefined
  }
  if (source === null) {
    return null
  }
  return normalizeEnum(source, 'verdict', PRIORITY_VERDICTS)
}

export function normalizeMonthPlanPayload(
  data: CreateMonthPlanPayload | UpdateMonthPlanPayload,
  existing?: MonthPlan
): Omit<MonthPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    topPriorityIds: normalizeTopPriorityIds(data.topPriorityIds, existing?.topPriorityIds),
  }
}

function normalizeTopPriorities(
  value: unknown,
  existing?: WeekTopPriorityRef[]
): WeekTopPriorityRef[] | undefined {
  const source = value ?? existing
  if (source === undefined) {
    return undefined
  }
  if (!Array.isArray(source)) {
    throw new Error('topPriorities must be an array')
  }

  return source.map((ref) => {
    if (typeof ref !== 'object' || ref === null) {
      throw new Error('topPriorities entries must be objects')
    }
    const candidate = ref as { subjectType?: unknown; subjectId?: unknown }
    return {
      subjectType: normalizeEnum(
        candidate.subjectType,
        'topPriorities.subjectType',
        MEASUREMENT_SUBJECT_TYPES
      ),
      subjectId: normalizeTrimmedText(candidate.subjectId, 'topPriorities.subjectId'),
    }
  })
}

function normalizeTopPriorityIds(
  value: unknown,
  existing?: string[]
): string[] | undefined {
  const source = value ?? existing
  if (source === undefined) {
    return undefined
  }
  if (!Array.isArray(source)) {
    throw new Error('topPriorityIds must be an array')
  }
  return source.map((id) => normalizeTrimmedText(id, 'topPriorityIds entry'))
}

export function normalizeWeekPlanPayload(
  data: CreateWeekPlanPayload | UpdateWeekPlanPayload,
  existing?: WeekPlan
): Omit<WeekPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    weekRef: normalizeWeekRef(data.weekRef, 'weekRef', existing?.weekRef),
    topPriorities: normalizeTopPriorities(data.topPriorities, existing?.topPriorities),
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

export function normalizeMeasurementMonthStatePayload(
  data: CreateMeasurementMonthStatePayload | UpdateMeasurementMonthStatePayload,
  existing?: MeasurementMonthState
): Omit<MeasurementMonthState, 'id' | 'createdAt' | 'updatedAt'> {
  const hasTargetOverride = Object.prototype.hasOwnProperty.call(data, 'targetOverride')
  const targetOverride =
    hasTargetOverride || existing?.targetOverride
      ? hasTargetOverride && data.targetOverride === undefined
        ? undefined
        : normalizeMeasurementTarget(data.targetOverride, existing?.targetOverride)
      : undefined

  return {
    monthRef: normalizeMonthRef(data.monthRef, 'monthRef', existing?.monthRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
    scheduleScope: normalizeEnum(
      data.scheduleScope,
      'scheduleScope',
      MONTH_SCHEDULE_SCOPES,
      existing?.scheduleScope ?? 'unassigned'
    ),
    targetOverride,
    successNote: normalizeOptionalText(data.successNote, 'successNote', existing?.successNote),
  }
}

export function normalizeMeasurementWeekStatePayload(
  data: CreateMeasurementWeekStatePayload | UpdateMeasurementWeekStatePayload,
  existing?: MeasurementWeekState
): Omit<MeasurementWeekState, 'id' | 'createdAt' | 'updatedAt'> {
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
      throw new Error('sourceMonthRef must overlap MeasurementWeekState.weekRef')
    }
  }

  const hasTargetOverride = Object.prototype.hasOwnProperty.call(data, 'targetOverride')
  const targetOverride =
    hasTargetOverride || existing?.targetOverride
      ? hasTargetOverride && data.targetOverride === undefined
        ? undefined
        : normalizeMeasurementTarget(data.targetOverride, existing?.targetOverride)
      : undefined

  return {
    weekRef,
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    activityState: normalizeEnum(
      data.activityState,
      'activityState',
      PERIOD_ACTIVITY_STATES,
      existing?.activityState
    ),
    sourceMonthRef: sourceMonthRef as MonthRef | undefined,
    scheduleScope: normalizeEnum(
      data.scheduleScope,
      'scheduleScope',
      WEEK_SCHEDULE_SCOPES,
      existing?.scheduleScope ?? 'unassigned'
    ),
    targetOverride,
    successNote: normalizeOptionalText(data.successNote, 'successNote', existing?.successNote),
  }
}

export function normalizeMeasurementDayAssignmentPayload(
  data: CreateMeasurementDayAssignmentPayload | UpdateMeasurementDayAssignmentPayload,
  existing?: MeasurementDayAssignment
): Omit<MeasurementDayAssignment, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    dayRef: normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
  }
}

export function normalizeDailyMeasurementEntryPayload(
  data: CreateDailyMeasurementEntryPayload | UpdateDailyMeasurementEntryPayload,
  existing?: DailyMeasurementEntry
): Omit<DailyMeasurementEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      MEASUREMENT_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
    dayRef: normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef),
    value: normalizeDailyMeasurementValue(data.value, existing?.value),
  }
}

export function normalizeTodayHiddenStatePayload(
  data: CreateTodayHiddenStatePayload | UpdateTodayHiddenStatePayload,
  existing?: TodayHiddenState
): Omit<TodayHiddenState, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    dayRef: normalizeDayRef(data.dayRef, 'dayRef', existing?.dayRef),
    subjectType: normalizeEnum(
      data.subjectType,
      'subjectType',
      TODAY_HIDDEN_SUBJECT_TYPES,
      existing?.subjectType
    ),
    subjectId: normalizeSubjectId(data.subjectId, 'subjectId', existing?.subjectId),
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
    note: normalizeOptionalText(data.note, 'note', existing?.note) ?? '',
    effort: normalizeReflectionEffort(data.effort, existing?.effort),
    verdict: normalizeReflectionVerdict(data.verdict, existing?.verdict),
  }
}

export function isMonthPlanPeriodRef(periodRef: PeriodRef): periodRef is MonthRef {
  return getPeriodType(periodRef) === 'month'
}

export function isWeekPlanPeriodRef(periodRef: PeriodRef): periodRef is WeekRef {
  return getPeriodType(periodRef) === 'week'
}
