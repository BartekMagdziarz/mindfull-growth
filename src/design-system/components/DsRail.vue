<template>
  <DsSurface tag="aside" class="mg-v2-rail" :aria-label="label">
    <header v-if="title || $slots.header" class="mg-v2-rail__header">
      <slot name="header"><strong>{{ title }}</strong></slot>
    </header>
    <div class="mg-v2-rail__body"><slot /></div>
    <footer v-if="$slots.footer" class="mg-v2-rail__footer"><slot name="footer" /></footer>
  </DsSurface>
</template>

<script setup lang="ts">
import DsSurface from './DsSurface.vue'

withDefaults(defineProps<{ label: string; title?: string }>(), { title: '' })
</script>
