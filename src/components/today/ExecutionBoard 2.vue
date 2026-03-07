<template>
  <AppCard class="neo-raised w-full">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h3 class="text-lg font-semibold text-on-surface">{{ t('today.execution.title') }}</h3>
        <p class="text-xs text-on-surface-variant">
          {{ t('today.execution.progress', { done: doneCount, total: commitments.length }) }}
        </p>
      </div>
      <AppButton
        variant="tonal"
        size="sm"
        :disabled="!weekPlan"
        @click="openComposer"
      >
        {{ t('today.execution.addCommitment') }}
      </AppButton>
    </div>

    <div v-if="!weekPlan" class="neo-surface rounded-xl p-4 text-sm text-on-surface-variant">
      <p>{{ t('today.execution.noWeeklyPlan') }}</p>
      <AppButton variant="filled" size="sm" class="mt-3" @click="emit('openPlanning')">
        {{ t('today.execution.createWeeklyPlan') }}
      </AppButton>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3" :class="gridClass">
        <CommitmentComposerCard
          v-if="isCreatingCommitment"
          :available-projects="availableProjects"
          :available-life-areas="lifeAreas"
          :available-priorities="priorities"
          :is-saving="isCreatingCommitmentSaving"
          @create="handleCommitmentCreate"
          @cancel="closeComposer"
        />

        <CommitmentCard
          v-for="commitment in commitments"
          :key="commitment.id"
          :commitment="commitment"
          :tracker="commitmentTrackerMap.get(commitment.id)"
          period-type="weekly"
          :start-date="weekPlan.startDate"
          :end-date="weekPlan.endDate"
          :available-projects="availableProjects"
          :available-life-areas="lifeAreas"
          :available-priorities="priorities"
          :is-saving="isCommitmentSaving(commitment.id)"
          @delete="handleCommitmentDelete"
          @status-change="handleStatusChange"
          @update-name="handleCommitmentNameUpdate"
          @update-life-areas="handleCommitmentLifeAreasUpdate"
          @update-priorities="handleCommitmentPrioritiesUpdate"
          @update-project="handleCommitmentProjectUpdate"
          @add-tracker="handleAddTrackerToCommitment"
          @remove-tracker="handleRemoveTrackerFromCommitment"
          @tracker-logged="(trackerId) => emit('trackerLogged', trackerId)"
        />
      </div>

      <div class="mt-6">
        <ProjectTrackersPeriodSection
          period-type="weekly"
          :start-date="weekPlan.startDate"
          :end-date="weekPlan.endDate"
          :selected-plan-id="weekPlan.id"
          :selected-tracker-ids="weekPlan.selectedTrackerIds"
          :projects="projects"
          :trackers="trackerStore.trackers"
          :commitments="commitments"
          :habits="habitStore.habits"
          :available-life-areas="lifeAreas"
          :available-priorities="priorities"
          :density="density"
          @logged="(trackerId) => emit('trackerLogged', trackerId)"
          @selection-repaired="handleTrackerSelectionRepaired"
        />
      </div>
    </template>

    <AppSnackbar ref="snackbarRef" />
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import CommitmentCard from '@/components/planning/CommitmentCard.vue'
import CommitmentComposerCard from '@/components/planning/CommitmentComposerCard.vue'
import ProjectTrackersPeriodSection from '@/components/planning/ProjectTrackersPeriodSection.vue'
import { useCommitmentStore } from '@/stores/commitment.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useHabitStore } from '@/stores/habit.store'
import { useWeeklyPlanStore } from '@/stores/weeklyPlan.store'
import type {
  Commitment,
  CommitmentStatus,
  Priority,
  Project,
  Tracker,
  WeeklyPlan,
} from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import type { TodayModuleDensity } from '@/types/today'
import { useT } from '@/composables/useT'
import { trackTodayEvent } from '@/services/todayTelemetry.service'

const { t } = useT()

const props = withDefaults(
  defineProps<{
    weekPlan?: WeeklyPlan
    commitments: Commitment[]
    projects: Project[]
    lifeAreas: LifeArea[]
    priorities: Priority[]
    density?: TodayModuleDensity
  }>(),
  {
    weekPlan: undefined,
    density: 'comfortable',
  },
)

const emit = defineEmits<{
  openPlanning: []
  trackerLogged: [trackerId: string]
}>()

const commitmentStore = useCommitmentStore()
const trackerStore = useTrackerStore()
const habitStore = useHabitStore()
const weeklyPlanStore = useWeeklyPlanStore()

const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const savingCommitmentIds = ref(new Set<string>())
const isCreatingCommitment = ref(false)
const isCreatingCommitmentSaving = ref(false)

const doneCount = computed(() => props.commitments.filter((item) => item.status === 'done').length)

const gridClass = computed(() =>
  props.density === 'compact' ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2',
)

const commitmentTrackerMap = computed(() => {
  const map = new Map<string, Tracker>()
  for (const commitment of props.commitments) {
    const attachedTrackers = trackerStore.getTrackersByCommitment(commitment.id)
    if (attachedTrackers.length > 0) {
      map.set(commitment.id, attachedTrackers[0])
    }
  }
  return map
})

const availableProjects = computed(() =>
  props.projects.filter((project) => project.status === 'active' || project.status === 'planned'),
)

