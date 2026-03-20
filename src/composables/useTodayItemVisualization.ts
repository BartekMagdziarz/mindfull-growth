import { computed, type Ref } from 'vue'
import type { DayRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import type { ChartColorTheme } from '@/components/objects/sparklines/sparklineUtils'
import type { TodayCompletionSlot, TodayDaySlot, TodayAggregateData } from '@/services/todayChartData'
import {
  buildCompletionSlots,
  buildDailyBarSlots,
  buildTrackerLineSlots,
  buildAggregateData,
} from '@/services/todayChartData'

export type TodayVizType = 'completion-dots' | 'daily-bars' | 'tracker-line' | 'initiative-check'

export function useTodayItemVisualization(
  item: Ref<TodayItem>,
  rawEntries: Ref<DailyMeasurementEntry[]>,
  allDayAssignments: Ref<MeasurementDayAssignment[]>,
  todayDayRef: Ref<DayRef>,
) {
  const vizType = computed<TodayVizType>(() => {
    if (item.value.kind === 'initiative') return 'initiative-check'
    const m = item.value as TodayMeasurementItem
    if (m.subject.entryMode === 'completion') return 'completion-dots'
    if (m.panelType === 'tracker' && m.subject.entryMode === 'value') return 'tracker-line'
    return 'daily-bars'
  })

  const colorTheme = computed<ChartColorTheme>(() => {
    const pt = item.value.panelType
    if (pt === 'habit') return 'habit'
    if (pt === 'tracker') return 'tracker'
    return 'keyResult'
  })

  const completionSlots = computed<TodayCompletionSlot[]>(() => {
    if (vizType.value !== 'completion-dots' || item.value.kind !== 'measurement') return []
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
    if (vizType.value !== 'daily-bars' || item.value.kind !== 'measurement') return []
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

  const lineSlots = computed<TodayDaySlot[]>(() => {
    if (vizType.value !== 'tracker-line' || item.value.kind !== 'measurement') return []
    const m = item.value as TodayMeasurementItem
    return buildTrackerLineSlots(
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

  const entryMode = computed(() => {
    if (item.value.kind !== 'measurement') return undefined
    return (item.value as TodayMeasurementItem).subject.entryMode
  })

  const currentValue = computed(() => {
    if (item.value.kind !== 'measurement') return 0
    return (item.value as TodayMeasurementItem).todayEntry?.value ?? 0
  })

  return {
    vizType,
    colorTheme,
    completionSlots,
    barSlots,
    lineSlots,
    aggregateData,
    entryMode,
    currentValue,
  }
}
