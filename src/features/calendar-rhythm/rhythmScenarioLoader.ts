import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@/domain/period'
import type { Goal, Habit, KeyResult, Tracker, WeeklyIntention } from '@/domain/planning'
import type { MeasurementSubjectType, PriorityVerdict } from '@/domain/planningState'
import { REFLECTION_MATRIX_AREAS } from '@/domain/reflectionMatrix'
import { getDisplayTitle } from '@/domain/journal'
import { annualPlanDexieRepository } from '@/repositories/annualPlanDexieRepository'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { getExerciseEntriesForPeriod } from '@/services/reflectionDataQueries'
import {
  addDaysToDayRef,
  getChildPeriods,
  getPeriodBounds,
  getPeriodRefsForDate,
  isPeriodRef,
} from '@/utils/periods'
import type {
  RhythmAssignment,
  RhythmEntry,
  RhythmObject,
  RhythmScenario,
  RhythmTargetOverride,
} from './rhythmScenario'
import type { Scale } from './rhythmProjections'

/**
 * Builds the calendar's read model from the user's own data.
 *
 * Two production rules are encoded here, because the projections take
 * placements as given:
 *  - "active ⇔ placed": a month/week state that is active without explicit
 *    child placements counts as a placement covering that whole period, which
 *    is how both planners already read it;
 *  - a key result inherits its goal's priorities (the goal itself is only a
 *    container and never becomes a series).
 */

/** Days of padding around the viewed period: boundary weeks reach outside it. */
const PADDING_DAYS = 8

export interface RhythmRange {
  start: DayRef
  end: DayRef
  monthRefs: MonthRef[]
  weekRefs: WeekRef[]
}

/** The day range and the month/week refs the scenario has to cover. */
export function rhythmRange(scale: Scale, periodRef: string): RhythmRange {
  const bounds = getPeriodBounds(periodRef as PeriodRef)
  const start = addDaysToDayRef(bounds.start, -PADDING_DAYS)
  const end = addDaysToDayRef(bounds.end, PADDING_DAYS)
  const monthRefs = new Set<MonthRef>()
  const weekRefs = new Set<WeekRef>()
  for (let cursor = start; cursor <= end; cursor = addDaysToDayRef(cursor, 1)) {
    const refs = getPeriodRefsForDate(cursor)
    monthRefs.add(refs.month)
    weekRefs.add(refs.week)
  }
  // The year scale evaluates every month of the year, so make sure each of
  // those months' weeks is present even when the padding missed them.
  if (scale === 'year') {
    for (const monthRef of getChildPeriods(periodRef as YearRef)) {
      monthRefs.add(monthRef)
      for (const weekRef of getChildPeriods(monthRef)) weekRefs.add(weekRef)
    }
  }
  return { start, end, monthRefs: [...monthRefs], weekRefs: [...weekRefs] }
}

const measurableKey = (subjectType: MeasurementSubjectType, subjectId: string) => `${subjectType}:${subjectId}`

function ratingScaleOf(subject: { ratingScaleMin?: number; ratingScale?: number }): { min: number; max: number } | undefined {
  if (subject.ratingScale === undefined && subject.ratingScaleMin === undefined) return undefined
  return { min: subject.ratingScaleMin ?? 1, max: subject.ratingScale ?? 5 }
}

function statusOf(status: string): 'open' | 'retired' {
  return status === 'open' ? 'open' : 'retired'
}

