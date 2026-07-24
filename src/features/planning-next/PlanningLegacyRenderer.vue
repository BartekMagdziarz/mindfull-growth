<template>
  <TodayRenderer v-if="scale === 'day'" :day-ref="periodRef as DayRef" />
  <CalendarRenderer
    v-else
    :scale="calendarScale"
    :period-ref="periodRef"
    v-bind="monthExperimentProps"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import type { PlanningScale } from '@/design-system/contracts'
import type { DayRef } from '@/domain/period'
import { resolveCalendarMonthExperiment } from '@/router/calendarExperimentQuery'

const props = defineProps<{
  scale: PlanningScale
  periodRef: string
}>()

const route = useRoute()
const TodayRenderer = defineAsyncComponent(() => import('@/views/TodayView.vue'))
const CalendarRenderer = defineAsyncComponent(() => import('@/views/CalendarView.vue'))
const calendarScale = computed(() => props.scale as Exclude<PlanningScale, 'day'>)
const monthExperimentProps = computed(() => props.scale === 'month'
  ? resolveCalendarMonthExperiment(route.query)
  : {})
</script>
