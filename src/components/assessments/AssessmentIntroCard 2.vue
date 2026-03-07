<template>
  <AppCard padding="lg" class="space-y-5">
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-wide text-on-surface-variant">
        {{ t(definition.categoryKey) }}
      </p>
      <h2 class="text-xl font-semibold text-on-surface">
        {{ t(definition.titleKey) }}
      </h2>
      <p class="text-sm text-on-surface-variant">
        {{ t(definition.descriptionKey) }}
      </p>
      <p class="text-xs text-on-surface-variant">
        ~{{ definition.estimatedMinutes }} min
      </p>
    </div>

    <div v-if="latestCompletedAt" class="neo-embedded p-3 text-xs text-on-surface-variant">
      <p>{{ t('assessments.common.results.completedAt', { date: formatDate(latestCompletedAt) }) }}</p>
      <p v-if="retakeEligibleAt && !canRetake">
        {{ t('assessments.common.results.retakeEligibleOn', { date: formatDate(retakeEligibleAt) }) }}
      </p>
      <p v-else-if="canRetake">
        {{ t('assessments.common.results.retakeAvailable') }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <AppButton
        v-if="hasInProgress"
        variant="filled"
        @click="$emit('resume')"
      >
        {{ t('assessments.common.flow.resume') }}
      </AppButton>

      <AppButton
        v-if="!hasInProgress && !hasHistory"
        variant="filled"
        @click="$emit('start')"
      >
        {{ t('assessments.common.flow.start') }}
      </AppButton>

      <AppButton
        v-if="!hasInProgress && hasHistory"
        :variant="canRetake ? 'filled' : 'tonal'"
        :disabled="!canRetake"
        @click="canRetake && $emit('retake')"
      >
        {{ t('assessments.common.flow.retake') }}
      </AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import type { AssessmentDefinition } from '@/domain/assessments'
import { useT } from '@/composables/useT'

defineProps<{
  definition: AssessmentDefinition
  hasInProgress: boolean
  hasHistory: boolean
  canRetake: boolean
  retakeEligibleAt?: string
  latestCompletedAt?: string
}>()

defineEmits<{
  start: []
  resume: []
  retake: []
}>()

const { t } = useT()

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>
