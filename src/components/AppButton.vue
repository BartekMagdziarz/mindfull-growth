<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    :aria-label="ariaLabel"
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
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'filled',
  disabled: false,
  ariaLabel: undefined,
})

defineEmits<{
  click: [event: Event]
}>()

const buttonClasses = computed(() => {
  const baseClasses =
    'px-6 py-3 rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'

  switch (props.variant) {
    case 'filled':
      return `${baseClasses} bg-primary text-on-primary shadow-elevation-1 hover:bg-primary-strong hover:shadow-elevation-2 active:bg-primary-strong active:shadow-elevation-1 active:scale-[0.98]`
    case 'outlined':
      return `${baseClasses} border-2 border-chip-border text-primary bg-transparent hover:bg-primary-soft active:scale-[0.98]`
    case 'text':
      return `${baseClasses} text-primary bg-transparent hover:bg-primary-soft active:scale-[0.98]`
    case 'tonal':
      return `${baseClasses} bg-section-strong text-primary-strong shadow-elevation-1 hover:bg-section hover:shadow-elevation-2 active:bg-section-strong active:shadow-elevation-1 active:scale-[0.98]`
    default:
      return baseClasses
  }
})
</script>
