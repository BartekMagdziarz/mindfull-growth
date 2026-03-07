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

const baseClasses =
  'px-6 py-3 rounded-2xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background disabled:opacity-55 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2'

const buttonClasses = computed(() => {
  switch (props.variant) {
    case 'filled':
      return `${baseClasses} bg-gradient-to-br from-primary to-primary-strong text-on-primary shadow-neu-raised-sm hover:shadow-neu-raised hover:-translate-y-px active:shadow-neu-pressed active:translate-y-0`
    case 'outlined':
      return `${baseClasses} border border-neu-border/30 bg-transparent text-primary shadow-neu-flat hover:shadow-neu-raised-sm hover:-translate-y-px active:shadow-neu-pressed active:translate-y-0`
    case 'text':
      return `${baseClasses} text-primary bg-transparent hover:bg-neu-base hover:shadow-neu-pressed-sm active:shadow-neu-pressed`
    case 'tonal':
      return `${baseClasses} bg-gradient-to-br from-neu-top to-neu-bottom text-neu-text border border-neu-border/30 shadow-neu-raised-sm hover:shadow-neu-raised hover:-translate-y-px active:shadow-neu-pressed active:translate-y-0 active:bg-neu-base`
    default:
      return baseClasses
  }
})
</script>
