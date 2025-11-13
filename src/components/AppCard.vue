<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  elevation?: 1 | 2 | 3
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  elevation: 1,
  padding: 'md',
})

const cardClasses = computed(() => {
  const baseClasses = 'rounded-lg bg-surface border border-outline/20'

  const elevationClasses = {
    1: 'shadow-elevation-1',
    2: 'shadow-elevation-2',
    3: 'shadow-elevation-3',
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return `${baseClasses} ${elevationClasses[props.elevation]} ${paddingClasses[props.padding]}`
})
</script>

