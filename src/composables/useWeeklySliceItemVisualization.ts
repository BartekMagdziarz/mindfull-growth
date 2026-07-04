/**
 * Composable for the weekly-slice scope (currently used by the weekly
 * reflection grid). Sibling to {@link useTodayItemVisualization}:
 *
 *  - dispatches to {@link resolveWeeklySliceVizType} instead of
 *    {@link resolveTodayVizType}, so monthly-cadence objects render their
 *    WEEKLY visualisation (daily bars / line / segmented bars / 7 dots);
 *  - uses {@link buildWeeklySliceCompletionSlots} for completion-dots so the
 *    slot count stays at 7 uniform weekday circles;
 *  - exposes {@link ContextChipData} (target + performance vs. target) for every
 *    object so the tile can render a compact chip beside its title — weekly
 *    cadence scoped to this week, monthly cadence to month-to-date.
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
import {
  buildMeasurementSummary,
  type MeasureableSubject,
  type MeasurementSummary,
} from '@/services/measurementProgress'
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
  buildContextChipData,
  buildMonthlyContextFooter,
  buildWeeklySliceCompletionSlots,
  type ContextChipData,
} from '@/services/weeklySliceChartData'
import { getPeriodBounds } from '@/utils/periods'

export interface UseWeeklySliceItemVisualization {
  vizType: ComputedRef<TodayVizType>
  completionSlots: ComputedRef<TodayCompletionSlot[]>
  barSlots: ComputedRef<TodayDaySlot[]>
  valueLineSlots: ComputedRef<TodayDaySlot[]>
  aggregateData: ComputedRef<TodayAggregateData | undefined>
  targetValue: ComputedRef<number | undefined>
  ratingScaleMin: ComputedRef<number>
  ratingScale: ComputedRef<number>
  contextChip: ComputedRef<ContextChipData | undefined>
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
  /** Week-period verdict for monthly-cadence subjects with a week sub-target. */
  weekMeasurement?: Ref<MeasurementSummary | undefined>,
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

  const contextChip = computed<ContextChipData | undefined>(() => {
    // Scope the aggregate to the object's cadence period, cut off at the END of
    // the displayed week (so it reads as "…to date, as seen from this week"):
    //   - weekly cadence → this week's progress vs. its weekly target;
    //   - monthly cadence with a week sub-target → this week's progress vs.
    //     the sub-target (real met/missed, e.g. "2/4 this week");
    //   - other monthly cadence → month-to-date vs. the monthly target.
    const cutoff = getPeriodBounds(weekRef.value).end as DayRef
    const chip =
      subject.value.cadence === 'monthly'
        ? weekMeasurement?.value
          ? buildContextChipData(subject.value, weekMeasurement.value, false)
          : buildMonthlyContextFooter(subject.value, rawEntries.value, weekRef.value, cutoff)
        : buildContextChipData(
            subject.value,
            buildMeasurementSummary(subject.value, rawEntries.value, weekRef.value, cutoff),
            false,
          )
    // Hide the chip only when there's nothing to say — no target and no entries.
    return chip && (chip.target !== undefined || chip.entryCount > 0) ? chip : undefined
  })

  return {
    vizType,
    completionSlots,
    barSlots,
    valueLineSlots,
    aggregateData,
    targetValue,
    ratingScaleMin,
    ratingScale,
    contextChip,
  }
}
