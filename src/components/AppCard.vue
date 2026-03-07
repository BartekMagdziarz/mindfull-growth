<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'raised' | 'raised-strong' | 'flat' | 'inset'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'raised',
  padding: 'md',
})

const cardClasses = computed(() => {
  const variantClasses = {
    raised: 'neo-card',
    'raised-strong': 'neo-card neo-raised-strong',
    flat: 'neo-card shadow-neu-flat',
    inset: 'neo-surface',
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return `${variantClasses[props.variant]} ${paddingClasses[props.padding]}`
})
</script>
