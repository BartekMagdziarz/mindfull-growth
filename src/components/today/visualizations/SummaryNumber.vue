<template>
  <div class="flex flex-col items-start leading-none">
    <span class="text-2xl font-bold tabular-nums text-on-surface">
      {{ formattedValue }}
    </span>
    <span class="mt-1 text-[11px] text-on-surface-variant">
      {{ sublabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { TodaySummaryNumberData } from '@/services/todayChartData'

const props = defineProps<{
  data: TodaySummaryNumberData
}>()

const { t } = useT()

const formattedValue = computed(() => {
  const value = props.data.value
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
})

const sublabel = computed(() => {
  switch (props.data.sublabelKind) {
    case 'days-logged':
      return t('planning.today.summary.daysLogged', { n: props.data.value })
    case 'total-sum':
      return t('planning.today.summary.totalSum', { n: props.data.value })
    case 'entries':
      return t('planning.today.summary.entries', { n: props.data.entryCount })
  }
  return ''
})
</script>
