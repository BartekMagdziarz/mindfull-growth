<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.cognitiveDistortions.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.cognitiveDistortions.subtitle') }}</p>
      </div>
    </div>

    <CognitiveDistortionsWizard @saved="handleSaved" />

    <!-- Past assessments -->
    <template v-if="distortionStore.sortedAssessments.length > 0">
      <div class="mt-10 space-y-4">
        <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastAssessments') }}</h2>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import CognitiveDistortionsWizard from '@/components/exercises/CognitiveDistortionsWizard.vue'
import { useDistortionAssessmentStore } from '@/stores/distortionAssessment.store'
import type { CreateDistortionAssessmentPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const distortionStore = useDistortionAssessmentStore()

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
  router.push('/exercises')
}
</script>
