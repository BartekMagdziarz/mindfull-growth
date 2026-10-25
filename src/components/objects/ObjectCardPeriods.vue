<template>
  <!-- A permanent habit is simply "ongoing" — its periods follow the plan. -->
  <button
    v-if="isPermanent"
    type="button"
    class="mg-v2-inline-trigger ocp"
    :aria-label="t('planning.objects.periodsLine.label')"
    :disabled="disabled"
    @click="$emit('open')"
  >
    <span class="mg-v2-meta">
      <span class="mg-v2-meta__status">{{ t('planning.objects.periodsLine.permanent') }}</span>
    </span>
  </button>

  <!-- Nothing chosen yet: the line drawn in pencil. -->
  <button
    v-else-if="sorted.length === 0"
    type="button"
    class="mg-v2-ghost mg-v2-ghost--line"
    :disabled="disabled"
    @click="$emit('open')"
  >
    {{
      cadence === 'monthly'
        ? t('planning.objects.periodsLine.chooseMonths')
        : t('planning.objects.periodsLine.chooseWeeks')
    }}
  </button>

  <!-- "29 cze – 25 paź · 17 tygodni [· z przerwami]" — one quiet line; click edits. -->
  <button
    v-else
    type="button"
    class="mg-v2-inline-trigger ocp"
    :aria-label="t('planning.objects.periodsLine.label')"
    :disabled="disabled"
    @click="$emit('open')"
  >
    <span class="mg-v2-meta">
      <span>{{ rangeLabel }}</span>
      <span class="mg-v2-meta__status">{{ countLabel }}</span>
      <span v-if="hasGaps">{{ t('planning.objects.periodsLine.withGaps') }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { MonthRef, WeekRef } from '@/domain/period'
import { getNextPeriod, getPeriodBounds } from '@/utils/periods'

const props = withDefaults(
  defineProps<{
    periods: string[]
    cadence: 'weekly' | 'monthly'
    isPermanent?: boolean
    disabled?: boolean
  }>(),
  { isPermanent: false, disabled: false }
)

defineEmits<{ open: [] }>()

const { t, tp, locale } = useT()

const sorted = computed(() => [...new Set(props.periods)].sort())

const hasGaps = computed(() =>
  sorted.value.some(
    (period, index) =>
      index > 0 && getNextPeriod(sorted.value[index - 1] as MonthRef | WeekRef) !== period
  )
)

// The year shows only when the window leaves the current year.
const rangeLabel = computed(() => {
  const refs = sorted.value
  if (!refs.length) return ''
  const start = getPeriodBounds(refs[0] as MonthRef | WeekRef).start
  const end = getPeriodBounds(refs[refs.length - 1] as MonthRef | WeekRef).end
  const currentYear = String(new Date().getFullYear())
  const withYear = start.slice(0, 4) !== currentYear || end.slice(0, 4) !== currentYear
  const options: Intl.DateTimeFormatOptions =
    props.cadence === 'monthly'
      ? { month: 'short', ...(withYear ? { year: 'numeric' } : {}) }
      : { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }
  return new Intl.DateTimeFormat(locale.value, options).formatRange(
    new Date(`${start}T12:00:00`),
    new Date(`${end}T12:00:00`)
  )
})

const countLabel = computed(() => {
  const base =
    props.cadence === 'monthly'
      ? 'planning.objects.periodsLine.months'
      : 'planning.objects.periodsLine.weeks'
  return tp(sorted.value.length, `${base}.one`, `${base}.few`, `${base}.many`)
})
</script>

<style scoped>
.ocp {
  padding: var(--mg-space-1) var(--mg-space-2);
}
</style>
