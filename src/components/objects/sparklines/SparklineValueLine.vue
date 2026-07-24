<template>
  <svg :viewBox="`0 0 ${VIEWBOX_W} ${vH}`" width="100%" overflow="visible" aria-hidden="true">
    <!-- Target reference line -->
    <line
      v-if="showTargetLine"
      :x1="PADDING_X"
      :y1="tLineY"
      :x2="VIEWBOX_W - PADDING_X"
      :y2="tLineY"
      stroke="rgb(var(--color-primary))"
      stroke-opacity="0.8"
      stroke-width="1"
      stroke-linecap="round"
      stroke-dasharray="6 6"
    />

    <!-- Soft echo stroke under the line (one piece per contiguous data
         segment; isFuture pieces render at reduced opacity so the tail past
         the current period stays visible but visibly secondary). -->
    <path
      v-for="(piece, si) in dataPieces"
      :key="'echo-' + si"
      :d="piece.linePath"
      fill="none"
      stroke="rgb(var(--sky-200) / 0.72)"
      stroke-width="6"
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-opacity="piece.isFuture ? 0.4 : 1"
    />

    <!-- Line stroke. A run that crosses the current/future boundary is split
         into two pieces sharing the boundary point so the stroke remains
         continuous while past+today reads solid and the future tail fades. -->
    <path
      v-for="(piece, si) in dataPieces"
      :key="'line-' + si"
      :d="piece.linePath"
      fill="none"
      stroke="rgb(var(--sky-600))"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-opacity="piece.isFuture ? 0.4 : 1"
    />

    <!-- Endpoint dot on the last measured value -->
    <circle
      v-if="endpoint"
      :cx="endpoint.x"
      :cy="endpoint.y"
      r="4"
      fill="rgb(var(--sky-600))"
    />

    <!-- Period labels -->
    <text
      v-for="(point, i) in visiblePoints"
      :key="'label-' + point.periodRef"
      v-show="!hideLabels && shouldShowLabel(i, visiblePoints.length, cadence)"
      class="sparkline-label"
      :x="pointX(i)"
      :y="vH - 2"
      text-anchor="middle"
      font-size="9"
      font-weight="700"
      fill="rgb(var(--neo-muted))"
    >
      {{ periodLabel(point.periodRef, cadence, locale) }}
    </text>
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
} from './sparklineUtils'

const props = withDefaults(
  defineProps<{
    points: ObjectsLibraryChartPoint[]
    cadence: 'weekly' | 'monthly' | 'daily'
    compact?: boolean
    /** Suppress the in-SVG period labels. The Today overview tiles render
     *  their own HTML labels so all chart types share one label style. */
    hideLabels?: boolean
  }>(),
  { compact: false, hideLabels: false },
)

const { locale } = useT()

const vH = computed(() => (props.compact ? COMPACT_VIEWBOX_H : VIEWBOX_H))
const cH = computed(() => (props.compact ? COMPACT_CHART_HEIGHT : CHART_HEIGHT))

const visiblePoints = computed(() => getVisiblePoints(props.points, props.cadence))
const maxValue = computed(() => computeMaxValue(visiblePoints.value))

const hasTarget = computed(() => visiblePoints.value.some((p) => p.targetValue !== undefined))
const hasAnyData = computed(() => visiblePoints.value.some((p) => p.status !== 'no-data'))
const showTargetLine = computed(() => hasTarget.value && hasAnyData.value)
const tLineY = computed(() => targetLineY(visiblePoints.value, maxValue.value))

// --- Point coordinates ---
function pointX(i: number): number {
  const n = visiblePoints.value.length
  if (n <= 1) return VIEWBOX_W / 2
  const usable = VIEWBOX_W - 2 * PADDING_X
  return PADDING_X + (i / (n - 1)) * usable
}

function pointY(point: ObjectsLibraryChartPoint): number {
  const value = point.actualValue ?? 0
  const h = maxValue.value > 0 ? (value / maxValue.value) * cH.value : 0
  return PADDING_TOP + cH.value - Math.max(h, 1)
}

