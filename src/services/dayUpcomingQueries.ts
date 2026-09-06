import type { Goal } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { addDaysToDayRef, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

/**
 * A dated signal for the day surfaces: a goal deadline or the next planning
 * ritual that has no plan yet. Pure data — labels are resolved by the caller.
 */
export type DayMarker =
  | { key: string; kind: 'deadline'; dayRef: DayRef; goal: Goal }
  | { key: string; kind: 'ritual'; dayRef: DayRef; ritual: 'week'; weekRef: WeekRef }
  | { key: string; kind: 'ritual'; dayRef: DayRef; ritual: 'month'; monthRef: MonthRef }

export interface DayMarkerRange {
  start: DayRef
  end: DayRef
}

function inRange(dayRef: DayRef, range: DayMarkerRange): boolean {
  return dayRef >= range.start && dayRef <= range.end
}

function nextMondayAfter(todayRef: DayRef): DayRef {
  const weekday = new Date(`${todayRef}T12:00:00`).getDay() // 0 = Sunday
  const daysUntilMonday = ((8 - weekday) % 7) || 7
  return addDaysToDayRef(todayRef, daysUntilMonday)
}

function firstOfNextMonth(todayRef: DayRef): DayRef {
  const [year, month] = todayRef.split('-').map(Number)
  const next = new Date(year, month, 1, 12)
  return getPeriodRefsForDate(next).day
}

/**
 * Markers inside `range`, relative to the real `todayRef`:
 * - open, active goals whose `targetDate` falls in the range;
 * - the NEXT weekly ritual (first Monday after today) when that week has no plan yet;
 * - the NEXT monthly ritual (1st of next month) when that month has no plan yet.
 * Rituals are marked at their nearest occurrence only — repeating them on every
 * Monday would turn a signal into noise.
 */
export async function getDayMarkers(range: DayMarkerRange, todayRef: DayRef): Promise<DayMarker[]> {
  const markers: DayMarker[] = []
  const { goals } = await loadPlanningCoreObjects()

  for (const goal of goals) {
    if (goal.status !== 'open' || !goal.isActive || !goal.targetDate) continue
    const dayRef = goal.targetDate as DayRef
    if (!inRange(dayRef, range)) continue
    markers.push({ key: `deadline:${goal.id}`, kind: 'deadline', dayRef, goal })
  }

  const monday = nextMondayAfter(todayRef)
  if (inRange(monday, range)) {
    const weekRef = getPeriodRefsForDate(monday).week
    if (!(await periodPlanDexieRepository.getWeekPlan(weekRef))) {
      markers.push({ key: `ritual:week:${weekRef}`, kind: 'ritual', dayRef: monday, ritual: 'week', weekRef })
    }
  }

  const first = firstOfNextMonth(todayRef)
  if (inRange(first, range)) {
    const monthRef = getPeriodRefsForDate(first).month
    if (!(await periodPlanDexieRepository.getMonthPlan(monthRef))) {
      markers.push({ key: `ritual:month:${monthRef}`, kind: 'ritual', dayRef: first, ritual: 'month', monthRef })
    }
  }

  return markers.sort((left, right) => left.dayRef.localeCompare(right.dayRef) || left.key.localeCompare(right.key))
}

/** Markers from today through the horizon, nearest first. */
export async function getDayUpcoming(todayRef: DayRef, horizonDays = 21): Promise<DayMarker[]> {
  return getDayMarkers({ start: todayRef, end: addDaysToDayRef(todayRef, horizonDays) }, todayRef)
}

/** Convenience for callers that already hold a month's bounds. */
export function monthRange(monthRef: MonthRef): DayMarkerRange {
  const bounds = getPeriodBounds(monthRef)
  return { start: bounds.start as DayRef, end: bounds.end as DayRef }
}
