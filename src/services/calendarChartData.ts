import type { DayRef, MonthRef, PeriodRef, WeekRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasureableSubject } from '@/services/measurementProgress'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import { buildMeasurementSummary } from '@/services/measurementProgress'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'

type ChartPointStatus = ObjectsLibraryChartPoint['status']

/** Remove leading no-data points from trend charts so newly created objects
 *  don't show irrelevant empty periods before their start date. */
function trimLeadingNoData(points: ObjectsLibraryChartPoint[]): ObjectsLibraryChartPoint[] {
  const firstDataIndex = points.findIndex((p) => p.status !== 'no-data')
  if (firstDataIndex === -1) return []
  if (firstDataIndex === 0) return points
  return points.slice(firstDataIndex)
}

function evaluationToStatus(
  evaluationStatus: 'met' | 'missed' | 'no-data' | undefined,
  hasData: boolean,
): ChartPointStatus {
  if (evaluationStatus) {
    return evaluationStatus === 'met' ? 'met'
      : evaluationStatus === 'missed' ? 'missed'
        : 'no-data'
  }
  return hasData ? 'no-target' : 'no-data'
}

/**
 * Build weekly chart points for a month view — one bar per overlapping week.
 *
 * When `parentEvaluation` is provided, all bars inherit that status and no
 * target line is shown (finer-than-cadence drill-down for monthly objects).
 */
export function buildMonthWeeklyChartPoints(
  subject: MeasureableSubject,
  allEntries: DailyMeasurementEntry[],
  monthRef: MonthRef,
  parentEvaluation?: ChartPointStatus,
): ObjectsLibraryChartPoint[] {
  const weekRefs = getChildPeriods(monthRef)

  return weekRefs.map((weekRef) => {
    const summary = buildMeasurementSummary(subject, allEntries, weekRef)

    if (parentEvaluation) {
      return {
        periodRef: weekRef,
        actualValue: summary.actualValue,
        targetValue: undefined,
        status: summary.actualValue !== undefined ? parentEvaluation : 'no-data',
      }
    }

    return {
      periodRef: weekRef,
      actualValue: summary.actualValue,
      targetValue: summary.target?.value,
      status: evaluationToStatus(summary.evaluationStatus, summary.actualValue !== undefined),
    }
  })
}

/**
 * Build daily chart points for a week view — one bar per day.
 *
 * When `parentEvaluation` is provided, all bars inherit that status
 * (finer-than-cadence drill-down).
 */
export function buildWeekDailyChartPoints(
  subject: MeasureableSubject,
  subjectType: MeasurementSubjectType,
  allEntries: DailyMeasurementEntry[],
  weekRef: WeekRef,
  parentEvaluation?: ChartPointStatus,
): ObjectsLibraryChartPoint[] {
  const dayRefs = getChildPeriods(weekRef)

  return dayRefs.map((dayRef) => {
    const entry = allEntries.find(
      (e) =>
        e.subjectType === subjectType &&
        e.subjectId === subject.id &&
        e.dayRef === dayRef,
    )

    let actualValue: number | undefined
    if (entry) {
      if (subject.entryMode === 'completion') {
        actualValue = 1
      } else {
        actualValue = entry.value ?? undefined
      }
    }

    const status: ChartPointStatus = parentEvaluation
      ? (entry ? parentEvaluation : 'no-data')
      : (entry ? 'no-target' : 'no-data')

    return {
      periodRef: dayRef as string,
      actualValue,
      targetValue: undefined,
      status,
    }
  })
}

/**
 * Build monthly trend chart points — 5 bars (4 past months + current).
 * Used for monthly-cadence objects in month view at the "months" scale.
 */
