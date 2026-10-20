<template>
  <ExercisePage
    :title="t('exercises.cards.paradoxicalIntention.title')"
    :subtitle="t('exercises.cards.paradoxicalIntention.subtitle')"
  >
    <ParadoxicalIntentionWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="paradoxical-intention" @again="saved = false" />

    <!-- Past labs -->
    <div v-if="paradoxicalStore.sortedLabs.length > 0" class="mt-8">
      <div class="mg-v2-section-head">
        <h2>{{ t('exercises.views.pastLabs') }}</h2>
      </div>
      <div class="space-y-3">
        <AppCard v-for="lab in paradoxicalStore.sortedLabs" :key="lab.id" padding="md">
          <div>
            <p class="text-sm font-medium text-on-surface mb-1">
              {{ lab.fears.length }} fear{{ lab.fears.length > 1 ? 's' : '' }} worked on
            </p>
            <ul class="space-y-0.5">
              <li v-for="fear in lab.fears" :key="fear.id" class="text-xs text-on-surface-variant">
                {{ fear.description }}
                <span v-if="fear.paradoxicalIntention" class="text-primary italic">
                  → {{ fear.paradoxicalIntention.slice(0, 50)
                  }}{{ fear.paradoxicalIntention.length > 50 ? '...' : '' }}
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
import { formatExerciseDate } from '@/utils/exerciseDate'
import type { CreateParadoxicalIntentionPayload } from '@/domain/exercises'

const { t, locale } = useT()
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
  return formatExerciseDate(iso, locale.value)
}
</script>
