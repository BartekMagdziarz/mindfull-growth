import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Goal, Initiative, Habit, KeyResult, Tracker } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  GoalMonthState,
  InitiativePlanState,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
  MonthPlan,
  PeriodActivityState,
  PeriodObjectReflection,
  PeriodReflection,
  WeekPlan,
} from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import {
  buildMeasurementSummary,
  type MeasurementSummary,
  type MeasureableSubject,
} from '@/services/measurementProgress'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { loadPlanningCached } from '@/services/planningQueryCache'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'

export type WeekMeasurementPlacement = 'planned' | 'assigned' | 'unassigned'

export interface MonthGoalPlanningItem {
  goal: Goal
  state: GoalMonthState
}

export interface MeasurementPlanningSummary {
  activityState?: PeriodActivityState
  scheduleScope?: MeasurementMonthState['scheduleScope'] | MeasurementWeekState['scheduleScope']
  scheduledDayRefs: DayRef[]
  successNote?: string
}

export interface MonthMeasurementPlanningItem {
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  planning: MeasurementPlanningSummary
  measurement?: MeasurementSummary
  sourceMonthRef?: MonthRef
  relatedWeekCount: number
}

export type MonthCadencedPlanningItem = MonthMeasurementPlanningItem & {
  subjectType: 'keyResult' | 'habit'
  subject: KeyResult | Habit
}

export type MonthTrackerPlanningItem = MonthMeasurementPlanningItem & {
  subjectType: 'tracker'
  subject: Tracker
}

export interface MonthInitiativePlanningItem {
  initiative: Initiative
  planState: InitiativePlanState
}

export interface MonthPlanningBundle {
  monthRef: MonthRef
  monthPlan?: MonthPlan
  goalItems: MonthGoalPlanningItem[]
  measurementItems: MonthMeasurementPlanningItem[]
  cadencedItems: MonthCadencedPlanningItem[]
  trackerItems: MonthTrackerPlanningItem[]
  initiativeItems: MonthInitiativePlanningItem[]
}

export interface WeekMeasurementPlanningItem {
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  sourceMonthRef?: MonthRef
  planning: MeasurementPlanningSummary
  measurement: MeasurementSummary
  placement: WeekMeasurementPlacement
}

export type WeekCadencedPlanningItem = WeekMeasurementPlanningItem & {
  subjectType: 'keyResult' | 'habit'
  subject: KeyResult | Habit
}

export type WeekTrackerPlanningItem = WeekMeasurementPlanningItem & {
  subjectType: 'tracker'
  subject: Tracker
}

export interface WeekMeasurementReflectionItem {
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  sourceMonthRef?: MonthRef
  planning: MeasurementPlanningSummary
  measurement: MeasurementSummary
  hasEntries: boolean
  isScheduled: boolean
}

export type WeekCadencedReflectionItem = WeekMeasurementReflectionItem & {
  subjectType: 'keyResult' | 'habit'
  subject: KeyResult | Habit
}

export type WeekTrackerReflectionItem = WeekMeasurementReflectionItem & {
  subjectType: 'tracker'
  subject: Tracker
}

export interface WeekInitiativePlanningItem {
  initiative: Initiative
  planState: InitiativePlanState
  placement: WeekMeasurementPlacement
}

export interface WeekGoalReflectionItem {
  goal: Goal
  monthStates: GoalMonthState[]
}

export interface WeekInitiativeReflectionItem {
  initiative: Initiative
  planState: InitiativePlanState
}

export interface WeekRelevantObjects {
  weekRef: WeekRef
  overlappingMonthRefs: MonthRef[]
  planning: {
    measurementItems: WeekMeasurementPlanningItem[]
    cadencedItems: WeekCadencedPlanningItem[]
    trackerItems: WeekTrackerPlanningItem[]
    initiativeItems: WeekInitiativePlanningItem[]
  }
  reflection: {
    goalItems: WeekGoalReflectionItem[]
    measurementItems: WeekMeasurementReflectionItem[]
    cadencedItems: WeekCadencedReflectionItem[]
    trackerItems: WeekTrackerReflectionItem[]
    initiativeItems: WeekInitiativeReflectionItem[]
  }
}

