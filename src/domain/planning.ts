import type { YearRef } from '@/domain/period'

const YEAR_REF_RE = /^\d{4}$/

export interface PlanningObjectBase {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  description?: string
  isActive: boolean
}

export type PlanningCadence = 'weekly' | 'monthly'
export type MeasurementEntryMode = 'completion' | 'counter' | 'value' | 'rating'
export type GoalStatus = 'open' | 'completed' | 'dropped'
export type KeyResultStatus = GoalStatus
export type HabitStatus = 'open' | 'retired' | 'dropped'
export type TrackerStatus = 'open' | 'retired' | 'dropped'
export type InitiativeStatus = GoalStatus
export type CountTargetOperator = 'min' | 'max'
export type ComparisonOperator = 'gte' | 'lte'
export type ValueTargetAggregation = 'sum' | 'average' | 'last'

export interface CountTarget {
  kind: 'count'
  operator: CountTargetOperator
  value: number
}

export interface ValueTarget {
  kind: 'value'
  aggregation: ValueTargetAggregation
  operator: ComparisonOperator
  value: number
}

export interface RatingTarget {
  kind: 'rating'
  aggregation: 'average'
  operator: ComparisonOperator
  value: number
}

export type MeasurementTarget = CountTarget | ValueTarget | RatingTarget

export interface Priority extends PlanningObjectBase {
  year: YearRef
  lifeAreaIds: string[]
}

export interface Goal extends PlanningObjectBase {
  priorityIds: string[]
  lifeAreaIds: string[]
  status: GoalStatus
}

export interface KeyResult extends PlanningObjectBase {
  goalId: string
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: MeasurementTarget
  status: KeyResultStatus
}

export interface Habit extends PlanningObjectBase {
  priorityIds: string[]
  lifeAreaIds: string[]
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: MeasurementTarget
  status: HabitStatus
}

export interface Tracker extends PlanningObjectBase {
  priorityIds: string[]
  lifeAreaIds: string[]
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  status: TrackerStatus
}

export interface Initiative extends PlanningObjectBase {
  goalId?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  status: InitiativeStatus
}

export type CreatePriorityPayload = Omit<Priority, 'id' | 'createdAt' | 'updatedAt'>
export type UpdatePriorityPayload = Partial<Omit<Priority, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateGoalPayload = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateGoalPayload = Partial<Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateKeyResultPayload = Omit<KeyResult, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateKeyResultPayload = Partial<Omit<KeyResult, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateHabitPayload = Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateHabitPayload = Partial<Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateTrackerPayload = Omit<Tracker, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateTrackerPayload = Partial<Omit<Tracker, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateInitiativePayload = Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInitiativePayload = Partial<Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>>

interface PlanningPayloadLike {
  title?: unknown
  description?: unknown
  isActive?: unknown
}

const GOAL_STATUSES = ['open', 'completed', 'dropped'] as const
const HABIT_STATUSES = ['open', 'retired', 'dropped'] as const
const TRACKER_STATUSES = ['open', 'retired', 'dropped'] as const
const CADENCES = ['weekly', 'monthly'] as const
const ENTRY_MODES = ['completion', 'counter', 'value', 'rating'] as const
const COUNT_TARGET_OPERATORS = ['min', 'max'] as const
const COMPARISON_OPERATORS = ['gte', 'lte'] as const
const VALUE_TARGET_AGGREGATIONS = ['sum', 'average', 'last'] as const

