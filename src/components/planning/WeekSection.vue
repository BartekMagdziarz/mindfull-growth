<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <AppCard v-if="isLoading">
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
          <span>{{ t('planning.components.weekSection.loading') }}</span>
        </div>
      </div>
    </AppCard>

    <!-- Error State -->
    <AppCard v-else-if="error">
      <div class="text-center py-6">
        <p class="text-error mb-4">{{ error }}</p>
        <AppButton variant="tonal" @click="loadData">Try Again</AppButton>
      </div>
    </AppCard>

    <!-- Empty State -->
    <AppCard v-else-if="sortedCommitments.length === 0 && !isCreatingCommitment">
      <div class="text-center py-8">
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <CalendarDaysIcon class="w-8 h-8 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-on-surface mb-2">
          {{ t('planning.components.weekSection.emptyTitle') }}
        </h3>
        <p class="text-on-surface-variant text-sm mb-6 max-w-sm mx-auto">
          Add commitments for {{ weekRangeLabel }}. Use Add Commitment to capture
          your weekly moves and update statuses with quick actions.
        </p>
        <div class="flex flex-col gap-3 items-center">
          <AppButton variant="filled" @click="openCreateCommitmentComposer">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ t('planning.components.weekSection.addCommitment') }}
          </AppButton>
          <RouterLink :to="weeklyPlanningRoute">
            <AppButton variant="tonal">
              {{ t('planning.components.weekSection.startPlanning') }}
            </AppButton>
          </RouterLink>
        </div>
      </div>
    </AppCard>

    <!-- Header Card (when commitments exist) -->
    <AppCard
      v-if="!isLoading && !error && sortedCommitments.length > 0"
    >
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-on-surface">
            {{ weekRangeLabel }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ commitmentCountText }}
          </p>
        </div>

        <!-- Status Badges -->
        <div class="flex items-center gap-2">
          <!-- Reflection Complete Badge -->
          <span
            v-if="isReflectionCompleted"
            class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
          >
            <CheckCircleIcon class="w-3.5 h-3.5" />
            {{ t('planning.components.weekSection.reflected') }}
          </span>
          <!-- Plan Status Badge -->
          <span
            :class="[
              'px-3 py-1 rounded-full text-xs font-medium',
              hasWeeklyPlan
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-section text-on-surface-variant',
            ]"
          >
            {{ hasWeeklyPlan ? t('planning.components.weekSection.planReady') : t('planning.components.weekSection.noPlanYet') }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-2">
        <RouterLink :to="weeklyPlanningRoute">
          <AppButton variant="tonal">
            {{ hasWeeklyPlan ? t('planning.components.weekSection.viewEditPlan') : t('planning.components.weekSection.startPlanning') }}
          </AppButton>
        </RouterLink>

        <!-- Reflection CTA - only show when plan exists -->
        <RouterLink v-if="hasWeeklyPlan" :to="weeklyReflectionRoute">
          <AppButton :variant="isReflectionCompleted ? 'text' : 'tonal'">
            {{ isReflectionCompleted ? t('planning.components.weekSection.viewReflection') : t('planning.components.weekSection.startReflection') }}
          </AppButton>
        </RouterLink>
      </div>
    </AppCard>

    <!-- Commitments List + Composer -->
    <template v-if="!isLoading && !error && (sortedCommitments.length > 0 || isCreatingCommitment)">
      <!-- Add Commitment Button -->
      <div v-if="!isCreatingCommitment" class="flex justify-end">
        <AppButton variant="tonal" @click="openCreateCommitmentComposer">
          <PlusIcon class="w-4 h-4 mr-2" />
          {{ t('planning.components.weekSection.addCommitment') }}
        </AppButton>
      </div>

      <CommitmentComposerCard
        v-if="isCreatingCommitment && currentWeeklyPlan"
        :available-projects="activeProjects"
        :available-life-areas="availableLifeAreas"
        :available-priorities="availablePriorities"
        :is-saving="isCreatingCommitmentSaving"
        @create="handleCommitmentCreate"
        @cancel="closeCommitmentComposer"
      />

      <!-- Commitment Cards -->
      <CommitmentCard
        v-for="commitment in sortedCommitments"
        :key="commitment.id"
        :commitment="commitment"
        :available-projects="availableProjectsForCards"
        :available-life-areas="availableLifeAreasForCards"
        :available-priorities="availablePrioritiesForCards"
        :is-saving="isCommitmentSaving(commitment.id)"
        @delete="openDeleteCommitmentDialog"
        @status-change="handleStatusChange"
        @update-name="handleCommitmentNameUpdate"
        @update-life-areas="handleCommitmentLifeAreasUpdate"
        @update-priorities="handleCommitmentPrioritiesUpdate"
        @update-project="handleCommitmentProjectUpdate"
      />
    </template>

    <!-- Trackers Section (project + habit) -->
    <ProjectTrackersPeriodSection
      v-if="!isLoading && !error && currentWeeklyPlan"
      period-type="weekly"
      :start-date="currentWeekStart"
      :end-date="currentWeekEnd"
      :selected-plan-id="currentWeeklyPlan?.id"
      :selected-tracker-ids="currentWeeklyPlan?.selectedTrackerIds"
      :projects="projectStore.projects"
      :trackers="trackerStore.trackers"
      :commitments="commitmentStore.commitments"
      :habits="habitStore.habits"
      :available-life-areas="availableLifeAreasForCards"
      :available-priorities="availablePrioritiesForCards"
      density="compact"
      @logged="handleTrackerLogged"
      @selection-repaired="handleTrackerSelectionRepaired"
    />

    <!-- Delete Commitment Confirmation Dialog -->
    <AppDialog
      v-model="showDeleteCommitmentDialog"
      :title="t('planning.components.weekSection.deleteCommitment')"
      :message="deleteCommitmentMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-variant="filled"
      @confirm="handleConfirmDeleteCommitment"
      @cancel="showDeleteCommitmentDialog = false"
    />

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { PlusIcon, CalendarDaysIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import CommitmentCard from './CommitmentCard.vue'
import CommitmentComposerCard from './CommitmentComposerCard.vue'
import ProjectTrackersPeriodSection from './ProjectTrackersPeriodSection.vue'
import { useT } from '@/composables/useT'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import { useWeeklyReflectionStore } from '@/stores/weeklyReflection.store'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import {
  getWeekStart,
  getWeekRange,
  toLocalISODateString,
  formatWeekRangeFromStart,
  getCurrentYear,
} from '@/utils/periodUtils'
import type { Commitment, CommitmentStatus } from '@/domain/planning'

// ============================================================================
// Stores and Data
// ============================================================================

const { t } = useT()
const commitmentStore = useCommitmentStore()
const weeklyPlanStore = useWeeklyPlanStore()
const weeklyReflectionStore = useWeeklyReflectionStore()
const projectStore = useProjectStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()
const habitStore = useHabitStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const currentWeekStart = getWeekStart(new Date())
const currentWeekEnd = toLocalISODateString(getWeekRange(new Date()).end)
const weekRangeLabel = formatWeekRangeFromStart(currentWeekStart)
const currentYear = getCurrentYear()

// ============================================================================
// Computed State
// ============================================================================

const isLoading = computed(
  () =>
    commitmentStore.isLoading ||
    weeklyPlanStore.isLoading ||
    projectStore.isLoading ||
    lifeAreaStore.isLoading ||
    priorityStore.isLoading
)

const error = computed(
  () =>
    commitmentStore.error ||
    weeklyPlanStore.error ||
    projectStore.error ||
    lifeAreaStore.error ||
    priorityStore.error
)

// Get current weekly plan (where today is within startDate-endDate)
const currentWeeklyPlan = computed(() => {
  const plans = weeklyPlanStore.getCurrentWeekPlans
  return plans.length > 0 ? plans[0] : undefined
})

// Get commitments for the current weekly plan
const sortedCommitments = computed(() => {
  if (!currentWeeklyPlan.value) return []
  return commitmentStore.getCommitmentsByWeeklyPlanId(currentWeeklyPlan.value.id)
})

const commitmentCountText = computed(() => {
  const count = sortedCommitments.value.length
  return count === 1
    ? t('planning.components.weekSection.commitmentCount', { count: 1 }).split(' | ')[0]
    : t('planning.components.weekSection.commitmentCount', { count }).split(' | ')[1] || `${count} commitments`
})

const hasWeeklyPlan = computed(() => {
  return !!currentWeeklyPlan.value
})

const activeProjects = computed(() => {
  return projectStore.projects.filter((p) => p.status === 'active' || p.status === 'planned')
})

const availableLifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const availablePriorities = computed(() =>
  priorityStore.getPrioritiesByYear(currentYear)
)

const availableProjectsForCards = computed(() => projectStore.projects)

const availableLifeAreasForCards = computed(() => lifeAreaStore.lifeAreas)
const availablePrioritiesForCards = computed(() =>
  priorityStore.getPrioritiesByYear(currentYear)
)

// Check if reflection exists for the current weekly plan
const isReflectionCompleted = computed(() => {
  if (!currentWeeklyPlan.value) return false
  const reflection = weeklyReflectionStore.getReflectionByPlanId(currentWeeklyPlan.value.id)
  return !!reflection
})

const weeklyPlanningRoute = computed(() => {
  return currentWeeklyPlan.value
    ? `/planning/week/${currentWeeklyPlan.value.id}`
    : '/planning/week/new'
})

const weeklyReflectionRoute = computed(() => {
  return currentWeeklyPlan.value
    ? `/planning/week/${currentWeeklyPlan.value.id}/reflect`
    : '/planning/week/new'
})

const savingCommitmentIds = ref(new Set<string>())

function isCommitmentSaving(id: string) {
  return savingCommitmentIds.value.has(id)
}

function showSnackbar(message: string) {
  snackbarRef.value?.show(message)
}

// ============================================================================
// Tracker Handlers
// ============================================================================

function handleTrackerLogged() {
  // Tracker period was updated — no additional action needed
}

async function handleTrackerSelectionRepaired(payload: {
  trackerIds: string[]
  mode: 'pruned' | 'fallback'
}) {
  if (!currentWeeklyPlan.value) return
  if (areSameIds(currentWeeklyPlan.value.selectedTrackerIds ?? [], payload.trackerIds)) return

  try {
    await weeklyPlanStore.updateWeeklyPlan(currentWeeklyPlan.value.id, {
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

function areSameIds(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Commitment Composer State
// ============================================================================

const isCreatingCommitment = ref(false)
const isCreatingCommitmentSaving = ref(false)

function openCreateCommitmentComposer() {
  if (!currentWeeklyPlan.value) {
    showSnackbar('Please create a weekly plan before adding commitments.')
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
  if (!currentWeeklyPlan.value || isCreatingCommitmentSaving.value) return

  isCreatingCommitmentSaving.value = true

  try {
    await commitmentStore.createCommitment({
      weeklyPlanId: currentWeeklyPlan.value.id,
      startDate: currentWeeklyPlan.value.startDate,
      endDate: currentWeeklyPlan.value.endDate,
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
    const message =
      error instanceof Error ? error.message : 'Failed to update commitment status.'
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
    const message =
      error instanceof Error ? error.message : 'Failed to update commitment.'
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
    const message =
      error instanceof Error ? error.message : 'Failed to update commitment.'
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
    const message =
      error instanceof Error ? error.message : 'Failed to update commitment.'
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
    const message =
      error instanceof Error ? error.message : 'Failed to update commitment.'
    showSnackbar(message)
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
  // First load weekly plans, reflections, and foundation data
  await Promise.all([
    weeklyPlanStore.loadWeeklyPlans(),
    weeklyReflectionStore.loadWeeklyReflections(),
    lifeAreaStore.loadLifeAreas(),
    priorityStore.loadPriorities(currentYear),
    habitStore.loadHabits({ activeOnly: true }),
    trackerStore.loadTrackers(),
  ])

  // After loading plans, load commitments for the current weekly plan
  if (currentWeeklyPlan.value) {
    await Promise.all([
      commitmentStore.loadCommitments({ weeklyPlanId: currentWeeklyPlan.value.id }),
      projectStore.loadProjects(),
    ])
  }

}

onMounted(() => {
  loadData()
})
</script>
