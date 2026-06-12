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
      <!-- Step: Ratings -->
      <div v-if="currentStep === 'ratings'" key="ratings" class="space-y-4">
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
  useMonthlyReflectionWizard,
  type MonthlyReflectionStep,
} from '@/composables/useMonthlyReflectionWizard'
import { useT } from '@/composables/useT'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'
import {
  emotionContextFromSummary,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'

const { t } = useT()

const props = defineProps<{
  monthRef: MonthRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: MonthlyReflectionStep[] = [
  'ratings',
  'anchors',
  'journal',
]

const stepLabels = computed(() => [
  t('planning.reflection.steps.ratings'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
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
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

// ---------------------------------------------------------------------------
// Week label helpers
// ---------------------------------------------------------------------------

function formatWeekLabel(weekRef: WeekRef): string {
  const bounds = getPeriodBounds(weekRef)
  const startDay = bounds.start.slice(8, 10).replace(/^0/, '')
  const endDay = bounds.end.slice(8, 10).replace(/^0/, '')
  const startMonth = parseInt(bounds.start.slice(5, 7), 10)
  const endMonth = parseInt(bounds.end.slice(5, 7), 10)
  const months = ['', 'sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${months[startMonth]}`
  }
  return `${startDay} ${months[startMonth]}–${endDay} ${months[endMonth]}`
}

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

const summaryPeriodLabel = computed(() => {
  const parts = props.monthRef.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(y) || !Number.isFinite(m)) return props.monthRef
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
})

// Localized, kind-agnostic payload the AI summary/questions are built from.
// Monthly feeds the full month context: weekly trends, weekly reflection
// excerpts, and goal/habit/tracker outcomes.
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'monthly',
    periodLabel: summaryPeriodLabel.value,
    ratings: monthlyRatingSummary.value.flatMap((g) => g.items),
    anchors: monthlyAnchorCategories.value
      .map((c) => ({ label: c.label, text: (promptResponses.value[c.key] ?? '').trim() }))
      .filter((a) => a.text.length > 0),
    freeform: freeformReflection.value,
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    weeklyTrends: (bundle?.weeklyRatingTrends ?? []).map((tr) => ({
      weekLabel: formatWeekLabel(tr.weekRef),
      mood: tr.moodRating,
      energy: tr.energyRating,
      calm: tr.calmRating,
      connection: tr.connectionRating,
    })),
    weeklyExcerpts: (bundle?.weeklyReflectionDetails ?? [])
      .map((d) => ({ weekLabel: formatWeekLabel(d.weekRef), text: d.freeformReflection }))
      .filter((w) => w.text.trim().length > 0),
    goals: (bundle?.goalSummaries ?? []).map((g) => ({
      title: g.goal.title,
      metKRs: g.keyResults.filter((k) => k.evaluationStatus === 'met').length,
      totalKRs: g.keyResults.length,
    })),
    habits: (bundle?.habitDetails ?? []).map((h) => ({
      title: h.title,
      status: h.evaluationStatus,
    })),
    trackers: (bundle?.trackerDetails ?? []).map((tr) => ({
      title: tr.title,
      latest: tr.latestValue ?? null,
    })),
  }
})

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
