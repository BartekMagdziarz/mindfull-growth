<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        type="button"
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="handleCancel"
        aria-label="Go back"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('planning.reflection.monthly.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ monthRangeLabel }}</p>
      </div>
    </div>

    <div v-if="!isLoading && !error && monthlyPlan" class="mb-8">
      <div class="flex items-center justify-between">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          type="button"
          class="flex-1 group"
          :class="{ 'cursor-pointer': index <= draft.activeStep, 'cursor-default': index > draft.activeStep }"
          :disabled="index > draft.activeStep"
          @click="goToStep(index)"
        >
          <div class="flex flex-col items-center">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              :class="getStepCircleClasses(index)"
            >
              <CheckIcon v-if="index < draft.activeStep" class="w-5 h-5" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span
              class="mt-2 text-xs font-medium transition-colors"
              :class="index === draft.activeStep ? 'text-primary' : 'text-neu-muted'"
            >
              {{ step.title }}
            </span>
            <span
              class="text-xs transition-colors hidden sm:block"
              :class="index === draft.activeStep ? 'text-neu-muted' : 'text-neu-muted/60'"
            >
              {{ step.subtitle }}
            </span>
          </div>
        </button>
      </div>
      <div class="relative mt-4">
        <div class="absolute top-0 left-0 w-full neo-progress-track" />
        <div
          class="absolute top-0 left-0 neo-progress-fill"
          :style="{ width: progressWidth }"
        />
      </div>
    </div>

    <AppCard v-if="isLoading" padding="lg">
      <div class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-on-surface-variant">
          <svg
            class="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{{ t('common.loading') }}</span>
        </div>
      </div>
    </AppCard>

    <AppCard v-else-if="error" padding="lg">
      <div class="text-center py-8">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">
          {{ t('common.buttons.tryAgain') }}
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-else-if="!monthlyPlan" padding="lg">
      <div class="text-center py-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarDaysIcon class="w-8 h-8 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-on-surface mb-2">
          {{ t('planning.reflection.monthly.noPlanTitle') }}
        </h3>
        <p class="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto">
          {{ t('planning.reflection.monthly.noPlanDescription') }}
        </p>
        <div class="flex flex-col gap-3 items-center">
          <AppButton variant="filled" @click="goToMonthlyPlanning">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('planning.reflection.monthly.createPlanCta') }}
          </AppButton>
          <AppButton variant="text" @click="handleCancel">
            {{ t('planning.reflection.monthly.goBack') }}
          </AppButton>
        </div>
      </div>
    </AppCard>

    <template v-else>
      <div v-if="draft.activeStep === 0" class="space-y-4">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
            <ChartBarIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.monthly.evidence.title') }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.evidence.subtitle') }}
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="rounded-xl border border-neu-border/25 bg-section/40 p-3">
              <p class="text-xs text-on-surface-variant uppercase tracking-wide">{{ t('planning.reflection.monthly.evidence.weeksReflected') }}</p>
              <p class="text-lg font-semibold text-on-surface">
                {{ insights?.reflectedWeeks ?? 0 }}/{{ insights?.weekCards.length ?? 0 }}
              </p>
            </div>
            <div class="rounded-xl border border-neu-border/25 bg-section/40 p-3">
              <p class="text-xs text-on-surface-variant uppercase tracking-wide">{{ t('planning.reflection.monthly.evidence.commitments') }}</p>
              <p class="text-lg font-semibold text-on-surface">
                {{ commitmentSummaryLabel }}
              </p>
            </div>
            <div class="rounded-xl border border-neu-border/25 bg-section/40 p-3">
              <p class="text-xs text-on-surface-variant uppercase tracking-wide">{{ t('planning.reflection.monthly.evidence.logs') }}</p>
              <p class="text-lg font-semibold text-on-surface">
                {{ t('planning.reflection.monthly.evidence.logsValue', { journals: insights?.journalCount ?? 0, emotions: insights?.emotionLogCount ?? 0 }) }}
              </p>
            </div>
          </div>
        </AppCard>

        <AppCard v-if="insights?.batteryAverages" padding="lg">
          <h3 class="text-base font-semibold text-on-surface mb-3">{{ t('planning.reflection.monthly.evidence.batteries') }}</h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div
                v-for="battery in batteryPanels"
                :key="battery.key"
                class="rounded-xl border border-neu-border/25 bg-neu-base p-3"
              >
              <p class="text-xs uppercase tracking-wide text-on-surface-variant">{{ battery.label }}</p>
              <p class="text-sm text-on-surface mt-1">D {{ battery.demand }}</p>
              <p class="text-sm text-on-surface">S {{ battery.state }}</p>
            </div>
          </div>
        </AppCard>

        <AppCard padding="lg">
          <h3 class="text-base font-semibold text-on-surface mb-3">{{ t('planning.reflection.monthly.evidence.weeklyCards') }}</h3>
          <div v-if="insights?.weekCards.length" class="space-y-3">
            <div
              v-for="card in insights.weekCards"
              :key="card.weeklyPlanId"
              class="rounded-xl border border-neu-border/25 bg-neu-base p-3"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-on-surface">{{ card.label }}</p>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="card.hasReflection ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'"
                >
                  {{ card.hasReflection ? t('planning.reflection.monthly.evidence.reflected') : t('planning.reflection.monthly.evidence.notReflected') }}
                </span>
              </div>
              <p class="text-xs text-on-surface-variant">
                {{ t('planning.reflection.monthly.evidence.commitmentRow', card.commitmentCompletion) }}
              </p>
              <p v-if="card.whatILearned" class="text-xs text-on-surface-variant mt-1">
                {{ t('planning.reflection.monthly.evidence.learned') }}: {{ card.whatILearned }}
              </p>
            </div>
          </div>
          <p v-else class="text-sm text-on-surface-variant">{{ t('planning.reflection.monthly.evidence.noWeeks') }}</p>
        </AppCard>

        <AppCard padding="lg">
          <h3 class="text-base font-semibold text-on-surface mb-3">{{ t('planning.reflection.monthly.evidence.projects') }}</h3>
          <div v-if="insights?.projectSignals.length" class="space-y-2">
            <div
              v-for="signal in insights.projectSignals"
              :key="signal.projectId"
              class="rounded-xl border border-neu-border/25 bg-neu-base p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium text-on-surface">{{ signal.projectName }}</p>
                <span class="text-xs text-on-surface-variant capitalize">{{ signal.status }}</span>
              </div>
              <p class="text-xs text-on-surface-variant mt-1">{{ signal.trackerSummary }}</p>
            </div>
          </div>
          <p v-else class="text-sm text-on-surface-variant">{{ t('planning.reflection.monthly.evidence.noProjects') }}</p>
        </AppCard>
      </div>

      <div v-if="draft.activeStep === 1">
        <AppCard padding="lg">
          <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
            <ArrowTrendingUpIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.monthly.direction.title') }}
          </h2>
          <p class="text-sm text-on-surface-variant mb-6">
            {{ t('planning.reflection.monthly.direction.subtitle') }}
          </p>

          <div class="space-y-5">
            <div v-for="item in directionItems" :key="item.key" class="space-y-2">
              <p class="text-sm font-medium text-on-surface">{{ item.label }}</p>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="value in ratingScale"
                  :key="`${item.key}-${value}`"
                  type="button"
                  class="min-w-8 rounded-full border px-2 py-1 text-xs transition-colors"
                  :class="draft.directionRatings[item.key] === value
                    ? 'border-primary bg-primary/20 text-on-surface'
                    : 'border-neu-border/40 bg-neu-base text-on-surface-variant'"
                  @click="setDirectionRating(item.key, value)"
                >
                  {{ value }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="missingDirectionRatingsCount > 0" class="mt-4 text-sm text-warning">
            {{ t('planning.reflection.monthly.direction.validation', { count: missingDirectionRatingsCount }) }}
          </p>
        </AppCard>
      </div>

      <div v-if="draft.activeStep === 2">
        <AppCard padding="lg" class="mb-4">
          <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
            <RocketLaunchIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.monthly.projectReview.title') }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.projectReview.subtitle') }}
          </p>
        </AppCard>

        <div v-if="draft.projectReviews.length" class="space-y-3">
          <AppCard v-for="review in draft.projectReviews" :key="review.projectId" padding="lg">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 class="font-semibold text-on-surface">{{ getProjectName(review.projectId) }}</h3>
                <p class="text-xs text-on-surface-variant">{{ t('planning.reflection.monthly.projectReview.decision') }}</p>
              </div>
              <select
                v-model="review.decision"
                class="neo-input px-3 py-1.5 text-sm"
              >
                <option value="continue">{{ t('planning.reflection.monthly.projectDecisions.continue') }}</option>
                <option value="rescope">{{ t('planning.reflection.monthly.projectDecisions.rescope') }}</option>
                <option value="pause">{{ t('planning.reflection.monthly.projectDecisions.pause') }}</option>
                <option value="complete">{{ t('planning.reflection.monthly.projectDecisions.complete') }}</option>
                <option value="abandon">{{ t('planning.reflection.monthly.projectDecisions.abandon') }}</option>
              </select>
            </div>

            <p class="text-xs text-on-surface-variant mb-2">{{ t('planning.reflection.monthly.projectReview.progress') }}</p>
            <div class="flex gap-2 flex-wrap mb-3">
              <button
                v-for="value in ratingScale"
                :key="`project-progress-${review.projectId}-${value}`"
                type="button"
                class="min-w-8 rounded-full border px-2 py-1 text-xs transition-colors"
                :class="review.progress === value
                  ? 'border-primary bg-primary/20 text-on-surface'
                  : 'border-neu-border/40 bg-neu-base text-on-surface-variant'"
                @click="review.progress = value"
              >
                {{ value }}
              </button>
            </div>

            <textarea
              v-model="review.note"
              rows="2"
              :placeholder="t('planning.reflection.monthly.projectReview.notePlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>
        </div>

        <AppCard v-else padding="lg">
          <p class="text-sm text-on-surface-variant">{{ t('planning.reflection.monthly.projectReview.empty') }}</p>
        </AppCard>
      </div>

      <div v-if="draft.activeStep === 3">
        <AppCard padding="lg" class="mb-4">
          <h2 class="text-lg font-semibold text-on-surface mb-2 flex items-center gap-2">
            <RectangleStackIcon class="w-5 h-5 text-primary" />
            {{ t('planning.reflection.monthly.focusAreaReview.title') }}
          </h2>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.focusAreaReview.subtitle') }}
          </p>
        </AppCard>

        <div v-if="draft.focusAreaReview.length" class="space-y-3">
          <AppCard v-for="review in draft.focusAreaReview" :key="review.lifeAreaId" padding="lg">
            <h3 class="font-semibold text-on-surface mb-2">{{ getLifeAreaName(review.lifeAreaId) }}</h3>
            <p class="text-xs text-on-surface-variant mb-2">{{ t('planning.reflection.monthly.focusAreaReview.progress') }}</p>
            <div class="flex gap-2 flex-wrap mb-3">
              <button
                v-for="value in ratingScale"
                :key="`focus-progress-${review.lifeAreaId}-${value}`"
                type="button"
                class="min-w-8 rounded-full border px-2 py-1 text-xs transition-colors"
                :class="review.progress === value
                  ? 'border-primary bg-primary/20 text-on-surface'
                  : 'border-neu-border/40 bg-neu-base text-on-surface-variant'"
                @click="review.progress = value"
              >
                {{ value }}
              </button>
            </div>

            <label class="inline-flex items-center gap-2 text-sm text-on-surface mb-3">
              <input
                v-model="review.deteriorated"
                type="checkbox"
                class="neo-checkbox"
              />
              {{ t('planning.reflection.monthly.focusAreaReview.deteriorated') }}
            </label>

            <textarea
              v-model="review.note"
              rows="2"
              :placeholder="t('planning.reflection.monthly.focusAreaReview.notePlaceholder')"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </AppCard>
        </div>

        <AppCard v-else padding="lg">
          <p class="text-sm text-on-surface-variant">{{ t('planning.reflection.monthly.focusAreaReview.empty') }}</p>
        </AppCard>
      </div>

      <div v-if="draft.activeStep === 4" class="space-y-4">
        <ListInputSection
          v-model="draft.courseCorrection.start"
          :title="t('planning.reflection.monthly.courseCorrection.start')"
          icon="trophy"
          :placeholder="t('planning.reflection.monthly.courseCorrection.addStart')"
          :empty-message="t('planning.reflection.monthly.courseCorrection.startEmpty')"
        />

        <ListInputSection
          v-model="draft.courseCorrection.stop"
          :title="t('planning.reflection.monthly.courseCorrection.stop')"
          icon="star"
          :placeholder="t('planning.reflection.monthly.courseCorrection.addStop')"
          :empty-message="t('planning.reflection.monthly.courseCorrection.stopEmpty')"
        />

        <ListInputSection
          v-model="draft.courseCorrection.continue"
          :title="t('planning.reflection.monthly.courseCorrection.continue')"
          icon="lightbulb"
          :placeholder="t('planning.reflection.monthly.courseCorrection.addContinue')"
          :empty-message="t('planning.reflection.monthly.courseCorrection.continueEmpty')"
        />

        <AppCard padding="lg">
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ t('planning.reflection.monthly.courseCorrection.ifThenPlan') }}
          </label>
          <textarea
            v-model="draft.courseCorrection.ifThenPlan"
            rows="3"
            :placeholder="t('planning.reflection.monthly.courseCorrection.ifThenPlaceholder')"
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>
      </div>

      <div v-if="draft.activeStep === 5" class="space-y-4">
        <ListInputSection
          v-model="draft.wins"
          :title="t('planning.reflection.monthly.summary.wins')"
          icon="trophy"
          :placeholder="t('planning.reflection.monthly.summary.addWin')"
          :empty-message="t('planning.reflection.monthly.summary.winsEmpty')"
        />

        <ListInputSection
          v-model="draft.challenges"
          :title="t('planning.reflection.monthly.summary.challenges')"
          icon="star"
          :placeholder="t('planning.reflection.monthly.summary.addChallenge')"
          :empty-message="t('planning.reflection.monthly.summary.challengesEmpty')"
        />

        <ListInputSection
          v-model="draft.learnings"
          :title="t('planning.reflection.monthly.summary.learnings')"
          icon="lightbulb"
          :placeholder="t('planning.reflection.monthly.summary.addLearning')"
          :empty-message="t('planning.reflection.monthly.summary.learningsEmpty')"
        />

        <AppCard padding="lg">
          <label class="block text-sm font-medium text-on-surface mb-2">
            {{ t('planning.reflection.monthly.summary.adjustments') }}
          </label>
          <textarea
            v-model="draft.adjustments"
            rows="3"
            :placeholder="t('planning.reflection.monthly.summary.adjustmentsPlaceholder')"
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <AppCard v-if="saveError" padding="md" class="border-error/50">
          <div class="flex items-start gap-3 text-error">
            <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">{{ t('planning.reflection.monthly.save.error') }}</p>
              <p class="text-sm mt-1">{{ saveError }}</p>
            </div>
          </div>
        </AppCard>

        <AppCard v-if="existingReflection?.completedAt" padding="md" class="bg-success/5 border-success/30">
          <div class="flex items-center gap-3 text-success">
            <CheckCircleIcon class="w-5 h-5 flex-shrink-0" />
            <p class="font-medium">{{ t('planning.reflection.monthly.completedBanner') }}</p>
          </div>
        </AppCard>
      </div>
    </template>

    <div
      v-if="!isLoading && !error && monthlyPlan"
      class="fixed bottom-0 left-0 right-0 neo-footer p-4"
    >
      <div class="max-w-4xl mx-auto flex justify-between items-center">
        <AppButton
          v-if="draft.activeStep > 0"
          variant="text"
          @click="handleBack"
        >
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          {{ t('common.buttons.back') }}
        </AppButton>
        <div v-else />

        <AppButton
          variant="filled"
          :disabled="isSaving || isConfirmDisabled"
          @click="handleNext"
        >
          {{ nextButtonText }}
          <svg
            v-if="isSaving"
            class="animate-spin h-4 w-4 ml-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <ArrowRightIcon v-else class="w-4 h-4 ml-2" />
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CheckIcon,
  ExclamationCircleIcon,
  PlusIcon,
  RectangleStackIcon,
  RocketLaunchIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import ListInputSection from '@/components/forms/ListInputSection.vue'
