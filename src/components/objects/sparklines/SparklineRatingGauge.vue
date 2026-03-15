<template>
  <svg :viewBox="`0 0 ${VIEWBOX_W} ${vH}`" width="100%" aria-hidden="true">
    <defs>
      <linearGradient :id="gradientIds.met" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(var(${colors.start}))`" />
        <stop offset="100%" :stop-color="`rgb(var(${colors.end}))`" />
      </linearGradient>
      <linearGradient :id="gradientIds.missed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(var(--color-error))`" stop-opacity="0.45" />
        <stop offset="100%" :stop-color="`rgb(var(--color-error))`" stop-opacity="0.40" />
      </linearGradient>
      <linearGradient :id="gradientIds.neutral" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(var(${colors.end}))`" stop-opacity="0.65" />
        <stop offset="100%" :stop-color="`rgb(var(${colors.end}))`" stop-opacity="0.60" />
      </linearGradient>
    </defs>

    <g v-for="(point, i) in visiblePoints" :key="point.periodRef">
      <!-- Background track (full scale) -->
      <rect
        :x="colX(i)"
        :y="PADDING_TOP"
        :width="colW"
        :height="cH"
        rx="3"
        fill="rgb(var(--color-outline))"
        fill-opacity="0.08"
      />

      <!-- Filled portion -->
      <rect
        v-if="point.status !== 'no-data'"
        :x="colX(i)"
        :y="fillY(point)"
        :width="colW"
        :height="fillHeight(point)"
        rx="3"
        :fill="gaugeFill(point.status)"
        :opacity="point.isCurrent === false ? 0.7 : 1"
      />

      <!-- No-data: subtle baseline dash -->
      <rect
        v-if="point.status === 'no-data'"
        :x="colX(i)"
        :y="PADDING_TOP + cH - 1"
        :width="colW"
        :height="1"
        rx="0.5"
        fill="rgb(var(--color-outline))"
        fill-opacity="0.20"
      />

      <!-- Target tick within column -->
      <line
        v-if="point.targetValue !== undefined"
        :x1="colX(i)"
        :y1="targetTickY(point.targetValue)"
        :x2="colX(i) + colW"
        :y2="targetTickY(point.targetValue)"
        stroke="rgb(var(--color-on-surface-variant))"
        stroke-opacity="0.35"
        stroke-width="1"
        stroke-dasharray="2 1"
      />

      <!-- Period label -->
      <text
        v-if="shouldShowLabel(i, visiblePoints.length, cadence)"
        :x="colX(i) + colW / 2"
        :y="vH - 2"
        text-anchor="middle"
        font-size="9"
        fill="rgb(var(--color-on-surface-variant))"
        fill-opacity="0.6"
      >
        {{ periodLabel(point.periodRef, cadence, locale) }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import {
  VIEWBOX_W,
  VIEWBOX_H,
  PADDING_X,
  PADDING_TOP,
  CHART_HEIGHT,
  COMPACT_VIEWBOX_H,
  COMPACT_CHART_HEIGHT,
  getVisiblePoints,
  shouldShowLabel,
  periodLabel,
  useGradientIds,
  chartColorVars,
  type ChartColorTheme,
} from './sparklineUtils'

const props = withDefaults(
  defineProps<{
    points: ObjectsLibraryChartPoint[]
    cadence: 'weekly' | 'monthly' | 'daily'
    compact?: boolean
    colorTheme?: ChartColorTheme
  }>(),
  { compact: false, colorTheme: 'keyResult' },
)

const colors = computed(() => chartColorVars(props.colorTheme))

const { locale } = useT()
const gradientIds = useGradientIds('gauge')

const vH = computed(() => (props.compact ? COMPACT_VIEWBOX_H : VIEWBOX_H))
const cH = computed(() => (props.compact ? COMPACT_CHART_HEIGHT : CHART_HEIGHT))

const visiblePoints = computed(() => getVisiblePoints(props.points, props.cadence))

// Scale max: round up to nearest 5, at least 10
const scaleMax = computed(() => {
  const allValues = visiblePoints.value.flatMap((p) => [p.actualValue ?? 0, p.targetValue ?? 0])
  const raw = Math.max(10, ...allValues)
  return Math.ceil(raw / 5) * 5
})

// Column sizing (60% of slot width)
const colGap = computed(() => (props.cadence === 'monthly' ? 8 : 4))

const slotW = computed(() => {
  const n = visiblePoints.value.length
  if (n === 0) return 20
  return (VIEWBOX_W - 2 * PADDING_X - (n - 1) * colGap.value) / n
})

const colW = computed(() => Math.max(6, Math.floor(slotW.value * 0.6)))

function colX(i: number): number {
  const offset = (slotW.value - colW.value) / 2
  return PADDING_X + i * (slotW.value + colGap.value) + offset
}

function fillHeight(point: ObjectsLibraryChartPoint): number {
  const value = point.actualValue ?? 0
  return Math.max(2, (value / scaleMax.value) * cH.value)
}

function fillY(point: ObjectsLibraryChartPoint): number {
  return PADDING_TOP + cH.value - fillHeight(point)
}

function targetTickY(targetValue: number): number {
  const h = (targetValue / scaleMax.value) * cH.value
  return PADDING_TOP + cH.value - h
}

function gaugeFill(status: ObjectsLibraryChartPoint['status']): string {
  switch (status) {
    case 'met':
      return `url(#${gradientIds.met})`
    case 'missed':
      return `url(#${gradientIds.missed})`
    case 'no-target':
      return `url(#${gradientIds.neutral})`
    default:
      return 'rgb(var(--color-outline))'
  }
}
</script>