export interface WeekPlanningBundle {
  weekRef: WeekRef
  overlappingMonthRefs: MonthRef[]
  weekPlan?: WeekPlan
  relevant: WeekRelevantObjects['planning']
}

export interface WeekReflectionBundle {
  weekRef: WeekRef
  overlappingMonthRefs: MonthRef[]
  weekPlan?: WeekPlan
  periodReflection?: PeriodReflection
  objectReflections: PeriodObjectReflection[]
  relevant: WeekRelevantObjects['reflection']
}

interface PlanningStateDependencies {
  goalMonthStates: GoalMonthState[]
  measurementMonthStates: MeasurementMonthState[]
  measurementWeekStates: MeasurementWeekState[]
  measurementDayAssignments: MeasurementDayAssignment[]
  dailyMeasurementEntries: DailyMeasurementEntry[]
  initiativePlanStates: InitiativePlanState[]
  goals: Goal[]
  keyResults: KeyResult[]
  habits: Habit[]
  trackers: Tracker[]
  initiatives: Initiative[]
}

const monthPlanningBundleCache = new Map<
  string,
  { revision: number; value: MonthPlanningBundle | Promise<MonthPlanningBundle> }
>()
const weekRelevantObjectsCache = new Map<
  string,
  { revision: number; value: WeekRelevantObjects | Promise<WeekRelevantObjects> }
>()
const weekPlanningBundleCache = new Map<
  string,
  { revision: number; value: WeekPlanningBundle | Promise<WeekPlanningBundle> }
>()
const weekReflectionBundleCache = new Map<
  string,
  { revision: number; value: WeekReflectionBundle | Promise<WeekReflectionBundle> }
>()

type SubjectMap = Map<string, MeasureableSubject>

function isMonthCadencedPlanningItem(
  item: MonthMeasurementPlanningItem,
): item is MonthCadencedPlanningItem {
  return item.subjectType !== 'tracker'
}

function isMonthTrackerPlanningItem(
  item: MonthMeasurementPlanningItem,
): item is MonthTrackerPlanningItem {
  return item.subjectType === 'tracker'
}

function isWeekCadencedPlanningItem(
  item: WeekMeasurementPlanningItem,
): item is WeekCadencedPlanningItem {
  return item.subjectType !== 'tracker'
}

function isWeekTrackerPlanningItem(
  item: WeekMeasurementPlanningItem,
): item is WeekTrackerPlanningItem {
  return item.subjectType === 'tracker'
}

function isWeekCadencedReflectionItem(
  item: WeekMeasurementReflectionItem,
): item is WeekCadencedReflectionItem {
  return item.subjectType !== 'tracker'
}

function isWeekTrackerReflectionItem(
  item: WeekMeasurementReflectionItem,
): item is WeekTrackerReflectionItem {
  return item.subjectType === 'tracker'
}

function isGoalOpen(goal: Goal): boolean {
  return goal.isActive && goal.status === 'open'
}

function isMeasurementSubjectOpen(subject: MeasureableSubject): boolean {
  return subject.isActive && subject.status === 'open'
}

function isInitiativeActive(initiative: Initiative): boolean {
  return initiative.isActive && initiative.status === 'open'
}

function buildSubjectKey(subjectType: MeasurementSubjectType, subjectId: string): string {
  return `${subjectType}:${subjectId}`
}

function groupBySubject<T extends { subjectType: MeasurementSubjectType; subjectId: string }>(
  items: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const item of items) {
    const key = buildSubjectKey(item.subjectType, item.subjectId)
    const existing = grouped.get(key) ?? []
    existing.push(item)
    grouped.set(key, existing)
  }

  return grouped
}

function buildSubjectMap(
  keyResults: KeyResult[],
  habits: Habit[],
  trackers: Tracker[],
): SubjectMap {
  return new Map(
    [...keyResults, ...habits, ...trackers].map((subject) => [
      buildSubjectKey(resolveSubjectType(subject), subject.id),
      subject,
    ]),
  )
}