/** Last non-future point that carries data — the "you are here" endpoint. */
const endpoint = computed(() => {
  for (let i = visiblePoints.value.length - 1; i >= 0; i--) {
    const point = visiblePoints.value[i]
    if (point.status !== 'no-data' && point.isCurrent !== false) {
      return { x: pointX(i), y: pointY(point) }
    }
  }
  return null
})

// --- Build contiguous segments (break at no-data) ---
interface DataRun {
  startIndex: number
  points: ObjectsLibraryChartPoint[]
}

const dataRuns = computed<DataRun[]>(() => {
  const runs: DataRun[] = []
  let current: DataRun | null = null
  visiblePoints.value.forEach((p, i) => {
    if (p.status !== 'no-data') {
      if (!current) {
        current = { startIndex: i, points: [] }
      }
      current.points.push(p)
    } else {
      if (current) {
        runs.push(current)
        current = null
      }
    }
  })
  if (current) runs.push(current)
  return runs
})

/** Monotone cubic interpolation control points. */
function monotonePath(xs: number[], ys: number[]): string {
  const n = xs.length
  if (n === 0) return ''
  if (n === 1) return `M${xs[0]},${ys[0]}`
  if (n === 2) return `M${xs[0]},${ys[0]}L${xs[1]},${ys[1]}`

  // Compute tangents (Fritsch–Carlson)
  const d: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  }
  m.push(d[0])
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) {
      m.push(0)
    } else {
      m.push((d[i - 1] + d[i]) / 2)
    }
  }
  m.push(d[n - 2])

  let path = `M${xs[0]},${ys[0]}`
  for (let i = 0; i < n - 1; i++) {
    const dx = (xs[i + 1] - xs[i]) / 3
    path += `C${xs[i] + dx},${ys[i] + m[i] * dx},${xs[i + 1] - dx},${ys[i + 1] - m[i + 1] * dx},${xs[i + 1]},${ys[i + 1]}`
  }
  return path
}

interface DataPiece {
  linePath: string
  isFuture: boolean
}

function isPointFuture(point: ObjectsLibraryChartPoint): boolean {
  return point.isCurrent === false
}

function buildPiece(
  points: ObjectsLibraryChartPoint[],
  startIndex: number,
  isFuture: boolean,
): DataPiece {
  const xs = points.map((_, j) => pointX(startIndex + j))
  const ys = points.map((p) => pointY(p))
  return { linePath: monotonePath(xs, ys), isFuture }
}

/**
 * Each `DataRun` is one stretch of contiguous data. Within a run, points may
 * still cross the current/future boundary (e.g. today's entry sits between
 * past and pre-filled future entries). We split each run there so the stroke
 * fades on the future side. The boundary point appears in both pieces so the
 * line stays continuous across the transition.
 */
const dataPieces = computed<DataPiece[]>(() => {
  const pieces: DataPiece[] = []

  for (const run of dataRuns.value) {
    if (run.points.length === 0) continue

    // Find the last index inside this run whose point is NOT future.
    let lastCurrent = -1
    for (let i = run.points.length - 1; i >= 0; i--) {
      if (!isPointFuture(run.points[i])) {
        lastCurrent = i
        break
      }
    }

    if (lastCurrent === -1) {
      // Entire run is future.
      pieces.push(buildPiece(run.points, run.startIndex, true))
      continue
    }

    if (lastCurrent === run.points.length - 1) {
      // Entire run is current (no future tail).
      pieces.push(buildPiece(run.points, run.startIndex, false))
      continue
    }

    // Mixed: solid 0..lastCurrent (inclusive), faded lastCurrent..end (shared
    // boundary keeps the visual stroke continuous).
    const solidPoints = run.points.slice(0, lastCurrent + 1)
    const fadedPoints = run.points.slice(lastCurrent)
    pieces.push(buildPiece(solidPoints, run.startIndex, false))
    pieces.push(buildPiece(fadedPoints, run.startIndex + lastCurrent, true))
  }

  return pieces
})
</script>

<style scoped>
.sparkline-label {
  opacity: 0;
  transition: opacity 160ms ease;
}

svg:hover .sparkline-label {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .sparkline-label {
    transition: none;
  }
}
</style>
