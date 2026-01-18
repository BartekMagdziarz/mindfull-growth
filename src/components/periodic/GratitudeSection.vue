<template>
  <AppCard padding="lg" class="space-y-4">
    <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
      <HeartIcon class="w-5 h-5 text-primary" />
      Gratitude
    </h2>

    <p class="text-sm text-on-surface-variant">
      What are you grateful for?
    </p>

    <div class="space-y-3">
      <div
        v-for="(_, index) in 3"
        :key="index"
        class="flex items-center gap-3"
      >
        <span
          class="w-7 h-7 flex-shrink-0 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center"
        >
          {{ index + 1 }}
        </span>
        <input
          :value="modelValue[index] || ''"
          type="text"
          class="flex-1 p-3 rounded-xl border border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
          :placeholder="getPlaceholder(index)"
          @input="updateItem(index, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { HeartIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const placeholders = [
  'Something that made you smile...',
  'Someone you appreciate...',
  'A moment that brought you joy...',
]

function getPlaceholder(index: number): string {
  return placeholders[index] || 'Something you\'re grateful for...'
}

function updateItem(index: number, value: string) {
  const newItems = [...props.modelValue]
  // Ensure the array has at least 3 elements
  while (newItems.length < 3) {
    newItems.push('')
  }
  newItems[index] = value
  emit('update:modelValue', newItems)
}
</script>
