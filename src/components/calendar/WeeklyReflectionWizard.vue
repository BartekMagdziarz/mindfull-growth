<template>
  <section data-testid="weekly-reflection-wizard" class="neo-card space-y-3 px-4 py-4 md:px-5">
    <!-- Header with close button -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-on-surface">
        {{ t('planning.reflection.weekly.title') }}
      </h2>
      <button
        type="button"
        class="neo-control neo-focus h-10 w-10 shrink-0"
        :aria-label="t('common.buttons.close')"
        @click="$emit('close')"
      >
        <AppIcon name="close" class="text-base" />
      </button>
    </div>

    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5" role="group" :aria-label="t('planning.reflection.weekly.progress')">
        <button
          v-for="(label, idx) in stepLabels"
          :key="idx"
          type="button"
          :aria-label="`Step ${idx + 1}: ${label}${idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
          class="rounded-full transition-all duration-200"
          :class="
            idx < stepIndex
              ? 'neo-step-completed w-2.5 h-2.5 cursor-pointer'
              : idx === stepIndex
                ? 'neo-step-active w-3.5 h-3.5'
                : 'neo-step-future w-2.5 h-2.5'
          "
          @click="idx < stepIndex && goToStep(STEPS[idx])"
        />
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[stepIndex] }}
      </span>
    </div>

    <!-- Step Content -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <!-- Step: Review -->
      <div v-if="currentStep === 'review'" key="review" class="space-y-4">
        <p class="text-sm text-on-surface-variant">
          {{ t('planning.reflection.weekly.reviewSubtitle') }}
        </p>
        <ReflectionReviewPanel :bundle="dataBundle" :is-loading="isBundleLoading" />
      </div>

      <!-- Step: Ratings -->
      <div v-else-if="currentStep === 'ratings'" key="ratings" class="space-y-4">
        <AppCard padding="lg" class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.weekly.ratingsTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.weekly.ratingsSubtitle') }}
          </p>
          <ReflectionDimensionRatings
            :dimensions="weeklyDimensions"
            @update:rating="handleRatingUpdate"
          />
        </AppCard>
      </div>

      <!-- Step: Prompts -->
      <div v-else-if="currentStep === 'prompts'" key="prompts" class="space-y-4">
        <AppCard padding="lg" class="space-y-5">
          <div v-for="prompt in weeklyPrompts" :key="prompt.key" class="space-y-2">
            <label :for="`prompt-${prompt.key}`" class="text-sm font-medium text-on-surface">
              {{ prompt.label }}
            </label>
            <textarea
              :id="`prompt-${prompt.key}`"
              :value="promptResponses[prompt.key] ?? ''"
              :placeholder="prompt.placeholder"
              class="neo-input min-h-[6rem] w-full resize-none p-3 text-sm text-on-surface"
              @input="handlePromptInput(prompt.key, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </AppCard>
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal" class="space-y-4">
        <AppCard padding="lg" class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.weekly.journalTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.weekly.journalSubtitle') }}
          </p>
          <textarea
            :value="freeformReflection"
            :placeholder="t('planning.reflection.weekly.journalPlaceholder')"
            class="neo-input min-h-[14rem] w-full resize-none p-4 text-on-surface"
            @input="freeformReflection = ($event.target as HTMLTextAreaElement).value"
          />
        </AppCard>
      </div>

      <!-- Step: Looking Ahead -->
      <div v-else-if="currentStep === 'ahead'" key="ahead" class="space-y-4">
        <AppCard padding="lg" class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.weekly.aheadTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.weekly.aheadSubtitle') }}
          </p>
          <textarea
            :value="lookingAhead"
            :placeholder="t('planning.reflection.weekly.aheadPlaceholder')"
            class="neo-input min-h-[8rem] w-full resize-none p-4 text-on-surface"
            @input="lookingAhead = ($event.target as HTMLTextAreaElement).value"
          />
        </AppCard>
      </div>
    </Transition>

    <!-- Navigation Footer -->
    <div class="flex items-center justify-between pt-2">
      <AppButton
        v-if="stepIndex > 0"
        variant="tonal"
        @click="prevStep()"
      >
        {{ t('common.buttons.back') }}
      </AppButton>
      <div v-else />

      <AppButton
        v-if="currentStep === 'ahead'"
        variant="filled"
        :disabled="isSaving"
        @click="handleSave"
      >
        {{ isSaving ? t('planning.reflection.saving') : t('planning.reflection.save') }}
      </AppButton>
      <AppButton
        v-else
        variant="filled"
        :disabled="!canAdvance"
        @click="nextStep()"
      >
        {{ t('common.buttons.next') }}
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ReflectionReviewPanel from './ReflectionReviewPanel.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import {
  useWeeklyReflectionWizard,
  type WeeklyReflectionStep,
} from '@/composables/useWeeklyReflectionWizard'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'

const { t } = useT()

const props = defineProps<{
  weekRef: WeekRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: WeeklyReflectionStep[] = ['review', 'ratings', 'prompts', 'journal', 'ahead']

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.ratings'),
  t('planning.reflection.steps.prompts'),
  t('planning.reflection.steps.journal'),
  t('planning.reflection.steps.ahead'),
])

const weeklyPrompts = computed(() => [
  {
    key: 'wentWell',
    label: t('planning.reflection.weekly.prompts.wentWell.label'),
    placeholder: t('planning.reflection.weekly.prompts.wentWell.placeholder'),
  },
  {
    key: 'challenges',
    label: t('planning.reflection.weekly.prompts.challenges.label'),
    placeholder: t('planning.reflection.weekly.prompts.challenges.placeholder'),
  },
  {
    key: 'lessons',
    label: t('planning.reflection.weekly.prompts.lessons.label'),
    placeholder: t('planning.reflection.weekly.prompts.lessons.placeholder'),
  },
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  dataBundle,
  isBundleLoading,
  moodRating,
  energyRating,
  focusRating,
  socialConnectionRating,
  stressLevelRating,
  promptResponses,
  freeformReflection,
  lookingAhead,
  isSaving,
  save,
} = useWeeklyReflectionWizard(toRef(props, 'weekRef'))

const weeklyDimensions = computed(() => [
  { key: 'mood', label: t('planning.reflection.weekly.dimensions.mood'), value: moodRating.value },
  {
    key: 'energy',
    label: t('planning.reflection.weekly.dimensions.energy'),
    value: energyRating.value,
  },
  {
    key: 'focus',
    label: t('planning.reflection.weekly.dimensions.focus'),
    value: focusRating.value,
  },
  {
    key: 'socialConnection',
    label: t('planning.reflection.weekly.dimensions.socialConnection'),
    value: socialConnectionRating.value,
  },
  {
    key: 'stressLevel',
    label: t('planning.reflection.weekly.dimensions.stressLevel'),
    value: stressLevelRating.value,
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'mood':
      moodRating.value = value
      break
    case 'energy':
      energyRating.value = value
      break
    case 'focus':
      focusRating.value = value
      break
    case 'socialConnection':
      socialConnectionRating.value = value
      break
    case 'stressLevel':
      stressLevelRating.value = value
      break
  }
}

function handlePromptInput(key: string, value: string) {
  promptResponses.value = { ...promptResponses.value, [key]: value }
}

async function handleSave() {
  try {
    await save()
    emit('updated')
    emit('close')
  } catch (err) {
    console.error('Failed to save weekly reflection:', err)
  }
}
</script>
