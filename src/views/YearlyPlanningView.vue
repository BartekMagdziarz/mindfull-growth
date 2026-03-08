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
        <h1 class="text-xl font-bold text-neu-text">{{ t('planning.yearly.title') }}</h1>
        <p class="text-sm text-neu-muted">{{ headerLabel }}</p>
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
        <AppButton variant="tonal" @click="loadYearData">
          {{ t('common.buttons.tryAgain') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Step Content -->
    <template v-else>
      <!-- Step 0: Framing -->
      <div v-if="draft.activeStep === 0">
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-neu-text">{{ t('planning.yearly.welcome.title') }}</h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.yearly.welcome.description') }}
          </p>
          <div class="neo-surface rounded-xl p-4">
            <ul class="mt-2 space-y-1 text-sm text-neu-muted">
              <li>1. {{ t('planning.yearly.welcome.processSteps.step1') }}</li>
              <li>2. {{ t('planning.yearly.welcome.processSteps.step2') }}</li>
              <li>3. {{ t('planning.yearly.welcome.processSteps.step3') }}</li>
              <li>4. {{ t('planning.yearly.welcome.processSteps.step4') }}</li>
              <li>5. {{ t('planning.yearly.welcome.processSteps.step5') }}</li>
              <li>6. {{ t('planning.yearly.welcome.processSteps.step6') }}</li>
              <li>7. {{ t('planning.yearly.welcome.processSteps.step7') }}</li>
              <li>8. {{ t('planning.yearly.welcome.processSteps.step8') }}</li>
            </ul>
          </div>
        </AppCard>
      </div>

      <!-- Step 1: Period Details -->
      <div v-if="draft.activeStep === 1">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <CalendarDaysIcon class="w-5 h-5 text-primary" />
            {{ t('planning.yearly.period.title') }}
          </h2>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                for="year-start-date"
                class="block text-sm font-medium text-neu-text mb-1"
              >
                {{ t('planning.yearly.period.startDate') }}
              </label>
              <input
                id="year-start-date"
                v-model="draft.startDate"
                type="date"
                class="neo-input w-full px-3 py-2"
              />
            </div>
            <div>
              <label
                for="year-end-date"
                class="block text-sm font-medium text-neu-text mb-1"
              >
                {{ t('planning.yearly.period.endDate') }}
              </label>
              <input
                id="year-end-date"
                v-model="draft.endDate"
                type="date"
                class="neo-input w-full px-3 py-2"
              />
            </div>
          </div>

          <div class="mt-4">
            <label for="year-name" class="block text-sm font-medium text-neu-text mb-1">
              {{ t('planning.yearly.period.customName') }} <span class="text-neu-muted font-normal">{{ t('planning.yearly.period.optional') }}</span>
            </label>
            <input
              id="year-name"
              v-model="draft.name"
              type="text"
              placeholder="e.g., 2026 Fiscal Year"
              class="neo-input w-full px-3 py-2"
            />
            <p class="mt-1 text-xs text-neu-muted">
              {{ t('planning.components.periodCreationDialog.defaultNameLabel', { name: defaultPeriodName }) }}
            </p>
          </div>

          <p v-if="periodValidationError" class="mt-4 text-sm text-error">
            {{ periodValidationError }}
          </p>
        </AppCard>

        <AppCard padding="lg">
          <div class="flex items-start gap-3">
            <CalendarDaysIcon class="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p class="text-sm font-medium text-neu-text">
                Tip: Keep your yearly period aligned with major life rhythms
              </p>
              <p class="text-sm text-neu-muted">
                Examples: calendar year (Jan 1 – Dec 31) or fiscal year (Apr 1 – Mar 31).
              </p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Step 2: Values Check-in -->
      <div v-if="draft.activeStep === 2">
        <AppCard padding="lg" class="mb-6 space-y-4">
          <h2 class="text-lg font-semibold text-neu-text flex items-center gap-2">
            <HeartIcon class="w-5 h-5 text-primary" />
            {{ t('planning.yearly.values.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.yearly.values.description') }}
          </p>

          <!-- Load values from exercise if available -->
          <template v-if="valuesDiscoveryStore.latestDiscovery">
            <div class="neo-surface rounded-xl p-3">
              <p class="text-xs font-medium text-neu-muted mb-2">
                From your Values Discovery exercise:
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="value in valuesDiscoveryStore.latestDiscovery.coreValues"
                  :key="value"
                  class="px-2 py-0.5 rounded-full bg-chip text-neu-text text-xs border border-chip-border"
                >
                  {{ value }}
                </span>
              </div>
            </div>

            <div class="space-y-4">
              <div v-for="value in valuesDiscoveryStore.latestDiscovery.coreValues" :key="value">
                <RatingSlider
                  :model-value="draft.valuesAlignment[value] || 5"
                  :label="value"
                  @update:model-value="draft.valuesAlignment[value] = $event"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-neu-muted italic">
              You haven't completed a Values Discovery exercise yet. You can
              <router-link to="/exercises/values" class="text-primary hover:underline">do one now</router-link>
              or skip this step.
            </p>
          </template>

          <!-- Reflection note -->
          <div>
            <label class="block text-sm font-medium text-neu-text mb-1">
              Reflection <span class="text-neu-muted font-normal">(optional)</span>
            </label>
            <textarea
              v-model="draft.valuesReflectionNote"
              rows="3"
              placeholder="How closely does your current life reflect these values?"
              class="neo-input w-full p-3 text-sm resize-none"
            />
          </div>
        </AppCard>
      </div>

      <!-- Step 3: Vision (expanded Theme) -->
      <div v-if="draft.activeStep === 3">
        <!-- Year Theme -->
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <SparklesIcon class="w-5 h-5 text-primary" />
            {{ t('planning.yearly.vision.yearTheme.title') }}
          </h2>
          <p class="text-neu-muted text-sm mb-4">
            {{ t('planning.yearly.vision.yearTheme.description') }}
          </p>
          <input
            v-model="draft.yearTheme"
            type="text"
            :placeholder="t('planning.yearly.vision.yearTheme.placeholder')"
            class="neo-input w-full p-4 text-lg"
          />
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="example in themeExamples"
              :key="example"
              type="button"
              class="px-4 py-2 rounded-full text-sm font-medium border border-neu-border/30 text-neu-muted hover:bg-section hover:text-neu-text transition-colors"
              :class="{ 'bg-primary/10 border-primary text-primary': draft.yearTheme === example }"
              @click="draft.yearTheme = example"
            >
              {{ example }}
            </button>
          </div>
        </AppCard>

        <!-- Your Story -->
        <AppCard padding="lg" class="mb-6 space-y-3">
          <h3 class="text-base font-semibold text-neu-text">{{ t('planning.yearly.vision.story.title') }}</h3>
          <p class="text-sm text-neu-muted">
            {{ t('planning.yearly.vision.story.description') }}
          </p>
          <textarea
            v-model="draft.yourStory"
            rows="4"
            :placeholder="t('planning.yearly.vision.story.placeholder')"
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>

        <!-- Fantastic Day -->
        <AppCard padding="lg" class="space-y-3">
          <h3 class="text-base font-semibold text-neu-text">{{ t('planning.yearly.vision.fantasticDay.title') }}</h3>
          <p class="text-sm text-neu-muted">
            {{ t('planning.yearly.vision.fantasticDay.description') }}
          </p>
          <textarea
            v-model="draft.fantasticDay"
            rows="4"
            :placeholder="t('planning.yearly.vision.fantasticDay.placeholder')"
            class="neo-input w-full p-3 text-sm resize-none"
          />
        </AppCard>
      </div>

      <!-- Step 4: Wheel of Life -->
      <div v-if="draft.activeStep === 4">
        <WheelOfLifeExercise
          mode="standalone"
          :show-cancel="true"
          @saved="handleWheelOfLifeSaved"
          @cancel="handleNext"
        />
      </div>

      <!-- Step 5: Dreaming -->
      <div v-if="draft.activeStep === 5">
        <DreamingExercise
          :initial-data="draft.dreaming"
          @completed="handleDreamingCompleted"
          @cancel="handleNext"
        />
      </div>

      <!-- Step 6: Life Area Baselines -->
      <div v-if="draft.activeStep === 6">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <PencilSquareIcon class="w-5 h-5 text-primary" />
            {{ t('planning.yearly.baselines.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.yearly.baselines.description') }}
          </p>
        </AppCard>

        <div class="space-y-4">
          <AppCard
            v-for="lifeArea in activeLifeAreas"
            :key="lifeArea.id"
            padding="lg"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: lifeArea.color || 'rgb(var(--color-primary))' }"
                />
                <div>
                  <p class="text-sm font-semibold text-neu-text">{{ lifeArea.name }}</p>
                  <p class="text-xs text-neu-muted">
                    <span v-if="getWheelRating(lifeArea) !== null">
                      Latest Wheel of Life rating: {{ getWheelRating(lifeArea) }}/10
                    </span>
                    <span v-else>Wheel of Life rating not available yet</span>
                  </p>
                </div>
              </div>
              <span
                v-if="getWheelRating(lifeArea) !== null"
                class="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary"
              >
                {{ getWheelRating(lifeArea) }}
              </span>
            </div>

            <div class="mt-4">
              <textarea
                :id="`baseline-${lifeArea.id}`"
                v-model="draft.lifeAreaNarratives[lifeArea.id]"
                rows="3"
                :placeholder="t('planning.yearly.baselines.placeholder')"
                class="neo-input w-full p-3 text-sm resize-none"
              />
            </div>
          </AppCard>
        </div>

        <AppCard
          v-if="missingNarrativeLifeAreas.length > 0"
          padding="md"
          class="mt-4 border-warning/20 bg-warning/10"
        >
          <div class="flex items-start gap-3 text-warning">
            <ExclamationTriangleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">Narratives are optional but recommended.</p>
              <p class="text-sm">
                Missing for:
                {{ missingNarrativeLifeAreas.map((area) => area.name).join(', ') }}
              </p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Step 7: Define Priorities -->
      <div v-if="draft.activeStep === 7">
        <AppCard padding="lg" class="mb-6">
          <h2 class="text-lg font-semibold text-neu-text mb-2 flex items-center gap-2">
            <FlagIcon class="w-5 h-5 text-primary" />
            {{ t('planning.yearly.prioritiesStep.title') }}
          </h2>
          <p class="text-neu-muted text-sm">
            {{ t('planning.yearly.prioritiesStep.description') }}
          </p>
        </AppCard>

        <!-- Priority Form (inline when open) -->
        <DraftPriorityForm
          v-if="showPriorityForm"
          :priority="priorityToEdit"
          :life-areas="activeLifeAreas"
          class="mb-4"
          @save="handleSavePriority"
          @cancel="closePriorityForm"
        />

        <div v-else class="space-y-3">
          <AppCard v-if="draft.priorities.length === 0" padding="lg">
            <div class="text-center py-6">
              <div class="w-12 h-12 mx-auto mb-3 neo-icon-circle flex items-center justify-center">
                <FlagIcon class="w-6 h-6 text-neu-muted" />
              </div>
              <p class="text-neu-muted mb-4">
                {{ t('planning.yearly.prioritiesStep.emptyTitle') }}
              </p>
              <AppButton variant="filled" @click="openCreatePriorityForm()">
                <PlusIcon class="w-4 h-4 mr-2" />
                {{ t('planning.yearly.prioritiesStep.addPriority') }}
              </AppButton>
            </div>
          </AppCard>

          <div v-else>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DraftPriorityItem
                v-for="priority in sortedDraftPriorities"
                :key="priority.id"
                :priority="priority"
                :life-areas="activeLifeAreas"
                @edit="openEditPriorityForm"
                @delete="handleDeletePriority"
                @update-icon="handleUpdatePriorityIcon"
                @toggle-status="handleTogglePriorityStatus"
              />
            </div>

            <div class="flex justify-end mt-4">
              <AppButton variant="tonal" @click="openCreatePriorityForm()">
                <PlusIcon class="w-4 h-4 mr-2" />
                {{ t('planning.yearly.prioritiesStep.addPriority') }}
              </AppButton>
            </div>
          </div>
        </div>

        <!-- Validation Error -->
        <p v-if="prioritiesValidationError" class="mt-4 text-sm text-error">
          {{ prioritiesValidationError }}
        </p>
      </div>

      <!-- Step 8: Review & Confirm -->
      <div v-if="draft.activeStep === 8">
        <YearlyReviewSummary
          :draft="draft"
          :life-areas="activeLifeAreas"
          :priorities="draft.priorities"
        />

        <!-- Save Error Display -->
        <AppCard v-if="saveError" padding="md" class="mt-4 border-error/50">
          <div class="flex items-start gap-3 text-error">
            <ExclamationCircleIcon class="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p class="font-medium">{{ t('planning.yearly.confirmStep.saveError') }}</p>
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
        <!-- Back Button -->
        <AppButton
          v-if="draft.activeStep > 0"
          variant="text"
          @click="handleBack"
        >
          <ArrowLeftIcon class="w-4 h-4 mr-2" />
          {{ t('common.buttons.back') }}
        </AppButton>
        <div v-else />

        <!-- Next/Skip Buttons -->
        <div class="flex gap-3">
          <AppButton
            v-if="canSkip"
            variant="text"
            @click="handleSkip"
          >
            Skip
          </AppButton>
          <AppButton
            variant="filled"
            :disabled="isSaving || (draft.activeStep === 8 && !canConfirm)"
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
  </div>
</template>

<script setup lang="ts">
/**
 * YearlyPlanningView - Multi-step yearly planning wizard
 *
 * This view guides users through the yearly planning process:
 * - Step 1: Define the yearly period dates and optional name
 * - Step 2: Set a theme/word for the year
 * - Steps 3-5: Visioning and Wheel of Life
 * - Steps 6-8: Baselines, priorities, and review
 *
 * Draft state is persisted to sessionStorage so users can resume.
 * Final persistence to IndexedDB happens only in the Review step.
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useT } from '@/composables/useT'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CalendarDaysIcon,
  SparklesIcon,
  FlagIcon,
  PlusIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import DreamingExercise from '@/components/planning/DreamingExercise.vue'
import DraftPriorityForm from '@/components/planning/DraftPriorityForm.vue'
import DraftPriorityItem from '@/components/planning/DraftPriorityItem.vue'
import YearlyReviewSummary from '@/components/planning/YearlyReviewSummary.vue'
import RatingSlider from '@/components/exercises/RatingSlider.vue'
import WheelOfLifeExercise from '@/components/exercises/WheelOfLifeExercise.vue'
import {
  useYearlyPlanningDraft,
  type DraftPriority,
  type DraftDreaming,
} from '@/composables/useYearlyPlanningDraft'
import type { LifeArea } from '@/domain/lifeArea'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { isLegacyYearToken } from '@/utils/planCanonicalization'
import { getCurrentYear, getDefaultPeriodName, getYearFromDate } from '@/utils/periodUtils'

// ============================================================================
// Route & Router
// ============================================================================

const { t } = useT()

const route = useRoute()
const router = useRouter()
const yearlyPlanStore = useYearlyPlanStore()
const priorityStore = usePriorityStore()
const valuesDiscoveryStore = useValuesDiscoveryStore()
const wheelOfLifeStore = useWheelOfLifeStore()
const lifeAreaStore = useLifeAreaStore()

const routePlanId = computed(() => route.params.planId as string | undefined)
const routeQueryYear = computed(() => {
  const raw = Array.isArray(route.query.year) ? route.query.year[0] : route.query.year
  if (!raw) return undefined
  const parsed = parseInt(String(raw), 10)
  return Number.isFinite(parsed) ? parsed : undefined
})
const legacyRouteYear = computed(() => {
  const planId = routePlanId.value
  if (!isLegacyYearToken(planId)) return undefined
  return parseInt(planId, 10)
})
const routedEditPlanId = computed(() => {
  if (!routePlanId.value || routePlanId.value === 'new' || isLegacyYearToken(routePlanId.value)) {
    return undefined
  }
  return routePlanId.value
})
const resolvedEditPlan = computed(() => {
  return routedEditPlanId.value
    ? yearlyPlanStore.getYearlyPlanById(routedEditPlanId.value)
    : undefined
})

// ============================================================================
// Step Definitions
// ============================================================================

interface Step {
  id: string
  title: string
  subtitle: string
}

const steps = computed<Step[]>(() => [
  { id: 'framing', title: t('planning.yearly.steps.welcome.title'), subtitle: t('planning.yearly.steps.welcome.subtitle') },
  { id: 'period', title: t('planning.yearly.steps.period.title'), subtitle: t('planning.yearly.steps.period.subtitle') },
  { id: 'valuesCheckIn', title: t('planning.yearly.steps.values.title'), subtitle: t('planning.yearly.steps.values.subtitle') },
  { id: 'vision', title: t('planning.yearly.steps.vision.title'), subtitle: t('planning.yearly.steps.vision.subtitle') },
  { id: 'wheelOfLife', title: t('planning.yearly.steps.lifeWheel.title'), subtitle: t('planning.yearly.steps.lifeWheel.subtitle') },
  { id: 'dreaming', title: t('planning.yearly.steps.dreaming.title'), subtitle: t('planning.yearly.steps.dreaming.subtitle') },
  { id: 'baselines', title: t('planning.yearly.steps.baselines.title'), subtitle: t('planning.yearly.steps.baselines.subtitle') },
  { id: 'priorities', title: t('planning.yearly.steps.priorities.title'), subtitle: t('planning.yearly.steps.priorities.subtitle') },
  { id: 'review', title: t('planning.yearly.steps.review.title'), subtitle: t('planning.yearly.steps.review.subtitle') },
])

const themeExamples = computed(() => {
  const raw = t('planning.yearly.vision.yearTheme.examples')
  // Format: "Examples: Growth, Balance, Adventure, ..."
  const colonIndex = raw.indexOf(':')
  const csv = colonIndex >= 0 ? raw.slice(colonIndex + 1) : raw
  return csv.split(',').map((s) => s.trim()).filter(Boolean)
})

// ============================================================================
// Year Computation
// ============================================================================

const targetYear = computed(() => {
  if (resolvedEditPlan.value) {
    return resolvedEditPlan.value.year
  }
  return routeQueryYear.value ?? legacyRouteYear.value ?? getCurrentYear()
})

const draftStorageKey = computed(() =>
  routedEditPlanId.value ? `yearly-planning-draft-plan-${routedEditPlanId.value}` : undefined
)

// ============================================================================
// Draft State
// ============================================================================

const {
  draft,
  reloadDraft,
  clearDraft,
  hasDraft,
  addPriority,
  updatePriority,
  deletePriority,
  seedFromExisting,
} = useYearlyPlanningDraft(targetYear, draftStorageKey)

const defaultPeriodName = computed(() => {
  if (!draft.value.startDate || !draft.value.endDate) {
    return ''
  }
  return getDefaultPeriodName(draft.value.startDate, draft.value.endDate, 'yearly')
})

const periodValidationError = computed(() => {
  if (draft.value.activeStep !== 1) return ''
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

const headerLabel = computed(() => {
  if (draft.value.name.trim()) {
    return draft.value.name.trim()
  }
  if (defaultPeriodName.value) {
    return defaultPeriodName.value
  }
  return `${targetYear.value}`
})

const activeLifeAreas = computed(() => lifeAreaStore.activeLifeAreas)

const wheelOfLifeSnapshot = computed(() => {
  if (draft.value.wheelOfLifeSnapshotId) {
    return wheelOfLifeStore.getSnapshotById(draft.value.wheelOfLifeSnapshotId)
  }
  return wheelOfLifeStore.latestSnapshot
})

function getWheelRating(lifeArea: LifeArea): number | null {
  const snapshot = wheelOfLifeSnapshot.value
  if (!snapshot) return null
  const byId = snapshot.areas.find((area) => area.lifeAreaId === lifeArea.id)
  if (byId) return byId.rating
  const byName = snapshot.areas.find(
    (area) => area.name.toLowerCase() === lifeArea.name.toLowerCase()
  )
  return byName?.rating ?? null
}

// ============================================================================
// Loading State
// ============================================================================

const isLoading = ref(true)
const error = ref<string | null>(null)

// ============================================================================
// Saving State (Review Step)
// ============================================================================

const isSaving = ref(false)
const saveError = ref<string | null>(null)

const sortedDraftPriorities = computed(() =>
  [...draft.value.priorities].sort((a, b) => a.sortOrder - b.sortOrder)
)

const missingNarrativeLifeAreas = computed(() =>
  activeLifeAreas.value.filter(
    (area) => !draft.value.lifeAreaNarratives[area.id]?.trim()
  )
)

// ============================================================================
// Priority Form State (Step 4)
// ============================================================================

const showPriorityForm = ref(false)
const priorityToEdit = ref<DraftPriority | undefined>(undefined)

function openCreatePriorityForm() {
  priorityToEdit.value = undefined
  showPriorityForm.value = true
}

function openEditPriorityForm(id: string) {
  const priority = draft.value.priorities.find((p) => p.id === id)
  if (priority) {
    priorityToEdit.value = priority
    showPriorityForm.value = true
  }
}

function closePriorityForm() {
  showPriorityForm.value = false
  priorityToEdit.value = undefined
}

function handleSavePriority(data: Omit<DraftPriority, 'id' | 'sortOrder'>) {
  if (priorityToEdit.value) {
    updatePriority(priorityToEdit.value.id, data)
  } else {
    addPriority(data)
  }
  closePriorityForm()
}

function handleDeletePriority(id: string) {
  deletePriority(id)
}

function handleUpdatePriorityIcon(id: string, icon: string | undefined) {
  updatePriority(id, { icon })
}

function handleTogglePriorityStatus(id: string) {
  const priority = draft.value.priorities.find((p) => p.id === id)
  if (priority) {
    updatePriority(id, { isActive: !priority.isActive })
  }
}

// ============================================================================
// Validation
// ============================================================================

const prioritiesValidationError = computed(() => {
  if (draft.value.activeStep !== 7) return ''
  const emptyName = draft.value.priorities.find((p) => !p.name.trim())
  if (emptyName) {
    return t('planning.common.validation.nameRequired')
  }
  return ''
})

function validateCurrentStep(): boolean {
  if (draft.value.activeStep === 1) {
    return !periodValidationError.value
  }
  if (draft.value.activeStep === 7) {
    return !prioritiesValidationError.value
  }
  if (draft.value.activeStep === 8) {
    return canConfirm.value
  }
  return true
}

// ============================================================================
// Confirm & Persistence Logic (Review Step)
// ============================================================================

/**
 * Validate that the plan can be confirmed
 */
const canConfirm = computed(() => {
  // All priorities must have names
  if (draft.value.priorities.some((p) => !p.name.trim())) {
    return false
  }
  return true
})

const planningYearForSave = computed(() => {
  if (isEditMode.value) {
    return resolvedEditPlan.value?.year ?? targetYear.value
  }
  if (draft.value.startDate) {
    return getYearFromDate(draft.value.startDate)
  }
  return targetYear.value
})

const canonicalYearlyPlanForDraft = computed(() => {
  return yearlyPlanStore.getCanonicalYearlyPlanByYear(planningYearForSave.value)
})

function getLifeAreaNarrativesPayload(): Record<string, string> {
  const entries = Object.entries(draft.value.lifeAreaNarratives || {})
    .map(([id, narrative]) => [id, narrative.trim()] as const)
    .filter(([, narrative]) => narrative.length > 0)
  return Object.fromEntries(entries)
}

/**
 * Main confirmation handler - persists the draft to IndexedDB
 */
async function handleConfirm(): Promise<void> {
  if (!canConfirm.value) {
    saveError.value = t('planning.yearly.confirmStep.saveError')
    return
  }

  isSaving.value = true
  saveError.value = null

  try {
    const canonicalExistingPlanId = isEditMode.value
      ? resolvedEditPlan.value?.id
      : canonicalYearlyPlanForDraft.value?.id

    if (canonicalExistingPlanId) {
      await handleConfirmEditMode(canonicalExistingPlanId)
    } else {
      await handleConfirmCreateMode()
    }

    // Success! Clear draft and navigate
    clearDraft()
    router.push('/planning')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'An unexpected error occurred'
    console.error('Error saving yearly plan:', err)
  } finally {
    isSaving.value = false
  }
}

/**
 * Create mode: All items are new
 */
async function handleConfirmCreateMode(): Promise<void> {
  // 1. Create all Priorities
  for (const draftPriority of draft.value.priorities) {
    await priorityStore.createPriority({
      lifeAreaIds: draftPriority.lifeAreaIds.filter(Boolean),
      year: planningYearForSave.value,
      name: draftPriority.name.trim(),
      icon: draftPriority.icon,
      successSignals: draftPriority.successSignals.filter((s) => s.trim()),
      constraints: draftPriority.constraints?.filter((c) => c.trim()) || [],
      isActive: draftPriority.isActive,
      sortOrder: draftPriority.sortOrder,
    })
  }

  // 2. Create YearlyPlan with yearly framing and narratives
  await yearlyPlanStore.createYearlyPlan({
    startDate: draft.value.startDate,
    endDate: draft.value.endDate,
    name: draft.value.name.trim() || undefined,
    year: planningYearForSave.value,
    yearTheme: draft.value.yearTheme.trim() || undefined,
    yourStory: draft.value.yourStory.trim() || undefined,
    fantasticDay: draft.value.fantasticDay.trim() || undefined,
    valuesCheckIn: Object.keys(draft.value.valuesAlignment).length > 0
      ? {
          valuesDiscoveryId: draft.value.valuesDiscoveryId || undefined,
          alignment: draft.value.valuesAlignment,
          reflectionNote: draft.value.valuesReflectionNote.trim() || undefined,
        }
      : undefined,
    wheelOfLifeSnapshotId: draft.value.wheelOfLifeSnapshotId || undefined,
    dreaming: draft.value.dreaming,
    lifeAreaNarratives: getLifeAreaNarrativesPayload(),
  })
}

/**
 * Edit mode: Determine what's new, updated, or deleted
 */
async function handleConfirmEditMode(planId: string): Promise<void> {
  // Load existing data for comparison
  await Promise.all([
    priorityStore.loadPriorities(planningYearForSave.value),
    yearlyPlanStore.loadYearlyPlans(),
  ])

  const existingPriorities = priorityStore.getPrioritiesByYear(planningYearForSave.value)
  const existingYearlyPlan = yearlyPlanStore.getYearlyPlanById(planId)

  // Build sets for comparison
  const existingPriorityIds = new Set(existingPriorities.map((p) => p.id))
  const draftPriorityIds = new Set(draft.value.priorities.map((p) => p.id))

  // Categorize Priorities
  const prioritiesToCreate = draft.value.priorities.filter(
    (p) => !existingPriorityIds.has(p.id)
  )
  const prioritiesToUpdate = draft.value.priorities.filter((p) =>
    existingPriorityIds.has(p.id)
  )
  const prioritiesToDelete = existingPriorities.filter(
    (p) => !draftPriorityIds.has(p.id)
  )

  // 1. Delete removed Priorities
  for (const priority of prioritiesToDelete) {
    await priorityStore.deletePriority(priority.id)
  }

  // 2. Create new Priorities
  for (const draftPriority of prioritiesToCreate) {
    await priorityStore.createPriority({
      lifeAreaIds: draftPriority.lifeAreaIds.filter(Boolean),
      year: planningYearForSave.value,
      name: draftPriority.name.trim(),
      icon: draftPriority.icon,
      successSignals: draftPriority.successSignals.filter((s) => s.trim()),
      constraints: draftPriority.constraints?.filter((c) => c.trim()) || [],
      isActive: draftPriority.isActive,
      sortOrder: draftPriority.sortOrder,
    })
  }

  // 3. Update existing Priorities
  for (const draftPriority of prioritiesToUpdate) {
    await priorityStore.updatePriority(draftPriority.id, {
      lifeAreaIds: draftPriority.lifeAreaIds.filter(Boolean),
      name: draftPriority.name.trim(),
      icon: draftPriority.icon,
      successSignals: draftPriority.successSignals.filter((s) => s.trim()),
      constraints: draftPriority.constraints?.filter((c) => c.trim()) || [],
      isActive: draftPriority.isActive,
      sortOrder: draftPriority.sortOrder,
    })
  }

  // 4. Update or Create YearlyPlan
  const planPayload = {
    startDate: draft.value.startDate,
    endDate: draft.value.endDate,
    name: draft.value.name.trim() || undefined,
    year: planningYearForSave.value,
    yearTheme: draft.value.yearTheme.trim() || undefined,
    yourStory: draft.value.yourStory.trim() || undefined,
    fantasticDay: draft.value.fantasticDay.trim() || undefined,
    valuesCheckIn: Object.keys(draft.value.valuesAlignment).length > 0
      ? {
          valuesDiscoveryId: draft.value.valuesDiscoveryId || undefined,
          alignment: draft.value.valuesAlignment,
          reflectionNote: draft.value.valuesReflectionNote.trim() || undefined,
        }
      : undefined,
    wheelOfLifeSnapshotId: draft.value.wheelOfLifeSnapshotId || undefined,
    dreaming: draft.value.dreaming,
    lifeAreaNarratives: getLifeAreaNarrativesPayload(),
  }

  if (existingYearlyPlan) {
    await yearlyPlanStore.updateYearlyPlan(existingYearlyPlan.id, planPayload)
  } else {
    await yearlyPlanStore.createYearlyPlan({
      ...planPayload,
    })
  }
}

// ============================================================================
// Navigation
// ============================================================================

const canSkip = computed(() => {
  // Skippable steps: framing(0), values(2), vision(3), wheelOfLife(4), dreaming(5), baselines(6), priorities(7)
  const skippable = [0, 2, 3, 4, 5, 6, 7]
  return skippable.includes(draft.value.activeStep)
})

const nextButtonText = computed(() => {
  if (draft.value.activeStep === 8) {
    return isSaving.value ? t('common.saving') : t('planning.yearly.nextButton.savePlan')
  }
  const nextStep = steps.value[draft.value.activeStep + 1]
  return nextStep ? nextStep.title : t('common.buttons.next')
})

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
  // Only allow going back to previous steps
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
  // Validate current step before advancing
  if (!validateCurrentStep()) {
    return
  }

  if (draft.value.activeStep < steps.value.length - 1) {
    draft.value.activeStep++
  } else {
    // Final step - confirm and save
    await handleConfirm()
  }
}

