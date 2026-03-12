import type { MonthRef, WeekRef } from '@/domain/period'
import type { Goal, Habit, Initiative, KeyResult, Tracker } from '@/domain/planning'
import type {
  CadencedDayAssignment,
  CadencedMonthState,
  CadencedWeekState,
  GoalMonthState,
  InitiativePlanState,
  MonthPlan,
  PeriodObjectReflection,
  PeriodReflection,
  PlanningSubjectType,
  TrackerEntry,
  TrackerMonthState,
  TrackerWeekState,
  WeekPlan,
} from '@/domain/planningState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'

type CadencedSubject = KeyResult | Habit

export type WeekPlanningRelevanceReason =
  | 'week-state'
  | 'day-assignment'
  | 'month-active-unassigned'
  | 'initiative-week'
  | 'initiative-day'
  | 'initiative-month'
  | 'tracker-week-state'
  | 'tracker-month-active-unassigned'

export type WeekReflectionRelevanceReason =
  | 'week-state'
  | 'day-assignment'
  | 'tracker-entry'
  | 'initiative-week'
  | 'initiative-day'
  | 'goal-linked-work'

export interface MonthGoalPlanningItem {
  goal: Goal
  state: GoalMonthState
}

export interface MonthCadencedPlanningItem {
  subjectType: PlanningSubjectType
  subject: CadencedSubject
  monthState?: CadencedMonthState
  weekStates: CadencedWeekState[]
  dayAssignments: CadencedDayAssignment[]
  overAllocated: boolean
}

export interface MonthTrackerPlanningItem {
  tracker: Tracker
  monthState?: TrackerMonthState
  weekStates: TrackerWeekState[]
  entries: TrackerEntry[]
}

export interface MonthInitiativePlanningItem {
  initiative: Initiative
  planState: InitiativePlanState
}

export interface MonthPlanningBundle {
  monthRef: MonthRef
  monthPlan?: MonthPlan
  goalItems: MonthGoalPlanningItem[]
  cadencedItems: MonthCadencedPlanningItem[]
  trackerItems: MonthTrackerPlanningItem[]
  initiativeItems: MonthInitiativePlanningItem[]
}

export interface WeekCadencedPlanningItem {
  subjectType: PlanningSubjectType
  subject: CadencedSubject
  monthStates: CadencedMonthState[]
  weekStates: CadencedWeekState[]
  dayAssignments: CadencedDayAssignment[]
  reasons: WeekPlanningRelevanceReason[]
  overAllocated: boolean
  unassignedMonthRefs: MonthRef[]
}

export interface WeekTrackerPlanningItem {
  tracker: Tracker
  monthStates: TrackerMonthState[]
  weekState?: TrackerWeekState
  reasons: WeekPlanningRelevanceReason[]
}

export interface WeekInitiativePlanningItem {
  initiative: Initiative
  planState: InitiativePlanState
  reasons: WeekPlanningRelevanceReason[]
}

export interface WeekGoalReflectionItem {
  goal: Goal
  monthStates: GoalMonthState[]
  reasons: WeekReflectionRelevanceReason[]
}

export interface WeekCadencedReflectionItem {
  subjectType: PlanningSubjectType
  subject: CadencedSubject
  monthStates: CadencedMonthState[]
  weekStates: CadencedWeekState[]
  dayAssignments: CadencedDayAssignment[]
  reasons: WeekReflectionRelevanceReason[]
  overAllocated: boolean
}

export interface WeekTrackerReflectionItem {
  tracker: Tracker
  monthStates: TrackerMonthState[]
  weekState?: TrackerWeekState
  entries: TrackerEntry[]
  reasons: WeekReflectionRelevanceReason[]
}

export interface WeekInitiativeReflectionItem {
  initiative: Initiative
  planState: InitiativePlanState
  reasons: WeekReflectionRelevanceReason[]
}

