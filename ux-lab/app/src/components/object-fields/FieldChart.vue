<template>
  <!-- Replica of the product's SparklineBar / SparklineRatingGauge (same
       viewBox, padding, fills and dashed target step) so the only variable on
       the scene is the surface the chart sits on. -->
  <svg :viewBox="`0 0 ${W} ${H}`" width="100%" aria-hidden="true" class="field-chart">
    <template v-if="kind === 'bars'">
      <path
        v-if="targetPath"
        :d="targetPath"
        fill="none"
        stroke="rgb(var(--color-primary))"
        stroke-opacity="0.8"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="6 6"
      />
      <g v-for="(point, i) in points" :key="i">
        <rect
          v-if="point.status === 'no-data'"
          :x="barX(i)"
          :y="PAD_TOP + CH - 1"
          :width="barW"
          height="1"
          rx="0.5"
          fill="rgb(var(--neo-border))"
          fill-opacity="0.35"
        />
        <path v-else :d="barPath(i, point)" :fill="fill(point.status)" />
      </g>
    </template>

    <template v-else>
      <g v-for="(point, i) in points" :key="i">
        <rect :x="colX(i)" :y="PAD_TOP" :width="colW" :height="CH" rx="4" fill="rgb(var(--sky-100) / 0.58)" />
        <rect
          v-if="point.status !== 'no-data'"
          :x="colX(i)"
          :y="PAD_TOP + CH - gaugeH(point)"
          :width="colW"
          :height="gaugeH(point)"
          rx="4"
          :fill="fill(point.status)"
        />
      </g>
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface FieldChartPoint {
  actual?: number
  target?: number
  status: 'met' | 'missed' | 'no-data' | 'no-target'
}

const props = withDefaults(
  defineProps<{
    points: FieldChartPoint[]
    kind?: 'bars' | 'gauge'
    /** Gauge scale maximum (rating trackers). */
    scaleMax?: number
  }>(),
  { kind: 'bars', scaleMax: 10 },
)

const W = 400
const H = 96
const PAD_X = 24
const PAD_TOP = 4
const CH = 76

const maxValue = computed(() => Math.max(1, ...props.points.flatMap((p) => [p.actual ?? 0, p.target ?? 0])))
const gap = 4
const slotW = computed(() => {
  const n = props.points.length || 1
  return (W - 2 * PAD_X - (n - 1) * gap) / n
})
const barW = computed(() => Math.max(6, Math.floor(slotW.value * 0.6)))
const colW = computed(() => Math.max(6, Math.floor(slotW.value * 0.5)))

function barX(i: number): number {
  return PAD_X + i * (slotW.value + gap) + (slotW.value - barW.value) / 2
}
function colX(i: number): number {
  return PAD_X + i * (slotW.value + gap) + (slotW.value - colW.value) / 2
}
function slotStart(i: number): number {
  return PAD_X + i * (slotW.value + gap) - gap / 2
}
function valueY(value: number): number {
  return PAD_TOP + CH - Math.max(2, (value / maxValue.value) * CH)
}
function barPath(i: number, point: FieldChartPoint): string {
  const x = barX(i)
  const w = barW.value
  const y = valueY(point.actual ?? 0)
  const h = PAD_TOP + CH - y
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}
function gaugeH(point: FieldChartPoint): number {
  return Math.max(2, ((point.actual ?? 0) / props.scaleMax) * CH)
}
function fill(status: FieldChartPoint['status']): string {
  if (status === 'met') return 'rgb(var(--sky-200) / 0.72)'
  if (status === 'missed') return 'rgb(var(--rose-200) / 0.72)'
  if (status === 'no-target') return 'rgb(var(--sky-300) / 0.72)'
  return 'rgb(var(--color-outline))'
}

/** Step line over each period's span; periods without a target break it. */
const targetPath = computed(() => {
  if (!props.points.some((p) => p.target !== undefined && p.status !== 'no-data')) return ''
  const n = props.points.length
  let d = ''
  let prevY: number | null = null
  props.points.forEach((point, i) => {
    if (point.target === undefined) {
      prevY = null
      return
    }
    const x1 = i === 0 ? PAD_X : slotStart(i)
    const x2 = i === n - 1 ? W - PAD_X : slotStart(i + 1)
    const y = valueY(point.target)
    d += prevY === null ? `M${x1},${y}` : prevY !== y ? `V${y}` : ''
    d += `H${x2}`
    prevY = y
  })
  return d
})
</script>

<style scoped>
.field-chart { display: block; }
</style>
