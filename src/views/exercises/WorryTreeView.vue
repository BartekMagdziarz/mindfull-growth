<template>
  <ExercisePage
    :title="t('exercises.cards.worryTree.title')"
    :subtitle="t('exercises.cards.worryTree.subtitle')"
  >
    <WorryTreeWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="worry-tree" @again="saved = false" />

    <!-- Past entries section -->
    <div v-if="worryTreeStore.sortedEntries.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastEntries') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="entry in worryTreeStore.sortedEntries"
          :key="entry.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ entry.worry }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ entry.worryType === 'real-problem' ? 'Real problem' : 'Hypothetical' }}
                &middot; {{ formatDate(entry.createdAt) }}
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
import WorryTreeWizard from '@/components/exercises/WorryTreeWizard.vue'
import { useWorryTreeStore } from '@/stores/worryTree.store'
import type { CreateWorryTreeEntryPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()
const worryTreeStore = useWorryTreeStore()
const saved = ref(false)

onMounted(() => {
  worryTreeStore.loadEntries()
})

async function handleSaved(data: CreateWorryTreeEntryPayload) {
  await worryTreeStore.createEntry(data)
  saved.value = true
  // Reload entries so the new one shows up in the past entries list
  await worryTreeStore.loadEntries()
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
