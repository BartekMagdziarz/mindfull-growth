import type { MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementMonthState, MeasurementWeekState } from '@/domain/planningState'
import { getPeriodType, getWeekOverlappingMonths } from '@/utils/periods'

/** Inputs must already be restricted to one subject. Stable across repository ordering. */
export function measurementPeriodOverrides(
  periodRef: MonthRef | WeekRef,
  cadence: 'weekly' | 'monthly',
  months: Pick<MeasurementMonthState, 'monthRef' | 'activityState' | 'targetOverride'>[],
  weeks: Pick<MeasurementWeekState, 'weekRef' | 'sourceMonthRef' | 'targetOverride'>[],
  contextMonth?: MonthRef
) {
  if (getPeriodType(periodRef) === 'month') {
    return {
      monthOverride: months.find(m => m.monthRef === periodRef && m.activityState === 'active')
        ?.targetOverride,
    }
  }
  const weekRef = periodRef as WeekRef
  const overlaps = getWeekOverlappingMonths(weekRef)
  const month =
    cadence === 'monthly' && contextMonth
      ? months.find(m => m.monthRef === contextMonth && m.activityState === 'active')
      : [...months]
          .filter(m => m.activityState === 'active' && overlaps.includes(m.monthRef))
          .sort((a, b) => a.monthRef.localeCompare(b.monthRef))[0]
  const week = weeks.find(
    w =>
      w.weekRef === weekRef &&
      (cadence === 'monthly'
        ? w.sourceMonthRef === (contextMonth ?? month?.monthRef)
        : !w.sourceMonthRef)
  )
  return { monthOverride: month?.targetOverride, weekOverride: week?.targetOverride }
}
