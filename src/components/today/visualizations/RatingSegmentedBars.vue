<template>
  <div class="flex w-full items-end gap-1.5">
    <!-- Shared gradient definition, hidden off-flow. SVG IDs are document-scoped
         so every cell SVG below can reference `gradientIds.met` by URL. -->
    <svg
      class="pointer-events-none absolute h-0 w-0 overflow-hidden"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient :id="gradientIds.met" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-start))" />
          <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" />
        </linearGradient>
      </defs>
    </svg>

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

        <!-- Segments, stacked bottom-to-top. seg=1 is the bottom segment.
             Only rendered when the slot has a value — empty days show no outlines. -->
        <template v-if="slot.value !== undefined">
          <rect
            v-for="seg in segmentCount"
            :key="seg"
            :x="SEG_X"
            :y="segmentY(seg)"
            :width="SEG_W"
            :height="segmentH"
            rx="1.5"
            :fill="segmentFill(slot, seg)"
            :stroke="segmentStroke(slot, seg)"
            :stroke-width="segmentStrokeWidth(slot, seg)"
            :stroke-dasharray="segmentStrokeDasharray(slot, seg)"
          />
        </template>

        <!-- Target reference tick. The same visual position serves both `gte`
             ("at least this level") and `lte` ("at most this level"); the
             AggregateBar below communicates met/missed status. -->
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
import { useGradientIds } from '@/components/objects/sparklines/sparklineUtils'

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

const gradientIds = useGradientIds('rseg')

// viewBox dimensions — the SVG scales to fill the flex-1 container.
// PAD prevents the rounded corners + stroke of the top/bottom segments
// from being clipped by the viewBox boundary.
const CELL_W = 20
const CONTENT_H = 56
const PAD = 1.5
const VB_H = CONTENT_H + 2 * PAD
const SEG_X = 2
const SEG_W = 16
const SEG_GAP = 1

const segmentCount = computed(() => props.scaleMax - props.scaleMin + 1)

const segmentH = computed(() =>
  (CONTENT_H - (segmentCount.value - 1) * SEG_GAP) / segmentCount.value,
)

const visibleSlots = computed(() => filterToScheduledSlots(props.slots))

const showTargetTick = computed(
  () =>
    props.targetValue !== undefined &&
    props.targetValue >= props.scaleMin &&
    props.targetValue <= props.scaleMax,
)

const targetTickY = computed(() => {
  if (props.targetValue === undefined) return 0
  const segFromBottom = props.targetValue - props.scaleMin + 1
  return segmentY(segFromBottom)
})

// seg runs 1..segmentCount with 1 at the bottom. Returns the top-edge y of the
// segment's rect, offset by PAD so rounded corners aren't clipped.
function segmentY(seg: number): number {
  return PAD + CONTENT_H - seg * segmentH.value - (seg - 1) * SEG_GAP
}

function isFilled(slot: TodayDaySlot, seg: number): boolean {
  if (slot.value === undefined) return false
  return seg <= slot.value - props.scaleMin + 1
}

function segmentFill(slot: TodayDaySlot, seg: number): string {
  return isFilled(slot, seg) ? `url(#${gradientIds.met})` : 'transparent'
}

function segmentStroke(slot: TodayDaySlot, seg: number): string {
  if (isFilled(slot, seg)) return 'none'
  if (slot.isToday) return 'rgb(var(--neo-chart-primary-end) / 0.5)'
  return 'rgb(var(--color-outline) / 0.45)'
}

function segmentStrokeWidth(slot: TodayDaySlot, seg: number): number {
  return isFilled(slot, seg) ? 0 : 1
}

function segmentStrokeDasharray(slot: TodayDaySlot, seg: number): string | undefined {
  if (isFilled(slot, seg)) return undefined
  return slot.isFuture ? '2 2' : undefined
}

function ariaLabel(slot: TodayDaySlot): string {
  const value = slot.value === undefined ? '—' : String(slot.value)
  return `${slot.label}: ${value} / ${props.scaleMin}–${props.scaleMax}`
}
</script>