import { useT } from '@/composables/useT'
import { useMonthlyReflectionDraft } from '@/composables/useMonthlyReflectionDraft'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'
import { buildMonthlyInsights, type MonthlyInsights } from '@/services/monthlyInsights.service'
import { formatPeriodDateRange, getYearFromDate } from '@/utils/periodUtils'
import type { MonthlyReflection } from '@/domain/reflection'

interface Step {
  id: string
  title: string
  subtitle: string
}

type DirectionRatingKey =
  | 'projects'
  | 'priorities'
  | 'relationships'
  | 'meaning'
  | 'impact'
  | 'stuckness'

const route = useRoute()
const router = useRouter()
const { t } = useT()

const routePlanId = computed(() => route.params.planId as string | undefined)

const steps = computed<Step[]>(() => [
  {
    id: 'evidence',
    title: t('planning.reflection.monthly.steps.evidence.title'),
    subtitle: t('planning.reflection.monthly.steps.evidence.subtitle'),
  },
  {
    id: 'direction',
    title: t('planning.reflection.monthly.steps.direction.title'),
    subtitle: t('planning.reflection.monthly.steps.direction.subtitle'),
  },
  {
    id: 'projects',
    title: t('planning.reflection.monthly.steps.projects.title'),
    subtitle: t('planning.reflection.monthly.steps.projects.subtitle'),
  },
  {
    id: 'focusAreas',
    title: t('planning.reflection.monthly.steps.focusAreas.title'),
    subtitle: t('planning.reflection.monthly.steps.focusAreas.subtitle'),
  },
  {
    id: 'courseCorrection',
    title: t('planning.reflection.monthly.steps.courseCorrection.title'),
    subtitle: t('planning.reflection.monthly.steps.courseCorrection.subtitle'),
  },
  {
    id: 'summary',
    title: t('planning.reflection.monthly.steps.summary.title'),
    subtitle: t('planning.reflection.monthly.steps.summary.subtitle'),
  },
])

