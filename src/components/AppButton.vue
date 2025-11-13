<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'filled',
  disabled: false,
})

defineEmits<{
  click: [event: Event]
}>()

const buttonClasses = computed(() => {
  const baseClasses =
    'px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  switch (props.variant) {
    case 'filled':
      return `${baseClasses} bg-primary text-on-primary shadow-elevation-1 hover:shadow-elevation-2 active:shadow-elevation-1 active:scale-[0.98]`
    case 'outlined':
      return `${baseClasses} border-2 border-outline text-primary bg-transparent hover:bg-surface-variant active:scale-[0.98]`
    case 'text':
      return `${baseClasses} text-primary bg-transparent hover:bg-surface-variant active:scale-[0.98]`
    case 'tonal':
      return `${baseClasses} bg-surface-variant text-primary shadow-elevation-1 hover:shadow-elevation-2 active:shadow-elevation-1 active:scale-[0.98]`
    default:
      return baseClasses
  }
})
</script>

