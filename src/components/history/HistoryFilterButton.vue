<template>
  <button type="button" class="mg-v2-button history-filter-button" :aria-pressed="pressed">
    <AppIcon v-if="pressed" name="check" class="history-filter-button__check" />
    <span class="history-filter-button__icon"><AppIcon :name="icon" /></span>
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

withDefaults(defineProps<{ icon: string; label: string; pressed?: boolean }>(), {
  pressed: undefined,
})
</script>

<style scoped>
.history-filter-button {
  position: relative;
  flex-direction: column;
  gap: var(--mg-space-1);
  min-width: 0;
  padding: var(--mg-space-2) var(--mg-space-1);
  border-color: transparent;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-xs);
  font-weight: var(--mg-weight-title);
}
.history-filter-button[aria-pressed='true'] {
  background: var(--mg-color-paper);
}
.history-filter-button__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--mg-radius-icon-field-a);
  color: var(--mg-color-primary-strong);
  background: var(--mg-color-sky-well);
  font-size: var(--mg-font-size-md);
}
.history-filter-button__check {
  position: absolute;
  top: var(--mg-space-1);
  right: var(--mg-space-1);
  color: var(--mg-color-primary-strong);
}
</style>
