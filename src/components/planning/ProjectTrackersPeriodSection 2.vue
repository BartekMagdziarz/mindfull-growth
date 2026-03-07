<template>
  <div class="space-y-4">
    <div class="space-y-1">
      <h3 class="text-lg font-semibold text-on-surface">Trackers</h3>
      <p class="text-xs text-on-surface-variant">Tracking period: {{ periodRangeLabel }}</p>
    </div>

    <AppCard v-if="!selectedPlanId" class="text-sm text-on-surface-variant">
      {{ noPlanMessage }}
    </AppCard>

    <AppCard v-else-if="hasNoTrackers" class="text-sm text-on-surface-variant">
      {{ noTrackersMessage }}
    </AppCard>

    <div v-else :class="trackerGridClass">
      <ProjectTrackerPeriodCard
        v-for="item in unifiedTrackerItems"
        :key="item.tracker.id"
        :project="item.parentProject"
        :parent-habit="item.parentHabit"
        :tracker="item.tracker"
        :period-type="periodType"
        :start-date="startDate"
        :end-date="endDate"
        :available-life-areas="availableLifeAreas"
        :available-priorities="availablePriorities"
        @logged="emit('logged', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppCard from '@/components/AppCard.vue'
import ProjectTrackerPeriodCard from './ProjectTrackerPeriodCard.vue'
import type { Commitment, Project, Tracker, Priority } from '@/domain/planning'
import type { Habit } from '@/domain/habit'
import type { LifeArea } from '@/domain/lifeArea'
import {
  resolveMonthlyTrackerProjects,
  resolveWeeklyTrackerProjects,
} from '@/services/projectTrackerScope.service'
import {
  resolvePeriodTrackerSelection,
  type SelectionRepairMode,
} from '@/services/periodTrackerSelection.service'
import { formatPeriodDateRange } from '@/utils/periodUtils'

interface HabitTrackerEntry {
  habit: Habit
  tracker: Tracker
}

const props = defineProps<{
  periodType: 'weekly' | 'monthly'
  startDate: string
  endDate: string
  selectedPlanId?: string
  selectedTrackerIds?: string[]
  projects: Project[]
  trackers: Tracker[]
  commitments: Commitment[]
  habits?: Habit[]
  availableLifeAreas?: LifeArea[]
  availablePriorities?: Priority[]
  density?: 'compact' | 'comfortable'
}>()

const emit = defineEmits<{
  logged: [trackerId: string]
  'selection-repaired': [payload: { trackerIds: string[]; mode: SelectionRepairMode }]
}>()

const periodRangeLabel = computed(() => formatPeriodDateRange(props.startDate, props.endDate))

const noPlanMessage = computed(() =>
  props.periodType === 'weekly'
    ? 'Start a weekly plan for this period to track weekly results here.'
    : 'Start a monthly plan for this period to track monthly results here.'
)

const cadenceFilter = computed(() =>
  props.periodType === 'weekly'
    ? (tracker: Tracker) =>
        tracker.cadence === 'weekly' ||
        tracker.cadence === 'monthly'
    : (tracker: Tracker) => tracker.cadence === 'monthly'
)

// --- Project trackers ---

const baseProjectTrackers = computed(() =>
  props.trackers.filter(
    (tracker) =>
      tracker.parentType === 'project' &&
      tracker.parentId &&
      tracker.isActive &&
      cadenceFilter.value(tracker)
  )
)

// --- Habit trackers ---

const baseHabitTrackers = computed(() =>
  props.trackers.filter(
    (tracker) =>
      tracker.parentType === 'habit' &&
      tracker.parentId &&
      tracker.isActive &&
      cadenceFilter.value(tracker)
  )
)

// --- Selection resolution (includes BOTH project + habit tracker IDs) ---

const allEligibleTrackerIds = computed(() => [
  ...baseProjectTrackers.value.map((t) => t.id),
  ...baseHabitTrackers.value.map((t) => t.id),
])

