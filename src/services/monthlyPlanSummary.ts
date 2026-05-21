import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { Habit, KeyResult, Tracker } from '@/domain/planning'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

export interface MonthPlanRowSummary {
  total: number
  met: number
}

export interface MonthPlanSummary {
  keyResults: MonthPlanRowSummary
  habits: MonthPlanRowSummary
  trackers: MonthPlanRowSummary
}

/**
 * Aggregates per-week evaluations of weekly-cadence objects plus per-month
 * evaluations of monthly-cadence objects into a Plan-vs-Execution summary for
 * a calendar month.
 *
 * For weekly-cadence KRs/habits each scheduled week of the month counts as one
 * unit toward `total`; a met evaluation in that week counts toward `met`. For
 * monthly-cadence objects the month-level evaluation contributes a single unit.
 *
 * Future weeks (whose start falls after `todayDayRef`) are excluded so the
 * "planned" denominator only reflects weeks that have actually started. The
 * current week is clipped to `todayDayRef` for evaluation purposes.
 */
export function buildMonthlyPlanSummary(
  items: MonthObjectItem[],
  rawEntries: DailyMeasurementEntry[],
  monthRef: MonthRef,
  todayDayRef: DayRef,
): MonthPlanSummary {
  const keyResults: MonthPlanRowSummary = { total: 0, met: 0 }
  const habits: MonthPlanRowSummary = { total: 0, met: 0 }
  const trackers: MonthPlanRowSummary = { total: 0, met: 0 }

  const weeks = getChildPeriods(monthRef) as WeekRef[]
  const startedWeeks = weeks.filter((weekRef) => {
    const start = getPeriodBounds(weekRef).start as DayRef
    return start <= todayDayRef
  })

  for (const item of items) {
    if (item.subjectType === 'keyResult' || item.subjectType === 'habit') {
      const subject = item.subject as KeyResult | Habit
      const row = item.subjectType === 'keyResult' ? keyResults : habits

      if (subject.cadence === 'monthly') {
        row.total += 1
        if (item.measurement.evaluationStatus === 'met') row.met += 1
        continue
      }

      for (const weekRef of startedWeeks) {
        row.total += 1
        const weekEnd = getPeriodBounds(weekRef).end as DayRef
        const clipRef = (todayDayRef < weekEnd ? todayDayRef : weekEnd) as DayRef
        const weekSummary = buildMeasurementSummary(subject, rawEntries, weekRef, clipRef)
        if (weekSummary.evaluationStatus === 'met') row.met += 1
      }
      continue
    }

    if (item.subjectType === 'tracker') {
      const tracker = item.subject as Tracker
      const scope = item.planning.scheduleScope

      if (tracker.cadence === 'monthly') {
        trackers.total += 1
        const hasEntry = rawEntries.some(
          (entry) =>
            entry.subjectId === tracker.id &&
            entry.value !== null &&
            getPeriodRefsForDate(entry.dayRef).month === monthRef,
        )
        if (hasEntry) trackers.met += 1
        continue
      }

      for (const weekRef of startedWeeks) {
        const weekBounds = getPeriodBounds(weekRef)
        if (scope === 'whole-week' || scope === 'whole-month') {
          trackers.total += 1
          const hasEntry = rawEntries.some(
            (entry) =>
              entry.subjectId === tracker.id &&
              entry.value !== null &&
              getPeriodRefsForDate(entry.dayRef).week === weekRef,
          )
          if (hasEntry) trackers.met += 1
        } else if (scope === 'specific-days') {
          const weekScheduledDays = (item.planning.scheduledDayRefs ?? []).filter(
            (d) => d >= weekBounds.start && d <= weekBounds.end,
          )
          if (weekScheduledDays.length === 0) continue
          trackers.total += 1
          const scheduledSet = new Set(weekScheduledDays)
          const hasEntry = rawEntries.some(
            (entry) =>
              entry.subjectId === tracker.id &&
              entry.value !== null &&
              scheduledSet.has(entry.dayRef),
          )
          if (hasEntry) trackers.met += 1
        }
      }
    }
  }

  return { keyResults, habits, trackers }
}
