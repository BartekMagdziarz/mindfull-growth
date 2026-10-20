<template>
  <ExercisePage
    :title="t('exercises.cards.compassionateLetter.title')"
    :subtitle="t('exercises.cards.compassionateLetter.subtitle')"
  >
    <CompassionateLetterWizard v-if="!saved" :seed="wizardSeed" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="compassionate-letter" @again="saved = false" />

    <!-- Past letters section -->
    <div v-if="compassionateLetterStore.sortedLetters.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastLetters') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="letter in compassionateLetterStore.sortedLetters"
          :key="letter.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-on-surface line-clamp-2">{{ letter.situation }}</p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ formatDate(letter.createdAt) }}
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
import CompassionateLetterWizard from '@/components/exercises/CompassionateLetterWizard.vue'
import { useCompassionateLetterStore } from '@/stores/compassionateLetter.store'
import type { CreateCompassionateLetterPayload } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import { useMomentSeed } from '@/features/program-path/useMomentSeed'

const { t, locale } = useT()
// Launched from a path moment (`?momentId=`): the situation and the critic's sentence prefill the letter.
const { seed } = useMomentSeed()
const wizardSeed = computed(() => (seed.value ? { situation: seed.value.situation, criticThought: seed.value.criticThought } : undefined))
const compassionateLetterStore = useCompassionateLetterStore()
const saved = ref(false)

onMounted(() => {
  compassionateLetterStore.loadLetters()
})

async function handleSaved(data: CreateCompassionateLetterPayload) {
  await compassionateLetterStore.createLetter(data)
  saved.value = true
  // Reload letters so the new one shows up in the past letters list
  await compassionateLetterStore.loadLetters()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
