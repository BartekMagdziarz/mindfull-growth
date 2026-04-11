<template>
  <div class="flex items-center justify-center">
    <svg
      :width="SIZE"
      :height="SIZE"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      role="img"
      :aria-label="progressAriaLabel"
    >
      <circle
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        stroke="rgb(var(--color-outline))"
        stroke-opacity="0.2"
        :stroke-width="STROKE"
      />
      <circle
        class="counter-ring__progress"
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        :stroke="progressStroke"
        :stroke-opacity="strokeOpacity"
        :stroke-width="STROKE"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        stroke-dashoffset="0"
        :transform="`rotate(-90 ${CENTER} ${CENTER})`"
      />
      <text
        :x="CENTER"
        :y="CENTER - 2"
        text-anchor="middle"
        :font-size="bigFontSize"
        font-weight="600"
        fill="rgb(var(--color-on-surface))"
      >
        {{ formattedCurrent }}
      </text>
      <text
        :x="CENTER"
        :y="CENTER + 14"
        text-anchor="middle"
        font-size="11"
        fill="rgb(var(--color-on-surface-variant))"
      >
        / {{ formattedTarget }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodayCounterRingData } from '@/services/todayChartData'

const props = defineProps<{
  data: TodayCounterRingData
}>()

const SIZE = 80
const CENTER = SIZE / 2
const RADIUS = 32
const STROKE = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const safeTarget = computed(() => Math.max(props.data.target, 1))
const safeCurrent = computed(() => Math.max(0, props.data.current))

const fillRatio = computed(() => Math.min(1, safeCurrent.value / safeTarget.value))
const dashArray = computed(() => `${CIRCUMFERENCE * fillRatio.value} ${CIRCUMFERENCE}`)

const isOverflow = computed(() => {
  const { operator, current, target } = props.data
  return (operator === 'max' || operator === 'lte') && current > target
})

const progressStroke = computed(() => {
  if (isOverflow.value || props.data.status === 'missed') {
    return 'rgb(var(--color-error))'
  }
  return 'rgb(var(--neo-chart-primary-end))'
})

// Dim the arc on in-progress to emphasize that work is still ongoing.
const strokeOpacity = computed(() =>
  props.data.status === 'in-progress' ? 0.6 : 1,
)

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

const formattedCurrent = computed(() => formatNumber(props.data.current))
const formattedTarget = computed(() => formatNumber(props.data.target))

// Scale down the big number when either side has 4+ digits so text fits
// inside the 80px ring. Polish work in Story 7 can revisit.
const bigFontSize = computed(() => {
  const longest = Math.max(formattedCurrent.value.length, formattedTarget.value.length)
  if (longest >= 5) return 14
  if (longest >= 4) return 16
  return 20
})

const progressAriaLabel = computed(
  () => `${formattedCurrent.value} of ${formattedTarget.value}`,
)
</script>
