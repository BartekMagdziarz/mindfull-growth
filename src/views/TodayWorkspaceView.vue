<template>
  <TodayWorkspace :day-ref="dayRef" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { DayRef } from '@/domain/period'

defineProps<{ dayRef: DayRef }>()

const TodayWorkspace = defineAsyncComponent(
  () => import('@/features/planning-next/TodayWorkspace.vue')
)
</script>
