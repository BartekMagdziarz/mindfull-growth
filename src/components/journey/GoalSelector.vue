<template>
  <div class="space-y-3">
    <div v-if="label" class="flex items-center justify-between">
      <label class="text-sm font-medium text-on-surface">{{ label }}</label>
      <span class="text-xs text-on-surface-variant">
        {{ selectedGoalIds.length }} selected
      </span>
    </div>

    <p v-if="description" class="text-sm text-on-surface-variant">
      {{ description }}
    </p>

    <!-- Goal list -->
    <div class="space-y-2 max-h-60 overflow-y-auto">
      <div
        v-for="goal in availableGoals"
        :key="goal.id"
        @click="toggleGoal(goal.id)"
        :class="[
          'p-3 rounded-xl border cursor-pointer transition-all',
          isSelected(goal.id)
            ? 'border-primary bg-primary/5'
            : 'border-outline/30 hover:bg-section'
        ]"
      >
        <div class="flex items-center gap-3">
          <!-- Checkbox -->
          <div
            :class="[
              'w-5 h-5 rounded flex items-center justify-center flex-shrink-0',
              isSelected(goal.id)
                ? 'bg-primary text-white'
                : 'border-2 border-outline/50'
            ]"
          >
            <CheckIcon v-if="isSelected(goal.id)" class="w-3 h-3" />
          </div>

          <!-- Goal info -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-on-surface truncate">{{ goal.title }}</p>
            <p v-if="goal.description" class="text-xs text-on-surface-variant truncate">
              {{ goal.description }}
            </p>
          </div>

          <!-- Period badge -->
          <span :class="['text-xs px-2 py-0.5 rounded-full flex-shrink-0', getPeriodBadgeClass(goal.sourcePeriodType)]">
            {{ goal.sourcePeriodType }}
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="availableGoals.length === 0"
        class="text-center py-6 text-on-surface-variant"
      >
        <p>No goals available to select</p>
        <p v-if="filterPeriodType" class="text-xs mt-1">
          Try creating {{ filterPeriodType }} goals first
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/outline'
import type { CascadingGoal } from '@/domain/lifeSeasons'
import type { PeriodicEntryType } from '@/domain/periodicEntry'

interface Props {
  goals: CascadingGoal[]
  selectedGoalIds: string[]
  label?: string
  description?: string
  filterPeriodType?: PeriodicEntryType
  filterStatus?: 'active' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  description: undefined,
  filterPeriodType: undefined,
  filterStatus: 'active',
})

const emit = defineEmits<{
  'update:selectedGoalIds': [ids: string[]]
}>()

const availableGoals = computed(() => {
  let filtered = props.goals

  // Filter by status
  if (props.filterStatus === 'active') {
    filtered = filtered.filter((g) => g.status === 'active')
  }

  // Filter by period type
  if (props.filterPeriodType) {
    filtered = filtered.filter((g) => g.sourcePeriodType === props.filterPeriodType)
  }

  return filtered
})

function isSelected(goalId: string): boolean {
  return props.selectedGoalIds.includes(goalId)
}

function toggleGoal(goalId: string) {
  if (isSelected(goalId)) {
    emit(
      'update:selectedGoalIds',
      props.selectedGoalIds.filter((id) => id !== goalId)
    )
  } else {
    emit('update:selectedGoalIds', [...props.selectedGoalIds, goalId])
  }
}

function getPeriodBadgeClass(type: PeriodicEntryType): string {
  switch (type) {
    case 'yearly':
      return 'bg-purple-100 text-purple-700'
    case 'quarterly':
      return 'bg-blue-100 text-blue-700'
    case 'weekly':
      return 'bg-green-100 text-green-700'
    case 'daily':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>
