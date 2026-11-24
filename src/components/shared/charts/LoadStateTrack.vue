<template>
  <span
    class="ls-track"
    :class="[
      `ls-track--${size}`,
      { 'ls-track--live': live },
      live && active ? `ls-track--waking-${active}` : null,
    ]"
    role="img"
    :aria-label="label"
    :title="label"
  >
    <i class="ls-track__rail" :class="{ 'ls-track__rail--empty': !tone && !live }" />
    <!-- podgląd (tylko `live`): dokąd sięgnie słupek po zmianie oceny -->
    <i
      v-if="live && previewLoad != null && previewLoad !== load"
      class="ls-track__ghost-bar"
      :style="{ '--ls-track-to': String(previewLoad) }"
    />
    <template v-if="tone || live">
      <i class="ls-track__bar" :class="{ 'is-off': load == null }" :style="barStyle">
        <b v-if="live" class="ls-track__grip" />
      </i>
      <i
        v-if="live && previewState != null && previewState !== state"
        class="mg-well mg-well--data ls-track__ghost-dot"
        :style="{ '--ls-track-at': String(previewState) }"
      />
      <!-- kropka stanu: ta sama studnia co wykonanie w „Dzisiaj”, w kolorze słupka -->
      <i
        class="mg-well mg-well--done ls-track__dot"
        :class="{ 'is-off': state == null }"
        :style="dotStyle"
      />
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
 *
 * `live` is the mark while it is being rated (the area step of the weekly
 * reflection): length and position move smoothly, a single rating is already
 * drawn (in the neutral data blue, before the pair has a colour), a preview
 * shows where a rating would land, and `active` wakes the element of the axis
 * whose control is under the cursor.
 */
const props = withDefaults(
  defineProps<{
    load: MaybeRating
    state: MaybeRating
    /** What the bar is about, e.g. „Ciało · tydzień od 5.10” — the lead of the description. */
    subject: string
    /** lg = the mark being rated · md = summary cards · sm = context columns · xs = stacks of many weeks. */
    size?: 'lg' | 'md' | 'sm' | 'xs'
    /** The mark is being rated: transitions, single ratings, preview and waking. */
    live?: boolean
    /** `live` only — the load a control is about to set, drawn as a pale bar. */
    previewLoad?: number | null
    /** `live` only — the state a control is about to set, drawn as an empty well. */
    previewState?: number | null
    /** `live` only — the axis whose control is under the cursor. */
    active?: 'load' | 'state' | null
  }>(),
  { size: 'md', live: false, previewLoad: null, previewState: null, active: null }
)

const tone = computed(() => loadStateTone(props.load, props.state))
const NEUTRAL = 'var(--mg-color-data-fill)'
const NEUTRAL_FIELD = `color-mix(in oklab, ${NEUTRAL} 24%, var(--mg-color-paper))`

/** Geometria idzie przez zmienne CSS: słupek do oceny obciążenia, kropka w ocenie stanu. */
const barStyle = computed<Record<string, string>>(() => ({
  '--ls-track-to': String(props.load ?? 1),
  background: tone.value?.fill ?? (props.live ? NEUTRAL : ''),
}))
const dotStyle = computed<Record<string, string>>(() => ({
  '--ls-track-at': String(props.state ?? (props.live ? 3 : 1)),
  '--mg-well-field': tone.value?.field ?? (props.live ? NEUTRAL_FIELD : ''),
  '--mg-well-mark': tone.value?.mark ?? (props.live ? NEUTRAL : ''),
}))
const label = computed(() => {
  if (props.load == null || props.state == null) {
    if (!props.live) return `${props.subject}: bez refleksji`
    const parts = [
      props.load != null ? `obciążenie ${props.load}` : null,
      props.state != null ? `stan ${props.state}` : null,
    ].filter(Boolean)
    return `${props.subject}: ${parts.length ? parts.join(', ') : 'jeszcze bez oceny'}`
  }
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
.ls-track--lg {
  --ls-track-size: 3rem;
  --ls-track-inset: 4px;
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
.ls-track__bar,
.ls-track__ghost-bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc((var(--ls-track-to) - 1) * var(--ls-track-step) + var(--ls-track-size));
  border-radius: var(--mg-radius-pill);
}
.ls-track__dot,
.ls-track__ghost-dot {
  position: absolute;
  top: var(--ls-track-inset);
  left: calc((var(--ls-track-at) - 1) * var(--ls-track-step) + var(--ls-track-inset));
}
.ls-track__dot,
.ls-track__ghost-dot {
  --mg-well-size: calc(var(--ls-track-size) - 2 * var(--ls-track-inset));
}

/* ── `live`: znak w trakcie oceniania ───────────────────────────────────── */
.ls-track--live .ls-track__bar {
  transition:
    width var(--mg-duration-normal) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.ls-track--live .ls-track__bar.is-off {
  width: 0;
  opacity: 0;
}
.ls-track--live .ls-track__dot {
  transition:
    left var(--mg-duration-normal) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    scale var(--mg-duration-fast) var(--mg-ease-standard);
}
.ls-track--live .ls-track__dot.is-off {
  opacity: 0;
  scale: 0.6;
}
/* podgląd: blady słupek do nowej długości, pusta studnia w nowym miejscu */
.ls-track__ghost-bar {
  background: color-mix(in srgb, var(--mg-color-data-fill) 28%, transparent);
}
.ls-track__ghost-dot {
  --mg-well-ground: var(--mg-color-veil-strong);
}
/* koniec słupka: cichy znak „to się przesuwa”, widoczny, gdy budzi się oś obciążenia */
.ls-track__grip {
  position: absolute;
  top: 50%;
  right: 9px;
  width: 4px;
  height: 1.125rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-veil-strong);
  translate: 0 -50%;
  opacity: 0;
  transition:
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    height var(--mg-duration-fast) var(--mg-ease-standard);
}
.ls-track--waking-load .ls-track__grip {
  height: 1.5rem;
  opacity: 1;
}
.ls-track--waking-state .ls-track__dot:not(.is-off) {
  scale: 1.12;
}
@media (prefers-reduced-motion: reduce) {
  .ls-track--live .ls-track__bar,
  .ls-track--live .ls-track__dot {
    transition: none;
  }
}
</style>
