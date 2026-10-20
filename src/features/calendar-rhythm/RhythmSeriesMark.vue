<template>
  <!-- znaczniki wykonania = dyski z „Plan dnia” (wykonane = ten sam kleks); tydzień: jeden duży dysk na dzień -->
  <span
    v-if="wells"
    class="sm-wells"
    :class="{
      'sm-wells--one': scale === 'week',
      'sm-wells--slots': series.markKind === 'slots' && scale !== 'week',
    }"
    aria-hidden="true"
  >
    <template v-for="(well, index) in wells" :key="index">
      <i v-if="well === 'none'" class="sm-faint" />
      <i v-else-if="well === 'outside'" class="sm-gap" />
      <i
        v-else
        class="mg-well sm-well"
        :class="[`sm-well--${well}`, { 'mg-well--done': well === 'done' }]"
      />
    </template>
  </span>

  <!-- słupek + linia celu; nadwyżka nad limitem bez koloru oceny (punkty i oceny rysuje RhythmSeriesLine na całym wierszu) -->
  <span v-else class="sm-bar" aria-hidden="true">
    <i
      v-if="point.target !== null"
      class="sm-bar__target"
      :style="{ bottom: `${scaleY(point.target)}%` }"
    />
    <i
      v-if="point.value !== null"
      class="sm-bar__value"
      :style="{ height: `${scaleY(point.value)}%` }"
    />
    <i v-else-if="point.planned" class="sm-bar__plan" />
    <i v-else class="sm-bar__none" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DayWell, Scale, SeriesPoint, SeriesProjection } from './rhythmProjections'

const props = defineProps<{
  series: SeriesProjection
  point: SeriesPoint
  scaleMax?: number
  scale?: Scale
}>()

/**
 * Dyski wykonania: tydzień (kolumna = dzień) → jeden dysk dnia; miesiąc (kolumna = tydzień) → dyski dni Pn–Nd,
 * a dla celu „N razy w tygodniu” dyski slotów celu (wykonane, potem brakujące wg stanu tygodnia).
 */
const wells = computed<DayWell[] | null>(() => {
  const p = props.point
  if (props.scale === 'week') return p.dayWells?.length ? [p.dayWells[0]] : null
  if (props.series.markKind === 'slots') return p.slotWells ?? null
  return p.dayWells ?? null
})

/** Słupki względem wspólnego maksimum grupy (ta sama jednostka miary). */
function scaleY(value: number): number {
  const max = props.scaleMax ?? props.series.maxValue
  return Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100))
}
</script>

<style scoped>
/* miesiąc: małe dyski w rzędzie; tydzień: jeden dysk 34 px */
.sm-wells {
  --mg-well-size: 15px;
  display: inline-flex;
  gap: 3px;
  align-items: center;
}
.sm-wells--slots {
  gap: 6px;
}
.sm-wells--one {
  --mg-well-size: 34px;
}
.sm-well--partial {
  background: var(--mg-color-sky-field);
}
.sm-well--missed {
  border: 1.5px solid color-mix(in srgb, var(--mg-color-primary-strong) 38%, transparent);
}
.sm-well--today {
  border: 1.5px solid var(--mg-color-primary-strong);
}
.sm-well--future {
  border: 1.5px dashed color-mix(in srgb, var(--mg-color-primary-strong) 50%, transparent);
  background: transparent;
  box-shadow: none;
  opacity: 0.8;
}
/* bez planu: mała kropka na środku miejsca dysku; poza okresem: samo miejsce */
.sm-faint,
.sm-gap {
  display: grid;
  place-items: center;
  width: var(--mg-well-size);
  height: var(--mg-well-size);
}
.sm-faint::after {
  width: 9px;
  height: 9px;
  border-radius: 45% 55% 47% 53%;
  background: rgb(var(--sky-400) / 0.38);
  content: '';
}
.sm-wells:not(.sm-wells--one) .sm-faint::after {
  width: 6px;
  height: 6px;
}

.sm-bar {
  position: relative;
  display: inline-block;
  width: 30px;
  height: 53px;
  border-bottom: 1px solid var(--cp-muted-line);
}
.sm-bar__value {
  position: absolute;
  left: 7px;
  bottom: 0;
  width: 16px;
  border-radius: 4px 4px 0 0;
  background: var(--cp-accent);
  min-height: 2px;
}
.sm-bar__target {
  position: absolute;
  left: -3px;
  right: -3px;
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-ink) 75%, transparent);
}
.sm-bar__plan {
  position: absolute;
  left: 9px;
  bottom: 2px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--cp-accent-strong);
  border-radius: 999px;
  box-sizing: border-box;
}
.sm-bar__none {
  position: absolute;
  left: 8px;
  bottom: 6px;
  width: 14px;
  height: 2px;
  background: var(--cp-muted-line);
}
</style>
