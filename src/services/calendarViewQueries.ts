import type { MonthRef, WeekRef, YearRef } from '@/domain/period'
import type { KeyResult, Habit, Tracker, WeeklyIntention } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  MeasurementSubjectType,
  PeriodObjectReflection,
  PeriodReflection,
} from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import {
  applyMeasurementTargetCascade,
  applyMeasurementTargetOverride,
  buildMeasurementSummary,
} from '@/services/measurementProgress'
import { classifyWeek, tallyWeekStates } from '@/domain/weeklyCadence'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { loadPlanningCached } from '@/services/planningQueryCache'
import type {
  MonthGoalPlanningItem,
  MonthMeasurementPlanningItem,
  MonthPlanningBundle,
} from '@/services/planningStateQueries'
import { resolvePlannedWeekRefs } from '@/services/planningStateQueries'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

type MeasureableSubject = KeyResult | Habit | Tracker | WeeklyIntention

export interface YearMonthPillData {
  id: string
  title: string
  cadence: 'weekly' | 'monthly'
  monthlyStatus?: 'met' | 'missed' | 'no-data'
  /** Weekly cadence: assigned weeks met / assigned weeks decided so far (domain/weeklyCadence). */
  weeksMet?: number
  weeksTotal?: number
}

export interface YearMonthGoalGroup {
  goalId: string
  goalIcon?: string
  pills: YearMonthPillData[]
}

export interface YearMonthHabitGroup {
  habitId: string
  habitIcon?: string
  pill: YearMonthPillData
}

export interface CalendarYearMonthSummary {
  monthRef: MonthRef
  hasPlan: boolean
  hasReflection: boolean
  activeGoalCount: number
  activeCadencedCount: number
  activeTrackerCount: number
  /** Non-archived weekly intentions whose week overlaps the month (same rule as the month overview). */
  activeIntentionCount: number
  goalGroups: YearMonthGoalGroup[]
  habitGroups: YearMonthHabitGroup[]
}

export interface CalendarYearSummary {
  yearRef: YearRef
  months: CalendarYearMonthSummary[]
  totals: {
    activeGoalCount: number
    activeCadencedCount: number
    activeTrackerCount: number
    activeIntentionCount: number
  }
}

export interface MonthReflectionBundle {
  monthRef: MonthRef
  periodReflection?: PeriodReflection
  objectReflections: PeriodObjectReflection[]
}

const monthReflectionBundleCache = new Map<
  string,
  { revision: number; value: MonthReflectionBundle | Promise<MonthReflectionBundle> }
>()
const calendarYearSummaryCache = new Map<
  string,
  { revision: number; value: CalendarYearSummary | Promise<CalendarYearSummary> }
>()

/**
 * Clears all calendar/reflection view caches in this module.
 *
 * These Map caches live at module scope (i.e., they are shared
 * across all users in a single browser session). When the active user
 * changes, the cached bundles refer to the previous user's IndexedDB
 * data and must be dropped so subsequent reads re-fetch from the new
 * per-user database connection.
 *
 * Called by `resetAppState()` in `src/services/appStateReset.ts`.
 */
export function clearCalendarViewCaches(): void {
  monthReflectionBundleCache.clear()
  calendarYearSummaryCache.clear()
}

function isTracker(subject: MeasureableSubject): subject is Tracker {
  return !('target' in subject)
}

function resolveSubjectType(subject: MeasureableSubject): MeasurementSubjectType {
  if ('goalId' in subject) {
    return 'keyResult'
  }

  if ('weekRef' in subject) {
    return 'weeklyIntention'
  }

  return 'target' in subject ? 'habit' : 'tracker'
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
        item => item.periodType === 'month' && item.periodRef === monthRef
      ),
    }
  })
}

