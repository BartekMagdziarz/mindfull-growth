<template>
  <div class="space-y-6 md:space-y-8">
    <!-- Loading State -->
    <AppCard v-if="isCalendarLoading" class="neo-raised">
      <div class="flex items-center justify-center py-8">
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
          <span>{{ t('planning.components.weekCalendarSection.loading') }}</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="calendarError" class="neo-raised">
      <div class="text-center py-6">
        <p class="text-error mb-4">{{ calendarError }}</p>
        <button
          type="button"
          class="neo-control neo-control--accent neo-focus"
          @click="loadData"
        >
          Try Again
        </button>
      </div>
    </AppCard>

    <!-- Period Cards Carousel -->
    <div v-show="!isCalendarLoading && !calendarError" class="flex items-center gap-3">
      <button
        type="button"
        class="neo-control neo-focus h-10 w-10 shrink-0 p-0"
        :disabled="!canPrev"
        aria-label="Previous week"
        @click="scrollPrev"
      >
        <ChevronLeftIcon class="w-5 h-5" />
      </button>
      <div class="embla__viewport" ref="emblaRef">
        <div class="embla__container">
          <div
            v-for="(period, index) in allSlides"
            :key="period.key"
            class="embla__slide"
          >
            <div class="flex flex-col items-center w-full h-full">
              <AddPeriodCard
                v-if="period.isAddCard"
                class="w-full flex-1"
                :label="t('planning.components.weekCalendarSection.addWeek')"
                @click="isDialogOpen = true"
              />
              <PeriodCard
                v-else
                class="w-full flex-1"
                type="weekly"
                :start-date="period.startDate"
                :end-date="period.endDate"
                :name="period.name"
                :has-plan="period.hasPlan"
                :has-reflection="period.hasReflection"
                :is-selected="period.key === selectedPeriodKey"
                :item-statuses="getItemStatusesForPeriod(period)"
                @select="handleSlideSelect(index)"
                @plan="handleCardPlan(period)"
                @reflect="handleCardReflect(period)"
              />
              <!-- Selection line indicator -->
              <div
                class="mt-2 h-0.5 rounded-full transition-all duration-350 ease-[cubic-bezier(0.4,0,0.2,1)]"
                :class="!period.isAddCard && period.key === selectedPeriodKey ? 'bg-primary/70 w-10 opacity-100' : 'w-0 opacity-0'"
              />
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        class="neo-control neo-focus h-10 w-10 shrink-0 p-0"
        :disabled="!canNext"
        aria-label="Next week"
        @click="scrollNext"
      >
        <ChevronRightIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Selected Week Dashboard -->
    <Transition name="fade" mode="out-in">
      <div
        v-if="!isCalendarLoading && !calendarError"
        :key="selectedPeriodKey ?? 'none'"
        class="mt-10 space-y-7"
      >
        <!-- Selected period title -->
        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-on-surface">
            {{ selectedPeriodRange }}
          </h3>
          <p v-if="selectedPeriodTitle" class="text-sm text-on-surface-variant">
            {{ selectedPeriodTitle }}
          </p>
        </div>

        <!-- Plan / Reflect panels -->
        <div class="grid items-start gap-5 lg:grid-cols-2">
          <!-- Plan panel -->
          <div v-if="hasSelectedPlan" class="neo-panel neo-panel--plan flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.components.weekCalendarSection.planSnapshot') }}
              </p>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="neo-icon-button neo-focus h-8 w-8 p-0"
                  aria-label="Edit plan"
                  @click="handleSelectedPlan"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="neo-icon-button neo-icon-button--danger neo-focus h-8 w-8 p-0"
                  aria-label="Delete plan"
                  @click="openDeletePlanDialog"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-if="planHighlights.length" class="space-y-2">
              <div v-for="item in planHighlights" :key="item.label" class="space-y-0.5">
                <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
                  {{ item.label }}
                </p>
                <p class="text-sm leading-relaxed text-on-surface">{{ item.value }}</p>
              </div>
            </div>
            <p v-else class="text-sm text-on-surface-variant">
              This plan exists, but no focus highlights were recorded yet.
            </p>
          </div>
          <button
            v-else
            type="button"
            class="neo-control neo-control--accent neo-focus self-start px-4 py-2.5"
            @click="handleSelectedPlan"
          >
            <ClipboardDocumentListIcon class="w-5 h-5" />
            <span class="text-sm font-semibold">Plan</span>
          </button>

          <!-- Reflect panel -->
          <div v-if="hasSelectedReflection && reflectionHighlights.length" class="neo-panel neo-panel--reflect flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.components.weekCalendarSection.reflection') }}
              </p>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="neo-icon-button neo-focus h-8 w-8 p-0"
                  aria-label="Edit reflection"
                  @click="handleSelectedReflect"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  class="neo-icon-button neo-icon-button--danger neo-focus h-8 w-8 p-0"
                  aria-label="Delete reflection"
                  @click="openDeleteReflectionDialog"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <div
                v-for="item in reflectionHighlights"
                :key="item.label"
                class="space-y-0.5"
              >
                <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">
                  {{ item.label }}
                </p>
                <p class="text-sm leading-relaxed text-on-surface">{{ item.value }}</p>
              </div>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="neo-control neo-control--accent neo-focus self-start px-4 py-2.5"
            :class="{ 'opacity-45': !reflectionEnabled }"
            :disabled="!reflectionEnabled"
            @click="handleSelectedReflect"
          >
            <LightBulbIcon class="w-5 h-5" />
            <span class="text-sm font-semibold">Reflect</span>
          </button>
        </div>

        <AppCard v-if="detailsError || isDetailsLoading" class="neo-raised">
          <div class="flex items-center justify-center py-6">
            <div v-if="isDetailsLoading" class="flex items-center gap-3 text-on-surface-variant">
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
              <span>{{ t('planning.components.weekCalendarSection.loadingCommitments') }}</span>
            </div>
            <p v-else class="text-error">{{ detailsError }}</p>
          </div>
        </AppCard>

        <!-- Commitments & Trackers header with inline status icons -->
        <div
          v-if="selectedWeeklyPlan"
          class="flex flex-wrap items-center gap-3"
        >
          <h3 class="text-lg font-semibold text-on-surface">{{ t('planning.components.weekCalendarSection.commitmentsAndTrackers') }}</h3>
          <!-- Status circles for each commitment -->
          <div v-if="sortedCommitments.length" class="flex items-center gap-1">
            <span
              v-for="commitment in sortedCommitments"
              :key="commitment.id"
              class="commitment-status-dot"
              :title="commitment.name + ' — ' + commitment.status"
            >
              <!-- Planned: empty circle -->
              <svg v-if="commitment.status === 'planned'" class="h-4 w-4 text-primary" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <!-- Done: check in circle -->
              <svg v-else-if="commitment.status === 'done'" class="h-4 w-4 text-success" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M5.5 8l2 2 3-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <!-- Skipped: X in circle -->
              <svg v-else class="h-4 w-4 text-on-surface-variant" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
          </div>
        </div>

        <template v-if="selectedWeeklyPlan && !isDetailsLoading && !detailsError">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CommitmentComposerCard
              v-if="isCreatingCommitment"
              :available-projects="activeProjects"
              :available-life-areas="availableLifeAreas"
              :available-priorities="availablePriorities"
              :is-saving="isCreatingCommitmentSaving"
              @create="handleCommitmentCreate"
              @cancel="closeCommitmentComposer"
            />
            <template v-for="item in unifiedGridItems" :key="item.id">
              <CommitmentCard
                v-if="item.kind === 'commitment' && item.commitment"
                :commitment="item.commitment"
                :tracker="item.tracker"
                :period-type="selectedPeriod ? 'weekly' : undefined"
                :start-date="selectedPeriod?.startDate"
                :end-date="selectedPeriod?.endDate"
                :available-projects="availableProjectsForCards"
                :available-life-areas="availableLifeAreasForCards"
                :available-priorities="availablePrioritiesForCards"
                :is-saving="isCommitmentSaving(item.commitment?.id ?? '')"
                @delete="openDeleteCommitmentDialog"
                @status-change="handleStatusChange"
                @update-name="handleCommitmentNameUpdate"
                @update-life-areas="handleCommitmentLifeAreasUpdate"
                @update-priorities="handleCommitmentPrioritiesUpdate"
                @update-project="handleCommitmentProjectUpdate"
                @add-tracker="handleAddTrackerToCommitment"
                @remove-tracker="handleRemoveTrackerFromCommitment"
              />
              <TrackerCard
                v-else-if="item.kind === 'tracker' && item.tracker"
                :tracker="item.tracker"
                :period-type="'weekly'"
                :start-date="selectedPeriod!.startDate"
                :end-date="selectedPeriod!.endDate"
                :parent-project="item.parentProject"
                :parent-habit="item.parentHabit"
                :available-life-areas="availableLifeAreasForCards"
                :available-priorities="availablePrioritiesForCards"
              />
            </template>
            <AddPeriodCard
              v-if="!isCreatingCommitment"
              :label="t('planning.components.weekCalendarSection.addCommitment')"
              @click="openCreateCommitmentComposer"
            />
          </div>
        </template>

        <AppCard v-else-if="!selectedWeeklyPlan && !isDetailsLoading" class="neo-raised">
          <div class="py-6 text-center text-on-surface-variant">
            {{ t('planning.components.weekCalendarSection.startPlanHint') }}
          </div>
        </AppCard>

        <!-- Delete Commitment Confirmation Dialog -->
        <AppDialog
          v-model="showDeleteCommitmentDialog"
          :title="t('planning.components.weekCalendarSection.deleteCommitment')"
          :message="deleteCommitmentMessage"
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeleteCommitment"
          @cancel="showDeleteCommitmentDialog = false"
        />

        <!-- Delete Plan Confirmation Dialog -->
        <AppDialog
          v-model="showDeletePlanDialog"
          :title="t('planning.components.weekCalendarSection.deleteWeeklyPlan')"
          message="This will permanently delete this plan and its reflection. Commitments will be kept but unlinked. This cannot be undone."
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeletePlan"
          @cancel="showDeletePlanDialog = false"
        />

        <!-- Delete Reflection Confirmation Dialog -->
        <AppDialog
          v-model="showDeleteReflectionDialog"
          :title="t('planning.components.weekCalendarSection.deleteReflection')"
          message="This will permanently delete this week's reflection. This cannot be undone."
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeleteReflection"
          @cancel="showDeleteReflectionDialog = false"
        />

        <AppSnackbar ref="snackbarRef" />
      </div>
    </Transition>

    <PeriodCreationDialog
      v-model="isDialogOpen"
      type="weekly"
      :existing-periods="existingPeriods"
      @create="handleCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  LightBulbIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AddPeriodCard from './AddPeriodCard.vue'
