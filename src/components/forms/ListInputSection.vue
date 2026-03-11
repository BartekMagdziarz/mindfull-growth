<template>
  <AppCard padding="lg" class="space-y-4">
    <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
      <component :is="iconComponent" class="w-5 h-5 text-primary" />
      {{ title }}
    </h2>

    <!-- Empty State Hint -->
    <p
      v-if="modelValue.length === 0"
      class="text-sm text-on-surface-variant italic"
    >
      {{ emptyMessage }}
    </p>

    <!-- Existing Items -->
    <ul v-if="modelValue.length > 0" class="space-y-2">
      <li
        v-for="(item, index) in modelValue"
        :key="index"
        class="flex items-start gap-3 group"
      >
        <span class="text-primary mt-2.5">&#8226;</span>
        <input
          :value="item"
          type="text"
          class="neo-input flex-1 p-2"
          @input="updateItem(index, ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="addItem"
        />
        <button
          type="button"
          class="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-section transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          @click="removeItem(index)"
          aria-label="Remove item"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </li>
    </ul>

    <!-- Add New Item -->
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
      @click="addItem"
    >
      <PlusIcon class="w-4 h-4" />
      {{ placeholder }}
    </button>
  </AppCard>
</template>

<script setup lang="ts">
/**
 * ListInputSection - Reusable List Input Component
 *
 * A card-based component for managing a list of string items.
 * Used anywhere users need to add, edit, or remove short text lists.
 *
 * @example
 * ```vue
 * <ListInputSection
 *   v-model="wins"
 *   title="Wins"
 *   icon="trophy"
 *   placeholder="Add a win..."
 *   empty-message="What went well?"
 * />
 * ```
 */
import { computed } from 'vue'
import {
  TrophyIcon,
  LightBulbIcon,
  StarIcon,
  BookOpenIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'

// Custom mountain icon since heroicons doesn't have one
const MountainIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 21l7.5-10.5L15 15l6-9v15H3z" />
    </svg>
  `,
}

export type ListInputIcon = 'trophy' | 'mountain' | 'lightbulb' | 'star' | 'book'

const props = defineProps<{
  /** The list of items (v-model binding) */
  modelValue: string[]
  /** Section title */
  title: string
  /** Icon to display next to the title */
  icon: ListInputIcon
  /** Placeholder text for the "Add" button */
  placeholder: string
  /** Message shown when the list is empty */
  emptyMessage: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const iconComponent = computed(() => {
  switch (props.icon) {
    case 'trophy':
      return TrophyIcon
    case 'mountain':
      return MountainIcon
    case 'lightbulb':
      return LightBulbIcon
    case 'star':
      return StarIcon
    case 'book':
      return BookOpenIcon
    default:
      return LightBulbIcon
  }
})

function addItem() {
  emit('update:modelValue', [...props.modelValue, ''])
}

function updateItem(index: number, value: string) {
  const newItems = [...props.modelValue]
  newItems[index] = value
  emit('update:modelValue', newItems)
}

function removeItem(index: number) {
  const newItems = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', newItems)
}
</script>
