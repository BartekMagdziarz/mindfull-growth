import type { LifeArea } from '@/domain/lifeArea'
import type { PeriodRef, PeriodType } from '@/domain/period'
import type {
  Goal,
  Habit,
  Initiative,
  KeyResult,
  Priority,
  Tracker,
} from '@/domain/planning'
import type {
  CadencedDayAssignment,
  CadencedMonthState,
  CadencedWeekState,
  GoalMonthState,
  InitiativePlanState,
  PeriodObjectReflection,
  PeriodReflection,
  TrackerEntry,
  TrackerMonthState,
  TrackerWeekState,
} from '@/domain/planningState'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { comparePeriodRefs, getPeriodType, isPeriodRef, periodIntersectsPeriod } from '@/utils/periods'

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
    | 'goal-reflection'
    | 'cadenced-month-state'
    | 'cadenced-week-state'
    | 'day-assignment'
    | 'tracker-month-state'
    | 'tracker-week-state'
    | 'tracker-entry'
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
    analysisPeriod?: 'week' | 'month'
    entryMode?: 'day' | 'week' | 'month'
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
  cadencedMonthStates: CadencedMonthState[]
  cadencedWeekStates: CadencedWeekState[]
  dayAssignments: CadencedDayAssignment[]
  initiativePlanStates: InitiativePlanState[]
  trackerMonthStates: TrackerMonthState[]
  trackerWeekStates: TrackerWeekState[]
  trackerEntries: TrackerEntry[]
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
    cadencedMonthStates,
    cadencedWeekStates,
    dayAssignments,
    initiativePlanStates,
    trackerMonthStates,
    trackerWeekStates,
    trackerEntries,
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
    planningStateDexieRepository.listCadencedMonthStates(),
    planningStateDexieRepository.listCadencedWeekStates(),
    planningStateDexieRepository.listCadencedDayAssignments(),
    planningStateDexieRepository.listInitiativePlanStates(),
    planningStateDexieRepository.listTrackerMonthStates(),
    planningStateDexieRepository.listTrackerWeekStates(),
    planningStateDexieRepository.listTrackerEntries(),
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
    cadencedMonthStates,
    cadencedWeekStates,
    dayAssignments,
    initiativePlanStates,
    trackerMonthStates,
    trackerWeekStates,
    trackerEntries,
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

  return {
    priorityMap,
    lifeAreaMap,
    goalMap,
    keyResultsByGoalId,
    initiativePlanStateById,
    periodReflectionMap,
    objectReflectionMap,
  }
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
        .filter((habit) =>
          matchesPeriodFilter(getCadencedRelevance('habit', habit.id, query.period, deps), query.period),
        )
        .map((habit) => buildHabitListItem(habit, query, deps, ctx))
        .sort(sortLibraryItems)
    case 'trackers':
      return deps.trackers
        .filter((tracker) => matchesStandaloneFilters(tracker, query))
        .filter((tracker) => matchesQueryText(query.q, [tracker.title, tracker.description]))
        .filter((tracker) => matchesPeriodFilter(getTrackerRelevance(tracker.id, query.period, deps), query.period))
        .map((tracker) => buildTrackerListItem(tracker, query, deps, ctx))
        .sort(sortLibraryItems)
    case 'initiatives':
      return deps.initiatives
        .filter((initiative) => matchesStandaloneFilters(initiative, query))
        .filter((initiative) => matchesQueryText(query.q, [initiative.title, initiative.description]))
        .filter((initiative) =>
          matchesPeriodFilter(getInitiativeRelevance(initiative.id, query.period, deps), query.period),
        )
        .map((initiative) => buildInitiativeListItem(initiative, query, deps, ctx))
        .sort(sortLibraryItems)
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

  const linkedLifeAreaIds = new Set(goal.lifeAreaIds)
  const linkedPriorityIds = new Set(goal.priorityIds)
  const anyChildOpen = ownedKeyResults.some((item) => matchesClosedFilter(item.isActive, item.status, query.showClosed))

  return (
    matchesLinkFilters(Array.from(linkedPriorityIds), query.priorityIds) &&
    matchesLinkFilters(Array.from(linkedLifeAreaIds), query.lifeAreaIds) &&
    matchesClosedFilter(goal.isActive, goal.status, query.showClosed) &&
    matchesText &&
    matchesPeriodFilter(getGoalRelevance(goal.id, query.period, deps, ctx), query.period) &&
    (query.showClosed || goal.status === 'open' || anyChildOpen || goal.isActive)
  )
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