import PeriodCard from './PeriodCard.vue'
import PeriodCreationDialog from './PeriodCreationDialog.vue'
import CommitmentCard from './CommitmentCard.vue'
import CommitmentComposerCard from './CommitmentComposerCard.vue'
import TrackerCard from './TrackerCard.vue'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import { usePeriodCarousel } from '@/composables/usePeriodCarousel'
import {
  formatPeriodDateRange,
  getCurrentYear,
  getDefaultPeriodName,
  getYearFromDate,
  isCurrentPeriod,
  isPastPeriod,
  suggestNextPeriodDates,
} from '@/utils/periodUtils'
import type { WeeklyPlan, Commitment, CommitmentStatus, Tracker } from '@/domain/planning'
import type { Habit } from '@/domain/habit'
import {
  resolveWeeklyTrackerProjects,
} from '@/services/projectTrackerScope.service'
import {
  resolvePeriodTrackerSelection,
} from '@/services/periodTrackerSelection.service'

interface PeriodItem {
  key: string
  id?: string
  startDate: string
  endDate: string
  name?: string
  hasPlan: boolean
  hasReflection: boolean
  isAddCard?: boolean
}

import { useT } from '@/composables/useT'

const { t } = useT()
const router = useRouter()
const weeklyPlanStore = useWeeklyPlanStore()
const weeklyReflectionStore = useWeeklyReflectionStore()
const commitmentStore = useCommitmentStore()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()
const habitStore = useHabitStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isDialogOpen = ref(false)
const selectedPeriodKey = ref<string | null>(null)

