<template>
  <div class="ai-activity">
    <span class="ai-activity__status" role="status">
      <span class="ai-activity__dot" aria-hidden="true" />
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
  color: var(--mg-color-muted, #4c6a8b);
  font-size: 13px;
}
.ai-activity__status {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-activity__dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--mg-color-primary, #598fcc);
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
  border-radius: var(--mg-radius-sm, 10px);
  background: var(--cp-field, var(--mg-color-mist, #e6f0fc));
  color: var(--mg-color-muted, #4c6a8b);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.ai-activity__cancel:hover {
  background: var(--cp-inner, var(--mg-color-paper, #f8fbff));
  color: var(--mg-color-ink, #193454);
}
.ai-activity__cancel:focus-visible {
  outline: none;
  box-shadow: var(--mg-focus-ring, 0 0 0 3px rgb(89 143 204 / 0.42));
}
.ai-activity__stop {
  width: 6px;
  height: 6px;
  border-radius: 2px;
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
