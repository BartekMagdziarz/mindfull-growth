<template>
  <input
    type="range"
    class="exercise-range"
    :min="min"
    :max="max"
    :step="step"
    :value="modelValue"
    :style="{ '--exercise-range-fill': `${fill}%` }"
    @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Range input in the V2 control language: a sky-well track (like the
 * switch), the filled part in the accent, a paper thumb with the small
 * raised shadow. Native ranges render a dark track and a white box.
 */
const props = withDefaults(
  defineProps<{ modelValue: number; min?: number; max?: number; step?: number }>(),
  { min: 0, max: 100, step: 1 },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const fill = computed(() => {
  const span = props.max - props.min
  return span > 0 ? Math.min(100, Math.max(0, ((props.modelValue - props.min) / span) * 100)) : 0
})
</script>

<style scoped>
.exercise-range {
  width: 100%;
  height: 1.5rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.exercise-range::-webkit-slider-runnable-track {
  height: 0.375rem;
  border-radius: var(--mg-radius-pill);
  background: linear-gradient(
    to right,
    var(--mg-color-primary) 0 var(--exercise-range-fill),
    var(--mg-color-sky-well) var(--exercise-range-fill) 100%
  );
  box-shadow: var(--mg-shadow-inset-sm);
}

.exercise-range::-moz-range-track {
  height: 0.375rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-sky-well);
  box-shadow: var(--mg-shadow-inset-sm);
}

.exercise-range::-moz-range-progress {
  height: 0.375rem;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-primary);
}

.exercise-range::-webkit-slider-thumb {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: -0.375rem;
  border: 1px solid var(--mg-color-primary);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
  -webkit-appearance: none;
}

.exercise-range::-moz-range-thumb {
  width: 1.125rem;
  height: 1.125rem;
  border: 1px solid var(--mg-color-primary);
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
}

.exercise-range:focus-visible {
  outline: none;
}

.exercise-range:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--mg-color-primary);
  outline-offset: 2px;
}

.exercise-range:focus-visible::-moz-range-thumb {
  outline: 2px solid var(--mg-color-primary);
  outline-offset: 2px;
}
</style>