const isCalendarLoading = computed(
  () => weeklyPlanStore.isLoading || weeklyReflectionStore.isLoading
)
const calendarError = computed(
  () => weeklyPlanStore.error || weeklyReflectionStore.error
)
const isDetailsLoading = computed(
  () =>
    commitmentStore.isLoading ||
    projectStore.isLoading ||
    trackerStore.isLoading ||
    lifeAreaStore.isLoading ||
    priorityStore.isLoading
)
const detailsError = computed(
  () =>
    commitmentStore.error ||
    projectStore.error ||
    trackerStore.error ||
    lifeAreaStore.error ||
    priorityStore.error
)

const existingPeriods = computed(() =>
  weeklyPlanStore.weeklyPlans.map((plan) => ({
    startDate: plan.startDate,
    endDate: plan.endDate,
  }))
)

const periods = computed<PeriodItem[]>(() => {
  const items: PeriodItem[] = weeklyPlanStore.weeklyPlans.map((plan: WeeklyPlan) => {
    const reflection = weeklyReflectionStore.getReflectionByPlanId(plan.id)
    const hasPlanContent = Boolean(
      plan.focusSentence?.trim() ||
      plan.adaptiveIntention?.trim() ||
      plan.constraintsNote?.trim() ||
      plan.capacityNote?.trim() ||
      commitmentStore.getCommitmentsByWeeklyPlanId(plan.id).length > 0
    )
    return {
      key: plan.id,
      id: plan.id,
      startDate: plan.startDate,
      endDate: plan.endDate,
      name: plan.name,
      hasPlan: hasPlanContent,
      hasReflection: Boolean(reflection?.completedAt),
    }
  })

  const hasCurrent = items.some((item) => isCurrentPeriod(item.startDate, item.endDate))

  if (!hasCurrent) {
    const suggestion = suggestNextPeriodDates('weekly')
    items.push({
      key: `current-${suggestion.startDate}`,
      startDate: suggestion.startDate,
      endDate: suggestion.endDate,
      name: undefined,
      hasPlan: false,
      hasReflection: false,
    })
  }

  return items.sort((a, b) => a.startDate.localeCompare(b.startDate))
})

