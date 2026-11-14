<template>
  <span class="lcb" role="img" :aria-label="title" :title="title">
    <i
      v-for="(part, i) in parts"
      :key="i"
      class="lcb__part"
      :class="`lcb__part--${part.kind}`"
      :style="{ '--from': part.from, '--to': part.to, '--c': fill }"
    />
    <!-- kropka stanu: wspólna anatomia studni wykonania z Dzisiaj -->
    <i
      v-if="rated"
      class="mg-well mg-well--done lcb__dot"
      :style="{ '--at': state ?? 1, '--dot-field': dot.field, '--dot-centre': dot.centre }"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cloudFill, cloudParts, cloudTitle, DEFAULT_LOOK, dotColors, type CloudLook } from '~lab/lab/loadStateClouds'
import type { AreaKey, MaybeRating } from '~lab/lab/weekLoadState'

/**
 * Jeden tydzień jednego obszaru: leżący, płaski słupek na torze skali 1–5
 * (lewo = 1, prawo = 5). Długość = obciążenie, kropka = stan, kolor = ćwiartka
 * pary. Wypełnia szerokość rodzica; grubość bierze z `--lcb-w`.
 */
const props = withDefaults(
  defineProps<{
    area: AreaKey
    weekLabel: string
    load: MaybeRating
    state: MaybeRating
    look?: CloudLook
  }>(),
  { look: () => DEFAULT_LOOK },
)

const rated = computed(() => props.load != null && props.state != null)
const parts = computed(() => cloudParts(props.load, props.state))
const fill = computed(() => cloudFill(props.load, props.state, props.look))
const dot = computed(() => dotColors(props.load, props.state, props.look))
const title = computed(() => cloudTitle(props.area, props.weekLabel, props.load, props.state))
</script>

<style scoped>
.lcb {
  /* krok między środkami sąsiednich ocen */
  --lcb-step: calc((100% - var(--lcb-w, 22px)) / 4);
  position: relative;
  display: block;
  flex: none;
  width: 100%;
  height: var(--lcb-w, 22px);
}
.lcb__part {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc((var(--from) - 1) * var(--lcb-step));
  width: calc((var(--to) - var(--from)) * var(--lcb-step) + var(--lcb-w, 22px));
  border-radius: var(--mg-radius-pill);
}
.lcb__part--cloud {
  background: var(--c);
}
/* tor całej skali: głębiej = bielej */
.lcb__part--track {
  background: var(--mg-color-paper);
  opacity: 0.75;
}
/* tydzień bez refleksji: pusty, bledszy tor */
.lcb__part--gap {
  background: var(--mg-color-paper);
  opacity: 0.4;
}

/* kropka: anatomia `mg-well--done` w rozmiarze słupka; pole i środek z drabinki koloru słupka */
.lcb__dot {
  --mg-well-size: calc(var(--lcb-w, 22px) - 4px);
  position: absolute;
  top: 2px;
  left: calc((var(--at) - 1) * var(--lcb-step) + 2px);
  background: var(--dot-field);
}
.lcb__dot::after {
  background: var(--dot-centre);
}
</style>