const {
  draft,
  ready: draftReady,
  clearDraft,
  hasDraft,
} = useMonthlyReflectionDraft(routePlanId.value ?? 'new')

const monthlyPlanStore = useMonthlyPlanStore()
const monthlyReflectionStore = useMonthlyReflectionStore()
const weeklyPlanStore = useWeeklyPlanStore()
const weeklyReflectionStore = useWeeklyReflectionStore()
const commitmentStore = useCommitmentStore()
const projectStore = useProjectStore()
const trackerStore = useTrackerStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()

const isLoading = ref(true)
const error = ref<string | null>(null)
const isSaving = ref(false)
const saveError = ref<string | null>(null)
const insights = ref<MonthlyInsights | null>(null)

const monthlyPlan = computed(() => {
  if (!routePlanId.value) return undefined
  return monthlyPlanStore.getMonthlyPlanById(routePlanId.value)
})

const existingReflection = computed(() => {
  if (!routePlanId.value) return undefined
  return monthlyReflectionStore.getReflectionByPlanId(routePlanId.value)
})

const monthRangeLabel = computed(() => {
  if (!monthlyPlan.value) return t('planning.reflection.monthly.subtitle')
  return formatPeriodDateRange(monthlyPlan.value.startDate, monthlyPlan.value.endDate)
})