const selectedPeriod = computed(() =>
  periods.value.find((period) => period.key === selectedPeriodKey.value)
)

const selectedWeeklyPlan = computed(() => {
  const planId = selectedPeriod.value?.id
  return planId ? weeklyPlanStore.getWeeklyPlanById(planId) : undefined
})

const selectedPeriodYear = computed(() => {
  const startDate = selectedPeriod.value?.startDate
  return startDate ? getYearFromDate(startDate) : getCurrentYear()
})

const selectedWeeklyPlanId = computed(() => selectedWeeklyPlan.value?.id)
const selectedWeeklyReflection = computed(() => {
  const planId = selectedWeeklyPlanId.value
  return planId ? weeklyReflectionStore.getReflectionByPlanId(planId) : undefined
})

const selectedPeriodRange = computed(() => {
  if (!selectedPeriod.value) return ''
  return formatPeriodDateRange(selectedPeriod.value.startDate, selectedPeriod.value.endDate)
})

const selectedPeriodTitle = computed(() => {
  if (!selectedPeriod.value?.name) return ''
  const trimmed = selectedPeriod.value.name.trim()
  if (!trimmed) return ''
  const defaultLabel = getDefaultPeriodName(
    selectedPeriod.value.startDate,
    selectedPeriod.value.endDate,
    'weekly'
  )
  return trimmed === defaultLabel ? '' : trimmed
})

const hasSelectedPlan = computed(() => Boolean(selectedWeeklyPlan.value))
const hasSelectedReflection = computed(
  () => Boolean(selectedWeeklyReflection.value?.completedAt)
)
const isSelectedCurrent = computed(() => {
  if (!selectedPeriod.value) return false
  return isCurrentPeriod(selectedPeriod.value.startDate, selectedPeriod.value.endDate)
})
const isSelectedPast = computed(() => {
  if (!selectedPeriod.value) return false
  return isPastPeriod(selectedPeriod.value.endDate)
})

const reflectionEnabled = computed(
  () => hasSelectedPlan.value && (isSelectedPast.value || isSelectedCurrent.value)
)

const selectedIndex = computed(() =>
  periods.value.findIndex((period) => period.key === selectedPeriodKey.value)
)

const allSlides = computed<PeriodItem[]>(() => {
  const slides: PeriodItem[] = [...periods.value]
  slides.push({
    key: 'add-card',
    startDate: '',
    endDate: '',
    hasPlan: false,
    hasReflection: false,
    isAddCard: true,
  })
  return slides
})

const slideCount = computed(() => allSlides.value.length)
const isCarouselActive = computed(
  () => !isCalendarLoading.value && !calendarError.value
)

const { emblaRef, canPrev, canNext, scrollPrev, scrollNext, scrollTo } = usePeriodCarousel({
  selectedIndex,
  slideCount,
  isActive: isCarouselActive,
  onSelect(index) {
    const period = periods.value[index]
    if (period) {
      selectedPeriodKey.value = period.key
    }
  },
})

function handleSlideSelect(index: number) {
  const period = periods.value[index]
  if (period) {
    selectedPeriodKey.value = period.key
    scrollTo(index)
  }
}

function setDefaultSelection() {
  const currentPeriod = periods.value.find((period) =>
    isCurrentPeriod(period.startDate, period.endDate)
  )
  const fallback = periods.value[periods.value.length - 1]
  selectedPeriodKey.value = currentPeriod?.key ?? fallback?.key ?? null
}

watch(
  periods,
  () => {
    const hasSelection =
      selectedPeriodKey.value &&
      periods.value.some((period) => period.key === selectedPeriodKey.value)

    if (!hasSelection) {
      setDefaultSelection()
    }
  },
  { immediate: true }
)

// Re-select current period after data finishes loading
watch(isCalendarLoading, (loading, wasLoading) => {
  if (!loading && wasLoading) {
    setDefaultSelection()
  }
})

watch(
  selectedPeriodYear,
  async (year) => {
    await Promise.all([
      lifeAreaStore.loadLifeAreas(),
      priorityStore.loadPriorities(year),
    ])
  },
  { immediate: true }
)

