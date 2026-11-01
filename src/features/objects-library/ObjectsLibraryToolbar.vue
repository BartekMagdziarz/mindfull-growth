<template>
  <div class="mb-6">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center">
      <div class="flex flex-shrink-0 items-center gap-3">
        <DsButton icon-only :aria-label="createLabel" @click="emit('create')">
          <AppIcon name="add" class="text-base" />
        </DsButton>

        <DsButton @click="router.push('/planning-assistant')">
          <AppIcon name="mg-growth" class="text-base" />
          Ułóżmy plan
        </DsButton>

        <DsButton
          variant="quiet"
          title="Porządki na życzenie: tygodnie bez zapisów, stare intencje, praktyki po terminie, ścieżki, cele"
          data-testid="objects-return-ritual"
          @click="router.push({ name: 'return-ritual', query: { manual: '1' } })"
        >
          <AppIcon name="tune" class="text-base" />
          Porządki
        </DsButton>

        <DsSegmentedControl
          :label="t('planning.objects.title')"
          :model-value="store.query.family"
          :options="familyOptions.map(item => ({ value: item.family, label: item.label }))"
          @update:model-value="emit('family-change', $event)"
        />
      </div>

      <ObjectsLibraryFilters
        class="min-w-0 flex-1"
        :query="store.query"
        :reset-all-label="t('planning.objects.filters.resetAll')"
        :empty-state-label="t('planning.objects.filters.noOptions')"
        :filters-label="t('planning.objects.filters.showMore')"
        :life-areas="store.filterOptions.lifeAreas"
        :priorities="store.filterOptions.priorities"
        :search-label="t('planning.objects.filters.search')"
        :search-placeholder="t('planning.objects.filters.searchPlaceholder')"
        :period-label="t('planning.objects.filters.period')"
        :clear-period-label="t('planning.objects.filters.clearPeriod')"
        :year-hint="t('planning.objects.filters.selectYearHint')"
        :previous-year-label="t('planning.objects.filters.previousYear')"
        :next-year-label="t('planning.objects.filters.nextYear')"
        :week-label="t('planning.periodPicker.week')"
        :closed-label="t('planning.objects.filters.showClosedAndArchived')"
        :lifecycle-label="t('planning.objects.filters.lifecycle')"
        :life-areas-label="t('planning.objects.filters.lifeAreas')"
        :priorities-label="t('planning.objects.filters.priorities')"
        :select-placeholder="t('planning.objects.filters.select')"
        @update:search="emit('search', $event)"
        @update:period="emit('period', $event)"
        @toggle:life-area="emit('toggle-life-area', $event)"
        @toggle:priority="emit('toggle-priority', $event)"
        @toggle:closed="emit('toggle-closed')"
        @reset:all="emit('reset')"
      />
    </div>

    <ObjectsLibraryActiveFilters
      class="mt-3"
      :query="store.query"
      :life-areas="store.filterOptions.lifeAreas"
      :priorities="store.filterOptions.priorities"
      :closed-label="t('planning.objects.filters.showClosedAndArchived')"
      :reset-label="t('planning.objects.filters.resetAll')"
      :remove-label="t('planning.objects.filters.clear')"
      @toggle:life-area="emit('toggle-life-area', $event)"
      @toggle:priority="emit('toggle-priority', $event)"
      @toggle:closed="emit('toggle-closed')"
      @reset:all="emit('reset')"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import { DsButton, DsSegmentedControl } from '@/design-system/components'
import { useT } from '@/composables/useT'
import type { PeriodRef } from '@/domain/period'
import type { ObjectsLibraryFamily } from '@/services/objectsLibraryQueries'
import { useObjectsLibraryStore } from '@/stores/objectsLibrary.store'
import ObjectsLibraryActiveFilters from './ObjectsLibraryActiveFilters.vue'
import ObjectsLibraryFilters from './ObjectsLibraryFilters.vue'

/**
 * The library's top bar: create, „Ułóżmy plan”, „Porządki”, the family switch,
 * filters and the active-filter chips. Filter changes are emitted — the view
 * owns writing them back to the URL.
 */
defineProps<{
  createLabel: string
  familyOptions: ReadonlyArray<{ family: ObjectsLibraryFamily; label: string }>
}>()
const emit = defineEmits<{
  create: []
  'family-change': [family: ObjectsLibraryFamily]
  search: [value: string]
  period: [period: PeriodRef | undefined]
  'toggle-life-area': [id: string]
  'toggle-priority': [id: string]
  'toggle-closed': []
  reset: []
}>()

const router = useRouter()
const store = useObjectsLibraryStore()
const { t } = useT()
</script>
