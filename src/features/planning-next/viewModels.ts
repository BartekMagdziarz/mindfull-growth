import type { PlanningScale, PlanningViewState } from '@/design-system/contracts'
import type { CalendarYearSummary } from '@/services/calendarViewQueries'
import type { MonthPlanningBundle, WeekPlanningBundle } from '@/services/planningStateQueries'

export interface PlanningDataCounts {
  goals: number
  habits: number
  trackers: number
  intentions: number
}

export function classifyPlanningState(
  loading: boolean,
  error: string | null,
  hasData: boolean,
  itemCount: number,
): PlanningViewState {
  if (loading && !hasData) return 'loading'
  if (error && !hasData) return 'error'
  if (!hasData || itemCount === 0) return 'empty'
  return 'ready'
}

export function countMonthObjects(bundle: MonthPlanningBundle): PlanningDataCounts {
  return {
    goals: bundle.goalItems.length,
    habits: bundle.cadencedItems.filter(item => item.subjectType === 'habit').length,
    trackers: bundle.trackerItems.length,
    intentions: 0,
  }
}

export function countWeekObjects(bundle: WeekPlanningBundle): PlanningDataCounts {
  return {
    goals: bundle.relevant.cadencedItems.filter(item => item.subjectType === 'keyResult').length,
    habits: bundle.relevant.cadencedItems.filter(item => item.subjectType === 'habit').length,
    trackers: bundle.relevant.trackerItems.length,
    // Weekly intentions ride along at runtime, but the historical bundle type
    // narrows the cadenced collection to key results and habits. The adapter
    // supplies the actual intention list separately.
    intentions: 0,
  }
}

export function countYearObjects(summary: CalendarYearSummary): PlanningDataCounts {
  return {
    goals: summary.totals.activeGoalCount,
    habits: summary.totals.activeCadencedCount,
    trackers: summary.totals.activeTrackerCount,
    intentions: summary.totals.activeInitiativeCount,
  }
}

export function totalPlanningObjects(counts: PlanningDataCounts): number {
  return counts.goals + counts.habits + counts.trackers + counts.intentions
}

export function expectedPeriodRefLength(scale: PlanningScale): number {
  return scale === 'year' ? 4 : scale === 'day' ? 10 : 7
}

/**
 * Card summaries read as prose, so an aggregate like 7.266666666666667 has to be
 * cut to one decimal and written with the Polish separator.
 */
export function formatPlanningNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
}
