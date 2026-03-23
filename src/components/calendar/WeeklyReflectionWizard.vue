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
        <WeeklyReviewDayCards
          :daily-breakdown="dataBundle?.dailyBreakdown ?? []"
          :weekly-summary="dataBundle?.weeklySummary ?? { weeklyHabits: [], monthlyHabits: [], totalEmotionLogs: 0, totalJournalEntries: 0, totalExercises: 0 }"
          :is-loading="isBundleLoading"
        />
      </div>

      <!-- Step: Context -->
      <div v-else-if="currentStep === 'context'" key="context" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="contextGroup"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: State -->
      <div v-else-if="currentStep === 'state'" key="state" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="stateGroup"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Evaluation -->
      <div v-else-if="currentStep === 'evaluation'" key="evaluation" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="evaluationGroup"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Prompts -->
      <div v-else-if="currentStep === 'prompts'" key="prompts" class="space-y-5">
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
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal" class="space-y-4">
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.weekly.journalTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.weekly.journalSubtitle') }}
          </p>
          <textarea
            :value="freeformReflection"
            :placeholder="t('planning.reflection.weekly.journalPlaceholder')"
            class="neo-input min-h-[10rem] w-full resize-none p-4 text-on-surface"
            @input="freeformReflection = ($event.target as HTMLTextAreaElement).value"
          />
        </div>
      </div>

      <!-- Step: Looking Ahead -->
      <div v-else-if="currentStep === 'ahead'" key="ahead" class="space-y-4">
        <div class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.weekly.aheadTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.weekly.aheadSubtitle') }}
          </p>
          <textarea
            :value="lookingAhead"
            :placeholder="t('planning.reflection.weekly.aheadPlaceholder')"
            class="neo-input min-h-[6rem] w-full resize-none p-4 text-on-surface"
            @input="lookingAhead = ($event.target as HTMLTextAreaElement).value"
          />
        </div>
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
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import WeeklyReviewDayCards from './WeeklyReviewDayCards.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
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

const STEPS: WeeklyReflectionStep[] = [
  'review',
  'context',
  'state',
  'evaluation',
  'prompts',
  'journal',
  'ahead',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.context'),
  t('planning.reflection.steps.state'),
  t('planning.reflection.steps.evaluation'),
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
  physicalIntensityRating,
  taskLoadRating,
  emotionalIntensityRating,
  socialIntensityRating,
  moodRating,
  energyRating,
  calmRating,
  connectionRating,
  productivityRating,
  engagementRating,
  emotionalRegulationRating,
  selfCareRating,
  promptResponses,
  freeformReflection,
  lookingAhead,
  isSaving,
  save,
} = useWeeklyReflectionWizard(toRef(props, 'weekRef'))

// Icon sets for each dimension
const ICONS = {
  physicalIntensity: ['hotel', 'airline_seat_recline_normal', 'directions_walk', 'directions_run', 'sprint'] as [string, string, string, string, string],
  taskLoad: ['inbox', 'task', 'checklist', 'assignment_late', 'local_fire_department'] as [string, string, string, string, string],
  emotionalIntensity: ['wb_sunny', 'partly_cloudy_day', 'rainy', 'thunderstorm', 'cyclone'] as [string, string, string, string, string],
  socialIntensity: ['do_not_disturb_on', 'person', 'group', 'groups', 'stadium'] as [string, string, string, string, string],
  mood: ['sentiment_very_dissatisfied', 'sentiment_dissatisfied', 'sentiment_neutral', 'sentiment_satisfied', 'sentiment_very_satisfied'] as [string, string, string, string, string],
  energy: ['battery_0_bar', 'battery_2_bar', 'battery_4_bar', 'battery_full', 'battery_charging_full'] as [string, string, string, string, string],
  calm: ['earthquake', 'air', 'airwave', 'waves', 'self_improvement'] as [string, string, string, string, string],
  connection: ['person_off', 'person', 'group', 'diversity_3', 'favorite'] as [string, string, string, string, string],
  productivity: ['block', 'trending_down', 'trending_flat', 'trending_up', 'rocket_launch'] as [string, string, string, string, string],
  engagement: ['snooze', 'visibility_off', 'visibility', 'psychology', 'local_fire_department'] as [string, string, string, string, string],
  emotionalRegulation: ['sentiment_frustrated', 'sentiment_worried', 'sentiment_neutral', 'sentiment_calm', 'shield_with_heart'] as [string, string, string, string, string],
  selfCare: ['heart_broken', 'heart_minus', 'heart_check', 'heart_plus', 'favorite'] as [string, string, string, string, string],
}

