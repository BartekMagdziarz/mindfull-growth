<template>
  <div class="flex flex-col px-1 py-1">
    <!-- Segmented tab control -->
    <div class="mb-3 grid grid-cols-3 gap-1 rounded-2xl border border-neu-border/30 bg-neu-base p-1 shadow-neu-pressed-sm">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="flex items-center justify-center rounded-xl px-2 py-1.5 text-xs font-semibold transition-all duration-150 neo-focus"
        :class="
          activeTab === tab.key
            ? 'bg-neu-base text-primary-strong shadow-neu-raised-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        @click="$emit('updateTab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="flex-1">
      <div
        v-if="currentRows.length === 0"
        class="neo-inset rounded-[1.25rem] px-3 py-4 text-sm text-on-surface-variant"
      >
        {{ emptyMessage }}
      </div>

      <div v-else class="space-y-3">
        <!-- Needs planning section -->
        <section v-if="needsPlanning.length > 0" class="space-y-1.5">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-primary/5"
            @click="needsOpen = !needsOpen"
          >
            <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {{ t('planning.calendar.planner.groups.needsPlanning') }}
            </span>
            <AppIcon
              name="expand_more"
              class="text-sm text-on-surface-variant transition-transform duration-200"
              :class="needsOpen ? 'rotate-180' : ''"
            />
          </button>

          <div v-if="needsOpen" class="space-y-1.5">
            <PlannerObjectCard
              v-for="item in needsPlanning"
              :key="`${item.subjectType}:${item.id}:needs`"
              :row="item"
              :whole-label="wholeLabel(item)"
              :whole-applied-label="wholeAppliedLabel(item)"
              @toggle="$emit('toggleMeasurement', item)"
              @apply-whole-period="$emit('applyWholePeriod', item)"
              @start-assigning="$emit('startAssigning', item)"
              @target-operator-change="$emit('targetOperatorChange', item, $event)"
              @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
              @target-value-change="$emit('targetValueChange', item, $event)"
              @clear-override="$emit('clearOverride', item)"
            />
          </div>
        </section>

        <!-- Planned section -->
        <section v-if="planned.length > 0" class="space-y-1.5">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-success/5"
            @click="plannedOpen = !plannedOpen"
          >
            <span class="text-[11px] font-semibold uppercase tracking-[0.14em] text-success">
              {{ t('planning.calendar.planner.groups.planned') }}
            </span>
            <AppIcon
              name="expand_more"
              class="text-sm text-on-surface-variant transition-transform duration-200"
              :class="plannedOpen ? 'rotate-180' : ''"
            />
          </button>

          <div v-if="plannedOpen" class="space-y-1.5">
            <PlannerObjectCard
              v-for="item in planned"
              :key="`${item.subjectType}:${item.id}:planned`"
              :row="item"
              :whole-label="wholeLabel(item)"
              :whole-applied-label="wholeAppliedLabel(item)"
              @toggle="$emit('toggleMeasurement', item)"
              @apply-whole-period="$emit('applyWholePeriod', item)"
              @start-assigning="$emit('startAssigning', item)"
              @target-operator-change="$emit('targetOperatorChange', item, $event)"
              @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
              @target-value-change="$emit('targetValueChange', item, $event)"
              @clear-override="$emit('clearOverride', item)"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlannerObjectCard from './PlannerObjectCard.vue'
import type {
  PlannerDisplayRow,
  PlannerMeasurementRow,
} from './plannerTypes'
import type { Priority } from '@/domain/planning'

const props = defineProps<{
  activeTab: 'goals' | 'habits' | 'trackers'
  keyResultRows: PlannerMeasurementRow[]
  habitRows: PlannerMeasurementRow[]
  trackerRows: PlannerMeasurementRow[]
  priorities: Priority[]
  savingKey: string
  monthWeekCount: number
  isAssignmentActive: (item: PlannerMeasurementRow) => boolean
  isAssigned: (item: PlannerMeasurementRow) => boolean
}>()

