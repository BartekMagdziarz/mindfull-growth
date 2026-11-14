<template>
  <div
    class="ls-matrix"
    :class="[`ls-matrix--${size}`, { 'ls-matrix--weeks': showWeeks }]"
    :style="{ '--ls-matrix-cols': String(areas.length) }"
    role="group"
    aria-label="Obciążenie i stan w tygodniach"
  >
    <template v-if="showAreas">
      <span v-if="showWeeks" aria-hidden="true" />
      <span v-for="area in areas" :key="area.key" class="ls-matrix__area">
        <AppIcon :name="area.icon" /><span>{{ area.label }}</span>
      </span>
    </template>
    <template v-for="(week, w) in weeks" :key="week.weekRef">
      <small v-if="showWeeks" class="ls-matrix__week">{{ week.label }}</small>
      <component
        :is="interactive ? 'button' : 'span'"
        v-for="area in areas"
        :key="area.key"
        :type="interactive ? 'button' : undefined"
        class="ls-matrix__cell"
        :class="{ 'ls-matrix__cell--open': interactive }"
        :title="interactive ? `Otwórz tydzień od ${week.label}` : undefined"
        @click="interactive && emit('open-week', week.weekRef)"
      >
        <LoadStateTrack
          :load="series[area.key][w].load"
          :state="series[area.key][w].state"
          :subject="`${area.label} · tydzień od ${week.label}`"
          :size="size"
        />
      </component>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { WeekPoint } from '@/domain/loadStateSeries'
import type { WeekRef } from '@/domain/period'
import LoadStateTrack from './LoadStateTrack.vue'

/**
 * Load & state of several weeks as a matrix: weeks are rows, life areas are
 * columns. A column shares one scale, so an area's state reads down its dots,
 * and the area names and dates appear once. Every listed area's points must
 * cover the same weeks, in order. With one area it is a column of that area's
 * weeks; with one week, a row.
 *
 * Keep the template single-rooted (no comment before the root): parents style
 * the matrix through their scoped class on this element.
 */
const props = withDefaults(
  defineProps<{
    series: Partial<Record<string, WeekPoint[]>> & Record<string, WeekPoint[]>
    areas: readonly { key: string; label: string; icon: string }[]
    size?: 'md' | 'sm' | 'xs'
    /** Header row with the area icons and names. */
    showAreas?: boolean
    /** First column with the Monday of every week. */
    showWeeks?: boolean
    /** Cells are buttons that open their week. */
    interactive?: boolean
  }>(),
  { size: 'md', showAreas: true, showWeeks: true, interactive: true }
)
const emit = defineEmits<{ 'open-week': [weekRef: WeekRef] }>()

const weeks = computed(() => props.series[props.areas[0]?.key ?? ''] ?? [])
</script>

<style scoped>
.ls-matrix {
  --ls-matrix-pad: 6px;
  display: grid;
  grid-template-columns: repeat(var(--ls-matrix-cols), minmax(0, 1fr));
  align-items: center;
  min-width: 0;
}
/* pierwsza kolumna: poniedziałek tygodnia */
.ls-matrix--weeks {
  grid-template-columns: 44px repeat(var(--ls-matrix-cols), minmax(0, 1fr));
}
.ls-matrix--sm {
  --ls-matrix-pad: 4px;
}
.ls-matrix--xs {
  --ls-matrix-pad: 2px 4px;
}
.ls-matrix__area {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 6px 4px;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
}
.ls-matrix__area > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ls-matrix__area :deep(.app-icon) {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-icon-md);
}
.ls-matrix--sm .ls-matrix__area {
  gap: 5px;
  padding: 0 4px 3px;
  font-size: var(--mg-font-size-xs);
}
.ls-matrix--sm .ls-matrix__area :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-sm);
}
.ls-matrix__week {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ls-matrix__cell {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: var(--ls-matrix-pad);
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
}
/* komórka-przycisk = strefa kliku: zoom do tygodnia */
.ls-matrix__cell--open {
  cursor: pointer;
}
.ls-matrix__cell--open:hover,
.ls-matrix__cell--open:focus-visible {
  background: var(--mg-color-paper);
}
</style>
