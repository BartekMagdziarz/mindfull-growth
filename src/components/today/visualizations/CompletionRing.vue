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
        class="completion-ring__progress"
        :cx="CENTER"
        :cy="CENTER"
        :r="RADIUS"
        fill="none"
        :stroke="progressStroke"
        :stroke-width="STROKE"
        stroke-linecap="round"
        :stroke-dasharray="dashArray"
        stroke-dashoffset="0"
        :transform="`rotate(-90 ${CENTER} ${CENTER})`"
      />
      <text
        :x="CENTER"
        :y="CENTER - 4"
        text-anchor="middle"
        font-size="24"
        font-weight="600"
        fill="rgb(var(--color-on-surface))"
      >
        {{ safeDoneCount }}
      </text>
      <text
        :x="CENTER"
        :y="CENTER + 14"
        text-anchor="middle"
        font-size="13"
        fill="rgb(var(--color-on-surface-variant))"
      >
        / {{ safeTargetCount }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  doneCount: number
  targetCount: number
}

const props = defineProps<Props>()

const SIZE = 110
const CENTER = SIZE / 2
const RADIUS = 44
const STROKE = 9
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const safeDoneCount = computed(() => Math.max(0, props.doneCount))
const safeTargetCount = computed(() => Math.max(1, props.targetCount))

const fillRatio = computed(() =>
  Math.min(1, safeDoneCount.value / Math.max(safeTargetCount.value, 1)),
)

const dashArray = computed(() => `${CIRCUMFERENCE * fillRatio.value} ${CIRCUMFERENCE}`)

const progressStroke = computed(() => 'rgb(var(--neo-chart-primary-end))')

const progressAriaLabel = computed(
  () => `${safeDoneCount.value} of ${safeTargetCount.value} completed`,
)
</script>
