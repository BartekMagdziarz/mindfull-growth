<template>
  <div class="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-base font-semibold text-on-surface">
          {{ item.priority.name }}
        </p>

        <div v-if="item.lifeAreas.length > 0" class="flex items-center gap-1">
          <EntityIcon
            v-for="lifeArea in item.lifeAreas"
            :key="lifeArea.id"
            :icon="lifeArea.icon"
            :color="lifeArea.color"
            size="xs"
            :title="lifeArea.name"
          />
        </div>
      </div>
    </div>

    <div class="lg:max-w-[65%] lg:min-w-[18rem]">
      <TodayProjectCluster :projects="item.projectSignals" />
    </div>
  </div>
</template>

<script setup lang="ts">
import EntityIcon from '@/components/planning/EntityIcon.vue'
import TodayProjectCluster from './TodayProjectCluster.vue'
import type { TodayPriorityCompassItem } from '@/types/today'

defineProps<{
  item: TodayPriorityCompassItem
}>()
</script>