watch(
  () => weeklyPlanStore.weeklyPlans.length,
  async () => {
    await commitmentStore.loadCommitments()
  },
  { immediate: true }
)


// ============================================================================
// Current Week Commitments
// ============================================================================

const sortedCommitments = computed(() => {
  if (!selectedWeeklyPlan.value) return []
  return commitmentStore.getCommitmentsByWeeklyPlanId(selectedWeeklyPlan.value.id)
})

// ============================================================================
// Unified Grid (Commitments + Project/Habit Trackers)
// ============================================================================

interface UnifiedGridItem {
  kind: 'commitment' | 'tracker'
  id: string
  commitment?: Commitment
  tracker?: Tracker
  parentProject?: import('@/domain/planning').Project
  parentHabit?: Habit
}

// --- Tracker selection resolution (project + habit trackers) ---

const cadenceFilter = computed(() =>
  (tracker: Tracker) =>
    tracker.cadence === 'weekly'
)

const baseProjectTrackers = computed(() =>
  trackerStore.trackers.filter(
    (tracker) =>
      tracker.parentType === 'project' &&
      tracker.parentId &&
      tracker.isActive &&
      cadenceFilter.value(tracker)
  )
)

const baseHabitTrackers = computed(() =>
  trackerStore.trackers.filter(
    (tracker) =>
      tracker.parentType === 'habit' &&
      tracker.parentId &&
      tracker.isActive &&
      cadenceFilter.value(tracker)
  )
)

const allEligibleTrackerIds = computed(() => [
  ...baseProjectTrackers.value.map((t) => t.id),
  ...baseHabitTrackers.value.map((t) => t.id),
])

const resolvedSelection = computed(() =>
  resolvePeriodTrackerSelection({
    selectedTrackerIds: selectedWeeklyPlan.value?.selectedTrackerIds,
    eligibleTrackerIds: allEligibleTrackerIds.value,
  })
)

const hasExplicitTrackerSelection = computed(() => resolvedSelection.value.hasExplicitSelection)
const selectedTrackerIdSet = computed(
  () => new Set(resolvedSelection.value.effectiveSelectedTrackerIds)
)

const filteredProjectTrackers = computed(() => {
  const base = baseProjectTrackers.value
  if (!hasExplicitTrackerSelection.value) return base
  return base.filter((tracker) => selectedTrackerIdSet.value.has(tracker.id))
})

const filteredHabitTrackers = computed(() => {
  const base = baseHabitTrackers.value
  if (!hasExplicitTrackerSelection.value) return base
  return base.filter((tracker) => selectedTrackerIdSet.value.has(tracker.id))
})

// Selection repair watcher
const lastRepairSignature = ref('')
watch(
  resolvedSelection,
  (selection) => {
    if (!selectedWeeklyPlan.value?.id || !selection.repairedSelectedTrackerIds || !selection.repairMode) return
    const signature = `${selectedWeeklyPlan.value.id}:${selection.repairMode}:${selection.repairedSelectedTrackerIds.join('|')}`
    if (signature === lastRepairSignature.value) return
    lastRepairSignature.value = signature
    handleTrackerSelectionRepaired({
      trackerIds: selection.repairedSelectedTrackerIds,
      mode: selection.repairMode,
    })
  },
  { immediate: true }
)

// --- Scoped projects (for tracker cards) ---

const scopedProjects = computed(() => {
  if (!selectedWeeklyPlan.value?.id) return []

  if (hasExplicitTrackerSelection.value) {
    const projectIdSet = new Set<string>()
    for (const tracker of filteredProjectTrackers.value) {
      if (tracker.parentId) {
        projectIdSet.add(tracker.parentId)
      }
    }
    return projectStore.projects.filter((project) => projectIdSet.has(project.id))
  }

  return resolveWeeklyTrackerProjects({
    projects: projectStore.projects,
    commitments: commitmentStore.commitments,
    weeklyPlanId: selectedWeeklyPlan.value.id,
    startDate: selectedWeeklyPlan.value.startDate,
    endDate: selectedWeeklyPlan.value.endDate,
  })
})

// --- Build unified grid items ---

