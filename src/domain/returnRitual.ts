/**
 * Return ritual — pure model of "coming back after a break".
 *
 * A break is the absence of user-authored WRITES (entries, journal, exercises,
 * reflections, plan edits…), never of logins or open tabs: an app left open in
 * a browser tab counts as a break. Detection and the inventory of what piled
 * up live in `src/services/returnQueries.ts`; this file holds the thresholds,
 * the period arithmetic and the selectors over already-loaded records so they
 * can be unit-tested without a database.
 *
 * Plan: ideas/html-plans/2026-10-25-return-ritual.html (D1), docs/return-ritual.md.
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type {
  Goal,
  Habit,
  KeyResult,
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  Tracker,
  WeeklyIntention,
} from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
} from '@/domain/planningState'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { ProgramEnrollment } from '@/domain/program'
import { weekdayOfDay } from '@/domain/measurementRhythm'
import {
  addDaysToDayRef,
  comparePeriodRefs,
  getNextPeriod,
  getPeriodBounds,
  getPeriodRefsForDate,
  getWeekOverlappingMonths,
} from '@/utils/periods'

/** Days without a signal before Today offers the ritual. */
export const RETURN_THRESHOLD_DAYS = 14
/** A subject with an entry this many days before the break counts as alive. */
export const RETURN_ALIVE_WINDOW_DAYS = 28
/** From this weekday on (Mon=0) the current week is "mostly behind" and may be skipped too. */
export const RETURN_LATE_WEEK_FROM_WEEKDAY = 3
/** `userSettings` key remembering how the current break was handled. */
export const RETURN_RITUAL_SETTINGS_KEY = 'returnRitual'

export type ReturnSubjectType = Extract<MeasurementSubjectType, 'habit' | 'keyResult' | 'tracker'>

export interface ReturnBreak {
  /** ISO timestamp of the last user-authored write. */
  lastSignalAt: string
  lastSignalDay: DayRef
  /** The day after the last signal. Identifies the break in settings. */
  breakStart: DayRef
  today: DayRef
  /** Calendar days from the last signal day to today. */
  days: number
  /** Full break weeks: from the week of `breakStart` up to the week before today's. */
  weeks: WeekRef[]
  /** Months the break covers, including the one `today` is in when it has no earlier signal. */
  crossedMonth: boolean
  crossedYear: boolean
  /** Today is late in its week (see RETURN_LATE_WEEK_FROM_WEEKDAY). */
  currentWeekMostlyBehind: boolean
}

export type ReturnRitualState = 'done' | 'dismissed'

export interface ReturnRitualSettings {
  breakStart: DayRef
  state: ReturnRitualState
  /** ISO timestamp of the decision. */
  at: string
}

export interface ReturnSubjectRef {
  subjectType: ReturnSubjectType
  subjectId: string
  cadence: PlanningCadence
  /** Monthly cadence only: the month whose placement put the subject in the week. */
  monthRef?: MonthRef
}

export interface ReturnWeekWithoutEntries {
  weekRef: WeekRef
  subjects: ReturnSubjectRef[]
}

export interface ReturnSubjectSummary {
  subjectType: ReturnSubjectType
  subject: Habit | KeyResult | Tracker
  /** Had an entry in the RETURN_ALIVE_WINDOW_DAYS before the break. */
  aliveBeforeBreak: boolean
  lastEntryDay?: DayRef
}

export interface ReturnInventory {
  break: ReturnBreak
  weeksWithoutEntries: ReturnWeekWithoutEntries[]
  staleIntentions: WeeklyIntention[]
  overduePlanItems: ExercisePlanItem[]
  activeEnrollments: ProgramEnrollment[]
  overdueGoals: Goal[]
  subjects: ReturnSubjectSummary[]
}

// ---------------------------------------------------------------------------
// Break arithmetic
// ---------------------------------------------------------------------------

function dayOfTimestamp(iso: string): DayRef {
  return getPeriodRefsForDate(new Date(iso)).day
}

function daysBetween(from: DayRef, to: DayRef): number {
  const a = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10))
  )
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)))
  return Math.round((b - a) / 86_400_000)
}

/** Weeks from the one holding `breakStart` up to (excluding) today's week. */
export function breakWeeks(breakStart: DayRef, today: DayRef): WeekRef[] {
  const currentWeek = getPeriodRefsForDate(today).week
  const weeks: WeekRef[] = []
  let week = getPeriodRefsForDate(breakStart).week
  while (comparePeriodRefs(week, currentWeek) < 0) {
    weeks.push(week)
    week = getNextPeriod(week) as WeekRef
  }
  return weeks
}

