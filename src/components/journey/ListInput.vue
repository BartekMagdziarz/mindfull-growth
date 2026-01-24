<template>
  <div class="space-y-2">
    <!-- Existing Items -->
    <div
      v-for="(item, index) in items"
      :key="index"
      class="flex items-center gap-2 group"
    >
      <div class="flex-1 flex items-center gap-2 px-4 py-2 bg-section rounded-xl">
        <span class="flex-1 text-on-surface">{{ item }}</span>
        <button
          @click="removeItem(index)"
          class="p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-error transition-all"
          aria-label="Remove item"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Add New Item -->
    <div v-if="!maxItems || items.length < maxItems" class="flex items-center gap-2">
      <input
        v-model="newItemText"
        @keydown.enter.prevent="addItem"
        type="text"
        :placeholder="placeholder"
        class="flex-1 px-4 py-2 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus"
      />
      <button
        @click="addItem"
        :disabled="!newItemText.trim()"
        class="p-2 bg-primary text-white rounded-xl hover:bg-primary-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Add item"
      >
        <PlusIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Max items message -->
    <p v-if="maxItems && items.length >= maxItems" class="text-xs text-on-surface-variant">
      Maximum {{ maxItems }} items reached
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  items: string[]
  placeholder?: string
  maxItems?: number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Add item...',
  maxItems: undefined,
})

const emit = defineEmits<{
  'update:items': [items: string[]]
}>()

const newItemText = ref('')

function addItem() {
  const text = newItemText.value.trim()
  if (!text) return
  if (props.maxItems && props.items.length >= props.maxItems) return

  emit('update:items', [...props.items, text])
  newItemText.value = ''
}

function removeItem(index: number) {
  const newItems = [...props.items]
  newItems.splice(index, 1)
  emit('update:items', newItems)
}
</script>