const monthProjects = computed(() => {
  if (!monthlyPlan.value) return []
  return projectStore.getProjectsByMonthId(monthlyPlan.value.id)
})

const lifeAreaById = computed(() => new Map(lifeAreaStore.lifeAreas.map((la) => [la.id, la])))

const focusAreaIdsForReview = computed(() => {
  if (!monthlyPlan.value) return []

  const ids = new Set<string>()
  if (monthlyPlan.value.primaryFocusLifeAreaId) {
    ids.add(monthlyPlan.value.primaryFocusLifeAreaId)
  }

  for (const id of monthlyPlan.value.secondaryFocusLifeAreaIds ?? []) {
    ids.add(id)
  }

  for (const project of monthProjects.value) {
    for (const id of project.lifeAreaIds ?? []) {
      ids.add(id)
    }
  }

  for (const id of insights.value?.deterioratingLifeAreaIds ?? []) {
    ids.add(id)
  }

  return Array.from(ids)
})

const ratingScale = [1, 2, 3, 4, 5]

const directionItems: Array<{ key: DirectionRatingKey; label: string }> = [
  { key: 'projects', label: t('planning.reflection.monthly.direction.projects') },
  { key: 'priorities', label: t('planning.reflection.monthly.direction.priorities') },
  { key: 'relationships', label: t('planning.reflection.monthly.direction.relationships') },
  { key: 'meaning', label: t('planning.reflection.monthly.direction.meaning') },
  { key: 'impact', label: t('planning.reflection.monthly.direction.impact') },
  { key: 'stuckness', label: t('planning.reflection.monthly.direction.stuckness') },
]