export function buildMonthlyTrendChartPoints(
  subject: MeasureableSubject,
  allEntries: DailyMeasurementEntry[],
  currentMonthRef: MonthRef,
  todayRef: DayRef,
): ObjectsLibraryChartPoint[] {
  const todayRefs = getPeriodRefsForDate(todayRef)
  const isCurrentMonth = todayRefs.month === currentMonthRef

  const monthRefs: MonthRef[] = []
  let ref = currentMonthRef as string
  for (let i = 0; i < 5; i++) {
    monthRefs.unshift(ref as MonthRef)
    if (i < 4) {
      ref = getPreviousPeriod(ref as MonthRef) as string
    }
  }

  const target = 'target' in subject ? subject.target : undefined

  const points = monthRefs.map((monthRef) => {
    const summary = buildMeasurementSummary(subject, allEntries, monthRef)
    const isCurrent = monthRef === currentMonthRef && isCurrentMonth

    if (isCurrent) {
      return {
        periodRef: monthRef,
        actualValue: summary.actualValue,
        targetValue: target?.value,
        status: summary.actualValue !== undefined ? ('no-target' as const) : ('no-data' as const),
        isCurrent: true,
      }
    }

    return {
      periodRef: monthRef,
      actualValue: summary.actualValue,
      targetValue: target?.value,
      status: evaluationToStatus(summary.evaluationStatus, summary.actualValue !== undefined),
      isCurrent: false,
    }
  })

  return trimLeadingNoData(points)
}

/**
 * Build weekly trend chart points — 5 bars (4 past weeks + current).
 * Used for weekly-cadence objects in week view at the "weeks" scale,
 * and for monthly-cadence objects in week view at the "weeks" scale.
 */
export function buildWeeklyTrendChartPoints(
  subject: MeasureableSubject,
  allEntries: DailyMeasurementEntry[],
  currentWeekRef: WeekRef,
  todayRef: DayRef,
): ObjectsLibraryChartPoint[] {
  const todayRefs = getPeriodRefsForDate(todayRef)
  const isCurrentWeek = todayRefs.week === currentWeekRef

  const weekRefs: WeekRef[] = []
  let ref = currentWeekRef as string
  for (let i = 0; i < 5; i++) {
    weekRefs.unshift(ref as WeekRef)
    if (i < 4) {
      ref = getPreviousPeriod(ref as WeekRef) as string
    }
  }

  const target = 'target' in subject ? subject.target : undefined

  const points = weekRefs.map((weekRef) => {
    const summary = buildMeasurementSummary(subject, allEntries, weekRef)
    const isCurrent = weekRef === currentWeekRef && isCurrentWeek

    if (isCurrent) {
      return {
        periodRef: weekRef,
        actualValue: summary.actualValue,
        targetValue: target?.value,
        status: summary.actualValue !== undefined ? ('no-target' as const) : ('no-data' as const),
        isCurrent: true,
      }
    }

    return {
      periodRef: weekRef,
      actualValue: summary.actualValue,
      targetValue: target?.value,
      status: evaluationToStatus(summary.evaluationStatus, summary.actualValue !== undefined),
      isCurrent: false,
    }
  })

  return trimLeadingNoData(points)
}

/**
 * Load entries covering 5 periods for trend charts.
 * Results are cached per periodRef+scale combination.
 */
const trendCache = new Map<string, Promise<DailyMeasurementEntry[]>>()

export function clearTrendCache(): void {
  trendCache.clear()
}

export function loadTrendEntries(
  currentPeriodRef: MonthRef | WeekRef,
  trendScale: 'months' | 'weeks',
): Promise<DailyMeasurementEntry[]> {
  const key = `${currentPeriodRef}:${trendScale}`
  if (!trendCache.has(key)) {
    trendCache.set(key, fetchTrendEntries(currentPeriodRef, trendScale))
  }
  return trendCache.get(key)!
}

async function fetchTrendEntries(
  currentPeriodRef: MonthRef | WeekRef,
  trendScale: 'months' | 'weeks',
): Promise<DailyMeasurementEntry[]> {
  // Walk back 4 periods to get the earliest one
  let earliest: PeriodRef = currentPeriodRef
  for (let i = 0; i < 4; i++) {
    earliest = getPreviousPeriod(earliest)
  }

  const startBounds = getPeriodBounds(earliest)
  const endBounds = getPeriodBounds(currentPeriodRef)

  // For monthly trends, expand to cover overlapping weeks
  if (trendScale === 'months') {
    const firstMonth = earliest as MonthRef
    const lastMonth = currentPeriodRef as MonthRef
    const firstWeeks = getChildPeriods(firstMonth)
    const lastWeeks = getChildPeriods(lastMonth)
    const expandedStart = getPeriodBounds(firstWeeks[0]).start
    const expandedEnd = getPeriodBounds(lastWeeks[lastWeeks.length - 1]).end
    return planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(expandedStart, expandedEnd)
  }

  return planningStateDexieRepository.listDailyMeasurementEntriesForDayRange(startBounds.start, endBounds.end)
}
