<template>
  <div class="space-y-3">
    <ExerciseStepper :labels="stepLabels" :current="activeStepIndex" :interactive="false" />

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
import ExerciseStepper from '@/components/exercises/ExerciseStepper.vue'
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


const progressPercent = computed(() => {
  if (props.totalCount <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((props.answeredCount / props.totalCount) * 100)))
})

</script>
