<template>
  <ExercisePage
    :title="t('exercises.cards.tragicOptimism.title')"
    :subtitle="t('exercises.cards.tragicOptimism.subtitle')"
  >
    <TragicOptimismWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="tragic-optimism" @again="saved = false" />

    <!-- Past entries -->
    <div v-if="tragicOptimismStore.sortedEntries.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastEntries') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="entry in tragicOptimismStore.sortedEntries"
          :key="entry.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="exercise-pill text-xs px-2.5 py-0.5">
                  {{ getFocusLabel(entry.focus) }}
                </span>
              </div>
              <p
                v-if="entry.insightMeaning"
                class="text-sm text-on-surface-variant line-clamp-2"
              >
                {{ entry.insightMeaning }}
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ formatDate(entry.createdAt) }}
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
import TragicOptimismWizard from '@/components/exercises/TragicOptimismWizard.vue'
import { useTragicOptimismStore } from '@/stores/tragicOptimism.store'
import { useT } from '@/composables/useT'
import type { CreateTragicOptimismPayload, TragicTriadFocus } from '@/domain/exercises'

const { t } = useT()
const tragicOptimismStore = useTragicOptimismStore()
const saved = ref(false)

onMounted(() => {
  tragicOptimismStore.loadEntries()
})

async function handleSaved(data: CreateTragicOptimismPayload) {
  await tragicOptimismStore.createEntry(data)
  saved.value = true
  await tragicOptimismStore.loadEntries()
}

function getFocusLabel(focus: TragicTriadFocus): string {
  const labels: Record<TragicTriadFocus, string> = {
    suffering: 'Suffering',
    guilt: 'Guilt',
    finitude: 'Finitude',
  }
  return labels[focus] || focus
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
