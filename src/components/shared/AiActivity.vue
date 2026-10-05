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
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: var(--mg-color-primary, #598fcc);
  animation: ai-breathe 1.6s ease-in-out infinite;
}
.ai-activity .ai-activity__cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--mg-color-paper, #f8fbff);
  color: var(--mg-color-ink, #193454);
  font: inherit;
  cursor: pointer;
}
.ai-activity__cancel:hover {
  background: var(--mg-color-mist, #e6f0fc);
}
.ai-activity__cancel:focus-visible {
  outline: 2px solid var(--mg-color-primary, #598fcc);
  outline-offset: 2px;
}
.ai-activity__stop {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: currentColor;
}
@keyframes ai-breathe {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ai-activity__dot {
    animation: none;
  }
}
</style>
