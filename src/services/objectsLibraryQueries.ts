import type { LifeArea } from '@/domain/lifeArea'
import type { PeriodRef, YearRef } from '@/domain/period'
import type {
  Goal,
  Habit,
  Initiative,
  KeyResult,
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  Priority,
  PriorityClosingReflection,
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
} from '@/services/measurementProgress'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { loadPlanningLibraryObjects } from '@/services/planningObjectCollections'
import { loadPlanningCached } from '@/services/planningQueryCache'
import { isGoalOpen } from '@/services/planningVisibility'
import { getPeriodRefsForDate, getPeriodType, isPeriodRef, periodIntersectsPeriod } from '@/utils/periods'

export type ObjectsLibraryFamily = 'priorities' | 'goals' | 'habits' | 'trackers' | 'initiatives'
export type ObjectsLibraryComposerMode = 'edit' | 'create'
export type ObjectsLibraryPanelType = 'priority' | 'goal' | 'keyResult' | 'habit' | 'tracker' | 'initiative'

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

export interface ObjectsLibraryChildPreview {
  id: string
  title: string
  description?: string
  cadence: 'weekly' | 'monthly'
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  status: string
  goalId: string
  isActive: boolean
  chartData: ObjectsLibraryChartPoint[]
}

export interface ObjectsLibraryChartPoint {
  periodRef: string
  actualValue: number | undefined
  targetValue: number | undefined
  status: 'met' | 'missed' | 'no-data' | 'no-target'
  isCurrent?: boolean
}

export interface ObjectsLibraryListItem {
  id: string
  panelType: ObjectsLibraryPanelType
  title: string
  description?: string
  icon?: string
  childPreviews?: ObjectsLibraryChildPreview[]
  status: string
  isActive: boolean
  priorityIds?: string[]
  lifeAreaIds?: string[]
  goalId?: string
  goalMonthRefs?: string[]
  years?: YearRef[]
  order?: number
  whyNow?: string
  desiredDirection?: string
  tradeoffs?: string
  progressSignals?: string[]
  riskSignals?: string[]
  closingReflection?: PriorityClosingReflection
  linkedCounts?: {
    goals: number
    habits: number
    trackers: number
    initiatives: number
  }
  cadence?: PlanningCadence
  entryMode?: MeasurementEntryMode
  ratingScaleMin?: number
  ratingScale?: number
  target?: MeasurementTarget
  chartData?: ObjectsLibraryChartPoint[]
  targetDate?: string
  successDefinition?: string
  whyMatters?: string
  confidenceRating?: number
  achievabilityRationale?: string
  obstacles?: string
  resources?: string
}

export interface ObjectsLibraryDetailRecord {
  id: string
  panelType: ObjectsLibraryPanelType
  title: string
  owner?: { id: string; title: string; panelType: 'goal' }
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
    years?: YearRef[]
    order?: number
    whyNow?: string
    desiredDirection?: string
    tradeoffs?: string
    progressSignals?: string[]
    riskSignals?: string[]
    closingReflection?: PriorityClosingReflection
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
  subjectEntryMap: Map<string, DailyMeasurementEntry[]>
}

const objectsLibraryBundleCache = new Map<
  string,
  { revision: number; value: ObjectsLibraryBundle | Promise<ObjectsLibraryBundle> }
>()

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

function buildSubjectKey(panelType: 'keyResult' | 'habit' | 'tracker', subjectId: string): string {
  return `${panelType}:${subjectId}`
}

