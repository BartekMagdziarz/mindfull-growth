import type { WeekRef, YearRef } from '@/domain/period'

const YEAR_REF_RE = /^\d{4}$/
const WEEK_REF_RE = /^\d{4}-W\d{2}$/

export interface PlanningObjectBase {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  description?: string
  isActive: boolean
}

export type PlanningCadence = 'weekly' | 'monthly'
export type MeasurementEntryMode = 'completion' | 'counter' | 'value' | 'rating' | 'multi-completion'
export type GoalStatus = 'open' | 'completed' | 'dropped'
export type KeyResultStatus = GoalStatus
export type HabitStatus = 'open' | 'retired' | 'dropped'
export type TrackerStatus = 'open' | 'retired' | 'dropped'
export type WeeklyIntentionStatus = 'open' | 'retired' | 'dropped'
export type InitiativeStatus = GoalStatus
export type PriorityStatus = 'draft' | 'active' | 'paused' | 'closed'
export type PriorityEndingType = 'open' | 'natural'
export type CountTargetOperator = 'min' | 'max'
export type ComparisonOperator = 'gte' | 'lte'
export type ValueTargetAggregation = 'sum' | 'average' | 'last'

export const MAX_ACTIVE_PRIORITIES = 5

/**
 * Optional entry-days condition: the target is met only when the number of
 * days with a qualifying entry in the cadence period also satisfies this
 * comparison (min = at least, max = at most). Undefined = no condition.
 */
export interface MeasurementEntryDaysCondition {
  operator: CountTargetOperator
  value: number
}

/**
 * One checkable element of a multi-completion subject. Checked ids are the
 * source of truth on daily entries; points and day-met status are always
 * recomputed from the CURRENT items (weights, archived flags) at read time.
 * Items that ever appeared in an entry must be archived, never removed —
 * history keeps rendering through their id.
 */
export interface MultiCompletionItem {
  id: string
  label: string
  /** Material Symbols name (same convention as object `icon`). */
  icon?: string
  /** Integer >= 1. Points a checked item contributes toward the daily threshold. */
  weight: number
  /** Hidden from the daily checklist; still resolves in historical entries. */
  archived?: boolean
}

/** Readability cap for the stacked weekly chart and daily checklist. */
export const MULTI_COMPLETION_MAX_ACTIVE_ITEMS = 8

/** Fresh checkable item with a generated id and the default weight. */
export function createMultiCompletionItem(label: string): MultiCompletionItem {
  return { id: crypto.randomUUID(), label, weight: 1 }
}

export interface CountTarget {
  kind: 'count'
  operator: CountTargetOperator
  value: number
  entryDays?: MeasurementEntryDaysCondition
}

export interface ValueTarget {
  kind: 'value'
  aggregation: ValueTargetAggregation
  operator: ComparisonOperator
  value: number
  entryDays?: MeasurementEntryDaysCondition
}

export interface RatingTarget {
  kind: 'rating'
  aggregation: 'average'
  operator: ComparisonOperator
  value: number
  entryDays?: MeasurementEntryDaysCondition
}

export type MeasurementTarget = CountTarget | ValueTarget | RatingTarget

export interface PriorityClosingReflection {
  closedAt: string
  summary?: string
  workedWell?: string
  wasDifficult?: string
  learned?: string
}

export interface Priority extends Omit<PlanningObjectBase, 'isActive'> {
  icon?: string
  years: YearRef[]
  status: PriorityStatus
  order?: number
  lifeAreaIds: string[]
  whyNow?: string
  desiredDirection?: string
  tradeoffs?: string
  /** What stays within the user's influence (creator ritual, boundaries step). */
  influence?: string
  /** What is outside full control (creator ritual, boundaries step). */
  notControlled?: string
  /** Open-ended (yearly re-confirmation) vs. a natural ending event. */
  endingType?: PriorityEndingType
  /** How the user will recognize the natural ending; only for endingType 'natural'. */
  endingDescription?: string
  progressSignals: string[]
  riskSignals: string[]
  closingReflection?: PriorityClosingReflection
}

