<template>
  <ExercisePage
    :title="t('exercises.cards.threePathways.title')"
    :subtitle="t('exercises.cards.threePathways.subtitle')"
  >
    <ThreePathwaysWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="three-pathways" @again="saved = false" />

    <!-- Past explorations -->
    <div v-if="threePathwaysStore.sortedExplorations.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastExplorations') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="exploration in threePathwaysStore.sortedExplorations"
          :key="exploration.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface">
                {{ exploration.creativeValues.length }} creative,
                {{ exploration.experientialValues.length }} experiential,
                {{ exploration.attitudinalValues.length }} attitudinal
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
import ThreePathwaysWizard from '@/components/exercises/ThreePathwaysWizard.vue'
import { useThreePathwaysStore } from '@/stores/threePathways.store'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import type { CreateThreePathwaysPayload } from '@/domain/exercises'

const { t, locale } = useT()
const threePathwaysStore = useThreePathwaysStore()
const saved = ref(false)

onMounted(() => {
  threePathwaysStore.loadExplorations()
})

async function handleSaved(data: CreateThreePathwaysPayload) {
  await threePathwaysStore.createExploration(data)
  saved.value = true
  await threePathwaysStore.loadExplorations()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