function sortLibraryItems(left: ObjectsLibraryListItem, right: ObjectsLibraryListItem): number {
  if (left.panelType === 'priority' && right.panelType === 'priority') {
    const leftStatusWeight = left.status === 'active' ? 0 : left.status === 'draft' ? 1 : 2
    const rightStatusWeight = right.status === 'active' ? 0 : right.status === 'draft' ? 1 : 2
    return (
      leftStatusWeight - rightStatusWeight ||
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
      (right.years?.[0] ?? '').localeCompare(left.years?.[0] ?? '') ||
      left.title.localeCompare(right.title)
    )
  }

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

function matchesPriorityClosedFilter(status: Priority['status'], showClosed: boolean): boolean {
  return showClosed || status === 'active' || status === 'draft'
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

export function getObjectsLibraryFamilyPanelType(
  family: ObjectsLibraryFamily,
): Exclude<ObjectsLibraryPanelType, 'keyResult'> {
  switch (family) {
    case 'priorities':
      return 'priority'
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
    case 'priority':
      return 'priorities'
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
    libraryObjects,
    goalMonthStates,
    measurementMonthStates,
    measurementWeekStates,
    measurementDayAssignments,
    dailyMeasurementEntries,
    initiativePlanStates,
    periodReflections,
    objectReflections,
  ] = await Promise.all([
    loadPlanningLibraryObjects(),
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
    lifeAreas: libraryObjects.lifeAreas,
    priorities: libraryObjects.priorities,
    goals: libraryObjects.goals,
    keyResults: libraryObjects.keyResults,
    habits: libraryObjects.habits,
    trackers: libraryObjects.trackers,
    initiatives: libraryObjects.initiatives,
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

function buildObjectsLibraryCacheKey(query: ObjectsLibraryQuery): string {
  return JSON.stringify({
    family: query.family,
    q: query.q.trim(),
    period: query.period ?? null,
    lifeAreaIds: [...query.lifeAreaIds].sort(),
    priorityIds: [...query.priorityIds].sort(),
    showClosed: query.showClosed,
    composerMode: query.composerMode ?? null,
    composerType: query.composerType ?? null,
    composerId: query.composerId ?? null,
    composerParentType: query.composerParentType ?? null,
    composerParentId: query.composerParentId ?? null,
    expandedType: query.expandedType ?? null,
    expandedId: query.expandedId ?? null,
  })
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
    subjectEntryMap,
  }
}

function priorityLabel(priority: Priority): string {
  return `${priority.years.join(', ')} · ${priority.title}`
}

function compareActivePriorities(left: Priority, right: Priority): number {
  return (
    (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
    (left.years[0] ?? '').localeCompare(right.years[0] ?? '') ||
    left.title.localeCompare(right.title)
  )
}

function hasMeasurementRelevance(
  panelType: 'keyResult' | 'habit' | 'tracker',
  subjectId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
): boolean {
  if (!targetPeriod) {
    return true
  }

  const matchesSubject = (item: { subjectType: string; subjectId: string }) =>
    item.subjectType === panelType && item.subjectId === subjectId

  if (deps.measurementMonthStates.some((state) => matchesSubject(state) && matchesTargetPeriod(state.monthRef, targetPeriod))) return true
  if (deps.measurementWeekStates.some((state) => matchesSubject(state) && matchesTargetPeriod(state.weekRef, targetPeriod))) return true
  if (deps.measurementDayAssignments.some((assignment) => matchesSubject(assignment) && matchesTargetPeriod(assignment.dayRef, targetPeriod))) return true
  if (deps.dailyMeasurementEntries.some((entry) => matchesSubject(entry) && matchesTargetPeriod(entry.dayRef, targetPeriod))) return true
  if (deps.objectReflections.some((reflection) => matchesSubject(reflection) && matchesTargetPeriod(reflection.periodRef, targetPeriod))) return true

  return false
}

function hasInitiativeRelevance(
  initiativeId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
): boolean {
  if (!targetPeriod) {
    return true
  }

  const planState = deps.initiativePlanStates.find((item) => item.initiativeId === initiativeId)
  if (planState?.monthRef && matchesTargetPeriod(planState.monthRef, targetPeriod)) return true
  if (planState?.weekRef && matchesTargetPeriod(planState.weekRef, targetPeriod)) return true
  if (planState?.dayRef && matchesTargetPeriod(planState.dayRef, targetPeriod)) return true

  if (
    deps.objectReflections.some(
      (reflection) =>
        reflection.subjectType === 'initiative' &&
        reflection.subjectId === initiativeId &&
        matchesTargetPeriod(reflection.periodRef, targetPeriod),
    )
  ) {
    return true
  }

  return false
}

function hasGoalRelevance(
  goalId: string,
  targetPeriod: PeriodRef | undefined,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): boolean {
  if (!targetPeriod) {
    return true
  }

  if (deps.goalMonthStates.some((state) => state.goalId === goalId && matchesTargetPeriod(state.monthRef, targetPeriod))) return true

  if (
    deps.objectReflections.some(
      (reflection) =>
        reflection.subjectType === 'goal' &&
        reflection.subjectId === goalId &&
        matchesTargetPeriod(reflection.periodRef, targetPeriod),
    )
  ) {
    return true
  }

  const linkedKeyResults = ctx.keyResultsByGoalId.get(goalId) ?? []
  if (linkedKeyResults.some((kr) => hasMeasurementRelevance('keyResult', kr.id, targetPeriod, deps))) return true

  if (deps.initiatives.some((initiative) => initiative.goalId === goalId && hasInitiativeRelevance(initiative.id, targetPeriod, deps))) return true

  if (getPeriodType(targetPeriod) === 'year') {
    const goal = ctx.goalMap.get(goalId)
    if (goal) {
      for (const priorityId of goal.priorityIds) {
        const priority = ctx.priorityMap.get(priorityId)
        if (priority?.years.includes(targetPeriod as YearRef)) {
          return true
        }
      }
    }
  }

  return false
}

function buildChartData(
  subject: MeasureableSubject,
  subjectType: 'keyResult' | 'habit' | 'tracker',
  allEntries: DailyMeasurementEntry[],
  measurementMonthStates: MeasurementMonthState[],
  measurementWeekStates: MeasurementWeekState[],
): ObjectsLibraryChartPoint[] {
  const hasTarget = 'target' in subject

  const activePeriodRefs: string[] = []
  if (subject.cadence === 'monthly') {
    for (const state of measurementMonthStates) {
      if (state.subjectType === subjectType && state.subjectId === subject.id && state.activityState === 'active') {
        activePeriodRefs.push(state.monthRef)
      }
    }
  } else {
    for (const state of measurementWeekStates) {
      if (state.subjectType === subjectType && state.subjectId === subject.id && state.activityState === 'active') {
        activePeriodRefs.push(state.weekRef)
      }
    }
  }

  if (activePeriodRefs.length === 0) {
    return []
  }

  const currentRefs = getPeriodRefsForDate(new Date())
  const currentRef = subject.cadence === 'monthly' ? currentRefs.month : currentRefs.week
  const sortedRefs = [...activePeriodRefs]
    .filter((ref) => ref <= currentRef)
    .sort((a, b) => a.localeCompare(b))

  if (sortedRefs.length === 0) {
    return []
  }

  return sortedRefs.map((periodRef) => {
    const summary = buildMeasurementSummary(subject, allEntries, periodRef as MeasurementPeriodRef)
    const targetValue = hasTarget ? (subject as { target: { value: number } }).target.value : undefined

    let status: ObjectsLibraryChartPoint['status']
    if (summary.entryCount === 0) {
      status = 'no-data'
    } else if (!hasTarget) {
      status = 'no-target'
    } else if (summary.evaluationStatus === 'met') {
      status = 'met'
    } else if (summary.evaluationStatus === 'missed') {
      status = 'missed'
    } else {
      status = 'no-data'
    }

    return {
      periodRef,
      actualValue: summary.actualValue,
      targetValue,
      status,
    }
  })
}

function buildFamilyItems(
  query: ObjectsLibraryQuery,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem[] {
  switch (query.family) {
    case 'priorities':
      return deps.priorities
        .filter((priority) => matchesPriorityFilters(priority, query))
        .map((priority) => buildPriorityListItem(priority, deps))
        .sort(sortLibraryItems)
    case 'goals':
      return deps.goals
        .filter((goal) => matchesGoalFilters(goal, query, deps, ctx))
        .map((goal) => buildGoalListItem(goal, deps, ctx))
        .sort(sortLibraryItems)
    case 'habits':
      return deps.habits
        .filter((habit) => matchesStandaloneFilters(habit, query))
        .filter((habit) => matchesQueryText(query.q, [habit.title, habit.description]))
        .filter((habit) => hasMeasurementRelevance('habit', habit.id, query.period, deps))
        .map((habit) => buildHabitListItem(habit, deps, ctx))
        .sort(sortLibraryItems)
    case 'trackers':
      return deps.trackers
        .filter((tracker) => matchesStandaloneFilters(tracker, query))
        .filter((tracker) => matchesQueryText(query.q, [tracker.title, tracker.description]))
        .filter((tracker) => hasMeasurementRelevance('tracker', tracker.id, query.period, deps))
        .map((tracker) => buildTrackerListItem(tracker, deps, ctx))
        .sort(sortLibraryItems)
    case 'initiatives':
      return deps.initiatives
        .filter((initiative) => matchesStandaloneFilters(initiative, query))
        .filter((initiative) => matchesQueryText(query.q, [initiative.title, initiative.description]))
        .filter((initiative) => hasInitiativeRelevance(initiative.id, query.period, deps))
        .map((initiative) => buildInitiativeListItem(initiative))
        .sort(sortLibraryItems)
  }
}

function getFamilyTotalCount(
  family: ObjectsLibraryFamily,
  deps: ObjectsLibraryDependencies,
): number {
  switch (family) {
    case 'priorities':
      return deps.priorities.length
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
    case 'priority': {
      const priority = deps.priorities.find((item) => item.id === panelId)
      return priority ? buildPriorityPanel(priority) : undefined
    }
    case 'goal': {
      const goal = deps.goals.find((item) => item.id === panelId)
      return goal ? buildGoalPanel(goal) : undefined
    }
    case 'keyResult': {
      const keyResult = deps.keyResults.find((item) => item.id === panelId)
      return keyResult ? buildKeyResultPanel(keyResult, ctx) : undefined
    }
    case 'habit': {
      const habit = deps.habits.find((item) => item.id === panelId)
      return habit ? buildHabitPanel(habit) : undefined
    }
    case 'tracker': {
      const tracker = deps.trackers.find((item) => item.id === panelId)
      return tracker ? buildTrackerPanel(tracker) : undefined
    }
    case 'initiative': {
      const initiative = deps.initiatives.find((item) => item.id === panelId)
      return initiative ? buildInitiativePanel(initiative) : undefined
    }
  }
}

export async function loadObjectsLibraryBundle(
  query: ObjectsLibraryQuery,
): Promise<ObjectsLibraryBundle> {
  return loadPlanningCached(objectsLibraryBundleCache, buildObjectsLibraryCacheKey(query), async () => {
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
          .filter((priority) => priority.status === 'active')
          .sort(compareActivePriorities)
          .map((priority) => ({ id: priority.id, label: priorityLabel(priority) })),
        goals: deps.goals
          .filter(isGoalOpen)
          .sort((left, right) => left.title.localeCompare(right.title))
          .map((goal) => ({ id: goal.id, label: goal.title })),
      },
    }
  })
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

function matchesPriorityFilters(priority: Priority, query: ObjectsLibraryQuery): boolean {
  return (
    matchesLinkFilters(priority.lifeAreaIds, query.lifeAreaIds) &&
    (query.priorityIds.length === 0 || query.priorityIds.includes(priority.id)) &&
    matchesPriorityClosedFilter(priority.status, query.showClosed) &&
    matchesQueryText(query.q, [
      priority.title,
      priority.description,
      priority.whyNow,
      priority.desiredDirection,
      priority.tradeoffs,
      ...priority.progressSignals,
      ...priority.riskSignals,
    ]) &&
    (!query.period || priorityMatchesPeriod(priority, query.period))
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
    hasGoalRelevance(goal.id, query.period, deps, ctx) &&
    (query.showClosed || goal.status === 'open' || anyChildOpen || goal.isActive)
  )
}

function priorityMatchesPeriod(priority: Priority, periodRef: PeriodRef): boolean {
  const year = periodRef.slice(0, 4) as YearRef
  return priority.years.includes(year)
}

function priorityLinkedCounts(
  priorityId: string,
  deps: ObjectsLibraryDependencies,
): NonNullable<ObjectsLibraryListItem['linkedCounts']> {
  return {
    goals: deps.goals.filter((item) => item.priorityIds.includes(priorityId)).length,
    habits: deps.habits.filter((item) => item.priorityIds.includes(priorityId)).length,
    trackers: deps.trackers.filter((item) => item.priorityIds.includes(priorityId)).length,
    initiatives: deps.initiatives.filter((item) => item.priorityIds.includes(priorityId)).length,
  }
}

function buildPriorityListItem(
  priority: Priority,
  deps: ObjectsLibraryDependencies,
): ObjectsLibraryListItem {
  return {
    id: priority.id,
    panelType: 'priority',
    title: priority.title,
    icon: priority.icon,
    status: priority.status,
    isActive: priority.status === 'active',
    lifeAreaIds: [...priority.lifeAreaIds],
    years: [...priority.years],
    order: priority.order,
    whyNow: priority.whyNow ?? priority.description,
    desiredDirection: priority.desiredDirection,
    tradeoffs: priority.tradeoffs,
    progressSignals: [...priority.progressSignals],
    riskSignals: [...priority.riskSignals],
    closingReflection: priority.closingReflection,
    linkedCounts: priorityLinkedCounts(priority.id, deps),
  }
}

function buildGoalListItem(
  goal: Goal,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const keyResults = ctx.keyResultsByGoalId.get(goal.id) ?? []

  return {
    id: goal.id,
    panelType: 'goal',
    title: goal.title,
    icon: goal.icon,
    childPreviews: keyResults.map((item) => {
      const krEntries = ctx.subjectEntryMap.get(buildSubjectKey('keyResult', item.id)) ?? []
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        cadence: item.cadence,
        entryMode: item.entryMode,
        target: item.target,
        status: item.status,
        goalId: goal.id,
        isActive: item.isActive,
        chartData: buildChartData(item, 'keyResult', krEntries, deps.measurementMonthStates, deps.measurementWeekStates),
      }
    }),
    status: goal.status,
    isActive: goal.isActive,
    priorityIds: [...goal.priorityIds],
    lifeAreaIds: [...goal.lifeAreaIds],
    goalMonthRefs: deps.goalMonthStates
      .filter((s) => s.goalId === goal.id)
      .map((s) => s.monthRef),
    description: goal.description,
    targetDate: goal.targetDate,
    successDefinition: goal.successDefinition,
    whyMatters: goal.whyMatters,
    confidenceRating: goal.confidenceRating,
    achievabilityRationale: goal.achievabilityRationale,
    obstacles: goal.obstacles,
    resources: goal.resources,
  }
}

function buildHabitListItem(
  habit: Habit,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('habit', habit.id)) ?? []

  return {
    id: habit.id,
    panelType: 'habit',
    title: habit.title,
    description: habit.description,
    icon: habit.icon,
    status: habit.status,
    isActive: habit.isActive,
    priorityIds: [...habit.priorityIds],
    lifeAreaIds: [...habit.lifeAreaIds],
    cadence: habit.cadence,
    entryMode: habit.entryMode,
    ratingScaleMin: habit.ratingScaleMin,
    ratingScale: habit.ratingScale,
    target: habit.target,
    chartData: buildChartData(habit, 'habit', entries, deps.measurementMonthStates, deps.measurementWeekStates),
  }
}

function buildTrackerListItem(
  tracker: Tracker,
  deps: ObjectsLibraryDependencies,
  ctx: ObjectRefContext,
): ObjectsLibraryListItem {
  const entries = ctx.subjectEntryMap.get(buildSubjectKey('tracker', tracker.id)) ?? []

  return {
    id: tracker.id,
    panelType: 'tracker',
    title: tracker.title,
    description: tracker.description,
    icon: tracker.icon,
    status: tracker.status,
    isActive: tracker.isActive,
    priorityIds: [...tracker.priorityIds],
    lifeAreaIds: [...tracker.lifeAreaIds],
    cadence: tracker.cadence,
    entryMode: tracker.entryMode,
    ratingScaleMin: tracker.ratingScaleMin,
    ratingScale: tracker.ratingScale,
    chartData: buildChartData(tracker, 'tracker', entries, deps.measurementMonthStates, deps.measurementWeekStates),
  }
}

function buildInitiativeListItem(initiative: Initiative): ObjectsLibraryListItem {
  return {
    id: initiative.id,
    panelType: 'initiative',
    title: initiative.title,
    status: initiative.status,
    isActive: initiative.isActive,
    goalId: initiative.goalId,
    priorityIds: initiative.priorityIds,
    lifeAreaIds: initiative.lifeAreaIds,
  }
}

function buildGoalPanel(goal: Goal): ObjectsLibraryDetailRecord {
  return {
    id: goal.id,
    panelType: 'goal',
    title: goal.title,
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

function buildPriorityPanel(priority: Priority): ObjectsLibraryDetailRecord {
  return {
    id: priority.id,
    panelType: 'priority',
    title: priority.title,
    formDefaults: {
      title: priority.title,
      description: priority.description ?? '',
      isActive: priority.status === 'active',
      status: priority.status,
      priorityIds: [],
      lifeAreaIds: [...priority.lifeAreaIds],
      years: [...priority.years],
      order: priority.order,
      whyNow: priority.whyNow,
      desiredDirection: priority.desiredDirection,
      tradeoffs: priority.tradeoffs,
      progressSignals: [...priority.progressSignals],
      riskSignals: [...priority.riskSignals],
      closingReflection: priority.closingReflection,
    },
  }
}

function buildKeyResultPanel(
  keyResult: KeyResult,
  ctx: ObjectRefContext,
): ObjectsLibraryDetailRecord {
  const goal = ctx.goalMap.get(keyResult.goalId)

  return {
    id: keyResult.id,
    panelType: 'keyResult',
    title: keyResult.title,
    owner: goal ? { id: goal.id, title: goal.title, panelType: 'goal' } : undefined,
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

function buildHabitPanel(habit: Habit): ObjectsLibraryDetailRecord {
  return {
    id: habit.id,
    panelType: 'habit',
    title: habit.title,
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

function buildTrackerPanel(tracker: Tracker): ObjectsLibraryDetailRecord {
  return {
    id: tracker.id,
    panelType: 'tracker',
    title: tracker.title,
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

function buildInitiativePanel(initiative: Initiative): ObjectsLibraryDetailRecord {
  return {
    id: initiative.id,
    panelType: 'initiative',
    title: initiative.title,
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
    ['priority', 'goal', 'keyResult', 'habit', 'tracker', 'initiative'].includes(routeQuery.composerType)
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
    ['priority', 'goal', 'keyResult', 'habit', 'tracker', 'initiative'].includes(routeQuery.expandedType)
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
  return ['priorities', 'goals', 'habits', 'trackers', 'initiatives'].includes(value)
}
