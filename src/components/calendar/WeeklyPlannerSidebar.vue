<template>
  <div class="flex flex-col">
    <!-- Tab bar -->
    <div class="neo-segmented mb-3">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="[
          'neo-segmented__item neo-focus',
          activeTab === tab.key ? 'neo-segmented__item--active' : '',
        ]"
        @click="$emit('updateTab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Initiatives tab -->
      <template v-if="activeTab === 'initiatives'">
        <div v-if="initiativeRows.length === 0" class="py-6 text-center text-sm text-on-surface-variant">
          {{ t('planning.calendar.planner.weekly.emptyInitiatives') }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="initiative in initiativeRows"
            :key="initiative.id"
            class="neo-inset rounded-[1.15rem] px-3 py-2.5"
          >
            <p class="text-sm font-semibold text-on-surface">{{ initiative.title }}</p>
            <p v-if="initiative.goalTitle" class="mt-0.5 text-xs text-on-surface-variant">
              {{ t('planning.calendar.labels.goal') }}: {{ initiative.goalTitle }}
            </p>
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                class="neo-pill text-[10px]"
                :class="initiative.isPlannedThisWeek ? 'text-primary-strong' : 'text-on-surface-variant'"
              >
                {{
                  initiative.isPlannedThisWeek
                    ? t('planning.calendar.planner.weekly.initiativePlanned')
                    : t('planning.calendar.planner.weekly.initiativeUnplanned')
                }}
              </span>
              <span v-if="initiative.assignedDayRefs.length > 0" class="neo-pill text-[10px] text-on-surface-variant">
                {{ t('planning.calendar.planner.weekly.dayAssignments', { n: initiative.assignedDayRefs.length }) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Measurement tabs (goals, habits, trackers) -->
      <template v-else>
        <PlannerCategorySummary
          v-if="isCategoryComplete && !forceExpanded"
          :category-label="categoryLabel"
          :total-count="activeItemCount"
          @expand="forceExpanded = true"
        />

        <PlannerCategoryTab
          v-else
          :tab="activeTab"
          :items="currentItems"
          :goal-sections="goalSections"
          :expanded-item-key="expandedItemKey"
          :saving-key="savingKey"
          :is-assignment-active="isAssignmentActive"
          :is-assigned="isAssigned"
          @update-expanded="$emit('updateExpanded', $event)"
          @toggle-goal="() => {}"
          @toggle-measurement="$emit('toggleMeasurement', $event)"
          @start-assigning="$emit('startAssigning', $event)"
          @target-operator-change="(item, val) => $emit('targetOperatorChange', item, val)"
          @target-aggregation-change="(item, val) => $emit('targetAggregationChange', item, val)"
          @target-value-change="(item, val) => $emit('targetValueChange', item, val)"
          @clear-override="$emit('clearOverride', $event)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import PlannerCategoryTab from './PlannerCategoryTab.vue'
import PlannerCategorySummary from './PlannerCategorySummary.vue'
import type { GoalSection, PlannerInitiativeRow, PlannerMeasurementRow } from './plannerTypes'
import type { WeeklyPlannerTab } from '@/composables/useWeeklyPlannerState'

const props = defineProps<{
  activeTab: WeeklyPlannerTab
  goalSections: GoalSection[]
  habitRows: PlannerMeasurementRow[]
  trackerRows: PlannerMeasurementRow[]
  initiativeRows: PlannerInitiativeRow[]
  expandedItemKey: string | null
  savingKey: string
  isAssignmentActive: (item: PlannerMeasurementRow) => boolean
  isAssigned: (item: PlannerMeasurementRow) => boolean
}>()

defineEmits<{
  updateTab: [tab: WeeklyPlannerTab]
  updateExpanded: [key: string | null]
  toggleMeasurement: [item: PlannerMeasurementRow]
  startAssigning: [item: PlannerMeasurementRow]
  targetOperatorChange: [item: PlannerMeasurementRow, value: string]
  targetAggregationChange: [item: PlannerMeasurementRow, value: string]
  targetValueChange: [item: PlannerMeasurementRow, value: number]
  clearOverride: [item: PlannerMeasurementRow]
}>()

const { t } = useT()

const forceExpanded = ref(false)

const tabs = computed(() => [
  { key: 'goals' as const, label: t('planning.calendar.planner.steps.goals') },
  { key: 'habits' as const, label: t('planning.calendar.planner.steps.habits') },
  { key: 'trackers' as const, label: t('planning.calendar.planner.steps.trackers') },
  { key: 'initiatives' as const, label: t('planning.calendar.planner.steps.initiatives') },
])

const currentItems = computed(() => {
  if (props.activeTab === 'habits') return props.habitRows
  if (props.activeTab === 'trackers') return props.trackerRows
  return []
})

const categoryLabel = computed(() => {
  const key = `planning.calendar.planner.steps.${props.activeTab}` as const
  return t(key)
})

const activeItemsForTab = computed(() => {
  if (props.activeTab === 'goals') {
    return props.goalSections.flatMap(g => g.keyResults).filter(item => item.isActive)
  }
  if (props.activeTab === 'initiatives') return []
  return currentItems.value.filter(item => item.isActive)
})

const activeItemCount = computed(() => activeItemsForTab.value.length)

const isCategoryComplete = computed(() => {
  if (props.activeTab === 'initiatives') return false
  if (activeItemsForTab.value.length === 0) return false
  return activeItemsForTab.value.every(item => props.isAssigned(item))
})

watch(() => props.activeTab, () => {
  forceExpanded.value = false
})
</script>
