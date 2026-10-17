<template>
  <div class="exercise-scale">
    <div
      class="exercise-scale__row"
      role="radiogroup"
      :aria-label="ariaLabel"
      @keydown.left.prevent="shift(-1)"
      @keydown.down.prevent="shift(-1)"
      @keydown.right.prevent="shift(1)"
      @keydown.up.prevent="shift(1)"
    >
      <button
        v-for="n in values"
        :key="n"
        type="button"
        role="radio"
        :class="{ 'is-on': n === modelValue }"
        :aria-checked="n === modelValue"
        :aria-label="`${n}`"
        :tabindex="n === modelValue ? 0 : -1"
        @click="emit('update:modelValue', n)"
      >
        {{ n }}
      </button>
    </div>
    <div v-if="minLabel || maxLabel" class="exercise-scale__ends" aria-hidden="true">
      <span>{{ minLabel }}</span>
      <span>{{ maxLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Discrete scale (1–5, 0–10) as a row of numbered buttons, the picked one
 * filled in the accent — the week reflection's scale row, not a slider.
 * Arrow keys move the value; the ends carry the min/max labels.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    minLabel?: string
    maxLabel?: string
    ariaLabel?: string
  }>(),
  { min: 1, max: 5, minLabel: '', maxLabel: '', ariaLabel: '' },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const values = computed(() =>
  Array.from({ length: Math.max(0, props.max - props.min + 1) }, (_, i) => props.min + i),
)

function shift(delta: number): void {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta))
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<style scoped>
.exercise-scale {
  display: grid;
  gap: var(--mg-space-1);
}

.exercise-scale__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}

.exercise-scale__row button {
  width: 2.5rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: var(--mg-color-paper);
  color: var(--mg-color-ink);
  font: inherit;
  font-size: var(--mg-font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--mg-duration-fast) ease,
    color var(--mg-duration-fast) ease;
}

.exercise-scale__row button:hover {
  background: var(--mg-color-sky-well);
  color: var(--mg-color-primary-strong);
}

.exercise-scale__row button.is-on,
.exercise-scale__row button.is-on:hover {
  background: var(--mg-color-primary-fill);
  color: var(--mg-color-on-primary);
}

.exercise-scale__row button:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

.exercise-scale__ends {
  display: flex;
  justify-content: space-between;
  gap: var(--mg-space-2);
  font-size: var(--mg-font-size-xs);
  color: var(--mg-color-muted);
}
</style>
