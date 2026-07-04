<template>
  <div class="mx-auto w-full px-4 py-6 pb-24" :class="widthClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Standard page widths:
 * - reading: long-form text (exercise wizards, editors) — 768px
 * - default: lists/grids of cards — 1152px
 * - wide: dashboard-like multi-zone views — 1600px
 */
export type PageContainerWidth = 'reading' | 'default' | 'wide'

const props = withDefaults(defineProps<{ width?: PageContainerWidth }>(), {
  width: 'default',
})

const widthClass = computed(() => {
  switch (props.width) {
    case 'reading':
      return 'max-w-3xl'
    case 'wide':
      return 'max-w-[1600px]'
    default:
      return 'max-w-6xl'
  }
})
</script>
