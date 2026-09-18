<template>
  <ExercisePage
    :title="t('exercises.cards.dereflection.title')"
    :subtitle="t('exercises.cards.dereflection.subtitle')"
  >
    <DereflectionWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="dereflection" @again="saved = false" />

    <!-- Past practices -->
    <div v-if="dereflectionStore.sortedPractices.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastPractices') }}</h2></div>
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
import type { CreateDereflectionPayload } from '@/domain/exercises'

const { t } = useT()
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
