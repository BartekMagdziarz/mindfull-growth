<template>
  <!-- Nothing to draw = nothing drawn: the host says "choose weeks" once. -->
  <div v-if="visiblePoints.length > 0" class="w-full">
    <SparklineValueLine
      v-if="entryMode === 'value'"
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

    <SparklineBar v-else :points="visiblePoints" :cadence="cadence" :compact="compact" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  { entryMode: 'completion', compact: false }
)

const visiblePoints = computed(() => getVisiblePoints(props.points, props.cadence))
</script>
