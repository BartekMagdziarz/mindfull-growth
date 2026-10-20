<template>
  <ExercisePage
    :title="t('exercises.cards.mountainRange.title')"
    :subtitle="t('exercises.cards.mountainRange.subtitle')"
  >
    <MountainRangeWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="mountain-range" @again="saved = false" />

    <!-- Past explorations -->
    <div v-if="mountainRangeStore.sortedExplorations.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastExplorations') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="exploration in mountainRangeStore.sortedExplorations"
          :key="exploration.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface">
                {{ exploration.events.filter((e) => e.type === 'peak').length }} peaks,
                {{ exploration.events.filter((e) => e.type === 'valley').length }} valleys
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ formatDate(exploration.createdAt) }}
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
import MountainRangeWizard from '@/components/exercises/MountainRangeWizard.vue'
import { useMountainRangeStore } from '@/stores/mountainRange.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import type { CreateMountainRangePayload } from '@/domain/exercises'

const { t, locale } = useT()
const mountainRangeStore = useMountainRangeStore()
const emotionStore = useEmotionStore()
const saved = ref(false)

onMounted(() => {
  if (!emotionStore.isLoaded) {
    emotionStore.loadEmotions()
  }
  mountainRangeStore.loadExplorations()
})

async function handleSaved(data: CreateMountainRangePayload) {
  await mountainRangeStore.createExploration(data)
  saved.value = true
  await mountainRangeStore.loadExplorations()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
