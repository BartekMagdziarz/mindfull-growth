<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span
          v-for="(label, index) in stepLabels"
          :key="label"
          class="h-8 w-8 rounded-full text-center text-xs font-semibold leading-8"
          :class="stepClass(index)"
        >
          {{ index + 1 }}
        </span>
      </div>
      <p class="text-xs text-on-surface-variant">
        {{ activeStepLabel }}
      </p>
    </div>

    <div v-if="step === 'questions'" class="space-y-1">
      <div class="flex items-center justify-between text-xs text-on-surface-variant">
        <span>{{ t('assessments.common.flow.questions') }} {{ currentPage + 1 }}/{{ totalPages }}</span>
        <span>{{ t('assessments.common.flow.answeredCount', { n: answeredCount }) }}</span>
      </div>
      <div class="neo-progress-track">
        <div class="neo-progress-fill" :style="{ width: `${progressPercent}%` }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AssessmentSessionStep } from '@/composables/useAssessmentSession'
import { useT } from '@/composables/useT'

const props = withDefaults(
  defineProps<{
    step: AssessmentSessionStep
    currentPage: number
    totalPages: number
    answeredCount: number
    totalCount: number
  }>(),
  {
    currentPage: 0,
    totalPages: 1,
    answeredCount: 0,
    totalCount: 0,
  },
)

const { t } = useT()

const stepOrder: AssessmentSessionStep[] = ['intro', 'consent', 'questions', 'review', 'results']

const stepLabels = computed(() => [
  t('assessments.common.flow.intro'),
  t('assessments.common.flow.consent'),
  t('assessments.common.flow.questions'),
  t('assessments.common.flow.review'),
  t('assessments.common.flow.results'),
])

const activeStepIndex = computed(() => stepOrder.indexOf(props.step))

const activeStepLabel = computed(() => {
  const index = activeStepIndex.value
  if (index < 0) return ''
  return stepLabels.value[index]
})

const progressPercent = computed(() => {
  if (props.totalCount <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((props.answeredCount / props.totalCount) * 100)))
})

function stepClass(index: number): string {
  if (index < activeStepIndex.value) return 'neo-step-completed'
  if (index === activeStepIndex.value) return 'neo-step-active'
  return 'neo-step-future'
}
</script>