const contextGroup = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.context.title'),
    subtitle: t('planning.reflection.weekly.groups.context.subtitle'),
    dimensions: [
      {
        key: 'physicalIntensity',
        label: t('planning.reflection.weekly.dimensions.physicalIntensity'),
        value: physicalIntensityRating.value,
        icons: ICONS.physicalIntensity,
        lowLabel: t('planning.reflection.weekly.scaleLabels.physicalIntensity.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.physicalIntensity.high'),
      },
      {
        key: 'taskLoad',
        label: t('planning.reflection.weekly.dimensions.taskLoad'),
        value: taskLoadRating.value,
        icons: ICONS.taskLoad,
        lowLabel: t('planning.reflection.weekly.scaleLabels.taskLoad.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.taskLoad.high'),
      },
      {
        key: 'emotionalIntensity',
        label: t('planning.reflection.weekly.dimensions.emotionalIntensity'),
        value: emotionalIntensityRating.value,
        icons: ICONS.emotionalIntensity,
        lowLabel: t('planning.reflection.weekly.scaleLabels.emotionalIntensity.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.emotionalIntensity.high'),
      },
      {
        key: 'socialIntensity',
        label: t('planning.reflection.weekly.dimensions.socialIntensity'),
        value: socialIntensityRating.value,
        icons: ICONS.socialIntensity,
        lowLabel: t('planning.reflection.weekly.scaleLabels.socialIntensity.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.socialIntensity.high'),
      },
    ],
  },
])

const stateGroup = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.state.title'),
    subtitle: t('planning.reflection.weekly.groups.state.subtitle'),
    dimensions: [
      {
        key: 'mood',
        label: t('planning.reflection.weekly.dimensions.mood'),
        value: moodRating.value,
        icons: ICONS.mood,
        lowLabel: t('planning.reflection.weekly.scaleLabels.mood.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.mood.high'),
      },
      {
        key: 'energy',
        label: t('planning.reflection.weekly.dimensions.energy'),
        value: energyRating.value,
        icons: ICONS.energy,
        lowLabel: t('planning.reflection.weekly.scaleLabels.energy.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.energy.high'),
      },
      {
        key: 'calm',
        label: t('planning.reflection.weekly.dimensions.calm'),
        value: calmRating.value,
        icons: ICONS.calm,
        lowLabel: t('planning.reflection.weekly.scaleLabels.calm.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.calm.high'),
      },
      {
        key: 'connection',
        label: t('planning.reflection.weekly.dimensions.connection'),
        value: connectionRating.value,
        icons: ICONS.connection,
        lowLabel: t('planning.reflection.weekly.scaleLabels.connection.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.connection.high'),
      },
    ],
  },
])

const evaluationGroup = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.evaluation.title'),
    subtitle: t('planning.reflection.weekly.groups.evaluation.subtitle'),
    dimensions: [
      {
        key: 'productivity',
        label: t('planning.reflection.weekly.dimensions.productivity'),
        value: productivityRating.value,
        icons: ICONS.productivity,
        lowLabel: t('planning.reflection.weekly.scaleLabels.productivity.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.productivity.high'),
      },
      {
        key: 'engagement',
        label: t('planning.reflection.weekly.dimensions.engagement'),
        value: engagementRating.value,
        icons: ICONS.engagement,
        lowLabel: t('planning.reflection.weekly.scaleLabels.engagement.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.engagement.high'),
      },
      {
        key: 'emotionalRegulation',
        label: t('planning.reflection.weekly.dimensions.emotionalRegulation'),
        value: emotionalRegulationRating.value,
        icons: ICONS.emotionalRegulation,
        lowLabel: t('planning.reflection.weekly.scaleLabels.emotionalRegulation.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.emotionalRegulation.high'),
      },
      {
        key: 'selfCare',
        label: t('planning.reflection.weekly.dimensions.selfCare'),
        value: selfCareRating.value,
        icons: ICONS.selfCare,
        lowLabel: t('planning.reflection.weekly.scaleLabels.selfCare.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.selfCare.high'),
      },
    ],
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'physicalIntensity': physicalIntensityRating.value = value; break
    case 'taskLoad': taskLoadRating.value = value; break
    case 'emotionalIntensity': emotionalIntensityRating.value = value; break
    case 'socialIntensity': socialIntensityRating.value = value; break
    case 'mood': moodRating.value = value; break
    case 'energy': energyRating.value = value; break
    case 'calm': calmRating.value = value; break
    case 'connection': connectionRating.value = value; break
    case 'productivity': productivityRating.value = value; break
    case 'engagement': engagementRating.value = value; break
    case 'emotionalRegulation': emotionalRegulationRating.value = value; break
    case 'selfCare': selfCareRating.value = value; break
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