function openComposer() {
  if (!props.weekPlan) {
    snackbarRef.value?.show(t('today.execution.noWeeklyPlanError'))
    return
  }
  isCreatingCommitment.value = true
  void trackTodayEvent('commitment_composer_opened')
}

function closeComposer() {
  isCreatingCommitment.value = false
}

function isCommitmentSaving(id: string) {
  return savingCommitmentIds.value.has(id)
}

function showErrorMessage(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage
  snackbarRef.value?.show(message)
}

async function handleCommitmentCreate(payload: {
  name: string
  projectId?: string
  lifeAreaIds: string[]
  priorityIds: string[]
}) {
  if (!props.weekPlan || isCreatingCommitmentSaving.value) return

  isCreatingCommitmentSaving.value = true

  try {
    const created = await commitmentStore.createCommitment({
      weeklyPlanId: props.weekPlan.id,
      startDate: props.weekPlan.startDate,
      endDate: props.weekPlan.endDate,
      periodType: 'weekly',
      name: payload.name,
      projectId: payload.projectId,
      lifeAreaIds: payload.lifeAreaIds,
      priorityIds: payload.priorityIds,
      status: 'planned',
    })
    void trackTodayEvent('commitment_created_from_today', {
      commitmentId: created.id,
      weekPlanId: props.weekPlan.id,
    })
    closeComposer()
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedAddCommitment'))
  } finally {
    isCreatingCommitmentSaving.value = false
  }
}

async function handleCommitmentDelete(commitmentId: string) {
  if (isCommitmentSaving(commitmentId)) return
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.deleteCommitment(commitmentId)
    void trackTodayEvent('commitment_deleted_from_today', { commitmentId })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedUpdateCommitment'))
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleStatusChange(commitmentId: string, status: CommitmentStatus) {
  if (isCommitmentSaving(commitmentId)) return
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitmentStatus(commitmentId, status)
    void trackTodayEvent('commitment_status_updated_from_today', {
      commitmentId,
      status,
    })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedUpdateCommitment'))
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentNameUpdate(commitmentId: string, name: string) {
  if (isCommitmentSaving(commitmentId)) return
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { name })
    void trackTodayEvent('commitment_name_updated_from_today', { commitmentId })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedUpdateCommitment'))
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentLifeAreasUpdate(commitmentId: string, lifeAreaIds: string[]) {
  if (isCommitmentSaving(commitmentId)) return
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { lifeAreaIds })
    void trackTodayEvent('commitment_life_areas_updated_from_today', { commitmentId })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedUpdateCommitment'))
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentPrioritiesUpdate(commitmentId: string, priorityIds: string[]) {
  if (isCommitmentSaving(commitmentId)) return
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { priorityIds })
    void trackTodayEvent('commitment_priorities_updated_from_today', { commitmentId })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedUpdateCommitment'))
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleCommitmentProjectUpdate(
  commitmentId: string,
  projectId: string | undefined,
) {
  if (isCommitmentSaving(commitmentId)) return
  savingCommitmentIds.value.add(commitmentId)

  try {
    await commitmentStore.updateCommitment(commitmentId, { projectId })
    void trackTodayEvent('commitment_project_updated_from_today', { commitmentId })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedUpdateCommitment'))
  } finally {
    savingCommitmentIds.value.delete(commitmentId)
  }
}

async function handleAddTrackerToCommitment(commitmentId: string, trackerType: string) {
  const commitment = commitmentStore.getCommitmentById(commitmentId)
  if (!commitment) return

  const base = {
    parentType: 'commitment' as const,
    parentId: commitmentId,
    name: commitment.name,
    lifeAreaIds: [],
    priorityIds: [],
    sortOrder: 0,
    isActive: true,
    cadence: 'weekly' as const,
  }

  try {
    if (trackerType === 'value') {
      await trackerStore.createTracker({ ...base, type: 'value' })
      void trackTodayEvent('commitment_tracker_added_from_today', {
        commitmentId,
        trackerType,
      })
      return
    }

    if (trackerType === 'rating') {
      await trackerStore.createTracker({
        ...base,
        type: 'rating',
        ratingScaleMin: 1,
        ratingScaleMax: 10,
      })
      void trackTodayEvent('commitment_tracker_added_from_today', {
        commitmentId,
        trackerType,
      })
      return
    }

    await trackerStore.createTracker({ ...base, type: 'count' })
    void trackTodayEvent('commitment_tracker_added_from_today', {
      commitmentId,
      trackerType: 'count',
    })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedAddTracker'))
  }
}

async function handleRemoveTrackerFromCommitment(commitmentId: string) {
  try {
    await trackerStore.deleteTrackersByParent('commitment', commitmentId)
    void trackTodayEvent('commitment_tracker_removed_from_today', { commitmentId })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedRemoveTracker'))
  }
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
  if (!props.weekPlan) return
  if (areSameIds(props.weekPlan.selectedTrackerIds ?? [], payload.trackerIds)) return

  try {
    await weeklyPlanStore.updateWeeklyPlan(props.weekPlan.id, {
      selectedTrackerIds: payload.trackerIds,
    })
    void trackTodayEvent('tracker_selection_repaired_from_today', {
      mode: payload.mode,
    })
  } catch (error) {
    showErrorMessage(error, t('today.execution.failedRepairSelection'))
  }
}
</script>
