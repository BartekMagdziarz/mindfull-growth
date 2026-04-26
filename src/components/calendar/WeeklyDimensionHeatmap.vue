<template>
  <div class="neo-inset rounded-2xl px-4 py-4 md:px-5 md:py-5">
    <!-- Column headers -->
    <div class="grid items-end gap-4 pb-1.5" :style="headerGridStyle">
      <div />
      <div
        class="grid"
        :style="{ gridTemplateColumns: `repeat(${weekRefs.length}, 1fr)` }"
      >
        <div
          v-for="(label, idx) in weekLabels"
          :key="idx"
          class="text-center text-[10px] font-semibold tracking-[0.06em] text-on-surface-variant/70"
        >
          {{ label }}
        </div>
      </div>
      <div
        class="text-center text-[10px] font-bold uppercase tracking-[0.1em] text-on-surface-variant/70"
      >
        {{ t('planning.reflection.monthly.average') }}
      </div>
      <div class="w-[18px]" />
    </div>

    <!-- Dimension groups -->
    <div v-for="group in dimensionGroups" :key="group.key">
      <!-- Group label with trailing line -->
      <div class="flex items-center gap-2.5 pb-2 pt-3.5">
        <span
          class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-strong"
        >
          {{ group.label }}
        </span>
        <span
          class="h-px flex-1"
          :style="{
            background:
              'linear-gradient(90deg, rgb(var(--neo-border) / 0.55), transparent)',
          }"
        />
      </div>

      <!-- Dimension rows -->
      <div
        v-for="dim in group.dimensions"
        :key="dim.key"
        class="grid items-center gap-4 py-1"
        :style="rowGridStyle"
      >
        <!-- Dimension label -->
        <div
          class="truncate pr-1 text-[12.5px] font-medium text-on-surface"
          :title="dim.label"
        >
          {{ dim.label }}
        </div>

        <!-- Dot ladder visualization -->
        <div class="relative h-14 w-full">
          <svg
            :viewBox="`0 0 ${LADDER_W} ${LADDER_H}`"
            preserveAspectRatio="none"
            class="block h-full w-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                :id="`ladder-fill-${gradientId}-${group.key}-${dim.key}`"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-end))" stop-opacity="0.32" />
                <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" stop-opacity="0" />
              </linearGradient>
            </defs>
            <!-- Ladder rungs (1..5) -->
            <line
              v-for="rung in [1, 2, 3, 4, 5]"
              :key="rung"
              :x1="LADDER_PAD_X / 2"
              :x2="LADDER_W - LADDER_PAD_X / 2"
              :y1="rungY(rung)"
              :y2="rungY(rung)"
              stroke="rgb(var(--neo-border) / 0.4)"
              :stroke-dasharray="rung === 3 ? '0' : '4 8'"
              :stroke-width="rung === 3 ? 0.8 : 0.6"
              vector-effect="non-scaling-stroke"
            />
            <!-- Area fill under the line -->
            <path
              v-if="ladderPaths(dim.values).area"
              :d="ladderPaths(dim.values).area"
              :fill="`url(#ladder-fill-${gradientId}-${group.key}-${dim.key})`"
              stroke="none"
            />
            <!-- Trend line connecting points -->
            <path
              v-if="ladderPaths(dim.values).line"
              :d="ladderPaths(dim.values).line"
              fill="none"
              stroke="rgb(var(--neo-chart-primary-end))"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
              opacity="0.9"
            />
          </svg>
          <!-- HTML dot overlay (immune to non-uniform SVG scaling) -->
          <div
            v-for="(value, idx) in dim.values"
            :key="idx"
            v-show="value != null"
            class="ladder-dot"
            :style="dotStyle(idx, value)"
            :title="`${weekLabels[idx]}: ${value ?? '—'}`"
          />
        </div>

        <!-- Average -->
        <div
          class="text-center text-[13px] font-semibold tabular-nums"
          :class="
            dim.average == null
              ? 'text-on-surface-variant/50'
              : 'text-primary-strong'
          "
        >
          {{ dim.average == null ? '—' : dim.average.toFixed(1) }}
        </div>

        <!-- Trend arrow -->
        <div class="flex w-[18px] items-center justify-center">
          <span
            v-if="dim.trend === 'rising'"
            class="material-symbols-outlined trend-icon text-[14px] text-success"
            :title="t('planning.reflection.monthly.trend.rising')"
          >
            trending_up
          </span>
          <span
            v-else-if="dim.trend === 'falling'"
            class="material-symbols-outlined trend-icon text-[14px] text-error"
            :title="t('planning.reflection.monthly.trend.falling')"
          >
            trending_down
          </span>
          <span
            v-else-if="dim.trend === 'stable'"
            class="material-symbols-outlined trend-icon text-[14px] text-on-surface-variant/60"
            :title="t('planning.reflection.monthly.trend.stable')"
          >
            trending_flat
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { WeekRef } from '@/domain/period'
import type { WeeklyRatingTrendEntry } from '@/services/reflectionDataQueries'
import { getPeriodBounds } from '@/utils/periods'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  trends: WeeklyRatingTrendEntry[]
  weekRefs: WeekRef[]
}>()

