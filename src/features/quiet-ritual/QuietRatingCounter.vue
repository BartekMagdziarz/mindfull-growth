<template>
  <div
    class="qr-counter"
    :class="{ 'is-unset': modelValue == null, 'is-awake': awake }"
    role="spinbutton"
    tabindex="0"
    :aria-label="label"
    aria-valuemin="1"
    aria-valuemax="5"
    :aria-valuenow="modelValue ?? undefined"
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
    <button
      type="button"
      class="qr-counter__nudge"
      tabindex="-1"
      :aria-label="`${label}: mniej`"
      :disabled="modelValue == null"
      @click="step(-1)"
      @pointerenter="hint(-1)"
      @pointerleave="hint(0)"
    >
      <AppIcon name="chevron_left" />
    </button>

    <strong class="qr-counter__number">{{ modelValue ?? '–' }}</strong>

    <button
      type="button"
      class="qr-counter__nudge"
      tabindex="-1"
      :aria-label="`${label}: więcej`"
      :disabled="modelValue === 5"
      @click="step(1)"
      @pointerenter="hint(1)"
      @pointerleave="hint(0)"
    >
      <AppIcon name="chevron_right" />
    </button>

    <template v-if="lowLabel || highLabel">
      <span class="qr-counter__end qr-counter__end--low" aria-hidden="true">{{ lowLabel }}</span>
      <span class="qr-counter__end qr-counter__end--high" aria-hidden="true">{{ highLabel }}</span>
    </template>
    <span v-else-if="previous != null" class="qr-counter__previous">
      {{ previousLabel }}: {{ previous }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { steppedRating } from './quietRitualModel'

/**
 * Rating counter of one axis in an area step of the weekly reflection
 * (decision 2026-11-22): one big digit with a cloud arrow on each side. The
 * arrows and the words for the two ends of the scale wake while the field is
 * hovered (`awake`) or the counter has keyboard focus; an unrated counter
 * shows them at once, because an empty control has to invite. An arrow under
 * the cursor emits `preview` so the mark can draw where the rating would land.
 * Stepping below 1 clears the rating, as in `DsRatingStack`.
 *
 * A scale without words for its ends (the monthly compass) can show the same
 * rating one period earlier instead (`previous`) — the counter's version of
 * the ghost that `DsRatingStack` draws.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    /** Accessible name, e.g. „Ciało · Obciążenie”. */
    label: string
    lowLabel?: string
    highLabel?: string
    /** The same rating one period earlier; shown only when the scale has no end words. */
    previous?: number | null
    previousLabel?: string
    /** The field around the counter is hovered. */
    awake?: boolean
  }>(),
  { lowLabel: '', highLabel: '', previous: null, previousLabel: 'Poprzednio', awake: false }
)
const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  preview: [value: number | null]
}>()

const valueText = computed(() => {
  if (props.modelValue == null) return 'bez oceny'
  if (props.modelValue === 1 && props.lowLabel) return props.lowLabel
  if (props.modelValue === 5 && props.highLabel) return props.highLabel
  return `${props.modelValue} z 5`
})

/** The rating the arrow under the cursor points at. */
const ghost = ref<number | null>(null)

/** `pointer`: a click on an arrow — the cursor stays on it, so the preview moves one place on. The keyboard has no preview. */
function step(delta: number, pointer = true) {
  const next = steppedRating(props.modelValue, delta)
  if (next === props.modelValue) return
  emit('update:modelValue', next)
  setGhost(pointer && next != null ? steppedRating(next, delta) : null, next)
}
function set(next: number | null) {
  emit('update:modelValue', next)
  setGhost(null, next)
}
function hint(delta: number) {
  setGhost(delta === 0 ? null : steppedRating(props.modelValue, delta), props.modelValue)
}
function setGhost(next: number | null, current: number | null) {
  const shown = next != null && next !== current ? next : null
  if (ghost.value === shown) return
  ghost.value = shown
  emit('preview', shown)
}
</script>

<style scoped>
/* Two classes in button selectors: `.quiet-ritual button` beats a single one. */
.qr-counter {
  --qr-counter-nudge: 2.75rem;
  display: grid;
  grid-template-columns:
    minmax(var(--qr-counter-nudge), 1fr)
    auto
    minmax(var(--qr-counter-nudge), 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: var(--mg-space-3);
  row-gap: 2px;
  border-radius: var(--mg-radius-md);
  outline: none;
}
.qr-counter:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 4px;
}
.qr-counter__number {
  grid-area: 1 / 2;
  min-width: 4.5rem;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-2xl);
  font-weight: var(--mg-weight-title);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
}
.qr-counter.is-unset .qr-counter__number {
  color: var(--mg-color-muted);
  opacity: 0.55;
}

/* arrows: clouds that wake under the cursor; an empty counter shows them at once */
.qr-counter .qr-counter__nudge {
  grid-row: 1;
  display: grid;
  place-items: center;
  width: var(--qr-counter-nudge);
  height: var(--qr-counter-nudge);
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
.qr-counter .qr-counter__nudge:first-of-type {
  grid-column: 1;
  justify-self: end;
}
.qr-counter .qr-counter__nudge:last-of-type {
  grid-column: 3;
  justify-self: start;
}
.qr-counter:hover .qr-counter__nudge,
.qr-counter.is-awake .qr-counter__nudge,
.qr-counter:focus-visible .qr-counter__nudge,
.qr-counter.is-unset .qr-counter__nudge {
  opacity: 1;
}
.qr-counter .qr-counter__nudge:hover:not(:disabled) {
  box-shadow: var(--mg-shadow-control-hover);
  translate: 0 var(--mg-lift-hover);
}
.qr-counter .qr-counter__nudge:disabled {
  box-shadow: none;
  opacity: 0;
  cursor: default;
}
.qr-counter:hover .qr-counter__nudge:disabled,
.qr-counter.is-awake .qr-counter__nudge:disabled,
.qr-counter.is-unset .qr-counter__nudge:disabled {
  opacity: 0.3;
}
.qr-counter__nudge :deep(.app-icon) {
  color: var(--mg-color-primary);
  font-size: var(--mg-font-size-icon-lg);
}

/* the words under the arrows say what "less" and "more" mean */
.qr-counter__end {
  grid-row: 2;
  min-width: var(--qr-counter-nudge);
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.qr-counter__end--low {
  grid-column: 1;
  justify-self: end;
}
.qr-counter__end--high {
  grid-column: 3;
  justify-self: start;
}
.qr-counter:hover .qr-counter__end,
.qr-counter.is-awake .qr-counter__end,
.qr-counter:focus-visible .qr-counter__end,
.qr-counter.is-unset .qr-counter__end {
  opacity: 1;
}
/* the rating one period earlier: one quiet line under the digit, same waking rule */
.qr-counter__previous {
  grid-area: 2 / 1 / auto / -1;
  justify-self: center;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-chart);
  font-weight: var(--mg-weight-label);
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}
.qr-counter:hover .qr-counter__previous,
.qr-counter.is-awake .qr-counter__previous,
.qr-counter:focus-visible .qr-counter__previous,
.qr-counter.is-unset .qr-counter__previous {
  opacity: 1;
}
</style>
