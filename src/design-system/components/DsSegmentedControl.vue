<template>
  <div class="mg-v2-segmented" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
defineProps<{
  label: string
  modelValue: T
  options: Array<{ value: T; label: string }>
}>()

defineEmits<{ 'update:modelValue': [value: T] }>()
</script>
