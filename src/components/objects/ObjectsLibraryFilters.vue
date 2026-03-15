<template>
  <section class="neo-card p-4 md:p-5">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
      <label class="min-w-0 flex-1">
        <span class="sr-only">{{ searchLabel }}</span>
        <input
          :value="query.q"
          type="search"
          class="neo-input w-full px-4 py-3"
          :placeholder="searchPlaceholder"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="xl:w-[18rem]">
        <span class="sr-only">{{ periodLabel }}</span>
        <input
          :value="periodValue"
          type="text"
          class="neo-input w-full px-4 py-3"
          :class="periodError ? 'border-danger/60 text-danger' : ''"
          :placeholder="periodPlaceholder"
          :aria-invalid="periodError ? 'true' : 'false'"
          :aria-describedby="periodError ? 'objects-library-period-error' : undefined"
          @input="$emit('update:period-value', ($event.target as HTMLInputElement).value)"
          @blur="$emit('commit:period')"
          @keydown.enter.prevent="$emit('commit:period')"
        />
      </label>

      <div class="flex flex-wrap items-center gap-2 xl:justify-end">
        <button
          type="button"
          class="neo-pill neo-focus gap-2 px-4 py-2 text-sm font-semibold"
          :aria-expanded="filtersExpanded"
          @click="filtersExpanded = !filtersExpanded"
        >
          <AppIcon name="tune" class="text-base" />
          {{ filtersToggleLabel }}
          <AppIcon v-if="filtersExpanded" name="expand_less" class="text-base" />
          <AppIcon v-else name="expand_more" class="text-base" />
        </button>

        <button
          v-if="hasActiveFilters"
          type="button"
          class="neo-pill neo-focus px-4 py-2 text-sm font-semibold"
          @click="$emit('reset:all')"
        >
          {{ resetAllLabel }}
        </button>
      </div>
    </div>

    <p
      v-if="periodError"
      id="objects-library-period-error"
      class="mt-3 text-sm text-danger"
    >
      {{ periodError }}
    </p>

    <div v-if="activeFilterChips.length > 0" class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="chip in activeFilterChips"
        :key="chip.key"
        type="button"
        class="neo-pill neo-focus gap-2 px-3 py-1.5 text-xs font-semibold"
        @click="removeFilterChip(chip)"
      >
        <span>{{ chip.label }}</span>
        <AppIcon name="close" class="text-sm" />
      </button>
    </div>

    <section
      v-if="filtersExpanded"
      class="neo-surface mt-4 grid gap-4 rounded-[1.6rem] p-4 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div class="space-y-3 xl:min-w-[14rem]">
        <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ closedLabel }}
        </div>
        <button
          type="button"
          class="neo-pill neo-focus px-4 py-2 text-sm font-semibold"
          :class="query.showClosed ? 'neo-pill--primary' : ''"
          :aria-pressed="query.showClosed"
          @click="$emit('toggle:closed')"
        >
          {{ closedLabel }}
        </button>
      </div>

      <section v-if="lifeAreas.length > 0 || query.lifeAreaIds.length > 0" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {{ lifeAreasLabel }}
          </span>
          <button
            v-if="query.lifeAreaIds.length > 0"
            type="button"
            class="text-xs font-medium text-primary hover:underline"
            @click="$emit('clear:lifeAreas')"
          >
            {{ clearLabel }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in lifeAreas"
            :key="option.id"
            type="button"
            class="neo-pill neo-focus px-3 py-1.5 text-sm"
            :class="query.lifeAreaIds.includes(option.id) ? 'neo-pill--primary' : ''"
            :aria-pressed="query.lifeAreaIds.includes(option.id)"
            @click="$emit('toggle:lifeArea', option.id)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>

      <section v-if="priorities.length > 0 || query.priorityIds.length > 0" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {{ prioritiesLabel }}
          </span>
          <button
            v-if="query.priorityIds.length > 0"
            type="button"
            class="text-xs font-medium text-primary hover:underline"
            @click="$emit('clear:priorities')"
          >
            {{ clearLabel }}
          </button>
        </div>

        <div v-if="priorities.length > 0" class="flex flex-wrap gap-2">
          <button
            v-for="option in priorities"
            :key="option.id"
            type="button"
            class="neo-pill neo-focus px-3 py-1.5 text-sm"
            :class="query.priorityIds.includes(option.id) ? 'neo-pill--primary' : ''"
            :aria-pressed="query.priorityIds.includes(option.id)"
            @click="$emit('toggle:priority', option.id)"
          >
            {{ option.label }}
          </button>
        </div>
        <p v-else class="text-sm text-on-surface-variant">
          {{ emptyStateLabel }}
        </p>
      </section>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { ObjectsLibraryFilterOption, ObjectsLibraryQuery } from '@/services/objectsLibraryQueries'

interface ActiveFilterChip {
  key: string
  kind: 'showClosed' | 'lifeArea' | 'priority'
  label: string
  id?: string
}

const props = defineProps<{
  query: ObjectsLibraryQuery
  periodValue: string
  periodError?: string
  hasActiveFilters: boolean
  resetAllLabel: string
  emptyStateLabel: string
  filtersLabel: string
  hideFiltersLabel: string
  lifeAreas: ObjectsLibraryFilterOption[]
  priorities: ObjectsLibraryFilterOption[]
  searchLabel: string
  searchPlaceholder: string
  periodLabel: string
  periodPlaceholder: string
  closedLabel: string
  lifeAreasLabel: string
  prioritiesLabel: string
  clearLabel: string
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:period-value': [value: string]
  'commit:period': []
  'toggle:lifeArea': [id: string]
  'toggle:priority': [id: string]
  'toggle:closed': []
  'reset:all': []
  'clear:lifeAreas': []
  'clear:priorities': []
}>()

const filtersExpanded = ref(false)

const hiddenFilterCount = computed(() => {
  let count = 0
  if (props.query.showClosed) count += 1
  count += props.query.lifeAreaIds.length
  count += props.query.priorityIds.length
  return count
})

const filtersToggleLabel = computed(() => {
  const base = filtersExpanded.value ? props.hideFiltersLabel : props.filtersLabel
  return hiddenFilterCount.value > 0 ? `${base} (${hiddenFilterCount.value})` : base
})

const activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const chips: ActiveFilterChip[] = []

  if (props.query.showClosed) {
    chips.push({
      key: 'showClosed',
      kind: 'showClosed',
      label: props.closedLabel,
    })
  }

  for (const option of props.lifeAreas) {
    if (props.query.lifeAreaIds.includes(option.id)) {
      chips.push({
        key: `lifeArea:${option.id}`,
        kind: 'lifeArea',
        id: option.id,
        label: option.label,
      })
    }
  }

  for (const option of props.priorities) {
    if (props.query.priorityIds.includes(option.id)) {
      chips.push({
        key: `priority:${option.id}`,
        kind: 'priority',
        id: option.id,
        label: option.label,
      })
    }
  }

  return chips
})

function removeFilterChip(chip: ActiveFilterChip): void {
  switch (chip.kind) {
    case 'showClosed':
      emit('toggle:closed')
      return
    case 'lifeArea':
      if (chip.id) emit('toggle:lifeArea', chip.id)
      return
    case 'priority':
      if (chip.id) emit('toggle:priority', chip.id)
  }
}
</script>