function resolveSubjectType(subject: MeasureableSubject): MeasurementSubjectType {
  if ('goalId' in subject) {
    return 'keyResult'
  }

  return 'priorityIds' in subject && 'target' in subject ? 'habit' : 'tracker'
}

function sortDayRefs(dayRefs: DayRef[]): DayRef[] {
  return [...dayRefs].sort((left, right) => left.localeCompare(right))
}

function isDayAssignmentInMonth(assignment: MeasurementDayAssignment, monthRef: MonthRef): boolean {
  return getPeriodRefsForDate(assignment.dayRef).month === monthRef
}

function isDayAssignmentInWeek(assignment: MeasurementDayAssignment, weekRef: WeekRef): boolean {
  return getPeriodRefsForDate(assignment.dayRef).week === weekRef
}

function isEntryInMonth(entry: DailyMeasurementEntry, monthRef: MonthRef): boolean {
  return getPeriodRefsForDate(entry.dayRef).month === monthRef
}

function isEntryInWeek(entry: DailyMeasurementEntry, weekRef: WeekRef): boolean {
  return getPeriodRefsForDate(entry.dayRef).week === weekRef
}

function isInitiativePlanInMonth(planState: InitiativePlanState, monthRef: MonthRef): boolean {
  return (
    planState.monthRef === monthRef ||
    (planState.weekRef ? getWeekOverlappingMonths(planState.weekRef).includes(monthRef) : false) ||
    (planState.dayRef ? getPeriodRefsForDate(planState.dayRef).month === monthRef : false)
  )
}

function isInitiativePlanInWeek(planState: InitiativePlanState, weekRef: WeekRef): boolean {
  return (
    planState.weekRef === weekRef ||
    (planState.dayRef ? getPeriodRefsForDate(planState.dayRef).week === weekRef : false)
  )
}

function buildPlanningSummary(
  monthState: MeasurementMonthState | undefined,
  weekState: MeasurementWeekState | undefined,
  dayAssignments: MeasurementDayAssignment[],
): MeasurementPlanningSummary {
  return {
    activityState: weekState?.activityState ?? monthState?.activityState,
    scheduleScope: weekState?.scheduleScope ?? monthState?.scheduleScope,
    scheduledDayRefs: sortDayRefs(dayAssignments.map((assignment) => assignment.dayRef)),
    successNote: weekState?.successNote ?? monthState?.successNote,
  }
}

function resolveMonthMeasurementPeriod(
  subject: MeasureableSubject,
  monthRef: MonthRef,
  weekStates: MeasurementWeekState[],
  dayAssignments: MeasurementDayAssignment[],
  entries: DailyMeasurementEntry[],
): WeekRef | MonthRef | undefined {
  if (subject.cadence === 'monthly') {
    return monthRef
  }

  const candidateWeeks = new Set<WeekRef>()
  weekStates.forEach((state) => candidateWeeks.add(state.weekRef))
  dayAssignments.forEach((assignment) => candidateWeeks.add(getPeriodRefsForDate(assignment.dayRef).week))
  entries.forEach((entry) => candidateWeeks.add(getPeriodRefsForDate(entry.dayRef).week))

  return candidateWeeks.size === 1 ? [...candidateWeeks][0] : undefined
}

function placementFromState(
  scheduleScope: MeasurementPlanningSummary['scheduleScope'],
  hasScheduledDays: boolean,
): WeekMeasurementPlacement | undefined {
  switch (scheduleScope) {
    case 'specific-days':
      return hasScheduledDays ? 'assigned' : undefined
    case 'whole-month':
    case 'whole-week':
      return 'planned'
    case 'unassigned':
      return 'unassigned'
    default:
      return undefined
  }
}

function sortMeasurementItems<T extends { subject: MeasureableSubject; sourceMonthRef?: MonthRef }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) => {
    const leftMonth = left.sourceMonthRef ?? ''
    const rightMonth = right.sourceMonthRef ?? ''
    return left.subject.title.localeCompare(right.subject.title) || leftMonth.localeCompare(rightMonth)
  })
}