type TrendDirection = 'rising' | 'falling' | 'stable'

interface DimensionRow {
  key: string
  label: string
  values: (number | null)[]
  average: number | null
  trend: TrendDirection | null
}

interface DimensionGroup {
  key: string
  label: string
  dimensions: DimensionRow[]
}

// Component-instance-unique id used to scope SVG gradient IDs so multiple
// instances on the same page can't collide.
const gradientId = useId()

// SVG dimensions for the dot-ladder. The viewBox uses non-uniform scaling
// (preserveAspectRatio="none") so the ladder stretches to fill the column;
// dots are rendered via an HTML overlay so they stay perfectly round.
const LADDER_W = 1000
const LADDER_H = 60
const LADDER_PAD_X = 14
const LADDER_PAD_Y = 8

const CONTEXT_DIMS = [
  { key: 'physicalIntensityRating', dim: 'physicalIntensity' },
  { key: 'taskLoadRating', dim: 'taskLoad' },
  { key: 'emotionalIntensityRating', dim: 'emotionalIntensity' },
  { key: 'socialIntensityRating', dim: 'socialIntensity' },
] as const

const STATE_DIMS = [
  { key: 'moodRating', dim: 'mood' },
  { key: 'energyRating', dim: 'energy' },
  { key: 'calmRating', dim: 'calm' },
  { key: 'connectionRating', dim: 'connection' },
] as const

const EVAL_DIMS = [
  { key: 'productivityRating', dim: 'productivity' },
  { key: 'engagementRating', dim: 'engagement' },
  { key: 'emotionalRegulationRating', dim: 'emotionalRegulation' },
  { key: 'selfCareRating', dim: 'selfCare' },
] as const

// Map weekRefs to trend data
const trendByWeek = computed(() => {
  const map = new Map<string, WeeklyRatingTrendEntry>()
  for (const trend of props.trends) {
    map.set(trend.weekRef, trend)
  }
  return map
})

const weekRefs = computed(() => props.weekRefs)

function buildDimensionRow(ratingKey: string, dimensionKey: string): DimensionRow {
  const label = t(`planning.reflection.weekly.dimensions.${dimensionKey}`)

  const values = props.weekRefs.map((wr) => {
    const entry = trendByWeek.value.get(wr)
    return entry
      ? (entry as unknown as Record<string, number | null>)[ratingKey] ?? null
      : null
  })

  const nonNull = values.filter((v): v is number => v != null)
  const average =
    nonNull.length > 0
      ? nonNull.reduce((a, b) => a + b, 0) / nonNull.length
      : null

  let trend: TrendDirection | null = null
  if (nonNull.length >= 2) {
    const half = Math.floor(nonNull.length / 2)
    const firstHalf = nonNull.slice(0, half)
    const secondHalf = nonNull.slice(half)
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const diff = avgSecond - avgFirst
    if (diff > 0.4) trend = 'rising'
    else if (diff < -0.4) trend = 'falling'
    else trend = 'stable'
  }

  return { key: ratingKey, label, values, average, trend }
}

