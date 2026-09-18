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

// Design V2 anatomy: one filled action (`filled`), quiet text action
// (`text`); outlined/tonal collapse into the default mist chip.
const baseClasses = 'mg-v2-button'

const buttonClasses = computed(() => {
  switch (props.variant) {
    case 'filled':
      return `${baseClasses} mg-v2-button--primary`
    case 'text':
      return `${baseClasses} mg-v2-button--quiet`
    case 'outlined':
    case 'tonal':
    default:
      return baseClasses
  }
})
</script>
