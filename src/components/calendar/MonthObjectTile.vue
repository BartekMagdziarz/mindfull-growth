<template>
  <article class="month-tile">
    <header class="month-tile__head">
      <EntityIcon
        :icon="iconName"
        size="sm"
        :circle="false"
        class="month-tile__icon"
      />
      <span class="month-tile__title">{{ title }}</span>
    </header>

    <div class="month-tile__body">
      <MonthlyCompletionBarsChart
        v-if="viz.vizType.value === 'monthly-completion-bars'"
        :slots="viz.completionSlots.value"
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
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import MonthlyCompletionBarsChart from '@/components/today/visualizations/MonthlyCompletionBarsChart.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import { useMonthlySliceItemVisualization } from '@/composables/useMonthlySliceItemVisualization'
import type { DayRef, MonthRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementSubjectType,
} from '@/domain/planningState'
import type { MeasureableSubject, MeasurementSummary } from '@/services/measurementProgress'
import type { MeasurementPlanningSummary } from '@/services/planningStateQueries'

interface Props {
  subject: MeasureableSubject
  subjectType: MeasurementSubjectType
  planning: MeasurementPlanningSummary
  measurement: MeasurementSummary
  rawEntries: DailyMeasurementEntry[]
  monthRef: MonthRef
  todayDayRef: DayRef
  /** Parent goal icon, only set for KeyResult items. */
  parentGoalIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  parentGoalIcon: undefined,
})

const viz = useMonthlySliceItemVisualization(
  toRef(props, 'subject'),
  toRef(props, 'subjectType'),
  toRef(props, 'planning'),
  toRef(props, 'measurement'),
  toRef(props, 'rawEntries'),
  toRef(props, 'monthRef'),
  toRef(props, 'todayDayRef'),
)

const title = computed(() => props.subject.title)

const PANEL_TYPE_ICONS: Record<MeasurementSubjectType, string> = {
  habit: 'loop',
  tracker: 'monitoring',
  keyResult: 'flag',
}

const iconName = computed(() => {
  if (props.subjectType === 'keyResult' && props.parentGoalIcon) {
    return props.parentGoalIcon
  }
  const subjectIcon = (props.subject as { icon?: string }).icon
  if (subjectIcon && subjectIcon.length > 0) return subjectIcon
  return PANEL_TYPE_ICONS[props.subjectType] ?? 'circle'
})

const ratingTargetOperator = computed<'gte' | 'lte' | undefined>(() => {
  const op = viz.aggregateData.value?.operator
  return op === 'gte' || op === 'lte' ? op : undefined
})
</script>

<style scoped>
.month-tile {
  border-radius: 14px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  border: 1px solid rgb(var(--neo-border) / 0.10);
  box-shadow:
    -4px -4px 9px rgb(var(--neo-shadow-light) / 0.75),
    4px 4px 9px rgb(var(--neo-shadow-dark) / 0.28);
}

.month-tile__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
  min-width: 0;
}

.month-tile__icon {
  font-size: 13px;
  color: rgb(var(--color-primary-strong));
  flex: 0 0 auto;
}

.month-tile__title {
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--neo-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
  min-width: 0;
}

.month-tile__body {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 0;
  min-height: 48px;
  max-height: 70px;
  overflow: hidden;
}

.month-tile__body :deep(svg) {
  max-width: 100%;
  max-height: 58px;
}

.month-tile__body > * {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