function getMonthEntryBounds(monthRef: MonthRef): { start: DayRef; end: DayRef } {
  const weekRefs = getChildPeriods(monthRef) as WeekRef[]
  const firstWeekBounds = getPeriodBounds(weekRefs[0])
  const lastWeekBounds = getPeriodBounds(weekRefs[weekRefs.length - 1])

  return {
    start: firstWeekBounds.start,
    end: lastWeekBounds.end,
  }
}

function getMonthContextBounds(monthRefs: MonthRef[]): { start: DayRef; end: DayRef } {
  const bounds = monthRefs.map((monthRef) => getPeriodBounds(monthRef))
  return {
    start: bounds.map((item) => item.start).sort()[0] as DayRef,
    end: bounds.map((item) => item.end).sort().at(-1) as DayRef,
  }
}

async function loadMonthPlanningDependencies(monthRef: MonthRef): Promise<PlanningStateDependencies> {
  const monthEntryBounds = getMonthEntryBounds(monthRef)
  const [goalMonthStates, measurementMonthStates, measurementWeekStates, measurementDayAssignments, dailyMeasurementEntries, initiativePlanStates, objects] =
    await Promise.all([
      planningStateDexieRepository.listGoalMonthStatesForMonths([monthRef]),
      planningStateDexieRepository.listMeasurementMonthStatesForMonths([monthRef]),
      planningStateDexieRepository.listMeasurementWeekStatesForWeeks(getChildPeriods(monthRef) as WeekRef[]),
      planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(
        monthEntryBounds.start,
        monthEntryBounds.end,
      ),
      planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(
        monthEntryBounds.start,
        monthEntryBounds.end,
      ),
      planningStateDexieRepository.listInitiativePlanStates(),
      loadPlanningCoreObjects(),
    ])

  return {
    goalMonthStates,
    measurementMonthStates,
    measurementWeekStates,
    measurementDayAssignments,
    dailyMeasurementEntries,
    initiativePlanStates,
    goals: objects.goals,
    keyResults: objects.keyResults,
    habits: objects.habits,
    trackers: objects.trackers,
    initiatives: objects.initiatives,
  }
}

async function loadWeekPlanningDependencies(weekRef: WeekRef): Promise<PlanningStateDependencies> {
  const overlappingMonthRefs = getWeekOverlappingMonths(weekRef)
  const weekBounds = getPeriodBounds(weekRef)
  const monthContextBounds = getMonthContextBounds(overlappingMonthRefs)
  const [goalMonthStates, measurementMonthStates, measurementWeekStates, measurementDayAssignments, dailyMeasurementEntries, initiativePlanStates, objects] =
    await Promise.all([
      planningStateDexieRepository.listGoalMonthStatesForMonths(overlappingMonthRefs),
      planningStateDexieRepository.listMeasurementMonthStatesForMonths(overlappingMonthRefs),
      planningStateDexieRepository.listMeasurementWeekStatesForWeeks([weekRef]),
      planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(
        weekBounds.start,
        weekBounds.end,
      ),
      planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(
        monthContextBounds.start,
        monthContextBounds.end,
      ),
      planningStateDexieRepository.listInitiativePlanStates(),
      loadPlanningCoreObjects(),
    ])

  return {
    goalMonthStates,
    measurementMonthStates,
    measurementWeekStates,
    measurementDayAssignments,
    dailyMeasurementEntries,
    initiativePlanStates,
    goals: objects.goals,
    keyResults: objects.keyResults,
    habits: objects.habits,
    trackers: objects.trackers,
    initiatives: objects.initiatives,
  }
}

