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
export type GoalStatus = 'open' | 'completed' | 'dropped'
export type KeyResultStatus = GoalStatus
export type HabitStatus = 'open' | 'retired' | 'dropped'
export type TrackerStatus = 'open' | 'retired' | 'dropped'
export type PlanningObjectKind = 'generic'
export type TrackerAnalysisPeriod = 'week' | 'month'
export type TrackerEntryMode = 'day' | 'week' | 'month'
export type PlanningObjectConfig = Record<string, never>

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
  cadence: PlanningCadence
  kind: PlanningObjectKind
  config: PlanningObjectConfig
  status: KeyResultStatus
}

export interface Habit extends PlanningObjectBase {
  priorityIds: string[]
  lifeAreaIds: string[]
  cadence: PlanningCadence
  kind: PlanningObjectKind
  config: PlanningObjectConfig
  status: HabitStatus
}

export interface Tracker extends PlanningObjectBase {
  priorityIds: string[]
  lifeAreaIds: string[]
  analysisPeriod: TrackerAnalysisPeriod
  entryMode: TrackerEntryMode
  kind: PlanningObjectKind
  config: PlanningObjectConfig
  status: TrackerStatus
}

export interface Initiative extends PlanningObjectBase {
  goalId?: string
  priorityIds: string[]
  lifeAreaIds: string[]
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
const TRACKER_ANALYSIS_PERIODS = ['week', 'month'] as const
const TRACKER_ENTRY_MODES = ['day', 'week', 'month'] as const

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeGenericKindAndConfig(
  kindValue: unknown,
  configValue: unknown,
  existing?: { kind: PlanningObjectKind; config: PlanningObjectConfig },
): { kind: PlanningObjectKind; config: PlanningObjectConfig } {
  const kind = normalizeEnum(kindValue, 'kind', ['generic'] as const, existing?.kind ?? 'generic')
  const sourceConfig = configValue ?? existing?.config ?? {}

  if (!isPlainObject(sourceConfig)) {
    throw new Error('config must be an object')
  }

  if (Object.keys(sourceConfig).length > 0) {
    throw new Error('Generic config must stay empty in v1')
  }

  return { kind, config: {} }
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
  assertForbiddenKeys(data as object, ['priorityIds', 'lifeAreaIds'])

  const base = normalizePlanningObjectBase(data, existing)
  const kindAndConfig = normalizeGenericKindAndConfig(data.kind, data.config, existing)
  const goalId = normalizeOptionalId(data.goalId, 'goalId', existing?.goalId)

  if (!goalId) {
    throw new Error('KeyResult.goalId is required')
  }

  return {
    ...base,
    goalId,
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    ...kindAndConfig,
    status: normalizeEnum(data.status, 'status', GOAL_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeHabitPayload(
  data: CreateHabitPayload | UpdateHabitPayload,
  existing?: Habit,
): Omit<Habit, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, ['goalId', 'goalIds'])

  const base = normalizePlanningObjectBase(data, existing)
  const kindAndConfig = normalizeGenericKindAndConfig(data.kind, data.config, existing)

  return {
    ...base,
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    ...kindAndConfig,
    status: normalizeEnum(data.status, 'status', HABIT_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeTrackerPayload(
  data: CreateTrackerPayload | UpdateTrackerPayload,
  existing?: Tracker,
): Omit<Tracker, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, ['goalId', 'goalIds'])

  const base = normalizePlanningObjectBase(data, existing)
  const kindAndConfig = normalizeGenericKindAndConfig(data.kind, data.config, existing)

  return {
    ...base,
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    analysisPeriod: normalizeEnum(
      data.analysisPeriod,
      'analysisPeriod',
      TRACKER_ANALYSIS_PERIODS,
      existing?.analysisPeriod ?? 'week',
    ),
    entryMode: normalizeEnum(
      data.entryMode,
      'entryMode',
      TRACKER_ENTRY_MODES,
      existing?.entryMode ?? 'day',
    ),
    ...kindAndConfig,
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
  }
}
