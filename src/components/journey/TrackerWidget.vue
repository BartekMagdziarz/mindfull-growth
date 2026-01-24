<template>
  <div
    @click="handleClick"
    :class="[
      'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
      isComplete
        ? 'bg-green-50 border border-green-200'
        : 'bg-section border border-outline/30 hover:bg-surface-container'
    ]"
  >
    <!-- Tracker icon/indicator -->
    <div
      :class="[
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        isComplete ? 'bg-green-500 text-white' : 'bg-outline/20 text-on-surface-variant'
      ]"
    >
      <CheckIcon v-if="isComplete && tracker.type === 'boolean'" class="w-5 h-5" />
      <span v-else-if="tracker.type === 'count'" class="text-sm font-medium">
        {{ currentValue || 0 }}
      </span>
      <span v-else class="text-sm font-medium">
        {{ currentValue || '-' }}
      </span>
    </div>

    <!-- Tracker info -->
    <div class="flex-1 min-w-0">
      <p class="font-medium text-on-surface truncate">{{ tracker.name }}</p>
      <p class="text-xs text-on-surface-variant">
        <template v-if="tracker.type === 'boolean'">
          {{ isComplete ? 'Completed' : 'Not yet' }}
        </template>
        <template v-else-if="tracker.type === 'count'">
          {{ currentValue || 0 }}<span v-if="tracker.targetValue"> / {{ tracker.targetValue }}</span>
          <span v-if="tracker.unit"> {{ tracker.unit }}</span>
        </template>
        <template v-else>
          {{ currentValue || 0 }} / 10
        </template>
      </p>
    </div>

    <!-- Quick action -->
    <div class="flex-shrink-0">
      <template v-if="tracker.type === 'boolean'">
        <div
          :class="[
            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
            isComplete
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-outline/50 hover:border-primary'
          ]"
        >
          <CheckIcon v-if="isComplete" class="w-4 h-4" />
        </div>
      </template>
      <template v-else>
        <ChevronRightIcon class="w-5 h-5 text-on-surface-variant" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { GoalTracker, TrackerEntry } from '@/domain/lifeSeasons'

interface Props {
  tracker: GoalTracker
  todayEntry?: TrackerEntry
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: [trackerId: string]
  edit: [trackerId: string]
}>()

const currentValue = computed(() => {
  if (!props.todayEntry) return null
  return props.todayEntry.value
})

const isComplete = computed(() => {
  if (!props.todayEntry) return false

  if (props.tracker.type === 'boolean') {
    return props.todayEntry.value === true
  }

  if (props.tracker.type === 'count' && props.tracker.targetValue) {
    return (props.todayEntry.value as number) >= props.tracker.targetValue
  }

  // For scale type, consider complete if any value is logged
  return props.todayEntry.value !== null && props.todayEntry.value !== undefined
})

function handleClick() {
  if (props.tracker.type === 'boolean') {
    emit('toggle', props.tracker.id)
  } else {
    emit('edit', props.tracker.id)
  }
}
</script>
