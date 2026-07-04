import type { WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { WeeklyIntention } from '@/domain/planning'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'

export interface WeekPlanRowSummary {
  total: number
  met: number
}

export interface WeekPlanSummary {
  keyResults: WeekPlanRowSummary
  habits: WeekPlanRowSummary
  intentions: WeekPlanRowSummary
}

export function buildWeeklyPlanSummary(
  items: WeekObjectItem[],
  rawEntries: DailyMeasurementEntry[],
  weekRef: WeekRef,
  weeklyIntentions: WeeklyIntention[] = [],
): WeekPlanSummary {
  const keyResults: WeekPlanRowSummary = { total: 0, met: 0 }
  const habits: WeekPlanRowSummary = { total: 0, met: 0 }
  const intentions: WeekPlanRowSummary = { total: 0, met: 0 }

  for (const item of items) {
    // Monthly-cadence objects with a week sub-target carry a true week-period
    // verdict in weekMeasurement — the week ring should reflect it instead of
    // the month-to-date evaluation.
    const verdict = (item.weekMeasurement ?? item.measurement).evaluationStatus

    if (item.subjectType === 'keyResult') {
      keyResults.total += 1
      if (verdict === 'met') keyResults.met += 1
      continue
    }

    if (item.subjectType === 'habit') {
      habits.total += 1
      if (verdict === 'met') habits.met += 1
    }
  }

  for (const intention of weeklyIntentions) {
    if (!intention.isActive) continue
    intentions.total += 1
    const summary = buildMeasurementSummary(intention, rawEntries, weekRef)
    if (summary.evaluationStatus === 'met') intentions.met += 1
  }

  return { keyResults, habits, intentions }
}
