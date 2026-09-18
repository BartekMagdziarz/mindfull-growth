<script setup lang="ts">
import { computed } from 'vue'
import { iconMarkup, type IconVariant } from '~lab/lab/iconStudy'
const props = withDefaults(defineProps<{ name: string; variant: IconVariant; size?: number; weight?: number }>(), { size: 24, weight: 1.75 })
// Markup comes exclusively from the authored, static iconStudy catalog.
const markup = computed(() => iconMarkup(props.name, props.variant))
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="weight" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="markup" />
</template>
