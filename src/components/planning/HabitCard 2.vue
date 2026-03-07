<template>
  <AppCard class="relative overflow-hidden">
    <!-- Color Bar (from linked Life Area) -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
      :style="{ backgroundColor: accentColor }"
    />

    <div class="pl-3 pr-3 py-3 flex flex-col gap-2">
      <!-- Header -->
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <RouterLink
            :to="`/planning/habits/${habit.id}`"
            class="text-sm font-semibold text-on-surface hover:text-primary transition-colors truncate block"
          >
            {{ habit.name }}
          </RouterLink>
        </div>
        <!-- Cadence badge -->
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-section text-on-surface-variant capitalize flex-shrink-0">
          {{ habit.cadence }}
        </span>
      </div>

      <!-- Tracker summary -->
      <div v-if="tracker" class="flex items-center gap-2 text-xs text-on-surface-variant">
        <ChartBarIcon class="w-3.5 h-3.5 flex-shrink-0" />
        <span>{{ trackerSummary }}</span>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartBarIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import type { Habit } from '@/domain/habit'
import type { LifeArea } from '@/domain/lifeArea'
import { useTrackerStore } from '@/stores/tracker.store'

const props = defineProps<{
  habit: Habit
  lifeAreas?: LifeArea[]
}>()

const trackerStore = useTrackerStore()

const tracker = computed(() => {
  const trackers = trackerStore.getTrackersByHabit(props.habit.id)
  return trackers.length > 0 ? trackers[0] : undefined
})

const accentColor = computed(() => {
  if (!props.lifeAreas?.length || !props.habit.lifeAreaIds?.length) return 'rgb(var(--color-primary))'
  const la = props.lifeAreas.find((la) => props.habit.lifeAreaIds.includes(la.id))
  return la?.color || 'rgb(var(--color-primary))'
})

const trackerSummary = computed(() => {
  const t = tracker.value
  if (!t) return ''
  if (t.type === 'checkin') return `${t.cadence} check-in`
  if (t.type === 'adherence' && t.targetCount) return `${t.targetCount}x ${t.cadence} ${t.type}`
  return `${t.cadence} ${t.type}`
})
</script>
