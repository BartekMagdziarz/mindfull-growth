<template>
  <div class="space-y-5">
    <div v-for="group in groups" :key="group.title" class="space-y-3">
      <p v-if="group.subtitle" class="text-sm text-on-surface-variant">
        {{ group.subtitle }}
      </p>
      <div class="flex items-start justify-around gap-2">
        <IconScaleSelector
          v-for="dim in group.dimensions"
          :key="dim.key"
          :model-value="dim.value"
          :label="dim.label"
          :icons="dim.icons"
          :low-label="dim.lowLabel"
          :high-label="dim.highLabel"
          @update:model-value="$emit('update:rating', dim.key, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconScaleSelector from './IconScaleSelector.vue'

export interface IconRatingDimension {
  key: string
  label: string
  value: number | null
  icons: [string, string, string, string, string]
  lowLabel?: string
  highLabel?: string
}

export interface RatingGroup {
  title: string
  subtitle?: string
  dimensions: IconRatingDimension[]
}

defineProps<{
  groups: RatingGroup[]
}>()

defineEmits<{
  'update:rating': [key: string, value: number]
}>()
</script>
