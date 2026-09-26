<template>
  <details v-if="text" class="exercise-step-why">
    <summary>
      <AppIcon name="help" class="exercise-step-why__icon" />
      {{ t('exerciseWizards.shared.whyLabel') }}
    </summary>
    <p>{{ text }}</p>
  </details>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

/**
 * The "why" of an exercise step, folded by default. The step's
 * description says what to do; this says why it helps — for those who
 * want it, without lengthening every step.
 */
defineProps<{ text?: string }>()

const { t } = useT()
</script>

<style scoped>
.exercise-step-why > summary {
  display: inline-flex;
  align-items: center;
  gap: var(--mg-space-1);
  list-style: none;
  cursor: pointer;
  font-size: var(--mg-font-size-sm);
  color: var(--mg-color-muted);
  border-radius: var(--mg-radius-pill);
}

.exercise-step-why > summary::-webkit-details-marker {
  display: none;
}

.exercise-step-why > summary:hover,
.exercise-step-why[open] > summary {
  color: var(--mg-color-primary-strong);
}

.exercise-step-why > summary:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 2px;
}

.exercise-step-why__icon {
  font-size: 1rem;
}

.exercise-step-why > p {
  margin-top: var(--mg-space-2);
  padding: var(--mg-space-3) var(--mg-space-4);
  border-radius: var(--mg-radius-sm);
  background: var(--mg-color-mist);
  font-size: var(--mg-font-size-sm);
  line-height: 1.55;
  color: var(--mg-color-muted);
}
</style>
