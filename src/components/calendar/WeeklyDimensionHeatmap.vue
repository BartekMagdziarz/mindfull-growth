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
            <div v-if="value != null" class="cell-fill" :style="fillStyle(value, dim.section)" />
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
import {
  MATRIX_SECTIONS,
  REFLECTION_MATRIX_AREAS,
  areaTitleKey,
  composeCellLabel,
  type MatrixSection,
} from '@/domain/reflectionMatrix'
import { divergingRatingColor } from '@/utils/ratingGradient'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  trends: WeeklyRatingTrendEntry[]
  weekRefs: WeekRef[]
}>()

interface DimensionRow {
  key: string
  section: MatrixSection
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

// Map weekRefs to trend data
const trendByWeek = computed(() => {
  const map = new Map<string, WeeklyRatingTrendEntry>()
  for (const trend of props.trends) {
    map.set(trend.weekRef, trend)
  }
  return map
})

function buildDimensionRow(
  area: (typeof REFLECTION_MATRIX_AREAS)[number],
  section: MatrixSection,
): DimensionRow {
  const ratingKey = area.fields[section]
  // Rows show the area name (the group header carries the section); the
  // composed cell label ("Stan · Zadania") lives in the row/cell tooltips.
  const label = composeCellLabel(t, area.key, section)
  const shortLabel = t(areaTitleKey(area.key))

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

  return { key: ratingKey, section, label, shortLabel, values, average }
}

const dimensionGroups = computed<DimensionGroup[]>(() =>
  MATRIX_SECTIONS.map((section) => ({
    key: section,
    label: t(`planning.reflection.monthly.dimensionGroups.${section}`),
    dimensions: REFLECTION_MATRIX_AREAS.map((area) => buildDimensionRow(area, section)),
  })),
)

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

// Cell fill: full-cell diverging swatch (rose = strain, sky = ease). The
// Demands rows are value-inverted so a heavy week reads rose there too.
function fillStyle(value: number, section: MatrixSection): Record<string, string> {
  return {
    background: divergingRatingColor(value, { invert: section === 'demands' }) ?? '',
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
  inset: 0;
  border-radius: 4px;
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