export interface Goal extends PlanningObjectBase {
  icon?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  status: GoalStatus
  // SMART extensions
  targetDate?: string
  successDefinition?: string
  whyMatters?: string
  confidenceRating?: number
  achievabilityRationale?: string
  obstacles?: string
  resources?: string
}

export interface KeyResult extends PlanningObjectBase {
  goalId: string
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  multiItems?: MultiCompletionItem[]
  /** Daily points required for a met day; undefined = sum of active item weights. */
  multiDailyThreshold?: number
  status: KeyResultStatus
}

export interface Habit extends PlanningObjectBase {
  icon?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  multiItems?: MultiCompletionItem[]
  /** Daily points required for a met day; undefined = sum of active item weights. */
  multiDailyThreshold?: number
  status: HabitStatus
}

export interface Tracker extends PlanningObjectBase {
  icon?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  ratingScaleMin?: number
  ratingScale?: number
  multiItems?: MultiCompletionItem[]
  /** Daily points required for a met day; undefined = sum of active item weights. */
  multiDailyThreshold?: number
  status: TrackerStatus
}

/**
 * A lightweight, week-scoped intention. Behaves like a Habit (entryMode + target,
 * tracked via the normal measurement pipeline) but lives only in `weekRef` — it is
 * its own object type (`subjectType: 'weeklyIntention'`) so it never pollutes the
 * habit library / monthly planner / profile snapshot. `weekRef` doubles as the
 * structural discriminator (no other measureable subject carries it).
 */
export interface WeeklyIntention extends PlanningObjectBase {
  icon?: string
  weekRef: WeekRef
  entryMode: MeasurementEntryMode
  cadence: 'weekly'
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
  multiItems?: MultiCompletionItem[]
  /** Daily points required for a met day; undefined = sum of active item weights. */
  multiDailyThreshold?: number
  status: WeeklyIntentionStatus
  /** Priorities this intention serves — links it into the monthly focus confrontation (M4). */
  priorityIds: string[]
}

export interface Initiative extends PlanningObjectBase {
  goalId?: string
  icon?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  status: InitiativeStatus
}

/**
 * First-class object↔priority relation (creator ritual, future priority hub).
 * Replaces the semantics-free `priorityIds[]` tag; during the transition the
 * arrays stay authoritative for existing readers and links are dual-written.
 *
 * Lifecycle: 'proposed' (ritual brainstorm pick — carries the proposal, no
 * real object exists yet) → 'active' (subjectRef set, proposal dropped) →
 * 'retired' (validTo set; history kept). Proposed links that are abandoned
 * are hard-deleted instead of retired.
 */
export type PriorityLinkStatus = 'proposed' | 'active' | 'retired'
export type PriorityLinkSubjectType =
  | 'goal'
  | 'keyResult'
  | 'habit'
  | 'tracker'
  | 'weeklyIntention'
  | 'initiative'
/**
 * Object types the creator ritual can propose as new. Goals/habits/trackers
 * need later setup (checklist); intentions are complete with a title, so the
 * ritual resolves their proposals immediately after the finale transaction —
 * an interrupted finale degrades to a checklist row instead of losing data.
 */
export type PriorityLinkProposalObjectType = 'goal' | 'habit' | 'tracker' | 'weeklyIntention'

export interface PriorityLinkSubjectRef {
  subjectType: PriorityLinkSubjectType
  subjectId: string
}

export interface PriorityLinkProposal {
  objectType: PriorityLinkProposalObjectType
  title: string
}

