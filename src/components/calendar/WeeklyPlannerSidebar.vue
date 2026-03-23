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

    <div class="flex-1 overflow-y-auto">
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
                class="neo-pill px-2 py-0.5 text-[10px]"
                :class="initiative.isPlannedThisWeek ? 'neo-pill--primary text-primary' : ''"
              >
                {{
                  initiative.isPlannedThisWeek
                    ? t('planning.calendar.planner.weekly.initiativePlanned')
                    : t('planning.calendar.planner.weekly.initiativeUnplanned')
                }}
              </span>
              <span v-if="initiative.assignedDayRefs.length > 0" class="neo-pill px-2 py-0.5 text-[10px] text-on-surface-variant">
                {{ t('planning.calendar.planner.weekly.dayAssignments', { n: initiative.assignedDayRefs.length }) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="activeTab === 'goals'">
        <div
          v-if="goalSections.length === 0"
          class="neo-inset rounded-[1.25rem] px-3 py-4 text-sm text-on-surface-variant"
        >
          {{ t('planning.calendar.empty.goals') }}
        </div>

        <div v-else class="space-y-2.5">
          <div v-for="goal in goalSections" :key="goal.id" class="space-y-2">
            <article
              class="rounded-[1.25rem] border border-neu-border/30 px-3 py-2.5 transition-all duration-200"
              :class="goal.isActive ? 'bg-primary/4 shadow-neu-raised-sm' : 'bg-neu-base shadow-neu-raised-sm'"
            >
              <div class="flex items-center gap-2.5">
                <button
                  type="button"
                  class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none"
                  :class="goal.isActive ? 'bg-primary' : 'bg-outline/30'"
                  :aria-label="goal.isActive ? t('planning.calendar.planner.deactivate') : t('planning.calendar.planner.activate')"
                  disabled
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                    :class="goal.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'"
                  />
                </button>

                <p class="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">
                  {{ goal.title }}
                </p>

                <button
                  type="button"
                  class="neo-icon-button neo-focus h-9 w-9 rounded-xl"
                  :class="isGoalExpanded(goal.id) ? 'shadow-neu-pressed text-primary' : ''"
                  :aria-label="
                    isGoalExpanded(goal.id)
                      ? t('planning.calendar.planner.collapseGoal')
                      : t('planning.calendar.planner.expandGoal')
                  "
                  @click="toggleGoal(goal.id)"
                >
                  <AppIcon
                    name="expand_more"
                    class="text-sm transition-transform duration-200"
                    :class="isGoalExpanded(goal.id) ? 'rotate-180' : ''"
                  />
                </button>
              </div>
            </article>

            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="max-h-0 opacity-0"
              enter-to-class="max-h-[1000px] opacity-100"
              leave-from-class="max-h-[1000px] opacity-100"
              leave-to-class="max-h-0 opacity-0"
            >
              <div v-if="isGoalExpanded(goal.id)" class="space-y-3 overflow-hidden pl-3">
                <p
                  v-if="goal.keyResults.length === 0 && goal.isActive"
                  class="px-1 text-xs text-on-surface-variant"
                >
                  {{ t('planning.calendar.planner.emptyGoalKeyResults') }}
                </p>

                <div v-if="goalNeedsPlanning(goal).length > 0" class="space-y-2">
                  <div class="flex items-center justify-between px-1">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {{ t('planning.calendar.planner.groups.needsPlanning') }}
                    </p>
                    <span class="text-[11px] text-on-surface-variant">{{ goalNeedsPlanning(goal).length }}</span>
                  </div>

                  <PlannerMeasurementRowCard
                    v-for="item in goalNeedsPlanning(goal)"
                    :key="`${goal.id}:${item.subjectType}:${item.id}:needs`"
                    :row="item"
                    :whole-label="t('planning.calendar.planner.weekly.wholeWeek')"
                    :pick-days-label="t('planning.calendar.planner.pickDays')"
                    @toggle="$emit('toggleMeasurement', item)"
                    @apply-whole-period="$emit('applyWholePeriod', item)"
                    @start-assigning="$emit('startAssigning', item, $event)"
                    @target-operator-change="$emit('targetOperatorChange', item, $event)"
                    @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
                    @target-value-change="$emit('targetValueChange', item, $event)"
                    @clear-override="$emit('clearOverride', item)"
                  />
                </div>

                <div v-if="goalPlanned(goal).length > 0" class="space-y-2">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-success transition-colors hover:bg-success/6"
                    @click="togglePlannedGroup(`goal:${goal.id}`)"
                  >
                    <span>{{ t('planning.calendar.planner.groups.planned') }}</span>
                    <span class="flex items-center gap-1.5 text-on-surface-variant">
                      {{ goalPlanned(goal).length }}
                      <AppIcon
                        name="expand_more"
                        class="text-sm transition-transform duration-200"
                        :class="isPlannedGroupOpen(`goal:${goal.id}`) ? 'rotate-180' : ''"
                      />
                    </span>
                  </button>

                  <div v-if="isPlannedGroupOpen(`goal:${goal.id}`)" class="space-y-2">
                    <PlannerMeasurementRowCard
                      v-for="item in goalPlanned(goal)"
                      :key="`${goal.id}:${item.subjectType}:${item.id}:planned`"
                      :row="item"
                      :whole-label="t('planning.calendar.planner.weekly.wholeWeek')"
                      :pick-days-label="t('planning.calendar.planner.pickDays')"
                      @toggle="$emit('toggleMeasurement', item)"
                      @apply-whole-period="$emit('applyWholePeriod', item)"
                      @start-assigning="$emit('startAssigning', item, $event)"
                      @target-operator-change="$emit('targetOperatorChange', item, $event)"
                      @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
                      @target-value-change="$emit('targetValueChange', item, $event)"
                      @clear-override="$emit('clearOverride', item)"
                    />
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-if="currentRows.length === 0"
          class="neo-inset rounded-[1.25rem] px-3 py-4 text-sm text-on-surface-variant"
        >
          {{ activeTab === 'habits' ? t('planning.calendar.empty.habits') : t('planning.calendar.empty.trackers') }}
        </div>

        <div v-else class="space-y-3">
          <div v-if="needsPlanningRows.length > 0" class="space-y-2">
            <div class="flex items-center justify-between px-1">
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {{ t('planning.calendar.planner.groups.needsPlanning') }}
              </p>
              <span class="text-[11px] text-on-surface-variant">{{ needsPlanningRows.length }}</span>
            </div>

            <PlannerMeasurementRowCard
              v-for="item in needsPlanningRows"
              :key="`${item.subjectType}:${item.id}:needs`"
              :row="item"
              :whole-label="t('planning.calendar.planner.weekly.wholeWeek')"
              :pick-days-label="t('planning.calendar.planner.pickDays')"
              @toggle="$emit('toggleMeasurement', item)"
              @apply-whole-period="$emit('applyWholePeriod', item)"
              @start-assigning="$emit('startAssigning', item, $event)"
              @target-operator-change="$emit('targetOperatorChange', item, $event)"
              @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
              @target-value-change="$emit('targetValueChange', item, $event)"
              @clear-override="$emit('clearOverride', item)"
            />
          </div>

          <div v-if="plannedRows.length > 0" class="space-y-2">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-success transition-colors hover:bg-success/6"
              @click="togglePlannedGroup('flat')"
            >
              <span>{{ t('planning.calendar.planner.groups.planned') }}</span>
              <span class="flex items-center gap-1.5 text-on-surface-variant">
                {{ plannedRows.length }}
                <AppIcon
                  name="expand_more"
                  class="text-sm transition-transform duration-200"
                  :class="isPlannedGroupOpen('flat') ? 'rotate-180' : ''"
                />
              </span>
            </button>

            <div v-if="isPlannedGroupOpen('flat')" class="space-y-2">
              <PlannerMeasurementRowCard
                v-for="item in plannedRows"
                :key="`${item.subjectType}:${item.id}:planned`"
                :row="item"
                :whole-label="t('planning.calendar.planner.weekly.wholeWeek')"
                :pick-days-label="t('planning.calendar.planner.pickDays')"
                @toggle="$emit('toggleMeasurement', item)"
                @apply-whole-period="$emit('applyWholePeriod', item)"
                @start-assigning="$emit('startAssigning', item, $event)"
                @target-operator-change="$emit('targetOperatorChange', item, $event)"
                @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
                @target-value-change="$emit('targetValueChange', item, $event)"
                @clear-override="$emit('clearOverride', item)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useT } from '@/composables/useT'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlannerMeasurementRowCard from './PlannerMeasurementRow.vue'
import type { GoalSection, PlannerDisplayRow, PlannerInitiativeRow, PlannerMeasurementRow, PlannerPlacementMode } from './plannerTypes'
import type { WeeklyPlannerTab } from '@/composables/useWeeklyPlannerState'

const props = defineProps<{
  activeTab: WeeklyPlannerTab
  goalSections: GoalSection[]
  habitRows: PlannerMeasurementRow[]
  trackerRows: PlannerMeasurementRow[]
  initiativeRows: PlannerInitiativeRow[]
  savingKey: string
  assignmentMode: PlannerPlacementMode | null
  isAssignmentActive: (item: PlannerMeasurementRow) => boolean
  isAssigned: (item: PlannerMeasurementRow) => boolean
}>()

defineEmits<{
  updateTab: [tab: WeeklyPlannerTab]
  toggleMeasurement: [item: PlannerMeasurementRow]
  applyWholePeriod: [item: PlannerMeasurementRow]
  startAssigning: [item: PlannerMeasurementRow, mode: PlannerPlacementMode]
  targetOperatorChange: [item: PlannerMeasurementRow, value: string]
  targetAggregationChange: [item: PlannerMeasurementRow, value: string]
  targetValueChange: [item: PlannerMeasurementRow, value: number]
  clearOverride: [item: PlannerMeasurementRow]
}>()

const { t } = useT()

const expandedGoalId = ref<string | null>(null)
const openPlannedGroups = ref<Record<string, boolean>>({})
const dropdownOpen = ref(false)
const triggerEl = ref<HTMLButtonElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

const tabs = computed(() => [
  { key: 'goals' as const, label: t('planning.calendar.planner.steps.goals') },
  { key: 'habits' as const, label: t('planning.calendar.planner.steps.habits') },
  { key: 'trackers' as const, label: t('planning.calendar.planner.steps.trackers') },
  { key: 'initiatives' as const, label: t('planning.calendar.planner.steps.initiatives') },
])

const activeTabLabel = computed(() => tabs.value.find(tab => tab.key === props.activeTab)?.label ?? '')

const currentRows = computed(() => {
  if (props.activeTab === 'habits') return props.habitRows
  if (props.activeTab === 'trackers') return props.trackerRows
  return []
})

const allDisplayRows = computed(() => currentRows.value.map(row => buildDisplayRow(row)))
const needsPlanningRows = computed(() => allDisplayRows.value.filter(row => row.placementStatus !== 'planned'))
const plannedRows = computed(() => allDisplayRows.value.filter(row => row.placementStatus === 'planned'))

function positionDropdown(): void {
  if (!triggerEl.value) return
  const rect = triggerEl.value.getBoundingClientRect()
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

watch(dropdownOpen, (open) => { if (open) nextTick(positionDropdown) })

onMounted(() => {
  window.addEventListener('scroll', positionDropdown, true)
  window.addEventListener('resize', positionDropdown)
})

onUnmounted(() => {
  window.removeEventListener('scroll', positionDropdown, true)
  window.removeEventListener('resize', positionDropdown)
})

function toggleGoal(goalId: string): void {
  expandedGoalId.value = expandedGoalId.value === goalId ? null : goalId
}

function isGoalExpanded(goalId: string): boolean {
  return expandedGoalId.value === goalId
}

function togglePlannedGroup(groupId: string): void {
  openPlannedGroups.value[groupId] = !openPlannedGroups.value[groupId]
}

function isPlannedGroupOpen(groupId: string): boolean {
  return Boolean(openPlannedGroups.value[groupId])
}

function goalNeedsPlanning(goal: GoalSection): PlannerDisplayRow[] {
  return goal.keyResults.map(row => buildDisplayRow(row)).filter(row => row.placementStatus !== 'planned')
}

function goalPlanned(goal: GoalSection): PlannerDisplayRow[] {
  return goal.keyResults.map(row => buildDisplayRow(row)).filter(row => row.placementStatus === 'planned')
}

function buildDisplayRow(row: PlannerMeasurementRow): PlannerDisplayRow {
  const wholeWeek = row.weekScopeByRef && Object.values(row.weekScopeByRef).includes('whole-week') && row.scheduledDayRefs.length === 0
  const placementSummary = row.scheduledDayRefs.length > 0
    ? t('planning.calendar.planner.daysCompact', { n: row.scheduledDayRefs.length })
    : wholeWeek
      ? t('planning.calendar.planner.weekly.wholeWeek')
      : row.monthScheduleScope === 'whole-month' && row.cadence === 'monthly'
        ? t('planning.calendar.planner.fromMonthShort')
        : null

  return {
    ...row,
    placementStatus: props.isAssigned(row)
      ? 'planned'
      : row.isActive
        ? 'needs-planning'
        : 'inactive',
    placementEditState: props.isAssignmentActive(row)
      ? 'pick-days'
      : 'idle',
    placementSummary,
    isWholePeriod: wholeWeek,
  }
}
</script>