const dimensionGroups = computed<DimensionGroup[]>(() => [
  {
    key: 'context',
    label: t('planning.reflection.monthly.dimensionGroups.context'),
    dimensions: CONTEXT_DIMS.map((d) => buildDimensionRow(d.key, d.dim)),
  },
  {
    key: 'state',
    label: t('planning.reflection.monthly.dimensionGroups.state'),
    dimensions: STATE_DIMS.map((d) => buildDimensionRow(d.key, d.dim)),
  },
  {
    key: 'evaluation',
    label: t('planning.reflection.monthly.dimensionGroups.evaluation'),
    dimensions: EVAL_DIMS.map((d) => buildDimensionRow(d.key, d.dim)),
  },
])

const weekLabels = computed(() =>
  props.weekRefs.map((wr) => {
    const bounds = getPeriodBounds(wr)
    const startDay = bounds.start.slice(8, 10).replace(/^0/, '')
    const endDay = bounds.end.slice(8, 10).replace(/^0/, '')
    return `${startDay}–${endDay}`
  })
)

// Two grid templates — one for the per-row layout (label + ladder + avg + trend)
// and one for the header row that shares column boundaries.
const rowGridStyle = computed(() => ({
  gridTemplateColumns: 'minmax(8.5rem, 12.5rem) minmax(0, 1fr) minmax(2.75rem, 3.5rem) 18px',
}))

const headerGridStyle = computed(() => ({
  gridTemplateColumns: 'minmax(8.5rem, 12.5rem) minmax(0, 1fr) minmax(2.75rem, 3.5rem) 18px',
}))

// SVG geometry helpers (operate in viewBox coordinate space)
function xFor(weekIdx: number): number {
  const n = weekRefs.value.length
  if (n <= 1) return LADDER_PAD_X
  return LADDER_PAD_X + (weekIdx / (n - 1)) * (LADDER_W - LADDER_PAD_X * 2)
}
function yFor(value: number): number {
  return LADDER_H - LADDER_PAD_Y - ((value - 1) / 4) * (LADDER_H - LADDER_PAD_Y * 2)
}
function rungY(value: number): number {
  return yFor(value)
}

function ladderPaths(values: (number | null)[]): { line: string; area: string } {
  // Split into segments of contiguous non-null points
  const segments: { x: number; y: number; idx: number }[][] = []
  let current: { x: number; y: number; idx: number }[] = []
  values.forEach((v, idx) => {
    if (v == null) {
      if (current.length > 0) segments.push(current)
      current = []
    } else {
      current.push({ x: xFor(idx), y: yFor(v), idx })
    }
  })
  if (current.length > 0) segments.push(current)

  const baseline = LADDER_H - LADDER_PAD_Y
  const lineParts: string[] = []
  const areaParts: string[] = []
  for (const seg of segments) {
    if (seg.length === 0) continue
    const linePath = seg
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')
    lineParts.push(linePath)
    if (seg.length >= 2) {
      const last = seg[seg.length - 1]
      const first = seg[0]
      areaParts.push(`${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`)
    }
  }
  return { line: lineParts.join(' '), area: areaParts.join(' ') }
}

// Convert viewBox coords → percentages so HTML dot overlay sits exactly on
// the corresponding SVG point regardless of the column's rendered width.
function dotStyle(weekIdx: number, value: number | null): Record<string, string> {
  if (value == null) return { display: 'none' }
  const xPct = (xFor(weekIdx) / LADDER_W) * 100
  const yPct = (yFor(value) / LADDER_H) * 100
  return {
    left: `${xPct}%`,
    top: `${yPct}%`,
  }
}
</script>

<style scoped>
.ladder-dot {
  position: absolute;
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  margin-top: -4.5px;
  border-radius: 50%;
  background: rgb(var(--neo-surface-base));
  border: 1.6px solid rgb(var(--neo-chart-primary-end));
  box-shadow: 0 1px 2px rgb(var(--neo-shadow-dark) / 0.25);
  pointer-events: none;
}

.trend-icon {
  font-variation-settings: 'FILL' 1, 'wght' 500, 'opsz' 20;
}
</style>
