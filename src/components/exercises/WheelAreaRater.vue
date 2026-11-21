<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm text-on-surface-variant">
      <div class="flex items-center gap-2">
        <span class="font-medium text-on-surface">{{
          t('exerciseWizards.wheelOfLife.rater.areaLabel', { n: currentIndex + 1 })
        }}</span>
        <span>{{ t('exerciseWizards.wheelOfLife.rater.ofTotal', { total: totalAreas }) }}</span>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-start">
      <div class="mg-v2-block p-4">
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
          <p class="text-sm text-on-surface-variant">
            {{ t('exerciseWizards.wheelOfLife.rater.alignmentQuestion') }}
          </p>
          <ExerciseStepWhy :text="tg('exerciseWizards.wheelOfLife.rater.why')" />
        </div>

        <div class="flex items-baseline gap-2">
          <span class="text-6xl font-bold" :class="ratingColor">{{ area.rating }}</span>
          <span class="text-xl text-on-surface-variant">{{
            t('exerciseWizards.wheelOfLife.rater.outOfTen')
          }}</span>
        </div>

        <div class="space-y-2">
          <ExerciseRangeInput
            :min="1"
            :max="10"
            :model-value="area.rating"
            :aria-label="area.name"
            @update:model-value="$emit('rate', $event)"
          />
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
            class="mg-v2-input w-full min-h-[88px] p-3 text-sm resize-none"
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
          class="mg-v2-input w-full min-h-[72px] p-3 text-sm resize-none"
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
          class="mg-v2-input w-full min-h-[72px] p-3 text-sm resize-none"
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
import ExerciseRangeInput from './ExerciseRangeInput.vue'
import ExerciseStepWhy from '@/components/exercises/ExerciseStepWhy.vue'
import type { WheelDraftArea } from './wheelOfLifeTypes'

const { t, tg } = useT()

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
</script>
