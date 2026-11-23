<template>
  <div
    class="aac"
    :class="[`aac--${axis}`, { 'is-unset': value == null, 'is-awake': awake }]"
    role="spinbutton"
    tabindex="0"
    :aria-label="label"
    aria-valuemin="1"
    aria-valuemax="5"
    :aria-valuenow="value ?? undefined"
    :aria-valuetext="valueText"
    @keydown.left.prevent="step(-1, false)"
    @keydown.down.prevent="step(-1, false)"
    @keydown.right.prevent="step(1, false)"
    @keydown.up.prevent="step(1, false)"
    @keydown.home.prevent="set(1)"
    @keydown.end.prevent="set(5)"
    @keydown.delete.prevent="set(null)"
    @keydown.backspace.prevent="set(null)"
  >
    <button type="button" class="aac__nudge" tabindex="-1" :aria-label="`${label}: mniej`" :disabled="value == null" @click="step(-1)" @pointerenter="hint(-1)" @pointerleave="hint(0)">
      <AppIcon name="chevron_left" />
    </button>

    <strong class="aac__number">{{ value ?? '–' }}</strong>

    <button type="button" class="aac__nudge" tabindex="-1" :aria-label="`${label}: więcej`" :disabled="value === 5" @click="step(1)" @pointerenter="hint(1)" @pointerleave="hint(0)">
      <AppIcon name="chevron_right" />
    </button>

    <span class="aac__end aac__end--low" aria-hidden="true">{{ low }}</span>
    <span class="aac__end aac__end--high" aria-hidden="true">{{ high }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { MaybeRating } from '@product/domain/loadState'
import { steppedRating, type AxisKey } from '~lab/lab/areaRatingStep'

/**
 * Runda 5 · licznik oceny jednej osi (prośba usera 22.11): sama duża cyfra, po
 * bokach strzałki-chmury, które budzą się pod kursorem; bez oceny widać je od
 * razu, bo pusty licznik musi zapraszać. Pod strzałkami stoją słowa końców
 * skali. Strzałka pod kursorem pokazuje na znaku cień następnej oceny. Zejście
 * poniżej 1 czyści ocenę, jak w `DsRatingStack`.
 */
const props = defineProps<{
  axis: AxisKey
  load: MaybeRating
  state: MaybeRating
  low: string
  high: string
  label: string
  /** Pole osi jest pod kursorem: strzałki i słowa końców skali się budzą. */
  awake?: boolean
}>()
const emit = defineEmits<{ rate: [value: number | null]; preview: [value: number | null] }>()

const value = computed(() => props[props.axis])
const valueText = computed(() => {
  if (value.value == null) return 'bez oceny'
  if (value.value === 1) return props.low
  if (value.value === 5) return props.high
  return `${value.value} z 5`
})

/** Miejsce skali, na które wskazuje strzałka pod kursorem. */
const ghost = ref<number | null>(null)

/** `pointer`: klik w strzałkę — kursor na niej zostaje, więc podgląd przechodzi o stopień dalej. Klawiatura podglądu nie ma. */
function step(delta: number, pointer = true) {
  const next = steppedRating(value.value, delta)
  if (next === value.value) return
  emit('rate', next)
  setGhost(pointer && next != null ? steppedRating(next, delta) : null, next)
}
function set(next: MaybeRating) {
  emit('rate', next)
  setGhost(null, next)
}
function hint(delta: number) {
  setGhost(delta === 0 ? null : steppedRating(value.value, delta), value.value)
}
function setGhost(next: MaybeRating, current: MaybeRating) {
  const shown = next != null && next !== current ? next : null
  if (ghost.value === shown) return
  ghost.value = shown
  emit('preview', shown)
}
</script>

<style scoped>
/* dwie klasy w selektorach przycisków: `.quiet-ritual button` bije pojedynczą */
.aac {
  --aac-nudge: 2.75rem;
  display: grid;
  grid-template-columns: minmax(var(--aac-nudge), 1fr) auto minmax(var(--aac-nudge), 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: var(--mg-space-3);
  row-gap: 2px;
  border-radius: var(--mg-radius-md);
  outline: none;
}
.aac:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 4px;
}
.aac__number {
  grid-area: 1 / 2;
  min-width: 4.5rem;
  text-align: center;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-2xl);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.aac.is-unset .aac__number {
  color: var(--mg-color-muted);
  opacity: 0.55;
}
/* strzałki: chmury, które budzą się pod kursorem; pusty licznik pokazuje je od razu */
.aac .aac__nudge {
  grid-row: 1;
  display: grid;
  place-items: center;
  width: var(--aac-nudge);
  height: var(--aac-nudge);
  padding: 0;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary-strong);
  box-shadow: var(--mg-shadow-control);
  opacity: 0;
  cursor: pointer;
  transition:
    opacity var(--mg-duration-fast) var(--mg-ease-standard),
    box-shadow var(--mg-duration-fast) var(--mg-ease-standard),
    translate var(--mg-duration-fast) var(--mg-ease-standard);
}
.aac .aac__nudge:first-of-type {
  grid-column: 1;
  justify-self: end;
}
.aac .aac__nudge:last-of-type {
  grid-column: 3;
  justify-self: start;
}
.aac:hover .aac__nudge,
.aac.is-awake .aac__nudge,
.aac:focus-visible .aac__nudge,
.aac.is-unset .aac__nudge {
  opacity: 1;
}
.aac .aac__nudge:hover:not(:disabled) {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.aac .aac__nudge:disabled {
  box-shadow: none;
  opacity: 0;
  cursor: default;
}
.aac:hover .aac__nudge:disabled,
.aac.is-awake .aac__nudge:disabled,
.aac.is-unset .aac__nudge:disabled {
  opacity: 0.3;
}
.aac__nudge :deep(.app-icon) {
  color: var(--mg-color-primary);
  font-size: var(--mg-font-size-icon-lg);
}

/* słowa końców skali pod strzałkami: mówią, co znaczy „mniej” i „więcej” */
.aac__end {
  grid-row: 2;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.aac__end--low {
  grid-column: 1;
  justify-self: end;
  min-width: var(--aac-nudge);
  text-align: center;
}
.aac__end--high {
  grid-column: 3;
  justify-self: start;
  min-width: var(--aac-nudge);
  text-align: center;
}
.aac:hover .aac__end,
.aac.is-awake .aac__end,
.aac:focus-visible .aac__end,
.aac.is-unset .aac__end {
  opacity: 1;
}
</style>
