<template>
  <div class="space-y-4">
    <p class="text-sm text-on-surface-variant">
      {{ t('exerciseWizards.wheelOfLife.focusPicker.description') }}
    </p>

    <div class="space-y-2">
      <button
        v-for="area in sortedAreas"
        :key="area.name"
        type="button"
        class="w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left"
        :class="
          isSelected(area.name)
            ? 'border-primary bg-primary-soft text-on-surface'
            : 'border-neu-border/30 bg-transparent text-on-surface hover:bg-section/50'
        "
        @click="$emit('toggle', area.name)"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
            :class="
              isSelected(area.name)
                ? 'border-primary/50 bg-primary/70'
                : 'border-neu-border/40 bg-transparent'
            "
          >
            <CheckIcon v-if="isSelected(area.name)" class="w-3.5 h-3.5 text-on-primary" />
          </div>
          <span class="font-medium text-sm">{{ area.name }}</span>
        </div>
        <span class="text-sm font-semibold" :class="ratingColor(area.rating)">
          {{ area.rating }}{{ t('exerciseWizards.wheelOfLife.focusPicker.outOfTen') }}
        </span>
      </button>
    </div>

    <div v-if="selected.length === 0" class="text-xs text-amber-600">
      {{ t('exerciseWizards.wheelOfLife.focusPicker.validationMessage') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import { CheckIcon } from '@heroicons/vue/24/solid'
import type { WheelOfLifeArea } from '@/domain/exercises'

const { t } = useT()

const props = defineProps<{
  areas: WheelOfLifeArea[]
  selected: string[]
}>()

defineEmits<{
  toggle: [areaName: string]
}>()

// Sort by rating ascending so lowest-scoring appear first
const sortedAreas = computed(() => [...props.areas].sort((a, b) => a.rating - b.rating))

function isSelected(name: string): boolean {
  return props.selected.includes(name)
}

function ratingColor(rating: number): string {
  if (rating >= 8) return 'text-green-500'
  if (rating >= 6) return 'text-primary'
  if (rating >= 4) return 'text-amber-500'
  return 'text-error'
}
</script>
