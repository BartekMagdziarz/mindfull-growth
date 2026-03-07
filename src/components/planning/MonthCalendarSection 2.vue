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
          <span>{{ t('planning.components.monthCalendarSection.loading') }}</span>
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

    <!-- Period Cards -->
    <div v-show="!isCalendarLoading && !calendarError" class="space-y-3">
      <p v-if="periods.length === 0" class="text-sm text-on-surface-variant">
        No monthly periods yet for {{ displayYear }}.
      </p>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="neo-control neo-focus h-10 w-10 shrink-0 p-0"
          :disabled="!canPrev"
          aria-label="Previous month"
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
                  :label="t('planning.components.monthCalendarSection.addMonth')"
                  @click="isDialogOpen = true"
                />
                <PeriodCard
                  v-else
                  class="w-full flex-1"
                  type="monthly"
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
          aria-label="Next month"
          @click="scrollNext"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Selected Month Dashboard -->
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
          <div v-if="hasSelectedPlan && planHighlights.length" class="neo-panel neo-panel--plan flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.components.monthCalendarSection.planSnapshot') }}
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
            <div class="space-y-2">
              <div v-for="item in planHighlights" :key="item.label" class="space-y-0.5">
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
            @click="handleSelectedPlan"
          >
            <ClipboardDocumentListIcon class="w-5 h-5" />
            <span class="text-sm font-semibold">Plan</span>
          </button>

          <!-- Reflect panel -->
          <div v-if="hasSelectedReflection && reflectionHighlights.length" class="neo-panel neo-panel--reflect flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.components.monthCalendarSection.reflection') }}
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
              <span>{{ t('planning.components.monthCalendarSection.loadingProjects') }}</span>
            </div>
            <p v-else class="text-error">{{ detailsError }}</p>
          </div>
        </AppCard>

        <div
          v-if="selectedMonthlyPlan"
          class="flex flex-wrap items-center gap-3"
        >
          <h3 class="text-lg font-semibold text-on-surface">{{ t('planning.components.monthCalendarSection.projects') }}</h3>
          <div v-if="sortedProjects.length" class="flex items-center gap-1">
            <span
              v-for="project in sortedProjects"
              :key="project.id"
              :title="project.name + ' — ' + project.status"
            >
              <!-- Planned: empty circle -->
              <svg v-if="project.status === 'planned'" class="h-4 w-4 text-primary" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <!-- Active: dot in circle -->
              <svg v-else-if="project.status === 'active'" class="h-4 w-4 text-primary" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <circle cx="8" cy="8" r="2.5" fill="currentColor" />
              </svg>
              <!-- Completed: check in circle -->
              <svg v-else-if="project.status === 'completed'" class="h-4 w-4 text-success" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M5.5 8l2 2 3-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <!-- Paused: pause bars in circle -->
              <svg v-else-if="project.status === 'paused'" class="h-4 w-4 text-warning" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <rect x="5.5" y="5.5" width="1.5" height="5" rx="0.5" fill="currentColor" />
                <rect x="9" y="5.5" width="1.5" height="5" rx="0.5" fill="currentColor" />
              </svg>
              <!-- Abandoned: dash in circle -->
              <svg v-else class="h-4 w-4 text-on-surface-variant" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M5 8h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </span>
          </div>
        </div>

        <template v-if="selectedMonthlyPlan && !isDetailsLoading && !detailsError">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ProjectComposerCard
              v-if="isCreatingProject"
              :available-life-areas="availableLifeAreas"
              :available-priorities="allPriorities"
              :is-saving="isCreatingProjectSaving"
              @create="handleProjectCreate"
              @cancel="closeProjectComposer"
            />
            <ProjectCard
              v-for="project in sortedProjects"
              :key="project.id"
              :project="project"
              :available-life-areas="availableLifeAreas"
              :available-priorities="allPriorities"
              :progress-refresh-key="trackerProgressRefreshKey"
              :is-saving="isProjectSaving(project.id)"
              @delete="openDeleteProjectDialog"
              @status-change="handleStatusChange"
              @update-name="handleProjectNameUpdate"
              @update-icon="handleProjectIconUpdate"
              @update-life-areas="handleProjectLifeAreasUpdate"
              @update-priorities="handleProjectPrioritiesUpdate"
              @update-objective="handleProjectObjectiveUpdate"
              @update-dates="handleProjectDatesUpdate"
            />
            <AddPeriodCard
              v-if="!isCreatingProject"
              :label="t('planning.components.monthCalendarSection.addProject')"
              @click="openProjectComposer"
            />
          </div>
        </template>

        <AppCard v-else-if="!selectedMonthlyPlan && !isDetailsLoading" class="neo-raised">
          <div class="py-6 text-center text-on-surface-variant">
            {{ t('planning.components.monthCalendarSection.startPlanHint') }}
          </div>
        </AppCard>

        <ProjectTrackersPeriodSection
          v-if="selectedPeriod && !isDetailsLoading && !detailsError"
          period-type="monthly"
          :start-date="selectedPeriod.startDate"
          :end-date="selectedPeriod.endDate"
          :selected-plan-id="selectedMonthlyPlan?.id"
          :selected-tracker-ids="selectedMonthlyPlan?.selectedTrackerIds"
          :projects="projectStore.projects"
          :trackers="trackerStore.trackers"
          :commitments="commitmentStore.commitments"
          :habits="habitStore.habits"
          :available-life-areas="availableLifeAreas"
          :available-priorities="allPriorities"
          density="compact"
          @logged="handleTrackerLogged"
          @selection-repaired="handleTrackerSelectionRepaired"
        />

        <!-- Delete Project Confirmation Dialog -->
        <AppDialog
          v-model="showDeleteProjectDialog"
          :title="t('planning.components.monthCalendarSection.deleteProject')"
          :message="deleteProjectMessage"
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeleteProject"
          @cancel="showDeleteProjectDialog = false"
        />

        <!-- Delete Plan Confirmation Dialog -->
        <AppDialog
          v-model="showDeletePlanDialog"
          :title="t('planning.components.monthCalendarSection.deleteMonthlyPlan')"
          message="This will permanently delete this plan and its reflection. Projects will be kept. This cannot be undone."
          confirm-text="Delete"
          cancel-text="Cancel"
          confirm-variant="filled"
          @confirm="handleConfirmDeletePlan"
          @cancel="showDeletePlanDialog = false"
        />

        <!-- Delete Reflection Confirmation Dialog -->
        <AppDialog
          v-model="showDeleteReflectionDialog"
          :title="t('planning.components.monthCalendarSection.deleteReflection')"
          message="This will permanently delete this month's reflection. This cannot be undone."
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
      type="monthly"
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
import ProjectCard from './ProjectCard.vue'
import ProjectComposerCard from './ProjectComposerCard.vue'
import ProjectTrackersPeriodSection from './ProjectTrackersPeriodSection.vue'
import { useMonthlyPlanStore } from '@/stores/monthlyPlan.store'
import { useMonthlyReflectionStore } from '@/stores/monthlyReflection.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useHabitStore } from '@/stores/habit.store'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useTrackerStore } from '@/stores/tracker.store'
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
import type { MonthlyPlan, Project, ProjectStatus } from '@/domain/planning'

