<template>
  <ExercisePage
    :title="t('exercises.cards.gradedExposure.title')"
    :subtitle="t('exercises.cards.gradedExposure.subtitle')"
  >
    <GradedExposureWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="graded-exposure" @again="saved = false" />

    <!-- Past hierarchies section -->
    <div v-if="exposureStore.sortedHierarchies.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastHierarchies') }}</h2></div>
      <div class="space-y-3">
        <AppCard v-for="hierarchy in exposureStore.sortedHierarchies" :key="hierarchy.id" padding="md">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ hierarchy.fearTarget }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ hierarchy.items.length }} steps
                &middot; {{ hierarchy.items.filter(i => i.completed).length }} completed
                &middot; {{ formatDate(hierarchy.createdAt) }}
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
import GradedExposureWizard from '@/components/exercises/GradedExposureWizard.vue'
import { useGradedExposureStore } from '@/stores/gradedExposure.store'
import type { CreateGradedExposureHierarchyPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()
const exposureStore = useGradedExposureStore()
const saved = ref(false)

onMounted(() => {
  exposureStore.loadHierarchies()
})

async function handleSaved(data: CreateGradedExposureHierarchyPayload) {
  await exposureStore.createHierarchy(data)
  saved.value = true
  await exposureStore.loadHierarchies()
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
