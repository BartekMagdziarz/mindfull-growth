<template>
  <div class="asl" :class="[`asl--${axis}`, { 'asl--aligned': aligned, 'is-unset': value == null, 'is-live': dragging }]">
    <div
      ref="trackRef"
      class="asl__track"
      role="slider"
      tabindex="0"
      :aria-label="label"
      aria-valuemin="1"
      aria-valuemax="5"
      :aria-valuenow="value ?? undefined"
      :aria-valuetext="valueText"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerenter="emit('active', true)"
      @pointerleave="onLeave"
      @focus="emit('active', true)"
      @blur="emit('active', false)"
      @keydown.left.prevent="step(-1)"
      @keydown.down.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
      @keydown.up.prevent="step(1)"
      @keydown.home.prevent="emit('rate', 1)"
      @keydown.end.prevent="emit('rate', 5)"
      @keydown.delete.prevent="emit('rate', null)"
      @keydown.backspace.prevent="emit('rate', null)"
    >
      <i class="asl__rail" />
      <!-- obciążenie to ilość: tor wypełnia się do gałki, jak słupek znaku -->
      <i v-if="axis === 'load' && value != null" class="asl__fill" :style="{ '--asl-at': value, background: tone.fill }" />
      <i v-for="n in 5" :key="n" class="asl__stop" :style="{ '--asl-at': n }" />
      <i v-if="ghost != null" class="asl__ghost" :style="{ '--asl-at': ghost }" />
      <i v-if="value != null" class="asl__thumb" :style="{ '--asl-at': value, '--asl-mark': tone.mark }"><b /></i>
    </div>
    <div class="asl__ends" aria-hidden="true">
      <span>{{ low }}</span>
      <span>{{ high }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MaybeRating, Rating } from '@product/domain/loadState'
import { loadStateTone } from '@product/domain/loadStateTone'
import { steppedRating, type AxisKey } from '~lab/lab/areaRatingStep'

/**
 * Runda 4 · suwak jednej osi. Tor ma pięć miejsc i jedną gałkę-chmurę:
 * obciążenie wypełnia tor do gałki (jak słupek znaku), stan tylko przesuwa
 * gałkę z kropką (jak kropka znaku). Klik w tor przeskakuje, gałkę można
 * przeciągnąć, strzałki przesuwają o stopień. Bez oceny tor nie ma gałki —
 * pod kursorem stoi jej cień. Klik w ustawioną gałkę czyści ocenę.
 *
 * `aligned`: tor ma szerokość dużego znaku i te same miejsca skali, więc gałka
 * stoi dokładnie pod albo nad elementem, który przesuwa.
 */
const props = withDefaults(
  defineProps<{
    axis: AxisKey
    load: MaybeRating
    state: MaybeRating
    low: string
    high: string
    label: string
    aligned?: boolean
  }>(),
  { aligned: false }
)
const emit = defineEmits<{ rate: [value: number | null]; preview: [value: number | null]; active: [on: boolean] }>()

const value = computed(() => props[props.axis])
const NEUTRAL = 'var(--mg-color-data-fill)'
const tone = computed(() => {
  const pair = loadStateTone(props.load, props.state)
  return { fill: pair?.fill ?? NEUTRAL, mark: pair?.mark ?? NEUTRAL }
})
const valueText = computed(() => {
  if (value.value == null) return 'bez oceny'
  if (value.value === 1) return props.low
  if (value.value === 5) return props.high
  return `${value.value} z 5`
})

const trackRef = ref<HTMLElement | null>(null)
const ghost = ref<number | null>(null)
const dragging = ref(false)
let startValue: MaybeRating = null
let moved = false

/** Miejsce skali pod kursorem — liczone ze środków skrajnych miejsc toru. */
function stopAt(event: PointerEvent): Rating {
  const stops = trackRef.value?.querySelectorAll<HTMLElement>('.asl__stop')
  if (!stops || stops.length < 5) return 1
  const centre = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return rect.left + rect.width / 2
  }
  const first = centre(stops[0])
  const stepWidth = (centre(stops[4]) - first) / 4
  if (stepWidth <= 0) return 1
  const index = Math.round((event.clientX - first) / stepWidth)
  return (Math.max(0, Math.min(4, index)) + 1) as Rating
}

function setGhost(next: number | null) {
  if (ghost.value === next) return
  ghost.value = next
  emit('preview', next)
}

