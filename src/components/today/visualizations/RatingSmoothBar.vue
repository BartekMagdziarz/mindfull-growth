<template>
  <div class="flex items-end gap-2">
    <svg
      :width="CELL_W"
      :height="CELL_H"
      :viewBox="`0 0 ${CELL_W} ${CELL_H}`"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- Outline frame -->
      <rect
        :x="0.5"
        :y="0.5"
        :width="CELL_W - 1"
        :height="CELL_H - 1"
        rx="2"
        fill="transparent"
        stroke="rgb(var(--color-outline) / 0.45)"
        stroke-width="1"
      />
      <!-- Solid fill colored by ratingBarColor (red below target → blue above) -->
      <rect
        v-if="fillRatio > 0"
        data-testid="rating-smooth-fill"
        :x="1"
        :y="fillY"
        :width="CELL_W - 2"
        :height="fillHeight"
        rx="1.5"
        :fill="fillColor"
      />
      <!-- Target tick -->
      <line
        v-if="showTargetTick"
        data-testid="rating-smooth-target"
        :x1="0"
        :y1="targetTickY"
        :x2="CELL_W"
        :y2="targetTickY"
        stroke="rgb(var(--color-on-surface-variant))"
        stroke-width="1"
        stroke-opacity="0.45"
        stroke-dasharray="3 2"
      />
    </svg>
    <div class="flex shrink-0 flex-col items-end leading-tight">
      <span class="text-sm font-semibold tabular-nums text-on-surface">
        {{ formattedAverage }}
      </span>
      <span class="mt-0.5 text-[11px] text-on-surface-variant">
        {{ t('planning.today.summary.entries', { n: data.entryCount }) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { TodayRatingSmoothData } from '@/services/todayChartData'
import { ratingBarColor } from '@/utils/ratingGradient'

const props = defineProps<{
  data: TodayRatingSmoothData
}>()

const { t } = useT()

const CELL_W = 14
const CELL_H = 52

const fillRatio = computed(() => {
  // Match RatingSegmentedBars: the lowest possible average (scaleMin) is
  // still "1 step out of N", not zero, so the bar reads as the worst rating
  // rather than as "no data".
  if (props.data.entryCount === 0) return 0
  const steps = props.data.scaleMax - props.data.scaleMin + 1
  if (steps <= 1) return 1
  const stepIndex = props.data.averageValue - props.data.scaleMin + 1
  return Math.min(1, Math.max(0, stepIndex / steps))
})

const fillHeight = computed(() => (CELL_H - 2) * fillRatio.value)
const fillY = computed(() => CELL_H - 1 - fillHeight.value)

const fillColor = computed(() =>
  ratingBarColor({
    value: props.data.averageValue,
    scaleMin: props.data.scaleMin,
    scaleMax: props.data.scaleMax,
    targetValue: props.data.targetValue,
    targetOperator: props.data.targetOperator,
  }),
)

const showTargetTick = computed(
  () =>
    props.data.targetValue !== undefined &&
    props.data.targetValue >= props.data.scaleMin &&
    props.data.targetValue <= props.data.scaleMax,
)

const targetTickY = computed(() => {
  if (props.data.targetValue === undefined) return 0
  // Use the same step-based mapping as the bar so the tick lands exactly at
  // the top of a bar whose value equals the target.
  const steps = props.data.scaleMax - props.data.scaleMin + 1
  if (steps <= 1) return CELL_H / 2
  const ratio = (props.data.targetValue - props.data.scaleMin + 1) / steps
  return CELL_H - (CELL_H - 2) * ratio - 1
})

const formattedAverage = computed(() => {
  if (props.data.entryCount === 0) return '—'
  return props.data.averageValue.toFixed(1)
})

const ariaLabel = computed(
  () => `average ${formattedAverage.value} of ${props.data.scaleMax}`,
)
</script>
