/**
 * Rhythm scheduler — turns standing rhythms (`MeasurementRhythm` on habits,
 * key results and trackers) into ordinary day assignments.
 *
 * Idempotent: a run writes only into weeks nobody has decided yet — no day
 * assignments for the subject, no week state with `daysMode` set, with
 * 'specific-days' scope or paused (the „Pomiń w tym tygodniu” tombstone).
 * It never deletes, never writes target overrides, never touches weeks before
 * `rhythm.since`, and stops at the horizon (the week after `today`), so the
 * Sunday ritual sees next week filled while later weeks stay a template
 * (planners draw them as soft "rhythm" cells and materialize on edit).
 *
 * Eligibility (R3/R4): the subject must be placed in the week — an active
 * whole-week / linked week state, or an active 'whole-month' month state
 * of an overlapping month; a monthly-cadence subject gets only the days of
 * the months it is placed in; a key result only days inside its goal window.
 * `scope: 'every-week'` places weekly-cadence habits/trackers regardless.
 *
 * Call sites: Today load, weekly/monthly ritual load, after a rhythm is
 * saved. Failures are reported per subject and never break the caller.
 *
 * Plan: ideas/html-plans/2026-10-24-default-rhythm-placements.html §5.1.
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { Goal, Habit, KeyResult, MeasurementRhythm, Tracker } from '@/domain/planning'
import type {
  MeasurementDayAssignment,
  MeasurementMonthState,
  MeasurementSubjectType,
  MeasurementWeekState,
} from '@/domain/planningState'
import { resolveRhythmDays } from '@/domain/measurementRhythm'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { clearMeasurementWeekSkip, placeRhythmDayAssignments } from '@/services/planningMutations'
import { isMeasurementSubjectOpen } from '@/services/planningVisibility'
import {
  comparePeriodRefs,
  getNextPeriod,
  getPeriodRefsForDate,
  getWeekOverlappingMonths,
} from '@/utils/periods'
import { reportError } from '@/utils/reportError'

export type RhythmSubjectType = Extract<MeasurementSubjectType, 'habit' | 'keyResult' | 'tracker'>

export interface RhythmSubject {
  subjectType: RhythmSubjectType
  subject: Habit | KeyResult | Tracker
  rhythm: MeasurementRhythm
}

export interface RhythmPlacement {
  subjectType: RhythmSubjectType
  subjectId: string
  weekRef: WeekRef
  dayRefs: DayRef[]
}

export interface RhythmSchedulerResult {
  placements: RhythmPlacement[]
  /** Last week the run could fill. */
  horizonWeekRef: WeekRef
}

export interface RhythmSchedulerOptions {
  /** Defaults to the real today. */
  today?: DayRef
  /** Restrict the run to one week (restore after „Pomiń”). */
  weekRef?: WeekRef
  /** Restrict the run to one subject (after saving its rhythm). */
  subject?: { subjectType: RhythmSubjectType; subjectId: string }
}

interface WeekContext {
  monthStates: MeasurementMonthState[]
  weekStates: MeasurementWeekState[]
  dayAssignments: MeasurementDayAssignment[]
  goal?: Goal
}

function todayDayRef(): DayRef {
  return getPeriodRefsForDate(new Date()).day
}

/** The scheduler fills through the week after `today`'s week. */
export function rhythmHorizonWeek(today: DayRef): WeekRef {
  return getNextPeriod(getPeriodRefsForDate(today).week) as WeekRef
}

/**
 * A week the user has already decided (R5/R6): any day assignment of the
 * subject in it, or any week state with `daysMode`, 'specific-days' scope or
 * a paused state. The scheduler leaves such weeks alone in full — also on
 * a boundary week where only one month's state is the user's, because the
 * writers cannot touch one month without risking the other.
 */
export function isWeekDecided(
  weekRef: WeekRef,
  weekStates: readonly MeasurementWeekState[],
  dayAssignments: readonly MeasurementDayAssignment[]
): boolean {
  if (dayAssignments.some(assignment => getPeriodRefsForDate(assignment.dayRef).week === weekRef)) {
    return true
  }
  return weekStates.some(
    state =>
      state.weekRef === weekRef &&
      (state.daysMode !== undefined ||
        state.scheduleScope === 'specific-days' ||
        state.activityState !== 'active')
  )
}

/**
 * Months (of the week's overlapping months) the subject is placed in: an
 * active week state for the week (whole-week or a bare link) or an active
 * 'whole-month' month state. Weekly cadence treats the week as one — any
 * placement covers the whole week; monthly cadence attributes per month.
 */
export function placedMonthsForWeek(
  weekRef: WeekRef,
  cadence: 'weekly' | 'monthly',
  monthStates: readonly MeasurementMonthState[],
  weekStates: readonly MeasurementWeekState[]
): MonthRef[] {
  const overlapping = getWeekOverlappingMonths(weekRef)
  const activeWholeMonth = (monthRef: MonthRef) =>
    monthStates.some(
      state =>
        state.monthRef === monthRef &&
        state.activityState === 'active' &&
        state.scheduleScope === 'whole-month'
    )
  const activeWeekState = (monthRef?: MonthRef) =>
    weekStates.some(
      state =>
        state.weekRef === weekRef &&
        state.activityState === 'active' &&
        (cadence === 'weekly' ? !state.sourceMonthRef : state.sourceMonthRef === monthRef)
    )

  if (cadence === 'weekly') {
    return activeWeekState() || overlapping.some(activeWholeMonth) ? overlapping : []
  }
  return overlapping.filter(monthRef => activeWeekState(monthRef) || activeWholeMonth(monthRef))
}

/**
 * Days the rhythm would place in `weekRef`, or an empty list when the week
 * is decided, not placed, before `since`, or clipped to nothing. Pure.
 */
