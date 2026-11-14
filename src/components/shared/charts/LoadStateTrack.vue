<template>
  <span class="ls-track" :class="`ls-track--${size}`" role="img" :aria-label="label" :title="label">
    <i class="ls-track__rail" :class="{ 'ls-track__rail--empty': !tone }" />
    <template v-if="tone">
      <i class="ls-track__bar" :style="barStyle" />
      <!-- kropka stanu: ta sama studnia co wykonanie w „Dzisiaj”, w kolorze słupka -->
      <i class="mg-well mg-well--done ls-track__dot" :style="dotStyle" />
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { classifyPair, QUADRANT_LABELS, type MaybeRating } from '@/domain/loadState'
import { loadStateTone } from '@/domain/loadStateTone'

/**
 * One load & state pair: a lying bar on the 1–5 scale (left = 1, right = 5).
 * Length = load, dot = state, colour = the pair in the emotion-quadrant
 * convention (`loadStateTone`). A pair without both ratings is an empty rail.
 */
const props = withDefaults(
  defineProps<{
    load: MaybeRating
    state: MaybeRating
    /** What the bar is about, e.g. „Ciało · tydzień od 5.10” — the lead of the description. */
    subject: string
    /** md = summary cards · sm = context columns · xs = stacks of many weeks. */
    size?: 'md' | 'sm' | 'xs'
  }>(),
  { size: 'md' }
)

const tone = computed(() => loadStateTone(props.load, props.state))
/** Geometria idzie przez zmienne CSS: słupek do oceny obciążenia, kropka w ocenie stanu. */
const barStyle = computed<Record<string, string>>(() => ({
  '--ls-track-to': String(props.load ?? 1),
  background: tone.value?.fill ?? '',
}))
const dotStyle = computed<Record<string, string>>(() => ({
  '--ls-track-at': String(props.state ?? 1),
  '--mg-well-field': tone.value?.field ?? '',
  '--mg-well-mark': tone.value?.mark ?? '',
}))
const label = computed(() => {
  if (props.load == null || props.state == null) return `${props.subject}: bez refleksji`
  const quadrant = QUADRANT_LABELS[classifyPair(props.load, props.state).quadrant]
  return `${props.subject}: obciążenie ${props.load}, stan ${props.state} · tydzień ${quadrant}`
})
</script>

<style scoped>
.ls-track {
  --ls-track-size: 22px;
  --ls-track-inset: 2px;
  /* krok między środkami sąsiednich ocen */
  --ls-track-step: calc((100% - var(--ls-track-size)) / 4);
  position: relative;
  display: block;
  width: 100%;
  height: var(--ls-track-size);
}
.ls-track--sm {
  --ls-track-size: 16px;
}
.ls-track--xs {
  --ls-track-size: 10px;
  --ls-track-inset: 1px;
}
/* tor całej skali: papier na mgle pola */
.ls-track__rail {
  position: absolute;
  inset: 0;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-veil-strong);
}
.ls-track__rail--empty {
  background: var(--mg-color-veil);
}
.ls-track__bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc((var(--ls-track-to) - 1) * var(--ls-track-step) + var(--ls-track-size));
  border-radius: var(--mg-radius-pill);
}
.ls-track__dot {
  --mg-well-size: calc(var(--ls-track-size) - 2 * var(--ls-track-inset));
  position: absolute;
  top: var(--ls-track-inset);
  left: calc((var(--ls-track-at) - 1) * var(--ls-track-step) + var(--ls-track-inset));
}
</style>
