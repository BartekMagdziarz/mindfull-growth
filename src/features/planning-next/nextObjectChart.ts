import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import { buildWeekDailyChartPoints } from '@/services/calendarChartData'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import { getPeriodRefsForDate } from '@/utils/periods'

export interface NextObjectChartPoint {
  key: string
  label: string
  value?: number
  target?: number
  status: 'met' | 'missed' | 'no-data' | 'no-target'
  future?: boolean
  current?: boolean
  assigned?: boolean
}

const weekdayFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'short' })

/**
 * Seven Monday–Sunday points for one day item, in the week of `dayRef`. Values
 * come from the same raw entries the Today store patches optimistically, so a
 * chart drawn from these points always agrees with the row control beside it.
 */
export function buildDayChartPoints(
  item: TodayMeasurementItem,
  dayRef: DayRef,
  rawEntries: DailyMeasurementEntry[],
  dayAssignments: MeasurementDayAssignment[],
): NextObjectChartPoint[] {
  const weekRef = getPeriodRefsForDate(new Date(`${dayRef}T12:00:00`)).week
  return buildWeekDailyChartPoints(item.subject, item.subjectType, rawEntries, weekRef).map(point => ({
    key: point.periodRef,
    label: weekdayFormatter.format(new Date(`${point.periodRef}T12:00:00`)).replace('.', ''),
    value: point.actualValue,
    target: point.targetValue,
    status: point.status,
    future: point.periodRef > dayRef,
    current: point.periodRef === dayRef,
    assigned: dayAssignments.some(
      assignment =>
        assignment.dayRef === point.periodRef &&
        assignment.subjectType === item.subjectType &&
        assignment.subjectId === item.subject.id,
    ),
  }))
}
