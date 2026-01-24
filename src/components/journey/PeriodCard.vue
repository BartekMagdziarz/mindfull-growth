<template>
  <div
    @click="$emit('click')"
    :class="[
      'p-4 bg-surface border border-outline/30 rounded-xl cursor-pointer hover:shadow-elevation-1 hover:-translate-y-0.5 transition-all duration-200 border-l-4',
      colorClass,
      isCurrent ? 'ring-2 ring-primary/30 bg-primary/5' : ''
    ]"
  >
    <div class="flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <!-- Period Label -->
        <div class="flex items-center gap-2">
          <p class="font-medium text-on-surface">{{ periodLabel }}</p>
          <span
            v-if="isCurrent"
            class="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
          >
            Current
          </span>
        </div>

        <!-- Date Range -->
        <p class="text-sm text-on-surface-variant mt-0.5">{{ dateRange }}</p>

        <!-- Summary Info -->
        <div v-if="hasSummaryContent" class="mt-2 flex flex-wrap gap-2">
          <!-- Theme/Intention -->
          <span
            v-if="entry.yearlyTheme || entry.intention"
            class="text-xs px-2 py-1 bg-section rounded-full text-on-surface-variant truncate max-w-[200px]"
          >
            {{ entry.yearlyTheme || entry.intention }}
          </span>

          <!-- Wins count -->
          <span
            v-if="entry.wins && entry.wins.length > 0"
            class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full"
          >
            {{ entry.wins.length }} wins
          </span>

          <!-- Goals count (if linked) -->
          <span
            v-if="entry.linkedGoalIds && entry.linkedGoalIds.length > 0"
            class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full"
          >
            {{ entry.linkedGoalIds.length }} goals
          </span>
        </div>
      </div>

      <ChevronRightIcon class="w-5 h-5 text-on-surface-variant flex-shrink-0" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { PeriodicEntry } from '@/domain/periodicEntry'
import {
  getPeriodLabel,
  formatDateRange,
} from '@/utils/periodUtils'

interface Props {
  entry: PeriodicEntry
  colorClass?: string
  isCurrent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  colorClass: 'border-l-primary',
  isCurrent: false,
})

defineEmits<{
  click: []
}>()

const periodLabel = computed(() => {
  const startDate = new Date(props.entry.periodStartDate + 'T00:00:00')
  return getPeriodLabel(props.entry.type, startDate)
})

const dateRange = computed(() => {
  const startDate = new Date(props.entry.periodStartDate + 'T00:00:00')
  const endDate = new Date(props.entry.periodEndDate + 'T00:00:00')
  return formatDateRange(startDate, endDate, props.entry.type)
})

const hasSummaryContent = computed(() => {
  return (
    props.entry.yearlyTheme ||
    props.entry.intention ||
    (props.entry.wins && props.entry.wins.length > 0) ||
    (props.entry.linkedGoalIds && props.entry.linkedGoalIds.length > 0)
  )
})
</script>
