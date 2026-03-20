<template>
  <div class="space-y-4">
    <div
      v-for="dim in dimensions"
      :key="dim.key"
      class="neo-inset rounded-2xl px-4 py-3"
    >
      <RatingSlider
        :model-value="dim.value ?? 1"
        :label="dim.label"
        :min="1"
        :max="5"
        @update:model-value="$emit('update:rating', dim.key, $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import RatingSlider from '@/components/exercises/RatingSlider.vue'

export interface RatingDimension {
  key: string
  label: string
  value: number | null
}

defineProps<{
  dimensions: RatingDimension[]
}>()

defineEmits<{
  'update:rating': [key: string, value: number]
}>()
</script>
