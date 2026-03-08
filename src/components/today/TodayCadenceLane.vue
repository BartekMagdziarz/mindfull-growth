<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 class="text-sm font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
          {{ cadenceTitle }}
        </h4>
        <p class="mt-1 text-sm text-on-surface-variant">{{ lane.periodLabel }}</p>
      </div>
    </div>

    <div
      v-if="!lane.hasPlan"
      class="rounded-2xl border border-neu-border/20 bg-section/45 px-4 py-4 text-sm text-on-surface-variant"
    >
      {{ t(lane.cadence === 'weekly' ? 'today.progress.noWeeklyPlan' : 'today.progress.noMonthlyPlan') }}
    </div>

    <div
      v-else-if="lane.items.length === 0"
      class="rounded-2xl border border-neu-border/20 bg-section/45 px-4 py-4 text-sm text-on-surface-variant"
    >
      {{ t(lane.cadence === 'weekly' ? 'today.progress.emptyWeekly' : 'today.progress.emptyMonthly') }}
    </div>

    <div v-else class="grid gap-3 xl:grid-cols-2">
      <TodayProgressItem
        v-for="item in lane.items"
        :key="item.id"
        :item="item"
        @logged="emit('logged', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { TodayProgressLane } from '@/types/today'
import TodayProgressItem from './TodayProgressItem.vue'

const { t } = useT()

const props = defineProps<{
  lane: TodayProgressLane
}>()

const emit = defineEmits<{
  logged: [trackerId: string]
}>()

const cadenceTitle = computed(() =>
  t(props.lane.cadence === 'weekly' ? 'today.progress.weeklyLane' : 'today.progress.monthlyLane'),
)
</script>
