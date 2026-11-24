<template>
  <nav class="exercise-steps" :aria-label="ariaLabel || undefined">
    <ol class="mg-v2-pager">
      <li v-for="(label, index) in labels" :key="index">
        <button
          type="button"
          class="mg-v2-pager__step"
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
    <small
      >{{ current + 1 }}/{{ labels.length
      }}<template v-if="labels[current]"> · {{ labels[current] }}</template></small
    >
  </nav>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'

/**
 * Wizard progress = the shared pager (`mg-v2-pager`, base.css): quiet accent
 * pips, the current one drawn out into a short bar, done pips lead back. The counter
 * and the current step's name sit at the row's end instead of under it.
 */
const props = withDefaults(
  defineProps<{
    labels: string[]
    current: number
    ariaLabel?: string
    interactive?: boolean
  }>(),
  { ariaLabel: '', interactive: true }
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

.exercise-steps small {
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
}
</style>