export function planRhythmWeek(
  entry: RhythmSubject,
  weekRef: WeekRef,
  context: WeekContext
): DayRef[] {
  const { subject, subjectType, rhythm } = entry
  if (isWeekDecided(weekRef, context.weekStates, context.dayAssignments)) return []

  let placedMonths = placedMonthsForWeek(
    weekRef,
    subject.cadence,
    context.monthStates,
    context.weekStates
  )
  if (placedMonths.length === 0) {
    if (rhythm.scope !== 'every-week' || subject.cadence !== 'weekly') return []
    placedMonths = getWeekOverlappingMonths(weekRef)
  }

  return resolveRhythmDays(weekRef, rhythm, {
    monthRefs: subject.cadence === 'monthly' ? placedMonths : undefined,
    goalWindow:
      subjectType === 'keyResult'
        ? {
            start: context.goal?.startDate as DayRef | undefined,
            end: context.goal?.targetDate as DayRef | undefined,
          }
        : undefined,
  })
}

function* weeksFrom(since: WeekRef, through: WeekRef): Generator<WeekRef> {
  let current = since
  while (comparePeriodRefs(current, through) <= 0) {
    yield current
    current = getNextPeriod(current) as WeekRef
  }
}

async function loadRhythmSubjects(
  filter?: RhythmSchedulerOptions['subject']
): Promise<RhythmSubject[]> {
  const [habits, keyResults, trackers] = await Promise.all([
    habitDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
  ])
  const entries: RhythmSubject[] = [
    ...habits.map(subject => ({ subjectType: 'habit' as const, subject })),
    ...keyResults.map(subject => ({ subjectType: 'keyResult' as const, subject })),
    ...trackers.map(subject => ({ subjectType: 'tracker' as const, subject })),
  ].flatMap(entry =>
    entry.subject.rhythm && isMeasurementSubjectOpen(entry.subject)
      ? [{ ...entry, rhythm: entry.subject.rhythm }]
      : []
  )
  return filter
    ? entries.filter(
        entry => entry.subjectType === filter.subjectType && entry.subject.id === filter.subjectId
      )
    : entries
}

/**
 * Fill every eligible week of every open rhythm-bearing subject from
 * `rhythm.since` through the horizon. Returns what it placed; errors are
 * reported per subject and swallowed so a Today load never fails on them.
 */
export async function ensureRhythmPlacements(
  options: RhythmSchedulerOptions = {}
): Promise<RhythmSchedulerResult> {
  const today = options.today ?? todayDayRef()
  const horizonWeekRef = rhythmHorizonWeek(today)
  const subjects = await loadRhythmSubjects(options.subject)
  const placements: RhythmPlacement[] = []
  if (subjects.length === 0) return { placements, horizonWeekRef }

  const [monthStates, weekStates, dayAssignments, goals] = await Promise.all([
    planningStateDexieRepository.listMeasurementMonthStates(),
    planningStateDexieRepository.listMeasurementWeekStates(),
    planningStateDexieRepository.listMeasurementDayAssignments(),
    subjects.some(entry => entry.subjectType === 'keyResult')
      ? goalDexieRepository.listAll()
      : Promise.resolve([] as Goal[]),
  ])
  const goalById = new Map(goals.map(goal => [goal.id, goal]))

  for (const entry of subjects) {
    const { subjectType, subject, rhythm } = entry
    const isMine = (record: { subjectType: MeasurementSubjectType; subjectId: string }) =>
      record.subjectType === subjectType && record.subjectId === subject.id
    const context: WeekContext = {
      monthStates: monthStates.filter(isMine),
      weekStates: weekStates.filter(isMine),
      dayAssignments: dayAssignments.filter(isMine),
      goal: subjectType === 'keyResult' ? goalById.get((subject as KeyResult).goalId) : undefined,
    }

    const weeks = options.weekRef
      ? comparePeriodRefs(options.weekRef, rhythm.since) >= 0 &&
        comparePeriodRefs(options.weekRef, horizonWeekRef) <= 0
        ? [options.weekRef]
        : []
      : [...weeksFrom(rhythm.since, horizonWeekRef)]

    for (const weekRef of weeks) {
      const dayRefs = planRhythmWeek(entry, weekRef, context)
      if (dayRefs.length === 0) continue
      try {
        await placeRhythmDayAssignments({
          weekRef,
          cadence: subject.cadence,
          subjectType,
          subjectId: subject.id,
          dayRefs,
        })
        placements.push({ subjectType, subjectId: subject.id, weekRef, dayRefs })
      } catch (error) {
        // A key result whose goal is not active in any overlapping month, a
        // guard rejecting the state… — log and move on; the week stays open
        // for the next run or the user.
        reportError('rhythmScheduler.place', error)
      }
    }
  }

  if (placements.length > 0) invalidatePlanningQueryCache()
  return { placements, horizonWeekRef }
}

/**
 * „Przywróć rytm”: lift the week's „Pomiń” tombstone and fill the week from
 * the rhythm again. Returns the placed days (empty when the week lies past
 * the horizon or the rhythm no longer names a day there).
 */
export async function restoreWeekRhythm(ref: {
  subjectType: RhythmSubjectType
  subjectId: string
  cadence: 'weekly' | 'monthly'
  weekRef: WeekRef
  monthRef?: MonthRef
  today?: DayRef
}): Promise<DayRef[]> {
  await clearMeasurementWeekSkip(ref)
  const result = await ensureRhythmPlacements({
    today: ref.today,
    weekRef: ref.weekRef,
    subject: { subjectType: ref.subjectType, subjectId: ref.subjectId },
  })
  invalidatePlanningQueryCache()
  return result.placements[0]?.dayRefs ?? []
}
