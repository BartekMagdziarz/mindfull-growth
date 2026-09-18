<template>
  <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="mg-v2-pill mg-v2-pill--selected objects-active__chip gap-1.5 px-2.5"
      :aria-label="`${removeLabel}: ${chip.label}`"
      @click="remove(chip)"
    >
      <span>{{ chip.label }}</span>
      <AppIcon name="close" class="text-xs" />
    </button>
    <button
      type="button"
      class="ml-1 text-xs font-semibold text-primary hover:underline"
      @click="$emit('reset:all')"
    >
      {{ resetLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  lifeAreas: ObjectsLibraryFilterOption[]
  priorities: ObjectsLibraryFilterOption[]
  closedLabel: string
  resetLabel: string
  removeLabel: string
}>()

const emit = defineEmits<{
  'toggle:lifeArea': [id: string]
  'toggle:priority': [id: string]
  'toggle:closed': []
  'reset:all': []
}>()

// The period is not repeated here — its own chip in the toolbar already
// shows it. Only the filters hidden inside the popover get a visible trace.
const chips = computed<ActiveFilterChip[]>(() => {
  const result: ActiveFilterChip[] = []
  if (props.query.showClosed) {
    result.push({ key: 'showClosed', kind: 'showClosed', label: props.closedLabel })
  }
  for (const option of props.lifeAreas) {
    if (props.query.lifeAreaIds.includes(option.id)) {
      result.push({ key: `lifeArea:${option.id}`, kind: 'lifeArea', id: option.id, label: option.label })
    }
  }
  for (const option of props.priorities) {
    if (props.query.priorityIds.includes(option.id)) {
      result.push({ key: `priority:${option.id}`, kind: 'priority', id: option.id, label: option.label })
    }
  }
  return result
})

function remove(chip: ActiveFilterChip): void {
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

<style scoped>
.objects-active__chip {
  min-height: 1.625rem;
  font-weight: 700;
}
</style>
