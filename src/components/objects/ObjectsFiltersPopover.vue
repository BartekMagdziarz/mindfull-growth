<template>
  <div ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      class="mg-v2-pill objects-filters__chip gap-1.5 px-3"
      :class="activeCount > 0 ? 'mg-v2-pill--primary mg-v2-pill--selected' : ''"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click.stop="toggleOpen"
    >
      <AppIcon name="tune" class="text-sm" />
      <span>{{ activeCount > 0 ? `${filtersLabel} · ${activeCount}` : filtersLabel }}</span>
      <AppIcon name="expand_more" class="text-sm" />
    </button>

    <section
      v-if="open"
      ref="panelRef"
      role="dialog"
      :aria-label="filtersLabel"
      class="mg-v2-popover objects-filters__panel absolute right-0 top-full z-20 mt-2 p-3.5"
      @click.stop
      @keydown.esc.stop="close"
    >
      <div class="objects-filters__row">
        <span class="objects-filters__label">{{ lifeAreasLabel }}</span>
        <ObjectsCompactMultiSelect
          :label="lifeAreasLabel"
          :placeholder="lifeAreas.length > 0 ? selectPlaceholder : noOptionsLabel"
          :options="lifeAreas"
          :selected-ids="query.lifeAreaIds"
          :disabled="lifeAreas.length === 0"
          @toggle="$emit('toggle:lifeArea', $event)"
        />
      </div>
      <div class="objects-filters__row">
        <span class="objects-filters__label">{{ prioritiesLabel }}</span>
        <ObjectsCompactMultiSelect
          :label="prioritiesLabel"
          :placeholder="priorities.length > 0 ? selectPlaceholder : noOptionsLabel"
          :options="priorities"
          :selected-ids="query.priorityIds"
          :disabled="priorities.length === 0"
          @toggle="$emit('toggle:priority', $event)"
        />
      </div>
      <div class="objects-filters__row">
        <span class="objects-filters__label">{{ lifecycleLabel }}</span>
        <label class="flex cursor-pointer items-center gap-2.5 text-sm text-on-surface">
          <button
            type="button"
            role="switch"
            class="mg-v2-switch"
            :aria-checked="query.showClosed"
            :aria-label="closedLabel"
            @click="$emit('toggle:closed')"
          />
          <span>{{ closedLabel }}</span>
        </label>
      </div>

      <footer v-if="activeCount > 0" class="mt-3 flex justify-end">
        <button
          type="button"
          class="text-xs font-semibold text-primary hover:underline"
          @click="$emit('reset:filters')"
        >
          {{ resetLabel }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ObjectsCompactMultiSelect from '@/components/objects/ObjectsCompactMultiSelect.vue'
import type { ObjectsLibraryFilterOption, ObjectsLibraryQuery } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  query: ObjectsLibraryQuery
  lifeAreas: ObjectsLibraryFilterOption[]
  priorities: ObjectsLibraryFilterOption[]
  filtersLabel: string
  lifeAreasLabel: string
  prioritiesLabel: string
  lifecycleLabel: string
  closedLabel: string
  selectPlaceholder: string
  noOptionsLabel: string
  resetLabel: string
}>()

defineEmits<{
  'toggle:lifeArea': [id: string]
  'toggle:priority': [id: string]
  'toggle:closed': []
  'reset:filters': []
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)

const activeCount = computed(
  () =>
    props.query.lifeAreaIds.length +
    props.query.priorityIds.length +
    (props.query.showClosed ? 1 : 0),
)

async function toggleOpen(): Promise<void> {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  panelRef.value?.querySelector<HTMLElement>('button:not(:disabled), [role="switch"]')?.focus()
}

function close(): void {
  if (!open.value) return
  open.value = false
  void nextTick(() => triggerRef.value?.focus())
}

function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})
</script>

<style scoped>
.objects-filters__chip {
  min-height: 2rem;
  white-space: nowrap;
}

.objects-filters__panel {
  width: 25.5rem;
  display: grid;
  gap: 0.6rem;
}

.objects-filters__row {
  display: grid;
  grid-template-columns: 7.75rem minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.objects-filters__label {
  color: var(--mg-color-muted);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
