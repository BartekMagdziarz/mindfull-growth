<template>
  <div class="surface-frame" :class="`surface-frame--${viewport}`">
    <div class="surface-frame__viewport surface-frame__viewport--experiment">
      <component
        :is="activeComponent"
        :key="`${viewId}:${variantId}:${presetId}:${revision}`"
        :preset-id="presetId"
        :variant-id="variantId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LabViewId } from '@product/dev/richVerificationScenario'
import TodayReplica from '~lab/experiments/TodayReplica.vue'
import MonthReplica from '~lab/experiments/MonthReplica.vue'
import WeekReplica from '~lab/experiments/WeekReplica.vue'
import WeeklyRitualReplica from '~lab/experiments/WeeklyRitualReplica.vue'
import MonthlyRitualReplica from '~lab/experiments/MonthlyRitualReplica.vue'
import YearReplica from '~lab/experiments/YearReplica.vue'
import AnnualRitualReplica from '~lab/experiments/AnnualRitualReplica.vue'

const props = defineProps<{
  viewId: LabViewId
  variantId: string
  presetId: string
  viewport: 'fluid' | 'desktop' | 'mobile'
  revision: number
}>()

const components = {
  today: TodayReplica,
  'calendar-year': YearReplica,
  'calendar-month': MonthReplica,
  'calendar-week': WeekReplica,
  'ritual-week': WeeklyRitualReplica,
  'ritual-month': MonthlyRitualReplica,
  'ritual-year': AnnualRitualReplica,
}
const activeComponent = computed(() => components[props.viewId])
</script>