function normalizeRequiredText(
  value: unknown,
  fieldName: string,
  fallback?: string,
): string {
  const source = value ?? fallback
  if (typeof source !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  return source.trim()
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

function normalizeBoolean(value: unknown, fieldName: string, fallback: boolean): boolean {
  const source = value ?? fallback
  if (typeof source !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`)
  }

  return source
}

function normalizeIdArray(value: unknown, fieldName: string, fallback: string[] = []): string[] {
  const source = value ?? fallback
  if (!Array.isArray(source)) {
    throw new Error(`${fieldName} must be an array`)
  }

  const normalized = source.map((id) => {
    if (typeof id !== 'string') {
      throw new Error(`${fieldName} must contain only strings`)
    }

    return id.trim()
  })

  return Array.from(new Set(normalized.filter(Boolean)))
}

function normalizeOptionalId(value: unknown, fieldName: string, fallback?: string): string | undefined {
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

function normalizeYearRef(value: unknown, fallback?: YearRef): YearRef {
  const source = value ?? fallback
  if (typeof source !== 'string' || !YEAR_REF_RE.test(source)) {
    throw new Error('Priority.year must be a valid YearRef')
  }

  const numericYear = Number(source)
  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 9999) {
    throw new Error('Priority.year must be a valid YearRef')
  }

  return source as YearRef
}

function normalizeEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[],
  fallback: T,
): T {
  const source = value ?? fallback
  if (typeof source !== 'string' || !allowedValues.includes(source as T)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
  }

  return source as T
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertForbiddenKeys(data: object, keys: string[]): void {
  for (const key of keys) {
    if (key in data) {
      throw new Error(`${key} is not supported for this planning object`)
    }
  }
}

function normalizePlanningObjectBase(
  data: PlanningPayloadLike,
  existing?: PlanningObjectBase,
): Omit<PlanningObjectBase, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    title: normalizeRequiredText(data.title, 'title', existing?.title),
    description: normalizeOptionalText(data.description, 'description', existing?.description),
    isActive: normalizeBoolean(data.isActive, 'isActive', existing?.isActive ?? true),
  }
}

function normalizeMeasurementTarget(
  entryMode: MeasurementEntryMode,
  targetValue: unknown,
  existing?: MeasurementTarget,
): MeasurementTarget {
  const source = targetValue ?? existing
  if (!isPlainObject(source)) {
    throw new Error('target must be an object')
  }

  switch (entryMode) {
    case 'completion':
    case 'counter':
      return {
        kind: normalizeEnum(source.kind, 'target.kind', ['count'] as const, 'count'),
        operator: normalizeEnum(
          source.operator,
          'target.operator',
          COUNT_TARGET_OPERATORS,
          existing?.kind === 'count' ? existing.operator : 'min',
        ),
        value: normalizeNonNegativeInteger(
          source.value,
          'target.value',
          existing?.kind === 'count' ? existing.value : undefined,
        ),
      }
    case 'value':
      return {
        kind: normalizeEnum(source.kind, 'target.kind', ['value'] as const, 'value'),
        aggregation: normalizeEnum(
          source.aggregation,
          'target.aggregation',
          VALUE_TARGET_AGGREGATIONS,
          existing?.kind === 'value' ? existing.aggregation : 'sum',
        ),
        operator: normalizeEnum(
          source.operator,
          'target.operator',
          COMPARISON_OPERATORS,
          existing?.kind === 'value' ? existing.operator : 'gte',
        ),
        value: normalizeFiniteNumber(
          source.value,
          'target.value',
          existing?.kind === 'value' ? existing.value : undefined,
        ),
      }
    case 'rating':
      return {
        kind: normalizeEnum(source.kind, 'target.kind', ['rating'] as const, 'rating'),
        aggregation: normalizeEnum(
          source.aggregation,
          'target.aggregation',
          ['average'] as const,
          'average',
        ),
        operator: normalizeEnum(
          source.operator,
          'target.operator',
          COMPARISON_OPERATORS,
          existing?.kind === 'rating' ? existing.operator : 'gte',
        ),
        value: normalizeFiniteNumber(
          source.value,
          'target.value',
          existing?.kind === 'rating' ? existing.value : undefined,
        ),
      }
  }
}

export function normalizePriorityPayload(
  data: CreatePriorityPayload | UpdatePriorityPayload,
  existing?: Priority,
): Omit<Priority, 'id' | 'createdAt' | 'updatedAt'> {
  const base = normalizePlanningObjectBase(data, existing)

  return {
    ...base,
    year: normalizeYearRef(data.year, existing?.year),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
  }
}

export function normalizeGoalPayload(
  data: CreateGoalPayload | UpdateGoalPayload,
  existing?: Goal,
): Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> {
  const base = normalizePlanningObjectBase(data, existing)

  return {
    ...base,
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    status: normalizeEnum(data.status, 'status', GOAL_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeKeyResultPayload(
  data: CreateKeyResultPayload | UpdateKeyResultPayload,
  existing?: KeyResult,
): Omit<KeyResult, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, [
    'priorityIds',
    'lifeAreaIds',
    'analysisPeriod',
    'kind',
    'config',
  ])

  const base = normalizePlanningObjectBase(data, existing)
  const goalId = normalizeOptionalId(data.goalId, 'goalId', existing?.goalId)
  if (!goalId) {
    throw new Error('KeyResult.goalId is required')
  }

  const entryMode = normalizeEnum(
    data.entryMode,
    'entryMode',
    ENTRY_MODES,
    existing?.entryMode ?? 'completion',
  )

  return {
    ...base,
    goalId,
    entryMode,
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    target: normalizeMeasurementTarget(entryMode, data.target, existing?.target),
    status: normalizeEnum(data.status, 'status', GOAL_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeHabitPayload(
  data: CreateHabitPayload | UpdateHabitPayload,
  existing?: Habit,
): Omit<Habit, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, [
    'goalId',
    'goalIds',
    'analysisPeriod',
    'kind',
    'config',
  ])

  const base = normalizePlanningObjectBase(data, existing)
  const entryMode = normalizeEnum(
    data.entryMode,
    'entryMode',
    ENTRY_MODES,
    existing?.entryMode ?? 'completion',
  )

  return {
    ...base,
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    entryMode,
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    target: normalizeMeasurementTarget(entryMode, data.target, existing?.target),
    status: normalizeEnum(data.status, 'status', HABIT_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeTrackerPayload(
  data: CreateTrackerPayload | UpdateTrackerPayload,
  existing?: Tracker,
): Omit<Tracker, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, ['goalId', 'goalIds', 'analysisPeriod', 'kind', 'config', 'target'])

  const base = normalizePlanningObjectBase(data, existing)

  return {
    ...base,
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    entryMode: normalizeEnum(
      data.entryMode,
      'entryMode',
      ENTRY_MODES,
      existing?.entryMode ?? 'completion',
    ),
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    status: normalizeEnum(data.status, 'status', TRACKER_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeInitiativePayload(
  data: CreateInitiativePayload | UpdateInitiativePayload,
  existing?: Initiative,
): Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, ['goalIds', 'subtasks', 'checklist'])

  const base = normalizePlanningObjectBase(data, existing)

  return {
    ...base,
    goalId: normalizeOptionalId(data.goalId, 'goalId', existing?.goalId),
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    status: normalizeEnum(data.status, 'status', GOAL_STATUSES, existing?.status ?? 'open'),
  }
}
