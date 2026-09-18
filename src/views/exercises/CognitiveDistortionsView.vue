<template>
  <ExercisePage
    :title="t('exercises.cards.cognitiveDistortions.title')"
    :subtitle="t('exercises.cards.cognitiveDistortions.subtitle')"
  >
    <CognitiveDistortionsWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="cognitive-distortions" @again="saved = false" />

    <!-- Past assessments -->
    <template v-if="distortionStore.sortedAssessments.length > 0">
      <div class="mt-10 space-y-4">
        <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastAssessments') }}</h2></div>
        <AppCard
          v-for="assessment in distortionStore.sortedAssessments"
          :key="assessment.id"
          padding="md"
          class="space-y-1"
        >
          <div class="flex items-center justify-between">
            <span class="neo-pill px-2.5 py-0.5 text-xs font-medium capitalize">
              {{ assessment.mode }}
            </span>
            <span class="text-xs text-on-surface-variant">
              {{ formatDate(assessment.createdAt) }}
            </span>
          </div>
          <p v-if="assessment.mode === 'learning'" class="text-sm text-on-surface-variant">
            Recognised {{ assessment.recognizedDistortionIds?.length ?? 0 }} distortions
          </p>
          <p v-else-if="assessment.thought" class="text-sm text-on-surface-variant truncate">
            "{{ assessment.thought }}"
          </p>
        </AppCard>
      </div>
    </template>
  </ExercisePage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import CognitiveDistortionsWizard from '@/components/exercises/CognitiveDistortionsWizard.vue'
import { useDistortionAssessmentStore } from '@/stores/distortionAssessment.store'
import type { CreateDistortionAssessmentPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()
const distortionStore = useDistortionAssessmentStore()
const saved = ref(false)

onMounted(() => {
  distortionStore.loadAssessments()
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function handleSaved(data: CreateDistortionAssessmentPayload) {
  await distortionStore.createAssessment(data)
  saved.value = true
  await distortionStore.loadAssessments()
}
</script>
