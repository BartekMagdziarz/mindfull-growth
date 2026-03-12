import type { DayRef, MonthRef, PeriodRefsForDate, WeekRef, YearRef } from '@/domain/period'
import type { Goal, Initiative, KeyResult, Habit, Tracker } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementSubjectType, PeriodObjectReflection, PeriodReflection } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { loadPlanningCached } from '@/services/planningQueryCache'
import type {
  MonthGoalPlanningItem,
  MonthInitiativePlanningItem,
  MonthMeasurementPlanningItem,
  MonthPlanningBundle,
  WeekInitiativePlanningItem,
  WeekMeasurementPlanningItem,
  WeekPlanningBundle,
  WeekReflectionBundle,
} from '@/services/planningStateQueries'
import {
  getMonthPlanningBundle,
  getWeekPlanningBundle,
  getWeekReflectionBundle,
} from '@/services/planningStateQueries'
import { getChildPeriods, getPeriodRefsForDate, getWeekOverlappingMonths } from '@/utils/periods'

type MeasureableSubject = KeyResult | Habit | Tracker

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

export interface DayMeasurementEntryItem {
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  entry: DailyMeasurementEntry
}

export interface DayCalendarBundle {
  dayRef: DayRef
  refs: PeriodRefsForDate
  weekPlanning: WeekPlanningBundle
  weekReflection: WeekReflectionBundle
  monthPlanning: MonthPlanningBundle
  monthReflection: MonthReflectionBundle
  scheduledMeasurementItems: WeekMeasurementPlanningItem[]
  scheduledInitiativeItems: WeekInitiativePlanningItem[]
  entriesToday: DayMeasurementEntryItem[]
  contextMeasurementItems: WeekMeasurementPlanningItem[]
  contextInitiativeItems: WeekInitiativePlanningItem[]
}

const monthReflectionBundleCache = new Map<
  string,
  { revision: number; value: MonthReflectionBundle | Promise<MonthReflectionBundle> }
>()
const calendarYearSummaryCache = new Map<
  string,
  { revision: number; value: CalendarYearSummary | Promise<CalendarYearSummary> }
>()
const dayCalendarBundleCache = new Map<
  string,
  { revision: number; value: DayCalendarBundle | Promise<DayCalendarBundle> }
>()

function isGoalOpen(goal: Goal): boolean {
  return goal.isActive && goal.status === 'open'
}

function isMeasurementSubjectOpen(subject: MeasureableSubject): boolean {
  return subject.isActive && subject.status === 'open'
}

function isTracker(subject: MeasureableSubject): subject is Tracker {
  return !('target' in subject)
}

function isInitiativeActive(initiative: Initiative): boolean {
  return initiative.isActive && initiative.status === 'open'
}

function resolveSubjectType(subject: MeasureableSubject): MeasurementSubjectType {
  if ('goalId' in subject) {
    return 'keyResult'
  }

  return 'target' in subject ? 'habit' : 'tracker'
}

function isInitiativePlanInMonth(
  planState: { monthRef?: MonthRef; weekRef?: WeekRef; dayRef?: DayRef },
  monthRef: MonthRef,
): boolean {
  return (
    planState.monthRef === monthRef ||
    (planState.weekRef ? getWeekOverlappingMonths(planState.weekRef).includes(monthRef) : false) ||
    (planState.dayRef ? getPeriodRefsForDate(planState.dayRef).month === monthRef : false)
  )
}

function isMeasurementScheduledOnDay(item: WeekMeasurementPlanningItem, dayRef: DayRef): boolean {
  return (
    item.planning.scheduleScope === 'whole-week' ||
    item.planning.scheduleScope === 'whole-month' ||
    item.planning.scheduledDayRefs.includes(dayRef)
  )
}

function isInitiativeScheduledOnDay(item: WeekInitiativePlanningItem, dayRef: DayRef): boolean {
  return item.planState.dayRef === dayRef
}

export async function getMonthReflectionBundle(monthRef: MonthRef): Promise<MonthReflectionBundle> {
  return loadPlanningCached(monthReflectionBundleCache, monthRef, async () => {
    const [periodReflection, objectReflections] = await Promise.all([
      reflectionDexieRepository.getPeriodReflection('month', monthRef),
      reflectionDexieRepository.listPeriodObjectReflections(),
    ])

    return {
      monthRef,
      periodReflection,
      objectReflections: objectReflections.filter(
        (item) => item.periodType === 'month' && item.periodRef === monthRef,
      ),
    }
  })
}