function handleSkip() {
  handleNext()
}

function handleCancel() {
  // Note: We don't clear draft on cancel - user can resume later
  router.push('/planning')
}

// ============================================================================
// Wheel of Life Handling
// ============================================================================

function handleWheelOfLifeSaved(snapshotId: string) {
  draft.value.wheelOfLifeSnapshotId = snapshotId
  handleNext()
}

function handleDreamingCompleted(data: DraftDreaming) {
  draft.value.dreaming = data
  handleNext()
}

// ============================================================================
// Edit Mode
// ============================================================================

const isEditMode = computed(() => {
  return Boolean(routedEditPlanId.value)
})

// ============================================================================
// Data Loading
// ============================================================================

async function loadYearData() {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      yearlyPlanStore.loadYearlyPlans(),
      valuesDiscoveryStore.loadDiscoveries(),
      wheelOfLifeStore.loadSnapshots(),
      lifeAreaStore.loadLifeAreas(),
    ])

    if (legacyRouteYear.value) {
      const canonicalPlan = yearlyPlanStore.getCanonicalYearlyPlanByYear(legacyRouteYear.value)
      if (canonicalPlan) {
        await router.replace(`/planning/year/${canonicalPlan.id}`)
      } else {
        await router.replace({
          path: '/planning/year/new',
          query: { year: `${legacyRouteYear.value}` },
        })
      }
      return
    }

    if (routedEditPlanId.value && !resolvedEditPlan.value) {
      error.value = 'Yearly plan not found'
      return
    }

    await Promise.all([
      priorityStore.loadPriorities(targetYear.value),
      reloadDraft(),
    ])

    const existingPlan = resolvedEditPlan.value

    if (existingPlan && !hasDraft()) {
      draft.value.startDate = existingPlan.startDate
      draft.value.endDate = existingPlan.endDate
      draft.value.name = existingPlan.name || ''
      draft.value.yearTheme = existingPlan.yearTheme || ''
      draft.value.yourStory = existingPlan.yourStory || ''
      draft.value.fantasticDay = existingPlan.fantasticDay || ''
      draft.value.lifeAreaNarratives = { ...(existingPlan.lifeAreaNarratives || {}) }
      draft.value.valuesAlignment = existingPlan.valuesCheckIn?.alignment || {}
      draft.value.valuesReflectionNote = existingPlan.valuesCheckIn?.reflectionNote || ''
      draft.value.valuesDiscoveryId = existingPlan.valuesCheckIn?.valuesDiscoveryId || ''
      draft.value.wheelOfLifeSnapshotId = existingPlan.wheelOfLifeSnapshotId || ''
      // Handle both old array format and new object format from DB
      if (existingPlan.dreaming && !Array.isArray(existingPlan.dreaming)) {
        draft.value.dreaming = existingPlan.dreaming
      }
      const priorities = priorityStore.getPrioritiesByYear(targetYear.value)
      seedFromExisting(priorities)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load yearly planning data'
    console.error('Error loading yearly planning data:', err)
  } finally {
    isLoading.value = false
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  loadYearData()
})

// Watch for year changes (if navigating between different years)
watch(
  () => [route.params.planId, route.query.year],
  () => {
    loadYearData()
  }
)
</script>
