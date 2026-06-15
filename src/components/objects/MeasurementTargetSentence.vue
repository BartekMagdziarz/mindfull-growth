<script setup lang="ts">
import { computed } from 'vue'
import KrPillDropdown from '@/components/objects/KrPillDropdown.vue'
import { useT } from '@/composables/useT'
import type {
  ComparisonOperator,
  CountTargetOperator,
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  ValueTargetAggregation,
} from '@/domain/planning'

const props = withDefaults(
  defineProps<{
    entryMode: MeasurementEntryMode
    target: MeasurementTarget
    cadence?: PlanningCadence
    ratingScale?: number
    ratingScaleMin?: number
    /** Render the leading entry-mode pill. Hosts that pick the mode elsewhere can hide it. */
    showMode?: boolean
    /** Render only the pills, without the inset surface wrapper (the host provides it). */
    bare?: boolean
    disabled?: boolean
  }>(),
  {
    cadence: 'weekly',
    ratingScale: 5,
    ratingScaleMin: 1,
    showMode: true,
    bare: false,
    disabled: false,
  },
)

// A single atomic event carrying the full {entryMode, target} pair on every change.
// Two separate emits would race in hosts that re-derive from props (e.g. patch({...modelValue})):
// the second emit would overwrite the first with stale props.
const emit = defineEmits<{
  'update:measurement': [value: { entryMode: MeasurementEntryMode; target: MeasurementTarget }]
}>()

const { t } = useT()

function commit(entryMode: MeasurementEntryMode, target: MeasurementTarget): void {
  emit('update:measurement', { entryMode, target })
}

// Verb forms ("Wykonuj / Zliczaj / Mierz / Oceniaj") so the mode pill reads as the
// start of a sentence. The noun badges stay where they label/summarise the mode.
const entryModeOptions = computed(() => [
  { value: 'completion', label: t('planning.objects.targetSentence.mode.completion') },
  { value: 'counter', label: t('planning.objects.targetSentence.mode.counter') },
  { value: 'value', label: t('planning.objects.targetSentence.mode.value') },
  { value: 'rating', label: t('planning.objects.targetSentence.mode.rating') },
])

// Operator labels are now words ("co najmniej / co najwyżej") for every kind, so the
// sentence reads naturally instead of exposing >= / <= notation.
const operatorOptions = computed(() => {
  if (props.entryMode === 'completion' || props.entryMode === 'counter') {
    return [
      { value: 'min', label: t('planning.objects.targetOperators.min') },
      { value: 'max', label: t('planning.objects.targetOperators.max') },
    ]
  }
  return [
    { value: 'gte', label: t('planning.objects.targetOperators.gte') },
    { value: 'lte', label: t('planning.objects.targetOperators.lte') },
  ]
})

const aggregationOptions = computed(() => [
  { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
  { value: 'average', label: t('planning.objects.targetAggregations.average') },
  { value: 'last', label: t('planning.objects.targetAggregations.last') },
])

// Aggregation is a real choice only for 'value'. 'rating' is locked to 'average'
// and shown as a plain word; count modes have no aggregation.
const showAggregation = computed(() => props.entryMode === 'value')

const aggregationValue = computed(() => {
  const target = props.target
  if (target.kind === 'value' || target.kind === 'rating') return target.aggregation
  return undefined
})

const valueAttrs = computed(() => {
  if (props.target.kind === 'count') return { min: 1, step: 1, inputmode: 'numeric' as const }
  if (props.target.kind === 'rating') {
    return { min: props.ratingScaleMin, max: props.ratingScale, step: 'any', inputmode: 'decimal' as const }
  }
  return { step: 'any', inputmode: 'decimal' as const }
})

const unitSuffix = computed(() => {
  if (props.entryMode === 'rating') {
    return t('planning.objects.targetSentence.ratingOutOf', { max: props.ratingScale })
  }
  const period =
    props.cadence === 'monthly'
      ? t('planning.objects.targetSentence.perMonth')
      : t('planning.objects.targetSentence.perWeek')
  if (props.entryMode === 'completion') {
    return `${t('planning.objects.targetSentence.timesUnit')} ${period}`
  }
  return period
})

function defaultTargetFor(mode: MeasurementEntryMode): MeasurementTarget {
  switch (mode) {
    case 'completion':
    case 'counter':
      return { kind: 'count', operator: 'min', value: 1 }
    case 'value':
      return { kind: 'value', aggregation: 'sum', operator: 'gte', value: 1 }
    case 'rating':
      return { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 }
  }
}

function onMode(value: string): void {
  const mode = value as MeasurementEntryMode
  if (mode === props.entryMode) return
  commit(mode, defaultTargetFor(mode))
}

function onOperator(value: string): void {
  const target = props.target
  const next: MeasurementTarget =
    target.kind === 'count'
      ? { ...target, operator: value as CountTargetOperator }
      : { ...target, operator: value as ComparisonOperator }
  commit(props.entryMode, next)
}

function onAggregation(value: string): void {
  const target = props.target
  if (target.kind === 'value') {
    commit(props.entryMode, { ...target, aggregation: value as ValueTargetAggregation })
  } else if (target.kind === 'rating') {
    commit(props.entryMode, { ...target, aggregation: 'average' })
  }
}

function onValue(raw: string): void {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return
  const value = props.target.kind === 'count' ? Math.round(parsed) : parsed
  commit(props.entryMode, { ...props.target, value } as MeasurementTarget)
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-on-surface"
    :class="[bare ? '' : 'neo-surface rounded-xl px-3 py-2', disabled ? 'pointer-events-none opacity-60' : '']"
  >
    <KrPillDropdown
      v-if="showMode"
      :model-value="entryMode"
      :options="entryModeOptions"
      :disabled="disabled"
      @update:model-value="onMode"
    />

    <!-- rating: aggregation is fixed to 'average', shown as a plain word -->
    <span v-if="entryMode === 'rating'" class="text-on-surface-variant">
      {{ t('planning.objects.targetAggregations.average').toLowerCase() }}
    </span>

    <KrPillDropdown
      v-if="showAggregation"
      :model-value="aggregationValue ?? 'sum'"
      :options="aggregationOptions"
      :disabled="disabled"
      @update:model-value="onAggregation"
    />

    <KrPillDropdown
      :model-value="target.operator"
      :options="operatorOptions"
      :disabled="disabled"
      @update:model-value="onOperator"
    />

    <input
      type="number"
      v-bind="valueAttrs"
      :value="target.value"
      :disabled="disabled"
      class="neo-input w-16 rounded-full px-2 py-1 text-center text-sm font-semibold text-on-surface"
      :aria-label="t('planning.objects.form.targetValue')"
      @input="onValue(($event.target as HTMLInputElement).value)"
    />

    <span class="text-on-surface-variant">{{ unitSuffix }}</span>
  </div>
</template>
