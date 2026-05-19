<template>
  <div class="flex items-end gap-2">
    <div class="min-w-0 flex-1">
      <SparklineValueLine
        :points="chartPoints"
        cadence="daily"
        :compact="true"
        :hide-labels="true"
      />
    </div>
    <div class="flex shrink-0 flex-col items-end leading-tight">
      <span class="text-sm font-semibold tabular-nums text-on-surface">
        {{ aggregateLabel }}
      </span>
      <span class="mt-0.5 text-[11px] text-on-surface-variant">
        {{ t('planning.today.summary.entries', { n: data.entryCount }) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SparklineValueLine from '@/components/objects/sparklines/SparklineValueLine.vue'
import { useT } from '@/composables/useT'
import type { ObjectsLibraryChartPoint } from '@/services/objectsLibraryQueries'
import type { TodayValueSparklineData } from '@/services/todayChartData'

const props = defineProps<{
  data: TodayValueSparklineData
}>()

const { t } = useT()

const chartPoints = computed<ObjectsLibraryChartPoint[]>(() =>
  props.data.points.map((slot) => ({
    periodRef: slot.dayRef,
    actualValue: slot.value,
    targetValue: props.data.targetValue,
    status: slot.hasEntry ? ('no-target' as const) : ('no-data' as const),
    // Past + today render at full opacity; only future entries fade. Previously
    // this was `slot.isToday`, which made every non-today dot dim — losing the
    // distinction between past (recorded) and future (pre-filled).
    isCurrent: !slot.isFuture,
  })),
)

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

const aggregateLabel = computed(() => {
  if (!props.data.hasData) return '—'
  const prefix =
    props.data.aggregationLabel === 'avg'
      ? 'avg '
      : props.data.aggregationLabel === 'last'
        ? 'last '
        : ''
  return `${prefix}${formatNumber(props.data.aggregate)}`
})
</script>
