<template>
  <div class="mini-chart" role="img" :aria-label="ariaLabel">
    <div class="mini-chart__plot">
      <span v-if="targetY !== null" class="mini-chart__target" :style="{ bottom: `${targetY}%` }" />
      <span
        v-for="point in points"
        :key="point.periodRef"
        class="mini-chart__column"
        :title="`${point.periodRef}: ${point.value ?? 'brak danych'}`"
      >
        <span
          class="mini-chart__bar"
          :class="`mini-chart__bar--${point.status}`"
          :style="{ height: `${barHeight(point.value)}%` }"
        />
        <small>{{ point.label }}</small>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LabChartPoint } from '@product/dev/richVerificationScenario'

const props = defineProps<{ points: LabChartPoint[]; label?: string }>()
const maxValue = computed(() => Math.max(1, ...props.points.map(point => point.value ?? 0), ...props.points.map(point => point.target ?? 0)))
const target = computed(() => props.points.find(point => point.target !== undefined)?.target)
const targetY = computed(() => target.value === undefined ? null : Math.min(94, (target.value / maxValue.value) * 88))
const ariaLabel = computed(() => props.label ?? `Wykres z ${props.points.length} okresów`)
const barHeight = (value?: number) => value === undefined ? 2 : Math.max(7, Math.min(92, (value / maxValue.value) * 88))
</script>
