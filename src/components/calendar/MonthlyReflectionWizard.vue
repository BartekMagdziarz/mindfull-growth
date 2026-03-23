<template>
  <section data-testid="monthly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <div class="flex items-center justify-between">
      <div class="flex items-baseline gap-2">
        <h2 class="text-lg font-bold text-on-surface">
          {{ t('planning.reflection.monthly.title') }}
        </h2>
        <span v-if="stepSubtitle" class="text-xs text-on-surface-variant">— {{ stepSubtitle }}</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" role="group" :aria-label="t('planning.reflection.monthly.progress')">
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
        <ReflectionReviewPanel :bundle="dataBundle" :is-loading="isBundleLoading" />
      </div>

      <!-- Step: Goals -->
      <div v-else-if="currentStep === 'goals'" key="goals" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <div v-if="goalSummaries.length > 0" class="space-y-3">
            <div
              v-for="goalSummary in goalSummaries"
              :key="goalSummary.goal.id"
              class="neo-inset rounded-2xl px-4 py-3 space-y-2"
            >
              <div class="flex items-center gap-2">
                <EntityIcon
                  v-if="goalSummary.goal.icon"
                  :icon="goalSummary.goal.icon"
                  size="sm"
                />
                <span class="text-sm font-semibold text-on-surface">{{ goalSummary.goal.title }}</span>
              </div>
              <div v-if="goalSummary.keyResults.length > 0" class="space-y-1.5 pl-1">
                <div
                  v-for="kr in goalSummary.keyResults"
                  :key="kr.id"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="min-w-0 truncate text-sm text-on-surface">{{ kr.title }}</span>
                  <span
                    class="neo-pill shrink-0 text-xs"
                    :class="{
                      'neo-pill--success': kr.evaluationStatus === 'met',
                      'neo-pill--error': kr.evaluationStatus === 'missed',
                    }"
                  >
                    {{ t(`planning.reflection.monthly.krStatus.${kr.evaluationStatus}`) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Habits & Trackers summary -->
          <div class="flex items-center gap-4 text-sm text-on-surface-variant">
            <span v-if="habitSummary.totalActive > 0">
              <span class="font-medium text-on-surface">{{ t('planning.reflection.monthly.habitsLabel') }}:</span>
              {{ habitSummary.metCount }}/{{ habitSummary.totalActive }} {{ t('planning.reflection.review.habitsMet') }}
            </span>
            <span v-if="trackerSummary.totalActive > 0">
              <span class="font-medium text-on-surface">{{ t('planning.reflection.monthly.trackersLabel') }}:</span>
              {{ trackerSummary.totalActive }}
            </span>
          </div>

          <p
            v-if="goalSummaries.length === 0 && habitSummary.totalActive === 0"
            class="text-sm text-on-surface-variant"
          >
            {{ t('planning.reflection.monthly.noGoals') }}
          </p>
        </AppCard>
      </div>

      <!-- Step: Weekly Recap -->
      <div v-else-if="currentStep === 'weekly-recap'" key="weekly-recap" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.monthly.weeklyRecapTitle') }}
          </h3>

          <!-- Weekly state trends (mood, energy, calm, connection) -->
          <div v-if="weeklyTrends.length > 0" class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              {{ t('planning.reflection.monthly.weeklyTrends') }}
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-on-surface-variant">
                    <th class="pb-2 pr-4 font-medium">{{ t('planning.reflection.monthly.weekLabel') }}</th>
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.mood') }}</th>
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.energy') }}</th>
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.calm') }}</th>
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.connection') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="trend in weeklyTrends"
                    :key="trend.weekRef"
                    class="border-t border-outline/10"
                  >
                    <td class="py-2 pr-4 font-medium text-on-surface">{{ trend.weekRef }}</td>
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.moodRating ?? '—' }}</td>
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.energyRating ?? '—' }}</td>
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.calmRating ?? '—' }}</td>
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.connectionRating ?? '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Weekly reflection snippets -->
          <div v-if="weeklySnippets.length > 0" class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              {{ t('planning.reflection.monthly.weeklySummaries') }}
            </h4>
            <div
              v-for="snippet in weeklySnippets"
              :key="snippet.weekRef"
              class="neo-inset rounded-2xl px-4 py-3"
            >
              <p class="text-xs font-medium text-on-surface-variant">{{ snippet.weekRef }}</p>
              <p class="mt-1 text-sm text-on-surface">{{ snippet.freeformSnippet }}</p>
            </div>
          </div>

          <p
            v-if="weeklyTrends.length === 0 && weeklySnippets.length === 0"
            class="text-sm text-on-surface-variant"
          >
            {{ t('planning.reflection.monthly.noWeeklyData') }}
          </p>
        </AppCard>
      </div>

      <!-- Step: Ratings -->
      <div v-else-if="currentStep === 'ratings'" key="ratings" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="monthlyGroups"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Anchors -->
      <div v-else-if="currentStep === 'anchors'" key="anchors">
        <ReflectionAnchorsGrid
          :categories="monthlyAnchorCategories"
          :model-value="promptResponses"
          @update:model-value="promptResponses = $event"
        />
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal">
        <ReflectionJournalSidebar
          :model-value="freeformReflection"
          :placeholder="t('planning.reflection.monthly.journalPlaceholder')"
          :anchors="promptResponses"
          :anchor-categories="monthlyAnchorCategories"
          :rating-groups="monthlyRatingSummary"
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
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import ReflectionReviewPanel from './ReflectionReviewPanel.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import ReflectionAnchorsGrid from './ReflectionAnchorsGrid.vue'
import ReflectionJournalSidebar from './ReflectionJournalSidebar.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
import type { SidebarRatingGroup } from './ReflectionJournalSidebar.vue'
import {
  useMonthlyReflectionWizard,
  type MonthlyReflectionStep,
} from '@/composables/useMonthlyReflectionWizard'
import { useT } from '@/composables/useT'
import type { MonthRef } from '@/domain/period'

