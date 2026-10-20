import type { DayRef, WeekRef } from './period'
import { getPeriodBounds } from '@/utils/periods'

/**
 * Weekly-cadence objects read over a longer span (month, year, goal window).
 *
 * A weekly target is a promise about one week, so a weekly key result or habit
 * is judged week by week — never against a month's total. Each week counts
 * once, also when it straddles two months; weeks that have not started are not
 * judged; the current week counts only once it is met (until it ends it is
 * 'ongoing', neither a success nor a failure); weeks the plan did not ask for
 * are 'unplanned' and stay out of the count.
 */

export type WeekPhase = 'past' | 'current' | 'future'
export type WeekState = 'met' | 'missed' | 'no-data' | 'ongoing' | 'future' | 'unplanned'

export function weekPhase(weekRef: WeekRef, today: DayRef): WeekPhase {
  const { start, end } = getPeriodBounds(weekRef)
  if (end < today) return 'past'
  if (start > today) return 'future'
  return 'current'
}

export function classifyWeek(
  weekRef: WeekRef,
  planned: boolean,
  status: 'met' | 'missed' | 'no-data' | undefined,
  today: DayRef
): WeekState {
  if (!planned) return 'unplanned'
  const phase = weekPhase(weekRef, today)
  if (phase === 'future') return 'future'
  if (status === 'met') return 'met'
  if (phase === 'current') return 'ongoing'
  return status ?? 'no-data'
}

export interface WeekTally {
  met: number
  /** Planned weeks already decided: past weeks plus the current week once met. */
  planned: number
  /** Decided weeks with entries that fell short. */
  missed: number
  ongoing: number
}

export function tallyWeekStates(states: readonly WeekState[]): WeekTally {
  const met = states.filter(state => state === 'met').length
  const missed = states.filter(state => state === 'missed').length
  const noData = states.filter(state => state === 'no-data').length
  return {
    met,
    planned: met + missed + noData,
    missed,
    ongoing: states.filter(state => state === 'ongoing').length,
  }
}

/**
 * One status for a weekly object over a span: met only when every decided
 * planned week was met; no-data when no decided week has entries.
 */
export function statusFromWeekTally(tally: WeekTally): 'met' | 'missed' | 'no-data' {
  if (tally.met === 0 && tally.missed === 0) return 'no-data'
  return tally.met === tally.planned ? 'met' : 'missed'
}
