<template>
  <div class="ds-rating" :class="{ 'ds-rating--quiet': quiet }">
    <!-- The value above the stack; empty until the first tap, so "no answer" reads as no answer. -->
    <output
      class="ds-rating__value"
      :class="{ 'is-empty': modelValue == null }"
      :aria-label="`${label}: ${modelValue ?? emptyLabel}`"
      >{{ modelValue ?? '' }}</output
    >
    <div class="ds-rating__stack">
      <div v-if="lowLabel || highLabel" class="ds-rating__ends" aria-hidden="true">
        <span>{{ highLabel }}</span>
        <span>{{ lowLabel }}</span>
      </div>
      <div
        class="ds-rating__bars"
        role="radiogroup"
        :aria-label="label"
        @keydown.up.prevent="shift(1)"
        @keydown.right.prevent="shift(1)"
        @keydown.down.prevent="shift(-1)"
        @keydown.left.prevent="shift(-1)"
        @keydown.delete.prevent="emit('update:modelValue', null)"
        @keydown.backspace.prevent="emit('update:modelValue', null)"
      >
        <button
          v-for="n in values"
          :key="n"
          type="button"
          role="radio"
          :class="{
            'is-filled': modelValue != null && n <= modelValue,
            'is-on': n === modelValue,
            'is-ghost': ghostValue != null && n <= ghostValue,
          }"
          :aria-checked="n === modelValue"
          :aria-label="`${n}`"
          :title="
            ghostValue != null && n <= ghostValue ? `${ghostLabel}: ${ghostValue}` : undefined
          "
          :tabindex="n === (modelValue ?? min) ? 0 : -1"
          @click="emit('update:modelValue', n === modelValue ? null : n)"
        />
      </div>
    </div>
    <div class="ds-rating__steps">
      <button
        type="button"
        class="ds-rating__step"
        :aria-label="`${decreaseLabel}: ${label}`"
        :disabled="modelValue == null"
        @click="shift(-1)"
      >
        <AppIcon name="remove" />
      </button>
      <button
        type="button"
        class="ds-rating__step"
        :aria-label="`${increaseLabel}: ${label}`"
        :disabled="modelValue === max"
        @click="shift(1)"
      >
        <AppIcon name="add" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

/**
 * The one rating stack of the app (design decision 2026-11-01): a short
 * scale (up to five steps) drawn as clouds that fill from the bottom, the
 * value above, −/+ below. `null` = not rated yet — nothing is preset.
 *
 * Hosts: `QuietRatingBar` (weekly/monthly rituals, `quiet`) and the micro
 * runner's short scales. `quiet` hides the empty clouds and the end labels
 * until the stack is in use (a ritual card full of answers stays calm);
 * without it both are always visible (a single question inside a step).
 *
 * Colours and sizes are CSS custom properties so a host can recolour or
 * densify without touching the anatomy: `--ds-rating-fill`,
 * `--ds-rating-bar-width`, `--ds-rating-bar-height`, `--ds-rating-gap`,
 * `--ds-rating-step-size`; the value's size is the token `--mg-font-size-rating`,
 * which a host may re-point in its own subtree (e.g. the compact compass).
 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    label: string
    min?: number
    max?: number
    lowLabel?: string
    highLabel?: string
    /** Last period's value, drawn as a faint wash until this stack carries a value. */
    ghost?: number | null
    ghostLabel?: string
    quiet?: boolean
    emptyLabel?: string
    decreaseLabel?: string
    increaseLabel?: string
  }>(),
  {
    min: 1,
    max: 5,
    lowLabel: '',
    highLabel: '',
    ghost: null,
    ghostLabel: 'Poprzednio',
    quiet: false,
    emptyLabel: 'bez oceny',
    decreaseLabel: 'Zmniejsz',
    increaseLabel: 'Zwiększ',
  }
)
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const values = computed(() =>
  Array.from({ length: Math.max(0, props.max - props.min + 1) }, (_, i) => props.min + i)
)
/** The ghost is a trace of last time, never an answer: it disappears once there is a value. */
const ghostValue = computed(() => (props.modelValue == null ? props.ghost : null))

/** Below the minimum the stack empties again; above the maximum it stays. */
function shift(delta: number): void {
  const current = props.modelValue
  if (current == null) {
    if (delta > 0) emit('update:modelValue', props.min)
    return
  }
  const next = current + delta
  if (next < props.min) emit('update:modelValue', null)
  else if (next <= props.max && next !== current) emit('update:modelValue', next)
}
</script>