export async function getMonthPlanningBundle(monthRef: MonthRef): Promise<MonthPlanningBundle> {
  return loadPlanningCached(monthPlanningBundleCache, monthRef, async () => {
    const [monthPlan, deps] = await Promise.all([
      periodPlanDexieRepository.getMonthPlan(monthRef),
      loadMonthPlanningDependencies(monthRef),
    ])

    const openGoals = new Map(deps.goals.filter(isGoalOpen).map((goal) => [goal.id, goal]))
    const goalItems = deps.goalMonthStates
      .filter((state) => state.monthRef === monthRef)
      .flatMap((state) => {
        const goal = openGoals.get(state.goalId)
        return goal ? [{ goal, state }] : []
      })

    const subjectMap = buildSubjectMap(
      deps.keyResults.filter(isMeasurementSubjectOpen),
      deps.habits.filter(isMeasurementSubjectOpen),
      deps.trackers.filter(isMeasurementSubjectOpen),
    )
    const monthStates = deps.measurementMonthStates.filter((state) => state.monthRef === monthRef)
    const weekStates = deps.measurementWeekStates.filter((state) =>
      state.sourceMonthRef
        ? state.sourceMonthRef === monthRef
        : getWeekOverlappingMonths(state.weekRef).includes(monthRef),
    )
    const dayAssignments = deps.measurementDayAssignments.filter((assignment) =>
      isDayAssignmentInMonth(assignment, monthRef),
    )
    const entries = deps.dailyMeasurementEntries.filter((entry) => isEntryInMonth(entry, monthRef))

    const monthStatesBySubject = groupBySubject(monthStates)
    const weekStatesBySubject = groupBySubject(weekStates)
    const dayAssignmentsBySubject = groupBySubject(dayAssignments)
    const entriesBySubject = groupBySubject(entries)
    const allEntriesBySubject = groupBySubject(deps.dailyMeasurementEntries)
    const subjectKeys = new Set<string>([
      ...monthStates.map((state) => buildSubjectKey(state.subjectType, state.subjectId)),
      ...weekStates.map((state) => buildSubjectKey(state.subjectType, state.subjectId)),
      ...dayAssignments.map((assignment) => buildSubjectKey(assignment.subjectType, assignment.subjectId)),
      ...entries.map((entry) => buildSubjectKey(entry.subjectType, entry.subjectId)),
    ])

    const monthMeasurementItems: MonthMeasurementPlanningItem[] = []
    for (const key of subjectKeys) {
      const subject = subjectMap.get(key)
      if (!subject) {
        continue
      }

      const monthState = monthStatesBySubject.get(key)?.[0]
      if (!monthState || monthState.activityState !== 'active') {
        continue
      }

      const subjectWeekStates = weekStatesBySubject.get(key) ?? []
      const subjectDayAssignments = dayAssignmentsBySubject.get(key) ?? []
      const subjectEntries = entriesBySubject.get(key) ?? []
      const measurementPeriodRef = resolveMonthMeasurementPeriod(
        subject,
        monthRef,
        subjectWeekStates,
        subjectDayAssignments,
        subjectEntries,
      )
      const subjectType = resolveSubjectType(subject)
      const itemBase = {
        planning: {
          activityState: monthState.activityState,
          scheduleScope: monthState.scheduleScope,
          scheduledDayRefs: sortDayRefs(subjectDayAssignments.map((assignment) => assignment.dayRef)),
          successNote: monthState.successNote,
        },
        measurement: measurementPeriodRef
          ? buildMeasurementSummary(subject, allEntriesBySubject.get(key) ?? [], measurementPeriodRef)
          : undefined,
        relatedWeekCount: new Set(subjectWeekStates.map((state) => state.weekRef)).size,
      }

      if (subjectType === 'tracker') {
        monthMeasurementItems.push({
          subjectType,
          subject: subject as Tracker,
          ...itemBase,
        })
        continue
      }

      monthMeasurementItems.push({
        subjectType,
        subject: subject as KeyResult | Habit,
        ...itemBase,
      })
    }

    const measurementItems = sortMeasurementItems(monthMeasurementItems)

    const openInitiatives = new Map(
      deps.initiatives.filter(isInitiativeActive).map((initiative) => [initiative.id, initiative]),
    )
    const initiativeItems = deps.initiativePlanStates
      .filter((planState) => isInitiativePlanInMonth(planState, monthRef))
      .flatMap((planState) => {
        const initiative = openInitiatives.get(planState.initiativeId)
        return initiative ? [{ initiative, planState }] : []
      })

    return {
      monthRef,
      monthPlan,
      goalItems,
      measurementItems,
      cadencedItems: measurementItems.filter(isMonthCadencedPlanningItem),
      trackerItems: measurementItems.filter(isMonthTrackerPlanningItem),
      initiativeItems,
    }
  })
}

