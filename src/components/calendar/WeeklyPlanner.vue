<template>
  <section data-testid="weekly-planner" class="space-y-3">
    <PlanningStatePanel
      v-if="planner.isLoading.value"
      compact
      :title="t('common.loading')"
      :body="t('planning.calendar.planner.weekly.description')"
      :eyebrow="t('planning.calendar.planner.weekly.eyebrow')"
    />

    <PlanningStatePanel
      v-else-if="planner.loadError.value"
      compact
      :title="t('planning.calendar.planner.weekly.loadError')"
      :body="planner.loadError.value"
      :eyebrow="t('planning.calendar.planner.weekly.eyebrow')"
      :action-label="t('common.buttons.tryAgain')"
      @action="void planner.loadPlannerData()"
    />

    <div
      v-else
      class="grid items-start gap-5"
      :class="showSidebar ? 'xl:grid-cols-[minmax(220px,18rem)_minmax(0,1fr)]' : 'grid-cols-1'"
    >
      <WeeklyPlannerSidebar
        v-if="showSidebar"
        data-testid="weekly-planner-sidebar"
        class="w-full shrink-0 xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto"
        :active-tab="activeTab"
        :goal-sections="planner.goalSections.value"
        :habit-rows="planner.habitRows.value"
        :tracker-rows="planner.trackerRows.value"
        :initiative-rows="planner.initiativeRows.value"
        :saving-key="planner.savingKey.value"
        :is-assignment-active="planner.isAssignmentActive"
        :is-assigned="planner.isAssigned"
        :assignment-mode="planner.activeAssignment.value?.mode ?? null"
        @update-tab="handleTabChange"
        @toggle-measurement="planner.toggleMeasurement"
        @apply-whole-period="planner.applyWholePeriod"
        @start-assigning="handleStartAssigning"
        @target-operator-change="(item, val) => planner.handleTargetOperatorChange(item, val)"
        @target-aggregation-change="(item, val) => planner.handleTargetAggregationChange(item, val)"
        @target-value-change="(item, val) => planner.handleTargetValueChange(item, val)"
        @clear-override="planner.handleClearOverride"
      />

      <WeeklyPlannerDayGrid
        class="min-w-0 flex-1"
        :calendar-days="planner.calendarDays.value"
        :assignment-row="planner.assignmentRow.value"
        :assignment-mode="planner.activeAssignment.value?.mode ?? null"
        :weekday-headers="planner.weekdayHeaders.value"
        :row-visible-on-day="planner.rowVisibleOnDay"
        :can-toggle-day="planner.canToggleDay"
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
import WeeklyPlannerSidebar from './WeeklyPlannerSidebar.vue'
import WeeklyPlannerDayGrid from './WeeklyPlannerDayGrid.vue'
import { useT } from '@/composables/useT'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import type { WeeklyPlannerTab } from '@/composables/useWeeklyPlannerState'
import type { WeekRef } from '@/domain/period'
import type { PlannerMeasurementRow, PlannerPlacementMode } from './plannerTypes'

const props = defineProps<{
  weekRef: WeekRef
  showSidebar?: boolean
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { t, locale } = useT()

const weekRefRef = computed(() => props.weekRef as WeekRef)

const planner = useWeeklyPlannerState(weekRefRef, locale, () => emit('updated'))

const activeTab = ref<WeeklyPlannerTab>('goals')

function handleTabChange(tab: WeeklyPlannerTab) {
  planner.stopAssigning()
  activeTab.value = tab
}

function handleStartAssigning(item: PlannerMeasurementRow, mode: PlannerPlacementMode) {
  planner.startAssigning(item, mode)
}

function handleFinishAssigning() {
  planner.stopAssigning()
}
</script>
