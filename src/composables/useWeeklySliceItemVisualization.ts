/**
 * Composable for the weekly-slice scope (currently used by the weekly
 * reflection grid). Sibling to {@link useTodayItemVisualization}:
 *
 *  - dispatches to {@link resolveWeeklySliceVizType} instead of
 *    {@link resolveTodayVizType}, so monthly-cadence objects render their
 *    WEEKLY visualisation (daily bars / line / segmented bars / 7 dots);
 *  - uses {@link buildWeeklySliceCompletionSlots} for completion-dots so the
 *    slot count stays at 7 even for high-target monthly habits;
 *  - additionally exposes {@link MonthlyContextFooterData} for monthly-cadence
 *    subjects so the tile can render a small footer underneath the chart.
 *
 * Accepts measurement primitives directly (subject, subjectType, planning,
 * measurement, …) instead of a TodayItem so callers don't need to construct
 * a pseudo-TodayItem at the call site.
 */

import { computed, type ComputedRef, type Ref } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
  MeasurementSubjectType,
} from '@/domain/planningState'
import type { MeasureableSubject, MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildAggregateData,
  buildDailyBarSlots,
  buildValueLineSlots,
  type TodayAggregateData,
  type TodayCompletionSlot,
  type TodayDaySlot,
} from '@/services/todayChartData'
import { resolveWeeklySliceVizType, type TodayVizType } from '@/services/todayVisualizationRules'
import {
  buildMonthlyContextFooter,
  buildWeeklySliceCompletionSlots,
  type MonthlyContextFooterData,
} from '@/services/weeklySliceChartData'

export interface UseWeeklySliceItemVisualization {
  vizType: ComputedRef<TodayVizType>
  completionSlots: ComputedRef<TodayCompletionSlot[]>
  barSlots: ComputedRef<TodayDaySlot[]>
  valueLineSlots: ComputedRef<TodayDaySlot[]>
  aggregateData: ComputedRef<TodayAggregateData | undefined>
  targetValue: ComputedRef<number | undefined>
  ratingScaleMin: ComputedRef<number>
  ratingScale: ComputedRef<number>
  monthlyFooter: ComputedRef<MonthlyContextFooterData | undefined>
}

export function useWeeklySliceItemVisualization(
  subject: Ref<MeasureableSubject>,
  subjectType: Ref<MeasurementSubjectType>,
  planning: Ref<MeasurementPlanningSummary>,
  measurement: Ref<MeasurementSummary>,
  rawEntries: Ref<DailyMeasurementEntry[]>,
  allDayAssignments: Ref<MeasurementDayAssignment[]>,
  weekRef: Ref<WeekRef>,
  todayDayRef: Ref<DayRef>,
  locale: Ref<string>,
): UseWeeklySliceItemVisualization {
  const vizType = computed<TodayVizType>(() =>
    resolveWeeklySliceVizType({
      kind: 'measurement',
      panelType: subjectType.value,
      entryMode: subject.value.entryMode,
      target: (subject.value as { target?: MeasurementTarget }).target,
      cadence: subject.value.cadence,
    }),
  )

  const completionSlots = computed<TodayCompletionSlot[]>(() => {
    if (vizType.value !== 'completion-dots') return []
    return buildWeeklySliceCompletionSlots(
      subject.value,
      subjectType.value,
      rawEntries.value,
      allDayAssignments.value,
      planning.value,
      weekRef.value,
      todayDayRef.value,
      locale.value,
    )
  })

  const barSlots = computed<TodayDaySlot[]>(() => {
    if (vizType.value !== 'daily-bars' && vizType.value !== 'rating-segmented') return []
    return buildDailyBarSlots(
      subject.value,
      subjectType.value,
      rawEntries.value,
      allDayAssignments.value,
      planning.value,
      weekRef.value,
      todayDayRef.value,
      locale.value,
    )
  })

  const valueLineSlots = computed<TodayDaySlot[]>(() => {
    if (vizType.value !== 'value-line') return []
    return buildValueLineSlots(
      subject.value,
      subjectType.value,
      rawEntries.value,
      weekRef.value,
      todayDayRef.value,
      locale.value,
    )
  })

  const aggregateData = computed<TodayAggregateData | undefined>(() =>
    buildAggregateData(subject.value, measurement.value),
  )

  const targetValue = computed<number | undefined>(() => {
    const target = (subject.value as { target?: MeasurementTarget }).target
    return target?.value
  })

  const ratingScaleMin = computed<number>(() => subject.value.ratingScaleMin ?? 1)
  const ratingScale = computed<number>(() => subject.value.ratingScale ?? 10)

  const monthlyFooter = computed<MonthlyContextFooterData | undefined>(() =>
    buildMonthlyContextFooter(subject.value, rawEntries.value, weekRef.value),
  )

  return {
    vizType,
    completionSlots,
    barSlots,
    valueLineSlots,
    aggregateData,
    targetValue,
    ratingScaleMin,
    ratingScale,
    monthlyFooter,
  }
}
