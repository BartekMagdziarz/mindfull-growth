<template>
  <AppCard padding="lg" class="space-y-4">
    <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
      <AppIcon :name="iconName" class="text-xl text-primary" />
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
          <AppIcon name="close" class="text-base" />
        </button>
      </li>
    </ul>

    <!-- Add New Item -->
    <button
      type="button"
      class="flex items-center gap-2 text-sm text-primary hover:text-primary-strong transition-colors"
      @click="addItem"
    >
      <AppIcon name="add" class="text-base" />
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
import AppCard from '@/components/AppCard.vue'
import AppIcon from '@/components/shared/AppIcon.vue'

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

const iconName = computed<string>(() => {
  switch (props.icon) {
    case 'trophy':
      return 'emoji_events'
    case 'mountain':
      return 'landscape'
    case 'lightbulb':
      return 'lightbulb'
    case 'star':
      return 'star'
    case 'book':
      return 'menu_book'
    default:
      return 'lightbulb'
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
