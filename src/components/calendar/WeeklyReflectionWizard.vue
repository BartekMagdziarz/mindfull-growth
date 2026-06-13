<template>
  <section data-testid="weekly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-on-surface">
        {{ t('planning.reflection.weekly.title') }}
      </h2>
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
        <AppButton
          variant="text"
          :aria-label="t('common.buttons.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" class="text-lg" />
        </AppButton>
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
      <!-- Step: Demands -->
      <div v-if="currentStep === 'demands'" key="demands" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="demandsGroup"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Actions -->
      <div v-else-if="currentStep === 'actions'" key="actions" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="actionsGroup"
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
          :ai-summary="aiSummary"
          :summary-context="summaryContext"
          @update:model-value="freeformReflection = $event"
          @update:ai-summary="aiSummary = $event"
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
import type { WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'
import {
  emotionContextFromSummary,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'

const { t } = useT()

const props = defineProps<{
  weekRef: WeekRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: WeeklyReflectionStep[] = [
  'demands',
  'actions',
  'state',
  'anchors',
  'journal',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.demands'),
  t('planning.reflection.steps.actions'),
  t('planning.reflection.steps.state'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

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
  physicalIntensityRating,
  emotionalIntensityRating,
  taskLoadRating,
  closeOnesNeedsRating,
  physicalCareRating,
  emotionalProcessingRating,
  productivityRating,
  closeOnesSupportRating,
  moodRating,
  energyRating,
  calmRating,
  connectionRating,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
} = useWeeklyReflectionWizard(toRef(props, 'weekRef'))

// Icon sets for each dimension
const ICONS = {
  // Demands
  physicalIntensity: ['hotel', 'airline_seat_recline_normal', 'directions_walk', 'directions_run', 'sprint'] as [string, string, string, string, string],
  emotionalIntensity: ['wb_sunny', 'partly_cloudy_day', 'rainy', 'thunderstorm', 'cyclone'] as [string, string, string, string, string],
  taskLoad: ['inbox', 'task', 'checklist', 'assignment_late', 'local_fire_department'] as [string, string, string, string, string],
  closeOnesNeeds: ['bedtime', 'person', 'group', 'priority_high', 'sos'] as [string, string, string, string, string],
  // Actions
  physicalCare: ['heart_broken', 'heart_minus', 'heart_check', 'heart_plus', 'favorite'] as [string, string, string, string, string],
  emotionalProcessing: ['visibility_off', 'sentiment_frustrated', 'sentiment_neutral', 'sentiment_calm', 'shield_with_heart'] as [string, string, string, string, string],
  productivity: ['block', 'trending_down', 'trending_flat', 'trending_up', 'rocket_launch'] as [string, string, string, string, string],
  closeOnesSupport: ['do_not_disturb_on', 'person_off', 'person', 'volunteer_activism', 'favorite'] as [string, string, string, string, string],
  // State
  mood: ['sentiment_very_dissatisfied', 'sentiment_dissatisfied', 'sentiment_neutral', 'sentiment_satisfied', 'sentiment_very_satisfied'] as [string, string, string, string, string],
  energy: ['battery_0_bar', 'battery_2_bar', 'battery_4_bar', 'battery_full', 'battery_charging_full'] as [string, string, string, string, string],
  calm: ['earthquake', 'air', 'airwave', 'waves', 'self_improvement'] as [string, string, string, string, string],
  connection: ['person_off', 'person', 'group', 'diversity_3', 'favorite'] as [string, string, string, string, string],
}

const demandsGroup = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.demands.title'),
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
        key: 'emotionalIntensity',
        label: t('planning.reflection.weekly.dimensions.emotionalIntensity'),
        value: emotionalIntensityRating.value,
        icons: ICONS.emotionalIntensity,
        lowLabel: t('planning.reflection.weekly.scaleLabels.emotionalIntensity.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.emotionalIntensity.high'),
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
        key: 'closeOnesNeeds',
        label: t('planning.reflection.weekly.dimensions.closeOnesNeeds'),
        value: closeOnesNeedsRating.value,
        icons: ICONS.closeOnesNeeds,
        lowLabel: t('planning.reflection.weekly.scaleLabels.closeOnesNeeds.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.closeOnesNeeds.high'),
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

const actionsGroup = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.actions.title'),
    dimensions: [
      {
        key: 'physicalCare',
        label: t('planning.reflection.weekly.dimensions.physicalCare'),
        value: physicalCareRating.value,
        icons: ICONS.physicalCare,
        lowLabel: t('planning.reflection.weekly.scaleLabels.physicalCare.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.physicalCare.high'),
      },
      {
        key: 'emotionalProcessing',
        label: t('planning.reflection.weekly.dimensions.emotionalProcessing'),
        value: emotionalProcessingRating.value,
        icons: ICONS.emotionalProcessing,
        lowLabel: t('planning.reflection.weekly.scaleLabels.emotionalProcessing.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.emotionalProcessing.high'),
      },
      {
        key: 'productivity',
        label: t('planning.reflection.weekly.dimensions.productivity'),
        value: productivityRating.value,
        icons: ICONS.productivity,
        lowLabel: t('planning.reflection.weekly.scaleLabels.productivity.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.productivity.high'),
      },
      {
        key: 'closeOnesSupport',
        label: t('planning.reflection.weekly.dimensions.closeOnesSupport'),
        value: closeOnesSupportRating.value,
        icons: ICONS.closeOnesSupport,
        lowLabel: t('planning.reflection.weekly.scaleLabels.closeOnesSupport.low'),
        highLabel: t('planning.reflection.weekly.scaleLabels.closeOnesSupport.high'),
      },
    ],
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'physicalIntensity': physicalIntensityRating.value = value; break
    case 'emotionalIntensity': emotionalIntensityRating.value = value; break
    case 'taskLoad': taskLoadRating.value = value; break
    case 'closeOnesNeeds': closeOnesNeedsRating.value = value; break
    case 'physicalCare': physicalCareRating.value = value; break
    case 'emotionalProcessing': emotionalProcessingRating.value = value; break
    case 'productivity': productivityRating.value = value; break
    case 'closeOnesSupport': closeOnesSupportRating.value = value; break
    case 'mood': moodRating.value = value; break
    case 'energy': energyRating.value = value; break
    case 'calm': calmRating.value = value; break
    case 'connection': connectionRating.value = value; break
  }
}

const weeklyRatingSummary = computed<SidebarRatingGroup[]>(() => [
  {
    title: t('planning.reflection.weekly.groups.demands.title'),
    items: [
      { label: t('planning.reflection.weekly.dimensions.physicalIntensity'), value: physicalIntensityRating.value },
      { label: t('planning.reflection.weekly.dimensions.emotionalIntensity'), value: emotionalIntensityRating.value },
      { label: t('planning.reflection.weekly.dimensions.taskLoad'), value: taskLoadRating.value },
      { label: t('planning.reflection.weekly.dimensions.closeOnesNeeds'), value: closeOnesNeedsRating.value },
    ],
  },
  {
    title: t('planning.reflection.weekly.groups.actions.title'),
    items: [
      { label: t('planning.reflection.weekly.dimensions.physicalCare'), value: physicalCareRating.value },
      { label: t('planning.reflection.weekly.dimensions.emotionalProcessing'), value: emotionalProcessingRating.value },
      { label: t('planning.reflection.weekly.dimensions.productivity'), value: productivityRating.value },
      { label: t('planning.reflection.weekly.dimensions.closeOnesSupport'), value: closeOnesSupportRating.value },
    ],
  },
  {
    title: t('planning.reflection.weekly.groups.state.title'),
    items: [
      { label: t('planning.reflection.weekly.dimensions.mood'), value: moodRating.value },
      { label: t('planning.reflection.weekly.dimensions.energy'), value: energyRating.value },
      { label: t('planning.reflection.weekly.dimensions.calm'), value: calmRating.value },
      { label: t('planning.reflection.weekly.dimensions.connection'), value: connectionRating.value },
    ],
  },
])

const summaryPeriodLabel = computed(() => {
  const bounds = getPeriodBounds(props.weekRef)
  const start = new Date(bounds.start + 'T12:00:00')
  const end = new Date(bounds.end + 'T12:00:00')
  const startFmt = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const endFmt = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const match = /W(\d+)/.exec(props.weekRef)
  const weekLabel = match ? `W${match[1]}` : props.weekRef
  return `${weekLabel} · ${startFmt}–${endFmt}`
})

// Localized, kind-agnostic payload the AI summary/questions are built from.
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'weekly',
    periodLabel: summaryPeriodLabel.value,
    ratings: weeklyRatingSummary.value.flatMap((g) => g.items),
    anchors: weeklyAnchorCategories.value
      .map((c) => ({ label: c.label, text: (promptResponses.value[c.key] ?? '').trim() }))
      .filter((a) => a.text.length > 0),
    freeform: freeformReflection.value,
    journalEntries: bundle?.journalEntries ?? [],
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
  }
})

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