function matchesPeriodFilter(reasons: ObjectsLibraryMatchReason[], period?: PeriodRef): boolean {
  return !period || reasons.length > 0
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
        kind: 'goal-reflection',
        label: libraryLabel('planning.objects.reason.objectReflection'),
        periodRef: reflection.periodRef,
        periodType: reflection.periodType,
      })
    }
  }

  const linkedKeyResults = ctx.keyResultsByGoalId.get(goalId) ?? []
  for (const keyResult of linkedKeyResults) {
    for (const reason of getCadencedRelevance('keyResult', keyResult.id, targetPeriod, deps)) {
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

function getCadencedRelevance(
  subjectType: 'keyResult' | 'habit',
  subjectId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
): ObjectsLibraryMatchReason[] {
  const reasons: ObjectsLibraryMatchReason[] = []

  for (const state of deps.cadencedMonthStates.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(state.monthRef, targetPeriod)) {
      reasons.push({
        kind: 'cadenced-month-state',
        label: libraryLabel('planning.objects.reason.activeThisMonth'),
        periodRef: state.monthRef,
        periodType: 'month',
      })
    }
  }

  for (const state of deps.cadencedWeekStates.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(state.weekRef, targetPeriod)) {
      reasons.push({
        kind: 'cadenced-week-state',
        label: libraryLabel('planning.objects.reason.scheduledThisWeek'),
        periodRef: state.weekRef,
        periodType: 'week',
      })
    }
  }

  for (const assignment of deps.dayAssignments.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )) {
    if (matchesTargetPeriod(assignment.dayRef, targetPeriod)) {
      reasons.push({
        kind: 'day-assignment',
        label: libraryLabel('planning.objects.reason.scheduledThisDay'),
        periodRef: assignment.dayRef,
        periodType: 'day',
      })
    }
  }

  for (const reflection of deps.objectReflections.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
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

function getTrackerRelevance(
  trackerId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
): ObjectsLibraryMatchReason[] {
  const reasons: ObjectsLibraryMatchReason[] = []

  for (const state of deps.trackerMonthStates.filter((item) => item.trackerId === trackerId)) {
    if (matchesTargetPeriod(state.monthRef, targetPeriod)) {
      reasons.push({
        kind: 'tracker-month-state',
        label: libraryLabel('planning.objects.reason.trackedThisMonth'),
        periodRef: state.monthRef,
        periodType: 'month',
      })
    }
  }

  for (const state of deps.trackerWeekStates.filter((item) => item.trackerId === trackerId)) {
    if (matchesTargetPeriod(state.weekRef, targetPeriod)) {
      reasons.push({
        kind: 'tracker-week-state',
        label: libraryLabel('planning.objects.reason.trackedThisWeek'),
        periodRef: state.weekRef,
        periodType: 'week',
      })
    }
  }

  for (const entry of deps.trackerEntries.filter((item) => item.trackerId === trackerId)) {
    if (matchesTargetPeriod(entry.periodRef, targetPeriod)) {
      reasons.push({
        kind: 'tracker-entry',
        label: libraryLabel('planning.objects.reason.trackedThisPeriod'),
        periodRef: entry.periodRef,
        periodType: entry.periodType,
      })
    }
  }

  for (const reflection of deps.objectReflections.filter(
    (item) => item.subjectType === 'tracker' && item.subjectId === trackerId,
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

function matchesTargetPeriod(candidatePeriod: PeriodRef, targetPeriod?: PeriodRef): boolean {
  return !targetPeriod || periodIntersectsPeriod(candidatePeriod, targetPeriod)
}

function dedupeReasons(reasons: ObjectsLibraryMatchReason[]): ObjectsLibraryMatchReason[] {
  const seen = new Set<string>()
  return reasons
    .filter((reason) => {
      const key =
        `${reason.kind}:${reason.periodType ?? 'none'}:${reason.periodRef ?? 'none'}:` +
        serializeLibraryLabel(reason.label)
      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((left, right) => {
      if (left.periodRef && right.periodRef) {
        return comparePeriodRefs(right.periodRef, left.periodRef)
      }

      if (left.periodRef) return -1
      if (right.periodRef) return 1
      return serializeLibraryLabel(left.label).localeCompare(serializeLibraryLabel(right.label))
    })
}

function buildGoalListItem(
  goal: Goal,
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const keyResults = (ctx.keyResultsByGoalId.get(goal.id) ?? []).filter((item) =>
    query.showClosed ? true : item.isActive && item.status === 'open',
  )
  const matchReasons = getGoalRelevance(goal.id, query.period, deps, ctx)

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
    details: [libraryLabel('planning.objects.details.keyResults', { n: keyResults.length })],
    linkedEntities: linkedEntityLabels(goal.priorityIds, goal.lifeAreaIds, ctx),
    matchReasons,
    childPreviews: keyResults.slice(0, 3).map((item) => ({
      id: item.id,
      type: 'keyResult',
      title: item.title,
      badges: [cadenceBadge(item.cadence), lifecycleBadge(item.status)],
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
  const matchReasons = getCadencedRelevance('habit', habit.id, query.period, deps)

  return {
    id: habit.id,
    panelType: 'habit',
    title: habit.title,
    description: habit.description,
    eyebrow: libraryLabel('planning.objects.labels.habit'),
    badges: [
      cadenceBadge(habit.cadence),
      lifecycleBadge(habit.status),
      ...(habit.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
      ...matchReasonBadges(matchReasons),
    ],
    details: buildCadencedSummaryDetails(habit.id, 'habit', deps),
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
  const entries = deps.trackerEntries.filter((entry) => entry.trackerId === tracker.id)
  const latestEntry = entries.at(-1)
  const matchReasons = getTrackerRelevance(tracker.id, query.period, deps)

  return {
    id: tracker.id,
    panelType: 'tracker',
    title: tracker.title,
    description: tracker.description,
    eyebrow: libraryLabel('planning.objects.labels.tracker'),
    badges: [
      {
        label: libraryLabel(
          tracker.analysisPeriod === 'month'
            ? 'planning.objects.badges.analysisPeriod.month'
            : 'planning.objects.badges.analysisPeriod.week',
        ),
        tone: 'accent',
      },
      { label: libraryLabel(`planning.objects.badges.entryMode.${tracker.entryMode}`) },
      lifecycleBadge(tracker.status),
      ...(tracker.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
      ...matchReasonBadges(matchReasons),
    ],
    details: latestEntry
      ? [
          libraryLabel('planning.objects.details.latestValue', { value: String(latestEntry.value) }),
          libraryLabel('planning.objects.details.entryCount', { n: entries.length }),
        ]
      : [libraryLabel('planning.objects.details.noEntries')],
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
    details: buildInitiativeSummaryDetails(planState),
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
    badges: [cadenceBadge(item.cadence), lifecycleBadge(item.status)],
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

  return {
    id: keyResult.id,
    panelType: 'keyResult',
    title: keyResult.title,
    description: keyResult.description,
    badges: [
      cadenceBadge(keyResult.cadence),
      lifecycleBadge(keyResult.status),
      ...(keyResult.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: buildBaseFields(keyResult.createdAt, keyResult.updatedAt),
    linkedEntities: goal
      ? [{ id: goal.id, type: 'goal', label: goal.title }]
      : [],
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
    },
  }
}

function buildHabitPanel(
  habit: Habit,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  return {
    id: habit.id,
    panelType: 'habit',
    title: habit.title,
    description: habit.description,
    badges: [
      cadenceBadge(habit.cadence),
      lifecycleBadge(habit.status),
      ...(habit.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: buildBaseFields(habit.createdAt, habit.updatedAt),
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
    },
  }
}

function buildTrackerPanel(
  tracker: Tracker,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  return {
    id: tracker.id,
    panelType: 'tracker',
    title: tracker.title,
    description: tracker.description,
    badges: [
      {
        label: libraryLabel(
          tracker.analysisPeriod === 'month'
            ? 'planning.objects.badges.analysisPeriod.month'
            : 'planning.objects.badges.analysisPeriod.week',
        ),
        tone: 'accent',
      },
      { label: libraryLabel(`planning.objects.badges.entryMode.${tracker.entryMode}`) },
      lifecycleBadge(tracker.status),
      ...(tracker.isActive ? [] : [{ label: libraryLabel('planning.objects.badges.archived'), tone: 'warning' as const }]),
    ],
    fields: buildBaseFields(tracker.createdAt, tracker.updatedAt),
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
      analysisPeriod: tracker.analysisPeriod,
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
    owner: goal ? { id: goal.id, title: goal.title, panelType: 'goal' } : undefined,
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

function buildBaseFields(
  createdAt: string,
  updatedAt: string,
): Array<{ label: ObjectsLibraryLabel; value: string; valueType?: 'date' }> {
  return [
    {
      label: libraryLabel('planning.objects.fields.created'),
      value: createdAt,
      valueType: 'date',
    },
    {
      label: libraryLabel('planning.objects.fields.updated'),
      value: updatedAt,
      valueType: 'date',
    },
  ]
}

function buildCadencedSummaryDetails(
  subjectId: string,
  subjectType: 'keyResult' | 'habit',
  deps: ObjectsLibraryDependencies,
): ObjectsLibraryLabel[] {
  const monthStates = deps.cadencedMonthStates.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )
  const weekStates = deps.cadencedWeekStates.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )
  const dayAssignments = deps.dayAssignments.filter(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )

  const details: ObjectsLibraryLabel[] = []
  if (monthStates.length > 0) {
    details.push(libraryLabel('planning.objects.details.monthStates', { n: monthStates.length }))
  }
  if (weekStates.length > 0) {
    details.push(libraryLabel('planning.objects.details.weekStates', { n: weekStates.length }))
  }
  if (dayAssignments.length > 0) {
    details.push(libraryLabel('planning.objects.details.dayAssignments', { n: dayAssignments.length }))
  }
  return details.length > 0 ? details : [libraryLabel('planning.objects.details.noPlanningState')]
}

function buildInitiativeSummaryDetails(planState?: InitiativePlanState): ObjectsLibraryLabel[] {
  if (!planState) {
    return [libraryLabel('planning.objects.details.noPeriodPlacement')]
  }

  const details: ObjectsLibraryLabel[] = []
  if (planState.monthRef) details.push(libraryLabel('planning.objects.details.scheduledMonth'))
  if (planState.weekRef) details.push(libraryLabel('planning.objects.details.scheduledWeek'))
  if (planState.dayRef) details.push(libraryLabel('planning.objects.details.scheduledDay'))
  return details
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

    const periodType = getPeriodType(periodRef)
    periods.set(key, {
      key,
      periodRef,
      periodType,
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
          add(
            item.periodRef,
            getPrimaryLinkedPeriodSource(item.sources),
            libraryLabel('planning.objects.reason.linkedKeyResult'),
          )
        }
      }
      for (const initiative of deps.initiatives.filter((item) => item.goalId === subjectId)) {
        for (const item of buildLinkedPeriods('initiative', initiative.id, deps, ctx)) {
          add(
            item.periodRef,
            getPrimaryLinkedPeriodSource(item.sources),
            libraryLabel('planning.objects.reason.linkedInitiative'),
          )
        }
      }
      break
    case 'keyResult':
    case 'habit': {
      const subjectType = panelType === 'keyResult' ? 'keyResult' : 'habit'
      for (const state of deps.cadencedMonthStates.filter(
        (item) => item.subjectType === subjectType && item.subjectId === subjectId,
      )) {
        add(state.monthRef, 'plan', libraryLabel('planning.objects.reason.activeThisMonth'))
      }
      for (const state of deps.cadencedWeekStates.filter(
        (item) => item.subjectType === subjectType && item.subjectId === subjectId,
      )) {
        add(state.weekRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisWeek'))
      }
      for (const assignment of deps.dayAssignments.filter(
        (item) => item.subjectType === subjectType && item.subjectId === subjectId,
      )) {
        add(assignment.dayRef, 'plan', libraryLabel('planning.objects.reason.scheduledThisDay'))
      }
      break
    }
    case 'tracker':
      for (const state of deps.trackerMonthStates.filter((item) => item.trackerId === subjectId)) {
        add(state.monthRef, 'plan', libraryLabel('planning.objects.reason.trackedThisMonth'))
      }
      for (const state of deps.trackerWeekStates.filter((item) => item.trackerId === subjectId)) {
        add(state.weekRef, 'plan', libraryLabel('planning.objects.reason.trackedThisWeek'))
      }
      for (const entry of deps.trackerEntries.filter((item) => item.trackerId === subjectId)) {
        add(entry.periodRef, 'progress', libraryLabel('planning.objects.reason.trackedThisPeriod'))
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
    const periodReflection = ctx.periodReflectionMap.get(
      `${item.periodType === 'month' || item.periodType === 'week' ? item.periodType : 'week'}:${item.periodRef}`,
    )
    if (periodReflection && !item.sources.includes('period-reflection')) {
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

function getObjectReflections(
  panelType: ObjectsLibraryPanelType,
  subjectId: string,
  ctx: ObjectRefContext,
): PeriodObjectReflection[] {
  return ctx.objectReflectionMap.get(`${panelType}:${subjectId}`) ?? []
}

function getPrimaryLinkedPeriodSource(
  sources: ObjectsLibraryLinkedPeriodSource[],
): Exclude<ObjectsLibraryLinkedPeriodSource, 'period-reflection'> {
  return sources.find((source) => source !== 'period-reflection') ?? 'plan'
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
