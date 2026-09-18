<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <label class="objects-filters-v2__search relative" :class="query.q ? 'objects-filters-v2__search--filled' : ''">
      <span class="sr-only">{{ searchLabel }}</span>
      <AppIcon
        name="search"
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
      />
      <input
        :value="query.q"
        type="search"
        class="mg-v2-field mg-v2-field--compact w-full pl-8"
        :placeholder="searchPlaceholder"
        :title="searchLabel"
        @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <ObjectsPeriodSelect
      :model-value="query.period"
      :label="periodLabel"
      :clear-label="clearPeriodLabel"
      :year-hint="yearHint"
      :previous-label="previousYearLabel"
      :next-label="nextYearLabel"
      :week-label="weekLabel"
      @update:model-value="$emit('update:period', $event)"
    />

    <ObjectsFiltersPopover
      :query="query"
      :life-areas="lifeAreas"
      :priorities="priorities"
      :filters-label="filtersLabel"
      :life-areas-label="lifeAreasLabel"
      :priorities-label="prioritiesLabel"
      :lifecycle-label="lifecycleLabel"
      :closed-label="closedLabel"
      :select-placeholder="selectPlaceholder"
      :no-options-label="emptyStateLabel"
      :reset-label="resetAllLabel"
      @toggle:life-area="$emit('toggle:lifeArea', $event)"
      @toggle:priority="$emit('toggle:priority', $event)"
      @toggle:closed="$emit('toggle:closed')"
      @reset:filters="$emit('reset:all')"
    />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import ObjectsPeriodSelect from '@/components/objects/ObjectsPeriodSelect.vue'
import ObjectsFiltersPopover from '@/components/objects/ObjectsFiltersPopover.vue'
import type { PeriodRef } from '@/domain/period'
import type { ObjectsLibraryFilterOption, ObjectsLibraryQuery } from '@/services/objectsLibraryQueries'

defineProps<{
  query: ObjectsLibraryQuery
  resetAllLabel: string
  emptyStateLabel: string
  filtersLabel: string
  lifeAreas: ObjectsLibraryFilterOption[]
  priorities: ObjectsLibraryFilterOption[]
  searchLabel: string
  searchPlaceholder: string
  periodLabel: string
  clearPeriodLabel: string
  yearHint: string
  previousYearLabel: string
  nextYearLabel: string
  weekLabel: string
  closedLabel: string
  lifecycleLabel: string
  lifeAreasLabel: string
  prioritiesLabel: string
  selectPlaceholder: string
}>()

defineEmits<{
  'update:search': [value: string]
  'update:period': [value: PeriodRef | undefined]
  'toggle:lifeArea': [id: string]
  'toggle:priority': [id: string]
  'toggle:closed': []
  'reset:all': []
}>()
</script>

<style scoped>
/* The search field is small at rest and grows a little when it is being
   used, so the row stays quiet but typing is not cramped. */
.objects-filters-v2__search {
  display: block;
  width: 12rem;
  transition: width var(--mg-duration-fast) ease;
}

.objects-filters-v2__search:focus-within,
.objects-filters-v2__search--filled {
  width: 16rem;
}

/* Room for the leading search glyph (the compact field resets padding). */
.objects-filters-v2__search .mg-v2-field--compact {
  padding-left: 2rem;
}
</style>