export interface PriorityLink {
  id: string
  createdAt: string
  updatedAt: string
  priorityId: string
  status: PriorityLinkStatus
  /** Present for 'active'/'retired'; absent while 'proposed'. */
  subjectRef?: PriorityLinkSubjectRef
  /** Present only while 'proposed'. */
  proposal?: PriorityLinkProposal
  /** "Pomaga, ponieważ…" — may be empty on backfilled links. */
  contribution: string
  /** Expected qualitative signal, prose (no measurement ref by design). */
  expectedSignal: string
  validFrom: string
  /** Set when the link is retired. */
  validTo?: string
  /** Backfilled from priorityIds[] without contribution — hub prompts to describe it. */
  needsEnrichment?: boolean
}

export type CreatePriorityLinkPayload = Omit<PriorityLink, 'id' | 'createdAt' | 'updatedAt'>
export type UpdatePriorityLinkPayload = Partial<CreatePriorityLinkPayload>

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

export type CreateWeeklyIntentionPayload = Omit<WeeklyIntention, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateWeeklyIntentionPayload = Partial<Omit<WeeklyIntention, 'id' | 'createdAt' | 'updatedAt'>>

export type CreateInitiativePayload = Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInitiativePayload = Partial<Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>>

interface PlanningPayloadLike {
  title?: unknown
  description?: unknown
  isActive?: unknown
}

interface PriorityPayloadLike {
  title?: unknown
  description?: unknown
}

const PRIORITY_STATUSES = ['draft', 'active', 'paused', 'closed'] as const
const PRIORITY_ENDING_TYPES = ['open', 'natural'] as const
const PRIORITY_LINK_STATUSES = ['proposed', 'active', 'retired'] as const
const PRIORITY_LINK_SUBJECT_TYPES = [
  'goal',
  'keyResult',
  'habit',
  'tracker',
  'weeklyIntention',
  'initiative',
] as const
const PRIORITY_LINK_PROPOSAL_TYPES = ['goal', 'habit', 'tracker', 'weeklyIntention'] as const
const GOAL_STATUSES = ['open', 'completed', 'dropped'] as const
const HABIT_STATUSES = ['open', 'retired', 'dropped'] as const
const TRACKER_STATUSES = ['open', 'retired', 'dropped'] as const
const WEEKLY_INTENTION_STATUSES = ['open', 'retired', 'dropped'] as const
const CADENCES = ['weekly', 'monthly'] as const
const ENTRY_MODES = ['completion', 'counter', 'value', 'rating', 'multi-completion'] as const
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
    throw new Error('Priority.years must contain only valid YearRefs')
  }

  const numericYear = Number(source)
  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 9999) {
    throw new Error('Priority.years must contain only valid YearRefs')
  }

  return source as YearRef
}

function normalizeWeekRef(value: unknown, fallback?: WeekRef): WeekRef {
  const source = value ?? fallback
  if (typeof source !== 'string' || !WEEK_REF_RE.test(source)) {
    throw new Error('WeeklyIntention.weekRef must be a valid WeekRef (YYYY-Www)')
  }

  return source as WeekRef
}

function normalizeYearRefs(value: unknown, fallback?: YearRef[]): YearRef[] {
  const source = value ?? fallback
  if (!Array.isArray(source)) {
    throw new Error('Priority.years must be an array')
  }

  const normalized = source.map((year) => normalizeYearRef(year))
  const unique = Array.from(new Set(normalized))
  unique.sort((left, right) => left.localeCompare(right))

  if (unique.length === 0) {
    throw new Error('Priority.years must contain at least one YearRef')
  }

  return unique
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normalizeOptionalIsoDate(
  value: unknown,
  fieldName: string,
  fallback?: string,
): string | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (typeof source !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }
  const trimmed = source.trim()
  if (!trimmed) return undefined
  if (!ISO_DATE_RE.test(trimmed)) {
    throw new Error(`${fieldName} must be ISO date YYYY-MM-DD`)
  }
  const parsed = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }
  return trimmed
}

function normalizeOptionalRating1To10(
  value: unknown,
  fieldName: string,
  fallback?: number,
): number | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (typeof source !== 'number' || !Number.isInteger(source) || source < 1 || source > 10) {
    throw new Error(`${fieldName} must be an integer between 1 and 10`)
  }
  return source
}

