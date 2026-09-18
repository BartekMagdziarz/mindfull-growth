<template>
  <section class="mg-v2-surface mg-v2-surface--raised-sm mg-v2-surface--sheet exercise-saved">
    <span class="mg-v2-icon-board mg-v2-icon-board--lg" aria-hidden="true">
      <AppIcon class="material-symbols-outlined" name="check" />
    </span>
    <h2 class="exercise-saved__title">
      {{ t('exercises.savedPanel.title') }}
    </h2>
    <p class="exercise-saved__lead">
      {{ tg('exercises.savedPanel.description') }}
    </p>

    <RepeatPlanPrompt :exercise-slug="exerciseSlug" :suggested-days="suggestedDays" />

    <div class="exercise-saved__actions">
      <AppButton variant="text" @click="emit('again')">
        {{ t('exercises.savedPanel.doAgain') }}
      </AppButton>
      <AppButton variant="filled" @click="router.push('/exercises')">
        {{ t('exercises.savedPanel.backToExercises') }}
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import RepeatPlanPrompt from '@/components/exercises/RepeatPlanPrompt.vue'
import { useT } from '@/composables/useT'

defineProps<{
  exerciseSlug: string
  /** Forwarded to RepeatPlanPrompt (assessment retake prefill). */
  suggestedDays?: number
}>()

const emit = defineEmits<{ again: [] }>()

const router = useRouter()
const { t, tg } = useT()
</script>

<style scoped>
.exercise-saved {
  display: grid;
  justify-items: center;
  gap: var(--mg-space-3);
  padding: var(--mg-space-6);
  text-align: center;
}

.exercise-saved__title {
  margin: 0;
  font-size: var(--mg-font-size-lg);
  font-weight: 800;
}

.exercise-saved__lead {
  margin: 0;
  max-width: 44ch;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}

.exercise-saved__actions {
  display: flex;
  justify-content: center;
  gap: var(--mg-space-3);
}
</style>
