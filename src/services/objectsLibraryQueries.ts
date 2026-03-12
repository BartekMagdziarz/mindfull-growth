import type { LifeArea } from '@/domain/lifeArea'
import type { PeriodRef, PeriodType } from '@/domain/period'
import type {
  Goal,
  Habit,
  Initiative,
  KeyResult,
  MeasurementEntryMode,
  MeasurementTarget,
  Priority,
  Tracker,
} from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  GoalMonthState,
  InitiativePlanState,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementWeekState,
  PeriodObjectReflection,
  PeriodReflection,
} from '@/domain/planningState'
import {
  buildMeasurementSummary,
  type MeasureableSubject,
  type MeasurementPeriodRef,
  type MeasurementSummary,
} from '@/services/measurementProgress'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { comparePeriodRefs, getPeriodRefsForDate, getPeriodType, isPeriodRef, periodIntersectsPeriod } from '@/utils/periods'

export type ObjectsLibraryFamily = 'goals' | 'habits' | 'trackers' | 'initiatives'
export type ObjectsLibraryComposerMode = 'edit' | 'create'
export type ObjectsLibraryPanelType = 'goal' | 'keyResult' | 'habit' | 'tracker' | 'initiative'
export type ObjectsLibraryBadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'
export type ObjectsLibraryHistorySource = 'object-reflection' | 'period-reflection'
export type ObjectsLibraryLinkedPeriodSource =
  | 'plan'
  | 'progress'
  | 'object-reflection'
  | 'period-reflection'

export interface ObjectsLibraryTextDescriptor {
  key: string
  params?: Record<string, string | number>
}

export type ObjectsLibraryLabel = string | ObjectsLibraryTextDescriptor

export interface ObjectsLibraryQuery {
  family: ObjectsLibraryFamily
  q: string
  period?: PeriodRef
  lifeAreaIds: string[]
  priorityIds: string[]
  showClosed: boolean
  composerMode?: ObjectsLibraryComposerMode
  composerType?: ObjectsLibraryPanelType
  composerId?: string
  composerParentType?: 'goal'
  composerParentId?: string
  expandedType?: ObjectsLibraryPanelType
  expandedId?: string
}

export interface ObjectsLibraryFilterOption {
  id: string
  label: string
}

export interface ObjectsLibraryBadge {
  label: ObjectsLibraryLabel
  tone?: ObjectsLibraryBadgeTone
}

export interface ObjectsLibraryMatchReason {
  kind:
    | 'goal-month-state'
    | 'measurement-month-state'
    | 'measurement-week-state'
    | 'measurement-day-assignment'
    | 'daily-entry'
    | 'initiative-plan'
    | 'object-reflection'
    | 'linked-key-result'
    | 'linked-initiative'
    | 'priority-year'
  label: ObjectsLibraryLabel
  periodRef?: PeriodRef
  periodType?: PeriodType
}

export interface ObjectsLibraryChildPreview {
  id: string
  type: 'keyResult'
  title: string
  badges: ObjectsLibraryBadge[]
}

export interface ObjectsLibraryLinkedEntity {
  id: string
  type: 'goal' | 'priority' | 'lifeArea'
  label: string
}

export interface ObjectsLibraryLinkedPeriod {
  key: string
  periodRef: PeriodRef
  periodType: PeriodType
  reasonLabel: ObjectsLibraryLabel
  sources: ObjectsLibraryLinkedPeriodSource[]
}

export interface ObjectsLibraryHistoryItem {
  key: string
  periodRef: PeriodRef
  periodType: PeriodType
  note: string
  source: ObjectsLibraryHistorySource
}

export interface ObjectsLibraryListItem {
  id: string
  panelType: ObjectsLibraryPanelType
  title: string
  description?: string
  eyebrow: ObjectsLibraryLabel
  badges: ObjectsLibraryBadge[]
  details: ObjectsLibraryLabel[]
  linkedEntities: string[]
  matchReasons: ObjectsLibraryMatchReason[]
  childPreviews?: ObjectsLibraryChildPreview[]
  status: string
  isActive: boolean
}

export interface ObjectsLibraryDetailRecord {
  id: string
  panelType: ObjectsLibraryPanelType
  title: string
  description?: string
  badges: ObjectsLibraryBadge[]
  fields: Array<{ label: ObjectsLibraryLabel; value: string; valueType?: 'date' }>
  linkedEntities: ObjectsLibraryLinkedEntity[]
  linkedPeriods: ObjectsLibraryLinkedPeriod[]
  historyItems: ObjectsLibraryHistoryItem[]
  childPreviews?: ObjectsLibraryChildPreview[]
  owner?: { id: string; title: string; panelType: 'goal' }
  isActive: boolean
  status: string
  formDefaults: {
    title: string
    description: string
    isActive: boolean
    status: string
    goalId?: string
    priorityIds: string[]
    lifeAreaIds: string[]
    cadence?: 'weekly' | 'monthly'
    entryMode?: MeasurementEntryMode
    target?: MeasurementTarget
  }
}

export interface ObjectsLibraryBundle {
  query: ObjectsLibraryQuery
  items: ObjectsLibraryListItem[]
  expandedItem?: ObjectsLibraryDetailRecord
  composerItem?: ObjectsLibraryDetailRecord
  familyTotalCount: number
  filterOptions: {
    lifeAreas: ObjectsLibraryFilterOption[]
    priorities: ObjectsLibraryFilterOption[]
    goals: ObjectsLibraryFilterOption[]
  }
}

interface ObjectsLibraryDependencies {
  lifeAreas: LifeArea[]
  priorities: Priority[]
  goals: Goal[]
  keyResults: KeyResult[]
  habits: Habit[]
  trackers: Tracker[]
  initiatives: Initiative[]
  goalMonthStates: GoalMonthState[]
  measurementMonthStates: MeasurementMonthState[]
  measurementWeekStates: MeasurementWeekState[]
  measurementDayAssignments: MeasurementDayAssignment[]
  dailyMeasurementEntries: DailyMeasurementEntry[]
  initiativePlanStates: InitiativePlanState[]
  periodReflections: PeriodReflection[]
  objectReflections: PeriodObjectReflection[]
}

interface ObjectRefContext {
  priorityMap: Map<string, Priority>
  lifeAreaMap: Map<string, LifeArea>
  goalMap: Map<string, Goal>
  keyResultsByGoalId: Map<string, KeyResult[]>
  initiativePlanStateById: Map<string, InitiativePlanState>
  periodReflectionMap: Map<string, PeriodReflection>
  objectReflectionMap: Map<string, PeriodObjectReflection[]>
  subjectEntryMap: Map<string, DailyMeasurementEntry[]>
}

