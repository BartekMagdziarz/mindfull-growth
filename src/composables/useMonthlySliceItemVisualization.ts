/**
 * Composable for the monthly-slice scope (consumed by the month reflection
 * grid). Sibling to {@link useWeeklySliceItemVisualization}:
 *
 *  - dispatches to {@link resolveMonthlySliceVizType} (currently identical to
 *    the weekly resolver — same chart primitives);
 *  - feeds slot builders that aggregate per-week instead of per-day, so the
 *    chart shows 4-5 segments matching the weeks of the displayed month;
 *  - omits the `monthlyFooter` data piece — the surrounding view already
 *    represents the whole month, so there's no additional context to surface.
 *
 * Accepts measurement primitives directly (subject, subjectType, planning,
 * measurement, …) so callers don't need to construct a pseudo-TodayItem at
 * the call site.
 */

import { computed, type ComputedRef, type Ref } from 'vue'
import type { DayRef, MonthRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  MeasurementSubjectType,
} from '@/domain/planningState'
import type { MeasureableSubject, MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import {
  buildAggregateData,
  type TodayAggregateData,
  type TodayCompletionSlot,
  type TodayDaySlot,
} from '@/services/todayChartData'
import { resolveMonthlySliceVizType, type TodayVizType } from '@/services/todayVisualizationRules'
import {
  buildMonthlySliceBarSlots,
  buildMonthlySliceCompletionSlots,
  buildMonthlySliceValueLineSlots,
} from '@/services/monthlySliceChartData'

export interface UseMonthlySliceItemVisualization {
  vizType: ComputedRef<TodayVizType>
  completionSlots: ComputedRef<TodayCompletionSlot[]>
  barSlots: ComputedRef<TodayDaySlot[]>
  valueLineSlots: ComputedRef<TodayDaySlot[]>
  aggregateData: ComputedRef<TodayAggregateData | undefined>
  targetValue: ComputedRef<number | undefined>
  ratingScaleMin: ComputedRef<number>
  ratingScale: ComputedRef<number>
}

export function useMonthlySliceItemVisualization(
  subject: Ref<MeasureableSubject>,
  subjectType: Ref<MeasurementSubjectType>,
  _planning: Ref<MeasurementPlanningSummary>,
  measurement: Ref<MeasurementSummary>,
  rawEntries: Ref<DailyMeasurementEntry[]>,
  monthRef: Ref<MonthRef>,
  todayDayRef: Ref<DayRef>,
): UseMonthlySliceItemVisualization {
  const vizType = computed<TodayVizType>(() =>
    resolveMonthlySliceVizType({
      kind: 'measurement',
      panelType: subjectType.value,
      entryMode: subject.value.entryMode,
      target: (subject.value as { target?: MeasurementTarget }).target,
      cadence: subject.value.cadence,
    }),
  )

  const completionSlots = computed<TodayCompletionSlot[]>(() => {
    if (vizType.value !== 'monthly-completion-bars') return []
    return buildMonthlySliceCompletionSlots(
      subject.value,
      rawEntries.value,
      monthRef.value,
      todayDayRef.value,
    )
  })

  const barSlots = computed<TodayDaySlot[]>(() => {
    if (vizType.value !== 'daily-bars' && vizType.value !== 'rating-segmented') return []
    return buildMonthlySliceBarSlots(
      subject.value,
      rawEntries.value,
      monthRef.value,
      todayDayRef.value,
    )
  })

  const valueLineSlots = computed<TodayDaySlot[]>(() => {
    if (vizType.value !== 'value-line') return []
    return buildMonthlySliceValueLineSlots(
      subject.value,
      rawEntries.value,
      monthRef.value,
      todayDayRef.value,
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

  return {
    vizType,
    completionSlots,
    barSlots,
    valueLineSlots,
    aggregateData,
    targetValue,
    ratingScaleMin,
    ratingScale,
  }
}
