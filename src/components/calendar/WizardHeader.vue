<template>
  <div class="flex items-center justify-between gap-3">
    <div class="flex items-baseline gap-2">
      <h2 class="text-lg font-bold text-on-surface">{{ title }}</h2>
      <span v-if="subtitle" class="text-xs text-on-surface-variant">— {{ subtitle }}</span>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5" role="group" :aria-label="progressLabel">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :disabled="isLocked(idx)"
          :aria-label="`${idx + 1}. ${label}${isLocked(idx) ? ' (locked)' : idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
          class="rounded-full transition-all duration-200"
          :class="
            isLocked(idx)
              ? 'neo-step-future w-2.5 h-2.5 opacity-40 cursor-not-allowed'
              : idx < stepIndex
                ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
                : idx === stepIndex
                  ? 'neo-step-active w-3.5 h-3.5'
                  : 'neo-step-future w-2.5 h-2.5'
          "
          @click="!isLocked(idx) && idx < stepIndex && emit('goToStep', idx)"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[stepIndex] }}
      </span>
      <AppButton
        variant="text"
        :aria-label="t('common.buttons.close')"
        @click="emit('close')"
      >
        <AppIcon name="close" class="text-lg" />
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    stepLabels: string[]
    stepIndex: number
    /** Per-step locked flags, parallel to stepLabels (missing = unlocked). */
    lockedSteps?: boolean[]
    /** aria-label for the progress-dot group. */
    progressLabel: string
  }>(),
  { subtitle: '', lockedSteps: () => [] },
)

const emit = defineEmits<{
  close: []
  goToStep: [index: number]
}>()

const { t } = useT()

function isLocked(idx: number): boolean {
  return props.lockedSteps[idx] === true
}
</script>
