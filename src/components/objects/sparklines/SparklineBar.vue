<template>
  <svg :viewBox="`0 0 ${VIEWBOX_W} ${vH}`" width="100%" aria-hidden="true">
    <defs>
      <!-- Met: object-type blue vertical gradient -->
      <linearGradient :id="gradientIds.met" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(var(${colors.start}))`" />
        <stop offset="100%" :stop-color="`rgb(var(${colors.end}))`" />
      </linearGradient>
      <!-- Missed: soft muted rose -->
      <linearGradient :id="gradientIds.missed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(var(--color-error))`" stop-opacity="0.45" />
        <stop offset="100%" :stop-color="`rgb(var(--color-error))`" stop-opacity="0.40" />
      </linearGradient>
      <!-- No-target: softer variant -->
      <linearGradient :id="gradientIds.neutral" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="`rgb(var(${colors.end}))`" stop-opacity="0.65" />
        <stop offset="100%" :stop-color="`rgb(var(${colors.end}))`" stop-opacity="0.60" />
      </linearGradient>
    </defs>

    <!-- Target reference line -->
    <line
      v-if="showTargetLine"
      :x1="PADDING_X"
      :y1="tLineY"
      :x2="VIEWBOX_W - PADDING_X"
      :y2="tLineY"
      stroke="rgb(var(--color-on-surface-variant))"
      stroke-opacity="0.25"
      stroke-width="1"
      stroke-dasharray="3 2"
    />

    <!-- Bars + labels -->
    <g v-for="(point, i) in visiblePoints" :key="point.periodRef">
      <!-- No-data: subtle baseline dash -->
      <rect
        v-if="point.status === 'no-data'"
        :x="barX(i)"
        :y="PADDING_TOP + cH - 1"
        :width="barW"
        :height="1"
        rx="0.5"
        fill="rgb(var(--color-outline))"
        fill-opacity="0.20"
      />
      <!-- Actual data bar -->
      <rect
        v-else
        :x="barX(i)"
        :y="barY(point)"
        :width="barW"
        :height="barHeightPx(point)"
        rx="3.5"
        :fill="barFill(point.status)"
        :opacity="point.isCurrent === false ? 0.7 : 1"
      />
      <!-- Period label -->
      <text
        v-if="shouldShowLabel(i, visiblePoints.length, cadence)"
        :x="barX(i) + barW / 2"
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
  computeMaxValue,
  targetLineY,
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
const gradientIds = useGradientIds('bar')

const vH = computed(() => (props.compact ? COMPACT_VIEWBOX_H : VIEWBOX_H))
const cH = computed(() => (props.compact ? COMPACT_CHART_HEIGHT : CHART_HEIGHT))

const visiblePoints = computed(() => getVisiblePoints(props.points, props.cadence))

const maxValue = computed(() => computeMaxValue(visiblePoints.value))

const hasTarget = computed(() => visiblePoints.value.some((p) => p.targetValue !== undefined))
const hasAnyData = computed(() => visiblePoints.value.some((p) => p.status !== 'no-data'))
const showTargetLine = computed(() => hasTarget.value && hasAnyData.value)
const tLineY = computed(() => targetLineY(visiblePoints.value, maxValue.value))

// Bars use 60% of slot width for more breathing room
const barGap = computed(() => (props.cadence === 'monthly' ? 8 : 4))

const slotW = computed(() => {
  const n = visiblePoints.value.length
  if (n === 0) return 20
  return (VIEWBOX_W - 2 * PADDING_X - (n - 1) * barGap.value) / n
})

const barW = computed(() => Math.max(6, Math.floor(slotW.value * 0.6)))

function barX(i: number): number {
  const offset = (slotW.value - barW.value) / 2
  return PADDING_X + i * (slotW.value + barGap.value) + offset
}

function barHeightPx(point: ObjectsLibraryChartPoint): number {
  const value = point.actualValue
  if (value === undefined || value === 0) return 2
  return Math.max(2, (value / maxValue.value) * cH.value)
}

function barY(point: ObjectsLibraryChartPoint): number {
  return PADDING_TOP + cH.value - barHeightPx(point)
}

function barFill(status: ObjectsLibraryChartPoint['status']): string {
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
