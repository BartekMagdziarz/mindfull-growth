<template>
  <div class="flex w-full flex-col gap-1">
    <SparklineValueLine
      :points="chartPoints"
      cadence="daily"
      :compact="true"
      :hide-labels="true"
    />
    <div class="day-labels">
      <span
        v-for="slot in slots"
        :key="slot.dayRef"
        class="day-label"
      >
        {{ slot.label }}
      </span>
    </div>
  </div>
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

<style scoped>
.day-labels {
  display: flex;
  width: 100%;
  padding: 0 4px;
}

.day-label {
  flex: 1 1 0;
  text-align: center;
  font-size: 11px;
  line-height: 1;
  color: rgb(var(--neo-muted) / 0.7);
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>
