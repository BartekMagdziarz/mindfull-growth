<template>
  <!-- sloty = liczba celu; wypełnione = wykonania -->
  <span v-if="series.markKind === 'slots'" class="sm-slots" aria-hidden="true">
    <i v-for="index in slotCount" :key="index" class="sm-slot" :class="{ done: index <= (point.doneCount ?? 0), future: point.state === 'future' }" />
  </span>

  <!-- 7 slotów dni Pn–Nd -->
  <span v-else-if="series.markKind === 'day-slots' || series.markKind === 'checklist-slots'" class="sm-days" aria-hidden="true">
    <i v-for="(slot, index) in point.daySlots ?? []" :key="index" class="sm-day" :class="`sm-day--${slot}`" />
  </span>

  <!-- słupek + linia celu; nadwyżka nad limitem bez koloru oceny (punkty i oceny rysuje SeriesLine na całym wierszu) -->
  <span v-else class="sm-bar" aria-hidden="true">
    <i v-if="point.target !== null" class="sm-bar__target" :style="{ bottom: `${scaleY(point.target)}%` }" />
    <i v-if="point.value !== null" class="sm-bar__value" :style="{ height: `${scaleY(point.value)}%` }" />
    <i v-else-if="point.planned" class="sm-bar__plan" />
    <i v-else class="sm-bar__none" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SeriesPoint, SeriesProjection } from '~lab/lab/calendarPriorityData'

const props = defineProps<{ series: SeriesProjection; point: SeriesPoint; scaleMax?: number }>()

const slotCount = computed(() => Math.max(props.point.slotCount ?? 0, 1))

/** Słupki względem wspólnego maksimum grupy (ta sama jednostka miary). */
function scaleY(value: number): number {
  const max = props.scaleMax ?? props.series.maxValue
  return Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100))
}
</script>

<style scoped>
.sm-slots { display: inline-flex; gap: 7px; align-items: center; }
.sm-slot { box-sizing: border-box; width: 15px; height: 15px; border: 1.5px solid var(--cp-accent-strong); border-radius: 999px; }
.sm-slot.done { background: rgb(var(--sky-700)); border-color: rgb(var(--sky-700)); box-shadow: inset 0 0 0 2.5px rgb(var(--color-background)); }
.sm-slot.future { border-style: dashed; }

.sm-days { display: inline-flex; gap: 3px; align-items: center; }
.sm-day { box-sizing: border-box; width: 9px; height: 9px; border-radius: 999px; }
.sm-day--met { background: rgb(var(--sky-700)); }
.sm-day--partial { border: 1.5px solid rgb(var(--sky-700)); }
.sm-day--none { background: rgb(var(--sky-200)); }
.sm-day--future { border: 1px dashed rgb(var(--sky-300)); }
.sm-day--outside { background: transparent; }

.sm-bar { position: relative; display: inline-block; width: 30px; height: 53px; border-bottom: 1px solid rgb(var(--neo-muted) / .6); }
.sm-bar__value { position: absolute; left: 7px; bottom: 0; width: 16px; border-radius: 4px 4px 0 0; background: var(--cp-accent); min-height: 2px; }
.sm-bar__target { position: absolute; left: -3px; right: -3px; border-top: 1.5px dashed rgb(var(--sky-800) / .75); }
.sm-bar__plan { position: absolute; left: 9px; bottom: 2px; width: 12px; height: 12px; border: 2px solid var(--cp-accent-strong); border-radius: 999px; box-sizing: border-box; }
.sm-bar__none { position: absolute; left: 8px; bottom: 6px; width: 14px; height: 2px; background: rgb(var(--neo-muted) / .6); }
</style>
