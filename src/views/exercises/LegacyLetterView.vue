<template>
  <ExercisePage
    :title="t('exercises.cards.legacyLetter.title')"
    :subtitle="t('exercises.cards.legacyLetter.subtitle')"
  >
    <LegacyLetterWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="legacy-letter" @again="saved = false" />

    <!-- Past letters -->
    <div v-if="legacyLetterStore.sortedLetters.length > 0" class="mt-8">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastLetters') }}</h2></div>
      <div class="space-y-3">
        <AppCard
          v-for="letter in legacyLetterStore.sortedLetters"
          :key="letter.id"
          padding="md"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-on-surface-variant line-clamp-2">
                {{ letter.letterText }}
              </p>
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
import { onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import LegacyLetterWizard from '@/components/exercises/LegacyLetterWizard.vue'
import { useLegacyLetterStore } from '@/stores/legacyLetter.store'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import type { CreateLegacyLetterPayload } from '@/domain/exercises'

const { t, locale } = useT()
const legacyLetterStore = useLegacyLetterStore()
const saved = ref(false)

onMounted(() => {
  legacyLetterStore.loadLetters()
})

async function handleSaved(data: CreateLegacyLetterPayload) {
  await legacyLetterStore.createLetter(data)
  saved.value = true
  await legacyLetterStore.loadLetters()
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
