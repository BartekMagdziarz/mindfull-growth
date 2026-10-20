<template>
  <div :class="compact ? 'space-y-1' : 'space-y-2'">
    <div class="flex items-center justify-between">
      <label :for="inputId" class="text-sm font-medium text-on-surface">{{ label }}</label>
      <!-- The row of tiles shows the value itself; only the range needs a readout. -->
      <span v-if="!discrete" class="text-sm font-semibold text-primary">{{ modelValue }}/{{ max }}</span>
    </div>
    <ExerciseScaleRow
      v-if="discrete"
      :model-value="modelValue"
      :min="min"
      :max="max"
      :min-label="lowLabel ?? ''"
      :max-label="highLabel ?? ''"
      :aria-label="label"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <template v-else>
      <input
        type="range"
        :id="inputId"
        :min="min"
        :max="max"
        step="1"
        :value="modelValue"
        class="exercise-rating w-full cursor-pointer"
        @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
      <div v-if="!compact || lowLabel || highLabel" class="flex justify-between text-xs text-on-surface-variant">
        <span>{{ lowLabel ?? min }}</span>
        <span>{{ highLabel ?? max }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import ExerciseScaleRow from './ExerciseScaleRow.vue'

/**
 * A labelled rating. Up to eleven whole steps (1–5, 1–10, 0–10) render as
 * the reflection's row of numbered tiles; wider scales keep a range input.
 */
const inputId = useId()
const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min?: number
    max?: number
    compact?: boolean
    lowLabel?: string
    highLabel?: string
  }>(),
  {
    min: 1,
    max: 10,
    compact: false,
  },
)

defineEmits<{
  'update:modelValue': [value: number]
}>()

const discrete = computed(() => props.max - props.min <= 10)
</script>
