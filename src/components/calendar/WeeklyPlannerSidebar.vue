<template>
  <div class="flex flex-col px-2 py-1">
    <div class="neo-segmented flex w-full flex-wrap">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="neo-segmented__item neo-focus flex-1"
        :class="{ 'neo-segmented__item--active': activeTab === tab.key }"
        @click="$emit('updateTab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="mt-3 flex-1 overflow-y-auto">
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
              class="rounded-[1.25rem] border px-3 py-2.5 transition-all duration-200"
              :class="goal.isActive ? 'border-primary/18 bg-primary/6' : 'border-outline/10 bg-section/35'"
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

                <template v-for="section in goalDisplaySections(goal)" :key="`${goal.id}:${section.id}`">
                  <section v-if="section.needsPlanning.length > 0 || section.planned.length > 0" class="space-y-2">
                    <div class="flex items-center gap-2 px-1">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        {{ section.label }}
                      </p>
                      <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
                        {{ section.needsPlanning.length + section.planned.length }}
                      </span>
                    </div>

                    <div v-if="section.needsPlanning.length > 0" class="space-y-2">
                      <div class="flex items-center justify-between px-1">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {{ t('planning.calendar.planner.groups.needsPlanning') }}
                        </p>
                        <span class="text-[11px] text-on-surface-variant">{{ section.needsPlanning.length }}</span>
                      </div>

                      <PlannerMeasurementRowCard
                        v-for="item in section.needsPlanning"
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

                    <div v-if="section.planned.length > 0" class="space-y-2">
                      <button
                        type="button"
                        class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-success transition-colors hover:bg-success/6"
                        @click="togglePlannedGroup(`goal:${goal.id}:${section.id}`)"
                      >
                        <span>{{ t('planning.calendar.planner.groups.planned') }}</span>
                        <span class="flex items-center gap-1.5 text-on-surface-variant">
                          {{ section.planned.length }}
                          <AppIcon
                            name="expand_more"
                            class="text-sm transition-transform duration-200"
                            :class="isPlannedGroupOpen(`goal:${goal.id}:${section.id}`) ? 'rotate-180' : ''"
                          />
                        </span>
                      </button>

                      <div v-if="isPlannedGroupOpen(`goal:${goal.id}:${section.id}`)" class="space-y-2">
                        <PlannerMeasurementRowCard
                          v-for="item in section.planned"
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
                  </section>
                </template>
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
          <section
            v-for="section in groupedSections"
            :key="section.id"
            v-show="section.needsPlanning.length > 0 || section.planned.length > 0"
            class="space-y-2"
          >
            <div class="flex items-center gap-2 px-1">
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ section.label }}
              </p>
              <span class="neo-pill px-2 py-0.5 text-[10px] font-semibold">
                {{ section.needsPlanning.length + section.planned.length }}
              </span>
            </div>

            <div v-if="section.needsPlanning.length > 0" class="space-y-2">
              <div class="flex items-center justify-between px-1">
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {{ t('planning.calendar.planner.groups.needsPlanning') }}
                </p>
                <span class="text-[11px] text-on-surface-variant">{{ section.needsPlanning.length }}</span>
              </div>

              <PlannerMeasurementRowCard
                v-for="item in section.needsPlanning"
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

            <div v-if="section.planned.length > 0" class="space-y-2">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-success transition-colors hover:bg-success/6"
                @click="togglePlannedGroup(section.id)"
              >
                <span>{{ t('planning.calendar.planner.groups.planned') }}</span>
                <span class="flex items-center gap-1.5 text-on-surface-variant">
                  {{ section.planned.length }}
                  <AppIcon
                    name="expand_more"
                    class="text-sm transition-transform duration-200"
                    :class="isPlannedGroupOpen(section.id) ? 'rotate-180' : ''"
                  />
                </span>
              </button>

              <div v-if="isPlannedGroupOpen(section.id)" class="space-y-2">
                <PlannerMeasurementRowCard
                  v-for="item in section.planned"
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
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useT } from '@/composables/useT'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlannerMeasurementRowCard from './PlannerMeasurementRow.vue'
import type { GoalSection, PlannerDisplayRow, PlannerInitiativeRow, PlannerMeasurementRow, PlannerPlacementMode, PlannerSectionRows } from './plannerTypes'
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

const tabs = computed(() => [
  { key: 'goals' as const, label: t('planning.calendar.planner.steps.goals') },
  { key: 'habits' as const, label: t('planning.calendar.planner.steps.habits') },
  { key: 'trackers' as const, label: t('planning.calendar.planner.steps.trackers') },
  { key: 'initiatives' as const, label: t('planning.calendar.planner.steps.initiatives') },
])

const currentRows = computed(() => {
  if (props.activeTab === 'habits') return props.habitRows
  if (props.activeTab === 'trackers') return props.trackerRows
  return []
})

const groupedSections = computed(() => buildWeekSections(currentRows.value))

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

function goalDisplaySections(goal: GoalSection): PlannerSectionRows[] {
  return buildWeekSections(goal.keyResults)
}

function buildWeekSections(rows: PlannerMeasurementRow[]): PlannerSectionRows[] {
  return [
    makeSection('this-week', t('planning.calendar.planner.groups.thisWeek'), rows.filter(row => row.cadence === 'weekly')),
    makeSection('from-month', t('planning.calendar.planner.groups.fromMonth'), rows.filter(row => row.cadence === 'monthly')),
  ].filter(section => section.needsPlanning.length > 0 || section.planned.length > 0)
}

function makeSection(id: string, label: string, rows: PlannerMeasurementRow[]): PlannerSectionRows {
  const displayRows = rows.map(row =>
    buildDisplayRow(
      row,
      row.cadence === 'weekly'
        ? t('planning.calendar.planner.groups.thisWeek')
        : t('planning.calendar.planner.groups.fromMonth')
    )
  )

  return {
    id,
    label,
    needsPlanning: displayRows.filter(row => row.placementStatus !== 'planned'),
    planned: displayRows.filter(row => row.placementStatus === 'planned'),
  }
}

function buildDisplayRow(row: PlannerMeasurementRow, contextLabel: string): PlannerDisplayRow {
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
    contextLabel,
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
