<template>
  <div class="space-y-1.5">
    <!-- Goals tab: goal headers with nested KRs -->
    <template v-if="tab === 'goals'">
      <div v-if="goalSections.length === 0" class="neo-inset rounded-[1.25rem] px-3 py-4 text-sm text-on-surface-variant">
        {{ t('planning.calendar.empty.goals') }}
      </div>

      <div v-for="goal in goalSections" :key="goal.id" class="space-y-1.5">
        <!-- Goal header (always visible, not accordion) -->
        <div
          class="neo-inset rounded-[1.25rem] px-3 py-2.5"
          :class="goal.isActive ? 'ring-1 ring-primary/20' : ''"
        >
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-on-surface">{{ goal.title }}</p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none"
              :class="goal.isActive ? 'bg-primary' : 'bg-outline/30'"
              :aria-label="goal.isActive ? t('planning.calendar.planner.deactivate') : t('planning.calendar.planner.activate')"
              @click="$emit('toggleGoal', goal.id)"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
                :class="goal.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'"
              />
            </button>
          </div>
          <p
            v-if="savingKey === `goal:${goal.id}`"
            class="mt-1 text-[11px] text-on-surface-variant"
          >
            {{ t('common.saving') }}
          </p>
        </div>

        <!-- KRs under this goal -->
        <div v-if="goal.keyResults.length > 0" class="space-y-1 pl-3">
          <PlannerAccordionItem
            v-for="item in goal.keyResults"
            :key="`keyResult:${item.id}`"
            :item="item"
            :is-expanded="expandedItemKey === `keyResult:${item.id}`"
            :assigning="isAssignmentActive(item)"
            :assigned="isAssigned(item)"
            :saving-key="savingKey"
            :parent-enabled="goal.isActive"
            @expand="$emit('updateExpanded', expandedItemKey === `keyResult:${item.id}` ? null : `keyResult:${item.id}`)"
            @toggle="$emit('toggleMeasurement', item)"
            @start-assigning="$emit('startAssigning', item)"
            @target-operator-change="$emit('targetOperatorChange', item, $event)"
            @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
            @target-value-change="$emit('targetValueChange', item, $event)"
            @clear-override="$emit('clearOverride', item)"
          />
        </div>
        <p v-else-if="goal.isActive" class="pl-3 text-xs text-on-surface-variant">
          {{ t('planning.calendar.planner.emptyGoalKeyResults') }}
        </p>
      </div>
    </template>

    <!-- Habits / Trackers tab -->
    <template v-else>
      <div v-if="items.length === 0" class="neo-inset rounded-[1.25rem] px-3 py-4 text-sm text-on-surface-variant">
        {{ tab === 'habits' ? t('planning.calendar.empty.habits') : t('planning.calendar.empty.trackers') }}
      </div>

      <PlannerAccordionItem
        v-for="item in items"
        :key="`${item.subjectType}:${item.id}`"
        :item="item"
        :is-expanded="expandedItemKey === `${item.subjectType}:${item.id}`"
        :assigning="isAssignmentActive(item)"
        :assigned="isAssigned(item)"
        :saving-key="savingKey"
        :parent-enabled="true"
        @expand="$emit('updateExpanded', expandedItemKey === `${item.subjectType}:${item.id}` ? null : `${item.subjectType}:${item.id}`)"
        @toggle="$emit('toggleMeasurement', item)"
        @start-assigning="$emit('startAssigning', item)"
        @target-operator-change="$emit('targetOperatorChange', item, $event)"
        @target-aggregation-change="$emit('targetAggregationChange', item, $event)"
        @target-value-change="$emit('targetValueChange', item, $event)"
        @clear-override="$emit('clearOverride', item)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useT } from '@/composables/useT'
import PlannerAccordionItem from './PlannerAccordionItem.vue'
import type { GoalSection, PlannerMeasurementRow } from './plannerTypes'

defineProps<{
  tab: 'goals' | 'habits' | 'trackers'
  items: PlannerMeasurementRow[]
  goalSections: GoalSection[]
  expandedItemKey: string | null
  savingKey: string
  isAssignmentActive: (item: PlannerMeasurementRow) => boolean
  isAssigned: (item: PlannerMeasurementRow) => boolean
}>()

defineEmits<{
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
</script>
