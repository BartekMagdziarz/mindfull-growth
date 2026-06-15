<template>
  <section data-testid="weekly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-bold text-on-surface">
        {{ t('planning.weekWizard.title') }}
      </h2>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" role="group" :aria-label="t('planning.reflection.weekly.progress')">
          <button
            v-for="(label, idx) in stepLabels"
            :key="idx"
            type="button"
            :disabled="isStepLocked(STEPS[idx])"
            :aria-label="`${idx + 1}. ${label}${isStepLocked(STEPS[idx]) ? ' (locked)' : idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
            class="rounded-full transition-all duration-200"
            :class="
              isStepLocked(STEPS[idx])
                ? 'neo-step-future w-2.5 h-2.5 opacity-40 cursor-not-allowed'
                : idx < stepIndex
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
        <AppButton variant="text" @click="emit('open-grid')">
          {{ t('planning.weekPlanning.editGrid') }}
        </AppButton>
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
      <!-- Step: Intentions (planning) -->
      <div v-if="currentStep === 'intentions'" key="intentions" class="space-y-4">
        <ul v-if="intentions.length > 0" class="space-y-2">
          <li
            v-for="intention in intentions"
            :key="intention.id"
            class="neo-surface flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-neu-raised-sm"
          >
            <AppIcon name="target" class="text-base text-on-surface-variant" />
            <span class="min-w-0 flex-1 truncate font-medium text-on-surface">{{ intention.title }}</span>
            <span class="shrink-0 text-xs text-on-surface-variant">{{ targetSummary(intention) }}</span>
          </li>
        </ul>
        <p v-else class="text-xs text-on-surface-variant">
          {{ t('planning.weekPlanning.intentions.empty') }}
        </p>
        <IntentionComposer :week-ref="props.weekRef" layout="stacked" @created="onIntentionCreated" />
      </div>

      <!-- Step: Priorities / top-3 (planning) -->
      <div v-else-if="currentStep === 'priorities'" key="priorities" class="space-y-3">
        <p class="text-sm text-on-surface-variant">
          {{ t('planning.weekWizard.prioritiesIntro') }}
        </p>
        <ul v-if="candidates.length > 0" class="space-y-2">
          <li v-for="candidate in candidates" :key="candidate.key">
            <button
              type="button"
              class="neo-surface flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm shadow-neu-raised-sm transition-all"
              :class="selectedKeys.includes(candidate.key) ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'"
              @click="toggleCandidate(candidate.key)"
            >
              <AppIcon :name="selectedKeys.includes(candidate.key) ? 'check_circle' : 'radio_button_unchecked'" class="text-base" />
              <span class="min-w-0 flex-1 truncate">{{ candidate.title }}</span>
              <span class="shrink-0 text-xs text-on-surface-variant">{{ candidate.typeLabel }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="text-xs text-on-surface-variant">
          {{ t('planning.weekPlanning.priorities.empty') }}
        </p>
        <p v-if="selectedKeys.length > SOFT_LIMIT" class="text-xs font-medium text-amber-600">
          {{ t('planning.weekPlanning.priorities.softLimitWarning', { n: SOFT_LIMIT }) }}
        </p>
        <p v-if="!reflectionUnlocked" class="text-xs text-on-surface-variant">
          {{ t('planning.weekWizard.reflectionLockedHint') }}
        </p>
      </div>

      <!-- Step: Review (confrontation + per-object comments) -->
      <div v-else-if="currentStep === 'review'" key="review" class="space-y-3">
        <p class="text-sm text-on-surface-variant">
          {{ t('planning.reflection.review.intro') }}
        </p>
        <ReflectionObjectReview
          v-if="dataBundle"
          v-model:comments="objectComments"
          :items="dataBundle.weekObjectItems"
          :raw-entries="dataBundle.rawEntries"
          :all-day-assignments="dataBundle.allDayAssignments"
          :week-ref="props.weekRef"
          :today-day-ref="reviewTodayDayRef"
          :top-priority-keys="topPriorityKeys"
        />
        <p v-else class="text-sm text-on-surface-variant">
          {{ t('common.loading') }}
        </p>
      </div>

      <!-- Step: Demands -->
      <div v-else-if="currentStep === 'demands'" key="demands" class="space-y-4">
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

      <div class="flex items-center gap-2">
        <!-- Last reflection step: save + jump to planning next week. -->
        <template v-if="currentStep === 'journal'">
          <AppButton variant="text" :disabled="isSaving" @click="handleSaveAndPlanNext">
            {{ t('planning.weekWizard.planNextWeek') }}
          </AppButton>
          <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
            {{ isSaving ? t('planning.reflection.saving') : t('planning.reflection.save') }}
          </AppButton>
        </template>
        <!-- Last reachable step while reflection is still locked: planning is saved live, just close. -->
        <AppButton
          v-else-if="isLastStep"
          variant="filled"
          @click="emit('close')"
        >
          {{ t('planning.weekWizard.done') }}
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
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IntentionComposer from './IntentionComposer.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import ReflectionAnchorsGrid from './ReflectionAnchorsGrid.vue'
import ReflectionJournalSidebar from './ReflectionJournalSidebar.vue'
import ReflectionObjectReview from './ReflectionObjectReview.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
import type { SidebarRatingGroup } from './ReflectionJournalSidebar.vue'
import type { WeeklyIntention } from '@/domain/planning'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import { getWeekPlanningBundle } from '@/services/planningStateQueries'
import { isMeasurementSubjectOpen } from '@/services/planningVisibility'
import { listWeeklyIntentions, setWeekTopPriorities } from '@/services/weeklyIntentionService'
import {
  useWeeklyReflectionWizard,
  type WeeklyReflectionStep,
} from '@/composables/useWeeklyReflectionWizard'
import { useT } from '@/composables/useT'
import type { DayRef, WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'

const { t } = useT()

const props = defineProps<{
  weekRef: WeekRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
  'open-grid': []
  'plan-next-week': []
}>()

// Unified week ritual: planning steps first, then the (date-gated) reflection steps.
const STEPS: WeeklyReflectionStep[] = [
  'intentions',
  'priorities',
  'review',
  'demands',
  'actions',
  'state',
  'anchors',
  'journal',
]

const stepLabels = computed(() => [
  t('planning.weekWizard.steps.intentions'),
  t('planning.weekWizard.steps.priorities'),
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.demands'),
  t('planning.reflection.steps.actions'),
  t('planning.reflection.steps.state'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

// Slimmed to a 3-anchor core (D2): wins / hard parts / synthesis. The forward-looking
// anchors (improvements, lookingAhead) moved to the planning side (week intention + top-3),
// and gratitude was dropped from the default set. Object-level recap now lives in the
// review step's per-object comments.
const weeklyAnchorCategories = computed(() => [
  { key: 'wentWell', label: t('planning.reflection.weekly.anchors.wentWell'), icon: 'thumb_up' },
  { key: 'challenges', label: t('planning.reflection.weekly.anchors.challenges'), icon: 'warning' },
  { key: 'lessons', label: t('planning.reflection.weekly.anchors.lessons'), icon: 'lightbulb' },
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  reflectionUnlocked,
  isStepLocked,
  isLastStep,
  dataBundle,
  objectComments,
  topPriorityKeys,
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

// Charts in the review step mark "today" at the week's end (the reflection's as-of day).
const reviewTodayDayRef = computed(() => getPeriodBounds(props.weekRef).end as DayRef)

// --- Planning steps (intentions + top-3) ---------------------------------------------
// Planning persists live: intentions via IntentionComposer (creates on submit), top-3 via
// setWeekTopPriorities on every toggle. The wizard's explicit Save is purely for reflection.
const intentions = ref<WeeklyIntention[]>([])

interface Candidate {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  typeLabel: string
}
const candidates = ref<Candidate[]>([])
const selectedKeys = ref<string[]>([])
const isSavingPlan = ref(false)

function targetSummary(intention: WeeklyIntention): string {
  const target = intention.target
  const operator = t(`planning.objects.targetOperators.${target.operator}`)
  if (target.kind === 'count') return `${operator} ${target.value}`
  const aggregation = t(`planning.objects.targetAggregations.${target.aggregation}`)
  return `${aggregation} ${operator} ${target.value}`
}

function typeLabelFor(subjectType: MeasurementSubjectType): string {
  return t(`planning.weekPlanning.subjectType.${subjectType}`)
}

async function loadIntentions(): Promise<void> {
  intentions.value = await listWeeklyIntentions(props.weekRef)
}

async function loadCandidates(): Promise<void> {
  const bundle = await getWeekPlanningBundle(props.weekRef)
  const seen = new Set<string>()
  const list: Candidate[] = []
  for (const item of bundle.relevant.measurementItems) {
    if (item.subjectType === 'tracker') continue // no target → not an eligible priority
    if (!isMeasurementSubjectOpen(item.subject)) continue
    const key = `${item.subjectType}:${item.subject.id}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push({
      key,
      subjectType: item.subjectType,
      subjectId: item.subject.id,
      title: item.subject.title,
      typeLabel: typeLabelFor(item.subjectType),
    })
  }
  candidates.value = list
  selectedKeys.value = (bundle.weekPlan?.topPriorities ?? []).map(
    (ref) => `${ref.subjectType}:${ref.subjectId}`,
  )
}

async function persistTopPriorities(): Promise<void> {
  const byKey = new Map(candidates.value.map((c) => [c.key, c]))
  const refs: WeekTopPriorityRef[] = selectedKeys.value
    .map((key) => byKey.get(key))
    .filter((c): c is Candidate => Boolean(c))
    .map((c) => ({ subjectType: c.subjectType, subjectId: c.subjectId }))
  isSavingPlan.value = true
  try {
    await setWeekTopPriorities(props.weekRef, refs)
    emit('updated')
  } finally {
    isSavingPlan.value = false
  }
}

function toggleCandidate(key: string): void {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((value) => value !== key)
    : [...selectedKeys.value, key]
  void persistTopPriorities()
}

async function onIntentionCreated(): Promise<void> {
  await Promise.all([loadIntentions(), loadCandidates()])
  emit('updated')
}

const SOFT_LIMIT = 3

onMounted(() => {
  void Promise.all([loadIntentions(), loadCandidates()])
})

watch(
  () => props.weekRef,
  () => {
    void Promise.all([loadIntentions(), loadCandidates()])
  },
)

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
// Top-3 + any commented object, with outcome — grounds the AI summary in the week's priorities.
const summaryPriorities = computed<ReflectionPriorityLine[]>(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  const keys = new Set(topPriorityKeys.value)
  return bundle.weekObjectItems
    .filter(
      (item) => keys.has(item.key) || (objectComments.value[item.key] ?? '').trim().length > 0,
    )
    .map((item) => ({
      title: item.subject.title,
      status: item.measurement.evaluationStatus,
      comment: objectComments.value[item.key],
    }))
})

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
    priorities: summaryPriorities.value,
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

// Last reflection step: save this week's reflection, then jump to planning next week (W+1).
async function handleSaveAndPlanNext() {
  try {
    await save()
    emit('updated')
    emit('plan-next-week')
  } catch (err) {
    console.error('Failed to save weekly reflection:', err)
  }
}
</script>
