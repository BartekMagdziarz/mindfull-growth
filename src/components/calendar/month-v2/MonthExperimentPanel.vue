<template>
  <div v-if="isDev" class="month-experiment" data-testid="month-v2-experiment">
    <!-- No panel title: the shell's eyebrow already says "Month V2 experiment". -->
    <div class="month-experiment__group" role="group" :aria-label="t('planning.calendar.monthV2.experiment.chart')">
      <button
        v-for="mode in CHART_MODES"
        :key="mode"
        type="button"
        class="month-experiment__option neo-focus"
        :class="{ 'month-experiment__option--active': chartMode === mode }"
        :aria-pressed="chartMode === mode"
        @click="emitChange({ chartMode: mode })"
      >
        {{ t(`planning.calendar.monthV2.experiment.${mode}`) }}
      </button>
    </div>

    <div class="month-experiment__group" role="group" :aria-label="t('planning.calendar.monthV2.experiment.density')">
      <button
        v-for="value in DENSITIES"
        :key="value"
        type="button"
        class="month-experiment__option neo-focus"
        :class="{ 'month-experiment__option--active': density === value }"
        :aria-pressed="density === value"
        @click="emitChange({ density: value })"
      >
        {{ t(`planning.calendar.monthV2.experiment.${value}`) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

const props = defineProps<{
  chartMode: MonthChartMode
  density: MonthDensity
}>()

const emit = defineEmits<{
  change: [config: { chartMode: MonthChartMode; density: MonthDensity }]
}>()

const { t } = useT()

// DEV-only affordance; the URL params keep working in any build.
const isDev = import.meta.env.DEV

const CHART_MODES: MonthChartMode[] = ['hybrid', 'capsules', 'axis']
const DENSITIES: MonthDensity[] = ['comfortable', 'compact']

// Always emit the complete pair so the parent can write both query params.
function emitChange(partial: { chartMode?: MonthChartMode; density?: MonthDensity }): void {
  emit('change', {
    chartMode: partial.chartMode ?? props.chartMode,
    density: partial.density ?? props.density,
  })
}
</script>

<style scoped>
.month-experiment {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.month-experiment__title {
  color: rgb(var(--neo-muted));
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.month-experiment__group {
  border-radius: 999px;
  box-shadow:
    inset 1px 1px 3px rgb(var(--neo-inset-dark) / 0.3),
    inset -1px -1px 3px rgb(var(--neo-inset-light) / 0.6);
  display: flex;
  gap: 2px;
  padding: 2px;
}

.month-experiment__option {
  background: none;
  border: none;
  border-radius: 999px;
  color: rgb(var(--neo-muted));
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 10px;
}

.month-experiment__option--active {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.45),
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.8);
  color: rgb(var(--color-primary-strong));
}
</style>
