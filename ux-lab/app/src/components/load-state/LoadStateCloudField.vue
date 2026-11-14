<template>
  <!-- tygodnie w wierszach, obszary w kolumnach: każda kolumna ma wspólną skalę,
       więc stan obszaru czyta się w dół po kropkach, a nazwy i daty są tylko raz -->
  <div class="lcf" :style="{ '--lcb-w': `${thickness}px` }" role="group" aria-label="Obciążenie i stan w tygodniach miesiąca">
    <span aria-hidden="true" />
    <span v-for="area in AREA_KEYS" :key="area" class="lcf__name"><AppIcon :name="AREA_ICONS[area]" />{{ AREA_LABELS[area] }}</span>
    <template v-for="(unit, i) in units" :key="unit.ref">
      <small class="lcf__tick">{{ unit.label }}</small>
      <button v-for="area in AREA_KEYS" :key="area" type="button" class="lcf__cell" :aria-label="`${AREA_LABELS[area]}, tydzień ${unit.range}`">
        <LoadStateCloudBar :area="area" :week-label="unit.range" :load="series[area][i].load" :state="series[area][i].state" :look="look" />
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import LoadStateCloudBar from '~lab/components/load-state/LoadStateCloudBar.vue'
import { DEFAULT_LOOK, SIZE_PX, type CloudLook, type MonthUnit } from '~lab/lab/loadStateClouds'
import { AREA_ICONS, AREA_KEYS, AREA_LABELS, type AreaKey, type WeekPoint } from '~lab/lab/weekLoadState'

/** Pole „Obciążenie i stan”: macierz tydzień × obszar. */
const props = withDefaults(
  defineProps<{
    units: MonthUnit[]
    series: Record<AreaKey, WeekPoint[]>
    look?: CloudLook
  }>(),
  { look: () => DEFAULT_LOOK },
)

const thickness = computed(() => SIZE_PX[props.look.size])
</script>

<style scoped>
.lcf {
  display: grid;
  grid-template-columns: 44px repeat(4, minmax(0, 1fr));
  align-items: center;
  min-width: 0;
  color: var(--mg-color-muted);
}
.lcf__name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 6px 4px;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-sm);
  font-weight: var(--mg-weight-strong);
}
.lcf__name :deep(.app-icon) {
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-icon-md);
}
.lcf__tick {
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* komórka = strefa kliku (zoom do tygodnia) */
.lcf__cell {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: 6px;
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: transparent;
  cursor: pointer;
}
.lcf__cell:hover,
.lcf__cell:focus-visible {
  background: var(--mg-color-paper);
}
</style>
