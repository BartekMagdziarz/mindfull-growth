<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm text-on-surface-variant">
      <div class="flex items-center gap-2">
        <span class="font-medium text-on-surface">{{ t('exerciseWizards.wheelOfLife.rater.areaLabel', { n: currentIndex + 1 }) }}</span>
        <span>{{ t('exerciseWizards.wheelOfLife.rater.ofTotal', { total: totalAreas }) }}</span>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-start">
      <div class="rounded-2xl border border-neu-border/20 bg-section/50 p-4">
        <WheelOfLifeRadialChart
          :areas="areas"
          :size="340"
          :padding="60"
          :animated="true"
          :highlight-index="currentIndex"
        />
      </div>

      <div class="space-y-5">
        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {{ t('exerciseWizards.wheelOfLife.rater.currentlyRating') }}
          </p>
          <h3 class="text-2xl font-semibold text-on-surface">{{ area.name }}</h3>
        </div>

        <div class="flex items-baseline gap-2">
          <span class="text-6xl font-bold" :class="ratingColor">{{ area.rating }}</span>
          <span class="text-xl text-on-surface-variant">{{ t('exerciseWizards.wheelOfLife.rater.outOfTen') }}</span>
        </div>

        <div class="space-y-2">
          <div class="relative flex items-center h-10">
            <div class="absolute left-0 right-0 h-2 rounded-full bg-outline/20" />
            <div
              class="absolute left-0 h-2 rounded-full bg-primary/70"
              :style="{ width: `${fillPercent}%` }"
            />
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              :value="area.rating"
              class="wheel-slider relative z-10 w-full h-10 cursor-pointer bg-transparent"
              @input="$emit('rate', Number(($event.target as HTMLInputElement).value))"
            />
          </div>
          <div class="flex justify-between text-xs text-on-surface-variant">
            <span>{{ t('exerciseWizards.wheelOfLife.rater.sliderMin') }}</span>
            <span>{{ t('exerciseWizards.wheelOfLife.rater.sliderMax') }}</span>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium text-on-surface-variant">
            {{ t('exerciseWizards.wheelOfLife.rater.visionLabel') }}
          </label>
          <textarea
            :value="area.visionSnapshot"
            rows="3"
            :placeholder="t('exerciseWizards.wheelOfLife.rater.visionPlaceholder')"
            class="neo-input w-full min-h-[88px] p-3 text-sm resize-none"
            @input="$emit('set-vision', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="space-y-2">
        <label class="text-xs font-medium text-on-surface-variant">
          {{ t('exerciseWizards.wheelOfLife.rater.positiveInfluencesLabel') }}
        </label>
        <textarea
          :value="area.positiveInfluences"
          rows="2"
          :placeholder="t('exerciseWizards.wheelOfLife.rater.positiveInfluencesPlaceholder')"
          class="neo-input w-full min-h-[72px] p-3 text-sm resize-none"
          @input="$emit('set-positive-influences', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="space-y-2">
        <label class="text-xs font-medium text-on-surface-variant">
          {{ t('exerciseWizards.wheelOfLife.rater.negativeInfluencesLabel') }}
        </label>
        <textarea
          :value="area.negativeInfluences"
          rows="2"
          :placeholder="t('exerciseWizards.wheelOfLife.rater.negativeInfluencesPlaceholder')"
          class="neo-input w-full min-h-[72px] p-3 text-sm resize-none"
          @input="$emit('set-negative-influences', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import WheelOfLifeRadialChart from './WheelOfLifeRadialChart.vue'
import type { WheelDraftArea } from './wheelOfLifeTypes'

const { t } = useT()

const props = defineProps<{
  area: WheelDraftArea
  areas: WheelDraftArea[]
  currentIndex: number
}>()

defineEmits<{
  rate: [value: number]
  'set-positive-influences': [value: string]
  'set-negative-influences': [value: string]
  'set-vision': [value: string]
}>()

const ratingColor = computed(() => {
  const rating = props.area.rating
  if (rating >= 8) return 'text-status-good'
  if (rating >= 6) return 'text-primary'
  if (rating >= 4) return 'text-status-warn'
  return 'text-status-bad'
})

const totalAreas = computed(() => props.areas.length)
const fillPercent = computed(() => Math.max(0, Math.min((props.area.rating / 10) * 100, 100)))
</script>

<style scoped>
.wheel-slider {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

.wheel-slider:focus {
  outline: none;
}

.wheel-slider::-webkit-slider-runnable-track {
  height: 2px;
  background: transparent;
}

.wheel-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: rgb(var(--color-surface));
  border: 3px solid rgb(var(--color-primary) / 0.7);
  box-shadow: 0 2px 6px rgb(var(--neo-shadow-dark) / 0.4);
  transition: transform 0.15s ease;
  margin-top: -10px;
}

.wheel-slider:active::-webkit-slider-thumb {
  transform: scale(1.05);
}

.wheel-slider::-moz-range-track {
  height: 2px;
  background: transparent;
}

.wheel-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  background: rgb(var(--color-surface));
  border: 3px solid rgb(var(--color-primary) / 0.7);
  box-shadow: 0 2px 6px rgb(var(--neo-shadow-dark) / 0.4);
  transition: transform 0.15s ease;
}

.wheel-slider:active::-moz-range-thumb {
  transform: scale(1.05);
}
</style>
