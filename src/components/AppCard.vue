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
  // Design V2 tonal ladder: raised cards are the only level with a shadow,
  // `flat` is a shadowless card, `inset` is a nested block in the field tone.
  const variantClasses = {
    raised: 'mg-v2-surface mg-v2-surface--raised-sm',
    'raised-strong': 'mg-v2-surface mg-v2-surface--raised',
    flat: 'mg-v2-surface',
    inset: 'mg-v2-surface mg-v2-surface--flat',
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
