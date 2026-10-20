<template>
  <ExercisePage
    :title="t('exercises.cards.attitudinalShift.title')"
    :subtitle="t('exercises.cards.attitudinalShift.subtitle')"
  >
    <AttitudinalShiftWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="attitudinal-shift" @again="saved = false" />

    <!-- Past shifts -->
    <div v-if="attitudinalShiftStore.sortedShifts.length > 0" class="mt-8">
      <div class="mg-v2-section-head">
        <h2>{{ t('exercises.views.pastShifts') }}</h2>
      </div>
      <div class="space-y-3">
        <AppCard v-for="shift in attitudinalShiftStore.sortedShifts" :key="shift.id" padding="md">
          <div class="flex justify-between items-start">
            <div class="min-w-0 flex-1">
              <p v-if="shift.statements[0]" class="text-sm text-on-surface truncate">
                <span class="text-on-surface-variant line-through">{{
                  truncate(shift.statements[0].belief, 30)
                }}</span>
                <span class="mx-1">&rarr;</span>
                <span class="font-medium">{{
                  truncate(shift.statements[0].reframe ?? '', 30)
                }}</span>
              </p>
              <p class="text-xs text-on-surface-variant mt-1">
                {{ shift.statements.length }} statement{{
                  shift.statements.length !== 1 ? 's' : ''
                }}
                &middot;
                {{ formatDate(shift.createdAt) }}
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
import AttitudinalShiftWizard from '@/components/exercises/AttitudinalShiftWizard.vue'
import { useAttitudinalShiftStore } from '@/stores/attitudinalShift.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useShadowBeliefsStore } from '@/stores/shadowBeliefs.store'
import { useT } from '@/composables/useT'
import { formatExerciseDate } from '@/utils/exerciseDate'
import type { CreateAttitudinalShiftPayload } from '@/domain/exercises'

const { t, locale } = useT()
const attitudinalShiftStore = useAttitudinalShiftStore()
const emotionStore = useEmotionStore()
const shadowBeliefsStore = useShadowBeliefsStore()
const saved = ref(false)

onMounted(() => {
  if (!emotionStore.isLoaded) {
    emotionStore.loadEmotions()
  }
  attitudinalShiftStore.loadShifts()
  shadowBeliefsStore.loadBeliefs()
})

async function handleSaved(data: CreateAttitudinalShiftPayload, _commitmentReframe?: string) {
  await attitudinalShiftStore.createShift(data)
  saved.value = true

  await attitudinalShiftStore.loadShifts()
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '\u2026'
}

function formatDate(iso: string): string {
  return formatExerciseDate(iso, locale.value)
}
</script>
