<template>
  <ExercisePage
    :title="t('exercises.cards.behavioralActivation.title')"
    :subtitle="t('exercises.cards.behavioralActivation.subtitle')"
  >
    <BehavioralActivationWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="behavioral-activation" @again="saved = false" />

    <!-- Past plans section -->
    <div v-if="activationStore.sortedActivations.length > 0" class="mt-8">
      <div class="mg-v2-section-head">
        <h2>{{ t('exercises.views.pastPlans') }}</h2>
      </div>
      <div class="space-y-3">
        <AppCard v-for="plan in activationStore.sortedActivations" :key="plan.id" padding="md">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface">
                {{ t('exercises.views.weekOf', { date: formatDayRef(plan.weekStartDate) }) }}
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ plan.activities.length }} activities &middot;
                {{ plan.activities.filter(a => a.completed).length }} completed &middot;
                {{ formatDate(plan.createdAt) }}
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
import BehavioralActivationWizard from '@/components/exercises/BehavioralActivationWizard.vue'
import { useBehavioralActivationStore } from '@/stores/behavioralActivation.store'
import type { CreateBehavioralActivationPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'

const { t, locale } = useT()
const activationStore = useBehavioralActivationStore()
const saved = ref(false)

onMounted(() => {
  activationStore.loadActivations()
})

async function handleSaved(data: CreateBehavioralActivationPayload) {
  await activationStore.createActivation(data)
  saved.value = true
  await activationStore.loadActivations()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}

function formatDayRef(dayRef: string): string {
  const [year, month, day] = dayRef.split('-').map(Number)
  return formatExerciseDate(new Date(year, month - 1, day), locale.value)
}
</script>
