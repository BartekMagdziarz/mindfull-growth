<template>
  <AppCard class="neo-raised w-full">
    <div class="space-y-5">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
          {{ t('today.progress.eyebrow') }}
        </p>
        <h3 class="mt-2 text-xl font-semibold text-on-surface">
          {{ t('today.progress.title') }}
        </h3>
      </div>

      <TodayCadenceLane
        v-for="lane in lanes"
        :key="lane.cadence"
        :lane="lane"
        @logged="emit('logged', $event)"
      />
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppCard from '@/components/AppCard.vue'
import { useT } from '@/composables/useT'
import type { TodayProgressLane } from '@/types/today'
import TodayCadenceLane from './TodayCadenceLane.vue'

const { t } = useT()

defineProps<{
  lanes: TodayProgressLane[]
}>()

const emit = defineEmits<{
  logged: [trackerId: string]
}>()
</script>