/**
 * The break as the ritual sees it, or undefined below the threshold. A missing
 * signal (fresh account) is not a break either.
 */
export function buildReturnBreak(
  lastSignalAt: string | undefined,
  today: DayRef,
  threshold = RETURN_THRESHOLD_DAYS
): ReturnBreak | undefined {
  if (!lastSignalAt) return undefined
  const lastSignalDay = dayOfTimestamp(lastSignalAt)
  const days = daysBetween(lastSignalDay, today)
  if (days < threshold) return undefined
  const breakStart = addDaysToDayRef(lastSignalDay, 1)
  const lastRefs = getPeriodRefsForDate(lastSignalDay)
  const todayRefs = getPeriodRefsForDate(today)
  const weekday = weekdayOfDay(today)
  const weekdayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(weekday)
  return {
    lastSignalAt,
    lastSignalDay,
    breakStart,
    today,
    days,
    weeks: breakWeeks(breakStart, today),
    crossedMonth: lastRefs.month !== todayRefs.month,
    crossedYear: lastRefs.year !== todayRefs.year,
    currentWeekMostlyBehind: weekdayIndex >= RETURN_LATE_WEEK_FROM_WEEKDAY,
  }
}

// ---------------------------------------------------------------------------
// Settings: how the current break was handled
// ---------------------------------------------------------------------------

export function parseReturnRitualSettings(
  raw: string | undefined
): ReturnRitualSettings | undefined {
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return undefined
    const { breakStart, state, at } = parsed as Record<string, unknown>
    if (typeof breakStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(breakStart)) return undefined
    if (state !== 'done' && state !== 'dismissed') return undefined
    if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return undefined
    return { breakStart: breakStart as DayRef, state, at }
  } catch {
    return undefined
  }
}

export function serializeReturnRitualSettings(settings: ReturnRitualSettings): string {
  return JSON.stringify(settings)
}

/**
 * A finished ritual silences the same break for good; „Później” silences it
 * for the rest of that calendar day. A later signal starts a new break with a
 * new `breakStart`, so old settings never apply to it.
 */
export function isReturnBreakHandled(
  settings: ReturnRitualSettings | undefined,
  brk: ReturnBreak
): boolean {
  if (!settings || settings.breakStart !== brk.breakStart) return false
  if (settings.state === 'done') return true
  return dayOfTimestamp(settings.at) === brk.today
}

// ---------------------------------------------------------------------------
// Selectors over loaded records (inventory, step 2 „Porządki”)
// ---------------------------------------------------------------------------

export function selectStaleIntentions(
  intentions: readonly WeeklyIntention[],
  today: DayRef
): WeeklyIntention[] {
  const currentWeek = getPeriodRefsForDate(today).week
  return intentions
    .filter(
      intention =>
        intention.status === 'open' && comparePeriodRefs(intention.weekRef, currentWeek) < 0
    )
    .sort((a, b) => comparePeriodRefs(a.weekRef, b.weekRef))
}

export function selectOverduePlanItems(
  items: readonly ExercisePlanItem[],
  today: DayRef
): ExercisePlanItem[] {
  return items
    .filter(item => item.status === 'pending' && item.dayRef < today)
    .sort((a, b) => a.dayRef.localeCompare(b.dayRef))
}

export function selectActiveEnrollments(
  enrollments: readonly ProgramEnrollment[]
): ProgramEnrollment[] {
  return enrollments.filter(enrollment => enrollment.status === 'active')
}

export function selectOverdueGoals(goals: readonly Goal[], today: DayRef): Goal[] {
  return goals
    .filter(goal => goal.status === 'open' && !!goal.targetDate && goal.targetDate < today)
    .sort((a, b) => (a.targetDate ?? '').localeCompare(b.targetDate ?? ''))
}

function isSameSubject(
  record: { subjectType: MeasurementSubjectType; subjectId: string },
  ref: { subjectType: MeasurementSubjectType; subjectId: string }
): boolean {
  return record.subjectType === ref.subjectType && record.subjectId === ref.subjectId
}

function isInWeek(dayRef: DayRef, weekRef: WeekRef): boolean {
  const bounds = getPeriodBounds(weekRef)
  return dayRef >= bounds.start && dayRef <= bounds.end
}

/**
 * Where a subject stands in one week, from the planning state alone: placed
 * (a day assignment, an active week placement or an active whole-month
 * placement of an overlapping month), already skipped (the tombstone) or
 * absent. Returns the placing month for monthly cadence so a skip can name it.
 */
