<template>
  <svg :viewBox="`0 0 ${VW} ${VH}`" width="100%" aria-hidden="true">
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
      />
      <!-- Day label -->
      <text
        :x="barX(i) + barW / 2"
        :y="VH - 1"
        text-anchor="middle"
        font-size="11"
        fill="rgb(var(--color-on-surface-variant))"
        fill-opacity="0.6"
      >
        {{ slot.label }}
      </text>
    </g>
  </svg>
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

const VW = 400
const VH = 52
const PT = 4
const PB = 14
const PX = 4
const CH = VH - PT - PB // 34
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
