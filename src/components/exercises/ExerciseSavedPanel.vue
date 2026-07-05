<template>
  <AppCard padding="lg" class="space-y-4 text-center">
    <AppIcon name="check_circle" class="text-4xl text-primary" />
    <h2 class="text-lg font-semibold text-on-surface">
      {{ t('exercises.savedPanel.title') }}
    </h2>
    <p class="text-sm text-on-surface-variant">
      {{ tg('exercises.savedPanel.description') }}
    </p>

    <RepeatPlanPrompt :exercise-slug="exerciseSlug" :suggested-days="suggestedDays" />

    <div class="flex justify-center gap-3">
      <AppButton variant="text" @click="emit('again')">
        {{ t('exercises.savedPanel.doAgain') }}
      </AppButton>
      <AppButton variant="filled" @click="router.push('/exercises')">
        {{ t('exercises.savedPanel.backToExercises') }}
      </AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
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