const { t } = useT()

const props = defineProps<{
  monthRef: MonthRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: MonthlyReflectionStep[] = [
  'review',
  'goals',
  'weekly-recap',
  'ratings',
  'anchors',
  'journal',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.goals'),
  t('planning.reflection.steps.weeklyRecap'),
  t('planning.reflection.steps.ratings'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'review': return t('planning.reflection.monthly.reviewSubtitle')
    case 'goals': return t('planning.reflection.monthly.goalsSubtitle')
    case 'ratings': return t('planning.reflection.monthly.groups.ratings.subtitle')
    default: return ''
  }
})

const monthlyAnchorCategories = computed(() => [
  { key: 'proudOf', label: t('planning.reflection.monthly.anchors.proudOf'), icon: 'emoji_events' },
  { key: 'challenges', label: t('planning.reflection.monthly.anchors.challenges'), icon: 'warning' },
  { key: 'growth', label: t('planning.reflection.monthly.anchors.growth'), icon: 'trending_up' },
  { key: 'patterns', label: t('planning.reflection.monthly.anchors.patterns'), icon: 'pattern' },
  { key: 'carryForward', label: t('planning.reflection.monthly.anchors.carryForward'), icon: 'arrow_forward' },
  { key: 'letGo', label: t('planning.reflection.monthly.anchors.letGo'), icon: 'delete_sweep' },
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
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  isSaving,
  save,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

const weeklyTrends = computed(() => dataBundle.value?.weeklyRatingTrends ?? [])
const weeklySnippets = computed(() => dataBundle.value?.weeklyReflectionSnippets ?? [])
const goalSummaries = computed(() => dataBundle.value?.goalSummaries ?? [])
const habitSummary = computed(() => dataBundle.value?.habitSummary ?? { totalActive: 0, metCount: 0, missedCount: 0 })
const trackerSummary = computed(() => dataBundle.value?.trackerSummary ?? { totalActive: 0 })

// Icon sets for monthly dimensions
const ICONS = {
  balance: ['landslide', 'falling', 'tune', 'balance', 'all_inclusive'] as [string, string, string, string, string],
  purpose: ['search', 'question_mark', 'lightbulb', 'auto_awesome', 'moon_stars'] as [string, string, string, string, string],
  growth: ['park', 'potted_plant', 'forest', 'nature', 'landscape'] as [string, string, string, string, string],
  coherence: ['call_split', 'conversion_path', 'timeline', 'adjust', 'gps_fixed'] as [string, string, string, string, string],
  agency: ['anchor', 'explore', 'navigation', 'sailing', 'flight'] as [string, string, string, string, string],
}

const monthlyGroups = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.monthly.groups.ratings.title'),
    dimensions: [
      {
        key: 'balance',
        label: t('planning.reflection.monthly.dimensions.balance'),
        value: balanceRating.value,
        icons: ICONS.balance,
        lowLabel: t('planning.reflection.monthly.scaleLabels.balance.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.balance.high'),
      },
      {
        key: 'purpose',
        label: t('planning.reflection.monthly.dimensions.purpose'),
        value: purposeRating.value,
        icons: ICONS.purpose,
        lowLabel: t('planning.reflection.monthly.scaleLabels.purpose.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.purpose.high'),
      },
      {
        key: 'growth',
        label: t('planning.reflection.monthly.dimensions.growth'),
        value: growthRating.value,
        icons: ICONS.growth,
        lowLabel: t('planning.reflection.monthly.scaleLabels.growth.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.growth.high'),
      },
      {
        key: 'coherence',
        label: t('planning.reflection.monthly.dimensions.coherence'),
        value: coherenceRating.value,
        icons: ICONS.coherence,
        lowLabel: t('planning.reflection.monthly.scaleLabels.coherence.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.coherence.high'),
      },
      {
        key: 'agency',
        label: t('planning.reflection.monthly.dimensions.agency'),
        value: agencyRating.value,
        icons: ICONS.agency,
        lowLabel: t('planning.reflection.monthly.scaleLabels.agency.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.agency.high'),
      },
    ],
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'balance': balanceRating.value = value; break
    case 'purpose': purposeRating.value = value; break
    case 'growth': growthRating.value = value; break
    case 'coherence': coherenceRating.value = value; break
    case 'agency': agencyRating.value = value; break
  }
}

const monthlyRatingSummary = computed<SidebarRatingGroup[]>(() => [
  {
    title: t('planning.reflection.monthly.groups.ratings.title'),
    items: [
      { label: t('planning.reflection.monthly.dimensions.balance'), value: balanceRating.value },
      { label: t('planning.reflection.monthly.dimensions.purpose'), value: purposeRating.value },
      { label: t('planning.reflection.monthly.dimensions.growth'), value: growthRating.value },
      { label: t('planning.reflection.monthly.dimensions.coherence'), value: coherenceRating.value },
      { label: t('planning.reflection.monthly.dimensions.agency'), value: agencyRating.value },
    ],
  },
])

async function handleSave() {
  try {
    await save()
    emit('updated')
    emit('close')
  } catch (err) {
    console.error('Failed to save monthly reflection:', err)
  }
}
</script>