export async function getCalendarYearSummary(yearRef: YearRef): Promise<CalendarYearSummary> {
  return loadPlanningCached(calendarYearSummaryCache, yearRef, async () => {
    const monthRefs = getChildPeriods(yearRef) as MonthRef[]
    const monthRefsSet = new Set(monthRefs)
    const [
      monthPlans,
      periodReflections,
      goalMonthStates,
      measurementMonthStates,
      initiativePlanStates,
      objects,
    ] = await Promise.all([
      periodPlanDexieRepository.listMonthPlans(),
      reflectionDexieRepository.listPeriodReflections(),
      planningStateDexieRepository.listGoalMonthStatesForMonths(monthRefs),
      planningStateDexieRepository.listMeasurementMonthStatesForMonths(monthRefs),
      planningStateDexieRepository.listInitiativePlanStates(),
      loadPlanningCoreObjects(),
    ])

    const monthPlanRefs = new Set(monthPlans.map((item) => item.monthRef))
    const monthReflectionRefs = new Set(
      periodReflections
        .filter((item) => item.periodType === 'month')
        .map((item) => item.periodRef as MonthRef),
    )
    const openGoalIds = new Set(objects.goals.filter(isGoalOpen).map((goal) => goal.id))
    const openSubjects = [...objects.keyResults, ...objects.habits, ...objects.trackers].filter(
      isMeasurementSubjectOpen,
    )
    const openSubjectKeys = new Set(
      openSubjects.map((subject) => `${resolveSubjectType(subject)}:${subject.id}`),
    )
    const openTrackerKeys = new Set(
      openSubjects
        .filter(isTracker)
        .map((tracker) => `${resolveSubjectType(tracker)}:${tracker.id}`),
    )
    const activeInitiativeIds = new Set(
      objects.initiatives.filter(isInitiativeActive).map((initiative) => initiative.id),
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
                openGoalIds.has(state.goalId),
            )
            .map((state) => state.goalId),
        ).size,
        activeCadencedCount: new Set(
          measurementMonthStates
            .filter(
              (state) =>
                state.monthRef === monthRef &&
                state.activityState === 'active' &&
                state.subjectType !== 'tracker' &&
                openSubjectKeys.has(`${state.subjectType}:${state.subjectId}`),
            )
            .map((state) => `${state.subjectType}:${state.subjectId}`),
        ).size,
        activeTrackerCount: new Set(
          measurementMonthStates
            .filter(
              (state) =>
                state.monthRef === monthRef &&
                state.activityState === 'active' &&
                state.subjectType === 'tracker' &&
                openTrackerKeys.has(`${state.subjectType}:${state.subjectId}`),
            )
            .map((state) => `${state.subjectType}:${state.subjectId}`),
        ).size,
        activeInitiativeCount: new Set(
          initiativePlanStates
            .filter(
              (state) =>
                activeInitiativeIds.has(state.initiativeId) &&
                isInitiativePlanInMonth(state, monthRef),
            )
            .map((state) => state.initiativeId),
        ).size,
      })),
      totals: {
        activeGoalCount: new Set(
          goalMonthStates
            .filter(
              (state) =>
                monthRefsSet.has(state.monthRef) &&
                state.activityState === 'active' &&
                openGoalIds.has(state.goalId),
            )
            .map((state) => state.goalId),
        ).size,
        activeCadencedCount: new Set(
          measurementMonthStates
            .filter(
              (state) =>
                monthRefsSet.has(state.monthRef) &&
                state.activityState === 'active' &&
                state.subjectType !== 'tracker' &&
                openSubjectKeys.has(`${state.subjectType}:${state.subjectId}`),
            )
            .map((state) => `${state.subjectType}:${state.subjectId}`),
        ).size,
        activeTrackerCount: new Set(
          measurementMonthStates
            .filter(
              (state) =>
                monthRefsSet.has(state.monthRef) &&
                state.activityState === 'active' &&
                state.subjectType === 'tracker' &&
                openTrackerKeys.has(`${state.subjectType}:${state.subjectId}`),
            )
            .map((state) => `${state.subjectType}:${state.subjectId}`),
        ).size,
        activeInitiativeCount: new Set(
          initiativePlanStates
            .filter(
              (state) =>
                activeInitiativeIds.has(state.initiativeId) &&
                monthRefs.some((monthRef) => isInitiativePlanInMonth(state, monthRef)),
            )
            .map((state) => state.initiativeId),
        ).size,
      },
    }
  })
}

