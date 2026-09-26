import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import { buildWeekDailyChartPoints } from '@/services/calendarChartData'
import type { TodayMeasurementItem } from '@/services/todayViewQueries'
import { addDaysToDayRef, getPeriodRefsForDate } from '@/utils/periods'

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

/** Rolling history for inline Today cards; the legacy calendar keeps its week axis. */
export function buildRecentDayChartPoints(
  item: TodayMeasurementItem,
  dayRef: DayRef,
  rawEntries: DailyMeasurementEntry[],
  dayAssignments: MeasurementDayAssignment[],
  locale = 'pl-PL',
): NextObjectChartPoint[] {
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToDayRef(dayRef, index - 6))
  const weeks = [...new Set(dates.map(date => getPeriodRefsForDate(date).week))]
  const points = weeks.flatMap(week => buildWeekDailyChartPoints(item.subject, item.subjectType, rawEntries, week))
  const today = getPeriodRefsForDate(new Date()).day
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return dates.map(date => {
    const point = points.find(point => point.periodRef === date)!
    return {
      key: date,
      label: formatter.format(new Date(`${date}T12:00:00`)),
      value: point.actualValue,
      target: point.targetValue,
      status: point.status,
      current: date === dayRef,
      future: date > today,
      assigned: dayAssignments.some(a => a.dayRef === date && a.subjectType === item.subjectType && a.subjectId === item.subject.id),
    }
  })
}
