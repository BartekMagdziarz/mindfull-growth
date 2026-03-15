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
      <!-- Priorities (always visible above tabs content) -->
      <section v-if="priorities.length > 0" class="mb-3 space-y-1.5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
          {{ t('planning.calendar.planner.prioritiesTitle') }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="priority in priorities"
            :key="priority.id"
            class="rounded-full bg-section px-2.5 py-1 text-xs font-medium text-on-surface"
          >
            {{ priority.title }}
          </span>
        </div>
      </section>

      <!-- Category summary (when all done) or items list -->
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
        @toggle-goal="$emit('toggleGoal', $event)"
        @toggle-measurement="$emit('toggleMeasurement', $event)"
        @start-assigning="$emit('startAssigning', $event)"
        @target-operator-change="(item, val) => $emit('targetOperatorChange', item, val)"
        @target-aggregation-change="(item, val) => $emit('targetAggregationChange', item, val)"
        @target-value-change="(item, val) => $emit('targetValueChange', item, val)"
        @clear-override="$emit('clearOverride', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useT } from '@/composables/useT'
import PlannerCategoryTab from './PlannerCategoryTab.vue'
import PlannerCategorySummary from './PlannerCategorySummary.vue'
import type { GoalSection, PlannerMeasurementRow } from './plannerTypes'
import type { Priority } from '@/domain/planning'

const props = defineProps<{
  activeTab: 'goals' | 'habits' | 'trackers'
  goalSections: GoalSection[]
  habitRows: PlannerMeasurementRow[]
  trackerRows: PlannerMeasurementRow[]
  priorities: Priority[]
  expandedItemKey: string | null
  savingKey: string
  isAssignmentActive: (item: PlannerMeasurementRow) => boolean
  isAssigned: (item: PlannerMeasurementRow) => boolean
}>()

defineEmits<{
  updateTab: [tab: 'goals' | 'habits' | 'trackers']
  updateExpanded: [key: string | null]
  toggleGoal: [goalId: string]
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
  return currentItems.value.filter(item => item.isActive)
})

const activeItemCount = computed(() => activeItemsForTab.value.length)

const isCategoryComplete = computed(() => {
  if (activeItemsForTab.value.length === 0) return false
  return activeItemsForTab.value.every(item => props.isAssigned(item))
})

watch(() => props.activeTab, () => {
  forceExpanded.value = false
})
</script>
