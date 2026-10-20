<template>
  <PlanningNextWorkspace :scale="scale" :period-ref="periodRef" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { PlanningWorkspaceProps } from '@/design-system/contracts'

defineProps<PlanningWorkspaceProps>()

const PlanningNextWorkspace = defineAsyncComponent(
  () => import('@/features/planning-next/PlanningNextWorkspace.vue')
)
</script>
