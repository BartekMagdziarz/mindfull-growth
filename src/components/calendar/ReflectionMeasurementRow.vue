<template>
  <div class="flex min-h-[48px] items-center gap-2 rounded-xl bg-neu-base px-3 py-2 shadow-neu-pressed-sm">
    <!-- Title + optional goal context — capped at half the row width, wraps to 2 lines. -->
    <div class="min-w-0 basis-1/2">
      <div class="flex items-center gap-1.5">
        <AppIcon
          v-if="iconName"
          :name="iconName"
          class="shrink-0 text-xs text-on-surface-variant"
        />
        <span class="line-clamp-2 break-words text-xs font-semibold leading-tight text-on-surface">
          {{ title }}
        </span>
      </div>
      <span v-if="subtitle" class="mt-0.5 block truncate text-[10px] text-on-surface-variant/75">
        {{ subtitle }}
      </span>
    </div>

    <!-- Chart: mirrors TodayItemRow's visualization branch tree. -->
    <div class="flex min-w-0 basis-1/2 items-center justify-end">
      <CompletionDots
        v-if="viz.vizType.value === 'completion-dots'"
        :slots="viz.completionSlots.value"
        size="sm"
      />
      <CompletionRing
        v-else-if="viz.vizType.value === 'completion-ring'"
        :done-count="completionRingDoneCount"
        :target-count="completionRingTargetCount"
      />
      <DailyBarsChart
        v-else-if="viz.vizType.value === 'daily-bars'"
        :slots="viz.barSlots.value"
        :period-status="viz.aggregateData.value?.status"
      />
      <ValueLineChart
        v-else-if="viz.vizType.value === 'value-line'"
        :slots="viz.valueLineSlots.value"
        :target-value="viz.targetValue.value"
      />
      <RatingSegmentedBars
        v-else-if="viz.vizType.value === 'rating-segmented'"
        :slots="viz.barSlots.value"
        :scale-min="viz.ratingScaleMin.value"
        :scale-max="viz.ratingScale.value"
        :target-value="viz.aggregateData.value?.targetValue"
        :target-operator="ratingTargetOperator"
      />
      <CounterRing
        v-else-if="viz.vizType.value === 'counter-ring' && viz.counterRingData.value"
        :data="viz.counterRingData.value"
      />
      <ValueSparklineSummary
        v-else-if="viz.vizType.value === 'value-sparkline-summary' && viz.valueSparklineData.value"
        :data="viz.valueSparklineData.value"
      />
      <RatingSmoothBar
        v-else-if="viz.vizType.value === 'rating-smooth' && viz.ratingSmoothData.value"
        :data="viz.ratingSmoothData.value"
      />
      <SummaryNumber
        v-else-if="viz.vizType.value === 'summary-number' && viz.summaryNumberData.value"
        :data="viz.summaryNumberData.value"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import CompletionDots from '@/components/today/visualizations/CompletionDots.vue'
import CompletionRing from '@/components/today/visualizations/CompletionRing.vue'
import CounterRing from '@/components/today/visualizations/CounterRing.vue'
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import ValueSparklineSummary from '@/components/today/visualizations/ValueSparklineSummary.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
import RatingSmoothBar from '@/components/today/visualizations/RatingSmoothBar.vue'
import SummaryNumber from '@/components/today/visualizations/SummaryNumber.vue'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import { useT } from '@/composables/useT'
import type { DayRef, PeriodRef } from '@/domain/period'
import type { DailyMeasurementEntry, MeasurementDayAssignment, MeasurementSubjectType } from '@/domain/planningState'
import type { MeasureableSubject, MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'

interface Props {
  subject: MeasureableSubject
  subjectType: MeasurementSubjectType
  planning: MeasurementPlanningSummary
  measurement: MeasurementSummary
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  contextPeriodRef: PeriodRef
  todayDayRef: DayRef
  subtitle?: string
  chartWidth?: string
  /** Overrides the subject's own icon — used for KR rows to show the parent goal's icon. */
  iconOverride?: string
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  chartWidth: '140px',
  iconOverride: undefined,
})

const { locale } = useT()

// Build a fake TodayMeasurementItem so we can reuse useTodayItemVisualization
// without duplicating the chart-selection + builder wiring.
const pseudoItem = computed<TodayItem>(() => {
  const item: TodayMeasurementItem = {
    kind: 'measurement',
    key: `${props.subjectType}:${props.subject.id}`,
    panelType: props.subjectType,
    subjectType: props.subjectType,
    subject: props.subject,
    planning: props.planning,
    measurement: props.measurement,
    todayEntry: undefined,
    goalTitle: undefined,
    contextPeriodRef: props.contextPeriodRef,
    sourceMonthRef: undefined,
    sectionId: 'week',
    isScheduledToday: false,
    canHide: false,
    canReschedule: false,
    canDelete: false,
  }
  return item
})

const viz = useTodayItemVisualization(
  pseudoItem,
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value),
)

const title = computed(() => props.subject.title)

const iconName = computed(() => {
  if (props.iconOverride && props.iconOverride.length > 0) return props.iconOverride
  const icon = (props.subject as { icon?: string }).icon
  return icon && icon.length > 0 ? icon : undefined
})

const completionRingDoneCount = computed(
  () =>
    viz.completionSlots.value.filter(
      (s) => s.state === 'done' || s.state === 'today-done',
    ).length,
)

const completionRingTargetCount = computed(() => viz.targetValue.value ?? 0)

const ratingTargetOperator = computed<'gte' | 'lte' | undefined>(() => {
  const op = viz.aggregateData.value?.operator
  return op === 'gte' || op === 'lte' ? op : undefined
})
</script>
