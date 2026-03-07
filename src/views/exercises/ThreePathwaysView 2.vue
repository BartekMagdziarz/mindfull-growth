<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.threePathways.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.threePathways.subtitle') }}</p>
      </div>
    </div>

    <ThreePathwaysWizard @saved="handleSaved" />

    <!-- Past explorations -->
    <div v-if="threePathwaysStore.sortedExplorations.length > 0" class="mt-8">
      <h2 class="text-lg font-semibold text-on-surface mb-3">{{ t('exercises.views.pastExplorations') }}</h2>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import ThreePathwaysWizard from '@/components/exercises/ThreePathwaysWizard.vue'
import { useThreePathwaysStore } from '@/stores/threePathways.store'
import { useT } from '@/composables/useT'
import type { CreateThreePathwaysPayload } from '@/domain/exercises'

const router = useRouter()
const { t } = useT()
const threePathwaysStore = useThreePathwaysStore()

onMounted(() => {
  threePathwaysStore.loadExplorations()
})

async function handleSaved(data: CreateThreePathwaysPayload) {
  await threePathwaysStore.createExploration(data)
  await threePathwaysStore.loadExplorations()
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
