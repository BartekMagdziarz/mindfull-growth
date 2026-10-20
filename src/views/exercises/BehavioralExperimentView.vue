<template>
  <ExercisePage
    :title="t('exercises.cards.behavioralExperiment.title')"
    :subtitle="t('exercises.cards.behavioralExperiment.subtitle')"
  >
    <BehavioralExperimentWizard v-if="!saved" :seed="wizardSeed" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="behavioral-experiment" @again="saved = false" />

    <!-- Past experiments section -->
    <div v-if="experimentStore.sortedExperiments.length > 0" class="mt-8">
      <div class="mg-v2-section-head">
        <h2>{{ t('exercises.views.pastExperiments') }}</h2>
      </div>
      <div class="space-y-3">
        <AppCard v-for="exp in experimentStore.sortedExperiments" :key="exp.id" padding="md">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ exp.targetBelief }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ exp.status === 'planned' ? 'Planned' : 'Completed' }}
                &middot; {{ formatDate(exp.createdAt) }}
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
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import BehavioralExperimentWizard from '@/components/exercises/BehavioralExperimentWizard.vue'
import { useBehavioralExperimentStore } from '@/stores/behavioralExperiment.store'
import type { CreateBehavioralExperimentPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import { useMomentSeed } from '@/features/program-path/useMomentSeed'

const { t, locale } = useT()
// Launched from a path moment (`?momentId=`): the moment's thought is the prediction, its situation the context.
const { seed } = useMomentSeed()
const wizardSeed = computed(() =>
  seed.value ? { prediction: seed.value.criticThought, situation: seed.value.situation } : undefined
)
const experimentStore = useBehavioralExperimentStore()
const saved = ref(false)

onMounted(() => {
  experimentStore.loadExperiments()
})

async function handleSaved(data: CreateBehavioralExperimentPayload) {
  await experimentStore.createExperiment(data)
  saved.value = true
  await experimentStore.loadExperiments()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
