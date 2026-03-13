<template>
  <div class="space-y-1">
    <span class="text-xs font-semibold text-on-surface">{{ label }}</span>

    <div ref="rootRef" class="relative">
      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-for="selected in selectedOptions"
          :key="selected.id"
          class="inline-flex items-center gap-1 rounded-full border border-white/55 bg-white/45 px-2 py-0.5 text-[11px] font-medium text-on-surface-variant"
        >
          {{ selected.label }}
          <button
            type="button"
            class="ml-0.5 rounded-full p-0.5 text-on-surface-variant/70 hover:text-on-surface"
            @click="removeOption(selected.id)"
          >
            <XMarkIcon class="h-3 w-3" />
          </button>
        </span>

        <button
          type="button"
          class="neo-icon-button neo-focus !h-6 !w-6 !min-h-0 !min-w-0"
          :aria-expanded="open"
          :aria-label="addLabel"
          @click="open = !open"
        >
          <PlusIcon class="h-3 w-3" />
        </button>
      </div>

      <div
        v-if="open"
        class="neo-card absolute left-0 right-0 z-20 mt-2 rounded-xl p-2 shadow-neu-raised"
      >
        <div v-if="options.length === 0" class="px-2 py-2 text-xs text-on-surface-variant">
          {{ emptyLabel }}
        </div>

        <div v-else class="max-h-48 space-y-1 overflow-y-auto pr-1">
          <label
            v-for="option in options"
            :key="option.id"
            class="neo-surface flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-on-surface"
          >
            <input
              :checked="modelValue.includes(option.id)"
              type="checkbox"
              class="neo-checkbox"
              @change="toggleOption(option.id)"
            />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
          </label>
        </div>

        <div v-if="modelValue.length > 0" class="mt-2 border-t border-white/45 pt-2 px-1">
          <button
            type="button"
            class="text-xs font-medium text-primary hover:underline"
            @click="clearSelection"
          >
            {{ clearLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  modelValue: string[]
  options: ObjectsLibraryFilterOption[]
  label: string
  emptyLabel: string
  clearLabel: string
  addLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const selectedOptions = computed(() =>
  props.options.filter((option) => props.modelValue.includes(option.id)),
)

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
})

function handlePointerDown(event: PointerEvent): void {
  if (!open.value || !rootRef.value) {
    return
  }

  if (!rootRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

function toggleOption(id: string): void {
  emit(
    'update:modelValue',
    props.modelValue.includes(id)
      ? props.modelValue.filter((value) => value !== id)
      : [...props.modelValue, id],
  )
}

function removeOption(id: string): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((value) => value !== id),
  )
}

function clearSelection(): void {
  emit('update:modelValue', [])
}
</script>