export async function getDayCalendarBundle(dayRef: DayRef): Promise<DayCalendarBundle> {
  return loadPlanningCached(dayCalendarBundleCache, dayRef, async () => {
    const refs = getPeriodRefsForDate(dayRef)
    const [weekPlanning, weekReflection, monthPlanning, monthReflection, dailyEntries, objects] =
      await Promise.all([
        getWeekPlanningBundle(refs.week),
        getWeekReflectionBundle(refs.week),
        getMonthPlanningBundle(refs.month),
        getMonthReflectionBundle(refs.month),
        planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(dayRef, dayRef),
        loadPlanningCoreObjects(),
      ])

    const subjectMap = new Map(
      [...objects.keyResults, ...objects.habits, ...objects.trackers]
        .filter(isMeasurementSubjectOpen)
        .map((subject) => [`${resolveSubjectType(subject)}:${subject.id}`, subject] as const),
    )

    const scheduledMeasurementItems = weekPlanning.relevant.measurementItems.filter((item) =>
      isMeasurementScheduledOnDay(item, dayRef),
    )
    const scheduledInitiativeItems = weekPlanning.relevant.initiativeItems.filter((item) =>
      isInitiativeScheduledOnDay(item, dayRef),
    )
    const entriesToday = dailyEntries
      .filter((entry) => entry.dayRef === dayRef)
      .flatMap((entry) => {
        const subject = subjectMap.get(`${entry.subjectType}:${entry.subjectId}`)
        return subject ? [{ subjectType: entry.subjectType, subject, entry }] : []
      })

    return {
      dayRef,
      refs,
      weekPlanning,
      weekReflection,
      monthPlanning,
      monthReflection,
      scheduledMeasurementItems,
      scheduledInitiativeItems,
      entriesToday,
      contextMeasurementItems: weekPlanning.relevant.measurementItems.filter(
        (item) => !isMeasurementScheduledOnDay(item, dayRef),
      ),
      contextInitiativeItems: weekPlanning.relevant.initiativeItems.filter(
        (item) => !isInitiativeScheduledOnDay(item, dayRef),
      ),
    }
  })
}

export function countGoalKeyResults(
  goalId: string,
  items: Array<{ subjectType: MeasurementSubjectType; subject: MeasureableSubject }>,
): number {
  return items.filter(
    (item) => item.subjectType === 'keyResult' && 'goalId' in item.subject && item.subject.goalId === goalId,
  ).length
}

export function hasObjectReflection(
  subjectType: PeriodObjectReflection['subjectType'],
  subjectId: string,
  objectReflections: PeriodObjectReflection[],
): boolean {
  return objectReflections.some(
    (item) => item.subjectType === subjectType && item.subjectId === subjectId,
  )
}

export function splitMonthMeasurementItems(bundle: MonthPlanningBundle): {
  keyResults: MonthMeasurementPlanningItem[]
  habits: MonthMeasurementPlanningItem[]
  trackers: MonthMeasurementPlanningItem[]
} {
  return {
    keyResults: bundle.measurementItems.filter((item) => item.subjectType === 'keyResult'),
    habits: bundle.measurementItems.filter((item) => item.subjectType === 'habit'),
    trackers: bundle.measurementItems.filter((item) => item.subjectType === 'tracker'),
  }
}

export function splitWeekMeasurementItems(items: WeekPlanningBundle['relevant']['measurementItems']): {
  plannedThisWeek: WeekMeasurementPlanningItem[]
  assignedToDays: WeekMeasurementPlanningItem[]
  toPlanThisWeek: WeekMeasurementPlanningItem[]
} {
  return {
    plannedThisWeek: items.filter((item) => item.placement === 'planned'),
    assignedToDays: items.filter((item) => item.placement === 'assigned'),
    toPlanThisWeek: items.filter((item) => item.placement === 'unassigned'),
  }
}

export function splitWeekInitiativeItems(
  items: WeekPlanningBundle['relevant']['initiativeItems'],
): {
  plannedThisWeek: WeekInitiativePlanningItem[]
  assignedToDays: WeekInitiativePlanningItem[]
  toPlanThisWeek: WeekInitiativePlanningItem[]
} {
  return {
    plannedThisWeek: items.filter((item) => item.placement === 'planned'),
    assignedToDays: items.filter((item) => item.placement === 'assigned'),
    toPlanThisWeek: items.filter((item) => item.placement === 'unassigned'),
  }
}

export function filterMonthGoalsWithLinkedWork(
  monthGoals: MonthGoalPlanningItem[],
  monthItems: MonthPlanningBundle['measurementItems'],
): MonthGoalPlanningItem[] {
  const goalIdsWithWork = new Set(
    monthItems.flatMap((item) =>
      item.subjectType === 'keyResult' && 'goalId' in item.subject ? [item.subject.goalId] : [],
    ),
  )

  return monthGoals.filter((item) => goalIdsWithWork.has(item.goal.id))
}

export function filterUnscheduledMonthInitiatives(
  initiatives: MonthInitiativePlanningItem[],
  dayRef: DayRef,
): MonthInitiativePlanningItem[] {
  return initiatives.filter((item) => item.planState.dayRef !== dayRef)
}
