<template>
  <p v-if="!sorted.length" class="text-xs text-on-surface-variant">
    {{ t('planning.periodPicker.noPeriods') }}
  </p>
  <div v-else-if="sorted.length <= 3" class="flex flex-wrap gap-1">
    <span v-for="period in sorted" :key="period" class="mg-v2-badge">{{ label(period) }}</span>
  </div>
  <details v-else class="text-xs text-on-surface-variant">
    <summary class="cursor-pointer py-1">{{ summary }}</summary>
    <div class="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
      <span v-for="period in sorted" :key="period" class="mg-v2-badge">{{ label(period) }}</span>
    </div>
  </details>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getNextPeriod, getPeriodBounds } from '@/utils/periods'
import { formatMonthTitle, formatWeekRange } from '@/utils/periodLabels'
const props = defineProps<{ periods: string[]; cadence: 'weekly' | 'monthly' }>()
const { t, locale } = useT()
const sorted = computed(() => [...new Set(props.periods)].sort())
function label(period: string) {
  return props.cadence === 'weekly'
    ? formatWeekRange(period as WeekRef, locale.value)
    : formatMonthTitle(period as MonthRef, locale.value)
}
const summary = computed(() => {
  const refs = sorted.value
  const count = t('planning.periodPicker.selected', { count: refs.length })
  if (!refs.length) return count
  const contiguous = refs.every(
    (period, index) => !index || getNextPeriod(refs[index - 1] as MonthRef | WeekRef) === period
  )
  if (!contiguous) return `${count} · ${t('planning.periodPicker.withGaps')}`
  const start = getPeriodBounds(refs[0] as MonthRef | WeekRef).start
  const end = getPeriodBounds(refs[refs.length - 1] as MonthRef | WeekRef).end
  const dates = new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatRange(new Date(`${start}T12:00:00`), new Date(`${end}T12:00:00`))
  return `${dates} · ${count}`
})
</script>