export interface WeekRelevantObjects {
  weekRef: WeekRef
  overlappingMonthRefs: MonthRef[]
  planning: {
    cadencedItems: WeekCadencedPlanningItem[]
    trackerItems: WeekTrackerPlanningItem[]
    initiativeItems: WeekInitiativePlanningItem[]
  }
  reflection: {
    goalItems: WeekGoalReflectionItem[]
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

function isGoalOpen(goal: Goal): boolean {
  return goal.isActive && goal.status === 'open'
}

function isCadencedSubjectOpen(subject: CadencedSubject): boolean {
  return subject.isActive && subject.status === 'open'
}

function isTrackerOpen(tracker: Tracker): boolean {
  return tracker.isActive && tracker.status === 'open'
}

function isInitiativeActive(initiative: Initiative): boolean {
  return initiative.isActive && initiative.status === 'open'
}

function isKeyResult(subject: CadencedSubject): subject is KeyResult {
  return 'goalId' in subject
}

function groupBySubject<T extends { subjectType: PlanningSubjectType; subjectId: string }>(
  items: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const item of items) {
    const key = `${item.subjectType}:${item.subjectId}`
    const existing = grouped.get(key) ?? []
    existing.push(item)
    grouped.set(key, existing)
  }

  return grouped
}

function computeOverAllocated(
  subject: CadencedSubject,
  monthState: CadencedMonthState | undefined,
  allWeekStates: CadencedWeekState[],
  targetMonthRef?: MonthRef
): boolean {
  if (
    subject.cadence !== 'monthly' ||
    monthState?.planningMode !== 'times-per-period' ||
    monthState.targetCount === undefined
  ) {
    return false
  }

  const allocated = allWeekStates
    .filter(
      state =>
        state.sourceMonthRef === (targetMonthRef ?? monthState.monthRef) &&
        state.planningMode === 'times-per-period' &&
        state.targetCount !== undefined
    )
    .reduce((sum, state) => sum + (state.targetCount ?? 0), 0)

  return allocated > monthState.targetCount
}

function isDayAssignmentInMonth(assignment: CadencedDayAssignment, monthRef: MonthRef): boolean {
  return getPeriodRefsForDate(assignment.dayRef).month === monthRef
}

function isDayAssignmentInWeek(assignment: CadencedDayAssignment, weekRef: WeekRef): boolean {
  return getPeriodRefsForDate(assignment.dayRef).week === weekRef
}

function isTrackerEntryInMonth(entry: TrackerEntry, monthRef: MonthRef): boolean {
  switch (entry.periodType) {
    case 'month':
      return entry.periodRef === monthRef
    case 'week':
      return getWeekOverlappingMonths(entry.periodRef as WeekRef).includes(monthRef)
    case 'day':
      return getPeriodRefsForDate(entry.periodRef).month === monthRef
  }
}

function isTrackerEntryInWeek(entry: TrackerEntry, weekRef: WeekRef): boolean {
  switch (entry.periodType) {
    case 'week':
      return entry.periodRef === weekRef
    case 'day':
      return getPeriodRefsForDate(entry.periodRef).week === weekRef
    case 'month':
      return false
  }
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

async function loadPlanningStateDependencies() {
  return Promise.all([
    planningStateDexieRepository.listGoalMonthStates(),
    planningStateDexieRepository.listCadencedMonthStates(),
    planningStateDexieRepository.listCadencedWeekStates(),
    planningStateDexieRepository.listCadencedDayAssignments(),
    planningStateDexieRepository.listInitiativePlanStates(),
    planningStateDexieRepository.listTrackerMonthStates(),
    planningStateDexieRepository.listTrackerWeekStates(),
    planningStateDexieRepository.listTrackerEntries(),
    goalDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    initiativeDexieRepository.listAll(),
  ])
}

function buildCadencedSubjectMaps(keyResults: KeyResult[], habits: Habit[]) {
  const keyResultMap = new Map(keyResults.map(item => [item.id, item]))
  const habitMap = new Map(habits.map(item => [item.id, item]))

  return {
    getSubject(subjectType: PlanningSubjectType, subjectId: string): CadencedSubject | undefined {
      return subjectType === 'keyResult' ? keyResultMap.get(subjectId) : habitMap.get(subjectId)
    },
  }
}

export async function getMonthPlanningBundle(monthRef: MonthRef): Promise<MonthPlanningBundle> {
  const planningDependencies = await loadPlanningStateDependencies()
  const [
    monthPlan,
    goalMonthStates,
    cadencedMonthStates,
    cadencedWeekStates,
    dayAssignments,
    initiativePlanStates,
    trackerMonthStates,
    trackerWeekStates,
    trackerEntries,
    goals,
    keyResults,
    habits,
    trackers,
    initiatives,
  ] = await Promise.all([periodPlanDexieRepository.getMonthPlan(monthRef), ...planningDependencies])

  const openGoals = new Map(goals.filter(isGoalOpen).map(goal => [goal.id, goal]))
  const goalItems = goalMonthStates
    .filter(state => state.monthRef === monthRef)
    .flatMap(state => {
      const goal = openGoals.get(state.goalId)
      return goal ? [{ goal, state }] : []
    })

  const openKeyResults = keyResults.filter(isCadencedSubjectOpen)
  const openHabits = habits.filter(isCadencedSubjectOpen)
  const { getSubject } = buildCadencedSubjectMaps(openKeyResults, openHabits)
  const monthCadencedStates = cadencedMonthStates.filter(state => state.monthRef === monthRef)
  const relevantDayAssignments = dayAssignments.filter(assignment =>
    isDayAssignmentInMonth(assignment, monthRef)
  )
  const relevantWeekStates = cadencedWeekStates.filter(state => {
    if (state.sourceMonthRef) {
      return state.sourceMonthRef === monthRef
    }

    return getWeekOverlappingMonths(state.weekRef).includes(monthRef)
  })

  const subjectKeys = new Set<string>([
    ...monthCadencedStates.map(state => `${state.subjectType}:${state.subjectId}`),
    ...relevantWeekStates.map(state => `${state.subjectType}:${state.subjectId}`),
    ...relevantDayAssignments.map(
      assignment => `${assignment.subjectType}:${assignment.subjectId}`
    ),
  ])
  const allCadencedWeekStatesBySubject = groupBySubject(cadencedWeekStates)
  const monthCadencedStatesBySubject = groupBySubject(monthCadencedStates)
  const weekStatesBySubject = groupBySubject(relevantWeekStates)
  const dayAssignmentsBySubject = groupBySubject(relevantDayAssignments)

  const cadencedItems = [...subjectKeys].flatMap(key => {
    const [subjectType, subjectId] = key.split(':') as [PlanningSubjectType, string]
    const subject = getSubject(subjectType, subjectId)
    if (!subject) {
      return []
    }

    const monthState = monthCadencedStatesBySubject.get(key)?.[0]
    const subjectWeekStates = weekStatesBySubject.get(key) ?? []
    const subjectDayAssignments = dayAssignmentsBySubject.get(key) ?? []

    return [
      {
        subjectType,
        subject,
        monthState,
        weekStates: subjectWeekStates,
        dayAssignments: subjectDayAssignments,
        overAllocated: computeOverAllocated(
          subject,
          monthState,
          allCadencedWeekStatesBySubject.get(key) ?? [],
          monthRef
        ),
      },
    ]
  })

  const openTrackers = new Map(trackers.filter(isTrackerOpen).map(tracker => [tracker.id, tracker]))
  const monthTrackerStates = trackerMonthStates.filter(state => state.monthRef === monthRef)
  const relevantTrackerWeekStates = trackerWeekStates.filter(state =>
    getWeekOverlappingMonths(state.weekRef).includes(monthRef)
  )
  const relevantTrackerEntries = trackerEntries.filter(entry =>
    isTrackerEntryInMonth(entry, monthRef)
  )
  const trackerIds = new Set<string>([
    ...monthTrackerStates.map(state => state.trackerId),
    ...relevantTrackerWeekStates.map(state => state.trackerId),
    ...relevantTrackerEntries.map(entry => entry.trackerId),
  ])
  const trackerItems = [...trackerIds].flatMap(trackerId => {
    const tracker = openTrackers.get(trackerId)
    if (!tracker) {
      return []
    }

    return [
      {
        tracker,
        monthState: monthTrackerStates.find(state => state.trackerId === trackerId),
        weekStates: relevantTrackerWeekStates.filter(state => state.trackerId === trackerId),
        entries: relevantTrackerEntries.filter(entry => entry.trackerId === trackerId),
      },
    ]
  })

  const openInitiatives = new Map(
    initiatives.filter(isInitiativeActive).map(initiative => [initiative.id, initiative])
  )
  const initiativeItems = initiativePlanStates
    .filter(planState => isInitiativePlanInMonth(planState, monthRef))
    .flatMap(planState => {
      const initiative = openInitiatives.get(planState.initiativeId)
      return initiative ? [{ initiative, planState }] : []
    })

  return {
    monthRef,
    monthPlan,
    goalItems,
    cadencedItems,
    trackerItems,
    initiativeItems,
  }
}

export async function getWeekRelevantObjects(weekRef: WeekRef): Promise<WeekRelevantObjects> {
  const overlappingMonthRefs = getWeekOverlappingMonths(weekRef)
  const [
    goalMonthStates,
    cadencedMonthStates,
    cadencedWeekStates,
    dayAssignments,
    initiativePlanStates,
    trackerMonthStates,
    trackerWeekStates,
    trackerEntries,
    goals,
    keyResults,
    habits,
    trackers,
    initiatives,
  ] = await loadPlanningStateDependencies()

  const openGoals = goals.filter(isGoalOpen)
  const openKeyResults = keyResults.filter(isCadencedSubjectOpen)
  const openHabits = habits.filter(isCadencedSubjectOpen)
  const openTrackers = trackers.filter(isTrackerOpen)
  const openInitiatives = initiatives.filter(isInitiativeActive)
  const { getSubject } = buildCadencedSubjectMaps(openKeyResults, openHabits)

  const relevantMonthStates = cadencedMonthStates.filter(state =>
    overlappingMonthRefs.includes(state.monthRef)
  )
  const relevantWeekStates = cadencedWeekStates.filter(state => state.weekRef === weekRef)
  const relevantDayAssignments = dayAssignments.filter(assignment =>
    isDayAssignmentInWeek(assignment, weekRef)
  )
  const monthStatesBySubject = groupBySubject(relevantMonthStates)
  const weekStatesBySubject = groupBySubject(relevantWeekStates)
  const dayAssignmentsBySubject = groupBySubject(relevantDayAssignments)
  const allWeekStatesBySubject = groupBySubject(cadencedWeekStates)
  const planningSubjectKeys = new Set<string>([
    ...relevantMonthStates.map(state => `${state.subjectType}:${state.subjectId}`),
    ...relevantWeekStates.map(state => `${state.subjectType}:${state.subjectId}`),
    ...relevantDayAssignments.map(state => `${state.subjectType}:${state.subjectId}`),
  ])

  const planningCadencedItems = [...planningSubjectKeys]
    .map(key => {
      const [subjectType, subjectId] = key.split(':') as [PlanningSubjectType, string]
      const subject = getSubject(subjectType, subjectId)
      if (!subject) {
        return undefined
      }

      const subjectMonthStates = monthStatesBySubject.get(key) ?? []
      const subjectWeekStates = weekStatesBySubject.get(key) ?? []
      const subjectDayAssignments = dayAssignmentsBySubject.get(key) ?? []
      const reasons = new Set<WeekPlanningRelevanceReason>()
      const unassignedMonthRefs: MonthRef[] = []

      if (subjectWeekStates.length > 0) {
        reasons.add('week-state')
      }

      if (subjectDayAssignments.length > 0) {
        reasons.add('day-assignment')
      }

      for (const monthState of subjectMonthStates) {
        const hasWeekStateForMonth =
          subject.cadence === 'monthly'
            ? subjectWeekStates.some(state => state.sourceMonthRef === monthState.monthRef)
            : subjectWeekStates.length > 0
        const hasDayAssignmentForMonth = subjectDayAssignments.some(
          assignment => getPeriodRefsForDate(assignment.dayRef).month === monthState.monthRef
        )

        if (
          monthState.activityState === 'active' &&
          !hasWeekStateForMonth &&
          !hasDayAssignmentForMonth
        ) {
          unassignedMonthRefs.push(monthState.monthRef)
        }
      }

      if (unassignedMonthRefs.length > 0) {
        reasons.add('month-active-unassigned')
      }

      if (reasons.size === 0) {
        return undefined
      }

      return {
        subjectType,
        subject,
        monthStates: subjectMonthStates,
        weekStates: subjectWeekStates,
        dayAssignments: subjectDayAssignments,
        reasons: [...reasons],
        overAllocated:
          subject.cadence === 'monthly' &&
          subjectMonthStates.some(monthState =>
            computeOverAllocated(
              subject,
              monthState,
              allWeekStatesBySubject.get(key) ?? [],
              monthState.monthRef
            )
          ),
        unassignedMonthRefs,
      }
    })
    .filter((item): item is WeekCadencedPlanningItem => Boolean(item))

  const relevantTrackerMonthStates = trackerMonthStates.filter(state =>
    overlappingMonthRefs.includes(state.monthRef)
  )
  const relevantTrackerWeekStates = trackerWeekStates.filter(state => state.weekRef === weekRef)
  const planningTrackerIds = new Set<string>([
    ...relevantTrackerMonthStates.map(state => state.trackerId),
    ...relevantTrackerWeekStates.map(state => state.trackerId),
  ])
  const trackerMap = new Map(openTrackers.map(tracker => [tracker.id, tracker]))
  const planningTrackerItems = [...planningTrackerIds].flatMap(trackerId => {
    const tracker = trackerMap.get(trackerId)
    if (!tracker) {
      return []
    }

    const monthStates = relevantTrackerMonthStates.filter(state => state.trackerId === trackerId)
    const weekState = relevantTrackerWeekStates.find(state => state.trackerId === trackerId)
    const reasons = new Set<WeekPlanningRelevanceReason>()

    if (weekState) {
      reasons.add('tracker-week-state')
    } else if (monthStates.some(state => state.activityState === 'active')) {
      reasons.add('tracker-month-active-unassigned')
    }

    if (reasons.size === 0) {
      return []
    }

    return [{ tracker, monthStates, weekState, reasons: [...reasons] }]
  })

  const initiativeMap = new Map(openInitiatives.map(initiative => [initiative.id, initiative]))
  const planningInitiativeItems = initiativePlanStates.flatMap(planState => {
    const initiative = initiativeMap.get(planState.initiativeId)
    if (!initiative) {
      return []
    }

    const reasons = new Set<WeekPlanningRelevanceReason>()
    if (planState.weekRef === weekRef) {
      reasons.add('initiative-week')
    }
    if (planState.dayRef && getPeriodRefsForDate(planState.dayRef).week === weekRef) {
      reasons.add('initiative-day')
    }
    if (
      planState.monthRef &&
      overlappingMonthRefs.includes(planState.monthRef) &&
      !isInitiativePlanInWeek(planState, weekRef)
    ) {
      reasons.add('initiative-month')
    }

    if (reasons.size === 0) {
      return []
    }

    return [{ initiative, planState, reasons: [...reasons] }]
  })

  const relevantTrackerEntries = trackerEntries.filter(entry =>
    isTrackerEntryInWeek(entry, weekRef)
  )
  const reflectionCadencedItems = planningCadencedItems.flatMap(item => {
    const reasons = new Set<WeekReflectionRelevanceReason>()
    if (item.weekStates.length > 0) {
      reasons.add('week-state')
    }
    if (item.dayAssignments.length > 0) {
      reasons.add('day-assignment')
    }

    if (reasons.size === 0) {
      return []
    }

    return [
      {
        subjectType: item.subjectType,
        subject: item.subject,
        monthStates: item.monthStates,
        weekStates: item.weekStates,
        dayAssignments: item.dayAssignments,
        reasons: [...reasons],
        overAllocated: item.overAllocated,
      },
    ]
  })

  const reflectionTrackerItems = [
    ...new Set(
      relevantTrackerEntries
        .map(entry => entry.trackerId)
        .concat(relevantTrackerWeekStates.map(state => state.trackerId))
    ),
  ].flatMap(trackerId => {
    const tracker = trackerMap.get(trackerId)
    if (!tracker) {
      return []
    }

    const weekState = relevantTrackerWeekStates.find(state => state.trackerId === trackerId)
    const entries = relevantTrackerEntries.filter(entry => entry.trackerId === trackerId)
    const reasons = new Set<WeekReflectionRelevanceReason>()
    if (weekState) {
      reasons.add('week-state')
    }
    if (entries.length > 0) {
      reasons.add('tracker-entry')
    }

    if (reasons.size === 0) {
      return []
    }

    return [
      {
        tracker,
        monthStates: relevantTrackerMonthStates.filter(state => state.trackerId === trackerId),
        weekState,
        entries,
        reasons: [...reasons],
      },
    ]
  })

  const reflectionInitiativeItems = planningInitiativeItems.flatMap(item => {
    const reasons = item.reasons.flatMap(reason =>
      reason === 'initiative-week' || reason === 'initiative-day' ? [reason] : []
    )

    return reasons.length > 0
      ? [{ initiative: item.initiative, planState: item.planState, reasons }]
      : []
  })

  const goalMonthStateMap = new Map(
    goalMonthStates
      .filter(state => overlappingMonthRefs.includes(state.monthRef))
      .map(state => [`${state.goalId}:${state.monthRef}`, state])
  )
  const reflectionGoalItems = openGoals.flatMap(goal => {
    const linkedCadencedWork = reflectionCadencedItems.some(
      item =>
        item.subjectType === 'keyResult' &&
        isKeyResult(item.subject) &&
        item.subject.goalId === goal.id
    )
    const linkedInitiatives = reflectionInitiativeItems.some(
      item => item.initiative.goalId === goal.id
    )

    if (!linkedCadencedWork && !linkedInitiatives) {
      return []
    }

    const monthStates = overlappingMonthRefs
      .map(monthRef => goalMonthStateMap.get(`${goal.id}:${monthRef}`))
      .filter((state): state is GoalMonthState => Boolean(state))

    if (monthStates.length === 0) {
      return []
    }

    return [{ goal, monthStates, reasons: ['goal-linked-work'] as WeekReflectionRelevanceReason[] }]
  })

  return {
    weekRef,
    overlappingMonthRefs,
    planning: {
      cadencedItems: planningCadencedItems,
      trackerItems: planningTrackerItems,
      initiativeItems: planningInitiativeItems,
    },
    reflection: {
      goalItems: reflectionGoalItems,
      cadencedItems: reflectionCadencedItems,
      trackerItems: reflectionTrackerItems,
      initiativeItems: reflectionInitiativeItems,
    },
  }
}

export async function getWeekPlanningBundle(weekRef: WeekRef): Promise<WeekPlanningBundle> {
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
}

export async function getWeekReflectionBundle(weekRef: WeekRef): Promise<WeekReflectionBundle> {
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
      item => item.periodType === 'week' && item.periodRef === weekRef
    ),
    relevant: relevant.reflection,
  }
}
