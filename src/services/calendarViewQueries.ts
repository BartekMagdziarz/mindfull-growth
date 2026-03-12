import type { DayRef, MonthRef, PeriodRefsForDate, WeekRef, YearRef } from '@/domain/period'
import type { Goal, Habit, Initiative, KeyResult, Tracker } from '@/domain/planning'
import type { PeriodObjectReflection, PeriodReflection, TrackerEntry } from '@/domain/planningState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import type {
  MonthGoalPlanningItem,
  MonthInitiativePlanningItem,
  MonthPlanningBundle,
  WeekCadencedPlanningItem,
  WeekInitiativePlanningItem,
  WeekPlanningBundle,
  WeekReflectionBundle,
  WeekTrackerPlanningItem,
} from '@/services/planningStateQueries'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
} from '@/services/planningStateQueries'
import { getChildPeriods, getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'

type CadencedSubject = KeyResult | Habit

export interface CalendarYearMonthSummary {
  monthRef: MonthRef
  hasPlan: boolean
  hasReflection: boolean
  activeGoalCount: number
  activeCadencedCount: number
  activeTrackerCount: number
  activeInitiativeCount: number
}

export interface CalendarYearSummary {
  yearRef: YearRef
  months: CalendarYearMonthSummary[]
  totals: {
    activeGoalCount: number
    activeCadencedCount: number
    activeTrackerCount: number
    activeInitiativeCount: number
  }
}

export interface MonthReflectionBundle {
  monthRef: MonthRef
  periodReflection?: PeriodReflection
  objectReflections: PeriodObjectReflection[]
}

export interface DayCalendarBundle {
  dayRef: DayRef
  refs: PeriodRefsForDate
  weekPlanning: WeekPlanningBundle
  weekReflection: WeekReflectionBundle
  monthPlanning: MonthPlanningBundle
  monthReflection: MonthReflectionBundle
  scheduledCadencedItems: WeekCadencedPlanningItem[]
  scheduledInitiativeItems: WeekInitiativePlanningItem[]
  trackerEntriesToday: TrackerEntry[]
  contextCadencedItems: WeekCadencedPlanningItem[]
  contextTrackerItems: WeekTrackerPlanningItem[]
  contextInitiativeItems: WeekInitiativePlanningItem[]
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

function isInitiativePlanInMonth(
  planState: { monthRef?: MonthRef; weekRef?: WeekRef; dayRef?: DayRef },
  monthRef: MonthRef
): boolean {
  return (
    planState.monthRef === monthRef ||
    (planState.weekRef ? getWeekOverlappingMonths(planState.weekRef).includes(monthRef) : false) ||
    (planState.dayRef ? getPeriodRefsForDate(planState.dayRef).month === monthRef : false)
  )
}

function isCadencedScheduledOnDay(item: WeekCadencedPlanningItem, dayRef: DayRef): boolean {
  return item.dayAssignments.some((assignment) => assignment.dayRef === dayRef)
}

function isInitiativeScheduledOnDay(item: WeekInitiativePlanningItem, dayRef: DayRef): boolean {
  return item.planState.dayRef === dayRef
}

export async function getMonthReflectionBundle(monthRef: MonthRef): Promise<MonthReflectionBundle> {
  const [periodReflection, objectReflections] = await Promise.all([
    reflectionDexieRepository.getPeriodReflection('month', monthRef),
    reflectionDexieRepository.listPeriodObjectReflections(),
  ])

  return {
    monthRef,
    periodReflection,
    objectReflections: objectReflections.filter(
      (item) => item.periodType === 'month' && item.periodRef === monthRef
    ),
  }
}

export async function getCalendarYearSummary(yearRef: YearRef): Promise<CalendarYearSummary> {
  const monthRefs = getChildPeriods(yearRef) as MonthRef[]
  const monthRefsSet = new Set(monthRefs)
  const [
    monthPlans,
    periodReflections,
    goalMonthStates,
    cadencedMonthStates,
    trackerMonthStates,
    initiativePlanStates,
    goals,
    keyResults,
    habits,
    trackers,
    initiatives,
  ] = await Promise.all([
    periodPlanDexieRepository.listMonthPlans(),
    reflectionDexieRepository.listPeriodReflections(),
    planningStateDexieRepository.listGoalMonthStates(),
    planningStateDexieRepository.listCadencedMonthStates(),
    planningStateDexieRepository.listTrackerMonthStates(),
    planningStateDexieRepository.listInitiativePlanStates(),
    goalDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    initiativeDexieRepository.listAll(),
  ])

  const monthPlanRefs = new Set(monthPlans.map((item) => item.monthRef))
  const monthReflectionRefs = new Set(
    periodReflections
      .filter((item) => item.periodType === 'month')
      .map((item) => item.periodRef as MonthRef)
  )
  const openGoalIds = new Set(goals.filter(isGoalOpen).map((goal) => goal.id))
  const openCadencedKeys = new Set(
    [...keyResults.filter(isCadencedSubjectOpen), ...habits.filter(isCadencedSubjectOpen)].map(
      (item) => `${'goalId' in item ? 'keyResult' : 'habit'}:${item.id}`
    )
  )
  const openTrackerIds = new Set(trackers.filter(isTrackerOpen).map((tracker) => tracker.id))
  const activeInitiativeIds = new Set(
    initiatives.filter(isInitiativeActive).map((initiative) => initiative.id)
  )

  return {
    yearRef,
    months: monthRefs.map((monthRef) => ({
      monthRef,
      hasPlan: monthPlanRefs.has(monthRef),
      hasReflection: monthReflectionRefs.has(monthRef),
      activeGoalCount: new Set(
        goalMonthStates
          .filter(
            (state) =>
              state.monthRef === monthRef &&
              state.activityState === 'active' &&
              openGoalIds.has(state.goalId)
          )
          .map((state) => state.goalId)
      ).size,
      activeCadencedCount: new Set(
        cadencedMonthStates
          .filter(
            (state) =>
              state.monthRef === monthRef &&
              state.activityState === 'active' &&
              openCadencedKeys.has(`${state.subjectType}:${state.subjectId}`)
          )
          .map((state) => `${state.subjectType}:${state.subjectId}`)
      ).size,
      activeTrackerCount: new Set(
        trackerMonthStates
          .filter(
            (state) =>
              state.monthRef === monthRef &&
              state.activityState === 'active' &&
              openTrackerIds.has(state.trackerId)
          )
          .map((state) => state.trackerId)
      ).size,
      activeInitiativeCount: new Set(
        initiativePlanStates
          .filter(
            (state) =>
              activeInitiativeIds.has(state.initiativeId) && isInitiativePlanInMonth(state, monthRef)
          )
          .map((state) => state.initiativeId)
      ).size,
    })),
    totals: {
      activeGoalCount: new Set(
        goalMonthStates
          .filter(
            (state) =>
              monthRefsSet.has(state.monthRef) &&
              state.activityState === 'active' &&
              openGoalIds.has(state.goalId)
          )
          .map((state) => state.goalId)
      ).size,
      activeCadencedCount: new Set(
        cadencedMonthStates
          .filter(
            (state) =>
              monthRefsSet.has(state.monthRef) &&
              state.activityState === 'active' &&
              openCadencedKeys.has(`${state.subjectType}:${state.subjectId}`)
          )
          .map((state) => `${state.subjectType}:${state.subjectId}`)
      ).size,
      activeTrackerCount: new Set(
        trackerMonthStates
          .filter(
            (state) =>
              monthRefsSet.has(state.monthRef) &&
              state.activityState === 'active' &&
              openTrackerIds.has(state.trackerId)
          )
          .map((state) => state.trackerId)
      ).size,
      activeInitiativeCount: new Set(
        initiativePlanStates
          .filter(
            (state) =>
              activeInitiativeIds.has(state.initiativeId) &&
              monthRefs.some((monthRef) => isInitiativePlanInMonth(state, monthRef))
          )
          .map((state) => state.initiativeId)
      ).size,
    },
  }
}

export async function getDayCalendarBundle(dayRef: DayRef): Promise<DayCalendarBundle> {
  const refs = getPeriodRefsForDate(dayRef)
  const [weekPlanning, weekReflection, monthPlanning, monthReflection] = await Promise.all([
    getWeekPlanningBundle(refs.week),
    getWeekReflectionBundle(refs.week),
    getMonthPlanningBundle(refs.month),
    getMonthReflectionBundle(refs.month),
  ])

  const scheduledCadencedItems = weekPlanning.relevant.cadencedItems.filter((item) =>
    isCadencedScheduledOnDay(item, dayRef)
  )
  const scheduledInitiativeItems = weekPlanning.relevant.initiativeItems.filter((item) =>
    isInitiativeScheduledOnDay(item, dayRef)
  )
  const trackerEntriesToday = weekReflection.relevant.trackerItems.flatMap((item) =>
    item.entries.filter((entry) => entry.periodType === 'day' && entry.periodRef === dayRef)
  )

  return {
    dayRef,
    refs,
    weekPlanning,
    weekReflection,
    monthPlanning,
    monthReflection,
    scheduledCadencedItems,
    scheduledInitiativeItems,
    trackerEntriesToday,
    contextCadencedItems: weekPlanning.relevant.cadencedItems.filter(
      (item) => !isCadencedScheduledOnDay(item, dayRef)
    ),
    contextTrackerItems: weekPlanning.relevant.trackerItems,
    contextInitiativeItems: weekPlanning.relevant.initiativeItems.filter(
      (item) => !isInitiativeScheduledOnDay(item, dayRef)
    ),
  }
}

export function countGoalKeyResults(
  goalId: string,
  items: Array<{ subjectType: 'keyResult' | 'habit'; subject: CadencedSubject }>
): number {
  return items.filter(
    (item) => item.subjectType === 'keyResult' && 'goalId' in item.subject && item.subject.goalId === goalId
  ).length
}

export function hasObjectReflection(
  subjectType: PeriodObjectReflection['subjectType'],
  subjectId: string,
  objectReflections: PeriodObjectReflection[]
): boolean {
  return objectReflections.some(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId
  )
}

export function splitMonthCadencedItems(bundle: MonthPlanningBundle): {
  keyResults: MonthPlanningBundle['cadencedItems']
  habits: MonthPlanningBundle['cadencedItems']
} {
  return {
    keyResults: bundle.cadencedItems.filter((item) => item.subjectType === 'keyResult'),
    habits: bundle.cadencedItems.filter((item) => item.subjectType === 'habit'),
  }
}

export function splitWeekCadencedItems(items: WeekPlanningBundle['relevant']['cadencedItems']): {
  plannedThisWeek: WeekCadencedPlanningItem[]
  assignedToDays: WeekCadencedPlanningItem[]
  toPlanThisWeek: WeekCadencedPlanningItem[]
} {
  return {
    plannedThisWeek: items.filter((item) => item.reasons.includes('week-state')),
    assignedToDays: items.filter((item) => item.reasons.includes('day-assignment')),
    toPlanThisWeek: items.filter((item) => item.reasons.includes('month-active-unassigned')),
  }
}

export function splitWeekInitiativeItems(
  items: WeekPlanningBundle['relevant']['initiativeItems']
): {
  plannedThisWeek: WeekInitiativePlanningItem[]
  assignedToDays: WeekInitiativePlanningItem[]
  toPlanThisWeek: WeekInitiativePlanningItem[]
} {
  return {
    plannedThisWeek: items.filter((item) => item.reasons.includes('initiative-week')),
    assignedToDays: items.filter((item) => item.reasons.includes('initiative-day')),
    toPlanThisWeek: items.filter((item) => item.reasons.includes('initiative-month')),
  }
}

export function splitWeekTrackerItems(
  items: WeekPlanningBundle['relevant']['trackerItems']
): {
  plannedThisWeek: WeekTrackerPlanningItem[]
  toPlanThisWeek: WeekTrackerPlanningItem[]
} {
  return {
    plannedThisWeek: items.filter((item) => item.reasons.includes('tracker-week-state')),
    toPlanThisWeek: items.filter((item) => item.reasons.includes('tracker-month-active-unassigned')),
  }
}

export function filterMonthGoalsWithLinkedWork(
  monthGoals: MonthGoalPlanningItem[],
  monthItems: MonthPlanningBundle['cadencedItems']
): MonthGoalPlanningItem[] {
  const goalIdsWithWork = new Set(
    monthItems.flatMap((item) =>
      item.subjectType === 'keyResult' && 'goalId' in item.subject ? [item.subject.goalId] : []
    )
  )

  return monthGoals.filter((item) => goalIdsWithWork.has(item.goal.id))
}

export function filterUnscheduledMonthInitiatives(
  initiatives: MonthInitiativePlanningItem[],
  dayRef: DayRef
): MonthInitiativePlanningItem[] {
  return initiatives.filter((item) => item.planState.dayRef !== dayRef)
}