const resolvedSelection = computed(() =>
  resolvePeriodTrackerSelection({
    selectedTrackerIds: props.selectedTrackerIds,
    eligibleTrackerIds: allEligibleTrackerIds.value,
  })
)

const hasExplicitTrackerSelection = computed(() => resolvedSelection.value.hasExplicitSelection)
const selectedTrackerIdSet = computed(
  () => new Set(resolvedSelection.value.effectiveSelectedTrackerIds)
)

// --- Filtered trackers (after selection) ---

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

// --- Selection repair watcher ---

const lastRepairSignature = ref('')
watch(
  resolvedSelection,
  (selection) => {
    if (!props.selectedPlanId || !selection.repairedSelectedTrackerIds || !selection.repairMode) return
    const signature = `${props.selectedPlanId}:${selection.repairMode}:${selection.repairedSelectedTrackerIds.join('|')}`
    if (signature === lastRepairSignature.value) return
    lastRepairSignature.value = signature
    emit('selection-repaired', {
      trackerIds: selection.repairedSelectedTrackerIds,
      mode: selection.repairMode,
    })
  },
  { immediate: true }
)

// --- Empty state ---

const hasNoTrackers = computed(() => {
  if (!props.selectedPlanId) return false
  return unifiedTrackerItems.value.length === 0
})

const noTrackersMessage = computed(() => {
  if (hasExplicitTrackerSelection.value) {
    return props.periodType === 'weekly'
      ? 'No trackers selected for this week. Edit this weekly plan to choose trackers.'
      : 'No trackers selected for this month. Edit this monthly plan to choose trackers.'
  }

  return props.periodType === 'weekly'
    ? 'No active weekly or monthly trackers found.'
    : 'No active monthly trackers found.'
})

const trackerGridClass = computed(() =>
  props.density === 'comfortable'
    ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
)

// --- Project groups ---

const scopedProjects = computed(() => {
  if (!props.selectedPlanId) return []

  if (hasExplicitTrackerSelection.value) {
    const projectIdSet = new Set<string>()
    for (const tracker of filteredProjectTrackers.value) {
      if (tracker.parentId) {
        projectIdSet.add(tracker.parentId)
      }
    }
    return props.projects.filter((project) => projectIdSet.has(project.id))
  }

  if (props.periodType === 'weekly') {
    return resolveWeeklyTrackerProjects({
      projects: props.projects,
      commitments: props.commitments,
      weeklyPlanId: props.selectedPlanId,
      startDate: props.startDate,
      endDate: props.endDate,
    })
  }

  return resolveMonthlyTrackerProjects({
    projects: props.projects,
    commitments: props.commitments,
    monthlyPlanId: props.selectedPlanId,
    startDate: props.startDate,
    endDate: props.endDate,
  })
})

// --- Habit groups ---

const habitGroups = computed<HabitTrackerEntry[]>(() => {
  if (!props.habits?.length) return []

  const habitMap = new Map(props.habits.map((h) => [h.id, h]))

  return filteredHabitTrackers.value
    .map((tracker) => {
      const habit = tracker.parentId ? habitMap.get(tracker.parentId) : undefined
      return habit ? { habit, tracker } : undefined
    })
    .filter(Boolean) as HabitTrackerEntry[]
})

// --- Unified flat list ---

interface UnifiedTrackerItem {
  tracker: Tracker
  parentProject?: Project
  parentHabit?: Habit
}

const unifiedTrackerItems = computed<UnifiedTrackerItem[]>(() => {
  const items: UnifiedTrackerItem[] = []

  const projectById = new Map(props.projects.map((p) => [p.id, p]))
  const scopedProjectIdSet = new Set(scopedProjects.value.map((p) => p.id))

  for (const tracker of filteredProjectTrackers.value) {
    if (!tracker.parentId || !scopedProjectIdSet.has(tracker.parentId)) continue
    items.push({
      tracker,
      parentProject: projectById.get(tracker.parentId),
    })
  }

  for (const entry of habitGroups.value) {
    items.push({
      tracker: entry.tracker,
      parentHabit: entry.habit,
    })
  }

  return items
})
</script>
