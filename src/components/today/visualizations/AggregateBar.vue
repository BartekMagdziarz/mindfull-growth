<template>
  <div class="flex items-center gap-2" :title="data.hoverLabel">
    <!-- Progress track -->
    <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neu-border/10">
      <!-- Fill bar -->
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="fillClass"
        :style="{ width: `${fillPercent}%` }"
      />
      <!-- Target tick -->
      <div
        class="absolute top-0 h-full w-0.5 rounded-full bg-on-surface-variant/30"
        :style="{ left: `${tickPercent}%` }"
      />
    </div>
    <!-- Value label -->
    <span v-if="!hideValue" class="shrink-0 text-[10px] font-semibold tabular-nums" :class="textClass">
      {{ formatNumber(data.currentValue) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodayAggregateData } from '@/services/todayChartData'

const props = defineProps<{
  data: TodayAggregateData
  hideValue?: boolean
}>()

const isInverted = computed(() => props.data.operator === 'max' || props.data.operator === 'lte')

const fillPercent = computed(() => {
  if (props.data.scaleMax <= 0) return 0
  return Math.min(100, (props.data.currentValue / props.data.scaleMax) * 100)
})

const tickPercent = computed(() => {
  if (props.data.scaleMax <= 0) return 0
  return Math.min(100, (props.data.targetValue / props.data.scaleMax) * 100)
})

const fillClass = computed(() => {
  const status = props.data.status
  if (status === 'met') return isInverted.value ? 'bg-primary/40' : 'bg-primary/50'
  if (status === 'missed') return isInverted.value ? 'bg-error/45' : 'bg-error/45'
  return 'bg-primary/30'
})

const textClass = computed(() => {
  switch (props.data.status) {
    case 'met': return 'text-primary'
    case 'missed': return 'text-error'
    default: return 'text-on-surface-variant'
  }
})

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}
</script>
