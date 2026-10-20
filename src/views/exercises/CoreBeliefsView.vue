<template>
  <ExercisePage
    :title="t('exercises.cards.coreBeliefs.title')"
    :subtitle="t('exercises.cards.coreBeliefs.subtitle')"
  >
    <CoreBeliefsWizard v-if="!saved" :seed="wizardSeed" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="core-beliefs" @again="saved = false" />

    <!-- Past entries section -->
    <div v-if="coreBeliefsStore.sortedExplorations.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastExplorations') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="entry in coreBeliefsStore.sortedExplorations"
          :key="entry.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ entry.coreBelief }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                <span class="exercise-pill px-2 py-0.5 text-xs mr-1.5">{{ categoryLabel(entry.beliefCategory) }}</span>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import CoreBeliefsWizard from '@/components/exercises/CoreBeliefsWizard.vue'
import { useCoreBeliefsStore } from '@/stores/coreBeliefs.store'
import type { CreateCoreBeliefsExplorationPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import { latestCriticThought, latestFairDemand } from '@/features/program-path/momentSeed'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'

const { t, locale } = useT()
const route = useRoute()
const entryStore = useMicroExerciseEntryStore()
// `?seed=fairDemand` (shame path): the critic's latest line to examine, the reasonable demand as the alternative.
const seeded = computed(() => route.query.seed === 'fairDemand')
const wizardSeed = computed(() =>
  seeded.value
    ? { thought: latestCriticThought(entryStore.entries), alternative: latestFairDemand(entryStore.entries) }
    : undefined,
)
const coreBeliefsStore = useCoreBeliefsStore()
const saved = ref(false)

onMounted(() => {
  if (seeded.value) void entryStore.loadEntries()
  coreBeliefsStore.loadExplorations()
})

async function handleSaved(data: CreateCoreBeliefsExplorationPayload) {
  await coreBeliefsStore.createExploration(data)
  saved.value = true
  // Reload explorations so the new one shows up in the past entries list
  await coreBeliefsStore.loadExplorations()
}

function categoryLabel(category: 'self' | 'others' | 'world'): string {
  switch (category) {
    case 'self':
      return 'Self'
    case 'others':
      return 'Others'
    case 'world':
      return 'World'
  }
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