<style scoped>
/* Defaults at zero specificity, so any host rule recolours or densifies the stack. */
:where(.ds-rating) {
  --ds-rating-fill: var(--mg-color-primary);
  --ds-rating-line: color-mix(in srgb, var(--mg-color-primary) 26%, transparent);
  --ds-rating-line-strong: color-mix(in srgb, var(--mg-color-primary-strong) 55%, transparent);
  --ds-rating-ghost: color-mix(in srgb, var(--mg-color-ink) 8%, transparent);
  --ds-rating-bar-width: 8.5rem;
  --ds-rating-bar-height: 2rem;
  --ds-rating-gap: 7px;
  --ds-rating-step-size: 2.25rem;
}

.ds-rating {
  display: grid;
  justify-items: center;
  gap: var(--mg-space-1);
}

.ds-rating__value {
  min-height: calc(var(--mg-font-size-rating) * 1.2);
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-rating);
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.ds-rating__stack {
  position: relative;
  display: grid;
  grid-template-columns: auto auto;
  column-gap: var(--mg-space-4);
  align-items: stretch;
}

/* End labels beside the stack: the high end up, the low end down. */
.ds-rating__ends {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--mg-space-2) 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  text-align: right;
  white-space: nowrap;
}

.ds-rating__bars {
  grid-column: -2 / -1;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--ds-rating-gap);
  padding: 4px 0;
}

/* Clouds: organic radii, a hair of rotation, outlined until filled. */
.ds-rating__bars button {
  width: var(--ds-rating-bar-width);
  height: var(--ds-rating-bar-height);
  padding: 0;
  border: 1px solid var(--ds-rating-line);
  border-radius: var(--mg-radius-cloud-a);
  background: transparent;
  cursor: pointer;
  transform: rotate(-0.9deg);
  transition:
    background var(--mg-duration-fast) ease,
    border-color var(--mg-duration-fast) ease,
    opacity var(--mg-duration-fast) ease;
}

.ds-rating__bars button:nth-child(2n) {
  border-radius: var(--mg-radius-cloud-b);
  transform: rotate(0.9deg);
}

.ds-rating__bars button:hover {
  border-color: var(--ds-rating-line-strong);
  background: var(--mg-color-sky-well);
}

.ds-rating__bars button.is-ghost {
  background: var(--ds-rating-ghost);
}

.ds-rating__bars button.is-filled {
  border-color: transparent;
  background: var(--ds-rating-fill);
}

.ds-rating__bars button.is-filled:nth-child(1) {
  opacity: 0.5;
}

.ds-rating__bars button.is-filled:nth-child(2) {
  opacity: 0.62;
}

.ds-rating__bars button.is-filled:nth-child(3) {
  opacity: 0.74;
}

.ds-rating__bars button.is-filled:nth-child(4) {
  opacity: 0.87;
}

.ds-rating__bars button.is-on {
  opacity: 1;
}

.ds-rating__bars button:focus-visible,
.ds-rating__step:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

.ds-rating__steps {
  display: flex;
  gap: 10px;
  margin-top: var(--mg-space-1);
}

.ds-rating__step {
  display: grid;
  place-items: center;
  width: var(--ds-rating-step-size);
  height: var(--ds-rating-step-size);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--mg-color-paper);
  /* Icons inside controls follow the app accent, never ink. */
  color: var(--mg-color-primary);
  cursor: pointer;
  transition:
    background var(--mg-duration-fast) ease,
    color var(--mg-duration-fast) ease;
}

.ds-rating__step:hover:not(:disabled) {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}

.ds-rating__step:disabled {
  opacity: 0.35;
  cursor: default;
}

/* Quiet (ritual cards): the empty clouds and the end labels wait until the
   stack is in use; the labels hang to the left so the column stays centred. */
.ds-rating--quiet .ds-rating__stack {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ds-rating--quiet .ds-rating__ends {
  position: absolute;
  right: calc(100% + 10px);
  inset-block: 0;
  font-size: var(--mg-font-size-chart);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) ease;
}

.ds-rating--quiet:hover .ds-rating__ends,
.ds-rating--quiet:focus-within .ds-rating__ends {
  opacity: 1;
}

.ds-rating--quiet .ds-rating__bars button:not(.is-filled) {
  border-color: transparent;
}

.ds-rating--quiet .ds-rating__bars:hover button:not(.is-filled),
.ds-rating--quiet .ds-rating__bars:focus-within button:not(.is-filled) {
  border-color: var(--ds-rating-line);
}

.ds-rating--quiet .ds-rating__bars button:not(.is-filled):hover {
  border-color: var(--ds-rating-line-strong);
  background: transparent;
}

.ds-rating--quiet .ds-rating__bars button.is-ghost:not(.is-filled) {
  background: var(--ds-rating-ghost);
}

@media (prefers-reduced-motion: reduce) {
  .ds-rating__bars button,
  .ds-rating__step,
  .ds-rating--quiet .ds-rating__ends {
    transition: none;
  }
}
</style>
