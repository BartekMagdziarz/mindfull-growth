<template>
  <label class="mg-v2-field-wrap">
    <span v-if="label" class="mg-v2-field-wrap__label">{{ label }}</span>
    <textarea
      v-if="multiline"
      class="mg-v2-field"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      class="mg-v2-field"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <small v-if="hint">{{ hint }}</small>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  label?: string
  hint?: string
  placeholder?: string
  multiline?: boolean
  rows?: number
}>(), {
  label: '',
  hint: '',
  placeholder: '',
  multiline: false,
  rows: 4,
})

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
