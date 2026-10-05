import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { Habit, KeyResult, WeeklyIntention } from '@/domain/planning'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'
import { applyMeasurementTargetOverride, buildMeasurementSummary } from '@/services/measurementProgress'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'
import { classifyWeek, tallyWeekStates } from '@/domain/weeklyCadence'

export interface MonthPlanRowSummary {
  total: number
  met: number
}

export interface MonthPlanSummary {
  keyResults: MonthPlanRowSummary
  habits: MonthPlanRowSummary
  intentions: MonthPlanRowSummary
}

/**
 * Aggregates per-week evaluations of weekly-cadence objects plus per-month
 * evaluations of monthly-cadence objects into a Plan-vs-Execution summary for
 * a calendar month.
 *
 * Weekly-cadence KRs/habits are counted week by week through domain/weeklyCadence:
 * each week the object was assigned to counts once it is decided (past, or the
 * current week once met), with the week's cascaded target and whole-week
 * entries. For monthly-cadence objects the month-level evaluation contributes
 * a single unit.
 * Weekly intentions (passed separately — they are week-scoped and never part
 * of the month bundle) contribute one unit per intention in their own week.
 *
 * Future weeks (whose start falls after `todayDayRef`) are excluded so the
 * "planned" denominator only reflects weeks that have actually started.
 */
export function buildMonthlyPlanSummary(
  items: MonthObjectItem[],
  rawEntries: DailyMeasurementEntry[],
  monthRef: MonthRef,
  todayDayRef: DayRef,
  weeklyIntentions: WeeklyIntention[] = [],
): MonthPlanSummary {
  const keyResults: MonthPlanRowSummary = { total: 0, met: 0 }
  const habits: MonthPlanRowSummary = { total: 0, met: 0 }
  const intentions: MonthPlanRowSummary = { total: 0, met: 0 }

  const weeks = getChildPeriods(monthRef) as WeekRef[]
  const startedWeeks = weeks.filter((weekRef) => {
    const start = getPeriodBounds(weekRef).start as DayRef
    return start <= todayDayRef
  })
  const startedWeekSet = new Set<WeekRef>(startedWeeks)

  for (const item of items) {
    if (item.subjectType !== 'keyResult' && item.subjectType !== 'habit') continue

    const subject = item.subject as KeyResult | Habit
    const row = item.subjectType === 'keyResult' ? keyResults : habits

    if (subject.cadence === 'monthly') {
      row.total += 1
      if (item.measurement.evaluationStatus === 'met') row.met += 1
      continue
    }

    if (item.weekEvaluations) {
      const tally = tallyWeekStates(
        item.weekEvaluations.map((week) =>
          classifyWeek(week.weekRef, week.planned, week.measurement.evaluationStatus, todayDayRef),
        ),
      )
      row.total += tally.planned
      row.met += tally.met
      continue
    }

    // Without the month bundle's week evaluations, fall back to the started
    // weeks with their week sub-targets.
    for (const weekRef of startedWeeks) {
      row.total += 1
      const weekEnd = getPeriodBounds(weekRef).end as DayRef
      const clipRef = (todayDayRef < weekEnd ? todayDayRef : weekEnd) as DayRef
      const weekSubject = applyMeasurementTargetOverride(
        subject,
        item.weekTargetOverrides?.[weekRef]
      )
      const weekSummary = buildMeasurementSummary(weekSubject, rawEntries, weekRef, clipRef)
      if (weekSummary.evaluationStatus === 'met') row.met += 1
    }
  }

  for (const intention of weeklyIntentions) {
    if (!intention.isActive || !startedWeekSet.has(intention.weekRef)) continue
    intentions.total += 1
    const weekEnd = getPeriodBounds(intention.weekRef).end as DayRef
    const clipRef = (todayDayRef < weekEnd ? todayDayRef : weekEnd) as DayRef
    const summary = buildMeasurementSummary(intention, rawEntries, intention.weekRef, clipRef)
    if (summary.evaluationStatus === 'met') intentions.met += 1
  }

  return { keyResults, habits, intentions }
}