function buildWeeklyPlanningItem(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  allEntries: DailyMeasurementEntry[],
  monthState: MeasurementMonthState | undefined,
  weekState: MeasurementWeekState | undefined,
  dayAssignments: MeasurementDayAssignment[],
  periodRef: WeekRef | MonthRef,
  sourceMonthRef?: MonthRef,
): WeekMeasurementPlanningItem | undefined {
  const planning = buildPlanningSummary(monthState, weekState, dayAssignments)
  const placement = placementFromState(planning.scheduleScope, dayAssignments.length > 0)

  if (!placement || planning.activityState !== 'active') {
    return undefined
  }

  return {
    subjectType,
    subject,
    sourceMonthRef,
    planning,
    measurement: buildMeasurementSummary(subject, allEntries, periodRef),
    placement,
  }
}

function buildWeeklyReflectionItem(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  allEntries: DailyMeasurementEntry[],
  weekEntries: DailyMeasurementEntry[],
  monthState: MeasurementMonthState | undefined,
  weekState: MeasurementWeekState | undefined,
  dayAssignments: MeasurementDayAssignment[],
  periodRef: WeekRef | MonthRef,
  sourceMonthRef?: MonthRef,
): WeekMeasurementReflectionItem | undefined {
  const planning = buildPlanningSummary(monthState, weekState, dayAssignments)
  const isScheduled = Boolean(
    placementFromState(planning.scheduleScope, dayAssignments.length > 0) &&
      planning.activityState === 'active'
  )

  if (!isScheduled && weekEntries.length === 0) {
    return undefined
  }

  return {
    subjectType,
    subject,
    sourceMonthRef,
    planning,
    measurement: buildMeasurementSummary(subject, allEntries, periodRef),
    hasEntries: weekEntries.length > 0,
    isScheduled,
  }
}

