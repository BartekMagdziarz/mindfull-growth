<template>
  <article class="week-tile" :data-with-footer="hasFooter">
    <header class="week-tile__head">
      <EntityIcon
        :icon="iconName"
        size="sm"
        :circle="false"
        class="week-tile__icon"
      />
      <span class="week-tile__title">{{ title }}</span>
    </header>

    <div class="week-tile__body">
      <CompletionDots
        v-if="viz.vizType.value === 'completion-dots'"
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

    <MonthlyProgressFooter
      v-if="viz.monthlyFooter.value"
      :data="viz.monthlyFooter.value"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import CompletionDots from '@/components/today/visualizations/CompletionDots.vue'
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import MonthlyProgressFooter from '@/components/calendar/MonthlyProgressFooter.vue'
import { useT } from '@/composables/useT'
import { useWeeklySliceItemVisualization } from '@/composables/useWeeklySliceItemVisualization'
import type { DayRef, WeekRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
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
  allDayAssignments: MeasurementDayAssignment[]
  weekRef: WeekRef
  todayDayRef: DayRef
  /** Parent goal icon, only set for KeyResult items. */
  parentGoalIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  parentGoalIcon: undefined,
})

const { locale } = useT()

const viz = useWeeklySliceItemVisualization(
  toRef(props, 'subject'),
  toRef(props, 'subjectType'),
  toRef(props, 'planning'),
  toRef(props, 'measurement'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'weekRef'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value),
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

const hasFooter = computed(() => Boolean(viz.monthlyFooter.value))
</script>

<style scoped>
.week-tile {
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
  border: 1px solid rgb(var(--neo-border) / 0.30);
  box-shadow:
    -4px -4px 9px rgb(var(--neo-shadow-light) / 0.75),
    4px 4px 9px rgb(var(--neo-shadow-dark) / 0.28);
}

.week-tile__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 18px;
  min-width: 0;
}

.week-tile__icon {
  font-size: 13px;
  color: rgb(var(--color-primary-strong));
  flex: 0 0 auto;
}

.week-tile__title {
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--neo-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
  min-width: 0;
}

.week-tile__body {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 0;
  min-height: 48px;
  max-height: 70px;
  overflow: hidden;
}

.week-tile[data-with-footer='true'] .week-tile__body {
  min-height: 40px;
  max-height: 58px;
}

/* Scale fixed-size SVG charts to fit inside the body. */
.week-tile__body :deep(svg) {
  max-width: 100%;
  max-height: 58px;
}

.week-tile__body > * {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
