<template>
  <figure class="month-dimension">
    <svg
      class="month-dimension__svg"
      viewBox="0 0 620 220"
      role="img"
      :aria-label="hasValues ? ariaDescription : emptyAriaDescription"
    >
      <defs>
        <linearGradient :id="capsuleGradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-start))" stop-opacity="0.58" />
          <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" stop-opacity="0.9" />
        </linearGradient>
        <linearGradient :id="markerGradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-start))" />
          <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" />
        </linearGradient>
      </defs>

      <line
        class="month-dimension__baseline"
        :x1="PLOT_LEFT"
        :x2="VIEW_WIDTH - PLOT_LEFT"
        :y1="BASELINE"
        :y2="BASELINE"
      />

      <path
        v-for="(piece, index) in linePieces"
        :key="`line-${index}`"
        class="month-dimension__line"
        :d="piece"
      />

      <g
        v-for="(axis, index) in displayAxes"
        :key="axis.key"
        class="month-dimension__axis"
        :data-axis-key="axis.key"
      >
        <rect
          class="month-dimension__track"
          :x="capsuleX(index)"
          :y="PLOT_TOP"
          :width="CAPSULE_WIDTH"
          :height="BASELINE - PLOT_TOP"
          :rx="CAPSULE_WIDTH / 2"
        />

        <rect
          v-if="axis.normalized !== null"
          class="month-dimension__capsule"
          :x="capsuleX(index)"
          :y="valueY(axis.normalized)"
          :width="CAPSULE_WIDTH"
          :height="BASELINE - valueY(axis.normalized)"
          :rx="CAPSULE_WIDTH / 2"
          :fill="`url(#${capsuleGradientId})`"
        />

        <circle
          v-if="axis.normalized !== null"
          class="month-dimension__value-circle"
          :cx="axisCenterX(index)"
          :cy="valueY(axis.normalized)"
          r="17"
          :fill="`url(#${markerGradientId})`"
        />
        <text
          v-if="axis.normalized !== null"
          class="month-dimension__value"
          :x="axisCenterX(index)"
          :y="valueY(axis.normalized)"
          text-anchor="middle"
          dominant-baseline="central"
        >
          {{ formatValue(axis.value) }}
        </text>

        <circle
          v-else
          class="month-dimension__value-circle month-dimension__value-circle--empty"
          :cx="axisCenterX(index)"
          :cy="BASELINE"
          r="14"
        />
        <text
          v-if="axis.normalized === null"
          class="month-dimension__value month-dimension__value--empty"
          :x="axisCenterX(index)"
          :y="BASELINE"
          text-anchor="middle"
          dominant-baseline="central"
        >
          —
        </text>

        <text class="month-dimension__label" :x="axisCenterX(index)" y="201" text-anchor="middle">
          {{ axisLabel(axis.key) }}
        </text>
      </g>
    </svg>

    <figcaption class="sr-only">
      {{ hasValues ? ariaDescription : emptyAriaDescription }}
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { MONTHLY_RATING_KEYS, type MonthlyRatingKey } from '@/domain/reflection'
import type { MonthV2CompassAxis } from '@/services/monthV2Overview'
import { useT } from '@/composables/useT'

const props = defineProps<{
  axes: MonthV2CompassAxis[] | null
  ariaLabel?: string
  emptyLabel?: string
}>()

const { t } = useT()
const capsuleGradientId = `month-dimension-capsule-${useId().replace(/:/g, '')}`
const markerGradientId = `month-dimension-marker-${useId().replace(/:/g, '')}`

const VIEW_WIDTH = 620
const PLOT_LEFT = 42
const PLOT_TOP = 42
const BASELINE = 166
const PLOT_HEIGHT = BASELINE - PLOT_TOP
const CAPSULE_WIDTH = 42
const SLOT_WIDTH = (VIEW_WIDTH - PLOT_LEFT * 2) / MONTHLY_RATING_KEYS.length

interface DisplayAxis extends MonthV2CompassAxis {
  normalized: number | null
}

function normalizedValue(axis: MonthV2CompassAxis): number | null {
  if (typeof axis.value !== 'number' || !Number.isFinite(axis.value) || axis.max <= 0) return null
  return Math.max(0, Math.min(1, axis.value / axis.max))
}

const displayAxes = computed<DisplayAxis[]>(() => {
  const byKey = new Map((props.axes ?? []).map(axis => [axis.key, axis]))
  return MONTHLY_RATING_KEYS.map(key => {
    const axis = byKey.get(key) ?? { key, value: null, max: 5 as const }
    return { ...axis, normalized: normalizedValue(axis) }
  })
})

