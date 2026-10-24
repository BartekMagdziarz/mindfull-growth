/**
 * Standing rhythm — pure projections of `MeasurementRhythm` onto weeks.
 *
 * The rhythm is a weekday template on a habit / key result / tracker. This
 * module only answers "which days of week W does the template name, within
 * the given clipping?"; deciding whether W is eligible at all (object placed
 * in the week, no user-decided days yet) and writing the assignments is the
 * scheduler's job (`src/services/rhythmSchedulerService.ts`).
 *
 * Plan: ideas/html-plans/2026-10-24-default-rhythm-placements.html (R1–R10).
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { RHYTHM_WEEKDAYS, type MeasurementRhythm, type RhythmWeekday } from '@/domain/planning'
import { comparePeriodRefs, getChildPeriods, getPeriodRefsForDate } from '@/utils/periods'

/** Weekday of a day ref; the app's weeks start on Monday, like the template. */
export function weekdayOfDay(dayRef: DayRef): RhythmWeekday {
  // Day refs are local calendar dates; parsing them as UTC midnight keeps the
  // weekday independent of the runtime time zone.
  const utcDay = new Date(`${dayRef}T00:00:00Z`).getUTCDay() // 0 = Sunday
  return RHYTHM_WEEKDAYS[(utcDay + 6) % 7]!
}

/** Dedupe and sort weekdays Monday-first (the stored order). */
export function sortRhythmWeekdays(weekdays: readonly RhythmWeekday[]): RhythmWeekday[] {
  const set = new Set(weekdays)
  return RHYTHM_WEEKDAYS.filter(weekday => set.has(weekday))
}

export interface RhythmDayClipping {
  /**
   * Monthly cadence: keep only days that fall in one of these months (the
   * months the object is placed in). A boundary week contributes only the
   * days of the placed month — the same attribution as day assignments.
   */
  monthRefs?: readonly MonthRef[]
  /** Key results: keep only days inside the goal window (both ends inclusive). */
  goalWindow?: { start?: DayRef; end?: DayRef }
}

/** The week lies at or after the rhythm's first week. */
export function isWeekCoveredByRhythm(weekRef: WeekRef, rhythm: MeasurementRhythm): boolean {
  return comparePeriodRefs(weekRef, rhythm.since) >= 0
}

/**
 * Days of `weekRef` the rhythm names, after clipping. Empty when the week
 * precedes `since` or nothing survives the clipping (a key result past its
 * goal's deadline, a boundary week whose placed-month days hold no rhythm
 * weekday).
 */
export function resolveRhythmDays(
  weekRef: WeekRef,
  rhythm: MeasurementRhythm,
  clipping: RhythmDayClipping = {}
): DayRef[] {
  if (!isWeekCoveredByRhythm(weekRef, rhythm)) return []
  const weekdays = new Set(rhythm.weekdays)
  const monthSet = clipping.monthRefs ? new Set(clipping.monthRefs) : undefined
  const { start, end } = clipping.goalWindow ?? {}

  return (getChildPeriods(weekRef) as DayRef[]).filter(dayRef => {
    if (!weekdays.has(weekdayOfDay(dayRef))) return false
    if (monthSet && !monthSet.has(getPeriodRefsForDate(dayRef).month)) return false
    if (start && dayRef < start) return false
    if (end && dayRef > end) return false
    return true
  })
}

const WEEKDAY_SHORT_PL: Record<RhythmWeekday, string> = {
  mon: 'pn',
  tue: 'wt',
  wed: 'śr',
  thu: 'czw',
  fri: 'pt',
  sat: 'sb',
  sun: 'nd',
}

/** Short Polish weekday label used in rhythm chips („wt · czw”). */
export function rhythmWeekdayLabel(weekday: RhythmWeekday): string {
  return WEEKDAY_SHORT_PL[weekday]
}

/**
 * Compact Polish summary of the template: „codziennie”, „pn–pt”, „sb · nd”
 * or the listed days joined with a middle dot.
 */
export function rhythmLabel(rhythm: Pick<MeasurementRhythm, 'weekdays'>): string {
  const weekdays = sortRhythmWeekdays(rhythm.weekdays)
  if (weekdays.length === 7) return 'codziennie'
  const key = weekdays.join(',')
  if (key === 'mon,tue,wed,thu,fri') return 'pn–pt'
  return weekdays.map(rhythmWeekdayLabel).join(' · ')
}