const unifiedGridItems = computed<UnifiedGridItem[]>(() => {
  const items: UnifiedGridItem[] = []

  // 1. Commitments (with optional attached tracker)
  for (const commitment of sortedCommitments.value) {
    const attachedTrackers = trackerStore.getTrackersByCommitment(commitment.id)
    items.push({
      kind: 'commitment',
      id: commitment.id,
      commitment,
      tracker: attachedTrackers[0], // Max one tracker per commitment
    })
  }

  // 2. Project trackers
  const scopedProjectIdSet = new Set(scopedProjects.value.map((p) => p.id))
  const projectById = new Map(projectStore.projects.map((p) => [p.id, p]))

  for (const tracker of filteredProjectTrackers.value) {
    if (!tracker.parentId || !scopedProjectIdSet.has(tracker.parentId)) continue
    items.push({
      kind: 'tracker',
      id: tracker.id,
      tracker,
      parentProject: projectById.get(tracker.parentId),
    })
  }

  // 3. Habit trackers
  const habitById = new Map(habitStore.habits.map((h) => [h.id, h]))

  for (const tracker of filteredHabitTrackers.value) {
    if (!tracker.parentId) continue
    const habit = habitById.get(tracker.parentId)
    if (!habit) continue
    items.push({
      kind: 'tracker',
      id: tracker.id,
      tracker,
      parentHabit: habit,
    })
  }

  return items
})

// --- Commitment tracker handlers ---