export async function getWeekRelevantObjects(weekRef: WeekRef): Promise<WeekRelevantObjects> {
  return loadPlanningCached(weekRelevantObjectsCache, weekRef, async () => {
    const overlappingMonthRefs = getWeekOverlappingMonths(weekRef)
    const deps = await loadWeekPlanningDependencies(weekRef)

    const subjectMap = buildSubjectMap(
      deps.keyResults.filter(isMeasurementSubjectOpen),
      deps.habits.filter(isMeasurementSubjectOpen),
      deps.trackers.filter(isMeasurementSubjectOpen),
    )

    const relevantMonthStates = deps.measurementMonthStates.filter((state) =>
      overlappingMonthRefs.includes(state.monthRef),
    )
    const relevantWeekStates = deps.measurementWeekStates.filter((state) => state.weekRef === weekRef)
    const relevantDayAssignments = deps.measurementDayAssignments.filter((assignment) =>
      isDayAssignmentInWeek(assignment, weekRef),
    )
    const relevantWeekEntries = deps.dailyMeasurementEntries.filter((entry) => isEntryInWeek(entry, weekRef))

    const monthStatesBySubject = groupBySubject(relevantMonthStates)
    const weekStatesBySubject = groupBySubject(relevantWeekStates)
    const dayAssignmentsBySubject = groupBySubject(relevantDayAssignments)
    const weekEntriesBySubject = groupBySubject(relevantWeekEntries)
    const allEntriesBySubject = groupBySubject(deps.dailyMeasurementEntries)
    const subjectKeys = new Set<string>([
      ...relevantMonthStates.map((state) => buildSubjectKey(state.subjectType, state.subjectId)),
      ...relevantWeekStates.map((state) => buildSubjectKey(state.subjectType, state.subjectId)),
      ...relevantDayAssignments.map((assignment) => buildSubjectKey(assignment.subjectType, assignment.subjectId)),
      ...relevantWeekEntries.map((entry) => buildSubjectKey(entry.subjectType, entry.subjectId)),
    ])

    const planningItems: WeekMeasurementPlanningItem[] = []
    const reflectionItems: WeekMeasurementReflectionItem[] = []

    for (const key of subjectKeys) {
      const subject = subjectMap.get(key)
      if (!subject) {
        continue
      }

      const subjectType = resolveSubjectType(subject)
      const monthStates = monthStatesBySubject.get(key) ?? []
      const weekStates = weekStatesBySubject.get(key) ?? []
      const dayAssignments = dayAssignmentsBySubject.get(key) ?? []
      const weekEntries = weekEntriesBySubject.get(key) ?? []
      const allEntries = allEntriesBySubject.get(key) ?? []

      if (subject.cadence === 'monthly') {
        const contextMonthRefs = new Set<MonthRef>([
          ...monthStates.map((state) => state.monthRef),
          ...weekStates.flatMap((state) => (state.sourceMonthRef ? [state.sourceMonthRef] : [])),
          ...dayAssignments.map((assignment) => getPeriodRefsForDate(assignment.dayRef).month),
          ...weekEntries.map((entry) => getPeriodRefsForDate(entry.dayRef).month),
        ])

        for (const monthRef of [...contextMonthRefs].filter((month) => overlappingMonthRefs.includes(month))) {
          const monthState = monthStates.find(
            (state) => state.monthRef === monthRef && state.activityState === 'active',
          )
          if (!monthState) {
            continue
          }

          const weekState = weekStates.find((state) => state.sourceMonthRef === monthRef)
          const monthAssignments = dayAssignments.filter(
            (assignment) => getPeriodRefsForDate(assignment.dayRef).month === monthRef,
          )
          const monthWeekEntries = weekEntries.filter(
            (entry) => getPeriodRefsForDate(entry.dayRef).month === monthRef,
          )

          const planningItem = buildWeeklyPlanningItem(
            subject,
            subjectType,
            allEntries,
            monthState,
            weekState,
            monthAssignments,
            monthRef,
            monthRef,
          )
          if (planningItem) {
            planningItems.push(planningItem)
          }

          const reflectionItem = buildWeeklyReflectionItem(
            subject,
            subjectType,
            allEntries,
            monthWeekEntries,
            monthState,
            weekState,
            monthAssignments,
            monthRef,
            monthRef,
          )
          if (reflectionItem) {
            reflectionItems.push(reflectionItem)
          }
        }

        continue
      }

      const activeMonthState = monthStates.find((state) => state.activityState === 'active')
      if (!activeMonthState) {
        continue
      }

      const weekState = weekStates.find((state) => !state.sourceMonthRef)

      const planningItem = buildWeeklyPlanningItem(
        subject,
        subjectType,
        allEntries,
        activeMonthState,
        weekState,
        dayAssignments,
        weekRef,
      )
      if (planningItem) {
        planningItems.push(planningItem)
      }

      const reflectionItem = buildWeeklyReflectionItem(
        subject,
        subjectType,
        allEntries,
        weekEntries,
        activeMonthState,
        weekState,
        dayAssignments,
        weekRef,
      )
      if (reflectionItem) {
        reflectionItems.push(reflectionItem)
      }
    }

    const openInitiatives = new Map(
      deps.initiatives.filter(isInitiativeActive).map((initiative) => [initiative.id, initiative]),
    )
    const planningInitiatives = deps.initiativePlanStates.flatMap((planState) => {
      const initiative = openInitiatives.get(planState.initiativeId)
      if (!initiative) {
        return []
      }

      const placement = planState.dayRef
        ? 'assigned'
        : planState.weekRef === weekRef
          ? 'planned'
          : planState.monthRef && overlappingMonthRefs.includes(planState.monthRef)
            ? 'unassigned'
            : undefined

      return placement
        ? [{ initiative, planState, placement: placement as WeekMeasurementPlacement }]
        : []
    })

    const reflectionInitiatives = planningInitiatives
      .filter((item) => isInitiativePlanInWeek(item.planState, weekRef))
      .map((item) => ({ initiative: item.initiative, planState: item.planState }))

    const openGoals = new Map(deps.goals.filter(isGoalOpen).map((goal) => [goal.id, goal]))
    const goalMonthStateMap = new Map(
      deps.goalMonthStates
        .filter((state) => overlappingMonthRefs.includes(state.monthRef))
        .map((state) => [`${state.goalId}:${state.monthRef}`, state]),
    )
    const reflectionGoalIds = new Set<string>()
    for (const item of reflectionItems) {
      if (item.subjectType === 'keyResult' && 'goalId' in item.subject) {
        reflectionGoalIds.add(item.subject.goalId)
      }
    }
    for (const item of reflectionInitiatives) {
      if (item.initiative.goalId) {
        reflectionGoalIds.add(item.initiative.goalId)
      }
    }

    const goalItems = [...reflectionGoalIds].flatMap((goalId) => {
      const goal = openGoals.get(goalId)
      if (!goal) {
        return []
      }

      const monthStates = overlappingMonthRefs
        .map((monthRef) => goalMonthStateMap.get(`${goalId}:${monthRef}`))
        .filter((state): state is GoalMonthState => Boolean(state))

      return monthStates.length > 0 ? [{ goal, monthStates }] : []
    })

    return {
      weekRef,
      overlappingMonthRefs,
      planning: {
        measurementItems: sortMeasurementItems(planningItems),
        cadencedItems: sortMeasurementItems(planningItems.filter(isWeekCadencedPlanningItem)),
        trackerItems: sortMeasurementItems(planningItems.filter(isWeekTrackerPlanningItem)),
        initiativeItems: [...planningInitiatives].sort((left, right) =>
          left.initiative.title.localeCompare(right.initiative.title),
        ),
      },
      reflection: {
        goalItems,
        measurementItems: sortMeasurementItems(reflectionItems),
        cadencedItems: sortMeasurementItems(reflectionItems.filter(isWeekCadencedReflectionItem)),
        trackerItems: sortMeasurementItems(reflectionItems.filter(isWeekTrackerReflectionItem)),
        initiativeItems: reflectionInitiatives.sort((left, right) =>
          left.initiative.title.localeCompare(right.initiative.title),
        ),
      },
    }
  })
}

