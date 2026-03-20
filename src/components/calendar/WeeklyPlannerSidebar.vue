<template>
  <div class="flex flex-col px-2 py-1">
    <!-- Tab dropdown -->
    <div class="relative mb-3">
      <button
        ref="triggerEl"
        type="button"
        class="neo-control neo-focus flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-on-surface"
        @click="dropdownOpen = !dropdownOpen"
      >
        {{ activeTabLabel }}
        <AppIcon name="expand_more" class="text-base text-on-surface-variant transition-transform duration-200" :class="dropdownOpen ? 'rotate-180' : ''" />
      </button>
      <Teleport to="body">
        <div
          v-if="dropdownOpen"
          class="fixed inset-0 z-40"
          @click="dropdownOpen = false"
        />
        <div
          v-if="dropdownOpen"
          class="fixed z-50 min-w-[140px] rounded-2xl border border-neu-border/30 bg-neu-base py-1 shadow-neu-raised"
          :style="dropdownStyle"
        >
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-medium transition-colors duration-150 neo-focus"
            :class="activeTab === tab.key ? 'text-primary-strong' : 'text-on-surface hover:bg-section/60'"
            @click="$emit('updateTab', tab.key); dropdownOpen = false"
          >
            {{ tab.label }}
          </button>
        </div>
      </Teleport>
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
import { computed, ref, watch, nextTick } from 'vue'
import { useT } from '@/composables/useT'
import AppIcon from '@/components/shared/AppIcon.vue'
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
const dropdownOpen = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const tabs = computed(() => [
  { key: 'goals' as const, label: t('planning.calendar.planner.steps.goals') },
  { key: 'habits' as const, label: t('planning.calendar.planner.steps.habits') },
  { key: 'trackers' as const, label: t('planning.calendar.planner.steps.trackers') },
  { key: 'initiatives' as const, label: t('planning.calendar.planner.steps.initiatives') },
])

const activeTabLabel = computed(() => tabs.value.find(tab => tab.key === props.activeTab)?.label ?? '')

watch(dropdownOpen, async (open) => {
  if (!open) return
  await nextTick()
  if (!triggerEl.value) return
  const rect = triggerEl.value.getBoundingClientRect()
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
})

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