export async function buildRhythmScenario(scale: Scale, periodRef: string, clock: DayRef): Promise<RhythmScenario> {
  const range = rhythmRange(scale, periodRef)
  const yearRef = periodRef.slice(0, 4) as YearRef

  const [
    priorities,
    goals,
    keyResults,
    habits,
    trackers,
    intentions,
    monthStates,
    weekStates,
    dayAssignments,
    entries,
    monthPlans,
    weekPlans,
    weeklyReflections,
    monthlyReflections,
    objectReflections,
    journalEntries,
    emotionLogs,
    exerciseEntries,
    annualPlan,
  ] = await Promise.all([
    priorityDexieRepository.listAll(),
    goalDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    weeklyIntentionDexieRepository.listAll(),
    planningStateDexieRepository.listMeasurementMonthStatesForMonths(range.monthRefs),
    planningStateDexieRepository.listMeasurementWeekStatesForWeeks(range.weekRefs),
    planningStateDexieRepository.listMeasurementDayAssignmentsForDayRange(range.start, range.end),
    planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(range.start, range.end),
    periodPlanDexieRepository.listMonthPlans(),
    periodPlanDexieRepository.listWeekPlans(),
    structuredReflectionDexieRepository.listWeekly(),
    structuredReflectionDexieRepository.listMonthly(),
    reflectionDexieRepository.listPeriodObjectReflections(),
    journalDexieRepository.getAll(),
    emotionLogDexieRepository.getAll(),
    getExerciseEntriesForPeriod(range.start, `${range.end}T23:59:59.999Z`),
    annualPlanDexieRepository.getByYearRef(yearRef),
  ])

  const goalPriorityIds = new Map(goals.map(goal => [goal.id, goal.priorityIds ?? []]))
  const objects: RhythmObject[] = [
    ...goals.map(
      (goal: Goal): RhythmObject => ({
        key: `goal:${goal.id}`,
        title: goal.title,
        family: 'goal',
        priorityKeys: goal.priorityIds ?? [],
        entryMode: 'completion',
        cadence: 'monthly',
        evidenceRole: 'action',
        icon: goal.icon,
        status: statusOf(goal.status),
      }),
    ),
    ...keyResults.map(
      (result: KeyResult): RhythmObject => ({
        key: measurableKey('keyResult', result.id),
        title: result.title,
        family: 'keyResult',
        goalKey: `goal:${result.goalId}`,
        priorityKeys: goalPriorityIds.get(result.goalId) ?? [],
        entryMode: result.entryMode,
        cadence: result.cadence,
        target: result.target,
        evidenceRole: 'action',
        ratingScale: ratingScaleOf(result),
        multiItems: result.multiItems,
        multiThreshold: result.multiDailyThreshold,
        icon: goals.find(goal => goal.id === result.goalId)?.icon,
        status: statusOf(result.status),
        subjectType: 'keyResult',
        subjectId: result.id,
      }),
    ),
    ...habits.map(
      (habit: Habit): RhythmObject => ({
        key: measurableKey('habit', habit.id),
        title: habit.title,
        family: 'habit',
        priorityKeys: habit.priorityIds ?? [],
        entryMode: habit.entryMode,
        cadence: habit.cadence,
        target: habit.target,
        evidenceRole: 'action',
        ratingScale: ratingScaleOf(habit),
        multiItems: habit.multiItems,
        multiThreshold: habit.multiDailyThreshold,
        icon: habit.icon,
        status: statusOf(habit.status),
        subjectType: 'habit',
        subjectId: habit.id,
      }),
    ),
    ...trackers.map(
      (tracker: Tracker): RhythmObject => ({
        key: measurableKey('tracker', tracker.id),
        title: tracker.title,
        family: 'tracker',
        priorityKeys: tracker.priorityIds ?? [],
        entryMode: tracker.entryMode,
        cadence: tracker.cadence,
        evidenceRole: 'observation',
        ratingScale: ratingScaleOf(tracker),
        multiItems: tracker.multiItems,
        multiThreshold: tracker.multiDailyThreshold,
        icon: tracker.icon,
        status: statusOf(tracker.status),
        subjectType: 'tracker',
        subjectId: tracker.id,
      }),
    ),
    ...intentions.map(
      (intention: WeeklyIntention): RhythmObject => ({
        key: measurableKey('weeklyIntention', intention.id),
        title: intention.title,
        family: 'intention',
        priorityKeys: intention.priorityIds ?? [],
        entryMode: intention.entryMode,
        cadence: 'weekly',
        target: intention.target,
        evidenceRole: 'action',
        ratingScale: ratingScaleOf(intention),
        multiItems: intention.multiItems,
        multiThreshold: intention.multiDailyThreshold,
        weekRef: intention.weekRef,
        icon: intention.icon,
        status: statusOf(intention.status),
        subjectType: 'weeklyIntention',
        subjectId: intention.id,
      }),
    ),
  ]

  const assignments: RhythmAssignment[] = []
  const overrides: RhythmTargetOverride[] = []

  for (const state of monthStates) {
    const objectKey = measurableKey(state.subjectType, state.subjectId)
    // Active without explicit placement behaves exactly like whole-month cover.
    if (state.activityState === 'active' && (state.scheduleScope === 'whole-month' || state.scheduleScope === 'unassigned')) {
      assignments.push({ id: `${objectKey}@${state.monthRef}`, objectKey, scope: { kind: 'month', ref: state.monthRef } })
    }
    if (state.targetOverride) {
      overrides.push({ objectKey, scope: { kind: 'month', ref: state.monthRef }, target: state.targetOverride })
    }
  }

  for (const state of weekStates) {
    const objectKey = measurableKey(state.subjectType, state.subjectId)
    if (state.activityState === 'active' && (state.scheduleScope === 'whole-week' || state.scheduleScope === 'unassigned')) {
      assignments.push({ id: `${objectKey}@${state.weekRef}`, objectKey, scope: { kind: 'week', ref: state.weekRef } })
    }
    if (state.targetOverride) {
      overrides.push({ objectKey, scope: { kind: 'week', ref: state.weekRef }, target: state.targetOverride })
    }
  }

  for (const assignment of dayAssignments) {
    const objectKey = measurableKey(assignment.subjectType, assignment.subjectId)
    assignments.push({ id: assignment.id, objectKey, scope: { kind: 'day', ref: assignment.dayRef } })
  }

  const rhythmEntries: RhythmEntry[] = entries.map(entry => ({
    id: entry.id,
    objectKey: measurableKey(entry.subjectType, entry.subjectId),
    dayRef: entry.dayRef,
    value: entry.value ?? undefined,
    checkedItemIds: entry.checkedItemIds,
  }))

  const verdictsByMonth = new Map<string, { priorityKey: string; effort: number | null; verdict: PriorityVerdict | '' }[]>()
  for (const reflection of objectReflections) {
    if (reflection.periodType !== 'month' || reflection.subjectType !== 'priority') continue
    const list = verdictsByMonth.get(reflection.periodRef) ?? []
    list.push({ priorityKey: reflection.subjectId, effort: reflection.effort ?? null, verdict: reflection.verdict ?? '' })
    verdictsByMonth.set(reflection.periodRef, list)
  }

  const inRange = (isoDate: string) => {
    const dayRef = isoDate.slice(0, 10)
    return dayRef >= range.start && dayRef <= range.end
  }
  const dayOf = (isoDate: string) => isoDate.slice(0, 10) as DayRef
  const timeOf = (isoDate: string) => isoDate.slice(11, 16)

  return {
    clock,
    priorities: priorities.map(priority => ({
      key: priority.id,
      title: priority.title,
      icon: priority.icon || 'explore',
      status: priority.status,
      desiredDirection: priority.desiredDirection,
    })),
    objects,
    assignments,
    entries: rhythmEntries,
    overrides,
    weeklyReflections: weeklyReflections.map(reflection => ({
      weekRef: reflection.weekRef,
      status: 'done' as const,
      load: REFLECTION_MATRIX_AREAS.map(area => reflection[area.fields.demands]),
      state: REFLECTION_MATRIX_AREAS.map(area => reflection[area.fields.state]),
      anchors: {
        good: reflection.promptResponses.wentWell ?? '',
        hard: reflection.promptResponses.challenges ?? '',
        lessons: reflection.promptResponses.lessons ?? '',
      },
    })),
    monthlyReflections: monthlyReflections.map(reflection => ({
      monthRef: reflection.monthRef,
      status: 'done' as const,
      compass: [
        reflection.balanceRating,
        reflection.purposeRating,
        reflection.growthRating,
        reflection.coherenceRating,
        reflection.agencyRating,
      ],
      anchors: {
        proud: reflection.promptResponses.proudOf ?? '',
        challenges: reflection.promptResponses.challenges ?? '',
        growth: reflection.promptResponses.growth ?? '',
      },
      priorityVerdicts: verdictsByMonth.get(reflection.monthRef) ?? [],
    })),
    journal: journalEntries.filter(entry => inRange(entry.createdAt)).map(entry => ({
      id: entry.id,
      dayRef: dayOf(entry.createdAt),
      time: timeOf(entry.createdAt),
      title: getDisplayTitle(entry) || undefined,
      excerpt: (entry.body ?? '').slice(0, 160),
      emotionWords: [],
      tagCount: (entry.peopleTagIds?.length ?? 0) + (entry.contextTagIds?.length ?? 0),
    })),
    emotions: emotionLogs.filter(log => inRange(log.createdAt)).map(log => ({
      id: log.id,
      dayRef: dayOf(log.createdAt),
      time: timeOf(log.createdAt),
      words: (log.emotions ?? []).map(selection => ({ label: selection.emotionId, intensity: selection.intensity ?? 0 })),
      pleasant: true,
      note: log.note,
    })),
    exercises: exerciseEntries.map((entry, index) => ({
      id: `${entry.type}-${index}`,
      dayRef: dayOf(entry.createdAt),
      title: entry.type,
    })),
    monthPlans: monthPlans.map(plan => ({ monthRef: plan.monthRef, topPriorityKeys: plan.topPriorityIds ?? [] })),
    weekPlans: weekPlans.map(plan => ({
      weekRef: plan.weekRef,
      topObjectKeys: (plan.topPriorities ?? []).map(ref => measurableKey(ref.subjectType, ref.subjectId)),
    })),
    yearPlans:
      annualPlan && isPeriodRef(yearRef)
        ? [
            {
              yearRef,
              motif: annualPlan.narrative?.theme ?? '',
              narrative: annualPlan.narrative?.story ?? annualPlan.annualBriefNote ?? '',
              topPriorityKeys: priorities.filter(priority => priority.years.includes(yearRef)).map(priority => priority.id),
            },
          ]
        : [],
  }
}
