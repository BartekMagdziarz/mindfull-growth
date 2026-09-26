<template>
  <div class="mg-v2-stepper" role="group" :aria-label="ariaLabel">
    <ol class="mg-v2-stepper__dots">
      <li v-for="(label, index) in labels" :key="index">
        <button
          type="button"
          class="mg-v2-stepper__dot"
          :class="{
            'mg-v2-stepper__dot--done': index < current,
            'mg-v2-stepper__dot--current': index === current,
          }"
          :aria-current="index === current ? 'step' : undefined"
          :aria-label="stepLabel(label, index)"
          :disabled="!interactive || index >= current"
          @click="interactive && index < current && emit('go', index)"
        />
      </li>
    </ol>
    <span class="mg-v2-stepper__label">{{ labels[current] }}</span>
  </div>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'

/**
 * Sketch stepper: organic dots for wizard progress. Done dots are
 * clickable (go back), the current one is the ink blob, future ones are
 * dashed outlines. The current step's label sits under the dots.
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
