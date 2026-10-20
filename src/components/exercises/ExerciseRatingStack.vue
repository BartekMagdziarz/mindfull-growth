<template>
  <div class="exercise-stack">
    <!-- The value above the stack; empty until the first tap, so "no answer" reads as no answer. -->
    <output
      class="exercise-stack__value"
      :class="{ 'is-empty': modelValue == null }"
      :aria-label="`${ariaLabel}: ${modelValue ?? emptyLabel}`"
      >{{ modelValue ?? '' }}</output
    >
    <div class="exercise-stack__stack">
      <div v-if="minLabel || maxLabel" class="exercise-stack__ends" aria-hidden="true">
        <span>{{ maxLabel }}</span>
        <span>{{ minLabel }}</span>
      </div>
      <div
        class="exercise-stack__bars"
        role="radiogroup"
        :aria-label="ariaLabel"
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
          :class="{ 'is-filled': modelValue != null && n <= modelValue, 'is-on': n === modelValue }"
          :aria-checked="n === modelValue"
          :aria-label="`${n}`"
          :tabindex="n === (modelValue ?? min) ? 0 : -1"
          @click="emit('update:modelValue', n === modelValue ? null : n)"
        />
      </div>
    </div>
    <div class="exercise-stack__steps">
      <button
        type="button"
        class="exercise-stack__step"
        :aria-label="`${decreaseLabel}: ${ariaLabel}`"
        :disabled="modelValue == null"
        @click="shift(-1)"
      >
        <AppIcon name="remove" />
      </button>
      <button
        type="button"
        class="exercise-stack__step"
        :aria-label="`${increaseLabel}: ${ariaLabel}`"
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
 * A short scale (up to five steps) as the reflection's cloud stack: bars
 * fill from the bottom, the value sits above, −/+ below. `null` = not
 * rated yet — the step waits for a tap instead of presetting the middle.
 * Same recipe as the weekly reflection's QuietRatingBar, on the product
 * tokens and without that card's chrome, so it can live inside a step.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    min?: number
    max?: number
    minLabel?: string
    maxLabel?: string
    ariaLabel?: string
    emptyLabel?: string
    decreaseLabel?: string
    increaseLabel?: string
  }>(),
  {
    min: 1,
    max: 5,
    minLabel: '',
    maxLabel: '',
    ariaLabel: '',
    emptyLabel: 'bez oceny',
    decreaseLabel: 'Zmniejsz',
    increaseLabel: 'Zwiększ',
  }
)
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

const values = computed(() =>
  Array.from({ length: Math.max(0, props.max - props.min + 1) }, (_, i) => props.min + i)
)

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
.exercise-stack {
  display: grid;
  justify-items: center;
  gap: var(--mg-space-1);
}

.exercise-stack__value {
  min-height: 2.125rem;
  color: var(--mg-color-ink);
  font-size: 1.75rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.exercise-stack__stack {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: var(--mg-space-4);
  align-items: stretch;
}

/* End labels beside the stack: the high end up, the low end down. */
.exercise-stack__ends {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--mg-space-2) 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
  text-align: right;
  white-space: nowrap;
}

.exercise-stack__bars {
  display: flex;
  flex-direction: column-reverse;
  gap: 7px;
  padding: 4px 0;
}

.exercise-stack__bars:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 6px;
  border-radius: 14px;
}

/* Clouds: organic radii, a hair of rotation, outlined until filled. */
.exercise-stack__bars button {
  width: 8.5rem;
  height: 2rem;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--mg-color-primary) 26%, transparent);
  border-radius: 14px 18px 12px 16px / 55% 45% 60% 40%;
  background: transparent;
  cursor: pointer;
  transform: rotate(-0.9deg);
  transition:
    background var(--mg-duration-fast) ease,
    border-color var(--mg-duration-fast) ease,
    opacity var(--mg-duration-fast) ease;
}

.exercise-stack__bars button:nth-child(2n) {
  border-radius: 17px 13px 18px 12px / 45% 60% 40% 55%;
  transform: rotate(0.9deg);
}

.exercise-stack__bars button:hover {
  border-color: color-mix(in srgb, var(--mg-color-primary) 55%, transparent);
  background: var(--mg-color-sky-well);
}

.exercise-stack__bars button.is-filled {
  border-color: transparent;
  background: var(--mg-color-primary);
}

.exercise-stack__bars button.is-filled:nth-child(1) {
  opacity: 0.5;
}

.exercise-stack__bars button.is-filled:nth-child(2) {
  opacity: 0.62;
}

.exercise-stack__bars button.is-filled:nth-child(3) {
  opacity: 0.74;
}

.exercise-stack__bars button.is-filled:nth-child(4) {
  opacity: 0.87;
}

.exercise-stack__bars button.is-on {
  opacity: 1;
}

.exercise-stack__bars button:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

.exercise-stack__steps {
  display: flex;
  gap: 10px;
  margin-top: var(--mg-space-1);
}

.exercise-stack__step {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--mg-color-paper);
  color: var(--mg-color-muted);
  cursor: pointer;
  transition:
    background var(--mg-duration-fast) ease,
    color var(--mg-duration-fast) ease;
}

.exercise-stack__step:hover:not(:disabled) {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}

.exercise-stack__step:disabled {
  opacity: 0.45;
  cursor: default;
}

.exercise-stack__step:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}
</style>
