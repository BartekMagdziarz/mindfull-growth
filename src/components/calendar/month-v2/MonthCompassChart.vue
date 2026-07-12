<template>
  <figure v-if="compass && compass.axes.length > 0" class="month-compass">
    <svg viewBox="0 0 260 230" role="img" :aria-label="ariaDescription" class="month-compass__svg">
      <defs>
        <linearGradient :id="fillId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-start))" stop-opacity="0.42" />
          <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" stop-opacity="0.14" />
        </linearGradient>
      </defs>

      <!-- Concentric rings 1–5 -->
      <polygon
        v-for="ring in RINGS"
        :key="ring"
        :points="ringPoints(ring / 5)"
        fill="none"
        stroke="rgb(var(--neo-border))"
        :stroke-opacity="ring === 5 ? 0.48 : 0.24"
      />

      <!-- Spokes -->
      <line
        v-for="(axis, i) in compass.axes"
        :key="`spoke-${axis.key}`"
        :x1="CENTER.x"
        :y1="CENTER.y"
        :x2="axisPoint(i, 1).x"
        :y2="axisPoint(i, 1).y"
        stroke="rgb(var(--neo-border))"
        stroke-opacity="0.34"
      />

      <!-- Value polygon only when every axis is rated (no misleading shapes) -->
      <polygon
        v-if="hasCompleteValues"
        :points="valuePoints"
        :fill="`url(#${fillId})`"
        stroke="rgb(var(--neo-chart-primary-end))"
        stroke-width="2"
        stroke-linejoin="round"
      />

      <!-- Dots for every rated axis (also with partial data) -->
      <circle
        v-for="dot in valueDots"
        :key="`dot-${dot.key}`"
        :cx="dot.x"
        :cy="dot.y"
        r="3.5"
        fill="rgb(var(--neo-chart-primary-end))"
        stroke="rgb(var(--neo-surface-top))"
        stroke-width="2"
      />

      <!-- Axis labels -->
      <text
        v-for="(axis, i) in compass.axes"
        :key="`label-${axis.key}`"
        :x="axisPoint(i, 1.28).x"
        :y="axisPoint(i, 1.28).y"
        :text-anchor="labelAnchor(i)"
        dominant-baseline="middle"
        font-size="9"
        font-weight="600"
        fill="rgb(var(--neo-muted))"
      >
        {{ axisLabel(axis.key) }}
      </text>
    </svg>
    <figcaption class="sr-only">{{ ariaDescription }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { MonthV2CompassAxis } from '@/services/monthV2Overview'
import type { MonthlyRatingKey } from '@/domain/reflection'
import { useT } from '@/composables/useT'

const props = defineProps<{
  compass: { axes: MonthV2CompassAxis[] } | null
}>()

const { t } = useT()
const fillId = `mv2-compass-${useId().replace(/:/g, '')}`

const CENTER = { x: 130, y: 105 }
const RADIUS = 66
const RINGS = [1, 2, 3, 4, 5]

const compass = computed(() => props.compass)

const axisCount = computed(() => Math.max(1, compass.value?.axes.length ?? 0))

function axisPoint(index: number, ratio: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axisCount.value
  return {
    x: CENTER.x + Math.cos(angle) * RADIUS * ratio,
    y: CENTER.y + Math.sin(angle) * RADIUS * ratio,
  }
}

function ringPoints(ratio: number): string {
  return (compass.value?.axes ?? [])
    .map((_, i) => {
      const point = axisPoint(i, ratio)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

function normalizedValue(axis: MonthV2CompassAxis): number {
  if (axis.value === null || !Number.isFinite(axis.value) || axis.max <= 0) return 0
  return Math.max(0, Math.min(1, axis.value / axis.max))
}

const hasCompleteValues = computed(
  () => (compass.value?.axes ?? []).every((axis) => axis.value !== null)
)

const valuePoints = computed(() =>
  (compass.value?.axes ?? [])
    .map((axis, i) => {
      const point = axisPoint(i, normalizedValue(axis))
      return `${point.x},${point.y}`
    })
    .join(' ')
)

const valueDots = computed(() =>
  (compass.value?.axes ?? []).flatMap((axis, i) => {
    if (axis.value === null) return []
    const point = axisPoint(i, normalizedValue(axis))
    return [{ key: axis.key, x: point.x, y: point.y }]
  })
)

function labelAnchor(index: number): 'start' | 'middle' | 'end' {
  const x = axisPoint(index, 1.28).x
  if (Math.abs(x - CENTER.x) < 12) return 'middle'
  return x < CENTER.x ? 'end' : 'start'
}

function axisLabel(key: MonthlyRatingKey): string {
  const dimension = key.replace(/Rating$/, '')
  return t(`planning.reflection.monthly.dimensions.${dimension}`)
}

const ariaDescription = computed(() =>
  (compass.value?.axes ?? [])
    .map((axis) => `${axisLabel(axis.key)} ${axis.value ?? '—'} / ${axis.max}`)
    .join(', ')
)
</script>

<style scoped>
.month-compass {
  margin: 0;
}

.month-compass__svg {
  display: block;
  width: 100%;
}
</style>
