<template>
  <div :class="compact ? 'space-y-1' : 'space-y-2'">
    <div class="flex items-center justify-between">
      <label class="text-sm font-medium text-on-surface">{{ label }}</label>
      <span class="text-sm font-semibold text-primary">{{ modelValue }}/{{ max }}</span>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      step="1"
      :value="modelValue"
      class="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-outline/20"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
    <div v-if="!compact || lowLabel || highLabel" class="flex justify-between text-xs text-on-surface-variant">
      <template v-if="lowLabel || highLabel">
        <span>{{ lowLabel ?? min }}</span>
        <span>{{ highLabel ?? max }}</span>
      </template>
      <template v-else>
        <span>{{ min }}</span>
        <span>{{ Math.floor((min + max) / 2) }}</span>
        <span>{{ max }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
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
</script>