const missingDirectionRatingsCount = computed(() =>
  directionItems.filter((item) => draft.value.directionRatings[item.key] == null).length
)

const commitmentSummaryLabel = computed(() => {
  const completion = insights.value?.commitmentCompletion
  if (!completion) return '0/0'
  return `${completion.done}/${completion.done + completion.skipped + completion.planned}`
})

const batteryPanels = computed(() => {
  const averages = insights.value?.batteryAverages
  if (!averages) return []
  return [
    {
      key: 'body',
      label: t('planning.weekly.batteries.body.title'),
      demand: averages.body.demand,
      state: averages.body.state,
    },
    {
      key: 'mind',
      label: t('planning.weekly.batteries.mind.title'),
      demand: averages.mind.demand,
      state: averages.mind.state,
    },
    {
      key: 'emotion',
      label: t('planning.weekly.batteries.emotion.title'),
      demand: averages.emotion.demand,
      state: averages.emotion.state,
    },
    {
      key: 'social',
      label: t('planning.weekly.batteries.social.title'),
      demand: averages.social.demand,
      state: averages.social.state,
    },
  ]
})

const progressWidth = computed(() => {
  const progress = ((draft.value.activeStep + 1) / steps.value.length) * 100
  return `${progress}%`
})

const nextButtonText = computed(() => {
  if (draft.value.activeStep === steps.value.length - 1) {
    return isSaving.value
      ? t('common.saving')
      : existingReflection.value?.completedAt
        ? t('planning.reflection.monthly.save.update')
        : t('planning.reflection.monthly.save.complete')
  }

  return t('common.buttons.next')
})

