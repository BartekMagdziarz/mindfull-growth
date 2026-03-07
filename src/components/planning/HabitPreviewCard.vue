<template>
  <div
    class="flex items-center gap-3 p-3 rounded-xl border transition-all"
    :class="included
      ? 'border-outline/20 bg-surface'
      : 'border-outline/10 bg-section/30 opacity-60'
    "
  >
    <!-- Toggle -->
    <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        :checked="included"
        class="sr-only peer"
        @change="handleToggle"
      />
      <div
        class="w-9 h-5 bg-section rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"
      />
    </label>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <p class="text-sm font-medium text-on-surface truncate">
          {{ habit.name }}
        </p>
        <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-section text-on-surface-variant capitalize flex-shrink-0">
          {{ habit.cadence }}
        </span>
      </div>
      <div class="flex items-center gap-2 mt-0.5">
        <span v-if="processName" class="text-[11px] text-on-surface-variant flex items-center gap-1">
          <CogIcon class="w-3 h-3" />
          {{ processName }}
        </span>
        <span v-if="trackerSummary" class="text-[11px] text-on-surface-variant flex items-center gap-1">
          <ChartBarIcon class="w-3 h-3" />
          {{ trackerSummary }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CogIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import type { Habit } from '@/domain/habit'

const props = defineProps<{
  habit: Habit
  processName?: string
  included: boolean
}>()

const emit = defineEmits<{
  toggle: [habitId: string, included: boolean]
}>()

const trackerSummary = computed(() => {
  return props.habit.cadence
})

function handleToggle() {
  emit('toggle', props.habit.id, !props.included)
}
</script>
