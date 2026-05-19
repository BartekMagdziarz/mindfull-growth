import type { WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { WeekObjectItem } from '@/services/reflectionDataQueries'
import { getPeriodRefsForDate } from '@/utils/periods'

export interface WeekPlanRowSummary {
  total: number
  met: number
}

export interface WeekPlanTrackerSummary {
  total: number
  assignedDays: number
  filledDays: number
}

export interface WeekPlanSummary {
  keyResults: WeekPlanRowSummary
  habits: WeekPlanRowSummary
  trackers: WeekPlanTrackerSummary
}

const DAYS_IN_WEEK = 7

export function buildWeeklyPlanSummary(
  items: WeekObjectItem[],
  rawEntries: DailyMeasurementEntry[],
  weekRef: WeekRef,
): WeekPlanSummary {
  const keyResults: WeekPlanRowSummary = { total: 0, met: 0 }
  const habits: WeekPlanRowSummary = { total: 0, met: 0 }
  const trackers: WeekPlanTrackerSummary = { total: 0, assignedDays: 0, filledDays: 0 }

  for (const item of items) {
    if (item.subjectType === 'keyResult') {
      keyResults.total += 1
      if (item.measurement.evaluationStatus === 'met') keyResults.met += 1
      continue
    }

    if (item.subjectType === 'habit') {
      habits.total += 1
      if (item.measurement.evaluationStatus === 'met') habits.met += 1
      continue
    }

    if (item.subjectType === 'tracker') {
      trackers.total += 1
      const scope = item.planning.scheduleScope

      if (scope === 'whole-week') {
        trackers.assignedDays += DAYS_IN_WEEK
        const filled = rawEntries.filter(
          entry =>
            entry.subjectId === item.subject.id &&
            entry.value !== null &&
            getPeriodRefsForDate(entry.dayRef).week === weekRef,
        ).length
        trackers.filledDays += Math.min(filled, DAYS_IN_WEEK)
      } else if (scope === 'specific-days') {
        const expectedDayRefs = new Set(item.planning.scheduledDayRefs)
        trackers.assignedDays += expectedDayRefs.size
        const filled = rawEntries.filter(
          entry =>
            entry.subjectId === item.subject.id &&
            entry.value !== null &&
            expectedDayRefs.has(entry.dayRef),
        ).length
        trackers.filledDays += filled
      }
    }
  }

  return { keyResults, habits, trackers }
}
