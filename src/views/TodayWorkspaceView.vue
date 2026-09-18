<template>
  <component :is="renderer" :day-ref="dayRef" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { PlanningUi } from '@/design-system/contracts'
import type { DayRef } from '@/domain/period'

/** `?ui=legacy` keeps the previous Today screen reachable for comparison. */
const props = defineProps<{ dayRef: DayRef; ui: PlanningUi }>()

const LegacyRenderer = defineAsyncComponent(() => import('@/views/TodayView.vue'))
const NextRenderer = defineAsyncComponent(() => import('@/features/planning-next/TodayWorkspace.vue'))
const renderer = computed(() => (props.ui === 'legacy' ? LegacyRenderer : NextRenderer))
</script>
