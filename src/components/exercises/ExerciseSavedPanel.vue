<template>
  <AppCard padding="lg" class="exercise-saved">
    <header class="exercise-saved__head">
      <span class="exercise-saved__mark" aria-hidden="true">
        <AppIcon class="material-symbols-outlined" name="check" />
      </span>
      <h2 class="exercise-saved__title">
        {{ t('exercises.savedPanel.title') }}
      </h2>
    </header>
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
  </AppCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import RepeatPlanPrompt from '@/components/exercises/RepeatPlanPrompt.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

/**
 * After a save: a quiet confirmation in the card's own voice — a small
 * check, "Zapisano", the repeat planning, then the two ways on. No
 * celebration; the entry is the point.
 */
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
  gap: var(--mg-space-3);
}

.exercise-saved__head {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
}

.exercise-saved__mark {
  display: inline-grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-paper);
  color: var(--mg-color-primary);
}

.exercise-saved__mark .material-symbols-outlined {
  font-size: 1.1rem;
}

.exercise-saved__title {
  margin: 0;
  color: var(--mg-color-ink);
  font-size: var(--mg-font-size-lg);
  font-weight: 800;
  letter-spacing: -0.01em;
}

.exercise-saved__lead {
  margin: 0;
  max-width: 56ch;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-sm);
}

.exercise-saved__actions {
  display: flex;
  align-items: center;
  gap: var(--mg-space-2);
  margin-top: var(--mg-space-1);
}

.exercise-saved__actions .mg-v2-button:not(.mg-v2-button--primary) {
  box-shadow: none;
}

.exercise-saved__actions > :first-child.mg-v2-button--quiet {
  margin-left: calc(-1 * var(--mg-space-4));
}
</style>
