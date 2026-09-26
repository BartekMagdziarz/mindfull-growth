<template>
  <ExercisePage
    :title="t('exercises.cards.gradedExposure.title')"
    :subtitle="t('exercises.cards.gradedExposure.subtitle')"
  >
    <!-- Continue mode (program step "continueLatest", ?continue=latest): the
         latest ladder's attempt log comes first, a new ladder is one click away. -->
    <AppCard v-if="continueHierarchy && !newLadderOpen" padding="lg" class="space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-on-surface">
            {{ t('exerciseWizards.gradedExposure.log.continueTitle') }}
          </h2>
          <p class="text-sm text-on-surface-variant">{{ continueHierarchy.fearTarget }}</p>
        </div>
        <button type="button" class="mg-v2-button" @click="newLadderOpen = true">
          {{ t('exerciseWizards.gradedExposure.log.newLadder') }}
        </button>
      </div>
      <ExposureLadderLog :hierarchy="continueHierarchy" />
    </AppCard>
    <template v-else>
      <GradedExposureWizard v-if="!saved" @saved="handleSaved" />
      <ExerciseSavedPanel v-else exercise-slug="graded-exposure" @again="saved = false" />
    </template>

    <!-- Past hierarchies section -->
    <div v-if="exposureStore.sortedHierarchies.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastHierarchies') }}</h2></div>
      <div class="space-y-3">
        <AppCard v-for="hierarchy in exposureStore.sortedHierarchies" :key="hierarchy.id" padding="md" class="space-y-3">
          <div class="flex justify-between items-start gap-3">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ hierarchy.fearTarget }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ hierarchy.items.length }} steps
                &middot; {{ hierarchy.items.filter(i => i.completed).length }} completed
                &middot; {{ formatDate(hierarchy.createdAt) }}
              </p>
            </div>
            <button
              v-if="hierarchy.id !== continueHierarchy?.id || newLadderOpen"
              type="button"
              class="mg-v2-button"
              :aria-expanded="openHierarchyId === hierarchy.id"
              @click="openHierarchyId = openHierarchyId === hierarchy.id ? null : hierarchy.id"
            >
              {{ t('exerciseWizards.gradedExposure.log.openLadder') }}
            </button>
          </div>
          <ExposureLadderLog v-if="openHierarchyId === hierarchy.id" :hierarchy="hierarchy" />
        </AppCard>
      </div>
    </div>
  </ExercisePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import ExposureLadderLog from '@/components/exercises/ExposureLadderLog.vue'
import GradedExposureWizard from '@/components/exercises/GradedExposureWizard.vue'
import { useGradedExposureStore } from '@/stores/gradedExposure.store'
import type { CreateGradedExposureHierarchyPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()
const exposureStore = useGradedExposureStore()
const saved = ref(false)
const route = useRoute()
const openHierarchyId = ref<string | null>(null)
const newLadderOpen = ref(false)

/** Newest ladder when opened with `?continue=latest` (program step or weekly task link). */
const continueHierarchy = computed(() =>
  route.query.continue === 'latest'
    ? [...exposureStore.hierarchies].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined,
)

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
