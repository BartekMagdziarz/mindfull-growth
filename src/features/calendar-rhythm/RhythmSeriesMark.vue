<template>
  <!-- znaczniki wykonania = kropki aplikacji jako dane, jak pasek dni w „Dzisiaj”; tydzień: jedna duża kropka na dzień -->
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
      <i v-if="well === 'outside'" class="sm-gap" />
      <i
        v-else
        class="mg-well mg-well--data sm-well"
        :class="[`sm-well--${well}`, WELL_STATE[well]]"
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
    <i v-else-if="point.planned" class="sm-bar__plan mg-well mg-well--xs" />
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
/** Day states on the shared dot: the same grammar as the day strip in „Dzisiaj”. */
const WELL_STATE: Record<DayWell, string> = {
  done: 'mg-well--done',
  partial: 'mg-well--lit',
  missed: 'mg-well--missed',
  today: 'mg-well--current',
  future: 'mg-well--ghost',
  none: '',
  outside: '',
}

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
/* poza okresem: samo miejsce kropki */
.sm-gap {
  width: var(--mg-well-size);
  height: var(--mg-well-size);
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
  border-radius: var(--mg-radius-sketch-a);
  background: var(--cp-accent);
  min-height: 2px;
}
.sm-bar__target {
  position: absolute;
  left: -3px;
  right: -3px;
  border-top: 1.5px dashed color-mix(in srgb, var(--mg-color-ink) 75%, transparent);
}
/* planned, nothing recorded yet: the app's empty dot on the floor of the bar */
.sm-bar__plan {
  position: absolute;
  left: 9px;
  bottom: 2px;
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
