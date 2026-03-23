<template>
  <section data-testid="monthly-reflection-wizard" class="neo-card space-y-3 px-4 py-4 md:px-5">
    <!-- Header with close button -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-on-surface">
        {{ t('planning.reflection.monthly.title') }}
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
          {{ t('planning.reflection.monthly.reviewSubtitle') }}
        </p>
        <ReflectionReviewPanel :bundle="dataBundle" :is-loading="isBundleLoading" />
      </div>

      <!-- Step: Goals -->
      <div v-else-if="currentStep === 'goals'" key="goals" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <div>
            <h3 class="text-base font-semibold text-on-surface">
              {{ t('planning.reflection.monthly.goalsTitle') }}
            </h3>
            <p class="mt-1 text-sm text-on-surface-variant">
              {{ t('planning.reflection.monthly.goalsSubtitle') }}
            </p>
          </div>

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

      <!-- Step: Prompts -->
      <div v-else-if="currentStep === 'prompts'" key="prompts" class="space-y-4">
        <AppCard padding="lg" class="space-y-5">
          <div v-for="prompt in monthlyPrompts" :key="prompt.key" class="space-y-2">
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
            {{ t('planning.reflection.monthly.journalTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.journalSubtitle') }}
          </p>
          <textarea
            :value="freeformReflection"
            :placeholder="t('planning.reflection.monthly.journalPlaceholder')"
            class="neo-input min-h-[14rem] w-full resize-none p-4 text-on-surface"
            @input="freeformReflection = ($event.target as HTMLTextAreaElement).value"
          />
        </AppCard>
      </div>

      <!-- Step: Looking Ahead -->
      <div v-else-if="currentStep === 'ahead'" key="ahead" class="space-y-4">
        <AppCard padding="lg" class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.monthly.aheadTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.aheadSubtitle') }}
          </p>
          <textarea
            :value="lookingAhead"
            :placeholder="t('planning.reflection.monthly.aheadPlaceholder')"
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
import EntityIcon from '@/components/shared/EntityIcon.vue'
import ReflectionReviewPanel from './ReflectionReviewPanel.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
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
  'prompts',
  'journal',
  'ahead',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
  t('planning.reflection.steps.goals'),
  t('planning.reflection.steps.weeklyRecap'),
  t('planning.reflection.steps.ratings'),
  t('planning.reflection.steps.prompts'),
  t('planning.reflection.steps.journal'),
  t('planning.reflection.steps.ahead'),
])

const monthlyPrompts = computed(() => [
  {
    key: 'proudOf',
    label: t('planning.reflection.monthly.prompts.proudOf.label'),
    placeholder: t('planning.reflection.monthly.prompts.proudOf.placeholder'),
  },
  {
    key: 'challenges',
    label: t('planning.reflection.monthly.prompts.challenges.label'),
    placeholder: t('planning.reflection.monthly.prompts.challenges.placeholder'),
  },
  {
    key: 'growth',
    label: t('planning.reflection.monthly.prompts.growth.label'),
    placeholder: t('planning.reflection.monthly.prompts.growth.placeholder'),
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
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  lookingAhead,
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
    subtitle: t('planning.reflection.monthly.groups.ratings.subtitle'),
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

function handlePromptInput(key: string, value: string) {
  promptResponses.value = { ...promptResponses.value, [key]: value }
}

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
