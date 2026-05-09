<template>
  <section data-testid="monthly-planner" class="space-y-3">
    <PlanningStatePanel
      v-if="planner.isLoading.value"
      compact
      :title="t('common.loading')"
      :body="t('planning.calendar.planner.description')"
      :eyebrow="t('planning.calendar.planner.eyebrow')"
    />

    <PlanningStatePanel
      v-else-if="planner.loadError.value"
      compact
      :title="t('planning.calendar.planner.loadError')"
      :body="planner.loadError.value"
      :eyebrow="t('planning.calendar.planner.eyebrow')"
      :action-label="t('common.buttons.tryAgain')"
      @action="void planner.loadPlannerData()"
    />

    <div
      v-else
      class="grid gap-5"
      :class="showSidebar ? 'xl:grid-cols-[minmax(220px,18rem)_minmax(0,1fr)]' : 'grid-cols-1'"
    >
      <PlannerSidebar
        v-if="showSidebar"
        data-testid="monthly-planner-sidebar"
        class="neo-scroll w-full shrink-0 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto"
        :active-tab="activeTab"
        :key-result-rows="planner.keyResultRows.value"
        :habit-rows="planner.habitRows.value"
        :tracker-rows="planner.trackerRows.value"
        :priorities="planner.priorityOptions.value"
        :saving-key="planner.savingKey.value"
        :is-assignment-active="planner.isAssignmentActive"
        :is-assigned="planner.isAssigned"
        :month-week-count="planner.calendarWeeks.value.length"
        @update-tab="handleTabChange"
        @toggle-measurement="planner.toggleMeasurement"
        @apply-whole-period="planner.applyWholePeriod"
        @start-assigning="planner.toggleAssigning"
        @target-operator-change="(item, val) => planner.handleTargetOperatorChange(item, val)"
        @target-aggregation-change="(item, val) => planner.handleTargetAggregationChange(item, val)"
        @target-value-change="(item, val) => planner.handleTargetValueChange(item, val)"
        @clear-override="planner.handleClearOverride"
      />

      <PlannerCalendarGrid
        class="min-w-0 flex-1"
        :calendar-weeks="planner.calendarWeeks.value"
        :assignment-row="planner.assignmentRow.value"
        :weekday-headers="planner.weekdayHeaders.value"
        :row-visible-on-day="planner.rowVisibleOnDay"
        :can-toggle-week="planner.canToggleWeek()"
        :can-toggle-day="planner.canToggleDay"
        @week-toggle="planner.handleWeekToggle"
        @day-toggle="planner.handleDayToggle"
        @clear-placement="planner.handleClearPlacement"
        @finish-assigning="handleFinishAssigning"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import PlannerSidebar from './PlannerSidebar.vue'
import PlannerCalendarGrid from './PlannerCalendarGrid.vue'
import { useT } from '@/composables/useT'
import { usePlannerState } from '@/composables/usePlannerState'
import type { MonthRef } from '@/domain/period'

const props = defineProps<{
  monthRef: MonthRef
  showSidebar?: boolean
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { t, locale } = useT()

const monthRefRef = computed(() => props.monthRef as MonthRef)

const planner = usePlannerState(monthRefRef, locale, () => emit('updated'))

const activeTab = ref<'goals' | 'habits' | 'trackers'>('goals')

function handleTabChange(tab: 'goals' | 'habits' | 'trackers') {
  planner.stopAssigning()
  activeTab.value = tab
}

function handleFinishAssigning() {
  planner.stopAssigning()
}
</script>
