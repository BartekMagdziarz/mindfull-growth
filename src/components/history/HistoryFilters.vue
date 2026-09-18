<template>
  <div class="flex flex-wrap items-center gap-x-5 gap-y-3 mb-6">
    <!-- Type Filter -->
    <div class="flex items-center gap-2">
      <span class="mg-v2-page-head__eyebrow">{{ t('history.filters.type') }}</span>
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
      <span class="mg-v2-page-head__eyebrow">{{ t('history.filters.date') }}</span>
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
      <span class="mg-v2-page-head__eyebrow">{{ t('history.filters.sort') }}</span>
      <button
        type="button"
        class="mg-v2-pill history-filter"
        @click="toggleSortOrder"
      >
        <AppIcon
          :name="sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'"
          class="text-base mr-1"
        />
        {{ sortOrder === 'desc' ? t('history.filters.newest') : t('history.filters.oldest') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { TypeFilter, DateRangeFilter, SortOrder } from '@/composables/useUnifiedEntries'
import { useT } from '@/composables/useT'

const { t } = useT()

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

const typeOptions = computed(() => [
  { value: 'all' as TypeFilter, label: t('history.filters.all') },
  { value: 'journal' as TypeFilter, label: t('history.filters.journal') },
  { value: 'emotion-log' as TypeFilter, label: t('history.filters.emotions') },
])

const dateOptions = computed(() => [
  { value: 'all' as DateRangeFilter, label: t('history.filters.allTime') },
  { value: 'today' as DateRangeFilter, label: t('history.filters.today') },
  { value: 'week' as DateRangeFilter, label: t('history.filters.week') },
  { value: 'month' as DateRangeFilter, label: t('history.filters.month') },
])

/** Design V2 chips: selected = thin accent outline, flat. */
function getFilterButtonClasses(isActive: boolean): string {
  return isActive
    ? 'mg-v2-pill mg-v2-pill--primary mg-v2-pill--selected'
    : 'mg-v2-pill history-filter'
}

function toggleSortOrder() {
  emit('update:sortOrder', props.sortOrder === 'desc' ? 'asc' : 'desc')
}
</script>

<style scoped>
.history-filter {
  cursor: pointer;
}

.history-filter:hover {
  background: var(--mg-color-paper);
}
</style>
