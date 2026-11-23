<template>
  <span class="ahm" :class="active ? `is-waking-${active}` : null" role="img" :aria-label="label" :title="label">
    <i class="ahm__rail" />
    <!-- podgląd: dokąd sięgnie słupek / gdzie stanie kropka po kliknięciu -->
    <i v-if="previewLoad != null" class="ahm__ghost-bar" :style="{ '--ahm-to': String(previewLoad) }" />
    <i class="ahm__bar" :class="{ 'is-off': load == null }" :style="barStyle">
      <b v-if="grip" class="ahm__grip" />
    </i>
    <i v-if="previewState != null && previewState !== state" class="ahm__ghost-dot" :style="{ '--ahm-at': String(previewState) }" />
    <!-- kropka stanu: ta sama studnia co w kalendarzu i w „Dzisiaj” -->
    <i class="mg-well mg-well--done ahm__dot" :class="{ 'is-off': state == null }" :style="dotStyle" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MaybeRating } from '@product/domain/loadState'
import { loadStateTone } from '@product/domain/loadStateTone'

/**
 * Znak „obciążenie i stan” z kalendarza (`LoadStateTrack`) w dużym rozmiarze i
 * na żywo: długość słupka = obciążenie, położenie kropki = stan, kolor = para.
 * Różnice wobec produktu, potrzebne w kroku oceny: rozmiar 48 px, płynne
 * przejście długości i położenia, oraz rysowanie jednej oceny (sam słupek albo
 * sama kropka w neutralnym błękicie danych), zanim para dostanie kolor.
 */
const props = withDefaults(
  defineProps<{
    load: MaybeRating
    state: MaybeRating
    subject: string
    /** Ocena pod kursorem — rysowana jako cień, zanim zostanie ustawiona. */
    previewLoad?: number | null
    previewState?: number | null
    /** Uchwyt na końcu słupka: koniec da się złapać i przesunąć. */
    grip?: boolean
    /** Oś, której kontrolka jest pod kursorem: jej element na znaku się budzi. */
    active?: 'load' | 'state' | null
  }>(),
  { previewLoad: null, previewState: null, grip: false, active: null }
)

const tone = computed(() => loadStateTone(props.load, props.state))
const NEUTRAL = 'var(--mg-color-data-fill)'
const NEUTRAL_FIELD = `color-mix(in oklab, ${NEUTRAL} 24%, var(--mg-color-paper))`

const barStyle = computed<Record<string, string>>(() => ({
  '--ahm-to': String(props.load ?? 1),
  background: tone.value?.fill ?? NEUTRAL,
}))
const dotStyle = computed<Record<string, string>>(() => ({
  '--ahm-at': String(props.state ?? 3),
  '--mg-well-field': tone.value?.field ?? NEUTRAL_FIELD,
  '--mg-well-mark': tone.value?.mark ?? NEUTRAL,
}))
const label = computed(() => {
  const parts = [props.load != null ? `obciążenie ${props.load}` : null, props.state != null ? `stan ${props.state}` : null].filter(Boolean)
  return `${props.subject}: ${parts.length ? parts.join(', ') : 'jeszcze bez oceny'}`
})
</script>

<style scoped>
.ahm {
  --ahm-size: 3rem;
  --ahm-inset: 4px;
  /* krok między środkami sąsiednich ocen — jak w `LoadStateTrack` */
  --ahm-step: calc((100% - var(--ahm-size)) / 4);
  position: relative;
  display: block;
  width: 100%;
  height: var(--ahm-size);
}
.ahm__rail {
  position: absolute;
  inset: 0;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-veil-strong);
}
.ahm__bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc((var(--ahm-to) - 1) * var(--ahm-step) + var(--ahm-size));
  border-radius: var(--mg-radius-pill);
  transition:
    width var(--mg-duration-normal) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.ahm__bar.is-off {
  width: 0;
  opacity: 0;
}
.ahm__ghost-bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc((var(--ahm-to) - 1) * var(--ahm-step) + var(--ahm-size));
  border-radius: var(--mg-radius-pill);
  background: color-mix(in srgb, var(--mg-color-data-fill) 28%, transparent);
}
.ahm__ghost-dot {
  position: absolute;
  top: var(--ahm-inset);
  left: calc((var(--ahm-at) - 1) * var(--ahm-step) + var(--ahm-inset));
  width: calc(var(--ahm-size) - 2 * var(--ahm-inset));
  height: calc(var(--ahm-size) - 2 * var(--ahm-inset));
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-veil-strong);
  box-shadow: var(--mg-shadow-inset-sm);
}
/* uchwyt końca słupka: cichy znak „to się przesuwa”, widoczny pod kursorem */
.ahm__grip {
  position: absolute;
  top: 50%;
  right: 9px;
  width: 4px;
  height: 1.125rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-veil-strong);
  translate: 0 -50%;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.ahm:hover .ahm__grip,
.ahm.is-live .ahm__grip,
.ahm.is-waking-load .ahm__grip {
  opacity: 1;
}
/* kontrolka osi pod kursorem: jej element rośnie o włos, drugi zostaje w spokoju */
.ahm.is-waking-state .ahm__dot:not(.is-off) {
  scale: 1.12;
}
.ahm.is-waking-load .ahm__grip {
  height: 1.5rem;
}
.ahm__dot {
  --mg-well-size: calc(var(--ahm-size) - 2 * var(--ahm-inset));
  position: absolute;
  top: var(--ahm-inset);
  left: calc((var(--ahm-at) - 1) * var(--ahm-step) + var(--ahm-inset));
  transition:
    left var(--mg-duration-normal) var(--mg-ease-standard),
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    scale var(--mg-duration-fast) var(--mg-ease-standard);
}
.ahm__dot.is-off {
  opacity: 0;
  scale: 0.6;
}
@media (prefers-reduced-motion: reduce) {
  .ahm__bar,
  .ahm__dot {
    transition: none;
  }
}
</style>
