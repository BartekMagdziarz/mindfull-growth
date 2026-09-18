<template>
  <ExercisePage
    :title="t('exercises.cards.paradoxicalIntention.title')"
    :subtitle="t('exercises.cards.paradoxicalIntention.subtitle')"
  >
    <ParadoxicalIntentionWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="paradoxical-intention" @again="saved = false" />

    <!-- Past labs -->
    <div v-if="paradoxicalStore.sortedLabs.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastLabs') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="lab in paradoxicalStore.sortedLabs"
          :key="lab.id"
          padding="md"
        >
          <div>
            <p class="text-sm font-medium text-on-surface mb-1">
              {{ lab.fears.length }} fear{{ lab.fears.length > 1 ? 's' : '' }} worked on
            </p>
            <ul class="space-y-0.5">
              <li
                v-for="fear in lab.fears"
                :key="fear.id"
                class="text-xs text-on-surface-variant"
              >
                {{ fear.description }}
                <span v-if="fear.paradoxicalIntention" class="text-primary italic">
                  → {{ fear.paradoxicalIntention.slice(0, 50) }}{{ fear.paradoxicalIntention.length > 50 ? '...' : '' }}
                </span>
              </li>
            </ul>
            <p class="text-xs text-on-surface-variant mt-1">
              {{ formatDate(lab.createdAt) }}
            </p>
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
import ParadoxicalIntentionWizard from '@/components/exercises/ParadoxicalIntentionWizard.vue'
import { useParadoxicalIntentionStore } from '@/stores/paradoxicalIntention.store'
import { useT } from '@/composables/useT'
import type { CreateParadoxicalIntentionPayload } from '@/domain/exercises'

const { t } = useT()
const paradoxicalStore = useParadoxicalIntentionStore()
const saved = ref(false)

onMounted(() => {
  paradoxicalStore.loadLabs()
})

async function handleSaved(data: CreateParadoxicalIntentionPayload) {
  await paradoxicalStore.createLab(data)
  saved.value = true
  await paradoxicalStore.loadLabs()
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