const hasValues = computed(() => displayAxes.value.some(axis => axis.normalized !== null))

function axisCenterX(index: number): number {
  return PLOT_LEFT + SLOT_WIDTH * index + SLOT_WIDTH / 2
}

function capsuleX(index: number): number {
  return axisCenterX(index) - CAPSULE_WIDTH / 2
}

function valueY(normalized: number): number {
  return BASELINE - normalized * PLOT_HEIGHT
}

interface Point {
  x: number
  y: number
}

function smoothOpenPath(points: Point[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M${points[0]!.x},${points[0]!.y} L${points[1]!.x},${points[1]!.y}`
  }

  let path = `M${points[0]!.x},${points[0]!.y}`
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index]!
    const next = points[index + 1]!
    const midpoint = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 }
    path += ` Q${point.x},${point.y} ${midpoint.x},${midpoint.y}`
  }
  const penultimate = points[points.length - 2]!
  const last = points[points.length - 1]!
  return `${path} Q${penultimate.x},${penultimate.y} ${last.x},${last.y}`
}

const linePieces = computed(() => {
  const pieces: string[] = []
  let points: Point[] = []

  const flush = () => {
    if (points.length >= 2) pieces.push(smoothOpenPath(points))
    points = []
  }

  displayAxes.value.forEach((axis, index) => {
    if (axis.normalized === null) {
      flush()
      return
    }
    points.push({ x: axisCenterX(index), y: valueY(axis.normalized) })
  })
  flush()
  return pieces
})

function formatValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function axisLabel(key: MonthlyRatingKey): string {
  const dimension = key.replace(/Rating$/, '')
  return t(`planning.calendar.monthV2.dashboard.monthAxes.${dimension}`)
}

const valuesDescription = computed(() =>
  displayAxes.value
    .map(axis => `${axisLabel(axis.key)}: ${formatValue(axis.value)} / ${axis.max}`)
    .join(', ')
)

const ariaDescription = computed(() =>
  props.ariaLabel ? `${props.ariaLabel}. ${valuesDescription.value}` : valuesDescription.value
)

const resolvedEmptyLabel = computed(
  () => props.emptyLabel ?? t('planning.calendar.monthV2.dashboard.noData')
)

const emptyAriaDescription = computed(() =>
  props.ariaLabel ? `${props.ariaLabel}. ${resolvedEmptyLabel.value}` : resolvedEmptyLabel.value
)
</script>

<style scoped>
.month-dimension {
  margin: 0;
  min-width: 0;
}

.month-dimension__svg {
  display: block;
  height: auto;
  overflow: visible;
  width: 100%;
}

.month-dimension__baseline {
  stroke: rgb(var(--neo-border));
  stroke-opacity: 0.34;
  stroke-width: 1;
}

.month-dimension__track {
  fill: rgb(var(--neo-surface-base) / 0.58);
  filter: drop-shadow(-2px -2px 3px rgb(var(--neo-shadow-light) / 0.72))
    drop-shadow(2px 2px 3px rgb(var(--neo-shadow-dark) / 0.16));
}

.month-dimension__capsule {
  filter: drop-shadow(-1px -1px 2px rgb(var(--neo-shadow-light) / 0.7))
    drop-shadow(2px 2px 3px rgb(var(--neo-shadow-dark) / 0.2));
}

.month-dimension__line {
  fill: none;
  stroke: rgb(var(--neo-chart-primary-end));
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-opacity: 0.58;
  stroke-width: 2;
}

.month-dimension__value-circle {
  filter: drop-shadow(-1px -1px 2px rgb(var(--neo-shadow-light) / 0.78))
    drop-shadow(2px 2px 3px rgb(var(--neo-shadow-dark) / 0.22));
  stroke: rgb(var(--neo-surface-top));
  stroke-width: 2.5;
}

.month-dimension__value-circle--empty {
  fill: rgb(var(--neo-surface-base));
  stroke: rgb(var(--neo-border) / 0.65);
}

.month-dimension__value {
  fill: rgb(var(--neo-accent-text));
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
  pointer-events: none;
}

.month-dimension__value--empty {
  fill: rgb(var(--neo-muted));
}

.month-dimension__label {
  fill: rgb(var(--neo-muted));
  font-size: 10.5px;
  font-weight: 650;
}
</style>
