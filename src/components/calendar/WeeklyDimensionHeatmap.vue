<template>
  <div class="space-y-1">
    <!-- Header row: week labels -->
    <div class="grid items-end gap-1" :style="gridStyle">
      <div class="col-span-1" />
      <div
        v-for="(label, idx) in weekLabels"
        :key="idx"
        class="text-center text-[10px] font-medium text-on-surface-variant leading-tight px-0.5 pb-1"
      >
        {{ label }}
      </div>
      <div class="text-center text-[10px] font-medium text-on-surface-variant pb-1">
        {{ t('planning.reflection.monthly.average') }}
      </div>
      <div class="w-4" />
    </div>

    <!-- Dimension groups -->
    <template v-for="group in dimensionGroups" :key="group.key">
      <!-- Group label -->
      <div class="pt-2 pb-0.5">
        <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
          {{ group.label }}
        </span>
      </div>

      <!-- Dimension rows -->
      <div
        v-for="dim in group.dimensions"
        :key="dim.key"
        class="grid items-center gap-1"
        :style="gridStyle"
      >
        <!-- Dimension label -->
        <div class="text-xs text-on-surface truncate pr-1" :title="dim.label">
          {{ dim.shortLabel }}
        </div>

        <!-- Week cells -->
        <div
          v-for="(_wr, idx) in weekRefs"
          :key="idx"
          class="flex items-center justify-center rounded-lg h-8 text-xs font-medium transition-colors"
          :class="cellClass(dim.values[idx])"
          :title="`${dim.label}: ${dim.values[idx] ?? '—'}/5`"
        >
          {{ dim.values[idx] ?? '—' }}
        </div>

        <!-- Average -->
        <div
          class="flex items-center justify-center rounded-lg h-8 text-xs font-semibold"
          :class="cellClass(dim.average)"
          :title="`${t('planning.reflection.monthly.average')}: ${dim.average?.toFixed(1) ?? '—'}`"
        >
          {{ dim.average != null ? dim.average.toFixed(1) : '—' }}
        </div>

        <!-- Trend arrow -->
        <div class="flex items-center justify-center w-4">
          <span
            v-if="dim.trend === 'rising'"
            class="material-symbols-outlined text-sm text-primary"
            title=""
          >trending_up</span>
          <span
            v-else-if="dim.trend === 'falling'"
            class="material-symbols-outlined text-sm text-error"
            title=""
          >trending_down</span>
          <span
            v-else-if="dim.trend === 'stable'"
            class="material-symbols-outlined text-sm text-on-surface-variant/50"
            title=""
          >trending_flat</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  shortLabel: string
  values: (number | null)[]
  average: number | null
  trend: TrendDirection | null
}

interface DimensionGroup {
  key: string
  label: string
  dimensions: DimensionRow[]
}

const CONTEXT_DIMS = [
  { key: 'physicalIntensityRating', dim: 'physicalIntensity', short: 'pl.physShort' },
  { key: 'taskLoadRating', dim: 'taskLoad', short: 'pl.taskShort' },
  { key: 'emotionalIntensityRating', dim: 'emotionalIntensity', short: 'pl.emoShort' },
  { key: 'socialIntensityRating', dim: 'socialIntensity', short: 'pl.socShort' },
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
  { key: 'emotionalRegulationRating', dim: 'emotionalRegulation', short: 'pl.regShort' },
  { key: 'selfCareRating', dim: 'selfCare' },
] as const

// Map weekRefs to trend data
const trendByWeek = computed(() => {
  const map = new Map<string, WeeklyRatingTrendEntry>()
  for (const t of props.trends) {
    map.set(t.weekRef, t)
  }
  return map
})

function buildDimensionRow(
  ratingKey: string,
  dimensionKey: string,
  shortLabelOverride?: string,
): DimensionRow {
  const label = t(`planning.reflection.weekly.dimensions.${dimensionKey}`)
  const shortLabel = shortLabelOverride ?? label

  const values = props.weekRefs.map((wr) => {
    const entry = trendByWeek.value.get(wr)
    return entry ? (entry as unknown as Record<string, number | null>)[ratingKey] ?? null : null
  })

  const nonNull = values.filter((v): v is number => v != null)
  const average = nonNull.length > 0
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

  return { key: ratingKey, label, shortLabel, values, average, trend }
}

const SHORT_LABEL_KEYS = ['physicalIntensity', 'taskLoad', 'emotionalIntensity', 'socialIntensity', 'emotionalRegulation']

function getShortLabel(dimensionKey: string): string {
  if (SHORT_LABEL_KEYS.includes(dimensionKey)) {
    return t(`planning.reflection.weekly.dimensionsShort.${dimensionKey}`)
  }
  return t(`planning.reflection.weekly.dimensions.${dimensionKey}`)
}

const dimensionGroups = computed<DimensionGroup[]>(() => [
  {
    key: 'context',
    label: t('planning.reflection.monthly.dimensionGroups.context'),
    dimensions: CONTEXT_DIMS.map((d) =>
      buildDimensionRow(d.key, d.dim, getShortLabel(d.dim))
    ),
  },
  {
    key: 'state',
    label: t('planning.reflection.monthly.dimensionGroups.state'),
    dimensions: STATE_DIMS.map((d) =>
      buildDimensionRow(d.key, d.dim, getShortLabel(d.dim))
    ),
  },
  {
    key: 'evaluation',
    label: t('planning.reflection.monthly.dimensionGroups.evaluation'),
    dimensions: EVAL_DIMS.map((d) =>
      buildDimensionRow(d.key, d.dim, getShortLabel(d.dim))
    ),
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

// Grid: [label] [week1] [week2] ... [weekN] [avg] [trend]
const gridStyle = computed(() => ({
  gridTemplateColumns: `minmax(4.5rem, 6rem) repeat(${props.weekRefs.length}, minmax(2.5rem, 1fr)) minmax(2.5rem, 3.5rem) 1rem`,
}))

function cellClass(value: number | null | undefined): string {
  if (value == null) return 'bg-on-surface/[0.04] text-on-surface-variant/60'

  const rounded = Math.round(value)
  const opacityMap: Record<number, string> = {
    1: 'bg-primary/10 text-primary-strong',
    2: 'bg-primary/20 text-primary-strong',
    3: 'bg-primary/35 text-primary-strong',
    4: 'bg-primary/55 text-on-primary/90',
    5: 'bg-primary/75 text-on-primary',
  }

  return opacityMap[Math.max(1, Math.min(5, rounded))] ?? opacityMap[3]
}
</script>