export function placementInWeek(
  ref: { subjectType: MeasurementSubjectType; subjectId: string; cadence: PlanningCadence },
  weekRef: WeekRef,
  state: {
    weekStates: readonly MeasurementWeekState[]
    monthStates: readonly MeasurementMonthState[]
    dayAssignments: readonly MeasurementDayAssignment[]
  }
): { placed: boolean; monthRef?: MonthRef } {
  const weekState = state.weekStates.find(
    candidate => candidate.weekRef === weekRef && isSameSubject(candidate, ref)
  )
  if (weekState?.activityState === 'paused') return { placed: false }
  const placingMonth = getWeekOverlappingMonths(weekRef).find(monthRef =>
    state.monthStates.some(
      candidate =>
        candidate.monthRef === monthRef &&
        isSameSubject(candidate, ref) &&
        candidate.activityState === 'active' &&
        candidate.scheduleScope === 'whole-month'
    )
  )
  const monthRef =
    ref.cadence === 'monthly'
      ? (weekState?.sourceMonthRef ?? placingMonth ?? getWeekOverlappingMonths(weekRef)[0])
      : undefined
  if (state.dayAssignments.some(a => isSameSubject(a, ref) && isInWeek(a.dayRef, weekRef))) {
    return { placed: true, monthRef }
  }
  if (
    weekState &&
    weekState.activityState === 'active' &&
    weekState.scheduleScope !== 'unassigned'
  ) {
    return { placed: true, monthRef }
  }
  if (placingMonth) return { placed: true, monthRef }
  return { placed: false }
}

/**
 * Break weeks in which placed subjects have no entry at all — the rows of
 * „Tygodnie bez wpisów”. Weeks where nothing was placed are left out: there
 * is nothing to skip, they already look unplanned.
 */
export function selectWeeksWithoutEntries(
  weeks: readonly WeekRef[],
  subjects: readonly ReturnSubjectRef[],
  state: {
    weekStates: readonly MeasurementWeekState[]
    monthStates: readonly MeasurementMonthState[]
    dayAssignments: readonly MeasurementDayAssignment[]
    entries: readonly DailyMeasurementEntry[]
  }
): ReturnWeekWithoutEntries[] {
  return weeks.flatMap(weekRef => {
    const placed = subjects.flatMap(subject => {
      const placement = placementInWeek(subject, weekRef, state)
      if (!placement.placed) return []
      const hasEntry = state.entries.some(
        entry => isSameSubject(entry, subject) && isInWeek(entry.dayRef, weekRef)
      )
      if (hasEntry) return []
      return [{ ...subject, monthRef: placement.monthRef }]
    })
    return placed.length > 0 ? [{ weekRef, subjects: placed }] : []
  })
}

/**
 * Whether a subject had an entry in the alive window right before the break,
 * plus its last entry day overall (a backfilled day inside the break counts
 * for the latter, never for the former).
 */
export function summarizeSubjectBeforeBreak(
  ref: { subjectType: MeasurementSubjectType; subjectId: string },
  entries: readonly DailyMeasurementEntry[],
  breakStart: DayRef,
  windowDays = RETURN_ALIVE_WINDOW_DAYS
): { aliveBeforeBreak: boolean; lastEntryDay?: DayRef } {
  const windowStart = addDaysToDayRef(breakStart, -windowDays)
  let lastEntryDay: DayRef | undefined
  let aliveBeforeBreak = false
  for (const entry of entries) {
    if (!isSameSubject(entry, ref)) continue
    if (!lastEntryDay || entry.dayRef > lastEntryDay) lastEntryDay = entry.dayRef
    if (entry.dayRef >= windowStart && entry.dayRef < breakStart) aliveBeforeBreak = true
  }
  return { aliveBeforeBreak, lastEntryDay }
}

// ---------------------------------------------------------------------------
// Gentle first week (step 3 „Na nowo”)
// ---------------------------------------------------------------------------

/**
 * Half the period target for the first week back, or undefined when halving
 * has no meaning (ratings, averages, last values, checklists — their
 * threshold is a quality, not a quantity). Count targets never drop below 1.
 */
export function gentleTarget(
  target: MeasurementTarget,
  entryMode: MeasurementEntryMode
): MeasurementTarget | undefined {
  if (entryMode === 'rating' || entryMode === 'multi-completion') return undefined
  if (target.kind === 'count') {
    if (target.operator !== 'min') return undefined
    return { ...target, value: Math.max(1, Math.ceil(target.value / 2)) }
  }
  if (target.kind === 'value' && target.aggregation === 'sum' && target.operator === 'gte') {
    return { ...target, value: Math.ceil(target.value / 2) }
  }
  return undefined
}
