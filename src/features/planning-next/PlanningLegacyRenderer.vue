<template>
  <CalendarRenderer
    :scale="scale"
    :period-ref="periodRef"
    v-bind="monthExperimentProps"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import type { CalendarScale } from '@/design-system/contracts'
import { resolveCalendarMonthExperiment } from '@/router/calendarExperimentQuery'

const props = defineProps<{
  scale: CalendarScale
  periodRef: string
}>()

const route = useRoute()
const CalendarRenderer = defineAsyncComponent(() => import('@/views/CalendarView.vue'))
const monthExperimentProps = computed(() => props.scale === 'month'
  ? resolveCalendarMonthExperiment(route.query)
  : {})
</script>
