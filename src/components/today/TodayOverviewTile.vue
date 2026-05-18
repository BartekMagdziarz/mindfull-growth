<template>
  <article class="overview-tile">
    <header class="overview-tile__head">
      <EntityIcon :icon="iconName" size="sm" :circle="false" class="overview-tile__icon" />
      <span class="overview-tile__title">{{ title }}</span>
    </header>

    <div class="overview-tile__body">
      <InitiativeCheckmark
        v-if="viz.vizType.value === 'initiative-check'"
        :is-complete="item.kind === 'initiative' && !!item.planState.dayRef"
      />
      <CompletionDots
        v-else-if="viz.vizType.value === 'completion-dots'"
        :slots="viz.completionSlots.value"
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

    <footer class="overview-tile__foot">
      <span class="overview-tile__agg">{{ actualLabel || '—' }}</span>
      <span v-if="targetLabel" class="overview-tile__target">{{ targetLabel }}</span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import CompletionDots from '@/components/today/visualizations/CompletionDots.vue'
import CompletionRing from '@/components/today/visualizations/CompletionRing.vue'
import CounterRing from '@/components/today/visualizations/CounterRing.vue'
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import ValueSparklineSummary from '@/components/today/visualizations/ValueSparklineSummary.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
import RatingSmoothBar from '@/components/today/visualizations/RatingSmoothBar.vue'
import SummaryNumber from '@/components/today/visualizations/SummaryNumber.vue'
import InitiativeCheckmark from '@/components/today/visualizations/InitiativeCheckmark.vue'
import { useT } from '@/composables/useT'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import type { DayRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
} from '@/domain/planningState'

interface Props {
  item: TodayItem
  todayDayRef: DayRef
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
}

const props = defineProps<Props>()

const { locale } = useT()

const viz = useTodayItemVisualization(
  toRef(props, 'item'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value),
)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title,
)

const PANEL_TYPE_ICONS: Record<string, string> = {
  habit: 'loop',
  tracker: 'monitoring',
  keyResult: 'flag',
  initiative: 'rocket_launch',
}

const iconName = computed(() => {
  if (props.item.kind === 'initiative') {
    return props.item.initiative.icon || PANEL_TYPE_ICONS.initiative
  }
  if (props.item.panelType === 'keyResult' && props.item.goalIcon) {
    return props.item.goalIcon
  }
  const subject = props.item.subject as { icon?: string }
  if (subject.icon) return subject.icon
  return PANEL_TYPE_ICONS[props.item.panelType] ?? 'circle'
})

const completionRingDoneCount = computed(
  () =>
    viz.completionSlots.value.filter((s) => s.state === 'done' || s.state === 'today-done').length,
)
const completionRingTargetCount = computed(() => viz.targetValue.value ?? 0)

const ratingTargetOperator = computed<'gte' | 'lte' | undefined>(() => {
  const op = viz.aggregateData.value?.operator
  return op === 'gte' || op === 'lte' ? op : undefined
})

function getUnit(item: TodayMeasurementItem): string {
  const subject = item.subject as { unit?: string }
  return subject.unit ?? ''
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

function formatTargetCompact(target: MeasurementTarget, unit: string): string {
  switch (target.kind) {
    case 'count':
      return `${target.value}${unit ? ` ${unit}` : ''}`
    case 'value':
    case 'rating':
      return `${target.operator === 'gte' ? '≥' : '≤'} ${formatMeasurementValue(target.value)}${unit ? ` ${unit}` : ''}`
  }
}

const actualLabel = computed(() => {
  if (props.item.kind !== 'measurement') return ''
  const m = props.item
  if (m.measurement.actualValue === undefined) return ''
  return (
    formatMeasurementValue(m.measurement.actualValue) +
    (getUnit(m) ? ` ${getUnit(m)}` : '')
  )
})

const targetLabel = computed(() => {
  if (props.item.kind !== 'measurement') return ''
  const m = props.item
  const target = m.measurement.target
  if (!target) return ''
  return formatTargetCompact(target, getUnit(m))
})
</script>

<style scoped>
.overview-tile {
  border-radius: 18px;
  padding: 10px 12px 8px;
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
    -5px -5px 11px rgb(var(--neo-shadow-light) / 0.80),
    5px 5px 11px rgb(var(--neo-shadow-dark) / 0.30);
}

.overview-tile__head {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 20px;
}

.overview-tile__icon {
  font-size: 15px;
  color: rgb(var(--color-primary-strong));
  flex: 0 0 auto;
}

.overview-tile__title {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--neo-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Body: shorter than the original design (was 74px), keep tight ratio */
.overview-tile__body {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  min-height: 56px;
  max-height: 80px;
  overflow: hidden;
}

/* Scale fixed-size SVG charts (CompletionRing/CounterRing render at 110px) to
   fit inside the shorter tile body without sacrificing the viewBox. */
.overview-tile__body :deep(svg) {
  max-width: 100%;
  max-height: 70px;
}

/* Center sparkline/summary rows that fill the row width */
.overview-tile__body > * {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overview-tile__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 10.5px;
  color: rgb(var(--neo-muted));
  font-weight: 500;
  padding-top: 5px;
  border-top: 1px solid rgb(var(--neo-border) / 0.35);
}

.overview-tile__agg {
  color: rgb(var(--neo-text));
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-tile__target {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
