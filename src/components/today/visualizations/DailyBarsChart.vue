<template>
  <div class="flex w-full flex-col gap-1">
    <svg
      :viewBox="`0 0 ${VW} ${VH}`"
      width="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientIds.met" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-start))" />
          <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" />
        </linearGradient>
        <linearGradient :id="gradientIds.missed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--color-error))" stop-opacity="0.45" />
          <stop offset="100%" stop-color="rgb(var(--color-error))" stop-opacity="0.40" />
        </linearGradient>
      </defs>

      <g v-for="(slot, i) in slots" :key="slot.dayRef || i">
        <!-- No data: baseline dash -->
        <rect
          v-if="!slot.hasEntry"
          :x="barX(i)"
          :y="PT + CH - 2"
          :width="barW"
          :height="2"
          rx="1"
          fill="rgb(var(--color-outline))"
          fill-opacity="0.25"
        />
        <!-- Data bar -->
        <rect
          v-else
          :x="barX(i)"
          :y="barY(slot)"
          :width="barW"
          :height="barHeight(slot)"
          rx="3"
          :fill="barGradient"
          :opacity="slot.isFuture ? 0.4 : 1"
        />
        <!-- Today highlight -->
        <rect
          v-if="slot.isToday && slot.hasEntry"
          :x="barX(i) - 1"
          :y="barY(slot) - 1"
          :width="barW + 2"
          :height="barHeight(slot) + 2"
          rx="4"
          fill="none"
          :stroke="periodStatus === 'missed' ? 'rgb(var(--color-error))' : 'rgb(var(--neo-chart-primary-end))'"
          stroke-width="1"
          stroke-opacity="0.4"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </svg>
    <div class="day-labels">
      <span
        v-for="(slot, i) in slots"
        :key="slot.dayRef || i"
        class="day-label"
      >
        {{ slot.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodayDaySlot } from '@/services/todayChartData'
import { useGradientIds } from '@/components/objects/sparklines/sparklineUtils'

const props = defineProps<{
  slots: TodayDaySlot[]
  maxValue?: number
  periodStatus?: 'met' | 'missed' | 'in-progress'
}>()

const gradientIds = useGradientIds('dbars')

const barGradient = computed(() =>
  props.periodStatus === 'missed'
    ? `url(#${gradientIds.missed})`
    : `url(#${gradientIds.met})`,
)

// SVG hosts the bars only; labels live in an HTML row below so their size
// matches CompletionDots / RatingSegmentedBars labels exactly.
const VW = 400
const VH = 140
const PT = 4
const PB = 4
const PX = 4
const CH = VH - PT - PB
const GAP = 4

const max = computed(() => {
  if (props.maxValue !== undefined) return props.maxValue
  const values = props.slots.map(s => s.value ?? 0)
  return Math.max(...values, 1)
})

const slotW = computed(() => {
  const n = props.slots.length
  if (n === 0) return 20
  return (VW - 2 * PX - (n - 1) * GAP) / n
})

const barW = computed(() => Math.max(6, Math.floor(slotW.value * 0.6)))

function barX(i: number): number {
  const offset = (slotW.value - barW.value) / 2
  return PX + i * (slotW.value + GAP) + offset
}

function barHeight(slot: TodayDaySlot): number {
  const value = slot.value ?? 0
  if (value === 0) return 2
  return Math.max(2, (value / max.value) * CH)
}

function barY(slot: TodayDaySlot): number {
  return PT + CH - barHeight(slot)
}
</script>

<style scoped>
/* Padding (1%) and gap (1%) mirror the SVG's PX=4 and GAP=4 against VW=400,
   so each label centers under its bar regardless of container width. */
.day-labels {
  display: flex;
  width: 100%;
  padding: 0 1%;
  gap: 1%;
}

.day-label {
  flex: 1 1 0;
  text-align: center;
  font-size: 11px;
  line-height: 1;
  color: rgb(var(--neo-muted) / 0.7);
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>