interface PeriodItem {
  key: string
  id?: string
  year: number
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
const monthlyPlanStore = useMonthlyPlanStore()
const monthlyReflectionStore = useMonthlyReflectionStore()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()
const habitStore = useHabitStore()
const commitmentStore = useCommitmentStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const trackerProgressRefreshKey = ref(0)

const currentYear = getCurrentYear()
const isDialogOpen = ref(false)
const selectedPeriodKey = ref<string | null>(null)

const isCalendarLoading = computed(
  () => monthlyPlanStore.isLoading || monthlyReflectionStore.isLoading
)
const calendarError = computed(
  () => monthlyPlanStore.error || monthlyReflectionStore.error
)
const isDetailsLoading = computed(
  () =>
    projectStore.isLoading ||
    commitmentStore.isLoading ||
    trackerStore.isLoading ||
    lifeAreaStore.isLoading ||
    priorityStore.isLoading
)
const detailsError = computed(
  () =>
    projectStore.error ||
    commitmentStore.error ||
    trackerStore.error ||
    lifeAreaStore.error ||
    priorityStore.error
)

const existingPeriods = computed(() =>
  monthlyPlanStore.monthlyPlans.map((plan) => ({
    startDate: plan.startDate,
    endDate: plan.endDate,
  }))
)

const periods = computed<PeriodItem[]>(() => {
  const items: PeriodItem[] = monthlyPlanStore.monthlyPlans.map((plan: MonthlyPlan) => {
    const reflection = monthlyReflectionStore.getReflectionByPlanId(plan.id)
    const hasPlanContent = Boolean(
      plan.monthIntention?.trim() ||
      plan.primaryFocusLifeAreaId ||
      plan.secondaryFocusLifeAreaIds.length > 0 ||
      projectStore.getProjectsByMonthId(plan.id).length > 0
    )
    return {
      key: plan.id,
      id: plan.id,
      year: plan.year,
      startDate: plan.startDate,
      endDate: plan.endDate,
      name: plan.name,
      hasPlan: hasPlanContent,
      hasReflection: Boolean(reflection?.completedAt),
    }
  })

  const hasCurrent = monthlyPlanStore.monthlyPlans.some((plan) =>
    isCurrentPeriod(plan.startDate, plan.endDate)
  )

  if (!hasCurrent) {
    const suggestion = suggestNextPeriodDates('monthly')
    const suggestionYear = getYearFromDate(suggestion.startDate)
    items.push({
      key: `current-${suggestion.startDate}`,
      year: suggestionYear,
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

const selectedMonthlyPlan = computed(() => {
  const planId = selectedPeriod.value?.id
  return planId ? monthlyPlanStore.getMonthlyPlanById(planId) : undefined
})

const selectedPeriodYear = computed(() => selectedPeriod.value?.year ?? currentYear)
const displayYear = computed(() => selectedPeriod.value?.year ?? currentYear)

const selectedMonthlyPlanId = computed(() => selectedMonthlyPlan.value?.id)
const selectedMonthlyReflection = computed(() => {
  const planId = selectedMonthlyPlanId.value
  return planId ? monthlyReflectionStore.getReflectionByPlanId(planId) : undefined
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
    'monthly'
  )
  return trimmed === defaultLabel ? '' : trimmed
})

const hasSelectedPlan = computed(() => Boolean(selectedMonthlyPlan.value))
const hasSelectedReflection = computed(
  () => Boolean(selectedMonthlyReflection.value?.completedAt)
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
function setDefaultSelection() {
  const currentPeriod = periods.value.find((period) =>
    isCurrentPeriod(period.startDate, period.endDate)
  )
  const fallback = periods.value[periods.value.length - 1]
  selectedPeriodKey.value = currentPeriod?.key ?? fallback?.key ?? null
}

const selectedIndex = computed(() =>
  periods.value.findIndex((period) => period.key === selectedPeriodKey.value)
)

const allSlides = computed<PeriodItem[]>(() => {
  const slides: PeriodItem[] = [...periods.value]
  // Always show the "Add Month" card at the end for easy access
  slides.push({
    key: 'add-card',
    year: currentYear,
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
  () => monthlyPlanStore.monthlyPlans.length,
  async () => {
    await projectStore.loadProjects()
  }
)

// ============================================================================
// Current Month Projects
// ============================================================================

const projects = computed(() => {
  if (!selectedMonthlyPlan.value) return []
  return projectStore.getProjectsByMonthId(selectedMonthlyPlan.value.id)
})

const planHighlights = computed(() => {
  if (!selectedMonthlyPlan.value) return []

  const primary = selectedMonthlyPlan.value.primaryFocusLifeAreaId
    ? lifeAreaStore.getLifeAreaById(selectedMonthlyPlan.value.primaryFocusLifeAreaId)
    : undefined
  const secondaryNames = selectedMonthlyPlan.value.secondaryFocusLifeAreaIds
    .map((id) => lifeAreaStore.getLifeAreaById(id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ')

  return [
    { label: t('planning.components.monthCalendarSection.planHighlights.monthlyIntention'), value: selectedMonthlyPlan.value.monthIntention },
    { label: t('planning.components.monthCalendarSection.planHighlights.primaryFocus'), value: primary?.name },
    { label: t('planning.components.monthCalendarSection.planHighlights.secondaryFocus'), value: secondaryNames || undefined },
  ].filter((item) => item.value && item.value.trim().length > 0) as {
    label: string
    value: string
  }[]
})

const reflectionHighlights = computed(() => {
  if (!selectedMonthlyReflection.value) return []
  const reflection = selectedMonthlyReflection.value

  const structuredHighlights = [
    reflection.directionRatings
      ? {
          label: t('planning.components.monthCalendarSection.reflectionHighlights.direction'),
          value: t('planning.components.monthCalendarSection.reflectionHighlights.directionValue', {
            projects: reflection.directionRatings.projects,
            priorities: reflection.directionRatings.priorities,
            relationships: reflection.directionRatings.relationships,
          }),
        }
      : undefined,
    reflection.projectReviews?.length
      ? {
          label: t('planning.components.monthCalendarSection.reflectionHighlights.projectDecision'),
          value: t(
            `planning.reflection.monthly.projectDecisions.${
              reflection.projectReviews.find((item) => item.decision !== 'continue')?.decision ??
              reflection.projectReviews[0].decision
            }`
          ),
        }
      : undefined,
    reflection.focusAreaReview?.some((item) => item.deteriorated)
      ? {
          label: t('planning.components.monthCalendarSection.reflectionHighlights.focusGuardrail'),
          value: t('planning.components.monthCalendarSection.reflectionHighlights.focusGuardrailDetected'),
        }
      : undefined,
    reflection.courseCorrection?.ifThenPlan
      ? {
          label: t('planning.components.monthCalendarSection.reflectionHighlights.ifThenPlan'),
          value: reflection.courseCorrection.ifThenPlan,
        }
      : undefined,
    reflection.courseCorrection?.start?.[0]
      ? {
          label: t('planning.components.monthCalendarSection.reflectionHighlights.start'),
          value: reflection.courseCorrection.start[0],
        }
      : undefined,
  ].filter((item): item is { label: string; value: string } => Boolean(item?.value))

  if (structuredHighlights.length > 0) {
    return structuredHighlights
  }

  const wins = reflection.wins?.[0]
  const challenges = reflection.challenges?.[0]
  const learnings = reflection.learnings?.[0]

  return [
    { label: t('planning.components.monthCalendarSection.reflectionHighlights.win'), value: wins },
    { label: t('planning.components.monthCalendarSection.reflectionHighlights.challenge'), value: challenges },
    { label: t('planning.components.monthCalendarSection.reflectionHighlights.learning'), value: learnings },
    {
      label: t('planning.components.monthCalendarSection.reflectionHighlights.adjustment'),
      value: reflection.adjustments,
    },
  ].filter((item) => item.value && item.value.trim().length > 0) as {
    label: string
    value: string
  }[]
})

const statusPriority: Record<ProjectStatus, number> = {
  active: 0,
  planned: 1,
  paused: 2,
  completed: 3,
  abandoned: 4,
}

const sortedProjects = computed(() =>
  [...projects.value].sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff
    return b.createdAt.localeCompare(a.createdAt)
  })
)

const savingProjectIds = ref(new Set<string>())

function isProjectSaving(id: string) {
  return savingProjectIds.value.has(id)
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
  if (!selectedMonthlyPlan.value) return
  if (areSameIds(selectedMonthlyPlan.value.selectedTrackerIds ?? [], payload.trackerIds)) return

  try {
    await monthlyPlanStore.updateMonthlyPlan(selectedMonthlyPlan.value.id, {
      selectedTrackerIds: payload.trackerIds,
    })
    showSnackbar(
      payload.mode === 'fallback'
        ? 'Monthly tracker selection was repaired and reset to available trackers.'
        : 'Monthly tracker selection was repaired to remove missing trackers.'
    )
  } catch (error) {
    console.error('Failed to persist repaired monthly tracker selection:', error)
    showSnackbar('Failed to persist repaired monthly tracker selection.')
  }
}

function handleTrackerLogged() {
  trackerProgressRefreshKey.value += 1
}

const availableLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)

const allPriorities = computed(() =>
  priorityStore.getPrioritiesByYear(selectedPeriodYear.value)
)

// ============================================================================
// Project Composer State
// ============================================================================

const isCreatingProject = ref(false)
const isCreatingProjectSaving = ref(false)

function openProjectComposer() {
  isCreatingProject.value = true
}

function closeProjectComposer() {
  isCreatingProject.value = false
}

async function handleProjectCreate(payload: {
  name: string
  icon?: string
  lifeAreaIds: string[]
  priorityIds: string[]
  objective?: string
  startDate?: string
  endDate?: string
}) {
  if (!selectedMonthlyPlan.value || isCreatingProjectSaving.value) return

  isCreatingProjectSaving.value = true
  try {
    await projectStore.createProject({
      name: payload.name.trim(),
      icon: payload.icon,
      lifeAreaIds: payload.lifeAreaIds,
      priorityIds: payload.priorityIds,
      objective: payload.objective?.trim() || undefined,
      startDate: payload.startDate || undefined,
      endDate: payload.endDate || undefined,
      status: 'planned',
      monthIds: [selectedMonthlyPlan.value.id],
      focusMonthIds: [selectedMonthlyPlan.value.id],
      focusWeekIds: [],
    })
    isCreatingProject.value = false
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project.'
    showSnackbar(message)
  } finally {
    isCreatingProjectSaving.value = false
  }
}

// ============================================================================
// Project Delete State
// ============================================================================

const showDeleteProjectDialog = ref(false)
const projectToDelete = ref<Project | undefined>(undefined)

const deleteProjectMessage = computed(() => {
  if (!projectToDelete.value) return ''
  return `Are you sure you want to delete "${projectToDelete.value.name}"? This cannot be undone.`
})

function openDeleteProjectDialog(projectId: string) {
  projectToDelete.value = projectStore.getProjectById(projectId)
  showDeleteProjectDialog.value = true
}

async function handleConfirmDeleteProject() {
  if (!projectToDelete.value) return

  try {
    await projectStore.deleteProject(projectToDelete.value.id)
    showDeleteProjectDialog.value = false
    projectToDelete.value = undefined
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
  const plan = selectedMonthlyPlan.value
  if (!plan) return

  try {
    const reflection = monthlyReflectionStore.getReflectionByPlanId(plan.id)
    if (reflection) {
      await monthlyReflectionStore.deleteReflection(reflection.id)
    }
    await monthlyPlanStore.deleteMonthlyPlan(plan.id)
    showDeletePlanDialog.value = false
  } catch {
    showSnackbar('Failed to delete monthly plan.')
  }
}

async function handleConfirmDeleteReflection() {
  const reflection = selectedMonthlyReflection.value
  if (!reflection) return

  try {
    await monthlyReflectionStore.deleteReflection(reflection.id)
    showDeleteReflectionDialog.value = false
  } catch {
    showSnackbar('Failed to delete reflection.')
  }
}

// ============================================================================
// Status Change Handler
// ============================================================================

async function handleStatusChange(projectId: string, status: ProjectStatus) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.status = status
  if (status === 'completed' || status === 'abandoned') {
    project.completedAt = new Date().toISOString()
  } else {
    project.completedAt = undefined
  }
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProjectStatus(projectId, status)
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project status.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectNameUpdate(projectId: string, name: string) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  Object.assign(project, { name })
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { name })
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectIconUpdate(projectId: string, icon: string | undefined) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.icon = icon
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { icon })
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectLifeAreasUpdate(projectId: string, lifeAreaIds: string[]) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.lifeAreaIds = lifeAreaIds
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { lifeAreaIds })
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectPrioritiesUpdate(projectId: string, priorityIds: string[]) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.priorityIds = priorityIds
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { priorityIds })
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectObjectiveUpdate(projectId: string, objective?: string) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.objective = objective
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { objective })
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

async function handleProjectDatesUpdate(projectId: string, startDate: string | undefined, endDate: string | undefined) {
  if (isProjectSaving(projectId)) return
  const project = projectStore.getProjectById(projectId)
  if (!project) return

  const previous = { ...project }
  project.startDate = startDate
  project.endDate = endDate
  savingProjectIds.value.add(projectId)

  try {
    await projectStore.updateProject(projectId, { startDate, endDate })
  } catch (error) {
    Object.assign(project, previous)
    const message = error instanceof Error ? error.message : 'Failed to update project.'
    showSnackbar(message)
  } finally {
    savingProjectIds.value.delete(projectId)
  }
}

function getItemStatusesForPeriod(period: PeriodItem) {
  if (!period.id) return []
  const periodProjects = projectStore.getProjectsByMonthId(period.id)
  return periodProjects.map((p) => ({ label: p.name, status: p.status }))
}

function handleCardPlan(period: PeriodItem) {
  handlePlan(period)
}

function handleCardReflect(period: PeriodItem) {
  handleReflect(period)
}

function handleSelectedPlan() {
  if (!selectedPeriod.value) return
  handlePlan(selectedPeriod.value)
}

function handleSelectedReflect() {
  if (!selectedPeriod.value || !reflectionEnabled.value) return
  handleReflect(selectedPeriod.value)
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  await Promise.all([
    monthlyPlanStore.loadMonthlyPlans(),
    monthlyReflectionStore.loadMonthlyReflections(),
    projectStore.loadProjects(),
    commitmentStore.loadCommitments(),
    trackerStore.loadTrackers(),
    habitStore.loadHabits(),
  ])
}

async function handleCreate(payload: { startDate: string; endDate: string; name?: string }) {
  const year = getYearFromDate(payload.startDate)
  const created = await monthlyPlanStore.createMonthlyPlan({
    startDate: payload.startDate,
    endDate: payload.endDate,
    name: payload.name,
    year,
    primaryFocusLifeAreaId: undefined,
    secondaryFocusLifeAreaIds: [],
    monthIntention: undefined,
    projectIds: [],
  })

  isDialogOpen.value = false
  router.push(`/planning/month/${created.id}`)
}

async function handlePlan(period: PeriodItem) {
  if (period.id) {
    router.push(`/planning/month/${period.id}`)
    return
  }

  const created = await monthlyPlanStore.createMonthlyPlan({
    startDate: period.startDate,
    endDate: period.endDate,
    name: period.name,
    year: period.year,
    primaryFocusLifeAreaId: undefined,
    secondaryFocusLifeAreaIds: [],
    monthIntention: undefined,
    projectIds: [],
  })

  router.push(`/planning/month/${created.id}`)
}

async function handleReflect(period: PeriodItem) {
  if (period.id) {
    router.push(`/planning/month/${period.id}/reflect`)
    return
  }

  const created = await monthlyPlanStore.createMonthlyPlan({
    startDate: period.startDate,
    endDate: period.endDate,
    name: period.name,
    year: period.year,
    primaryFocusLifeAreaId: undefined,
    secondaryFocusLifeAreaIds: [],
    monthIntention: undefined,
    projectIds: [],
  })

  router.push(`/planning/month/${created.id}/reflect`)
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