async function handleAddTrackerToCommitment(commitmentId: string, trackerType: string) {
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const base = {
    parentType: 'commitment' as const,
    parentId: commitmentId,
    name: commitment.name,
    lifeAreaIds: [] as string[],
    priorityIds: [] as string[],
    sortOrder: 0,
    isActive: true,
    cadence: 'weekly' as const,
  }

  try {
    if (trackerType === 'value') {
      await trackerStore.createTracker({ ...base, type: 'value' })
    } else if (trackerType === 'rating') {
      await trackerStore.createTracker({ ...base, type: 'rating', ratingScaleMin: 1, ratingScaleMax: 10 })
    } else {
      await trackerStore.createTracker({ ...base, type: 'count' })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add tracker.'
    showSnackbar(message)
  }
}

async function handleRemoveTrackerFromCommitment(commitmentId: string) {
  try {
    await trackerStore.deleteTrackersByParent('commitment', commitmentId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove tracker.'
    showSnackbar(message)
  }
}

const planHighlights = computed(() => {
  if (!selectedWeeklyPlan.value) return []
  const constraintsSummary = selectedWeeklyPlan.value.constraintsNote || selectedWeeklyPlan.value.capacityNote
  return [
    { label: t('planning.components.weekCalendarSection.planHighlights.focusSentence'), value: selectedWeeklyPlan.value.focusSentence },
    { label: t('planning.components.weekCalendarSection.planHighlights.adaptiveIntention'), value: selectedWeeklyPlan.value.adaptiveIntention },
    { label: t('planning.components.weekCalendarSection.planHighlights.constraintsNote'), value: constraintsSummary },
  ].filter((item) => item.value && item.value.trim().length > 0) as {
    label: string
    value: string
  }[]
})

const reflectionHighlights = computed(() => {
  if (!selectedWeeklyReflection.value) return []
  const batterySnapshot = selectedWeeklyReflection.value.batterySnapshot
  const batterySummary = batterySnapshot
    ? ([
        ['B', batterySnapshot.body],
        ['M', batterySnapshot.mind],
        ['E', batterySnapshot.emotion],
        ['S', batterySnapshot.social],
      ] as const)
        .map((entry) => `${entry[0]} D${entry[1].demand}/S${entry[1].state}`)
        .join(' · ')
    : undefined
  return [
    { label: t('planning.components.weekCalendarSection.reflectionHighlights.whatHelped'), value: selectedWeeklyReflection.value.whatHelped },
    { label: t('planning.components.weekCalendarSection.reflectionHighlights.whatGotInTheWay'), value: selectedWeeklyReflection.value.whatGotInTheWay },
    { label: t('planning.components.weekCalendarSection.reflectionHighlights.whatILearned'), value: selectedWeeklyReflection.value.whatILearned },
    { label: t('planning.components.weekCalendarSection.reflectionHighlights.nextWeekSeed'), value: selectedWeeklyReflection.value.nextWeekSeed },
    { label: t('planning.components.weekCalendarSection.reflectionHighlights.batterySnapshot'), value: batterySummary },
  ].filter((item) => item.value && item.value.trim().length > 0) as {
    label: string
    value: string
  }[]
})

const savingCommitmentIds = ref(new Set<string>())

function isCommitmentSaving(id: string) {
  return savingCommitmentIds.value.has(id)
}

function showSnackbar(message: string) {
  snackbarRef.value?.show(message)
}

function areSameIds(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((id, index) => id === right[index])
}

async function handleTrackerSelectionRepaired(payload: {
  trackerIds: string[]
  mode: 'pruned' | 'fallback'
}) {
  if (!selectedWeeklyPlan.value) return
  if (areSameIds(selectedWeeklyPlan.value.selectedTrackerIds ?? [], payload.trackerIds)) return

  try {
    await weeklyPlanStore.updateWeeklyPlan(selectedWeeklyPlan.value.id, {
      selectedTrackerIds: payload.trackerIds,
    })
    showSnackbar(
      payload.mode === 'fallback'
        ? 'Weekly tracker selection was repaired and reset to available trackers.'
        : 'Weekly tracker selection was repaired to remove missing trackers.'
    )
  } catch (error) {
    console.error('Failed to persist repaired weekly tracker selection:', error)
    showSnackbar('Failed to persist repaired weekly tracker selection.')
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getItemStatusesForPeriod(period: PeriodItem) {
  if (!period.id) return []
  const commitments = commitmentStore.getCommitmentsByWeeklyPlanId(period.id)
  return commitments.map((c) => ({ label: c.name, status: c.status }))
}

// ============================================================================
// Commitment Composer State
// ============================================================================

const isCreatingCommitment = ref(false)
const isCreatingCommitmentSaving = ref(false)

function openCreateCommitmentComposer() {
  if (!selectedWeeklyPlan.value) {
    showSnackbar('Please select a week to add commitments.')
    return
  }
  isCreatingCommitment.value = true
}

function closeCommitmentComposer() {
  isCreatingCommitment.value = false
}

async function handleCommitmentCreate(payload: {
  name: string
  projectId?: string
  lifeAreaIds: string[]
  priorityIds: string[]
}) {
  if (!selectedWeeklyPlan.value || isCreatingCommitmentSaving.value) return

  isCreatingCommitmentSaving.value = true

  try {
    await commitmentStore.createCommitment({
      weeklyPlanId: selectedWeeklyPlan.value.id,
      startDate: selectedWeeklyPlan.value.startDate,
      endDate: selectedWeeklyPlan.value.endDate,
      periodType: 'weekly',
      name: payload.name,
      projectId: payload.projectId,
      lifeAreaIds: payload.lifeAreaIds,
      priorityIds: payload.priorityIds,
      status: 'planned',
    })
    closeCommitmentComposer()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to add commitment.'
    showSnackbar(message)
  } finally {
    isCreatingCommitmentSaving.value = false
  }
}

const activeProjects = computed(() =>
  projectStore.projects.filter((p) => p.status === 'active' || p.status === 'planned')
)

const availableLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const availablePriorities = computed(() =>
  priorityStore.getPrioritiesByYear(selectedPeriodYear.value)
)

const availableProjectsForCards = computed(() => projectStore.projects)

const availableLifeAreasForCards = computed(() => lifeAreaStore.lifeAreas)
const availablePrioritiesForCards = computed(() =>
  priorityStore.getPrioritiesByYear(selectedPeriodYear.value)
)

// ============================================================================
// Commitment Delete State
// ============================================================================

const showDeleteCommitmentDialog = ref(false)
const commitmentToDelete = ref<Commitment | undefined>(undefined)

const deleteCommitmentMessage = computed(() => {
  if (!commitmentToDelete.value) return ''
  return `Are you sure you want to delete "${commitmentToDelete.value.name}"? This cannot be undone.`
})

function openDeleteCommitmentDialog(commitmentId: string) {
  commitmentToDelete.value = commitmentStore.getCommitmentById(commitmentId)
  showDeleteCommitmentDialog.value = true
}

async function handleConfirmDeleteCommitment() {
  if (!commitmentToDelete.value) return

  try {
    await commitmentStore.deleteCommitment(commitmentToDelete.value.id)
    showDeleteCommitmentDialog.value = false
    commitmentToDelete.value = undefined
  } catch {
    // Error is handled by store
  }
}

// ============================================================================
// Plan & Reflection Delete State
// ============================================================================

const showDeletePlanDialog = ref(false)
const showDeleteReflectionDialog = ref(false)

function openDeletePlanDialog() {
  showDeletePlanDialog.value = true
}

function openDeleteReflectionDialog() {
  showDeleteReflectionDialog.value = true
}

async function handleConfirmDeletePlan() {
  const plan = selectedWeeklyPlan.value
  if (!plan) return

  try {
    const reflection = weeklyReflectionStore.getReflectionByPlanId(plan.id)
    if (reflection) {
      await weeklyReflectionStore.deleteReflection(reflection.id)
    }
    await weeklyPlanStore.deleteWeeklyPlan(plan.id)
    showDeletePlanDialog.value = false
  } catch {
    showSnackbar('Failed to delete weekly plan.')
  }
}

async function handleConfirmDeleteReflection() {
  const reflection = selectedWeeklyReflection.value
  if (!reflection) return

  try {
    await weeklyReflectionStore.deleteReflection(reflection.id)
    showDeleteReflectionDialog.value = false
  } catch {
    showSnackbar('Failed to delete reflection.')
  }
}

// ============================================================================
// Status Change Handler
// ============================================================================

async function handleStatusChange(commitmentId: string, status: CommitmentStatus) {
  if (isCommitmentSaving(commitmentId)) return
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const previous = { ...commitment }
  Object.assign(commitment, { status })
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitmentStatus(commitmentId, status)
  } catch (error) {
    Object.assign(commitment, previous)
    const message = error instanceof Error ? error.message : 'Failed to update commitment status.'
    showSnackbar(message)
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentNameUpdate(commitmentId: string, name: string) {
  if (isCommitmentSaving(commitmentId)) return
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const previous = { ...commitment }
  Object.assign(commitment, { name })
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { name })
  } catch (error) {
    Object.assign(commitment, previous)
    const message = error instanceof Error ? error.message : 'Failed to update commitment.'
    showSnackbar(message)
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentLifeAreasUpdate(
  commitmentId: string,
  lifeAreaIds: string[]
) {
  if (isCommitmentSaving(commitmentId)) return
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const previous = { ...commitment }
  commitment.lifeAreaIds = lifeAreaIds
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { lifeAreaIds })
  } catch (error) {
    Object.assign(commitment, previous)
    const message = error instanceof Error ? error.message : 'Failed to update commitment.'
    showSnackbar(message)
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentPrioritiesUpdate(
  commitmentId: string,
  priorityIds: string[]
) {
  if (isCommitmentSaving(commitmentId)) return
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const previous = { ...commitment }
  commitment.priorityIds = priorityIds
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { priorityIds })
  } catch (error) {
    Object.assign(commitment, previous)
    const message = error instanceof Error ? error.message : 'Failed to update commitment.'
    showSnackbar(message)
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentProjectUpdate(
  commitmentId: string,
  projectId: string | undefined
) {
  if (isCommitmentSaving(commitmentId)) return
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const previous = { ...commitment }
  commitment.projectId = projectId
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { projectId })
  } catch (error) {
    Object.assign(commitment, previous)
    const message = error instanceof Error ? error.message : 'Failed to update commitment.'
    showSnackbar(message)
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

function handleSelectedPlan() {
  if (!selectedPeriod.value) return
  handlePlan(selectedPeriod.value)
}

function handleSelectedReflect() {
  if (!selectedPeriod.value || !reflectionEnabled.value) return
  handleReflect(selectedPeriod.value)
}

function handleCardPlan(period: PeriodItem) {
  handlePlan(period)
}

function handleCardReflect(period: PeriodItem) {
  handleReflect(period)
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  await Promise.all([
    weeklyPlanStore.loadWeeklyPlans(),
    weeklyReflectionStore.loadWeeklyReflections(),
    projectStore.loadProjects(),
    trackerStore.loadTrackers(),
    habitStore.loadHabits(),
    lifeAreaStore.loadLifeAreas(),
    priorityStore.loadPriorities(getCurrentYear()),
  ])
}

async function handleCreate(payload: { startDate: string; endDate: string; name?: string }) {
  const created = await weeklyPlanStore.createWeeklyPlan({
    startDate: payload.startDate,
    endDate: payload.endDate,
    name: payload.name,
    constraintsNote: undefined,
    capacityNote: undefined,
    focusSentence: undefined,
    adaptiveIntention: undefined,
  })

  isDialogOpen.value = false
  router.push(`/planning/week/${created.id}`)
}

async function handlePlan(period: PeriodItem) {
  if (period.id) {
    router.push(`/planning/week/${period.id}`)
    return
  }

  const created = await weeklyPlanStore.createWeeklyPlan({
    startDate: period.startDate,
    endDate: period.endDate,
    name: period.name,
    constraintsNote: undefined,
    capacityNote: undefined,
    focusSentence: undefined,
    adaptiveIntention: undefined,
  })

  router.push(`/planning/week/${created.id}`)
}

async function handleReflect(period: PeriodItem) {
  if (period.id) {
    router.push(`/planning/week/${period.id}/reflect`)
    return
  }

  const created = await weeklyPlanStore.createWeeklyPlan({
    startDate: period.startDate,
    endDate: period.endDate,
    name: period.name,
    constraintsNote: undefined,
    capacityNote: undefined,
    focusSentence: undefined,
    adaptiveIntention: undefined,
  })

  router.push(`/planning/week/${created.id}/reflect`)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.embla__viewport {
  overflow: hidden;
  flex: 1;
  padding: 12px 8px 8px;
  margin: -12px -8px -8px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.embla__container {
  display: flex;
  gap: 1rem;
  touch-action: pan-y pinch-zoom;
  align-items: stretch;
}
.embla__slide {
  flex: 0 0 260px;
}
</style>