defineEmits<{
  updateTab: [tab: 'goals' | 'habits' | 'trackers']
  toggleMeasurement: [item: PlannerMeasurementRow]
  applyWholePeriod: [item: PlannerMeasurementRow]
  startAssigning: [item: PlannerMeasurementRow]
  targetOperatorChange: [item: PlannerMeasurementRow, value: string]
  targetAggregationChange: [item: PlannerMeasurementRow, value: string]
  targetValueChange: [item: PlannerMeasurementRow, value: number]
  clearOverride: [item: PlannerMeasurementRow]
}>()

const { t } = useT()

const needsOpen = ref(true)
const plannedOpen = ref(false)

const tabs = computed(() => [
  { key: 'goals' as const, label: t('planning.calendar.planner.steps.goals') },
  { key: 'habits' as const, label: t('planning.calendar.planner.steps.habits') },
  { key: 'trackers' as const, label: t('planning.calendar.planner.steps.trackers') },
])

const currentRows = computed(() => {
  if (props.activeTab === 'goals') return props.keyResultRows
  if (props.activeTab === 'habits') return props.habitRows
  return props.trackerRows
})

const emptyMessage = computed(() => {
  if (props.activeTab === 'habits') return t('planning.calendar.empty.habits')
  if (props.activeTab === 'trackers') return t('planning.calendar.empty.trackers')
  return t('planning.calendar.empty.keyResults')
})

const displayRows = computed(() =>
  currentRows.value.map(row => buildDisplayRow(row))
)

const needsPlanning = computed(() =>
  displayRows.value.filter(row => row.placementStatus !== 'planned')
)

const planned = computed(() =>
  displayRows.value.filter(row => row.placementStatus === 'planned')
)

function wholeLabel(row: PlannerMeasurementRow): string {
  return row.cadence === 'monthly'
    ? t('planning.calendar.planner.scheduleWholeMonth')
    : t('planning.calendar.planner.scheduleAllWeeks')
}

function wholeAppliedLabel(row: PlannerMeasurementRow): string {
  return row.cadence === 'monthly'
    ? t('planning.calendar.planner.scheduledWholeMonth')
    : t('planning.calendar.planner.scheduledAllWeeks')
}

function buildDisplayRow(row: PlannerMeasurementRow): PlannerDisplayRow {
  const plannedWeekCount = countPlannedWeeks(row)
  const wholeWeekCount = countWholeWeeks(row)
  const explicitPlacement = hasExplicitPlacement(row)
  const wholePeriod = row.cadence === 'monthly'
    ? row.monthScheduleScope === 'whole-month' && !explicitPlacement
    : wholeWeekCount === props.monthWeekCount && props.monthWeekCount > 0 && row.scheduledDayRefs.length === 0

  // Convert whole-week assignments into "real" day counts for the summary
  const wholeWeekDayCount = wholeWeekCount * 7 // approximate; the user just needs a single number
  const dayCount = row.scheduledDayRefs.length
  const totalDays = dayCount + (plannedWeekCount > 0 && !wholePeriod ? wholeWeekDayCount : 0)

  let placementSummary: string | null = null
  if (wholePeriod) {
    placementSummary = t('planning.calendar.planner.weeksCompact', { n: props.monthWeekCount })
  } else if (plannedWeekCount > 0 && row.scheduledDayRefs.length === 0) {
    placementSummary = t('planning.calendar.planner.weeksCompact', { n: plannedWeekCount })
  } else if (totalDays > 0) {
    placementSummary = t('planning.calendar.planner.daysCompact', { n: totalDays })
  }

  return {
    ...row,
    placementStatus: props.isAssigned(row)
      ? 'planned'
      : row.isActive
        ? 'needs-planning'
        : 'inactive',
    placementEditState: props.isAssignmentActive(row) ? 'pick-days' : 'idle',
    placementSummary,
    isWholePeriod: wholePeriod,
  }
}

function hasExplicitPlacement(row: PlannerMeasurementRow): boolean {
  return countPlannedWeeks(row) > 0 || row.scheduledDayRefs.length > 0
}

function countPlannedWeeks(row: PlannerMeasurementRow): number {
  return Object.values(row.weekScopeByRef).filter(
    scope => scope === 'whole-week' || scope === 'specific-days'
  ).length
}

function countWholeWeeks(row: PlannerMeasurementRow): number {
  return Object.values(row.weekScopeByRef).filter(scope => scope === 'whole-week').length
}
</script>