function toLowerText(value?: string): string {
  return (value ?? '').trim().toLowerCase()
}

function csvToIds(value?: string | string[] | null): string[] {
  const source = Array.isArray(value) ? value.join(',') : value ?? ''
  return Array.from(
    new Set(
      source
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function libraryLabel(
  key: string,
  params?: Record<string, string | number>,
): ObjectsLibraryTextDescriptor {
  return { key, params }
}

function serializeLibraryLabel(label: ObjectsLibraryLabel): string {
  return typeof label === 'string' ? label : `${label.key}:${JSON.stringify(label.params ?? {})}`
}

function buildSubjectKey(panelType: 'keyResult' | 'habit' | 'tracker', subjectId: string): string {
  return `${panelType}:${subjectId}`
}

function describeTarget(target: MeasurementTarget): string {
  switch (target.kind) {
    case 'count':
      return `${target.operator === 'min' ? 'Min' : 'Max'} ${target.value}`
    case 'value':
      return `${capitalize(target.aggregation)} ${target.operator === 'gte' ? '>=' : '<='} ${target.value}`
    case 'rating':
      return `Average ${target.operator === 'gte' ? '>=' : '<='} ${target.value}`
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function latestEntry(entries: DailyMeasurementEntry[]): DailyMeasurementEntry | undefined {
  return [...entries].sort((left, right) => left.dayRef.localeCompare(right.dayRef)).at(-1)
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function resolveMeasurementPeriodRef(
  subject: MeasureableSubject,
  entries: DailyMeasurementEntry[],
  targetPeriod?: PeriodRef,
): MeasurementPeriodRef | undefined {
  if (targetPeriod) {
    const periodType = getPeriodType(targetPeriod)
    if (periodType === 'day') {
      const refs = getPeriodRefsForDate(targetPeriod)
      return subject.cadence === 'weekly' ? refs.week : refs.month
    }
    if (
      (subject.cadence === 'weekly' && periodType === 'week') ||
      (subject.cadence === 'monthly' && periodType === 'month')
    ) {
      return targetPeriod as MeasurementPeriodRef
    }
  }

  const latest = latestEntry(entries)
  if (!latest) {
    return undefined
  }

  const refs = getPeriodRefsForDate(latest.dayRef)
  return subject.cadence === 'weekly' ? refs.week : refs.month
}

function getMeasurementSummaryForLibrary(
  subject: MeasureableSubject,
  entries: DailyMeasurementEntry[],
  targetPeriod?: PeriodRef,
): MeasurementSummary | undefined {
  const periodRef = resolveMeasurementPeriodRef(subject, entries, targetPeriod)
  return periodRef ? buildMeasurementSummary(subject, entries, periodRef) : undefined
}

function entryModeBadge(entryMode: MeasurementEntryMode): ObjectsLibraryBadge {
  return { label: libraryLabel(`planning.objects.badges.entryMode.${entryMode}`) }
}

function lifecycleBadge(status: string): ObjectsLibraryBadge {
  switch (status) {
    case 'completed':
      return { label: libraryLabel('planning.objects.badges.status.completed'), tone: 'success' }
    case 'dropped':
      return { label: libraryLabel('planning.objects.badges.status.dropped'), tone: 'danger' }
    case 'retired':
      return { label: libraryLabel('planning.objects.badges.status.retired'), tone: 'warning' }
    default:
      return { label: libraryLabel('planning.objects.badges.status.open'), tone: 'accent' }
  }
}

function cadenceBadge(cadence: 'weekly' | 'monthly'): ObjectsLibraryBadge {
  return { label: libraryLabel(`planning.objects.badges.cadence.${cadence}`) }
}

function targetBadge(target: MeasurementTarget): ObjectsLibraryBadge {
  return { label: describeTarget(target) }
}

function measurementStatusBadges(summary: MeasurementSummary | undefined): ObjectsLibraryBadge[] {
  if (!summary?.target || !summary.evaluationStatus) {
    return []
  }

  switch (summary.evaluationStatus) {
    case 'met':
      return [{ label: libraryLabel('planning.calendar.badges.met'), tone: 'success' }]
    case 'missed':
      return [{ label: libraryLabel('planning.calendar.badges.missed'), tone: 'warning' }]
    case 'no-data':
      return [{ label: libraryLabel('planning.calendar.badges.noData') }]
  }
}

function measurementDetails(
  subject: MeasureableSubject,
  entries: DailyMeasurementEntry[],
  targetPeriod?: PeriodRef,
): ObjectsLibraryLabel[] {
  const details: ObjectsLibraryLabel[] = []
  if ('target' in subject) {
    details.push(describeTarget(subject.target))
  }

  const summary = getMeasurementSummaryForLibrary(subject, entries, targetPeriod)
  if (summary?.actualValue !== undefined) {
    details.push(libraryLabel('planning.calendar.details.actual', { value: formatMeasurementValue(summary.actualValue) }))
  } else if (summary?.target) {
    details.push(libraryLabel('planning.calendar.details.actualNoData'))
  }

  if (summary) {
    details.push(libraryLabel('planning.objects.details.entryCount', { n: summary.entryCount }))
  } else if (entries.length > 0) {
    details.push(libraryLabel('planning.objects.details.entryCount', { n: entries.length }))
  } else {
    details.push(libraryLabel('planning.objects.details.noEntries'))
  }

  return details
}

function toPeriodRefType(periodRef: PeriodRef): PeriodType {
  return getPeriodType(periodRef)
}

function matchReasonBadges(reasons: ObjectsLibraryMatchReason[]): ObjectsLibraryBadge[] {
  return reasons.slice(0, 2).map((reason) => ({ label: reason.label }))
}

function sortLibraryItems(left: ObjectsLibraryListItem, right: ObjectsLibraryListItem): number {
  const leftWeight = left.status === 'open' && left.isActive ? 0 : 1
  const rightWeight = right.status === 'open' && right.isActive ? 0 : 1
  if (leftWeight !== rightWeight) {
    return leftWeight - rightWeight
  }

  return left.title.localeCompare(right.title)
}

function matchesLinkFilters(linkedIds: string[], selectedIds: string[]): boolean {
  return selectedIds.length === 0 || selectedIds.every((id) => linkedIds.includes(id))
}

function matchesClosedFilter(isActive: boolean, status: string, showClosed: boolean): boolean {
  return showClosed || (isActive && status === 'open')
}

function matchesQueryText(query: string, values: Array<string | undefined>): boolean {
  const normalizedQuery = toLowerText(query)
  if (!normalizedQuery) {
    return true
  }

  return values.some((value) => toLowerText(value).includes(normalizedQuery))
}

function matchesTargetPeriod(periodRef: PeriodRef, targetPeriod?: PeriodRef): boolean {
  return !targetPeriod || periodIntersectsPeriod(periodRef, targetPeriod)
}

function dedupeReasons(reasons: ObjectsLibraryMatchReason[]): ObjectsLibraryMatchReason[] {
  const seen = new Set<string>()
  return reasons.filter((reason) => {
    const key = `${reason.kind}:${reason.periodType ?? 'none'}:${reason.periodRef ?? 'none'}:${serializeLibraryLabel(reason.label)}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function getObjectsLibraryFamilyPanelType(
  family: ObjectsLibraryFamily,
): Exclude<ObjectsLibraryPanelType, 'keyResult'> {
  switch (family) {
    case 'goals':
      return 'goal'
    case 'habits':
      return 'habit'
    case 'trackers':
      return 'tracker'
    case 'initiatives':
      return 'initiative'
  }
}

export function getObjectsLibraryFamilyForPanelType(
  panelType: ObjectsLibraryPanelType,
): ObjectsLibraryFamily {
  switch (panelType) {
    case 'goal':
    case 'keyResult':
      return 'goals'
    case 'habit':
      return 'habits'
    case 'tracker':
      return 'trackers'
    case 'initiative':
      return 'initiatives'
  }
}

export function createDefaultObjectsLibraryQuery(
  family: ObjectsLibraryFamily = 'goals',
): ObjectsLibraryQuery {
  return {
    family,
    q: '',
    lifeAreaIds: [],
    priorityIds: [],
    showClosed: false,
  }
}

async function loadDependencies(): Promise<ObjectsLibraryDependencies> {
  const [
    lifeAreas,
    priorities,
    goals,
    keyResults,
    habits,
    trackers,
    initiatives,
    goalMonthStates,
    measurementMonthStates,
    measurementWeekStates,
    measurementDayAssignments,
    dailyMeasurementEntries,
    initiativePlanStates,
    periodReflections,
    objectReflections,
  ] = await Promise.all([
    lifeAreaDexieRepository.getAll(),
    priorityDexieRepository.listAll(),
    goalDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    initiativeDexieRepository.listAll(),
    planningStateDexieRepository.listGoalMonthStates(),
    planningStateDexieRepository.listMeasurementMonthStates(),
    planningStateDexieRepository.listMeasurementWeekStates(),
    planningStateDexieRepository.listMeasurementDayAssignments(),
    planningStateDexieRepository.listDailyMeasurementEntries(),
    planningStateDexieRepository.listInitiativePlanStates(),
    reflectionDexieRepository.listPeriodReflections(),
    reflectionDexieRepository.listPeriodObjectReflections(),
  ])

  return {
    lifeAreas,
    priorities,
    goals,
    keyResults,
    habits,
    trackers,
    initiatives,
    goalMonthStates,
    measurementMonthStates,
    measurementWeekStates,
    measurementDayAssignments,
    dailyMeasurementEntries,
    initiativePlanStates,
    periodReflections,
    objectReflections,
  }
}

function buildContext(deps: ObjectsLibraryDependencies): ObjectRefContext {
  const priorityMap = new Map(deps.priorities.map((item) => [item.id, item]))
  const lifeAreaMap = new Map(deps.lifeAreas.map((item) => [item.id, item]))
  const goalMap = new Map(deps.goals.map((item) => [item.id, item]))
  const keyResultsByGoalId = new Map<string, KeyResult[]>()

  for (const keyResult of deps.keyResults) {
    const existing = keyResultsByGoalId.get(keyResult.goalId) ?? []
    existing.push(keyResult)
    keyResultsByGoalId.set(keyResult.goalId, existing)
  }

  const initiativePlanStateById = new Map(
    deps.initiativePlanStates.map((item) => [item.initiativeId, item]),
  )

  const periodReflectionMap = new Map(
    deps.periodReflections.map((item) => [`${item.periodType}:${item.periodRef}`, item]),
  )

  const objectReflectionMap = new Map<string, PeriodObjectReflection[]>()
  for (const reflection of deps.objectReflections) {
    const key = `${reflection.subjectType}:${reflection.subjectId}`
    const existing = objectReflectionMap.get(key) ?? []
    existing.push(reflection)
    objectReflectionMap.set(key, existing)
  }

  const subjectEntryMap = new Map<string, DailyMeasurementEntry[]>()
  for (const entry of deps.dailyMeasurementEntries) {
    const key = buildSubjectKey(entry.subjectType, entry.subjectId)
    const existing = subjectEntryMap.get(key) ?? []
    existing.push(entry)
    subjectEntryMap.set(key, existing)
  }

  return {
    priorityMap,
    lifeAreaMap,
    goalMap,
    keyResultsByGoalId,
    initiativePlanStateById,
    periodReflectionMap,
    objectReflectionMap,
    subjectEntryMap,
  }
}

function buildLinkedEntities(
  priorityIds: string[],
  lifeAreaIds: string[],
  ctx: ObjectRefContext,
): ObjectsLibraryLinkedEntity[] {
  const entities: ObjectsLibraryLinkedEntity[] = []
  for (const priorityId of priorityIds) {
    const priority = ctx.priorityMap.get(priorityId)
    if (priority) {
      entities.push({ id: priority.id, type: 'priority', label: `${priority.year} · ${priority.title}` })
    }
  }
  for (const lifeAreaId of lifeAreaIds) {
    const area = ctx.lifeAreaMap.get(lifeAreaId)
    if (area) {
      entities.push({ id: area.id, type: 'lifeArea', label: area.name })
    }
  }
  return entities
}

function linkedEntityLabels(
  priorityIds: string[],
  lifeAreaIds: string[],
  ctx: ObjectRefContext,
): string[] {
  return buildLinkedEntities(priorityIds, lifeAreaIds, ctx).map((item) => item.label)
}

function getObjectReflections(
  panelType: ObjectsLibraryPanelType,
  subjectId: string,
  ctx: ObjectRefContext,
): PeriodObjectReflection[] {
  return ctx.objectReflectionMap.get(`${panelType}:${subjectId}`) ?? []
}

function getMeasurementRelevance(
  panelType: 'keyResult' | 'habit' | 'tracker',
  subjectId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
): ObjectsLibraryMatchReason[] {
  const reasons: ObjectsLibraryMatchReason[] = []

  for (const state of deps.measurementMonthStates.filter(
    (item) => item.subjectType === panelType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(state.monthRef, targetPeriod)) {
      reasons.push({
        kind: 'measurement-month-state',
        label: libraryLabel('planning.objects.reason.activeThisMonth'),
        periodRef: state.monthRef,
        periodType: 'month',
      })
    }
  }

  for (const state of deps.measurementWeekStates.filter(
    (item) => item.subjectType === panelType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(state.weekRef, targetPeriod)) {
      reasons.push({
        kind: 'measurement-week-state',
        label: libraryLabel('planning.objects.reason.scheduledThisWeek'),
        periodRef: state.weekRef,
        periodType: 'week',
      })
    }
  }

  for (const assignment of deps.measurementDayAssignments.filter(
    (item) => item.subjectType === panelType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(assignment.dayRef, targetPeriod)) {
      reasons.push({
        kind: 'measurement-day-assignment',
        label: libraryLabel('planning.objects.reason.scheduledThisDay'),
        periodRef: assignment.dayRef,
        periodType: 'day',
      })
    }
  }

  for (const entry of deps.dailyMeasurementEntries.filter(
    (item) => item.subjectType === panelType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(entry.dayRef, targetPeriod)) {
      reasons.push({
        kind: 'daily-entry',
        label: libraryLabel('planning.objects.reason.loggedThisDay'),
        periodRef: entry.dayRef,
        periodType: 'day',
      })
    }
  }

  for (const reflection of deps.objectReflections.filter(
    (item) => item.subjectType === panelType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(reflection.periodRef, targetPeriod)) {
      reasons.push({
        kind: 'object-reflection',
        label: libraryLabel('planning.objects.reason.objectReflection'),
        periodRef: reflection.periodRef,
        periodType: reflection.periodType,
      })
    }
  }

  return dedupeReasons(reasons)
}

function getInitiativeRelevance(
  initiativeId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
): ObjectsLibraryMatchReason[] {
  const reasons: ObjectsLibraryMatchReason[] = []
  const planState = deps.initiativePlanStates.find((item) => item.initiativeId === initiativeId)

  if (planState?.monthRef && matchesTargetPeriod(planState.monthRef, targetPeriod)) {
    reasons.push({
      kind: 'initiative-plan',
      label: libraryLabel('planning.objects.reason.scheduledThisMonth'),
      periodRef: planState.monthRef,
      periodType: 'month',
    })
  }
  if (planState?.weekRef && matchesTargetPeriod(planState.weekRef, targetPeriod)) {
    reasons.push({
      kind: 'initiative-plan',
      label: libraryLabel('planning.objects.reason.scheduledThisWeek'),
      periodRef: planState.weekRef,
      periodType: 'week',
    })
  }
  if (planState?.dayRef && matchesTargetPeriod(planState.dayRef, targetPeriod)) {
    reasons.push({
      kind: 'initiative-plan',
      label: libraryLabel('planning.objects.reason.scheduledThisDay'),
      periodRef: planState.dayRef,
      periodType: 'day',
    })
  }

  for (const reflection of deps.objectReflections.filter(
    (item) => item.subjectType === 'initiative' && item.subjectId === initiativeId,
  )) {
    if (matchesTargetPeriod(reflection.periodRef, targetPeriod)) {
      reasons.push({
        kind: 'object-reflection',
        label: libraryLabel('planning.objects.reason.objectReflection'),
        periodRef: reflection.periodRef,
        periodType: reflection.periodType,
      })
    }
  }

  return dedupeReasons(reasons)
}

function getGoalRelevance(
  goalId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryMatchReason[] {
  const directReasons: ObjectsLibraryMatchReason[] = []

  for (const state of deps.goalMonthStates.filter((item) => item.goalId === goalId)) {
    if (matchesTargetPeriod(state.monthRef, targetPeriod)) {
      directReasons.push({
        kind: 'goal-month-state',
        label: libraryLabel('planning.objects.reason.goalMonthState'),
        periodRef: state.monthRef,
        periodType: 'month',
      })
    }
  }

  for (const reflection of getObjectReflections('goal', goalId, ctx)) {
    if (matchesTargetPeriod(reflection.periodRef, targetPeriod)) {
      directReasons.push({
        kind: 'object-reflection',
        label: libraryLabel('planning.objects.reason.objectReflection'),
        periodRef: reflection.periodRef,
        periodType: reflection.periodType,
      })
    }
  }

  const linkedKeyResults = ctx.keyResultsByGoalId.get(goalId) ?? []
  for (const keyResult of linkedKeyResults) {
    for (const reason of getMeasurementRelevance('keyResult', keyResult.id, targetPeriod, deps)) {
      directReasons.push({
        ...reason,
        kind: 'linked-key-result',
        label: libraryLabel('planning.objects.reason.linkedKeyResult'),
      })
    }
  }

  for (const initiative of deps.initiatives.filter((item) => item.goalId === goalId)) {
    for (const reason of getInitiativeRelevance(initiative.id, targetPeriod, deps)) {
      directReasons.push({
        ...reason,
        kind: 'linked-initiative',
        label: libraryLabel('planning.objects.reason.linkedInitiative'),
      })
    }
  }

  const goal = ctx.goalMap.get(goalId)
  if (goal && targetPeriod && getPeriodType(targetPeriod) === 'year') {
    for (const priorityId of goal.priorityIds) {
      const priority = ctx.priorityMap.get(priorityId)
      if (priority?.year === targetPeriod) {
        directReasons.push({
          kind: 'priority-year',
          label: libraryLabel('planning.objects.reason.priorityYear'),
          periodRef: priority.year,
          periodType: 'year',
        })
      }
    }
  }

  return dedupeReasons(directReasons)
}

function buildLinkedPeriods(
  panelType: ObjectsLibraryPanelType,
  subjectId: string,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryLinkedPeriod[] {
  const periods = new Map<string, ObjectsLibraryLinkedPeriod>()
  const add = (
    periodRef: PeriodRef,
    source: Exclude<ObjectsLibraryLinkedPeriodSource, 'period-reflection'>,
    reasonLabel: ObjectsLibraryLabel,
  ) => {
    const key = `${periodRef}:${serializeLibraryLabel(reasonLabel)}`
    const current = periods.get(key)
    if (current) {
      if (!current.sources.includes(source)) {
        current.sources.push(source)
      }
      return
    }

    periods.set(key, {
      key,
      periodRef,
      periodType: toPeriodRefType(periodRef),
      reasonLabel,
      sources: [source],
    })
  }

  switch (panelType) {
    case 'goal':
      for (const state of deps.goalMonthStates.filter((item) => item.goalId === subjectId)) {
        add(state.monthRef, 'plan', libraryLabel('planning.objects.reason.goalMonthState'))
      }
      for (const keyResult of deps.keyResults.filter((item) => item.goalId === subjectId)) {
        for (const item of buildLinkedPeriods('keyResult', keyResult.id, deps, ctx)) {
          add(item.periodRef, getPrimaryLinkedPeriodSource(item.sources), libraryLabel('planning.objects.reason.linkedKeyResult'))
        }
      }
      for (const initiative of deps.initiatives.filter((item) => item.goalId === subjectId)) {
        for (const item of buildLinkedPeriods('initiative', initiative.id, deps, ctx)) {
          add(item.periodRef, getPrimaryLinkedPeriodSource(item.sources), libraryLabel('planning.objects.reason.linkedInitiative'))
        }
      }
      break
    case 'keyResult':
    case 'habit':
    case 'tracker':
      for (const state of deps.measurementMonthStates.filter(
        (item) => item.subjectType === panelType && item.subjectId === subjectId,
      )) {
        add(state.monthRef, 'plan', libraryLabel('planning.objects.reason.activeThisMonth'))
      }
      for (const state of deps.measurementWeekStates.filter(
        (item) => item.subjectType === panelType && item.subjectId === subjectId,
      )) {
        add(state.weekRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisWeek'))
      }
      for (const assignment of deps.measurementDayAssignments.filter(
        (item) => item.subjectType === panelType && item.subjectId === subjectId,
      )) {
        add(assignment.dayRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisDay'))
      }
      for (const entry of deps.dailyMeasurementEntries.filter(
        (item) => item.subjectType === panelType && item.subjectId === subjectId,
      )) {
        add(entry.dayRef, 'progress', libraryLabel('planning.objects.reason.loggedThisDay'))
      }
      break
    case 'initiative': {
      const planState = deps.initiativePlanStates.find((item) => item.initiativeId === subjectId)
      if (planState?.monthRef) {
        add(planState.monthRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisMonth'))
      }
      if (planState?.weekRef) {
        add(planState.weekRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisWeek'))
      }
      if (planState?.dayRef) {
        add(planState.dayRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisDay'))
      }
      break
    }
  }

  for (const reflection of getObjectReflections(panelType, subjectId, ctx)) {
    add(reflection.periodRef, 'object-reflection', libraryLabel('planning.objects.reason.objectReflection'))
  }

  const items = Array.from(periods.values())
  for (const item of items) {
    const reflection = ctx.periodReflectionMap.get(
      `${item.periodType === 'month' || item.periodType === 'week' ? item.periodType : 'week'}:${item.periodRef}`,
    )
    if (reflection && !item.sources.includes('period-reflection')) {
      item.sources.push('period-reflection')
    }
  }

  return items.sort((left, right) => comparePeriodRefs(right.periodRef, left.periodRef))
}

function buildHistory(
  panelType: ObjectsLibraryPanelType,
  subjectId: string,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryHistoryItem[] {
  const items: ObjectsLibraryHistoryItem[] = getObjectReflections(panelType, subjectId, ctx).map((item) => ({
    key: `object:${item.id}`,
    periodRef: item.periodRef,
    periodType: item.periodType,
    note: item.note,
    source: 'object-reflection',
  }))

  const reflectionKeys = new Set(items.map((item) => `${item.periodType}:${item.periodRef}`))
  for (const period of buildLinkedPeriods(panelType, subjectId, deps, ctx)) {
    const reflection = ctx.periodReflectionMap.get(
      `${period.periodType === 'month' || period.periodType === 'week' ? period.periodType : 'week'}:${period.periodRef}`,
    )
    const key = `${period.periodType}:${period.periodRef}`
    if (!reflection || reflectionKeys.has(key)) {
      continue
    }

    items.push({
      key: `period:${period.periodRef}`,
      periodRef: period.periodRef,
      periodType: period.periodType,
      note: reflection.note,
      source: 'period-reflection',
    })
  }

  return items.sort((left, right) => comparePeriodRefs(right.periodRef, left.periodRef))
}

function getPrimaryLinkedPeriodSource(
  sources: ObjectsLibraryLinkedPeriodSource[],
): Exclude<ObjectsLibraryLinkedPeriodSource, 'period-reflection'> {
  return sources.find((source) => source !== 'period-reflection') ?? 'plan'
}

function buildBaseFields(createdAt: string, updatedAt: string): ObjectsLibraryDetailRecord['fields'] {
  return [
    { label: libraryLabel('planning.objects.fields.createdAt'), value: createdAt, valueType: 'date' },
    { label: libraryLabel('planning.objects.fields.updatedAt'), value: updatedAt, valueType: 'date' },
  ]
}

function buildMeasurementFields(subject: KeyResult | Habit | Tracker): ObjectsLibraryDetailRecord['fields'] {
  const fields = [
    { label: libraryLabel('planning.objects.form.entryMode'), value: capitalize(subject.entryMode) },
    { label: libraryLabel('planning.objects.form.cadence'), value: capitalize(subject.cadence) },
  ]

  if ('target' in subject) {
    fields.push({ label: libraryLabel('planning.objects.form.target'), value: describeTarget(subject.target) })
  }

  return fields
}

function buildFamilyItems(
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem[] {
  switch (query.family) {
    case 'goals':
      return deps.goals
        .filter((goal) => matchesGoalFilters(goal, query, deps, ctx))
        .map((goal) => buildGoalListItem(goal, query, deps, ctx))
        .sort(sortLibraryItems)
    case 'habits':
      return deps.habits
        .filter((habit) => matchesStandaloneFilters(habit, query))
        .filter((habit) => matchesQueryText(query.q, [habit.title, habit.description]))
        .filter((habit) => getMeasurementRelevance('habit', habit.id, query.period, deps).length > 0 || !query.period)
        .map((habit) => buildHabitListItem(habit, query, deps, ctx))
        .sort(sortLibraryItems)
    case 'trackers':
      return deps.trackers
        .filter((tracker) => matchesStandaloneFilters(tracker, query))
        .filter((tracker) => matchesQueryText(query.q, [tracker.title, tracker.description]))
        .filter((tracker) => getMeasurementRelevance('tracker', tracker.id, query.period, deps).length > 0 || !query.period)
        .map((tracker) => buildTrackerListItem(tracker, query, deps, ctx))
        .sort(sortLibraryItems)
    case 'initiatives':
      return deps.initiatives
        .filter((initiative) => matchesStandaloneFilters(initiative, query))
        .filter((initiative) => matchesQueryText(query.q, [initiative.title, initiative.description]))
        .filter((initiative) => getInitiativeRelevance(initiative.id, query.period, deps).length > 0 || !query.period)
        .map((initiative) => buildInitiativeListItem(initiative, query, deps, ctx))
        .sort(sortLibraryItems)
  }
}

function getFamilyTotalCount(
  family: ObjectsLibraryFamily,
  deps: ObjectsLibraryDependencies,
): number {
  switch (family) {
    case 'goals':
      return deps.goals.length
    case 'habits':
      return deps.habits.length
    case 'trackers':
      return deps.trackers.length
    case 'initiatives':
      return deps.initiatives.length
  }
}

function buildPanelRecord(
  panelType: ObjectsLibraryPanelType,
  panelId: string,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord | undefined {
  switch (panelType) {
    case 'goal': {
      const goal = deps.goals.find((item) => item.id === panelId)
      return goal ? buildGoalPanel(goal, deps, ctx) : undefined
    }
    case 'keyResult': {
      const keyResult = deps.keyResults.find((item) => item.id === panelId)
      return keyResult ? buildKeyResultPanel(keyResult, deps, ctx) : undefined
    }
    case 'habit': {
      const habit = deps.habits.find((item) => item.id === panelId)
      return habit ? buildHabitPanel(habit, deps, ctx) : undefined
    }
    case 'tracker': {
      const tracker = deps.trackers.find((item) => item.id === panelId)
      return tracker ? buildTrackerPanel(tracker, deps, ctx) : undefined
    }
    case 'initiative': {
      const initiative = deps.initiatives.find((item) => item.id === panelId)
      return initiative ? buildInitiativePanel(initiative, deps, ctx) : undefined
    }
  }
}

export async function loadObjectsLibraryBundle(
  query: ObjectsLibraryQuery,
): Promise<ObjectsLibraryBundle> {
  const deps = await loadDependencies()
  const ctx = buildContext(deps)

  return {
    query,
    familyTotalCount: getFamilyTotalCount(query.family, deps),
    items: buildFamilyItems(query, deps, ctx),
    expandedItem:
      query.expandedType && query.expandedId
        ? buildPanelRecord(query.expandedType, query.expandedId, deps, ctx)
        : undefined,
    composerItem:
      query.composerMode === 'edit' && query.composerType && query.composerId
        ? buildPanelRecord(query.composerType, query.composerId, deps, ctx)
        : undefined,
    filterOptions: {
      lifeAreas: deps.lifeAreas
        .filter((area) => area.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((area) => ({ id: area.id, label: area.name })),
      priorities: deps.priorities
        .filter((priority) => priority.isActive)
        .sort((left, right) => left.year.localeCompare(right.year) || left.title.localeCompare(right.title))
        .map((priority) => ({ id: priority.id, label: `${priority.year} · ${priority.title}` })),
      goals: deps.goals
        .filter((goal) => goal.isActive && goal.status === 'open')
        .sort((left, right) => left.title.localeCompare(right.title))
        .map((goal) => ({ id: goal.id, label: goal.title })),
    },
  }
}

function matchesStandaloneFilters<
  TObject extends { priorityIds: string[]; lifeAreaIds: string[]; status: string; isActive: boolean },
>(object: TObject, query: ObjectsLibraryQuery): boolean {
  return (
    matchesLinkFilters(object.priorityIds, query.priorityIds) &&
    matchesLinkFilters(object.lifeAreaIds, query.lifeAreaIds) &&
    matchesClosedFilter(object.isActive, object.status, query.showClosed)
  )
}

function matchesGoalFilters(
  goal: Goal,
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): boolean {
  const ownedKeyResults = ctx.keyResultsByGoalId.get(goal.id) ?? []
  const matchesText =
    matchesQueryText(query.q, [goal.title, goal.description]) ||
    ownedKeyResults.some((item) =>
      matchesQueryText(query.q, [item.title, item.description, goal.title, goal.description]),
    )

  const anyChildOpen = ownedKeyResults.some((item) =>
    matchesClosedFilter(item.isActive, item.status, query.showClosed),
  )

  return (
    matchesLinkFilters(goal.priorityIds, query.priorityIds) &&
    matchesLinkFilters(goal.lifeAreaIds, query.lifeAreaIds) &&
    matchesClosedFilter(goal.isActive, goal.status, query.showClosed) &&
    matchesText &&
    (getGoalRelevance(goal.id, query.period, deps, ctx).length > 0 || !query.period) &&
    (query.showClosed || goal.status === 'open' || anyChildOpen || goal.isActive)
  )
}

function buildGoalListItem(
  goal: Goal,
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const matchReasons = getGoalRelevance(goal.id, query.period, deps, ctx)
  const keyResults = ctx.keyResultsByGoalId.get(goal.id) ?? []

  return {
    id: goal.id,
    panelType: 'goal',
    title: goal.title,
    description: goal.description,
    eyebrow: libraryLabel('planning.objects.labels.goal'),
    badges: [
      lifecycleBadge(goal.status),
      ...(goal.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
      ...matchReasonBadges(matchReasons),
    ],
    details: keyResults.length > 0 ? [`Key results ${keyResults.length}`] : [libraryLabel('planning.objects.details.noLinkedKeyResults')],
    linkedEntities: linkedEntityLabels(goal.priorityIds, goal.lifeAreaIds, ctx),
    matchReasons,
    childPreviews: keyResults.slice(0, 3).map((item) => ({
      id: item.id,
      type: 'keyResult',
      title: item.title,
      badges: [cadenceBadge(item.cadence), entryModeBadge(item.entryMode), targetBadge(item.target)],
    })),
    status: goal.status,
    isActive: goal.isActive,
  }
}

function buildHabitListItem(
  habit: Habit,
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const matchReasons = getMeasurementRelevance('habit', habit.id, query.period, deps)
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('habit', habit.id)) ?? []
  const summary = getMeasurementSummaryForLibrary(habit, entries, query.period)

  return {
    id: habit.id,
    panelType: 'habit',
    title: habit.title,
    description: habit.description,
    eyebrow: libraryLabel('planning.objects.labels.habit'),
    badges: [
      cadenceBadge(habit.cadence),
      entryModeBadge(habit.entryMode),
      targetBadge(habit.target),
      ...measurementStatusBadges(summary),
      lifecycleBadge(habit.status),
      ...(habit.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
      ...matchReasonBadges(matchReasons),
    ],
    details: measurementDetails(habit, entries, query.period),
    linkedEntities: linkedEntityLabels(habit.priorityIds, habit.lifeAreaIds, ctx),
    matchReasons,
    status: habit.status,
    isActive: habit.isActive,
  }
}

function buildTrackerListItem(
  tracker: Tracker,
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('tracker', tracker.id)) ?? []
  const matchReasons = getMeasurementRelevance('tracker', tracker.id, query.period, deps)
  const summary = getMeasurementSummaryForLibrary(tracker, entries, query.period)

  return {
    id: tracker.id,
    panelType: 'tracker',
    title: tracker.title,
    description: tracker.description,
    eyebrow: libraryLabel('planning.objects.labels.tracker'),
    badges: [
      cadenceBadge(tracker.cadence),
      entryModeBadge(tracker.entryMode),
      ...measurementStatusBadges(summary),
      lifecycleBadge(tracker.status),
      ...(tracker.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
      ...matchReasonBadges(matchReasons),
    ],
    details: measurementDetails(tracker, entries, query.period),
    linkedEntities: linkedEntityLabels(tracker.priorityIds, tracker.lifeAreaIds, ctx),
    matchReasons,
    status: tracker.status,
    isActive: tracker.isActive,
  }
}

function buildInitiativeListItem(
  initiative: Initiative,
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const planState = ctx.initiativePlanStateById.get(initiative.id)
  const matchReasons = getInitiativeRelevance(initiative.id, query.period, deps)
  const linkedGoal = initiative.goalId ? ctx.goalMap.get(initiative.goalId) : undefined

  return {
    id: initiative.id,
    panelType: 'initiative',
    title: initiative.title,
    description: initiative.description,
    eyebrow: libraryLabel('planning.objects.labels.initiative'),
    badges: [
      lifecycleBadge(initiative.status),
      ...(initiative.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
      ...matchReasonBadges(matchReasons),
    ],
    details: [
      planState?.dayRef ? 'Scheduled day' : planState?.weekRef ? 'Scheduled week' : planState?.monthRef ? 'Scheduled month' : 'No period placement',
    ],
    linkedEntities: linkedGoal
      ? [`Goal · ${linkedGoal.title}`, ...linkedEntityLabels(initiative.priorityIds, initiative.lifeAreaIds, ctx)]
      : linkedEntityLabels(initiative.priorityIds, initiative.lifeAreaIds, ctx),
    matchReasons,
    status: initiative.status,
    isActive: initiative.isActive,
  }
}

function buildGoalPanel(
  goal: Goal,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  const keyResults = (ctx.keyResultsByGoalId.get(goal.id) ?? []).map((item) => ({
    id: item.id,
    type: 'keyResult' as const,
    title: item.title,
    badges: [cadenceBadge(item.cadence), entryModeBadge(item.entryMode), targetBadge(item.target), lifecycleBadge(item.status)],
  }))

  return {
    id: goal.id,
    panelType: 'goal',
    title: goal.title,
    description: goal.description,
    badges: [
      lifecycleBadge(goal.status),
      ...(goal.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: buildBaseFields(goal.createdAt, goal.updatedAt),
    linkedEntities: buildLinkedEntities(goal.priorityIds, goal.lifeAreaIds, ctx),
    linkedPeriods: buildLinkedPeriods('goal', goal.id, deps, ctx),
    historyItems: buildHistory('goal', goal.id, deps, ctx),
    childPreviews: keyResults,
    isActive: goal.isActive,
    status: goal.status,
    formDefaults: {
      title: goal.title,
      description: goal.description ?? '',
      isActive: goal.isActive,
      status: goal.status,
      priorityIds: [...goal.priorityIds],
      lifeAreaIds: [...goal.lifeAreaIds],
    },
  }
}

function buildKeyResultPanel(
  keyResult: KeyResult,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  const goal = ctx.goalMap.get(keyResult.goalId)
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('keyResult', keyResult.id)) ?? []
  const summary = getMeasurementSummaryForLibrary(keyResult, entries)

  return {
    id: keyResult.id,
    panelType: 'keyResult',
    title: keyResult.title,
    description: keyResult.description,
    badges: [
      cadenceBadge(keyResult.cadence),
      entryModeBadge(keyResult.entryMode),
      targetBadge(keyResult.target),
      ...measurementStatusBadges(summary),
      lifecycleBadge(keyResult.status),
      ...(keyResult.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: [...buildBaseFields(keyResult.createdAt, keyResult.updatedAt), ...buildMeasurementFields(keyResult), { label: libraryLabel('planning.objects.fields.entryCount'), value: String(entries.length) }],
    linkedEntities: goal ? [{ id: goal.id, type: 'goal', label: goal.title }] : [],
    linkedPeriods: buildLinkedPeriods('keyResult', keyResult.id, deps, ctx),
    historyItems: buildHistory('keyResult', keyResult.id, deps, ctx),
    owner: goal ? { id: goal.id, title: goal.title, panelType: 'goal' } : undefined,
    isActive: keyResult.isActive,
    status: keyResult.status,
    formDefaults: {
      title: keyResult.title,
      description: keyResult.description ?? '',
      isActive: keyResult.isActive,
      status: keyResult.status,
      goalId: keyResult.goalId,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: keyResult.cadence,
      entryMode: keyResult.entryMode,
      target: keyResult.target,
    },
  }
}

function buildHabitPanel(
  habit: Habit,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('habit', habit.id)) ?? []
  const summary = getMeasurementSummaryForLibrary(habit, entries)

  return {
    id: habit.id,
    panelType: 'habit',
    title: habit.title,
    description: habit.description,
    badges: [
      cadenceBadge(habit.cadence),
      entryModeBadge(habit.entryMode),
      targetBadge(habit.target),
      ...measurementStatusBadges(summary),
      lifecycleBadge(habit.status),
      ...(habit.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: [...buildBaseFields(habit.createdAt, habit.updatedAt), ...buildMeasurementFields(habit), { label: libraryLabel('planning.objects.fields.entryCount'), value: String(entries.length) }],
    linkedEntities: buildLinkedEntities(habit.priorityIds, habit.lifeAreaIds, ctx),
    linkedPeriods: buildLinkedPeriods('habit', habit.id, deps, ctx),
    historyItems: buildHistory('habit', habit.id, deps, ctx),
    isActive: habit.isActive,
    status: habit.status,
    formDefaults: {
      title: habit.title,
      description: habit.description ?? '',
      isActive: habit.isActive,
      status: habit.status,
      priorityIds: [...habit.priorityIds],
      lifeAreaIds: [...habit.lifeAreaIds],
      cadence: habit.cadence,
      entryMode: habit.entryMode,
      target: habit.target,
    },
  }
}

function buildTrackerPanel(
  tracker: Tracker,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('tracker', tracker.id)) ?? []
  const summary = getMeasurementSummaryForLibrary(tracker, entries)

  return {
    id: tracker.id,
    panelType: 'tracker',
    title: tracker.title,
    description: tracker.description,
    badges: [
      cadenceBadge(tracker.cadence),
      entryModeBadge(tracker.entryMode),
      ...measurementStatusBadges(summary),
      lifecycleBadge(tracker.status),
      ...(tracker.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: [...buildBaseFields(tracker.createdAt, tracker.updatedAt), ...buildMeasurementFields(tracker), { label: libraryLabel('planning.objects.fields.entryCount'), value: String(entries.length) }],
    linkedEntities: buildLinkedEntities(tracker.priorityIds, tracker.lifeAreaIds, ctx),
    linkedPeriods: buildLinkedPeriods('tracker', tracker.id, deps, ctx),
    historyItems: buildHistory('tracker', tracker.id, deps, ctx),
    isActive: tracker.isActive,
    status: tracker.status,
    formDefaults: {
      title: tracker.title,
      description: tracker.description ?? '',
      isActive: tracker.isActive,
      status: tracker.status,
      priorityIds: [...tracker.priorityIds],
      lifeAreaIds: [...tracker.lifeAreaIds],
      cadence: tracker.cadence,
      entryMode: tracker.entryMode,
    },
  }
}

function buildInitiativePanel(
  initiative: Initiative,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  const linkedEntities = buildLinkedEntities(initiative.priorityIds, initiative.lifeAreaIds, ctx)
  const goal = initiative.goalId ? ctx.goalMap.get(initiative.goalId) : undefined
  if (goal) {
    linkedEntities.unshift({ id: goal.id, type: 'goal', label: goal.title })
  }

  return {
    id: initiative.id,
    panelType: 'initiative',
    title: initiative.title,
    description: initiative.description,
    badges: [
      lifecycleBadge(initiative.status),
      ...(initiative.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: buildBaseFields(initiative.createdAt, initiative.updatedAt),
    linkedEntities,
    linkedPeriods: buildLinkedPeriods('initiative', initiative.id, deps, ctx),
    historyItems: buildHistory('initiative', initiative.id, deps, ctx),
    isActive: initiative.isActive,
    status: initiative.status,
    formDefaults: {
      title: initiative.title,
      description: initiative.description ?? '',
      isActive: initiative.isActive,
      status: initiative.status,
      goalId: initiative.goalId,
      priorityIds: [...initiative.priorityIds],
      lifeAreaIds: [...initiative.lifeAreaIds],
    },
  }
}

export function parseObjectsLibraryQueryFromRoute(
  familyParam: string | string[] | undefined,
  routeQuery: Record<string, unknown>,
): ObjectsLibraryQuery {
  const composerMode =
    typeof routeQuery.composerMode === 'string' &&
    ['edit', 'create'].includes(routeQuery.composerMode)
      ? (routeQuery.composerMode as ObjectsLibraryComposerMode)
      : undefined
  const composerType =
    typeof routeQuery.composerType === 'string' &&
    ['goal', 'keyResult', 'habit', 'tracker', 'initiative'].includes(routeQuery.composerType)
      ? (routeQuery.composerType as ObjectsLibraryPanelType)
      : undefined
  const composerId =
    typeof routeQuery.composerId === 'string' ? routeQuery.composerId.trim() : undefined
  const composerParentType =
    routeQuery.composerParentType === 'goal' ? ('goal' as const) : undefined
  const composerParentId =
    typeof routeQuery.composerParentId === 'string'
      ? routeQuery.composerParentId.trim()
      : undefined
  const expandedType =
    typeof routeQuery.expandedType === 'string' &&
    ['goal', 'keyResult', 'habit', 'tracker', 'initiative'].includes(routeQuery.expandedType)
      ? (routeQuery.expandedType as ObjectsLibraryPanelType)
      : undefined
  const expandedId =
    typeof routeQuery.expandedId === 'string' ? routeQuery.expandedId.trim() : undefined
  const period =
    typeof routeQuery.period === 'string' && isPeriodRef(routeQuery.period)
      ? routeQuery.period
      : undefined
  const family = composerType
    ? getObjectsLibraryFamilyForPanelType(composerType)
    : expandedType
      ? getObjectsLibraryFamilyForPanelType(expandedType)
      : typeof familyParam === 'string' && isObjectsLibraryFamily(familyParam)
        ? familyParam
        : 'goals'

  return {
    family,
    q: typeof routeQuery.q === 'string' ? routeQuery.q : '',
    period: period as PeriodRef | undefined,
    lifeAreaIds: csvToIds(routeQuery.lifeAreas as string | string[] | null),
    priorityIds: csvToIds(routeQuery.priorities as string | string[] | null),
    showClosed: routeQuery.showClosed === '1',
    composerMode,
    composerType,
    composerId,
    composerParentType,
    composerParentId,
    expandedType,
    expandedId,
  }
}

export function serializeObjectsLibraryQueryToRoute(
  query: ObjectsLibraryQuery,
): Record<string, string> {
  const routeQuery: Record<string, string> = {}

  if (query.q.trim()) routeQuery.q = query.q.trim()
  if (query.period) routeQuery.period = query.period
  if (query.lifeAreaIds.length > 0) routeQuery.lifeAreas = query.lifeAreaIds.join(',')
  if (query.priorityIds.length > 0) routeQuery.priorities = query.priorityIds.join(',')
  if (query.showClosed) routeQuery.showClosed = '1'
  if (query.composerMode) routeQuery.composerMode = query.composerMode
  if (query.composerType) routeQuery.composerType = query.composerType
  if (query.composerId) routeQuery.composerId = query.composerId
  if (query.composerParentType) routeQuery.composerParentType = query.composerParentType
  if (query.composerParentId) routeQuery.composerParentId = query.composerParentId
  if (query.expandedType) routeQuery.expandedType = query.expandedType
  if (query.expandedId) routeQuery.expandedId = query.expandedId

  return routeQuery
}

function isObjectsLibraryFamily(value: string): value is ObjectsLibraryFamily {
  return ['goals', 'habits', 'trackers', 'initiatives'].includes(value)
}
