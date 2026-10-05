/**
 * Flattens a month/week planning bundle into the unified, sorted object-item
 * lists consumed by MonthObjectsGrid / WeekObjectsGrid.
 *
 * This is the single source of truth for that derivation — both the classic
 * CalendarView and the Strumień stream's detail panel use it, so the two views
 * always render the same objects in the same order (KRs by goal → habits →
 * trackers → weekly intentions).
 */
import { buildMeasurementSummary } from '@/services/measurementProgress'
import type { DayRef } from '@/domain/period'
import type { WeeklyIntention } from '@/domain/planning'
import { classifyWeek, statusFromWeekTally, tallyWeekStates } from '@/domain/weeklyCadence'
import { getPeriodRefsForDate } from '@/utils/periods'
import type {
  MonthPlanningBundle,
  WeekMeasurementReflectionItem,
  WeekReflectionBundle,
} from '@/services/planningStateQueries'
import type { MonthObjectItem, WeekObjectItem } from '@/services/reflectionDataQueries'
import type { WeekCadencedReflectionItem } from '@/services/planningStateQueries'
import type { MonthCadencedPlanningItem } from '@/services/planningStateQueries'

/** Flat list of every object active during the reflection week (KR→habit→tracker). */
export function buildWeekObjectItems(reflection: WeekReflectionBundle): WeekObjectItem[] {
  const items: WeekObjectItem[] = []
  const goalMap = new Map(reflection.relevant.goalItems.map((item) => [item.goal.id, item.goal]))

  const krItems = reflection.relevant.cadencedItems.filter(
    (item) => item.subjectType === 'keyResult',
  )
  const habitItems = reflection.relevant.cadencedItems.filter((item) => item.subjectType === 'habit')
  const trackerItems = reflection.relevant.trackerItems

  const krsByGoal = new Map<string, WeekCadencedReflectionItem[]>()
  for (const kr of krItems) {
    if ('goalId' in kr.subject) {
      const list = krsByGoal.get(kr.subject.goalId) ?? []
      list.push(kr)
      krsByGoal.set(kr.subject.goalId, list)
    }
  }

  let goalIndex = 0
  for (const [goalId, krs] of krsByGoal) {
    const goal = goalMap.get(goalId)
    krs.forEach((kr, krIndex) => {
      items.push({
        key: `keyResult:${kr.subject.id}`,
        subjectType: 'keyResult',
        subject: kr.subject,
        planning: kr.planning,
        measurement: kr.measurement,
        weekMeasurement: kr.weekMeasurement,
        parentGoalId: goal?.id,
        parentGoalIcon: goal?.icon,
        parentGoalTitle: goal?.title,
        sortOrder: 1000 * goalIndex + krIndex,
      })
    })
    goalIndex++
  }

  habitItems.forEach((habit, i) => {
    items.push({
      key: `habit:${habit.subject.id}`,
      subjectType: 'habit',
      subject: habit.subject,
      planning: habit.planning,
      measurement: habit.measurement,
      weekMeasurement: habit.weekMeasurement,
      sortOrder: 100_000 + i,
    })
  })

  trackerItems.forEach((tracker, i) => {
    items.push({
      key: `tracker:${tracker.subject.id}`,
      subjectType: 'tracker',
      subject: tracker.subject,
      planning: tracker.planning,
      measurement: tracker.measurement,
      sortOrder: 200_000 + i,
    })
  })

  return items
}

/**
 * The week's weekly intentions from the reflection bundle (they ride along in
 * `relevant.cadencedItems` but are kept out of the objects grid) — feeds the
 * Kontekst plan-vs-execution "Intencje" ring.
 */
export function extractWeekIntentions(reflection: WeekReflectionBundle): WeeklyIntention[] {
  // Upcast: the cadenced narrowing ('keyResult' | 'habit') is a lie at runtime —
  // the guard only excludes trackers, so weeklyIntention items ride along too.
  const items: WeekMeasurementReflectionItem[] = reflection.relevant.cadencedItems
  return items
    .filter((item) => item.subjectType === 'weeklyIntention')
    .map((item) => item.subject as WeeklyIntention)
}

/**
 * Month measurement of a cadenced object. Weekly-cadence objects are read week
 * by week (domain/weeklyCadence): their status comes from the assigned weeks
 * and `weekReadout` carries „met / planned weeks”.
 */
function monthMeasurement(
  item: MonthCadencedPlanningItem,
  bundle: MonthPlanningBundle,
  today: DayRef,
): Pick<MonthObjectItem, 'measurement' | 'weekReadout' | 'weekEvaluations'> {
  const measurement = item.measurement ?? buildMeasurementSummary(item.subject, bundle.rawEntries, bundle.monthRef)
  if (!item.weekEvaluations) return { measurement }
  const tally = tallyWeekStates(
    item.weekEvaluations.map((week) => classifyWeek(week.weekRef, week.planned, week.measurement.evaluationStatus, today)),
  )
  return {
    measurement: { ...measurement, evaluationStatus: statusFromWeekTally(tally) },
    weekReadout: { met: tally.met, planned: tally.planned },
    weekEvaluations: item.weekEvaluations,
  }
}

/**
 * Flat list of every object active during the reflection month. Mirrors
 * {@link buildWeekObjectItems}, but per-object measurement is built against the
 * month period (falling back to the bundle's raw entries when not pre-computed).
 */
export function buildMonthObjectItems(
  bundle: MonthPlanningBundle,
  today: DayRef = getPeriodRefsForDate(new Date()).day,
): MonthObjectItem[] {
  const items: MonthObjectItem[] = []
  const goalMap = new Map(bundle.goalItems.map((item) => [item.goal.id, item.goal]))

  const krItems = bundle.cadencedItems.filter((item) => item.subjectType === 'keyResult')
  const habitItems = bundle.cadencedItems.filter((item) => item.subjectType === 'habit')
  const trackerItems = bundle.trackerItems

  const krsByGoal = new Map<string, MonthCadencedPlanningItem[]>()
  for (const kr of krItems) {
    if ('goalId' in kr.subject) {
      const list = krsByGoal.get(kr.subject.goalId) ?? []
      list.push(kr)
      krsByGoal.set(kr.subject.goalId, list)
    }
  }

  let goalIndex = 0
  for (const [goalId, krs] of krsByGoal) {
    const goal = goalMap.get(goalId)
    krs.forEach((kr, krIndex) => {
      items.push({
        key: `keyResult:${kr.subject.id}`,
        subjectType: 'keyResult',
        subject: kr.subject,
        planning: kr.planning,
        ...monthMeasurement(kr, bundle, today),
        weekTargetOverrides: kr.weekTargetOverrides,
        parentGoalId: goal?.id,
        parentGoalIcon: goal?.icon,
        parentGoalTitle: goal?.title,
        sortOrder: 1000 * goalIndex + krIndex,
      })
    })
    goalIndex++
  }

  habitItems.forEach((habit, i) => {
    items.push({
      key: `habit:${habit.subject.id}`,
      subjectType: 'habit',
      subject: habit.subject,
      planning: habit.planning,
      ...monthMeasurement(habit, bundle, today),
      weekTargetOverrides: habit.weekTargetOverrides,
      sortOrder: 100_000 + i,
    })
  })

  trackerItems.forEach((tracker, i) => {
    items.push({
      key: `tracker:${tracker.subject.id}`,
      subjectType: 'tracker',
      subject: tracker.subject,
      planning: tracker.planning,
      measurement:
        tracker.measurement ??
        buildMeasurementSummary(tracker.subject, bundle.rawEntries, bundle.monthRef),
      sortOrder: 200_000 + i,
    })
  })

  return items
}
