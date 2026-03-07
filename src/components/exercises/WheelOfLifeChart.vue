<template>
  <div class="space-y-3">
    <div
      v-for="area in areas"
      :key="area.name"
      class="space-y-1"
    >
      <div class="flex items-center justify-between text-sm">
        <span class="text-on-surface font-medium">{{ area.name }}</span>
        <span class="text-primary font-semibold">{{ area.rating }}/10</span>
      </div>
      <div class="relative h-3 bg-outline/20 rounded-full overflow-hidden">
        <div
          class="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
          :class="getBarColor(area.rating)"
          :style="{ width: `${area.rating * 10}%` }"
        />
        <!-- Comparison marker -->
        <div
          v-if="getComparisonRating(area.name) !== null"
          class="absolute top-0 h-full w-0.5 bg-on-surface/40"
          :style="{ left: `${(getComparisonRating(area.name) ?? 0) * 10}%` }"
          :title="`${getComparisonRating(area.name)}`"
        />
      </div>
      <!-- Delta indicator -->
      <div v-if="getComparisonRating(area.name) !== null" class="text-xs text-on-surface-variant">
        <span v-if="area.rating > (getComparisonRating(area.name) ?? 0)" class="text-green-600">
          {{ t('exerciseWizards.wheelOfLife.comparison.fromPrevious', { delta: area.rating - (getComparisonRating(area.name) ?? 0) }) }}
        </span>
        <span v-else-if="area.rating < (getComparisonRating(area.name) ?? 0)" class="text-error">
          {{ t('exerciseWizards.wheelOfLife.comparison.fromPreviousNegative', { delta: area.rating - (getComparisonRating(area.name) ?? 0) }) }}
        </span>
        <span v-else>{{ t('exerciseWizards.wheelOfLife.comparison.noChange') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WheelOfLifeArea } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  areas: WheelOfLifeArea[]
  comparisonAreas?: WheelOfLifeArea[]
}>()

function getBarColor(rating: number): string {
  if (rating >= 8) return 'bg-green-500'
  if (rating >= 6) return 'bg-primary'
  if (rating >= 4) return 'bg-amber-500'
  return 'bg-error'
}

function getComparisonRating(areaName: string): number | null {
  if (!props.comparisonAreas) return null
  const match = props.comparisonAreas.find((a) => a.name === areaName)
  return match ? match.rating : null
}
</script>
