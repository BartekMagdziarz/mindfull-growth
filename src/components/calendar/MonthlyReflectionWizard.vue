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

      <!-- Step: Weekly Recap -->
      <div v-else-if="currentStep === 'weekly-recap'" key="weekly-recap" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.monthly.weeklyRecapTitle') }}
          </h3>

          <!-- Weekly rating trends table -->
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
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.focus') }}</th>
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.socialConnection') }}</th>
                    <th class="pb-2 px-2 font-medium text-center">{{ t('planning.reflection.weekly.dimensions.stressLevel') }}</th>
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
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.focusRating ?? '—' }}</td>
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.socialConnectionRating ?? '—' }}</td>
                    <td class="py-2 px-2 text-center text-on-surface">{{ trend.stressLevelRating ?? '—' }}</td>
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
        <AppCard padding="lg" class="space-y-2">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.reflection.monthly.ratingsTitle') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.ratingsSubtitle') }}
          </p>
          <ReflectionDimensionRatings
            :dimensions="monthlyDimensions"
            @update:rating="handleRatingUpdate"
          />
        </AppCard>
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
import ReflectionReviewPanel from './ReflectionReviewPanel.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
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
  'weekly-recap',
  'ratings',
  'prompts',
  'journal',
  'ahead',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.review'),
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
  purposeRating,
  motivationRating,
  growthRating,
  lifeSatisfactionRating,
  alignmentRating,
  promptResponses,
  freeformReflection,
  lookingAhead,
  isSaving,
  save,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

const weeklyTrends = computed(() => dataBundle.value?.weeklyRatingTrends ?? [])
const weeklySnippets = computed(() => dataBundle.value?.weeklyReflectionSnippets ?? [])

const monthlyDimensions = computed(() => [
  {
    key: 'purpose',
    label: t('planning.reflection.monthly.dimensions.purpose'),
    value: purposeRating.value,
  },
  {
    key: 'motivation',
    label: t('planning.reflection.monthly.dimensions.motivation'),
    value: motivationRating.value,
  },
  {
    key: 'growth',
    label: t('planning.reflection.monthly.dimensions.growth'),
    value: growthRating.value,
  },
  {
    key: 'lifeSatisfaction',
    label: t('planning.reflection.monthly.dimensions.lifeSatisfaction'),
    value: lifeSatisfactionRating.value,
  },
  {
    key: 'alignment',
    label: t('planning.reflection.monthly.dimensions.alignment'),
    value: alignmentRating.value,
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'purpose':
      purposeRating.value = value
      break
    case 'motivation':
      motivationRating.value = value
      break
    case 'growth':
      growthRating.value = value
      break
    case 'lifeSatisfaction':
      lifeSatisfactionRating.value = value
      break
    case 'alignment':
      alignmentRating.value = value
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
    console.error('Failed to save monthly reflection:', err)
  }
}
</script>