const isConfirmDisabled = computed(() => {
  if (draft.value.activeStep !== steps.value.length - 1) return false
  return missingDirectionRatingsCount.value > 0
})

function getStepCircleClasses(index: number): string {
  if (index < draft.value.activeStep) return 'neo-step-completed'
  if (index === draft.value.activeStep) return 'neo-step-active'
  return 'neo-step-future'
}

function getProjectName(projectId: string): string {
  return projectStore.getProjectById(projectId)?.name || t('planning.components.yearlyReviewSummary.unknown')
}

function getLifeAreaName(lifeAreaId: string): string {
  return lifeAreaById.value.get(lifeAreaId)?.name || t('planning.components.yearlyReviewSummary.unknown')
}

function setDirectionRating(key: DirectionRatingKey, value: number): void {
  draft.value.directionRatings[key] = value
}

function goToStep(index: number): void {
  if (index <= draft.value.activeStep) {
    draft.value.activeStep = index
  }
}

function handleBack(): void {
  if (draft.value.activeStep > 0) {
    draft.value.activeStep -= 1
  }
}

async function handleNext(): Promise<void> {
  if (draft.value.activeStep < steps.value.length - 1) {
    draft.value.activeStep += 1
    return
  }

  await completeReflection()
}

function handleCancel(): void {
  router.push('/planning')
}

