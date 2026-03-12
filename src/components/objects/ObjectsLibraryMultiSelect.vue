<template>
  <label class="space-y-2">
    <span class="text-sm font-semibold text-on-surface">{{ label }}</span>

    <div ref="rootRef" class="relative">
      <button
        type="button"
        class="neo-input neo-focus flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="min-w-0 truncate text-sm text-on-surface">
          {{ summaryLabel }}
        </span>
        <ChevronDownIcon
          class="h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-200"
          :class="open ? 'rotate-180' : ''"
        />
      </button>

      <div
        v-if="open"
        class="neo-card absolute left-0 right-0 z-20 mt-3 rounded-[1.5rem] p-3 shadow-neu-raised"
      >
        <div v-if="options.length === 0" class="px-2 py-3 text-sm text-on-surface-variant">
          {{ emptyLabel }}
        </div>

        <div v-else class="max-h-60 space-y-2 overflow-y-auto pr-1">
          <label
            v-for="option in options"
            :key="option.id"
            class="neo-surface flex cursor-pointer items-center gap-3 rounded-[1.2rem] px-3 py-2.5 text-sm text-on-surface"
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

        <div class="mt-3 flex items-center justify-between gap-3 px-1">
          <button
            v-if="modelValue.length > 0"
            type="button"
            class="text-sm font-medium text-primary hover:underline"
            @click="clearSelection"
          >
            {{ clearLabel }}
          </button>
          <span v-else class="text-sm text-on-surface-variant">
            {{ emptyLabel }}
          </span>

          <button
            type="button"
            class="text-sm font-medium text-primary hover:underline"
            @click="open = false"
          >
            {{ closeLabel }}
          </button>
        </div>
      </div>
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  modelValue: string[]
  options: ObjectsLibraryFilterOption[]
  label: string
  emptyLabel: string
  clearLabel: string
  closeLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const summaryLabel = computed(() => {
  if (props.modelValue.length === 0) {
    return props.emptyLabel
  }

  const labels = props.options
    .filter((option) => props.modelValue.includes(option.id))
    .map((option) => option.label)

  if (labels.length <= 2) {
    return labels.join(', ')
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
})

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

function clearSelection(): void {
  emit('update:modelValue', [])
}
</script>