export async function getCalendarYearSummary(yearRef: YearRef): Promise<CalendarYearSummary> {
  return loadPlanningCached(calendarYearSummaryCache, yearRef, async () => {
    const monthRefs = getChildPeriods(yearRef) as MonthRef[]
    const monthRefsSet = new Set(monthRefs)

    // Expand entry load range to cover weeks overlapping year boundaries
    const firstMonthWeeks = getChildPeriods(monthRefs[0]) as WeekRef[]
    const lastMonthWeeks = getChildPeriods(monthRefs[11]) as WeekRef[]
    const entryStart = getPeriodBounds(firstMonthWeeks[0]).start
    const entryEnd = getPeriodBounds(lastMonthWeeks[lastMonthWeeks.length - 1]).end

    const [
      monthPlans,
      periodReflections,
      goalMonthStates,
      measurementMonthStates,
      weeklyIntentions,
      objects,
      allEntries,
      measurementWeekStates,
      measurementDayAssignments,
    ] = await Promise.all([
      periodPlanDexieRepository.listMonthPlans(),
      reflectionDexieRepository.listPeriodReflections(),
      planningStateDexieRepository.listGoalMonthStatesForMonths(monthRefs),
      planningStateDexieRepository.listMeasurementMonthStatesForMonths(monthRefs),
      weeklyIntentionDexieRepository.listAll(),
      loadPlanningCoreObjects(),
      planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(entryStart, entryEnd),
      planningStateDexieRepository.listMeasurementWeekStatesForWeeks([
        ...new Set(monthRefs.flatMap(monthRef => getChildPeriods(monthRef) as WeekRef[])),
      ]),
      planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(entryStart, entryEnd),
    ])
    const todayRef = getPeriodRefsForDate(new Date()).day

    const monthPlanRefs = new Set(monthPlans.map(item => item.monthRef))
    const monthReflectionRefs = new Set(
      periodReflections
        .filter(item => item.periodType === 'month')
        .map(item => item.periodRef as MonthRef)
    )
    // History-faithful resolution: include every non-archived object regardless of
    // status. Whether an object counts for a given month is decided by its link
    // record's `activityState === 'active'` below — a closed (completed/dropped/
    // retired) object stays visible in the months it was active. Archived objects
    // (isActive: false) remain hidden everywhere.
    const visibleGoals = objects.goals.filter(goal => goal.isActive)
    const visibleGoalIds = new Set(visibleGoals.map(goal => goal.id))
    const visibleGoalMap = new Map(visibleGoals.map(goal => [goal.id, goal]))
    const visibleKeyResults = objects.keyResults.filter(kr => kr.isActive)
    const visibleKrMap = new Map(visibleKeyResults.map(kr => [kr.id, kr]))
    const visibleSubjects = [...objects.keyResults, ...objects.habits, ...objects.trackers].filter(
      subject => subject.isActive
    )
    const visibleSubjectKeys = new Set(
      visibleSubjects.map(subject => `${resolveSubjectType(subject)}:${subject.id}`)
    )
    const visibleTrackerKeys = new Set(
      visibleSubjects
        .filter(isTracker)
        .map(tracker => `${resolveSubjectType(tracker)}:${tracker.id}`)
    )
    // Weekly intentions belong to exactly one week; a week counts for every
    // month it overlaps — the same child-period rule the month overview uses.
    const visibleIntentions = weeklyIntentions.filter(intention => intention.isActive)
    const monthWeekRefs = new Map(
      monthRefs.map(monthRef => [monthRef, new Set(getChildPeriods(monthRef) as WeekRef[])])
    )
    const yearWeekRefs = new Set([...monthWeekRefs.values()].flatMap(refs => [...refs]))

    // Filter entries by subject type for pill data
    const krEntries = allEntries.filter(entry => entry.subjectType === 'keyResult')
    const habitEntries = allEntries.filter(entry => entry.subjectType === 'habit')

    const visibleHabits = objects.habits.filter(habit => habit.isActive)
    const visibleHabitMap = new Map(visibleHabits.map(h => [h.id, h]))

    /**
     * Monthly cadence: the month summary under the month's target. Weekly
     * cadence: week by week like the week plan (assigned weeks only, target
     * cascade month → week, whole-week entries), counted by domain/weeklyCadence
     * — a boundary week is judged on all seven days, future weeks never count.
     */
    function buildPillData(
      subject: MeasureableSubject,
      subjectType: MeasurementSubjectType,
      entries: DailyMeasurementEntry[],
      monthRef: MonthRef,
      weekRefs: WeekRef[]
    ): YearMonthPillData {
      const monthState = measurementMonthStates.find(
        state =>
          state.monthRef === monthRef &&
          state.subjectType === subjectType &&
          state.subjectId === subject.id
      )
      if (subject.cadence === 'monthly') {
        const summary = buildMeasurementSummary(
          applyMeasurementTargetOverride(subject, monthState?.targetOverride),
          entries,
          monthRef
        )
        return {
          id: subject.id,
          title: subject.title,
          cadence: 'monthly',
          monthlyStatus: summary.evaluationStatus ?? 'no-data',
        }
      }

      const isSubject = (state: { subjectType: MeasurementSubjectType; subjectId: string }) =>
        state.subjectType === subjectType && state.subjectId === subject.id
      const weekStates = measurementWeekStates.filter(isSubject)
      const planned = new Set(
        resolvePlannedWeekRefs(
          monthRef,
          monthState?.scheduleScope,
          weekStates,
          measurementDayAssignments.filter(isSubject),
          'weekly'
        )
      )
      const tally = tallyWeekStates(
        weekRefs.map(weekRef => {
          const effective = applyMeasurementTargetCascade(subject, weekRef, {
            monthOverride: monthState?.targetOverride,
            weekOverride: weekStates.find(
              state => state.weekRef === weekRef && !state.sourceMonthRef
            )?.targetOverride,
          })
          const summary = buildMeasurementSummary(effective, entries, weekRef)
          return classifyWeek(weekRef, planned.has(weekRef), summary.evaluationStatus, todayRef)
        })
      )

      return {
        id: subject.id,
        title: subject.title,
        cadence: 'weekly',
        weeksMet: tally.met,
        weeksTotal: tally.planned,
      }
    }

    function buildGoalGroupsForMonth(monthRef: MonthRef): YearMonthGoalGroup[] {
      const activeGoalIdsForMonth = new Set(
        goalMonthStates
          .filter(
            state =>
              state.monthRef === monthRef &&
              state.activityState === 'active' &&
              visibleGoalIds.has(state.goalId)
          )
          .map(state => state.goalId)
      )

      const activeKrIds = new Set(
        measurementMonthStates
          .filter(
            state =>
              state.monthRef === monthRef &&
              state.activityState === 'active' &&
              state.subjectType === 'keyResult' &&
              visibleKrMap.has(state.subjectId)
          )
          .map(state => state.subjectId)
      )

      const krsByGoal = new Map<string, KeyResult[]>()
      for (const krId of activeKrIds) {
        const kr = visibleKrMap.get(krId)
        if (!kr) continue
        const existing = krsByGoal.get(kr.goalId) ?? []
        existing.push(kr)
        krsByGoal.set(kr.goalId, existing)
        activeGoalIdsForMonth.add(kr.goalId)
      }

      const weekRefs = getChildPeriods(monthRef) as WeekRef[]

      return [...activeGoalIdsForMonth].map(goalId => {
        const goal = visibleGoalMap.get(goalId)
        const krs = krsByGoal.get(goalId) ?? []

        return {
          goalId,
          goalIcon: goal?.icon,
          pills: krs.map(kr => buildPillData(kr, 'keyResult', krEntries, monthRef, weekRefs)),
        }
      })
    }

    function buildHabitGroupsForMonth(monthRef: MonthRef): YearMonthHabitGroup[] {
      const activeHabitIds = new Set(
        measurementMonthStates
          .filter(
            state =>
              state.monthRef === monthRef &&
              state.activityState === 'active' &&
              state.subjectType === 'habit' &&
              visibleHabitMap.has(state.subjectId)
          )
          .map(state => state.subjectId)
      )

      const weekRefs = getChildPeriods(monthRef) as WeekRef[]

      return [...activeHabitIds].flatMap(habitId => {
        const habit = visibleHabitMap.get(habitId)
        if (!habit) return []
        return [
          {
            habitId,
            habitIcon: habit.icon,
            pill: buildPillData(habit, 'habit', habitEntries, monthRef, weekRefs),
          },
        ]
      })
    }

    return {
      yearRef,
      months: monthRefs.map(monthRef => ({
        monthRef,
        hasPlan: monthPlanRefs.has(monthRef),
        hasReflection: monthReflectionRefs.has(monthRef),
        activeGoalCount: new Set(
          goalMonthStates
            .filter(
              state =>
                state.monthRef === monthRef &&
                state.activityState === 'active' &&
                visibleGoalIds.has(state.goalId)
            )
            .map(state => state.goalId)
        ).size,
        activeCadencedCount: new Set(
          measurementMonthStates
            .filter(
              state =>
                state.monthRef === monthRef &&
                state.activityState === 'active' &&
                state.subjectType !== 'tracker' &&
                visibleSubjectKeys.has(`${state.subjectType}:${state.subjectId}`)
            )
            .map(state => `${state.subjectType}:${state.subjectId}`)
        ).size,
        activeTrackerCount: new Set(
          measurementMonthStates
            .filter(
              state =>
                state.monthRef === monthRef &&
                state.activityState === 'active' &&
                state.subjectType === 'tracker' &&
                visibleTrackerKeys.has(`${state.subjectType}:${state.subjectId}`)
            )
            .map(state => `${state.subjectType}:${state.subjectId}`)
        ).size,
        activeIntentionCount: visibleIntentions.filter(intention =>
          monthWeekRefs.get(monthRef)?.has(intention.weekRef)
        ).length,
        goalGroups: buildGoalGroupsForMonth(monthRef),
        habitGroups: buildHabitGroupsForMonth(monthRef),
      })),
      totals: {
        activeGoalCount: new Set(
          goalMonthStates
            .filter(
              state =>
                monthRefsSet.has(state.monthRef) &&
                state.activityState === 'active' &&
                visibleGoalIds.has(state.goalId)
            )
            .map(state => state.goalId)
        ).size,
        activeCadencedCount: new Set(
          measurementMonthStates
            .filter(
              state =>
                monthRefsSet.has(state.monthRef) &&
                state.activityState === 'active' &&
                state.subjectType !== 'tracker' &&
                visibleSubjectKeys.has(`${state.subjectType}:${state.subjectId}`)
            )
            .map(state => `${state.subjectType}:${state.subjectId}`)
        ).size,
        activeTrackerCount: new Set(
          measurementMonthStates
            .filter(
              state =>
                monthRefsSet.has(state.monthRef) &&
                state.activityState === 'active' &&
                state.subjectType === 'tracker' &&
                visibleTrackerKeys.has(`${state.subjectType}:${state.subjectId}`)
            )
            .map(state => `${state.subjectType}:${state.subjectId}`)
        ).size,
        activeIntentionCount: visibleIntentions.filter(intention =>
          yearWeekRefs.has(intention.weekRef)
        ).length,
      },
    }
  })
}

export function splitMonthMeasurementItems(bundle: MonthPlanningBundle): {
  keyResults: MonthMeasurementPlanningItem[]
  habits: MonthMeasurementPlanningItem[]
  trackers: MonthMeasurementPlanningItem[]
} {
  return {
    keyResults: bundle.measurementItems.filter(item => item.subjectType === 'keyResult'),
    habits: bundle.measurementItems.filter(item => item.subjectType === 'habit'),
    trackers: bundle.measurementItems.filter(item => item.subjectType === 'tracker'),
  }
}

export function filterMonthGoalsWithLinkedWork(
  monthGoals: MonthGoalPlanningItem[],
  monthItems: MonthPlanningBundle['measurementItems']
): MonthGoalPlanningItem[] {
  const goalIdsWithWork = new Set(
    monthItems.flatMap(item =>
      item.subjectType === 'keyResult' && 'goalId' in item.subject ? [item.subject.goalId] : []
    )
  )

  return monthGoals.filter(item => goalIdsWithWork.has(item.goal.id))
}
