<template>
  <component
    :is="renderer"
    :scale="scale"
    :period-ref="periodRef"
    :ui="ui"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { PlanningWorkspaceProps } from '@/design-system/contracts'

const props = defineProps<PlanningWorkspaceProps>()
const LegacyRenderer = defineAsyncComponent(() => import('@/features/planning-next/PlanningLegacyRenderer.vue'))
const NextRenderer = defineAsyncComponent(() => import('@/features/planning-next/PlanningNextWorkspace.vue'))
const renderer = computed(() => props.ui === 'legacy' ? LegacyRenderer : NextRenderer)
</script>