export async function getWeekPlanningBundle(weekRef: WeekRef): Promise<WeekPlanningBundle> {
  return loadPlanningCached(weekPlanningBundleCache, weekRef, async () => {
    const [weekPlan, relevant] = await Promise.all([
      periodPlanDexieRepository.getWeekPlan(weekRef),
      getWeekRelevantObjects(weekRef),
    ])

    return {
      weekRef,
      overlappingMonthRefs: relevant.overlappingMonthRefs,
      weekPlan,
      relevant: relevant.planning,
    }
  })
}

export async function getWeekReflectionBundle(weekRef: WeekRef): Promise<WeekReflectionBundle> {
  return loadPlanningCached(weekReflectionBundleCache, weekRef, async () => {
    const [weekPlan, periodReflection, objectReflections, relevant] = await Promise.all([
      periodPlanDexieRepository.getWeekPlan(weekRef),
      reflectionDexieRepository.getPeriodReflection('week', weekRef),
      reflectionDexieRepository.listPeriodObjectReflections(),
      getWeekRelevantObjects(weekRef),
    ])

    return {
      weekRef,
      overlappingMonthRefs: relevant.overlappingMonthRefs,
      weekPlan,
      periodReflection,
      objectReflections: objectReflections.filter(
        (item) => item.periodType === 'week' && item.periodRef === weekRef,
      ),
      relevant: relevant.reflection,
    }
  })
}
