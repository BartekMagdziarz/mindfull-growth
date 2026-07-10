<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import KrPillDropdown from '@/components/objects/KrPillDropdown.vue'
import { useT } from '@/composables/useT'
import type {
  ComparisonOperator,
  CountTargetOperator,
  MeasurementEntryDaysCondition,
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
    /** Render the cadence ("per week / per month") as a pill the host can change. */
    showCadence?: boolean
    disabled?: boolean
  }>(),
  {
    cadence: 'weekly',
    ratingScale: 5,
    ratingScaleMin: 1,
    showMode: true,
    bare: false,
    showCadence: false,
    disabled: false,
  },
)

// A single atomic event carrying the full {entryMode, target} pair on every change.
// Two separate emits would race in hosts that re-derive from props (e.g. patch({...modelValue})):
// the second emit would overwrite the first with stale props.
const emit = defineEmits<{
  'update:measurement': [value: { entryMode: MeasurementEntryMode; target: MeasurementTarget }]
  'update:cadence': [value: PlanningCadence]
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

const periodText = computed(() =>
  props.cadence === 'monthly'
    ? t('planning.objects.targetSentence.perMonth')
    : t('planning.objects.targetSentence.perWeek'),
)

const cadenceOptions = computed(() => [
  { value: 'weekly', label: t('planning.objects.targetSentence.perWeek') },
  { value: 'monthly', label: t('planning.objects.targetSentence.perMonth') },
])

function onCadence(value: string): void {
  emit('update:cadence', value as PlanningCadence)
}

function defaultTargetFor(mode: MeasurementEntryMode): MeasurementTarget {
  switch (mode) {
    case 'completion':
    case 'counter':
    case 'multi-completion':
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

// Local buffer for the value: typing stays local (no autosave thrash, no controlled-input
// cursor jumps), committing only on blur/Enter, and re-syncs when the target changes externally.
const localValue = ref(String(props.target.value))
watch(
  () => props.target.value,
  (value) => {
    localValue.value = String(value)
  },
)

function commitValue(): void {
  const parsed = Number(localValue.value)
  if (!Number.isFinite(parsed)) {
    localValue.value = String(props.target.value)
    return
  }
  const value = props.target.kind === 'count' ? Math.round(parsed) : parsed
  commit(props.entryMode, { ...props.target, value } as MeasurementTarget)
}

// --- entryDays clause ("i loguj co najmniej N dni") -------------------------
// Redundant for completion (the primary metric already counts entry days),
// so the clause and its add-button are hidden there.
const entryDays = computed(() => props.target.entryDays)
const canHaveEntryDays = computed(() => props.entryMode !== 'completion')

const entryDaysMax = computed(() => (props.cadence === 'monthly' ? 31 : 7))
const entryDaysDefault = computed(() => (props.cadence === 'monthly' ? 20 : 5))

const entryDaysOperatorOptions = computed(() => [
  { value: 'min', label: t('planning.objects.targetOperators.min') },
  { value: 'max', label: t('planning.objects.targetOperators.max') },
])

const localEntryDaysValue = ref<string | number>(entryDays.value ? String(entryDays.value.value) : '')
watch(entryDays, (condition) => {
  localEntryDaysValue.value = condition ? String(condition.value) : ''
})

function commitEntryDays(condition: MeasurementEntryDaysCondition | undefined): void {
  const { entryDays: _dropped, ...rest } = props.target
  const next = (condition ? { ...rest, entryDays: condition } : rest) as MeasurementTarget
  commit(props.entryMode, next)
}

function addEntryDays(): void {
  commitEntryDays({ operator: 'min', value: entryDaysDefault.value })
}

function onEntryDaysOperator(value: string): void {
  const current = entryDays.value
  if (!current) return
  commitEntryDays({ ...current, operator: value as CountTargetOperator })
}

// Clearing the value is how the condition is removed (no separate delete button).
function commitEntryDaysValue(): void {
  const current = entryDays.value
  if (!current) return
  // v-model on a number input can hold a number, not a string.
  const raw = String(localEntryDaysValue.value ?? '').trim()
  if (!raw) {
    commitEntryDays(undefined)
    return
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    localEntryDaysValue.value = String(current.value)
    return
  }
  const value = Math.min(entryDaysMax.value, Math.max(1, Math.round(parsed)))
  commitEntryDays({ ...current, value })
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-on-surface"
    :class="[bare ? '' : 'neo-surface rounded-xl px-3 py-2', disabled ? 'pointer-events-none opacity-60' : '']"
  >
    <KrPillDropdown
      v-if="showMode"
      flat
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
      flat
      :model-value="aggregationValue ?? 'sum'"
      :options="aggregationOptions"
      :disabled="disabled"
      @update:model-value="onAggregation"
    />

    <KrPillDropdown
      flat
      :model-value="target.operator"
      :options="operatorOptions"
      :disabled="disabled"
      @update:model-value="onOperator"
    />

    <input
      v-model="localValue"
      type="number"
      v-bind="valueAttrs"
      :disabled="disabled"
      class="neo-badge w-16 px-2 py-1 text-center text-sm font-semibold text-on-surface transition-colors focus:border-primary/50 focus:bg-white/70 focus:outline-none"
      :aria-label="t('planning.objects.form.targetValue')"
      @change="commitValue"
      @keydown.enter.prevent="commitValue"
    />

    <span v-if="entryMode === 'rating'" class="text-on-surface-variant">
      {{ t('planning.objects.targetSentence.ratingOutOf', { max: ratingScale }) }}
    </span>
    <span v-else-if="entryMode === 'completion'" class="text-on-surface-variant">
      {{ t('planning.objects.targetSentence.timesUnit') }}
    </span>

    <template v-if="entryDays">
      <span class="text-on-surface-variant">
        {{ t('planning.objects.targetSentence.entryDaysAnd') }}
      </span>
      <KrPillDropdown
        flat
        :model-value="entryDays.operator"
        :options="entryDaysOperatorOptions"
        :disabled="disabled"
        @update:model-value="onEntryDaysOperator"
      />
      <input
        v-model="localEntryDaysValue"
        type="number"
        :min="1"
        :max="entryDaysMax"
        step="1"
        inputmode="numeric"
        :disabled="disabled"
        class="neo-badge w-16 px-2 py-1 text-center text-sm font-semibold text-on-surface transition-colors focus:border-primary/50 focus:bg-white/70 focus:outline-none"
        :aria-label="t('planning.objects.targetSentence.entryDaysValueLabel')"
        @change="commitEntryDaysValue"
        @keydown.enter.prevent="commitEntryDaysValue"
      />
      <span class="text-on-surface-variant">
        {{ t('planning.objects.targetSentence.entryDaysUnit') }}
      </span>
    </template>

    <KrPillDropdown
      v-if="showCadence"
      flat
      :model-value="cadence"
      :options="cadenceOptions"
      :disabled="disabled"
      @update:model-value="onCadence"
    />
    <span v-else-if="entryMode !== 'rating'" class="text-on-surface-variant">{{ periodText }}</span>

    <button
      v-if="canHaveEntryDays && !entryDays && !disabled"
      type="button"
      class="rounded-full px-2 py-0.5 text-xs font-medium text-on-surface-variant underline decoration-dotted underline-offset-2 transition-colors hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-focus"
      @click="addEntryDays"
    >
      {{ t('planning.objects.targetSentence.addEntryDays') }}
    </button>
  </div>
</template>
