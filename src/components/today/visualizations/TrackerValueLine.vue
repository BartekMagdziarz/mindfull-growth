<template>
  <SparklineValueLine
    :points="chartPoints"
    cadence="daily"
    :compact="true"
    :color-theme="colorTheme"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SparklineValueLine from '@/components/objects/sparklines/SparklineValueLine.vue'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import type { TodayDaySlot } from '@/services/todayChartData'
import type { ChartColorTheme } from '@/components/objects/sparklines/sparklineUtils'

const props = withDefaults(
  defineProps<{
    slots: TodayDaySlot[]
    colorTheme?: ChartColorTheme
  }>(),
  { colorTheme: 'tracker' },
)

const chartPoints = computed<ObjectsLibraryChartPoint[]>(() =>
  props.slots.map(slot => ({
    periodRef: slot.dayRef,
    actualValue: slot.value,
    targetValue: undefined,
    status: slot.hasEntry ? ('no-target' as const) : ('no-data' as const),
  })),
)
</script>
