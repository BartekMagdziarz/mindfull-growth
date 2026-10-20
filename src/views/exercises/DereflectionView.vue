<template>
  <ExercisePage
    :title="t('exercises.cards.dereflection.title')"
    :subtitle="t('exercises.cards.dereflection.subtitle')"
  >
    <DereflectionWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="dereflection" @again="saved = false" />

    <!-- Past practices -->
    <div v-if="dereflectionStore.sortedPractices.length > 0" class="mt-8">
      <div class="mg-v2-section-head">
        <h2>{{ t('exercises.views.pastPractices') }}</h2>
      </div>
      <div class="space-y-3">
        <AppCard
          v-for="practice in dereflectionStore.sortedPractices"
          :key="practice.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">
                {{ practice.fixation }}
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                Intensity: {{ practice.fixationIntensity }}/5 —
                {{ formatDate(practice.createdAt) }}
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
import DereflectionWizard from '@/components/exercises/DereflectionWizard.vue'
import { useDereflectionStore } from '@/stores/dereflection.store'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import type { CreateDereflectionPayload } from '@/domain/exercises'

const { t, locale } = useT()
const dereflectionStore = useDereflectionStore()
const saved = ref(false)

onMounted(() => {
  dereflectionStore.loadPractices()
})

async function handleSaved(data: CreateDereflectionPayload) {
  await dereflectionStore.createPractice(data)
  saved.value = true
  await dereflectionStore.loadPractices()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
