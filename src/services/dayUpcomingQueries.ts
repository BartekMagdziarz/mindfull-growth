import type { Goal } from '@/domain/planning'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { loadPlanningCoreObjects } from '@/services/planningObjectCollections'
import { addDaysToDayRef, getNextPeriod, getPeriodBounds, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'

/** Whether the thing the marker points at has already happened (plan/reflection exists, goal completed). */
export type MarkerState = 'due' | 'done'

/** Where a marker sits relative to the real today. */
export type MarkerBucket = 'overdue' | 'upcoming' | 'pastDone'

export type RitualAction = 'plan' | 'reflect'

/**
 * A dated signal for the day surfaces: a goal deadline or a planning /
 * reflection ritual. Pure data — labels are resolved by the caller.
 */
export type DayMarker =
  | { key: string; kind: 'deadline'; dayRef: DayRef; state: MarkerState; goal: Goal }
  | { key: string; kind: 'ritual'; dayRef: DayRef; state: MarkerState; ritual: 'week'; action: RitualAction; weekRef: WeekRef }
  | { key: string; kind: 'ritual'; dayRef: DayRef; state: MarkerState; ritual: 'month'; action: RitualAction; monthRef: MonthRef }

export interface DayMarkerRange {
  start: DayRef
  end: DayRef
}

/** Open goals past their target date stay on the list this long. */
export const OVERDUE_REACH_DAYS = 90
/** Done markers linger this long after their day so the "Minione" section has something to show. */
export const DONE_GRACE_DAYS = 7

function inRange(dayRef: DayRef, range: DayMarkerRange): boolean {
  return dayRef >= range.start && dayRef <= range.end
}

export function bucketMarker(marker: DayMarker, todayRef: DayRef): MarkerBucket {
  if (marker.dayRef >= todayRef) return 'upcoming'
  return marker.state === 'done' ? 'pastDone' : 'overdue'
}

interface RitualCandidate {
  ritual: 'week' | 'month'
  action: RitualAction
  periodRef: WeekRef | MonthRef
  dayRef: DayRef
}

/**
 * The six ritual occurrences that matter from today: plan the current and
 * the next period (on their first day), reflect on the previous period (on
 * its last day). The current period's reflection appears only on its last
 * day, so a Sunday evening shows "Podsumuj T38 · dziś".
 */
function ritualCandidates(todayRef: DayRef): RitualCandidate[] {
  const refs = getPeriodRefsForDate(todayRef)
  const out: RitualCandidate[] = []
  for (const ritual of ['week', 'month'] as const) {
    const current = refs[ritual]
    const previous = getPreviousPeriod(current) as typeof current
    const next = getNextPeriod(current) as typeof current
    const currentBounds = getPeriodBounds(current)
    out.push(
      { ritual, action: 'reflect', periodRef: previous, dayRef: getPeriodBounds(previous).end as DayRef },
      { ritual, action: 'plan', periodRef: current, dayRef: currentBounds.start as DayRef },
      { ritual, action: 'plan', periodRef: next, dayRef: getPeriodBounds(next).start as DayRef },
    )
    if (currentBounds.end === todayRef) {
      out.push({ ritual, action: 'reflect', periodRef: current, dayRef: todayRef })
    }
  }
  return out
}

async function ritualDone(candidate: RitualCandidate): Promise<boolean> {
  if (candidate.ritual === 'week') {
    const weekRef = candidate.periodRef as WeekRef
    const record = candidate.action === 'plan'
      ? await periodPlanDexieRepository.getWeekPlan(weekRef)
      : await structuredReflectionDexieRepository.getWeekly(weekRef)
    return Boolean(record)
  }
  const monthRef = candidate.periodRef as MonthRef
  const record = candidate.action === 'plan'
    ? await periodPlanDexieRepository.getMonthPlan(monthRef)
    : await structuredReflectionDexieRepository.getMonthly(monthRef)
  return Boolean(record)
}

function toRitualMarker(candidate: RitualCandidate, state: MarkerState): DayMarker {
  const key = `ritual:${candidate.ritual}:${candidate.action}:${candidate.periodRef}`
  if (candidate.ritual === 'week') {
    return { key, kind: 'ritual', dayRef: candidate.dayRef, state, ritual: 'week', action: candidate.action, weekRef: candidate.periodRef as WeekRef }
  }
  return { key, kind: 'ritual', dayRef: candidate.dayRef, state, ritual: 'month', action: candidate.action, monthRef: candidate.periodRef as MonthRef }
}

function compareMarkers(left: DayMarker, right: DayMarker): number {
  return (
    left.dayRef.localeCompare(right.dayRef) ||
    Number(left.state === 'done') - Number(right.state === 'done') ||
    left.key.localeCompare(right.key)
  )
}

/**
 * Markers inside `range`, relative to the real `todayRef`:
 * - active goals with a `targetDate`: `open` → due, `completed` → done;
 *   overdue open goals are included regardless of `range.start`
 *   (up to `OVERDUE_REACH_DAYS` back);
 * - the previous / current / next week and month rituals (see `ritualCandidates`),
 *   with `state` telling whether the plan or reflection already exists.
 * Done markers older than `DONE_GRACE_DAYS` are dropped everywhere.
 */
export async function getDayMarkers(range: DayMarkerRange, todayRef: DayRef): Promise<DayMarker[]> {
  const markers: DayMarker[] = []
  const graceStart = addDaysToDayRef(todayRef, -DONE_GRACE_DAYS)
  const overdueStart = addDaysToDayRef(todayRef, -OVERDUE_REACH_DAYS)
  const { goals } = await loadPlanningCoreObjects()

  for (const goal of goals) {
    if (!goal.isActive || !goal.targetDate || goal.status === 'dropped') continue
    const dayRef = goal.targetDate as DayRef
    const state: MarkerState = goal.status === 'completed' ? 'done' : 'due'
    const overdue = state === 'due' && dayRef < todayRef && dayRef >= overdueStart && dayRef <= range.end
    if (!overdue && !inRange(dayRef, range)) continue
    markers.push({ key: `deadline:${goal.id}`, kind: 'deadline', dayRef, state, goal })
  }

  const candidates = ritualCandidates(todayRef).filter(candidate => inRange(candidate.dayRef, range))
  const states = await Promise.all(candidates.map(ritualDone))
  candidates.forEach((candidate, index) => {
    markers.push(toRitualMarker(candidate, states[index] ? 'done' : 'due'))
  })

  return markers
    .filter(marker => marker.state === 'due' || marker.dayRef >= graceStart)
    .sort(compareMarkers)
}

/** Markers from today through the horizon (plus overdue ones), nearest first. */
export async function getDayUpcoming(todayRef: DayRef, horizonDays = 21): Promise<DayMarker[]> {
  return getDayMarkers({ start: todayRef, end: addDaysToDayRef(todayRef, horizonDays) }, todayRef)
}

/** Convenience for callers that already hold a month's bounds. */
export function monthRange(monthRef: MonthRef): DayMarkerRange {
  const bounds = getPeriodBounds(monthRef)
  return { start: bounds.start as DayRef, end: bounds.end as DayRef }
}
