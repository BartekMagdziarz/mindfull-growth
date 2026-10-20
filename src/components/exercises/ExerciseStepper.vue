<template>
  <nav class="exercise-steps" :aria-label="ariaLabel || undefined">
    <ol>
      <li v-for="(label, index) in labels" :key="index">
        <button
          type="button"
          :class="{ 'is-done': index < current, 'is-current': index === current }"
          :aria-current="index === current ? 'step' : undefined"
          :aria-label="stepLabel(label, index)"
          :title="label"
          :disabled="!interactive || index >= current"
          @click="interactive && index < current && emit('go', index)"
        >
          <i />
        </button>
      </li>
    </ol>
    <small>{{ current + 1 }}/{{ labels.length }}<template v-if="labels[current]"> · {{ labels[current] }}</template></small>
  </nav>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'

/**
 * Wizard progress in the micro runner's language: quiet accent dots, the
 * current one drawn out into a short bar, done dots lead back. The counter
 * and the current step's name sit at the row's end instead of under it.
 */
const props = withDefaults(
  defineProps<{
    labels: string[]
    current: number
    ariaLabel?: string
    interactive?: boolean
  }>(),
  { ariaLabel: '', interactive: true },
)

const emit = defineEmits<{ go: [index: number] }>()
const { t } = useT()

function stepLabel(label: string, index: number): string {
  const state =
    index < props.current
      ? t('common.stepper.done')
      : index === props.current
        ? t('common.stepper.current')
        : ''
  return state ? `${index + 1}. ${label} (${state})` : `${index + 1}. ${label}`
}
</script>

<style scoped>
.exercise-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--mg-space-2);
}

.exercise-steps ol {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.exercise-steps button {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: default;
}

.exercise-steps button:not(:disabled) {
  cursor: pointer;
}

.exercise-steps button:focus-visible {
  outline: 2px solid var(--mg-color-focus);
  outline-offset: 0;
}

/* Accent at a fifth, done at half, the current one drawn out. */
.exercise-steps i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mg-color-primary);
  opacity: 0.2;
  transition:
    width var(--mg-duration-fast) ease,
    opacity var(--mg-duration-fast) ease;
}

.exercise-steps .is-done i {
  opacity: 0.55;
}

.exercise-steps .is-done:hover i {
  opacity: 0.85;
}

.exercise-steps .is-current i {
  width: 18px;
  border-radius: 8px;
  opacity: 1;
}

.exercise-steps small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .exercise-steps i {
    transition: none;
  }
}
</style>
