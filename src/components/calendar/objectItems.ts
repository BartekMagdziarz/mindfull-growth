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
import type { MonthPlanningBundle, WeekReflectionBundle } from '@/services/planningStateQueries'
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
 * Flat list of every object active during the reflection month. Mirrors
 * {@link buildWeekObjectItems}, but per-object measurement is built against the
 * month period (falling back to the bundle's raw entries when not pre-computed).
 */
export function buildMonthObjectItems(bundle: MonthPlanningBundle): MonthObjectItem[] {
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
        measurement:
          kr.measurement ?? buildMeasurementSummary(kr.subject, bundle.rawEntries, bundle.monthRef),
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
      measurement:
        habit.measurement ?? buildMeasurementSummary(habit.subject, bundle.rawEntries, bundle.monthRef),
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
