<template>
  <ExercisePage
    :title="t('exercises.cards.structuredProblemSolving.title')"
    :subtitle="t('exercises.cards.structuredProblemSolving.subtitle')"
  >
    <StructuredProblemSolvingWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="structured-problem-solving" @again="saved = false" />

    <!-- Past sessions section -->
    <div v-if="spsStore.sortedSessions.length > 0" class="mt-8">
      <div class="mg-v2-section-head">
        <h2>{{ t('exercises.views.pastSessions') }}</h2>
      </div>
      <div class="space-y-3">
        <AppCard v-for="session in spsStore.sortedSessions" :key="session.id" padding="md">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">
                {{ session.problemStatement }}
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                <span
                  class="exercise-pill px-2 py-0.5 text-xs mr-1.5"
                  :class="session.status === 'completed' ? 'exercise-pill--primary' : ''"
                >
                  {{ session.status === 'in-progress' ? 'In Progress' : 'Completed' }}
                </span>
                &middot; {{ session.solutions.length }} solutions &middot;
                {{ formatDate(session.createdAt) }}
              </p>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  </ExercisePage>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import StructuredProblemSolvingWizard from '@/components/exercises/StructuredProblemSolvingWizard.vue'
import { useStructuredProblemSolvingStore } from '@/stores/structuredProblemSolving.store'
import type { CreateStructuredProblemSolvingPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'

const { t, locale } = useT()
const spsStore = useStructuredProblemSolvingStore()
const saved = ref(false)

onMounted(() => {
  spsStore.loadSessions()
})

async function handleSaved(data: CreateStructuredProblemSolvingPayload) {
  await spsStore.createSession(data)
  saved.value = true
  await spsStore.loadSessions()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
