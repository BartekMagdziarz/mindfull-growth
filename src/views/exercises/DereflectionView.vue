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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.dereflection.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.dereflection.subtitle') }}</p>
      </div>
    </div>

    <DereflectionWizard @saved="handleSaved" />

    <!-- Past practices -->
    <div v-if="dereflectionStore.sortedPractices.length > 0" class="mt-8">
      <h2 class="text-lg font-semibold text-on-surface mb-3">{{ t('exercises.views.pastPractices') }}</h2>
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
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import DereflectionWizard from '@/components/exercises/DereflectionWizard.vue'
import { useDereflectionStore } from '@/stores/dereflection.store'
import { useT } from '@/composables/useT'
import type { CreateDereflectionPayload } from '@/domain/exercises'

const router = useRouter()
const { t } = useT()
const dereflectionStore = useDereflectionStore()

onMounted(() => {
  dereflectionStore.loadPractices()
})

async function handleSaved(data: CreateDereflectionPayload) {
  await dereflectionStore.createPractice(data)
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
