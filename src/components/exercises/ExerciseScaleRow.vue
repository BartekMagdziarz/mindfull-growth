<template>
  <div class="exercise-scale" :style="{ '--scale-n': values.length }">
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
        class="exercise-chip"
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
 * Discrete scale (1–5, 0–10) as a row of numbered tiles, the picked one
 * filled in the accent — the week reflection's scale row, not a slider.
 * The tiles share the answer zone's full width (a grid of N columns), so
 * the end labels sit under the first and the last tile.
 * Arrow keys move the value.
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
  { min: 1, max: 5, minLabel: '', maxLabel: '', ariaLabel: '' }
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const values = computed(() =>
  Array.from({ length: Math.max(0, props.max - props.min + 1) }, (_, i) => props.min + i)
)

function shift(delta: number): void {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta))
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<style scoped>
.exercise-scale {
  display: grid;
  gap: var(--mg-space-2);
}

.exercise-scale__row {
  display: grid;
  grid-template-columns: repeat(var(--scale-n, 5), minmax(0, 1fr));
  gap: var(--mg-space-2);
}

.exercise-scale__row .exercise-chip {
  align-items: center;
  height: 2.75rem;
  padding: 0;
  font-size: var(--mg-font-size-md);
}

.exercise-scale__ends {
  display: flex;
  justify-content: space-between;
  gap: var(--mg-space-2);
  padding-inline: var(--mg-space-1);
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
}
</style>
