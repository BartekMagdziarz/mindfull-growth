<template>
  <div class="neo-inset rounded-xl px-2.5 py-2.5">
    <!-- Header: week columns + average -->
    <div class="grid items-center" :style="gridStyle">
      <div />
      <div
        v-for="(label, idx) in weekLabels"
        :key="idx"
        class="text-center text-[9px] font-semibold tabular-nums text-on-surface-variant/70"
        :title="label"
      >
        {{ label.slice(1) }}
      </div>
      <div
        class="text-center text-[9px] font-bold text-on-surface-variant/70"
        :title="t('planning.reflection.monthly.average')"
      >
        Ø
      </div>
    </div>

    <!-- Dimension groups -->
    <template v-for="group in dimensionGroups" :key="group.key">
      <div class="flex items-center gap-2 pb-1 pt-2.5">
        <span class="text-[9px] font-bold uppercase tracking-[0.16em] text-primary-strong">
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

      <!-- One row per dimension: label | week cells | average -->
      <div
        v-for="dim in group.dimensions"
        :key="dim.key"
        class="grid items-center py-[3px]"
        :style="gridStyle"
      >
        <div
          class="truncate pr-1.5 text-[11px] font-medium text-on-surface"
          :title="dim.label"
        >
          {{ dim.shortLabel }}
        </div>

        <div
          v-for="(value, idx) in dim.values"
          :key="idx"
          class="flex justify-center"
          :title="`${dim.label} · ${weekLabels[idx]}: ${value == null ? '—' : `${value}/5`}`"
        >
          <div class="cell-track">
            <div v-if="value != null" class="cell-fill" :style="fillStyle(value)" />
            <div v-else class="cell-empty" />
          </div>
        </div>

        <div
          class="text-center text-[11px] font-semibold tabular-nums"
          :class="
            dim.average == null
              ? 'text-on-surface-variant/50'
              : 'text-primary-strong'
          "
        >
          {{ dim.average == null ? '—' : dim.average.toFixed(1) }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeekRef } from '@/domain/period'
import type { WeeklyRatingTrendEntry } from '@/services/reflectionDataQueries'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  trends: WeeklyRatingTrendEntry[]
  weekRefs: WeekRef[]
}>()

interface DimensionRow {
  key: string
  label: string
  shortLabel: string
  values: (number | null)[]
  average: number | null
}

interface DimensionGroup {
  key: string
  label: string
  dimensions: DimensionRow[]
}

const DEMANDS_DIMS = [
  { key: 'physicalIntensityRating', dim: 'physicalIntensity' },
  { key: 'emotionalIntensityRating', dim: 'emotionalIntensity' },
  { key: 'taskLoadRating', dim: 'taskLoad' },
  { key: 'closeOnesNeedsRating', dim: 'closeOnesNeeds' },
] as const

const ACTIONS_DIMS = [
  { key: 'physicalCareRating', dim: 'physicalCare' },
  { key: 'emotionalProcessingRating', dim: 'emotionalProcessing' },
  { key: 'productivityRating', dim: 'productivity' },
  { key: 'closeOnesSupportRating', dim: 'closeOnesSupport' },
] as const

const STATE_DIMS = [
  { key: 'moodRating', dim: 'mood' },
  { key: 'energyRating', dim: 'energy' },
  { key: 'calmRating', dim: 'calm' },
  { key: 'connectionRating', dim: 'connection' },
] as const

// Map weekRefs to trend data
const trendByWeek = computed(() => {
  const map = new Map<string, WeeklyRatingTrendEntry>()
  for (const trend of props.trends) {
    map.set(trend.weekRef, trend)
  }
  return map
})

function buildDimensionRow(ratingKey: string, dimensionKey: string): DimensionRow {
  const label = t(`planning.reflection.weekly.dimensions.${dimensionKey}`)
  // Rows show the short form (duplicates like "Ciało" are disambiguated by the
  // group headers); the full label lives in the row/cell tooltips.
  const shortLabel = t(`planning.reflection.weekly.dimensionsShort.${dimensionKey}`)

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

  return { key: ratingKey, label, shortLabel, values, average }
}

const dimensionGroups = computed<DimensionGroup[]>(() => [
  {
    key: 'demands',
    label: t('planning.reflection.monthly.dimensionGroups.demands'),
    dimensions: DEMANDS_DIMS.map((d) => buildDimensionRow(d.key, d.dim)),
  },
  {
    key: 'actions',
    label: t('planning.reflection.monthly.dimensionGroups.actions'),
    dimensions: ACTIONS_DIMS.map((d) => buildDimensionRow(d.key, d.dim)),
  },
  {
    key: 'state',
    label: t('planning.reflection.monthly.dimensionGroups.state'),
    dimensions: STATE_DIMS.map((d) => buildDimensionRow(d.key, d.dim)),
  },
])

// "W23"-style column labels — same axis language as the object tiles in the
// month grid, so both views read against the same week markers.
const weekLabels = computed(() =>
  props.weekRefs.map((wr) => `W${wr.slice(-2)}`)
)

// Shared template for the header row and every dimension row so all columns
// stay aligned: label | one narrow column per week | average.
const gridStyle = computed(() => ({
  gridTemplateColumns: `minmax(0, 1fr) repeat(${props.weekRefs.length}, 1.1rem) 2rem`,
  columnGap: '2px',
}))

// Cell fill: height encodes the 1–5 value, opacity ramps with it so high
// ratings read stronger even at this tiny size.
function fillStyle(value: number): Record<string, string> {
  return {
    height: `${(value / 5) * 100}%`,
    opacity: (0.45 + (value / 5) * 0.5).toFixed(2),
  }
}
</script>

<style scoped>
.cell-track {
  position: relative;
  width: 12px;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow:
    inset 1px 1px 2px rgb(var(--neo-shadow-dark) / 0.14),
    inset -1px -1px 2px rgb(var(--neo-shadow-light) / 0.6);
}

.cell-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 4px 4px 0 0;
  background: rgb(var(--neo-chart-primary-end));
}

.cell-empty {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 3px;
  margin: -1.5px 0 0 -1.5px;
  border-radius: 50%;
  background: rgb(var(--neo-muted) / 0.35);
}
</style>
