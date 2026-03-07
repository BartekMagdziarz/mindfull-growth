<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        type="button"
        class="p-2 neo-back-btn text-neu-muted"
        @click="handleCancel"
        aria-label="Go back"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-neu-text">{{ t('planning.monthly.title') }}</h1>
        <p class="text-sm text-neu-muted">{{ monthLabel }}</p>
      </div>
    </div>

    <!-- Step Progress Indicator -->
    <div class="mb-8">
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
            <!-- Step Circle -->
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              :class="getStepCircleClasses(index)"
            >
              <CheckIcon v-if="index < draft.activeStep" class="w-5 h-5" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <!-- Step Label -->
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
      <!-- Progress Line -->
      <div class="relative mt-4">
        <div class="absolute top-0 left-0 w-full neo-progress-track" />
        <div
          class="absolute top-0 left-0 neo-progress-fill"
          :style="{ width: progressWidth }"
        />
      </div>
    </div>

    <!-- Loading State -->
    <AppCard v-if="isLoading" padding="lg">
      <div class="flex items-center justify-center py-12">
        <div class="flex items-center gap-3 text-neu-muted">
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
          <span class="text-neu-muted">{{ t('common.loading') }}</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="error" padding="lg">
      <div class="text-center py-8">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">
          {{ t('common.buttons.tryAgain') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Step Content -->
    <template v-else>
      <!-- Step 1: Period -->
      <div v-if="draft.activeStep === 0">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <CalendarDaysIcon class="w-5 h-5 text-primary" />
            {{ t('planning.monthly.heading') }}
          </h2>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="month-start" class="block text-sm font-medium text-neu-text mb-1">
                {{ t('planning.monthly.period.startDate') }}
              </label>
              <input
                id="month-start"
                v-model="draft.startDate"
                type="date"
                class="neo-input w-full px-3 py-2.5 text-base leading-snug"
              />
            </div>
            <div>
              <label for="month-end" class="block text-sm font-medium text-neu-text mb-1">
                {{ t('planning.monthly.period.endDate') }}
              </label>
              <input
                id="month-end"
                v-model="draft.endDate"
                type="date"
                class="neo-input w-full px-3 py-2.5 text-base leading-snug"
              />
            </div>
          </div>

          <div class="mt-4">
            <label for="month-name" class="block text-sm font-medium text-neu-text mb-1">
              {{ t('planning.monthly.period.customName') }} <span class="text-neu-muted font-normal">{{ t('planning.monthly.period.optional') }}</span>
            </label>
            <input
              id="month-name"
              v-model="draft.name"
              type="text"
              placeholder="e.g., January 2026"
              class="neo-input w-full px-3 py-2.5 text-base leading-snug"
            />
            <p class="mt-1 text-xs text-neu-muted">
              {{ t('planning.components.periodCreationDialog.defaultNameLabel', { name: defaultMonthName }) }}
            </p>
          </div>

          <p v-if="periodValidationError" class="mt-4 text-sm text-error">
            {{ periodValidationError }}
          </p>
        </AppCard>
      </div>

      <!-- Step 2: Review Signals -->
      <div v-if="draft.activeStep === 1" class="space-y-4">
        <AppCard padding="lg">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <ChartBarIcon class="w-5 h-5 text-primary" />
            {{ t('planning.monthly.signalsStep.title') }}
          </h2>
          <p class="text-sm text-neu-muted">
            {{ t('planning.monthly.signalsStep.subtitle') }}
          </p>
        </AppCard>

        <AppCard v-if="previousMonthlyPlan" padding="lg">
          <h3 class="text-sm font-semibold text-neu-text mb-3">
            {{ t('planning.monthly.signalsStep.previousMonth', { month: previousMonthLabel }) }}
          </h3>

          <div v-if="previousMonthSignalSummary" class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-neu-border/25 bg-section/40 p-3">
              <p class="text-xs text-neu-muted uppercase tracking-wide">
                {{ t('planning.monthly.signalsStep.weeksReflected') }}
              </p>
              <p class="text-lg font-semibold text-neu-text">
                {{ previousMonthSignalSummary.reflectedWeeks }}/{{ previousMonthSignalSummary.totalWeeks }}
              </p>
            </div>
            <div class="rounded-xl border border-neu-border/25 bg-section/40 p-3">
              <p class="text-xs text-neu-muted uppercase tracking-wide">
                {{ t('planning.monthly.signalsStep.commitmentCompletion') }}
              </p>
              <p class="text-lg font-semibold text-neu-text">
                {{ previousMonthCompletionLabel }}
              </p>
            </div>
            <div class="rounded-xl border border-neu-border/25 bg-section/40 p-3">
              <p class="text-xs text-neu-muted uppercase tracking-wide">
                {{ t('planning.monthly.signalsStep.deteriorationRisk') }}
              </p>
              <p class="text-lg font-semibold text-neu-text">
                {{
                  previousMonthSignalSummary.deterioratingLifeAreaIds.length
                    ? t('planning.monthly.signalsStep.detected')
                    : t('planning.monthly.signalsStep.notDetected')
                }}
              </p>
            </div>
          </div>

          <div v-if="previousMonthlyReflection" class="mt-4 space-y-2">
            <p class="text-xs text-neu-muted uppercase tracking-wide">
              {{ t('planning.monthly.signalsStep.lastReflection') }}
            </p>
            <p
              v-if="previousMonthlyReflection.adjustments"
              class="text-sm text-neu-text rounded-xl bg-neu-base border border-neu-border/25 p-3"
            >
              {{ previousMonthlyReflection.adjustments }}
            </p>
            <p
              v-if="previousMonthlyReflection.courseCorrection?.ifThenPlan"
              class="text-sm text-neu-text rounded-xl bg-neu-base border border-neu-border/25 p-3"
            >
              {{ previousMonthlyReflection.courseCorrection.ifThenPlan }}
            </p>
          </div>
        </AppCard>

        <AppCard v-else padding="lg">
          <p class="text-sm text-neu-muted">
            {{ t('planning.monthly.signalsStep.empty') }}
          </p>
        </AppCard>

        <AppCard
          v-if="suggestedMonthIntention || suggestedFocusSuccessSignal || suggestedBalanceGuardrail"
          padding="lg"
        >
          <h3 class="text-sm font-semibold text-neu-text mb-3">
            {{ t('planning.monthly.signalsStep.prefillSuggestions') }}
          </h3>
          <div class="space-y-3">
            <div v-if="suggestedMonthIntention" class="rounded-xl border border-neu-border/25 bg-neu-base p-3">
              <p class="text-xs uppercase tracking-wide text-neu-muted">
                {{ t('planning.monthly.focusStep.monthIntentionLabel') }}
              </p>
              <p class="text-sm text-neu-text mt-1">{{ suggestedMonthIntention }}</p>
            </div>
            <div v-if="suggestedFocusSuccessSignal" class="rounded-xl border border-neu-border/25 bg-neu-base p-3">
              <p class="text-xs uppercase tracking-wide text-neu-muted">
                {{ t('planning.monthly.focusStep.focusSuccessSignalLabel') }}
              </p>
              <p class="text-sm text-neu-text mt-1">{{ suggestedFocusSuccessSignal }}</p>
            </div>
            <div v-if="suggestedBalanceGuardrail" class="rounded-xl border border-neu-border/25 bg-neu-base p-3">
              <p class="text-xs uppercase tracking-wide text-neu-muted">
                {{ t('planning.monthly.focusStep.balanceGuardrailLabel') }}
              </p>
              <p class="text-sm text-neu-text mt-1">{{ suggestedBalanceGuardrail }}</p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Step 3: Focus Life Areas + Intention -->
      <div v-if="draft.activeStep === 2">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <RectangleStackIcon class="w-5 h-5 text-primary" />
            {{ t('planning.monthly.focusStep.title') }}
          </h2>

          <div class="space-y-6">
            <div>
              <p class="text-xs text-neu-muted uppercase tracking-wide mb-2">{{ t('planning.monthly.focusStep.primary') }}</p>
              <div class="grid gap-2">
                <button
                  v-for="la in availableLifeAreas"
                  :key="la.id"
                  type="button"
                  class="flex items-center gap-3 p-3 rounded-xl transition-all text-left neo-selector"
                  :class="
                    draft.primaryFocusLifeAreaId === la.id
                      ? 'neo-selector--active'
                      : ''
                  "
                  @click="setPrimaryFocusLifeArea(la.id)"
                >
                  <span
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: la.color || 'rgb(var(--color-primary))' }"
                  />
                  <span class="font-medium">{{ la.name }}</span>
                </button>
              </div>
            </div>

            <div>
              <p class="text-xs text-neu-muted uppercase tracking-wide mb-2">
                {{ t('planning.monthly.focusStep.secondaryOptional') }}
              </p>
              <div class="grid gap-2">
                <label
                  v-for="la in availableLifeAreas"
                  :key="`secondary-${la.id}`"
                  class="neo-checkbox-row flex items-center gap-3 p-3"
                  :class="[
                    draft.secondaryFocusLifeAreaIds.includes(la.id)
                      ? 'neo-checkbox-row--checked'
                      : '',
                    canSelectSecondaryFocusLifeArea(la.id)
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-70',
                  ]"
                >
                  <input
                    type="checkbox"
                    class="mt-0.5 neo-checkbox"
                    :checked="draft.secondaryFocusLifeAreaIds.includes(la.id)"
                    :disabled="!canSelectSecondaryFocusLifeArea(la.id)"
                    @change="toggleSecondaryFocusLifeArea(la.id)"
                  />
                  <span
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: la.color || 'rgb(var(--color-primary))' }"
                  />
                  <span class="text-sm font-medium text-neu-text">{{ la.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </AppCard>

        <AppCard padding="lg">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <SparklesIcon class="w-5 h-5 text-primary" />
            {{ t('planning.monthly.focusStep.monthIntentionLabel') }}
          </h2>
          <textarea
            v-model="draft.monthIntention"
            rows="3"
            :placeholder="t('planning.monthly.focusStep.monthIntentionPlaceholder')"
            class="neo-input w-full resize-none p-3 text-sm leading-relaxed"
          />

          <div class="mt-4">
            <label class="block text-sm font-medium text-neu-text mb-1">
              {{ t('planning.monthly.focusStep.focusSuccessSignalLabel') }}
            </label>
            <textarea
              v-model="draft.focusSuccessSignal"
              rows="2"
              :placeholder="t('planning.monthly.focusStep.focusSuccessSignalPlaceholder')"
              class="neo-input w-full resize-none p-3 text-sm leading-relaxed"
            />
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-neu-text mb-1">
              {{ t('planning.monthly.focusStep.balanceGuardrailLabel') }}
            </label>
            <textarea
              v-model="draft.balanceGuardrail"
              rows="2"
              :placeholder="t('planning.monthly.focusStep.balanceGuardrailPlaceholder')"
              class="neo-input w-full resize-none p-3 text-sm leading-relaxed"
            />
          </div>
        </AppCard>
      </div>

      <!-- Step 4: Projects -->
      <div v-if="draft.activeStep === 3">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <RocketLaunchIcon class="w-5 h-5 text-primary" />
            {{ t('planning.monthly.projectsStep.title') }}
          </h2>
        </AppCard>

        <!-- Suggested projects from previous months -->
        <AppCard v-if="suggestableProjects.length > 0 && !showProjectForm" padding="lg" class="mb-4">
          <h3 class="text-sm font-semibold text-neu-text mb-1">{{ t('planning.monthly.projectsStep.carryForward') }}</h3>
          <p class="text-xs text-neu-muted mb-3">
            These projects are still in progress. Tap to include them this month.
          </p>
          <div class="space-y-2">
            <button
              v-for="project in suggestableProjects"
              :key="project.id"
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-xl bg-neu-base shadow-neu-raised-sm border border-neu-border/50 hover:shadow-neu-hover transition-all text-left"
              @click="handleAdoptProject(project)"
            >
              <PlusCircleIcon class="w-5 h-5 text-primary flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neu-text truncate">{{ project.name }}</p>
                <p class="text-xs text-neu-muted capitalize">{{ project.status }}</p>
              </div>
            </button>
          </div>
        </AppCard>

        <AppCard v-if="draft.projects.length === 0 && !showProjectForm" padding="lg" class="mb-6">
          <div class="text-center py-6">
            <p class="text-neu-muted mb-4">
              No projects yet. Add your first project to get started.
            </p>
            <AppButton variant="filled" @click="openCreateProjectForm">
              <PlusIcon class="w-4 h-4 mr-2" />
              {{ t('planning.components.draftProjectForm.addProject') }}
            </AppButton>
          </div>
        </AppCard>

        <DraftProjectForm
          v-if="showProjectForm"
          :project="projectToEdit"
          :life-areas="availableLifeAreas"
          :priorities="prioritiesForYear"
          :default-life-area-id="draft.primaryFocusLifeAreaId || undefined"
          :default-start-date="draft.startDate"
          :default-end-date="draft.endDate"
          :initial-key-results="getProjectKeyResults(projectToEdit)"
          @save="handleSaveProject"
          @cancel="closeProjectForm"
        />

        <template v-if="draft.projects.length > 0">
          <div class="flex justify-end mb-3" v-if="!showProjectForm">
            <AppButton variant="tonal" @click="openCreateProjectForm">
              <PlusIcon class="w-4 h-4 mr-2" />
              {{ t('planning.components.draftProjectForm.addProject') }}
            </AppButton>
          </div>

          <div class="space-y-3">
            <DraftProjectCard
              v-for="project in sortedDraftProjects"
              :key="project.id"
              :project="project"
              :life-areas="availableLifeAreas"
              :priorities="prioritiesForYear"
              @edit="openEditProjectForm"
              @delete="handleDeleteProject"
              @toggle-focus="handleToggleProjectFocus"
            />
          </div>
        </template>

        <!-- Trackers & Habits for this month -->
        <AppCard v-if="allMonthlyTrackerItems.length > 0 || draft.projects.length > 0" padding="lg" class="mt-4">
          <h3 class="text-base font-semibold text-neu-text mb-2">{{ t('planning.monthly.projectsStep.trackersTitle') }}</h3>
          <p class="text-sm text-neu-muted">
            Choose which trackers and habits to keep active this month.
          </p>
          <p v-if="trackerSelectionNotice" class="mt-2 text-xs text-warning">
            {{ trackerSelectionNotice }}
          </p>

          <p v-if="allMonthlyTrackerItems.length === 0" class="mt-3 text-sm text-neu-muted">
            No active monthly trackers or habits found yet. You can add KRs from project cards or create habits.
          </p>

          <div v-else class="mt-4 space-y-3">
            <label
              v-for="item in allMonthlyTrackerItems"
              :key="item.tracker.id"
              class="neo-checkbox-row flex items-start gap-3 p-3"
              :class="isMonthlyTrackerSelected(item.tracker.id) ? 'neo-checkbox-row--checked' : ''"
            >
              <input
                type="checkbox"
                class="mt-1 neo-checkbox"
                :checked="isMonthlyTrackerSelected(item.tracker.id)"
                @change="handleMonthlyTrackerSelectionChange(item.tracker.id, $event)"
              />
              <div class="min-w-0 flex-1 space-y-1.5">
                <p class="text-lg font-semibold leading-snug text-neu-text line-clamp-2">
                  {{ item.displayName }}
                </p>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    class="neo-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-neu-border/22 bg-section/60 text-on-surface-variant"
                  >
                    {{ item.kindLabel }}
                  </span>
                  <span
                    v-if="getTrackerSignalBadge(item)"
                    class="neo-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-primary/25 bg-primary/10 text-primary"
                  >
                    {{ getTrackerSignalBadge(item) }}
                  </span>
                  <CommitmentLinkedObjectsCluster
                    :project="item.parentProject"
                    :life-areas="item.explicitLifeAreas"
                    :priorities="item.explicitPriorities"
                    :derived-life-areas="item.derivedLifeAreas"
                    :derived-priorities="item.derivedPriorities"
                    disabled
                  />
                </div>
              </div>
            </label>
          </div>
        </AppCard>
      </div>

      <!-- Step 5: Review & Confirm -->
      <div v-if="draft.activeStep === 4">
        <MonthlyReviewSummary
          :draft="draft"
          :life-areas="availableLifeAreas"
          :priorities="prioritiesForYear"
          :month-label="monthLabel"
        />

        <AppCard v-if="saveError" padding="md" class="mt-4 !border-error/50">
          <div class="flex items-start gap-3 text-error">
            <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">{{ t('planning.monthly.confirmStep.saveError') }}</p>
              <p class="text-sm mt-1">{{ saveError }}</p>
            </div>
          </div>
        </AppCard>
      </div>
    </template>

    <!-- Footer Actions -->
    <div
      v-if="!isLoading && !error"
      class="fixed bottom-0 left-0 right-0 neo-footer p-4"
    >
      <div class="max-w-3xl mx-auto flex justify-between items-center">
        <AppButton v-if="draft.activeStep > 0" variant="text" @click="handleBack">
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          {{ t('common.buttons.back') }}
        </AppButton>
        <div v-else />

        <AppButton
          variant="filled"
                   :disabled="isSaving || (draft.activeStep === steps.length - 1 && !!periodValidationError)"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useT } from '@/composables/useT'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  RectangleStackIcon,
  SparklesIcon,
  RocketLaunchIcon,
  PlusIcon,
  PlusCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import DraftProjectForm from '@/components/planning/monthly/DraftProjectForm.vue'
import DraftProjectCard from '@/components/planning/monthly/DraftProjectCard.vue'
import MonthlyReviewSummary from '@/components/planning/MonthlyReviewSummary.vue'
import CommitmentLinkedObjectsCluster from '@/components/planning/CommitmentLinkedObjectsCluster.vue'
import {
  useMonthlyPlanningDraft,
  type DraftProject,
} from '@/composables/useMonthlyPlanningDraft'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'
import {
  getCurrentYear,
  getDefaultPeriodName,
  getYearFromDate,
} from '@/utils/periodUtils'
import { resolvePeriodTrackerSelection } from '@/services/periodTrackerSelection.service'
import { buildMonthlyInsights, type MonthlyInsights } from '@/services/monthlyInsights.service'
import type { Project, Tracker, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import type { Habit } from '@/domain/habit'

// ============================================================================
// Route & Router
// ============================================================================

const { t } = useT()

const route = useRoute()
const router = useRouter()
const routePlanId = computed(() => route.params.planId as string | undefined)
const isEditMode = computed(() => !!routePlanId.value && routePlanId.value !== 'new')

// ============================================================================
// Steps
// ============================================================================

interface Step {
  id: string
  title: string
  subtitle: string
}

const steps = computed<Step[]>(() => [
  { id: 'period', title: t('planning.monthly.steps.period.title'), subtitle: t('planning.monthly.steps.period.subtitle') },
  { id: 'signals', title: t('planning.monthly.steps.signals.title'), subtitle: t('planning.monthly.steps.signals.subtitle') },
  { id: 'focus', title: t('planning.monthly.steps.focus.title'), subtitle: t('planning.monthly.steps.focus.subtitle') },
  { id: 'projects', title: t('planning.monthly.steps.projects.title'), subtitle: t('planning.monthly.steps.projects.subtitle') },
  { id: 'review', title: t('planning.monthly.steps.review.title'), subtitle: t('planning.monthly.steps.review.subtitle') },
])

// ============================================================================
// Draft State
// ============================================================================

const {
  draft,
  ready: draftReady,
  clearDraft,
  hasDraft,
  addProject,
  adoptProject,
  updateProject,
  deleteProject,
  setPrimaryFocusLifeArea,
  toggleSecondaryFocusLifeArea,
  canSelectSecondaryFocusLifeArea,
  seedFromExisting,
} = useMonthlyPlanningDraft(isEditMode.value && routePlanId.value ? routePlanId.value : 'new')

const defaultMonthName = computed(() => {
  if (!draft.value.startDate || !draft.value.endDate) return ''
  return getDefaultPeriodName(draft.value.startDate, draft.value.endDate, 'monthly')
})

const monthLabel = computed(() => {
  if (draft.value.name.trim()) {
    return draft.value.name.trim()
  }
  if (draft.value.startDate && draft.value.endDate) {
    return defaultMonthName.value
  }
  return `${getCurrentYear()}`
})

const periodValidationError = computed(() => {
  if (draft.value.activeStep !== 0) return ''
  if (!draft.value.startDate) {
    return t('planning.common.validation.startDateRequired')
  }
  if (!draft.value.endDate) {
    return t('planning.common.validation.endDateRequired')
  }
  if (draft.value.endDate < draft.value.startDate) {
    return t('planning.common.validation.endDateAfterStart')
  }
  return ''
})

const targetYear = computed(() => {
  if (draft.value.startDate) {
    return getYearFromDate(draft.value.startDate)
  }
  return getCurrentYear()
})

// ============================================================================
// Stores
// ============================================================================

const monthlyPlanStore = useMonthlyPlanStore()
const monthlyReflectionStore = useMonthlyReflectionStore()
const weeklyPlanStore = useWeeklyPlanStore()
const weeklyReflectionStore = useWeeklyReflectionStore()
const commitmentStore = useCommitmentStore()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()
const habitStore = useHabitStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()

// ============================================================================
// Loading & Saving State
// ============================================================================

const isLoading = ref(true)
const error = ref<string | null>(null)
const isSaving = ref(false)
const saveError = ref<string | null>(null)
const trackerSelectionNotice = ref<string | null>(null)
const isPersistingTrackerSelectionRepair = ref(false)
const previousMonthInsights = ref<MonthlyInsights | null>(null)

// ============================================================================
// Life Areas / Priorities
// ============================================================================

const availableLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const prioritiesForYear = computed(() => priorityStore.getPrioritiesByYear(targetYear.value))

const previousMonthlyPlan = computed(() => {
  const currentStartDate = draft.value.startDate
  if (!currentStartDate) return undefined

  return monthlyPlanStore.monthlyPlans
    .filter((plan) => plan.endDate < currentStartDate)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0]
})

const previousMonthlyReflection = computed(() => {
  if (!previousMonthlyPlan.value) return undefined
  return monthlyReflectionStore.getReflectionByPlanId(previousMonthlyPlan.value.id)
})

const previousMonthLabel = computed(() => {
  if (!previousMonthlyPlan.value) return ''
  return (
    previousMonthlyPlan.value.name?.trim() ||
    getDefaultPeriodName(previousMonthlyPlan.value.startDate, previousMonthlyPlan.value.endDate, 'monthly')
  )
})

const previousMonthSignalSummary = computed(() => {
  if (!previousMonthInsights.value) return null
  const completion = previousMonthInsights.value.commitmentCompletion
  const total = completion.done + completion.skipped + completion.planned
  const completionRate = total > 0 ? Math.round((completion.done / total) * 100) : 0

  return {
    totalWeeks: previousMonthInsights.value.weekCards.length,
    reflectedWeeks: previousMonthInsights.value.reflectedWeeks,
    completionRate,
    completion,
    deterioratingLifeAreaIds: previousMonthInsights.value.deterioratingLifeAreaIds,
    batteryAverages: previousMonthInsights.value.batteryAverages,
  }
})

const previousProjectSignalByProjectId = computed(() => {
  return new Map(
    (previousMonthInsights.value?.projectSignals ?? []).map((signal) => [
      signal.projectId,
      signal,
    ])
  )
})

const suggestedMonthIntention = computed(() => {
  const reflection = previousMonthlyReflection.value
  return (
    reflection?.courseCorrection?.continue?.[0] ||
    reflection?.adjustments ||
    previousMonthInsights.value?.summarySuggestions.monthIntention
  )
})

const suggestedFocusSuccessSignal = computed(() => {
  return (
    previousMonthlyPlan.value?.focusSuccessSignal ||
    previousMonthInsights.value?.summarySuggestions.focusSuccessSignal
  )
})

const suggestedBalanceGuardrail = computed(() => {
  if (previousMonthSignalSummary.value?.deterioratingLifeAreaIds.length) {
    return t('planning.monthly.signalsStep.detectedDeteriorationGuardrail')
  }
  return (
    previousMonthlyPlan.value?.balanceGuardrail ||
    previousMonthInsights.value?.summarySuggestions.balanceGuardrail
  )
})

const previousMonthCompletionLabel = computed(() => {
  const summary = previousMonthSignalSummary.value
  if (!summary) return '0%'
  return `${summary.completionRate}%`
})

// ============================================================================
// Projects Step State
// ============================================================================

const showProjectForm = ref(false)
const projectToEdit = ref<DraftProject | undefined>(undefined)

const sortedDraftProjects = computed(() =>
  [...draft.value.projects].sort((a, b) => a.sortOrder - b.sortOrder)
)

function cloneTrackerForDraft(tracker: Partial<Tracker>): Partial<Tracker> {
  return {
    ...tracker,
    lifeAreaIds: Array.isArray(tracker.lifeAreaIds) ? [...tracker.lifeAreaIds] : [],
    priorityIds: Array.isArray(tracker.priorityIds) ? [...tracker.priorityIds] : [],
    tickLabels: Array.isArray(tracker.tickLabels) ? [...tracker.tickLabels] : undefined,
  }
}

function getProjectKeyResults(project?: DraftProject): Partial<Tracker>[] {
  if (!project) return []
  if (Array.isArray(project.keyResults)) {
    return project.keyResults.map((tracker) => cloneTrackerForDraft(tracker))
  }
  return trackerStore
    .getTrackersByProject(project.id)
    .map((tracker) => cloneTrackerForDraft(tracker))
}

function normalizeDraftTrackerForSelection(
  projectId: string,
  tracker: Partial<Tracker>,
  index: number
): Tracker | null {
  if (!tracker.id || !tracker.name?.trim()) return null
  const fallbackTimestamp = '1970-01-01T00:00:00.000Z'
  return {
    id: tracker.id,
    createdAt: tracker.createdAt || fallbackTimestamp,
    updatedAt: tracker.updatedAt || fallbackTimestamp,
    parentType: 'project',
    parentId: projectId,
    lifeAreaIds: Array.isArray(tracker.lifeAreaIds) ? [...tracker.lifeAreaIds] : [],
    priorityIds: Array.isArray(tracker.priorityIds) ? [...tracker.priorityIds] : [],
    name: tracker.name.trim(),
    type: tracker.type ?? 'count',
    cadence: tracker.cadence ?? 'weekly',
    unit: tracker.unit,
    targetCount: tracker.targetCount,
    baselineValue: tracker.baselineValue,
    targetValue: tracker.targetValue,
    direction: tracker.direction,
    ratingScaleMin: tracker.ratingScaleMin,
    ratingScaleMax: tracker.ratingScaleMax,
    hasPeriodicTargets: tracker.hasPeriodicTargets,
    rollup: tracker.rollup,
    notePrompt: tracker.notePrompt,
    tickLabels: Array.isArray(tracker.tickLabels) ? [...tracker.tickLabels] : undefined,
    sortOrder: tracker.sortOrder ?? index,
    isActive: tracker.isActive ?? true,
  }
}

interface MonthlyTrackerGroup {
  projectId: string
  projectName: string
  trackers: Tracker[]
}

const monthlyTrackerGroups = computed<MonthlyTrackerGroup[]>(() => {
  return sortedDraftProjects.value
    .map((project) => {
      const trackers = getProjectKeyResults(project)
        .map((tracker, index) => normalizeDraftTrackerForSelection(project.id, tracker, index))
        .filter(Boolean) as Tracker[]

      return {
        projectId: project.id,
        projectName: project.name,
        trackers: trackers.filter((tracker) => tracker.isActive && tracker.cadence === 'monthly'),
      }
    })
    .filter((group) => group.trackers.length > 0)
})

const monthlyHabitTrackers = computed(() => {
  const activeMonthlyHabits = habitStore.habits.filter(
    (h) => h.isActive && !h.isPaused && h.cadence === 'monthly'
  )
  return activeMonthlyHabits
    .map((habit) => {
      const trackers = trackerStore.getTrackersByHabit(habit.id)
      return trackers.length > 0 ? { habit, tracker: trackers[0] } : null
    })
    .filter(Boolean) as { habit: typeof habitStore.habits[number]; tracker: Tracker }[]
})

interface MonthlyTrackerItem {
  tracker: Tracker
  displayName: string
  kindLabel: string
  parentProject?: Project
  parentHabit?: Habit
  explicitLifeAreas: LifeArea[]
  explicitPriorities: Priority[]
  derivedLifeAreas: LifeArea[]
  derivedPriorities: Priority[]
}

const lifeAreaById = computed(() => new Map(availableLifeAreas.value.map((la) => [la.id, la])))
const priorityById = computed(() => new Map(prioritiesForYear.value.map((p) => [p.id, p])))

const allMonthlyTrackerItems = computed<MonthlyTrackerItem[]>(() => {
  const items: MonthlyTrackerItem[] = []
  const projectById = new Map(sortedDraftProjects.value.map((p) => [p.id, p]))

  // Project trackers
  for (const group of monthlyTrackerGroups.value) {
    const project = projectById.get(group.projectId)
    for (const tracker of group.trackers) {
      const trackerLifeAreaIds = tracker.lifeAreaIds ?? []
      const trackerPriorityIds = tracker.priorityIds ?? []
      const parentLifeAreaIds = project?.lifeAreaIds ?? []
      const parentPriorityIds = project?.priorityIds ?? []

      const explicitLifeAreas = trackerLifeAreaIds
        .map((id) => lifeAreaById.value.get(id))
        .filter(Boolean) as LifeArea[]
      const explicitPriorities = trackerPriorityIds
        .map((id) => priorityById.value.get(id))
        .filter(Boolean) as Priority[]

      const seenLaIds = new Set(trackerLifeAreaIds)
      const derivedLifeAreas: LifeArea[] = []
      for (const id of parentLifeAreaIds) {
        if (!seenLaIds.has(id)) {
          const la = lifeAreaById.value.get(id)
          if (la) derivedLifeAreas.push(la)
          seenLaIds.add(id)
        }
      }

      const seenPIds = new Set(trackerPriorityIds)
      const derivedPriorities: Priority[] = []
      for (const id of parentPriorityIds) {
        if (!seenPIds.has(id)) {
          const p = priorityById.value.get(id)
          if (p) derivedPriorities.push(p)
          seenPIds.add(id)
        }
      }

      items.push({
        tracker,
        displayName: tracker.name,
        kindLabel: 'Project',
        parentProject: project as unknown as Project | undefined,
        explicitLifeAreas,
        explicitPriorities,
        derivedLifeAreas,
        derivedPriorities,
      })
    }
  }

  // Habit trackers
  for (const entry of monthlyHabitTrackers.value) {
    const habitLifeAreaIds = entry.habit.lifeAreaIds ?? []
    const habitPriorityIds = entry.habit.priorityIds ?? []

    const explicitLifeAreas = habitLifeAreaIds
      .map((id) => lifeAreaById.value.get(id))
      .filter(Boolean) as LifeArea[]
    const explicitPriorities = habitPriorityIds
      .map((id) => priorityById.value.get(id))
      .filter(Boolean) as Priority[]

    items.push({
      tracker: entry.tracker,
      displayName: entry.habit.name,
      kindLabel: 'Habit',
      parentHabit: entry.habit,
      explicitLifeAreas,
      explicitPriorities,
      derivedLifeAreas: [],
      derivedPriorities: [],
    })
  }

  return items
})

const monthlySelectableTrackerIds = computed(() => [
  ...monthlyTrackerGroups.value.flatMap((group) => group.trackers.map((tracker) => tracker.id)),
  ...monthlyHabitTrackers.value.map((entry) => entry.tracker.id),
])

const monthlySelectionResolution = computed(() =>
  resolvePeriodTrackerSelection({
    selectedTrackerIds: draft.value.hasCustomTrackerSelection
      ? draft.value.selectedTrackerIds
      : undefined,
    eligibleTrackerIds: monthlySelectableTrackerIds.value,
  })
)

const effectiveMonthlySelectedTrackerIds = computed(
  () => monthlySelectionResolution.value.effectiveSelectedTrackerIds
)

function isMonthlyTrackerSelected(trackerId: string): boolean {
  return effectiveMonthlySelectedTrackerIds.value.includes(trackerId)
}

function isCheckedEvent(event: Event): boolean {
  return event.target instanceof HTMLInputElement ? event.target.checked : false
}

function toggleMonthlyTrackerSelection(trackerId: string, selected: boolean): void {
  draft.value.hasCustomTrackerSelection = true
  trackerSelectionNotice.value = null
  const next = new Set(effectiveMonthlySelectedTrackerIds.value)
  if (selected) {
    next.add(trackerId)
    const trackerProject = monthlyTrackerGroups.value.find((group) =>
      group.trackers.some((tracker) => tracker.id === trackerId)
    )
    if (trackerProject) {
      updateProject(trackerProject.projectId, { isFocusedThisMonth: true })
    }
  } else {
    next.delete(trackerId)
  }
  draft.value.selectedTrackerIds = Array.from(next)
}

function handleMonthlyTrackerSelectionChange(trackerId: string, event: Event): void {
  toggleMonthlyTrackerSelection(trackerId, isCheckedEvent(event))
}

function getTrackerSignalBadge(item: MonthlyTrackerItem): string | null {
  if (!item.parentProject) return null
  const signal = previousProjectSignalByProjectId.value.get(item.parentProject.id)
  if (!signal) return null
  if (signal.trackerCompletionPercent == null) {
    return t('planning.monthly.projectsStep.noPreviousTrackerSignal')
  }
  return t('planning.monthly.projectsStep.previousTrackerCompletion', {
    percent: signal.trackerCompletionPercent,
  })
}

watch(
  monthlySelectionResolution,
  (resolution) => {
    if (!resolution.repairedSelectedTrackerIds) return
    if (areStringArraysEqual(resolution.repairedSelectedTrackerIds, draft.value.selectedTrackerIds)) {
      return
    }

    draft.value.hasCustomTrackerSelection = true
    draft.value.selectedTrackerIds = [...resolution.repairedSelectedTrackerIds]
    trackerSelectionNotice.value =
      resolution.repairMode === 'fallback'
        ? 'Tracker selection was repaired and reset to available trackers.'
        : 'Tracker selection was repaired to remove missing trackers.'

    if (!isEditMode.value || !routePlanId.value || isPersistingTrackerSelectionRepair.value) return
    void persistMonthlyTrackerSelectionRepair(resolution.repairedSelectedTrackerIds)
  },
  { immediate: true }
)

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

async function persistMonthlyTrackerSelectionRepair(trackerIds: string[]) {
  if (!routePlanId.value) return
  isPersistingTrackerSelectionRepair.value = true
  try {
    await monthlyPlanStore.updateMonthlyPlan(routePlanId.value, { selectedTrackerIds: trackerIds })
  } catch (error) {
    console.error('Failed to persist repaired monthly tracker selection:', error)
  } finally {
    isPersistingTrackerSelectionRepair.value = false
  }
}

function openCreateProjectForm() {
  projectToEdit.value = undefined
  showProjectForm.value = true
}

function openEditProjectForm(id: string) {
  projectToEdit.value = draft.value.projects.find((p) => p.id === id)
  showProjectForm.value = true
}

function closeProjectForm() {
  showProjectForm.value = false
  projectToEdit.value = undefined
}

function handleSaveProject(data: Omit<DraftProject, 'id' | 'sortOrder'>) {
  if (projectToEdit.value) {
    updateProject(projectToEdit.value.id, data)
  } else {
    addProject(data)
  }
  closeProjectForm()
}

function handleDeleteProject(id: string) {
  deleteProject(id)
}

function handleToggleProjectFocus(payload: { id: string; focused: boolean }) {
  updateProject(payload.id, { isFocusedThisMonth: payload.focused })
}

const suggestableProjects = computed(() => {
  const draftIds = new Set(draft.value.projects.map((p) => p.id))
  return projectStore.getNonTerminalProjects.filter((p) => !draftIds.has(p.id))
})

function handleAdoptProject(project: Project) {
  adoptProject(project)
  updateProject(project.id, {
    keyResults: trackerStore
      .getTrackersByProject(project.id)
      .map((tracker) => cloneTrackerForDraft(tracker)),
  })
}

function resolveFocusMonthIds(
  project: DraftProject,
  planId: string,
  existingProject?: Project
): string[] {
  const base = project.focusMonthIds ?? existingProject?.focusMonthIds ?? []
  const focusSet = new Set(base)
  const shouldFocus = project.isFocusedThisMonth ?? true
  if (shouldFocus) {
    focusSet.add(planId)
  } else {
    focusSet.delete(planId)
  }
  return Array.from(focusSet)
}

async function buildPreviousMonthInsights(): Promise<void> {
  if (!previousMonthlyPlan.value) {
    previousMonthInsights.value = null
    return
  }

  const plan = previousMonthlyPlan.value
  const trackerPeriods = await trackerPeriodDexieRepository.getByDateRange(
    plan.startDate,
    plan.endDate
  )

  previousMonthInsights.value = buildMonthlyInsights({
    monthlyPlan: plan,
    weeklyPlans: weeklyPlanStore.weeklyPlans,
    weeklyReflections: weeklyReflectionStore.weeklyReflections,
    commitments: commitmentStore.commitments,
    projects: projectStore.projects,
    trackers: trackerStore.trackers,
    trackerPeriods,
    journalEntries: journalStore.entries,
    emotionLogs: emotionLogStore.logs,
  })
}

function applySignalsPrefillIfEmpty(): void {
  if (isEditMode.value) return

  if (!draft.value.monthIntention.trim() && suggestedMonthIntention.value) {
    draft.value.monthIntention = suggestedMonthIntention.value
  }
  if (!draft.value.focusSuccessSignal.trim() && suggestedFocusSuccessSignal.value) {
    draft.value.focusSuccessSignal = suggestedFocusSuccessSignal.value
  }
  if (!draft.value.balanceGuardrail.trim() && suggestedBalanceGuardrail.value) {
    draft.value.balanceGuardrail = suggestedBalanceGuardrail.value
  }
}

// ============================================================================
// Navigation
// ============================================================================

const progressWidth = computed(() => {
  const progress = ((draft.value.activeStep + 1) / steps.value.length) * 100
  return `${progress}%`
})

function getStepCircleClasses(index: number) {
  if (index < draft.value.activeStep) {
    return 'neo-step-completed'
  } else if (index === draft.value.activeStep) {
    return 'neo-step-active'
  }
  return 'neo-step-future'
}

function goToStep(index: number) {
  if (index <= draft.value.activeStep) {
    draft.value.activeStep = index
  }
}

function handleBack() {
  if (draft.value.activeStep > 0) {
    draft.value.activeStep--
  }
}

async function handleNext() {
  if (periodValidationError.value) {
    return
  }

  if (draft.value.activeStep < steps.value.length - 1) {
    draft.value.activeStep++
    return
  }

  await handleConfirm()
}

const nextButtonText = computed(() => {
  switch (draft.value.activeStep) {
    case 0:
      return t('planning.monthly.nextButton.toSignals')
    case 1:
      return t('planning.monthly.nextButton.toFocus')
    case 2:
      return t('planning.monthly.nextButton.toProjects')
    case 3:
      return t('planning.monthly.nextButton.toReview')
    case 4:
      return isSaving.value ? t('common.saving') : t('planning.monthly.nextButton.savePlan')
    default:
      return t('common.buttons.next')
  }
})

function handleCancel() {
  router.push('/planning')
}

// ============================================================================
// Persistence
// ============================================================================

const selectedTrackerIdsForPersistence = computed(() =>
  Array.from(new Set(effectiveMonthlySelectedTrackerIds.value))
)

const existingPlan = computed(() => {
  if (!isEditMode.value || !routePlanId.value) return undefined
  return monthlyPlanStore.getMonthlyPlanById(routePlanId.value)
})

async function handleConfirm(): Promise<void> {
  if (periodValidationError.value) return

  isSaving.value = true
  saveError.value = null

  try {
    const year = existingPlan.value?.year || targetYear.value

    let planId = existingPlan.value?.id
    if (planId) {
      await monthlyPlanStore.updateMonthlyPlan(planId, {
        startDate: draft.value.startDate,
        endDate: draft.value.endDate,
        name: draft.value.name.trim() || undefined,
        year,
        primaryFocusLifeAreaId: draft.value.primaryFocusLifeAreaId || undefined,
        secondaryFocusLifeAreaIds: [...draft.value.secondaryFocusLifeAreaIds],
        monthIntention: draft.value.monthIntention.trim() || undefined,
        focusSuccessSignal: draft.value.focusSuccessSignal.trim() || undefined,
        balanceGuardrail: draft.value.balanceGuardrail.trim() || undefined,
        selectedTrackerIds: selectedTrackerIdsForPersistence.value,
      })
    } else {
      const created = await monthlyPlanStore.createMonthlyPlan({
        startDate: draft.value.startDate,
        endDate: draft.value.endDate,
        name: draft.value.name.trim() || undefined,
        year,
        primaryFocusLifeAreaId: draft.value.primaryFocusLifeAreaId || undefined,
        secondaryFocusLifeAreaIds: [...draft.value.secondaryFocusLifeAreaIds],
        monthIntention: draft.value.monthIntention.trim() || undefined,
        focusSuccessSignal: draft.value.focusSuccessSignal.trim() || undefined,
        balanceGuardrail: draft.value.balanceGuardrail.trim() || undefined,
        projectIds: [],
        selectedTrackerIds: selectedTrackerIdsForPersistence.value,
      })
      planId = created.id
    }

    if (!planId) {
      throw new Error('Failed to create or load monthly plan.')
    }

    // Remove projects no longer in draft
    const existingProjectsForPlan = projectStore.getProjectsByMonthId(planId)
    const draftIds = new Set(draft.value.projects.map((p) => p.id))

    for (const project of existingProjectsForPlan) {
      if (!draftIds.has(project.id)) {
        const updatedMonthIds = project.monthIds.filter((id) => id !== planId)
        const updatedFocusMonthIds = (project.focusMonthIds ?? []).filter((id) => id !== planId)
        if (updatedMonthIds.length === 0) {
          await projectStore.deleteProject(project.id)
        } else {
          await projectStore.updateProject(project.id, {
            monthIds: updatedMonthIds,
            focusMonthIds: updatedFocusMonthIds,
          })
        }
      }
    }

    const projectIds: string[] = []

    for (const project of draft.value.projects) {
      const existingProject = projectStore.getProjectById(project.id)
      const draftTrackers = getProjectKeyResults(project)
      if (existingProject) {
        const snapshotTrackers = trackerStore.getTrackersByProject(existingProject.id)
        const updatedMonthIds = Array.from(new Set([...(existingProject.monthIds || []), planId]))
        const focusMonthIds = resolveFocusMonthIds(project, planId, existingProject)
        await projectStore.updateProject(existingProject.id, {
          name: project.name.trim(),
          icon: project.icon,
          lifeAreaIds: project.lifeAreaIds,
          priorityIds: project.priorityIds,
          description: project.description?.trim() || undefined,
          targetOutcome: project.targetOutcome?.trim() || undefined,
          objective: project.objective?.trim() || undefined,
          startDate: project.startDate || undefined,
          endDate: project.endDate || undefined,
          focusMonthIds,
          status: project.status,
          monthIds: updatedMonthIds,
        })
        await trackerStore.reconcileProjectTrackers(
          existingProject.id,
          snapshotTrackers,
          draftTrackers
        )
        projectIds.push(existingProject.id)
      } else {
        const focusMonthIds = resolveFocusMonthIds(project, planId)
        const createdProject = await projectStore.createProject({
          name: project.name.trim(),
          icon: project.icon,
          lifeAreaIds: project.lifeAreaIds,
          priorityIds: project.priorityIds,
          description: project.description?.trim() || undefined,
          targetOutcome: project.targetOutcome?.trim() || undefined,
          objective: project.objective?.trim() || undefined,
          startDate: project.startDate || undefined,
          endDate: project.endDate || undefined,
          status: project.status,
          monthIds: [planId],
          focusMonthIds,
          focusWeekIds: [],
          reflectionNote: undefined,
        })
        await trackerStore.reconcileProjectTrackers(createdProject.id, [], draftTrackers)
        projectIds.push(createdProject.id)
      }
    }

    await monthlyPlanStore.updateMonthlyPlan(planId, {
      projectIds,
      selectedTrackerIds: selectedTrackerIdsForPersistence.value,
    })

    clearDraft()
    router.push('/planning')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : t('planning.monthly.confirmStep.saveError')
    console.error('Error saving monthly plan:', err)
  } finally {
    isSaving.value = false
  }
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      monthlyPlanStore.loadMonthlyPlans(),
      monthlyReflectionStore.loadMonthlyReflections(),
      weeklyPlanStore.loadWeeklyPlans(),
      weeklyReflectionStore.loadWeeklyReflections(),
      commitmentStore.loadCommitments(),
      journalStore.loadEntries(),
      emotionLogStore.loadLogs(),
    ])

    const plan = existingPlan.value

    const yearToLoad = plan?.year || targetYear.value

    await Promise.all([
      draftReady,
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(yearToLoad),
      projectStore.loadProjects(),
      trackerStore.loadTrackers(),
      habitStore.loadHabits(),
    ])

    if (plan && !hasDraft()) {
      const planProjects = projectStore
        .getProjectsByMonthId(plan.id)
        .map((project) => ({
          ...project,
          keyResults: trackerStore
            .getTrackersByProject(project.id)
            .map((tracker) => cloneTrackerForDraft(tracker)),
        }))
      seedFromExisting(
        {
          startDate: plan.startDate,
          endDate: plan.endDate,
          name: plan.name,
          primaryFocusLifeAreaId: plan.primaryFocusLifeAreaId,
          secondaryFocusLifeAreaIds: plan.secondaryFocusLifeAreaIds,
          monthIntention: plan.monthIntention,
          focusSuccessSignal: plan.focusSuccessSignal,
          balanceGuardrail: plan.balanceGuardrail,
          selectedTrackerIds: plan.selectedTrackerIds,
        },
        planProjects,
        plan.id
      )
    }

    await buildPreviousMonthInsights()
    applySignalsPrefillIfEmpty()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load monthly planning data.'
    console.error('Error loading monthly planning data:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(
  () => draft.value.startDate,
  async (newDate, oldDate) => {
    if (!newDate || newDate === oldDate) return
    const newYear = getYearFromDate(newDate)
    await Promise.all([
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(newYear),
    ])
    await buildPreviousMonthInsights()
    applySignalsPrefillIfEmpty()
  }
)
</script>
