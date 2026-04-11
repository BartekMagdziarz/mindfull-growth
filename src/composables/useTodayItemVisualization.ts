import { computed, type Ref } from 'vue'
import type { DayRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import type {
  TodayAggregateData,
  TodayCompletionSlot,
  TodayCounterRingData,
  TodayDaySlot,
  TodayRatingSmoothData,
  TodaySummaryNumberData,
  TodayValueSparklineData,
} from '@/services/todayChartData'
import {
  buildAggregateData,
  buildCompletionSlots,
  buildCounterRingData,
  buildDailyBarSlots,
  buildRatingSmoothData,
  buildSummaryNumberData,
  buildValueLineSlots,
  buildValueSparklineData,
} from '@/services/todayChartData'
import { resolveTodayVizType, type TodayVizType } from '@/services/todayVisualizationRules'

export type { TodayVizType }

export function useTodayItemVisualization(
  item: Ref<TodayItem>,
  rawEntries: Ref<DailyMeasurementEntry[]>,
  allDayAssignments: Ref<MeasurementDayAssignment[]>,
  todayDayRef: Ref<DayRef>,
) {
  const vizType = computed<TodayVizType>(() => {
    const current = item.value
    if (current.kind === 'initiative') {
      return resolveTodayVizType({ kind: 'initiative' })
    }
    const m = current as TodayMeasurementItem
    return resolveTodayVizType({
      kind: 'measurement',
      panelType: m.panelType,
      entryMode: m.subject.entryMode,
      target: (m.subject as { target?: MeasurementTarget }).target,
      cadence: m.subject.cadence,
    })
  })

  const completionSlots = computed<TodayCompletionSlot[]>(() => {
    if (
      (vizType.value !== 'completion-dots' && vizType.value !== 'completion-ring') ||
      item.value.kind !== 'measurement'
    ) {
      return []
    }
    const m = item.value as TodayMeasurementItem
    return buildCompletionSlots(
      m.subject,
      m.subjectType,
      rawEntries.value,
      allDayAssignments.value,
      m.planning,
      m.contextPeriodRef,
      todayDayRef.value,
    )
  })

  const barSlots = computed<TodayDaySlot[]>(() => {
    // `barSlots` is also reused by `RatingSegmentedBars` because the slot
    // shape is identical — only the viz type differs.
    if (
      (vizType.value !== 'daily-bars' && vizType.value !== 'rating-segmented') ||
      item.value.kind !== 'measurement'
    ) {
      return []
    }
    const m = item.value as TodayMeasurementItem
    return buildDailyBarSlots(
      m.subject,
      m.subjectType,
      rawEntries.value,
      allDayAssignments.value,
      m.planning,
      m.contextPeriodRef,
      todayDayRef.value,
    )
  })

  const valueLineSlots = computed<TodayDaySlot[]>(() => {
    if (vizType.value !== 'value-line' || item.value.kind !== 'measurement') return []
    const m = item.value as TodayMeasurementItem
    return buildValueLineSlots(
      m.subject,
      m.subjectType,
      rawEntries.value,
      m.contextPeriodRef,
      todayDayRef.value,
    )
  })

  const aggregateData = computed<TodayAggregateData | undefined>(() => {
    if (item.value.kind !== 'measurement') return undefined
    const m = item.value as TodayMeasurementItem
    return buildAggregateData(m.subject, m.measurement)
  })

  const counterRingData = computed<TodayCounterRingData | undefined>(() => {
    if (vizType.value !== 'counter-ring' || item.value.kind !== 'measurement') return undefined
    const m = item.value as TodayMeasurementItem
    return buildCounterRingData(m.subject, m.measurement)
  })

  const valueSparklineData = computed<TodayValueSparklineData | undefined>(() => {
    if (vizType.value !== 'value-sparkline-summary' || item.value.kind !== 'measurement') {
      return undefined
    }
    const m = item.value as TodayMeasurementItem
    return buildValueSparklineData(
      m.subject,
      m.subjectType,
      rawEntries.value,
      m.contextPeriodRef,
      todayDayRef.value,
      m.measurement,
    )
  })

  const ratingSmoothData = computed<TodayRatingSmoothData | undefined>(() => {
    if (vizType.value !== 'rating-smooth' || item.value.kind !== 'measurement') return undefined
    const m = item.value as TodayMeasurementItem
    return buildRatingSmoothData(m.subject, m.measurement)
  })

  const summaryNumberData = computed<TodaySummaryNumberData | undefined>(() => {
    if (vizType.value !== 'summary-number' || item.value.kind !== 'measurement') return undefined
    const m = item.value as TodayMeasurementItem
    return buildSummaryNumberData(
      m.subject,
      m.subjectType,
      rawEntries.value,
      m.contextPeriodRef,
      m.measurement,
    )
  })

  const entryMode = computed(() => {
    if (item.value.kind !== 'measurement') return undefined
    return (item.value as TodayMeasurementItem).subject.entryMode
  })

  const currentValue = computed(() => {
    if (item.value.kind !== 'measurement') return 0
    return (item.value as TodayMeasurementItem).todayEntry?.value ?? 0
  })

  const targetValue = computed<number | undefined>(() => {
    if (item.value.kind !== 'measurement') return undefined
    const m = item.value as TodayMeasurementItem
    const target = 'target' in m.subject ? m.subject.target : undefined
    return target?.value
  })

  return {
    vizType,
    completionSlots,
    barSlots,
    valueLineSlots,
    aggregateData,
    counterRingData,
    valueSparklineData,
    ratingSmoothData,
    summaryNumberData,
    entryMode,
    currentValue,
    targetValue,
  }
}
