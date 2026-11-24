<template>
  <div class="ai-activity">
    <span class="ai-activity__status" role="status">
      <span class="ai-activity__dot mg-pip" aria-hidden="true" />
      <span>{{ label }}</span>
    </span>
    <button
      v-if="cancellable"
      type="button"
      class="ai-activity__cancel"
      :aria-label="cancelLabel"
      @click="emit('cancel')"
    >
      <span class="ai-activity__stop" aria-hidden="true" />Przerwij
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label?: string; cancellable?: boolean; cancelLabel?: string }>(), {
  label: 'Pracuję nad odpowiedzią…',
  cancellable: true,
  cancelLabel: 'Przerwij',
})
const emit = defineEmits<{ cancel: [] }>()
</script>

<style scoped>
.ai-activity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 0;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}
.ai-activity__status {
  display: flex;
  align-items: center;
  gap: 10px;
}
/* A breathing pip of the accent (`mg-pip`). */
.ai-activity__dot {
  --mg-pip-color: var(--mg-color-primary);
  animation: ai-breathe 2.4s ease-in-out infinite;
}
/* Quiet pill in the field tone of its host (the companion panel exposes
   --cp-field); no shadow, no fill colour. */
.ai-activity .ai-activity__cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 32px;
  padding: 6px 12px;
  border: 0;
  border-radius: var(--mg-radius-sm);
  background: var(--cp-field, var(--mg-color-mist));
  color: var(--mg-color-muted);
  font: inherit;
  font-size: var(--mg-font-size-xs);
  cursor: pointer;
}
.ai-activity__cancel:hover {
  background: var(--cp-inner, var(--mg-color-paper));
  color: var(--mg-color-ink);
}
.ai-activity__cancel:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring);
}
.ai-activity__stop {
  width: 6px;
  height: 6px;
  border-radius: var(--mg-radius-sketch-a);
  background: currentColor;
}
@keyframes ai-breathe {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ai-activity__dot {
    animation: none;
  }
}
</style>