function onDown(event: PointerEvent) {
  if (event.button !== 0) return
  const track = trackRef.value
  if (!track) return
  event.preventDefault()
  track.focus({ preventScroll: true })
  track.setPointerCapture(event.pointerId)
  dragging.value = true
  startValue = value.value
  moved = false
  setGhost(null)
  const next = stopAt(event)
  if (next !== value.value) {
    moved = true
    emit('rate', next)
  }
}
function onMove(event: PointerEvent) {
  const next = stopAt(event)
  if (!dragging.value) {
    setGhost(next === value.value ? null : next)
    return
  }
  if (next !== value.value) {
    moved = true
    emit('rate', next)
  }
}
function onUp() {
  if (!dragging.value) return
  dragging.value = false
  if (!moved && startValue != null) emit('rate', null)
}
function onLeave() {
  setGhost(null)
  if (!dragging.value && document.activeElement !== trackRef.value) emit('active', false)
}
function step(delta: number) {
  emit('rate', steppedRating(value.value, delta))
}
</script>

<style scoped>
.asl {
  --asl-thumb: 1.75rem;
  /* odległość środka pierwszego miejsca od krawędzi toru */
  --asl-inset: calc(var(--asl-thumb) / 2);
  display: grid;
  min-width: 0;
}
/* tor na skali dużego znaku (48 px): skrajne miejsca pół wysokości znaku od krawędzi */
.asl--aligned {
  --asl-inset: 1.5rem;
}
.asl__track {
  position: relative;
  height: var(--asl-thumb);
  border-radius: var(--mg-radius-pill);
  outline: none;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.asl__track:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 3px;
}
.asl__rail,
.asl__fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 0.625rem;
  border-radius: var(--mg-radius-pill);
  translate: 0 -50%;
}
.asl__rail {
  right: 0;
  background: var(--mg-color-veil-strong);
  box-shadow: var(--mg-shadow-inset-sm);
}
.asl__stop,
.asl__ghost,
.asl__thumb,
.asl__fill {
  --asl-x: calc(var(--asl-inset) + (var(--asl-at) - 1) * (100% - 2 * var(--asl-inset)) / 4);
}
.asl__fill {
  width: var(--asl-x);
  transition: width var(--mg-duration-normal) var(--mg-ease-standard);
}
/* pięć miejsc skali: ledwie widoczne, wyraźniejsze, gdy tor czeka na ocenę albo jest pod kursorem */
.asl__stop {
  position: absolute;
  top: 50%;
  left: var(--asl-x);
  width: 4px;
  height: 4px;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-data-ink-soft);
  translate: -50% -50%;
  opacity: 0.45;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.asl.is-unset .asl__stop,
.asl__track:hover .asl__stop {
  opacity: 1;
}
/* cień gałki pod kursorem: „tu stanie” */
.asl__ghost {
  position: absolute;
  top: 50%;
  left: var(--asl-x);
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-veil-strong);
  box-shadow: var(--mg-shadow-inset-sm);
  translate: -50% -50%;
  pointer-events: none;
}
/* gałka: mała chmura, w środku znaczek osi w kolorze pary */
.asl__thumb {
  position: absolute;
  top: 0;
  left: var(--asl-x);
  display: grid;
  place-items: center;
  width: var(--asl-thumb);
  height: var(--asl-thumb);
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-control);
  translate: -50% 0;
  cursor: grab;
  transition:
    left var(--mg-duration-normal) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.asl__track:hover .asl__thumb,
.asl.is-live .asl__thumb {
  box-shadow: var(--mg-shadow-control-hover);
  translate: -50% var(--mg-lift-hover);
}
.asl.is-live .asl__thumb {
  cursor: grabbing;
}
.asl__thumb b {
  background: var(--asl-mark);
}
.asl--state .asl__thumb b {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: var(--mg-radius-organic-c);
}
.asl--load .asl__thumb b {
  width: 0.75rem;
  height: 0.3125rem;
  border-radius: var(--mg-radius-pill);
}
/* słowa końców skali: widoczne, gdy oś czeka na ocenę albo suwak jest w użyciu */
.asl__ends {
  display: flex;
  justify-content: space-between;
  gap: var(--mg-space-3);
  min-height: 1.125rem;
  padding-top: 2px;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.asl.is-unset .asl__ends,
.asl:hover .asl__ends,
.asl:focus-within .asl__ends,
.asl.is-live .asl__ends {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .asl__fill,
  .asl__thumb {
    transition: none;
  }
}
</style>
