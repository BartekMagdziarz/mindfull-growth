<template>
  <button type="button" class="apt" :class="{ 'is-open': open }" :aria-expanded="open" @click="emit('update:open', !open)">
    <span>Minione tygodnie</span>
    <AppIcon name="expand_more" />
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@product/components/shared/AppIcon.vue'

/**
 * Runda 4 · furtka do historii: samo słowo ze strzałką (akcje wiersza to słowa,
 * jak w „Dzisiaj”). Historia jest dodatkiem, więc domyślnie jest schowana.
 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
</script>

<style scoped>
/* dwie klasy w selektorze: `.quiet-ritual button` bije pojedynczą */
.quiet-ritual .apt,
.apt.apt {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 1.75rem;
  padding: 0 var(--mg-space-1) 0 var(--mg-space-2);
  border-radius: var(--mg-radius-pill);
  background: transparent;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-strong);
  white-space: nowrap;
  cursor: pointer;
}
.apt.apt:hover,
.apt.apt.is-open {
  color: var(--mg-color-primary-strong);
}
.apt.apt:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}
.apt :deep(.app-icon) {
  font-size: var(--mg-font-size-icon-sm);
  transition: rotate var(--mg-duration-fast) var(--mg-ease-standard);
}
.apt.is-open :deep(.app-icon) {
  rotate: 180deg;
}
</style>