function goToMonthlyPlanning(): void {
  if (!routePlanId.value) {
    router.push('/planning/month/new')
    return
  }
  router.push(`/planning/month/${routePlanId.value}`)
}

function trimArray(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

function reconcileProjectReviews(): void {
  const existing = new Map(draft.value.projectReviews.map((item) => [item.projectId, item]))
  draft.value.projectReviews = monthProjects.value.map((project) => {
    const previous = existing.get(project.id)
    return {
      projectId: project.id,
      progress: previous?.progress ?? null,
      decision: previous?.decision ?? (project.status === 'completed' ? 'complete' : 'continue'),
      note: previous?.note ?? '',
    }
  })
}

function reconcileFocusAreaReviews(): void {
  const existing = new Map(draft.value.focusAreaReview.map((item) => [item.lifeAreaId, item]))
  draft.value.focusAreaReview = focusAreaIdsForReview.value.map((lifeAreaId) => {
    const previous = existing.get(lifeAreaId)
    return {
      lifeAreaId,
      progress: previous?.progress ?? null,
      deteriorated:
        previous?.deteriorated ?? (insights.value?.deterioratingLifeAreaIds.includes(lifeAreaId) ?? false),
      note: previous?.note ?? '',
    }
  })
}

function hydrateFromExistingReflection(reflection: MonthlyReflection): void {
  draft.value.directionRatings = {
    projects: reflection.directionRatings?.projects ?? null,
    priorities: reflection.directionRatings?.priorities ?? null,
    relationships: reflection.directionRatings?.relationships ?? null,
    meaning: reflection.directionRatings?.meaning ?? null,
    impact: reflection.directionRatings?.impact ?? null,
    stuckness: reflection.directionRatings?.stuckness ?? null,
  }

  draft.value.projectReviews = (reflection.projectReviews ?? []).map((review) => ({
    projectId: review.projectId,
    progress: review.progress ?? null,
    decision: review.decision,
    note: review.note ?? '',
  }))

  draft.value.focusAreaReview = (reflection.focusAreaReview ?? []).map((review) => ({
    lifeAreaId: review.lifeAreaId,
    progress: review.progress ?? null,
    deteriorated: review.deteriorated,
    note: review.note ?? '',
  }))

  draft.value.courseCorrection = {
    start: [...(reflection.courseCorrection?.start ?? [])],
    stop: [...(reflection.courseCorrection?.stop ?? [])],
    continue: [...(reflection.courseCorrection?.continue ?? [])],
    ifThenPlan: reflection.courseCorrection?.ifThenPlan ?? '',
  }

  draft.value.wins = [...(reflection.wins ?? [])]
  draft.value.challenges = [...(reflection.challenges ?? [])]
  draft.value.learnings = [...(reflection.learnings ?? [])]
  draft.value.adjustments = reflection.adjustments ?? ''
}

function hydrateFromInsights(): void {
  if (!insights.value) return

  draft.value.wins = [...insights.value.summarySuggestions.wins]
  draft.value.challenges = [...insights.value.summarySuggestions.challenges]
  draft.value.learnings = [...insights.value.summarySuggestions.learnings]
  draft.value.adjustments = insights.value.summarySuggestions.adjustments ?? ''
}

async function completeReflection(): Promise<void> {
  if (!routePlanId.value || !monthlyPlan.value) return

  if (missingDirectionRatingsCount.value > 0) {
    saveError.value = t('planning.reflection.monthly.direction.validation', {
      count: missingDirectionRatingsCount.value,
    })
    draft.value.activeStep = 1
    return
  }

  isSaving.value = true
  saveError.value = null

  try {
    const payload = {
      directionRatings: {
        projects: draft.value.directionRatings.projects as number,
        priorities: draft.value.directionRatings.priorities as number,
        relationships: draft.value.directionRatings.relationships as number,
        meaning: draft.value.directionRatings.meaning as number,
        impact: draft.value.directionRatings.impact as number,
        stuckness: draft.value.directionRatings.stuckness as number,
      },
      projectReviews: draft.value.projectReviews.map((review) => ({
        projectId: review.projectId,
        progress: review.progress ?? 3,
        decision: review.decision,
        note: review.note.trim() || undefined,
      })),
      focusAreaReview: draft.value.focusAreaReview.map((review) => ({
        lifeAreaId: review.lifeAreaId,
        progress: review.progress ?? 3,
        deteriorated: review.deteriorated,
        note: review.note.trim() || undefined,
      })),
      weeklyDigest: {
        weeklyPlanIds: insights.value?.weeklyPlanIdsInMonth ?? [],
        reflectedWeeks: insights.value?.reflectedWeeks ?? 0,
        batteryAverages: insights.value?.batteryAverages,
        commitmentCompletion: insights.value?.commitmentCompletion,
      },
      courseCorrection: {
        start: trimArray(draft.value.courseCorrection.start),
        stop: trimArray(draft.value.courseCorrection.stop),
        continue: trimArray(draft.value.courseCorrection.continue),
        ifThenPlan: draft.value.courseCorrection.ifThenPlan.trim() || undefined,
      },
      wins: trimArray(draft.value.wins),
      challenges: trimArray(draft.value.challenges),
      learnings: trimArray(draft.value.learnings),
      adjustments: draft.value.adjustments.trim() || undefined,
    }

    if (existingReflection.value) {
      await monthlyReflectionStore.completeReflection(existingReflection.value.id, payload)
    } else {
      const created = await monthlyReflectionStore.createReflection({
        monthlyPlanId: routePlanId.value,
      })
      await monthlyReflectionStore.completeReflection(created.id, payload)
    }

    clearDraft()
    router.push('/planning')
  } catch (err) {
    saveError.value =
      err instanceof Error ? err.message : t('planning.reflection.monthly.save.error')
    console.error('Failed to save monthly reflection:', err)
  } finally {
    isSaving.value = false
  }
}

async function loadData(): Promise<void> {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      draftReady,
      monthlyPlanStore.loadMonthlyPlans(),
      monthlyReflectionStore.loadMonthlyReflections(),
      weeklyPlanStore.loadWeeklyPlans(),
      weeklyReflectionStore.loadWeeklyReflections(),
      commitmentStore.loadCommitments(),
      projectStore.loadProjects(),
      trackerStore.loadTrackers(),
      lifeAreaStore.loadLifeAreas(),
      journalStore.loadEntries(),
      emotionLogStore.loadLogs(),
    ])

    if (!monthlyPlan.value) return

    const year = getYearFromDate(monthlyPlan.value.startDate)
    await priorityStore.loadPriorities(year)

    const trackerPeriods = await trackerPeriodDexieRepository.getByDateRange(
      monthlyPlan.value.startDate,
      monthlyPlan.value.endDate
    )

    insights.value = buildMonthlyInsights({
      monthlyPlan: monthlyPlan.value,
      weeklyPlans: weeklyPlanStore.weeklyPlans,
      weeklyReflections: weeklyReflectionStore.weeklyReflections,
      commitments: commitmentStore.commitments,
      projects: projectStore.projects,
      trackers: trackerStore.trackers,
      trackerPeriods,
      journalEntries: journalStore.entries,
      emotionLogs: emotionLogStore.logs,
    })

    if (!hasDraft()) {
      if (existingReflection.value) {
        hydrateFromExistingReflection(existingReflection.value)
      } else {
        hydrateFromInsights()
      }
    }

    reconcileProjectReviews()
    reconcileFocusAreaReviews()
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Failed to load monthly reflection data.'
    console.error('Error loading monthly reflection data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
