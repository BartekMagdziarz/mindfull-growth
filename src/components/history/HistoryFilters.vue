<template>
  <div class="flex flex-wrap items-center gap-4 mb-6">
    <!-- Type Filter -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Type
      </span>
      <div class="flex gap-1">
        <button
          v-for="option in typeOptions"
          :key="option.value"
          type="button"
          :class="getFilterButtonClasses(typeFilter === option.value)"
          :aria-pressed="typeFilter === option.value"
          @click="$emit('update:typeFilter', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Date Range Filter -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Date
      </span>
      <div class="flex gap-1">
        <button
          v-for="option in dateOptions"
          :key="option.value"
          type="button"
          :class="getFilterButtonClasses(dateRange === option.value)"
          :aria-pressed="dateRange === option.value"
          @click="$emit('update:dateRange', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Sort Order Toggle -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Sort
      </span>
      <button
        type="button"
        :class="getFilterButtonClasses(true)"
        @click="toggleSortOrder"
      >
        <component
          :is="sortOrder === 'desc' ? ArrowDownIcon : ArrowUpIcon"
          class="w-4 h-4 mr-1"
        />
        {{ sortOrder === 'desc' ? 'Newest' : 'Oldest' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/vue/24/outline'
import type { TypeFilter, DateRangeFilter, SortOrder } from '@/composables/useUnifiedEntries'

interface Props {
  typeFilter: TypeFilter
  dateRange: DateRangeFilter
  sortOrder: SortOrder
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:typeFilter': [value: TypeFilter]
  'update:dateRange': [value: DateRangeFilter]
  'update:sortOrder': [value: SortOrder]
}>()

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'journal', label: 'Journal' },
  { value: 'emotion-log', label: 'Emotions' },
]

const dateOptions: { value: DateRangeFilter; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

function getFilterButtonClasses(isActive: boolean): string {
  const base =
    'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background'
  if (isActive) {
    return `${base} bg-primary text-on-primary shadow-elevation-1`
  }
  return `${base} bg-chip text-chip-text hover:bg-section`
}

function toggleSortOrder() {
  emit('update:sortOrder', props.sortOrder === 'desc' ? 'asc' : 'desc')
}
</script>