function normalizeOptionalPositiveInt(value: unknown, fieldName: string, fallback?: number): number | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (typeof source !== 'number' || !Number.isInteger(source) || source < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`)
  }
  return source
}

function normalizeOptionalPositiveOrder(value: unknown, fallback?: number): number | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (typeof source !== 'number' || !Number.isInteger(source) || source < 1) {
    throw new Error('Priority.order must be a positive integer')
  }
  return source
}

function normalizeTextArray(value: unknown, fieldName: string, fallback: string[] = []): string[] {
  const source = value ?? fallback
  if (!Array.isArray(source)) {
    throw new Error(`${fieldName} must be an array`)
  }

  const normalized = source.map((item) => {
    if (typeof item !== 'string') {
      throw new Error(`${fieldName} must contain only strings`)
    }
    return item.trim()
  })

  return Array.from(new Set(normalized.filter(Boolean)))
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

function normalizePriorityBase(
  data: PriorityPayloadLike,
  existing?: Priority,
): Omit<Priority, 'id' | 'createdAt' | 'updatedAt' | 'icon' | 'years' | 'status' | 'order' | 'lifeAreaIds' | 'whyNow' | 'desiredDirection' | 'tradeoffs' | 'progressSignals' | 'riskSignals' | 'closingReflection'> {
  return {
    title: normalizeRequiredText(data.title, 'title', existing?.title),
    description: normalizeOptionalText(data.description, 'description', existing?.description),
  }
}

function normalizePriorityClosingReflection(
  value: unknown,
  fallback?: PriorityClosingReflection,
): PriorityClosingReflection | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (!isPlainObject(source)) {
    throw new Error('Priority.closingReflection must be an object')
  }

  const closedAt = normalizeRequiredText(source.closedAt, 'closingReflection.closedAt', fallback?.closedAt)
  return {
    closedAt,
    summary: normalizeOptionalText(source.summary, 'closingReflection.summary', fallback?.summary),
    workedWell: normalizeOptionalText(source.workedWell, 'closingReflection.workedWell', fallback?.workedWell),
    wasDifficult: normalizeOptionalText(source.wasDifficult, 'closingReflection.wasDifficult', fallback?.wasDifficult),
    learned: normalizeOptionalText(source.learned, 'closingReflection.learned', fallback?.learned),
  }
}

function normalizeEntryDaysCondition(
  entryMode: MeasurementEntryMode,
  value: unknown,
  fieldName = 'target.entryDays',
): MeasurementEntryDaysCondition | undefined {
  // For completion the condition is redundant (the primary metric already
  // counts entry days), so it is stripped instead of stored. Multi-completion
  // keeps it: an entry's presence does NOT imply a met day there (partial
  // days), so "log at least N days" carries real meaning.
  if (value === undefined || value === null || entryMode === 'completion') {
    return undefined
  }

  if (!isPlainObject(value)) {
    throw new Error(`${fieldName} must be an object`)
  }

  const operator = normalizeEnum(
    value.operator,
    `${fieldName}.operator`,
    COUNT_TARGET_OPERATORS,
    'min',
  )
  const days = value.value
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1) {
    throw new Error(`${fieldName}.value must be an integer >= 1`)
  }

  return { operator, value: days }
}

/**
 * Multi-completion item list. Present (and required non-empty) only for the
 * multi-completion entry mode; stripped for every other mode. Falls back to
 * `existing` like the other object fields so partial update payloads keep the
 * stored list.
 */
function normalizeMultiCompletionItems(
  entryMode: MeasurementEntryMode,
  value: unknown,
  existing?: MultiCompletionItem[],
): MultiCompletionItem[] | undefined {
  if (entryMode !== 'multi-completion') {
    return undefined
  }

  const source = value ?? existing
  if (!Array.isArray(source)) {
    throw new Error('multiItems must be an array for the multi-completion entry mode')
  }

  const seenIds = new Set<string>()
  const items = source.map((item, index) => {
    const fieldName = `multiItems[${index}]`
    if (!isPlainObject(item)) {
      throw new Error(`${fieldName} must be an object`)
    }

    const id = normalizeRequiredText(item.id, `${fieldName}.id`)
    if (id === '') {
      throw new Error(`${fieldName}.id must be a non-empty string`)
    }
    if (seenIds.has(id)) {
      throw new Error(`${fieldName}.id is duplicated: ${id}`)
    }
    seenIds.add(id)

    const label = normalizeRequiredText(item.label, `${fieldName}.label`)
    if (label === '') {
      throw new Error(`${fieldName}.label must be a non-empty string`)
    }

    const weight = item.weight === undefined ? 1 : item.weight
    if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < 1) {
      throw new Error(`${fieldName}.weight must be an integer >= 1`)
    }

    if (item.archived !== undefined && typeof item.archived !== 'boolean') {
      throw new Error(`${fieldName}.archived must be a boolean`)
    }

    return {
      id,
      label,
      icon: normalizeOptionalText(item.icon, `${fieldName}.icon`),
      weight,
      ...(item.archived === true ? { archived: true } : {}),
    }
  })

  const activeCount = items.filter((item) => !item.archived).length
  if (activeCount < 1) {
    throw new Error('multiItems must contain at least one non-archived item')
  }
  if (activeCount > MULTI_COMPLETION_MAX_ACTIVE_ITEMS) {
    throw new Error(
      `multiItems must contain at most ${MULTI_COMPLETION_MAX_ACTIVE_ITEMS} non-archived items`,
    )
  }

  return items
}

/**
 * Daily points threshold for multi-completion. Undefined means "all active
 * items" (the effective threshold follows the current item list); an explicit
 * `null` clears a stored value back to that default.
 *
 * Fallback contract: callers pass `existing` only when the payload does NOT
 * touch `multiItems`. Editors emit the whole multi config ({items, threshold})
 * atomically, so a payload with items but no threshold means "reset to all
 * items" — while a partial update (e.g. status only) keeps the stored value.
 */
function normalizeMultiDailyThreshold(
  entryMode: MeasurementEntryMode,
  value: unknown,
  existing?: number,
): number | undefined {
  if (entryMode !== 'multi-completion') {
    return undefined
  }

  const source = value === undefined ? existing : value
  if (source === undefined || source === null) {
    return undefined
  }

  if (typeof source !== 'number' || !Number.isInteger(source) || source < 1) {
    throw new Error('multiDailyThreshold must be an integer >= 1')
  }

  return source
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

  // Intentionally no per-field fallback to existing.entryDays: the editors emit
  // the full target object, so omitting entryDays is how the condition is removed.
  const entryDays = normalizeEntryDaysCondition(entryMode, source.entryDays)

  switch (entryMode) {
    case 'completion':
    case 'counter':
    // Multi-completion targets count MET days (daily threshold reached), so the
    // period-level shape is the same count target as completion.
    case 'multi-completion':
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
        ...(entryDays ? { entryDays } : {}),
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
        ...(entryDays ? { entryDays } : {}),
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
        ...(entryDays ? { entryDays } : {}),
      }
  }
}

export function normalizePriorityPayload(
  data: CreatePriorityPayload | UpdatePriorityPayload,
  existing?: Priority,
): Omit<Priority, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, ['year', 'isActive'])

  const base = normalizePriorityBase(data, existing)
  const status = normalizeEnum(data.status, 'status', PRIORITY_STATUSES, existing?.status ?? 'draft')

  if (status !== 'closed' && data.closingReflection !== undefined) {
    throw new Error('Priority.closingReflection is only supported for closed priorities')
  }
  const closingReflection = status === 'closed'
    ? normalizePriorityClosingReflection(data.closingReflection, existing?.closingReflection)
    : undefined

  const endingTypeSource = data.endingType ?? existing?.endingType
  const endingType = endingTypeSource === undefined
    ? undefined
    : normalizeEnum(endingTypeSource, 'endingType', PRIORITY_ENDING_TYPES, endingTypeSource)

  return {
    ...base,
    icon: normalizeOptionalText(data.icon, 'icon', existing?.icon),
    years: normalizeYearRefs(data.years, existing?.years),
    status,
    order: status === 'active' ? normalizeOptionalPositiveOrder(data.order, existing?.order) : undefined,
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    whyNow: normalizeOptionalText(data.whyNow, 'whyNow', existing?.whyNow),
    desiredDirection: normalizeOptionalText(data.desiredDirection, 'desiredDirection', existing?.desiredDirection),
    tradeoffs: normalizeOptionalText(data.tradeoffs, 'tradeoffs', existing?.tradeoffs),
    influence: normalizeOptionalText(data.influence, 'influence', existing?.influence),
    notControlled: normalizeOptionalText(data.notControlled, 'notControlled', existing?.notControlled),
    endingType,
    // The description only means anything next to a natural ending.
    endingDescription: endingType === 'natural'
      ? normalizeOptionalText(data.endingDescription, 'endingDescription', existing?.endingDescription)
      : undefined,
    progressSignals: normalizeTextArray(data.progressSignals, 'progressSignals', existing?.progressSignals),
    riskSignals: normalizeTextArray(data.riskSignals, 'riskSignals', existing?.riskSignals),
    closingReflection: status === 'closed' ? closingReflection : undefined,
  }
}

export function normalizeGoalPayload(
  data: CreateGoalPayload | UpdateGoalPayload,
  existing?: Goal,
): Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> {
  const base = normalizePlanningObjectBase(data, existing)

  return {
    ...base,
    icon: normalizeOptionalText(data.icon, 'icon', existing?.icon),
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    status: normalizeEnum(data.status, 'status', GOAL_STATUSES, existing?.status ?? 'open'),
    targetDate: normalizeOptionalIsoDate(data.targetDate, 'targetDate', existing?.targetDate),
    successDefinition: normalizeOptionalText(data.successDefinition, 'successDefinition', existing?.successDefinition),
    whyMatters: normalizeOptionalText(data.whyMatters, 'whyMatters', existing?.whyMatters),
    confidenceRating: normalizeOptionalRating1To10(data.confidenceRating, 'confidenceRating', existing?.confidenceRating),
    achievabilityRationale: normalizeOptionalText(data.achievabilityRationale, 'achievabilityRationale', existing?.achievabilityRationale),
    obstacles: normalizeOptionalText(data.obstacles, 'obstacles', existing?.obstacles),
    resources: normalizeOptionalText(data.resources, 'resources', existing?.resources),
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
    ratingScaleMin: normalizeOptionalPositiveInt(data.ratingScaleMin, 'ratingScaleMin', existing?.ratingScaleMin),
    ratingScale: normalizeOptionalPositiveInt(data.ratingScale, 'ratingScale', existing?.ratingScale),
    multiItems: normalizeMultiCompletionItems(entryMode, data.multiItems, existing?.multiItems),
    multiDailyThreshold: normalizeMultiDailyThreshold(
      entryMode,
      data.multiDailyThreshold,
      data.multiItems === undefined ? existing?.multiDailyThreshold : undefined,
    ),
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
    icon: normalizeOptionalText(data.icon, 'icon', existing?.icon),
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    entryMode,
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    target: normalizeMeasurementTarget(entryMode, data.target, existing?.target),
    ratingScaleMin: normalizeOptionalPositiveInt(data.ratingScaleMin, 'ratingScaleMin', existing?.ratingScaleMin),
    ratingScale: normalizeOptionalPositiveInt(data.ratingScale, 'ratingScale', existing?.ratingScale),
    multiItems: normalizeMultiCompletionItems(entryMode, data.multiItems, existing?.multiItems),
    multiDailyThreshold: normalizeMultiDailyThreshold(
      entryMode,
      data.multiDailyThreshold,
      data.multiItems === undefined ? existing?.multiDailyThreshold : undefined,
    ),
    status: normalizeEnum(data.status, 'status', HABIT_STATUSES, existing?.status ?? 'open'),
  }
}

export function normalizeWeeklyIntentionPayload(
  data: CreateWeeklyIntentionPayload | UpdateWeeklyIntentionPayload,
  existing?: WeeklyIntention,
): Omit<WeeklyIntention, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, [
    'goalId',
    'goalIds',
    'lifeAreaIds',
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
    icon: normalizeOptionalText(data.icon, 'icon', existing?.icon),
    weekRef: normalizeWeekRef(data.weekRef, existing?.weekRef),
    entryMode,
    cadence: 'weekly',
    target: normalizeMeasurementTarget(entryMode, data.target, existing?.target),
    ratingScaleMin: normalizeOptionalPositiveInt(data.ratingScaleMin, 'ratingScaleMin', existing?.ratingScaleMin),
    ratingScale: normalizeOptionalPositiveInt(data.ratingScale, 'ratingScale', existing?.ratingScale),
    multiItems: normalizeMultiCompletionItems(entryMode, data.multiItems, existing?.multiItems),
    multiDailyThreshold: normalizeMultiDailyThreshold(
      entryMode,
      data.multiDailyThreshold,
      data.multiItems === undefined ? existing?.multiDailyThreshold : undefined,
    ),
    status: normalizeEnum(data.status, 'status', WEEKLY_INTENTION_STATUSES, existing?.status ?? 'open'),
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
  }
}

export function normalizeTrackerPayload(
  data: CreateTrackerPayload | UpdateTrackerPayload,
  existing?: Tracker,
): Omit<Tracker, 'id' | 'createdAt' | 'updatedAt'> {
  assertForbiddenKeys(data as object, ['goalId', 'goalIds', 'analysisPeriod', 'kind', 'config', 'target'])

  const base = normalizePlanningObjectBase(data, existing)
  const entryMode = normalizeEnum(
    data.entryMode,
    'entryMode',
    ENTRY_MODES,
    existing?.entryMode ?? 'completion',
  )

  return {
    ...base,
    icon: normalizeOptionalText(data.icon, 'icon', existing?.icon),
    priorityIds: normalizeIdArray(data.priorityIds, 'priorityIds', existing?.priorityIds),
    lifeAreaIds: normalizeIdArray(data.lifeAreaIds, 'lifeAreaIds', existing?.lifeAreaIds),
    entryMode,
    cadence: normalizeEnum(data.cadence, 'cadence', CADENCES, existing?.cadence ?? 'weekly'),
    ratingScaleMin: normalizeOptionalPositiveInt(data.ratingScaleMin, 'ratingScaleMin', existing?.ratingScaleMin),
    ratingScale: normalizeOptionalPositiveInt(data.ratingScale, 'ratingScale', existing?.ratingScale),
    multiItems: normalizeMultiCompletionItems(entryMode, data.multiItems, existing?.multiItems),
    multiDailyThreshold: normalizeMultiDailyThreshold(
      entryMode,
      data.multiDailyThreshold,
      data.multiItems === undefined ? existing?.multiDailyThreshold : undefined,
    ),
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

function normalizePriorityLinkSubjectRef(
  value: unknown,
  fallback?: PriorityLinkSubjectRef,
): PriorityLinkSubjectRef | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (!isPlainObject(source)) {
    throw new Error('PriorityLink.subjectRef must be an object')
  }

  const subjectType = source.subjectType ?? fallback?.subjectType
  if (
    typeof subjectType !== 'string' ||
    !PRIORITY_LINK_SUBJECT_TYPES.includes(subjectType as PriorityLinkSubjectType)
  ) {
    throw new Error(
      `PriorityLink.subjectRef.subjectType must be one of: ${PRIORITY_LINK_SUBJECT_TYPES.join(', ')}`,
    )
  }

  const subjectId = normalizeRequiredText(source.subjectId, 'subjectRef.subjectId', fallback?.subjectId)
  if (!subjectId) {
    throw new Error('PriorityLink.subjectRef.subjectId must not be empty')
  }

  return { subjectType: subjectType as PriorityLinkSubjectType, subjectId }
}

function normalizePriorityLinkProposal(
  value: unknown,
  fallback?: PriorityLinkProposal,
): PriorityLinkProposal | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (!isPlainObject(source)) {
    throw new Error('PriorityLink.proposal must be an object')
  }

  const objectType = source.objectType ?? fallback?.objectType
  if (
    typeof objectType !== 'string' ||
    !PRIORITY_LINK_PROPOSAL_TYPES.includes(objectType as PriorityLinkProposalObjectType)
  ) {
    throw new Error(
      `PriorityLink.proposal.objectType must be one of: ${PRIORITY_LINK_PROPOSAL_TYPES.join(', ')}`,
    )
  }

  const title = normalizeRequiredText(source.title, 'proposal.title', fallback?.title)
  if (!title) {
    throw new Error('PriorityLink.proposal.title must not be empty')
  }

  return { objectType: objectType as PriorityLinkProposalObjectType, title }
}

/**
 * Status-driven shape: 'proposed' carries the proposal and no subject yet;
 * 'active'/'retired' point at a real object and never keep the proposal.
 * Mismatched fields are stripped (not errors) so a status transition in an
 * update payload does not have to explicitly null the other side.
 */
export function normalizePriorityLinkPayload(
  data: CreatePriorityLinkPayload | UpdatePriorityLinkPayload,
  existing?: PriorityLink,
): Omit<PriorityLink, 'id' | 'createdAt' | 'updatedAt'> {
  const status = normalizeEnum(data.status, 'status', PRIORITY_LINK_STATUSES, existing?.status ?? 'proposed')

  const priorityId = normalizeRequiredText(data.priorityId, 'priorityId', existing?.priorityId)
  if (!priorityId) {
    throw new Error('PriorityLink.priorityId must not be empty')
  }

  const validFrom = normalizeRequiredText(data.validFrom, 'validFrom', existing?.validFrom)
  if (!validFrom) {
    throw new Error('PriorityLink.validFrom must not be empty')
  }

  const needsEnrichment = data.needsEnrichment ?? existing?.needsEnrichment
  if (needsEnrichment !== undefined && typeof needsEnrichment !== 'boolean') {
    throw new Error('PriorityLink.needsEnrichment must be a boolean')
  }

  const shared = {
    priorityId,
    contribution: normalizeOptionalText(data.contribution, 'contribution', existing?.contribution) ?? '',
    expectedSignal: normalizeOptionalText(data.expectedSignal, 'expectedSignal', existing?.expectedSignal) ?? '',
    validFrom,
    needsEnrichment,
  }

  if (status === 'proposed') {
    const proposal = normalizePriorityLinkProposal(data.proposal, existing?.proposal)
    if (!proposal) {
      throw new Error('PriorityLink with status proposed requires a proposal')
    }
    return { ...shared, status, proposal, subjectRef: undefined, validTo: undefined }
  }

  const subjectRef = normalizePriorityLinkSubjectRef(data.subjectRef, existing?.subjectRef)
  if (!subjectRef) {
    throw new Error(`PriorityLink with status ${status} requires a subjectRef`)
  }

  if (status === 'retired') {
    const validTo = normalizeRequiredText(data.validTo, 'validTo', existing?.validTo)
    if (!validTo) {
      throw new Error('PriorityLink with status retired requires validTo')
    }
    return { ...shared, status, subjectRef, proposal: undefined, validTo }
  }

  return { ...shared, status, subjectRef, proposal: undefined, validTo: undefined }
}
