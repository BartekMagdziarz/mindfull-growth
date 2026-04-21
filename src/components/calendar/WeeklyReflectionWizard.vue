<template>
  <section data-testid="weekly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <div class="flex items-center justify-between">
      <div class="flex items-baseline gap-2">
        <h2 class="text-lg font-bold text-on-surface">
          {{ t('planning.reflection.weekly.title') }}
        </h2>
        <span v-if="stepSubtitle" class="text-xs text-on-surface-variant">— {{ stepSubtitle }}</span>
      </div>
      <div class="flex items-center gap-3">
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
        <WeeklyReviewDayCards
          :data-bundle="dataBundle"
          :week-ref="props.weekRef"
          :today-day-ref="todayDayRef"
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

      <!-- Step: Anchors -->
      <div v-else-if="currentStep === 'anchors'" key="anchors">
        <ReflectionAnchorsGrid
          :categories="weeklyAnchorCategories"
          :model-value="promptResponses"
          @update:model-value="promptResponses = $event"
        />
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal">
        <ReflectionJournalSidebar
          :model-value="freeformReflection"
          :placeholder="t('planning.reflection.weekly.journalPlaceholder')"
          :anchors="promptResponses"
          :anchor-categories="weeklyAnchorCategories"
          :rating-groups="weeklyRatingSummary"
          :data-bundle="dataBundle"
          :week-ref="props.weekRef"
          @update:model-value="freeformReflection = $event"
        />
      </div>
    </Transition>

    <!-- Navigation Footer -->
    <div class="flex items-center justify-between pt-2">
      <AppButton
        v-if="stepIndex > 0"
        variant="tonal"
        :aria-label="t('common.buttons.back')"
        @click="prevStep()"
      >
        <AppIcon name="arrow_back" class="text-lg" />
      </AppButton>
      <div v-else />

      <AppButton
        v-if="currentStep === 'journal'"
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
        :aria-label="t('common.buttons.next')"
        @click="nextStep()"
      >
        <AppIcon name="arrow_forward" class="text-lg" />
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
import ReflectionAnchorsGrid from './ReflectionAnchorsGrid.vue'
import ReflectionJournalSidebar from './ReflectionJournalSidebar.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
import type { SidebarRatingGroup } from './ReflectionJournalSidebar.vue'
import {
  useWeeklyReflectionWizard,
  type WeeklyReflectionStep,
} from '@/composables/useWeeklyReflectionWizard'
import { useT } from '@/composables/useT'
import type { DayRef, WeekRef } from '@/domain/period'
import { getPeriodRefsForDate } from '@/utils/periods'

const { t } = useT()

const props = defineProps<{
  weekRef: WeekRef
}>()

// Current system day — drives the "today" marker on the 7-day grid and the
// ReflectionMeasurementRow chart visualizations. We compute it up-front and
// keep it static for the lifetime of the wizard (no need to tick per-minute).
const todayDayRef: DayRef = getPeriodRefsForDate(new Date()).day

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: WeeklyReflectionStep[] = [
  'review',
  'context',
  'state',
  'evaluation',
  'anchors',
  'journal',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.context'),
  t('planning.reflection.steps.state'),
  t('planning.reflection.steps.evaluation'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'review': return t('planning.reflection.weekly.reviewSubtitle')
    case 'context': return t('planning.reflection.weekly.groups.context.subtitle')
    case 'state': return t('planning.reflection.weekly.groups.state.subtitle')
    case 'evaluation': return t('planning.reflection.weekly.groups.evaluation.subtitle')
    default: return ''
  }
})

const weeklyAnchorCategories = computed(() => [
  { key: 'wentWell', label: t('planning.reflection.weekly.anchors.wentWell'), icon: 'thumb_up' },
  { key: 'challenges', label: t('planning.reflection.weekly.anchors.challenges'), icon: 'warning' },
  { key: 'gratitude', label: t('planning.reflection.weekly.anchors.gratitude'), icon: 'favorite' },
  { key: 'lessons', label: t('planning.reflection.weekly.anchors.lessons'), icon: 'lightbulb' },
  { key: 'improvements', label: t('planning.reflection.weekly.anchors.improvements'), icon: 'build' },
  { key: 'lookingAhead', label: t('planning.reflection.weekly.anchors.lookingAhead'), icon: 'arrow_forward' },
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

const weeklyRatingSummary = computed<SidebarRatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.context.title'),
    question: t('planning.reflection.weekly.groups.context.subtitle'),
    items: [
      { label: t('planning.reflection.weekly.dimensions.physicalIntensity'), value: physicalIntensityRating.value },
      { label: t('planning.reflection.weekly.dimensions.taskLoad'), value: taskLoadRating.value },
      { label: t('planning.reflection.weekly.dimensions.emotionalIntensity'), value: emotionalIntensityRating.value },
      { label: t('planning.reflection.weekly.dimensions.socialIntensity'), value: socialIntensityRating.value },
    ],
  },
  {
    title: t('planning.reflection.weekly.groups.state.title'),
    question: t('planning.reflection.weekly.groups.state.subtitle'),
    items: [
      { label: t('planning.reflection.weekly.dimensions.mood'), value: moodRating.value },
      { label: t('planning.reflection.weekly.dimensions.energy'), value: energyRating.value },
      { label: t('planning.reflection.weekly.dimensions.calm'), value: calmRating.value },
      { label: t('planning.reflection.weekly.dimensions.connection'), value: connectionRating.value },
    ],
  },
  {
    title: t('planning.reflection.weekly.groups.evaluation.title'),
    question: t('planning.reflection.weekly.groups.evaluation.subtitle'),
    items: [
      { label: t('planning.reflection.weekly.dimensions.productivity'), value: productivityRating.value },
      { label: t('planning.reflection.weekly.dimensions.engagement'), value: engagementRating.value },
      { label: t('planning.reflection.weekly.dimensions.emotionalRegulation'), value: emotionalRegulationRating.value },
      { label: t('planning.reflection.weekly.dimensions.selfCare'), value: selfCareRating.value },
    ],
  },
])

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
