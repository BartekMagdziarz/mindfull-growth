<template>
  <div class="flex w-full items-end gap-1.5">
    <div
      v-for="(slot, i) in visibleSlots"
      :key="slot.dayRef || i"
      class="flex min-w-0 flex-1 flex-col items-center gap-1"
    >
      <svg
        width="100%"
        :viewBox="`0 0 ${CELL_W} ${VB_H}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        <title>{{ ariaLabel(slot) }}</title>

        <!-- Empty baseline strip when no entry yet -->
        <rect
          v-if="slot.value === undefined"
          :x="BAR_X"
          :y="VB_H - PAD - 2"
          :width="BAR_W"
          :height="2"
          rx="1"
          fill="rgb(var(--color-outline) / 0.35)"
        />

        <!-- Recorded bar: height ∝ value, fill colour ∝ value vs target -->
        <rect
          v-else
          :x="BAR_X"
          :y="barY(slot)"
          :width="BAR_W"
          :height="barH(slot)"
          rx="2"
          :fill="barFill(slot)"
          :opacity="slot.isFuture ? 0.45 : 1"
        />

        <!-- Today highlight: hairline around the bar -->
        <rect
          v-if="slot.isToday && slot.value !== undefined"
          :x="BAR_X - 0.5"
          :y="barY(slot) - 0.5"
          :width="BAR_W + 1"
          :height="barH(slot) + 1"
          rx="2.5"
          fill="none"
          stroke="rgb(var(--sky-600))"
          stroke-width="0.75"
          stroke-opacity="0.55"
        />

        <!-- Target reference tick — only when target sits inside the scale -->
        <line
          v-if="showTargetTick"
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
      <span class="text-[11px] leading-none text-on-surface-variant/60">
        {{ slot.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodayDaySlot } from '@/services/todayChartData'
import { filterToScheduledSlots } from '@/services/todayChartData'
import { ratingBarColor } from '@/utils/ratingGradient'

interface Props {
  slots: TodayDaySlot[]
  scaleMin?: number
  scaleMax?: number
  targetValue?: number
  targetOperator?: 'gte' | 'lte'
}

const props = withDefaults(defineProps<Props>(), {
  scaleMin: 1,
  scaleMax: 10,
  targetValue: undefined,
  targetOperator: undefined,
})

// viewBox geometry. The bar lives inside CONTENT_H; PAD prevents the rounded
// top of a max-height bar from being clipped.
const CELL_W = 20
const CONTENT_H = 56
const PAD = 1.5
const VB_H = CONTENT_H + 2 * PAD
const BAR_X = 2
const BAR_W = 16

const visibleSlots = computed(() => filterToScheduledSlots(props.slots))

const showTargetTick = computed(
  () =>
    props.targetValue !== undefined &&
    props.targetValue >= props.scaleMin &&
    props.targetValue <= props.scaleMax,
)

const targetTickY = computed(() => {
  if (props.targetValue === undefined) return 0
  return valueToY(props.targetValue)
})

function valueToY(value: number): number {
  const span = props.scaleMax - props.scaleMin
  if (span <= 0) return PAD + CONTENT_H / 2
  const ratio = Math.max(0, Math.min(1, (value - props.scaleMin) / span))
  return PAD + CONTENT_H - ratio * CONTENT_H
}

function barY(slot: TodayDaySlot): number {
  if (slot.value === undefined) return PAD + CONTENT_H - 2
  return valueToY(slot.value)
}

function barH(slot: TodayDaySlot): number {
  if (slot.value === undefined) return 2
  const top = valueToY(slot.value)
  return Math.max(2, PAD + CONTENT_H - top)
}

function barFill(slot: TodayDaySlot): string {
  if (slot.value === undefined) return 'rgb(var(--color-outline) / 0.35)'
  return ratingBarColor({
    value: slot.value,
    scaleMin: props.scaleMin,
    scaleMax: props.scaleMax,
    targetValue: props.targetValue,
    targetOperator: props.targetOperator,
  })
}

function ariaLabel(slot: TodayDaySlot): string {
  const value = slot.value === undefined ? '—' : String(slot.value)
  return `${slot.label}: ${value} / ${props.scaleMin}–${props.scaleMax}`
}
</script>
