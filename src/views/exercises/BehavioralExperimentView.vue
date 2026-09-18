<template>
  <ExercisePage
    :title="t('exercises.cards.behavioralExperiment.title')"
    :subtitle="t('exercises.cards.behavioralExperiment.subtitle')"
  >
    <BehavioralExperimentWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="behavioral-experiment" @again="saved = false" />

    <!-- Past experiments section -->
    <div v-if="experimentStore.sortedExperiments.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastExperiments') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="exp in experimentStore.sortedExperiments"
          :key="exp.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ exp.targetBelief }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ exp.status === 'planned' ? 'Planned' : 'Completed' }}
                &middot; {{ formatDate(exp.createdAt) }}
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
import BehavioralExperimentWizard from '@/components/exercises/BehavioralExperimentWizard.vue'
import { useBehavioralExperimentStore } from '@/stores/behavioralExperiment.store'
import type { CreateBehavioralExperimentPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()
const experimentStore = useBehavioralExperimentStore()
const saved = ref(false)

onMounted(() => {
  experimentStore.loadExperiments()
})

async function handleSaved(data: CreateBehavioralExperimentPayload) {
  await experimentStore.createExperiment(data)
  saved.value = true
  await experimentStore.loadExperiments()
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}
</script>
