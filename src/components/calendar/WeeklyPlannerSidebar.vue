<template>
  <div class="flex flex-col px-1 py-1">
    <!-- Segmented tab control -->
    <div class="mb-3 grid grid-cols-3 gap-1 rounded-2xl border border-neu-border/30 bg-neu-base p-1 shadow-neu-pressed-sm">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="flex items-center justify-center rounded-xl px-1.5 py-1.5 text-xs font-semibold transition-all duration-150 neo-focus"
        :class="
          activeTab === tab.key
            ? 'bg-neu-base text-primary-strong shadow-neu-raised-sm'
            : 'text-on-surface-variant hover:text-on-surface'
        "
        @click="$emit('updateTab', tab.key)"
      >
        <span class="truncate">{{ tab.label }}</span>
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
              :whole-label="wholeLabel"
              :whole-applied-label="wholeAppliedLabel"
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
              :whole-label="wholeLabel"
              :whole-applied-label="wholeAppliedLabel"
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
import type { WeeklyPlannerTab } from '@/composables/useWeeklyPlannerState'
import type { WeekRef } from '@/domain/period'

const props = defineProps<{
  activeTab: WeeklyPlannerTab
  weekRef: WeekRef
  keyResultRows: PlannerMeasurementRow[]
  habitRows: PlannerMeasurementRow[]
  trackerRows: PlannerMeasurementRow[]
  savingKey: string
  isAssignmentActive: (item: PlannerMeasurementRow) => boolean
  isAssigned: (item: PlannerMeasurementRow) => boolean
}>()

defineEmits<{
  updateTab: [tab: WeeklyPlannerTab]
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

const wholeLabel = computed(() => t('planning.calendar.planner.scheduleWholeWeek'))
const wholeAppliedLabel = computed(() => t('planning.calendar.planner.scheduledWholeWeek'))

function buildDisplayRow(row: PlannerMeasurementRow): PlannerDisplayRow {
  const weekScope = row.weekScopeByRef[props.weekRef]
  const wholeWeek = weekScope === 'whole-week' && row.scheduledDayRefs.length === 0
  const inheritsMonth =
    row.cadence === 'monthly' &&
    row.monthScheduleScope === 'whole-month' &&
    !weekScope &&
    row.scheduledDayRefs.length === 0

  let placementSummary: string | null = null
  if (wholeWeek) {
    placementSummary = t('planning.calendar.planner.weeksCompact', { n: 1 })
  } else if (row.scheduledDayRefs.length > 0) {
    placementSummary = t('planning.calendar.planner.daysCompact', { n: row.scheduledDayRefs.length })
  } else if (inheritsMonth) {
    placementSummary = t('planning.calendar.planner.fromMonthShort')
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
    isWholePeriod: wholeWeek,
  }
}
</script>
