<template>
  <div class="flex flex-wrap items-center gap-1">
    <select
      class="neo-inset min-w-0 flex-none rounded-xl py-0.5 pl-1.5 pr-4 text-[11px] text-on-surface"
      :value="target.operator"
      :disabled="disabled"
      @change="$emit('operatorChange', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="op in operatorOpts"
        :key="op"
        :value="op"
      >
        {{ op }}
      </option>
    </select>

    <select
      v-if="aggregationOpts.length > 0"
      class="neo-inset min-w-0 flex-none rounded-xl py-0.5 pl-1.5 pr-4 text-[11px] text-on-surface"
      :value="aggValue"
      :disabled="disabled"
      @change="$emit('aggregationChange', ($event.target as HTMLSelectElement).value)"
    >
      <option
        v-for="agg in aggregationOpts"
        :key="agg"
        :value="agg"
      >
        {{ agg }}
      </option>
    </select>

    <input
      class="neo-inset w-12 min-w-0 flex-none rounded-xl py-0.5 px-1.5 text-[11px] text-on-surface"
      type="number"
      step="0.1"
      :value="target.value"
      :disabled="disabled"
      @change="$emit('valueChange', Number(($event.target as HTMLInputElement).value))"
    />

    <template v-if="entryDays">
      <span class="text-[11px] text-on-surface-variant">·</span>
      <select
        class="neo-inset min-w-0 flex-none rounded-xl py-0.5 pl-1.5 pr-4 text-[11px] text-on-surface"
        :value="entryDays.operator"
        :disabled="disabled"
        :aria-label="t('planning.calendar.planner.entryDaysOperator')"
        @change="onEntryDaysOperator(($event.target as HTMLSelectElement).value)"
      >
        <option value="min">min</option>
        <option value="max">max</option>
      </select>
      <input
        class="neo-inset w-10 min-w-0 flex-none rounded-xl py-0.5 px-1.5 text-[11px] text-on-surface"
        type="number"
        min="1"
        :max="entryDaysMax"
        step="1"
        :value="entryDays.value"
        :disabled="disabled"
        :aria-label="t('planning.objects.targetSentence.entryDaysValueLabel')"
        @change="onEntryDaysValue(Number(($event.target as HTMLInputElement).value))"
      />
      <span class="text-[11px] text-on-surface-variant">
        {{ t('planning.objects.targetSentence.entryDaysUnit') }}
      </span>
      <button
        type="button"
        class="rounded-full p-0.5 text-on-surface-variant transition-colors hover:bg-section hover:text-primary"
        :title="t('planning.calendar.planner.entryDaysRemove')"
        :disabled="disabled"
        @click="$emit('entryDaysChange', undefined)"
      >
        <AppIcon name="close" class="text-xs" />
      </button>
    </template>
    <button
      v-else-if="allowEntryDays"
      type="button"
      class="rounded-full px-1.5 py-0.5 text-[11px] font-medium text-on-surface-variant underline decoration-dotted underline-offset-2 transition-colors hover:text-on-surface"
      :title="t('planning.objects.targetSentence.addEntryDays')"
      :disabled="disabled"
      @click="$emit('entryDaysChange', { operator: 'min', value: entryDaysDefault })"
    >
      {{ t('planning.calendar.planner.entryDaysAdd') }}
    </button>

    <button
      v-if="hasOverride"
      type="button"
      class="rounded-full p-0.5 text-on-surface-variant transition-colors hover:bg-section hover:text-primary"
      :title="t('planning.calendar.planner.clearOverride')"
      @click="$emit('clearOverride')"
    >
      <AppIcon name="undo" class="text-xs" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { MeasurementEntryDaysCondition, MeasurementTarget } from '@/domain/planning'

const props = withDefaults(
  defineProps<{
    target: MeasurementTarget
    hasOverride: boolean
    disabled?: boolean
    /** Offer the "+ dni" affordance (false for completion-mode subjects). */
    allowEntryDays?: boolean
    /** Upper bound for the entry-days input (7 for weekly rows, 31 for monthly). */
    entryDaysMax?: number
    /** Default day count when the condition is added. */
    entryDaysDefault?: number
  }>(),
  { allowEntryDays: false, entryDaysMax: 7, entryDaysDefault: 5 },
)

const emit = defineEmits<{
  operatorChange: [value: string]
  aggregationChange: [value: string]
  valueChange: [value: number]
  entryDaysChange: [condition: MeasurementEntryDaysCondition | undefined]
  clearOverride: []
}>()

const { t } = useT()

const entryDays = computed(() => props.target.entryDays)

const operatorOpts = computed(() =>
  props.target.kind === 'count' ? ['min', 'max'] : ['gte', 'lte']
)

const aggregationOpts = computed(() => {
  if (props.target.kind === 'count') return []
  return props.target.kind === 'rating' ? ['average'] : ['sum', 'average', 'last']
})

const aggValue = computed(() => {
  switch (props.target.kind) {
    case 'count':
      return ''
    case 'rating':
      return 'average'
    case 'value':
      return props.target.aggregation
    default:
      return ''
  }
})

function onEntryDaysOperator(value: string): void {
  const condition = entryDays.value
  if (!condition) return
  emit('entryDaysChange', { ...condition, operator: value === 'max' ? 'max' : 'min' })
}

function onEntryDaysValue(value: number): void {
  const condition = entryDays.value
  if (!condition || !Number.isFinite(value)) return
  const days = Math.min(props.entryDaysMax, Math.max(1, Math.round(value)))
  emit('entryDaysChange', { ...condition, value: days })
}
</script>
