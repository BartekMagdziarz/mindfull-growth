<template>
  <div class="w-full">
    <div
      v-if="visiblePoints.length === 0"
      :class="compact ? 'h-[52px]' : 'h-[96px]'"
      class="flex items-center justify-center text-[10px] text-on-surface-variant/40"
    >
      {{ t('planning.objects.chart.noActivePeriods') }}
    </div>

    <SparklineValueLine
      v-else-if="entryMode === 'value'"
      :points="visiblePoints"
      :cadence="cadence"
      :compact="compact"
    />

    <SparklineRatingGauge
      v-else-if="entryMode === 'rating'"
      :points="visiblePoints"
      :cadence="cadence"
      :compact="compact"
    />

    <SparklineBar
      v-else
      :points="visiblePoints"
      :cadence="cadence"
      :compact="compact"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode } from '@/domain/planning'
import { getVisiblePoints } from './sparklines/sparklineUtils'
import SparklineBar from './sparklines/SparklineBar.vue'
import SparklineValueLine from './sparklines/SparklineValueLine.vue'
import SparklineRatingGauge from './sparklines/SparklineRatingGauge.vue'

const props = withDefaults(
  defineProps<{
    points: ObjectsLibraryChartPoint[]
    cadence: 'weekly' | 'monthly' | 'daily'
    entryMode?: MeasurementEntryMode
    compact?: boolean
  }>(),
  { entryMode: 'completion', compact: false },
)

const { t } = useT()

const visiblePoints = computed(() => getVisiblePoints(props.points, props.cadence))
</script>
