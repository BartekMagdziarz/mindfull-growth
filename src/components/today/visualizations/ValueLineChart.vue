<template>
  <SparklineValueLine
    :points="chartPoints"
    cadence="daily"
    :compact="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SparklineValueLine from '@/components/objects/sparklines/SparklineValueLine.vue'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import type { TodayDaySlot } from '@/services/todayChartData'

const props = defineProps<{
  slots: TodayDaySlot[]
  targetValue?: number
}>()

const chartPoints = computed<ObjectsLibraryChartPoint[]>(() =>
  props.slots.map(slot => ({
    periodRef: slot.dayRef,
    actualValue: slot.value,
    targetValue: props.targetValue,
    status: slot.hasEntry ? ('no-target' as const) : ('no-data' as const),
  })),
)
</script>
