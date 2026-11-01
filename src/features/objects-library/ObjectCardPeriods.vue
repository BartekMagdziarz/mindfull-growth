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
import { getNextPeriod } from '@/utils/periods'
import { formatPeriodRange } from '@/utils/periodRangeFormat'

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

const rangeLabel = computed(() => formatPeriodRange(sorted.value, props.cadence, locale.value))

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
