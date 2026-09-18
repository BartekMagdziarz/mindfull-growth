<template>
  <div ref="rootRef" class="relative">
    <button
      ref="triggerRef"
      type="button"
      class="mg-v2-field mg-v2-field--compact flex w-full items-center justify-between gap-2 text-left"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :disabled="disabled"
      @click.stop="toggleOpen"
    >
      <span class="min-w-0 truncate" :class="selectedIds.length === 0 ? 'text-on-surface-variant' : 'text-on-surface'">
        {{ summary }}
      </span>
      <span class="flex shrink-0 items-center gap-1">
        <span v-if="selectedIds.length > 0" class="text-[11px] font-extrabold text-primary">
          {{ selectedIds.length }}
        </span>
        <AppIcon
          name="expand_more"
          class="text-sm text-on-surface-variant transition-transform duration-200"
          :class="open ? 'rotate-180' : ''"
        />
      </span>
    </button>

    <ul
      v-if="open"
      ref="listRef"
      role="listbox"
      aria-multiselectable="true"
      :aria-label="label"
      class="mg-v2-popover objects-multi__list absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto p-1.5"
      @click.stop
      @keydown="onListKeydown"
    >
      <li v-for="option in options" :key="option.id">
        <label class="objects-multi__option flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm text-on-surface">
          <input
            type="checkbox"
            class="mg-v2-checkbox"
            :checked="selectedIds.includes(option.id)"
            @change="$emit('toggle', option.id)"
          />
          <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
        </label>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const props = defineProps<{
  label: string
  placeholder: string
  options: ObjectsLibraryFilterOption[]
  selectedIds: string[]
  disabled?: boolean
}>()

defineEmits<{
  toggle: [id: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const open = ref(false)

// 0 → placeholder, 1 → name, 2 → "A, B", 3+ → "A +2".
const summary = computed(() => {
  const labels = props.options
    .filter((option) => props.selectedIds.includes(option.id))
    .map((option) => option.label)
  if (labels.length === 0) return props.placeholder
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]} +${labels.length - 1}`
})

function optionInputs(): HTMLInputElement[] {
  return Array.from(listRef.value?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])
}

async function toggleOpen(): Promise<void> {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  // Focus the first checked option, else the first one, so arrows work at once.
  const inputs = optionInputs()
  ;(inputs.find((input) => input.checked) ?? inputs[0])?.focus()
}

function close(restoreFocus = true): void {
  if (!open.value) return
  open.value = false
  if (restoreFocus) void nextTick(() => triggerRef.value?.focus())
}

// Roving focus inside the list: ↑/↓ move, Home/End jump, Esc closes and
// hands focus back to the trigger. Space/Enter toggle natively.
function onListKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  const inputs = optionInputs()
  const index = inputs.findIndex((input) => input === document.activeElement)
  let next: number | null = null
  if (event.key === 'ArrowDown') next = Math.min(index + 1, inputs.length - 1)
  else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = inputs.length - 1
  if (next === null) return
  event.preventDefault()
  inputs[next]?.focus()
}

function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    close(false)
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
.objects-multi__list {
  background: var(--mg-color-paper);
  list-style: none;
  margin: 0;
}

.objects-multi__option {
  border-radius: var(--mg-radius-sm);
}

.objects-multi__option:hover {
  background: var(--mg-color-mist);
}
</style>
