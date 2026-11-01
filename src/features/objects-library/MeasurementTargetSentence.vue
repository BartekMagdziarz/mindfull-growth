<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
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
import type { MeasurementSentenceMulti } from '@/utils/measurementTargetFormat'

/**
 * The measurement sentence in its editable form: the same words that
 * `formatMeasurementSentence` prints for reading, with the variable words
 * as pills and the numbers as compact fields. Clauses: mode · [checklist
 * threshold] · [scale] · aggregation · operator · value · unit · [days
 * condition] · cadence · [ghost "+ days"]. The host provides the surface.
 */
const props = withDefaults(
  defineProps<{
    entryMode: MeasurementEntryMode
    /** Absent for trackers (no target): the sentence then shows mode, scale and cadence only. */
    target?: MeasurementTarget
    cadence?: PlanningCadence
    ratingScale?: number
    ratingScaleMin?: number
    /** Render the leading entry-mode pill. Hosts that pick the mode elsewhere can hide it. */
    showMode?: boolean
    /** Render the cadence ("per week / per month") as a pill the host can change. */
    showCadence?: boolean
    /** Rating scale edited in place ("od 1 do 5"); otherwise read as "na 5". */
    editableScale?: boolean
    /** Checklist facts; when given in multi-completion mode the threshold clause is editable. */
    multi?: MeasurementSentenceMulti
    disabled?: boolean
  }>(),
  {
    target: undefined,
    cadence: 'weekly',
    ratingScale: 5,
    ratingScaleMin: 1,
    showMode: true,
    showCadence: false,
    editableScale: false,
    multi: undefined,
    disabled: false,
  }
)

// A single atomic event carrying the full {entryMode, target} pair on every change.
// Two separate emits would race in hosts that re-derive from props (e.g. patch({...modelValue})):
// the second emit would overwrite the first with stale props.
const emit = defineEmits<{
  'update:measurement': [value: { entryMode: MeasurementEntryMode; target: MeasurementTarget }]
  'update:cadence': [value: PlanningCadence]
  'update:scale': [value: { min: number; max: number }]
  'update:threshold': [value: number | undefined]
}>()

const { t } = useT()
const s = (key: string, params?: Record<string, string | number>) =>
  t(`planning.objects.targetSentence.${key}`, params)

function commit(entryMode: MeasurementEntryMode, target: MeasurementTarget): void {
  emit('update:measurement', { entryMode, target })
}

// Verb forms ("Wykonuj / Zliczaj / Mierz / Oceniaj") so the mode pill reads as the
// start of a sentence. The noun badges stay where they label/summarise the mode.
const entryModeOptions = computed(() => [
  { value: 'completion', label: s('mode.completion') },
  { value: 'multi-completion', label: s('mode.multi-completion') },
  { value: 'counter', label: s('mode.counter') },
  { value: 'value', label: s('mode.value') },
  { value: 'rating', label: s('mode.rating') },
])

// Operators are lowercase words ("co najmniej / co najwyżej") for every kind, so the
// sentence reads naturally instead of exposing >= / <= notation.
const operatorOptions = computed(() => {
  if (
    props.entryMode === 'completion' ||
    props.entryMode === 'counter' ||
    props.entryMode === 'multi-completion'
  ) {
    return [
      { value: 'min', label: s('op.min') },
      { value: 'max', label: s('op.max') },
    ]
  }
  return [
    { value: 'gte', label: s('op.gte') },
    { value: 'lte', label: s('op.lte') },
  ]
})

const aggregationOptions = computed(() => [
  { value: 'sum', label: s('agg.sum') },
  { value: 'average', label: s('agg.average') },
  { value: 'last', label: s('agg.last') },
])

// Aggregation is a real choice only for 'value'. 'rating' is locked to 'average'
// and shown as a plain word; count modes have no aggregation.
const showAggregation = computed(() => props.entryMode === 'value' && !!props.target)

const aggregationValue = computed(() => {
  const target = props.target
  if (target && (target.kind === 'value' || target.kind === 'rating')) return target.aggregation
  return undefined
})

const valueAttrs = computed(() => {
  const target = props.target
  if (!target || target.kind === 'count') return { min: 1, step: 1, inputmode: 'numeric' as const }
  if (target.kind === 'rating') {
    return {
      min: props.ratingScaleMin,
      max: props.ratingScale,
      step: 'any',
      inputmode: 'decimal' as const,
    }
  }
  return { step: 'any', inputmode: 'decimal' as const }
})

// Unit after the value: "razy" for completion, "dni" for a checklist (the
// threshold clause before it says what a day needs), "na 5" for a rating
// whose scale is not edited in place.
const valueUnit = computed(() => {
  if (props.entryMode === 'completion') {
    return s(props.target?.value === 1 ? 'timesUnitOne' : 'timesUnit')
  }
  if (props.entryMode === 'multi-completion')
    return props.multi ? s('entryDaysUnit') : s('metDaysUnit')
  if (props.entryMode === 'rating' && !props.editableScale) {
    return s('ratingOutOf', { max: props.ratingScale })
  }
  return ''
})

const periodText = computed(() => (props.cadence === 'monthly' ? s('perMonth') : s('perWeek')))

const cadenceOptions = computed(() => [
  { value: 'weekly', label: s('perWeek') },
  { value: 'monthly', label: s('perMonth') },
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
  if (!target) return
  const next: MeasurementTarget =
    target.kind === 'count'
      ? { ...target, operator: value as CountTargetOperator }
      : { ...target, operator: value as ComparisonOperator }
  commit(props.entryMode, next)
}

function onAggregation(value: string): void {
  const target = props.target
  if (!target) return
  if (target.kind === 'value') {
    commit(props.entryMode, { ...target, aggregation: value as ValueTargetAggregation })
  } else if (target.kind === 'rating') {
    commit(props.entryMode, { ...target, aggregation: 'average' })
  }
}

// Local buffer for the value: typing stays local (no autosave thrash, no controlled-input
// cursor jumps), committing only on blur/Enter, and re-syncs when the target changes externally.
const localValue = ref(props.target ? String(props.target.value) : '')
watch(
  () => props.target?.value,
  value => {
    localValue.value = value === undefined ? '' : String(value)
  }
)

function commitValue(): void {
  const target = props.target
  if (!target) return
  const parsed = Number(localValue.value)
  if (!Number.isFinite(parsed)) {
    localValue.value = String(target.value)
    return
  }
  const value = target.kind === 'count' ? Math.round(parsed) : parsed
  commit(props.entryMode, { ...target, value } as MeasurementTarget)
}

// --- rating scale clause ("od 1 do 5") ----------------------------------------
// The scale spans at most ten steps; moving one end drags the other along so
// the span never exceeds it and max stays above min.
const MAX_SCALE_SPAN = 10
const scaleMinOptions = computed(() => ({ min: 0, step: 1, inputmode: 'numeric' as const }))
const scaleMaxOptions = computed(() => ({ min: 1, step: 1, inputmode: 'numeric' as const }))

function commitScaleMin(event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  if (!Number.isFinite(parsed) || parsed < 0) {
    input.value = String(props.ratingScaleMin)
    return
  }
  const clampedMax = Math.max(props.ratingScale, parsed + 1)
  const max = parsed + MAX_SCALE_SPAN - 1 < clampedMax ? parsed + MAX_SCALE_SPAN - 1 : clampedMax
  emit('update:scale', { min: parsed, max })
}

function commitScaleMax(event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  if (!Number.isFinite(parsed) || parsed < 1) {
    input.value = String(props.ratingScale)
    return
  }
  const clampedMin = Math.min(props.ratingScaleMin, parsed - 1)
  const min = parsed - MAX_SCALE_SPAN + 1 > clampedMin ? parsed - MAX_SCALE_SPAN + 1 : clampedMin
  emit('update:scale', { min, max: parsed })
}

// --- checklist threshold clause ("dzień liczy się przy komplecie / 3 z 4 pkt") --
const thresholdMode = computed(() => (props.multi?.threshold === undefined ? 'all' : 'custom'))
const thresholdOptions = computed(() => [
  { value: 'all', label: t('planning.objects.form.multiItems.thresholdAll') },
  { value: 'custom', label: t('planning.objects.form.multiItems.thresholdCustom') },
])
const thresholdSuffix = computed(() => {
  const multi = props.multi
  if (!multi) return ''
  return multi.allWeightsOne
    ? t('planning.objects.form.multiItems.thresholdOfItems', { max: multi.weightSum })
    : t('planning.objects.form.multiItems.thresholdOfPoints', { max: multi.weightSum })
})

function onThresholdMode(value: string): void {
  const multi = props.multi
  if (!multi || value === thresholdMode.value) return
  emit('update:threshold', value === 'all' ? undefined : Math.max(multi.weightSum - 1, 1))
}

function commitThresholdValue(event: Event): void {
  const multi = props.multi
  if (!multi) return
  const input = event.target as HTMLInputElement
  const parsed = Math.round(Number(input.value))
  if (!Number.isFinite(parsed) || parsed < 1) {
    input.value = String(multi.threshold ?? multi.weightSum)
    return
  }
  emit('update:threshold', Math.min(parsed, Math.max(multi.weightSum, 1)))
}

// --- entryDays clause ("· co najmniej N dni") ----------------------------------
// Redundant for completion (the primary metric already counts entry days),
// so the clause and its ghost are hidden there.
const entryDays = computed(() => props.target?.entryDays)
const canHaveEntryDays = computed(() => props.entryMode !== 'completion' && !!props.target)

const entryDaysMax = computed(() => (props.cadence === 'monthly' ? 31 : 7))
const entryDaysDefault = computed(() => (props.cadence === 'monthly' ? 20 : 5))

const entryDaysOperatorOptions = computed(() => [
  { value: 'min', label: s('op.min') },
  { value: 'max', label: s('op.max') },
])

const localEntryDaysValue = ref<string | number>(
  entryDays.value ? String(entryDays.value.value) : ''
)
watch(entryDays, condition => {
  localEntryDaysValue.value = condition ? String(condition.value) : ''
})

function commitEntryDays(condition: MeasurementEntryDaysCondition | undefined): void {
  if (!props.target) return
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

// Clearing the value also removes the condition, alongside the explicit button.
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
  <div class="mg-v2-sentence" :class="disabled ? 'pointer-events-none opacity-60' : ''">
    <KrPillDropdown
      v-if="showMode"
      :model-value="entryMode"
      :options="entryModeOptions"
      :disabled="disabled"
      @update:model-value="onMode"
    />

    <!-- checklist: what a day needs before it counts -->
    <template v-if="entryMode === 'multi-completion' && multi && target">
      <span class="mg-v2-sentence__sep">·</span>
      <span>{{ s('thresholdLead') }}</span>
      <KrPillDropdown
        :model-value="thresholdMode"
        :options="thresholdOptions"
        :disabled="disabled"
        @update:model-value="onThresholdMode"
      />
      <template v-if="thresholdMode === 'custom'">
        <input
          :value="multi.threshold"
          type="number"
          min="1"
          :max="multi.weightSum"
          step="1"
          inputmode="numeric"
          :disabled="disabled"
          class="mg-v2-field mg-v2-sentence__num"
          :aria-label="s('thresholdValueLabel')"
          @change="commitThresholdValue"
          @keydown.enter.prevent="commitThresholdValue"
        />
        <span>{{ thresholdSuffix }}</span>
      </template>
      <span class="mg-v2-sentence__sep">·</span>
    </template>

    <!-- rating: the scale, then the fixed 'average' as a plain word -->
    <template v-if="entryMode === 'rating'">
      <template v-if="editableScale">
        <span>{{ s('scaleFrom') }}</span>
        <input
          :value="ratingScaleMin"
          type="number"
          v-bind="scaleMinOptions"
          :disabled="disabled"
          class="mg-v2-field mg-v2-sentence__num"
          :aria-label="s('scaleMinLabel')"
          @change="commitScaleMin"
        />
        <span>{{ s('scaleTo') }}</span>
        <input
          :value="ratingScale"
          type="number"
          v-bind="scaleMaxOptions"
          :disabled="disabled"
          class="mg-v2-field mg-v2-sentence__num"
          :aria-label="s('scaleMaxLabel')"
          @change="commitScaleMax"
        />
        <span v-if="target" class="mg-v2-sentence__sep">·</span>
      </template>
      <span v-if="target">{{ s('agg.average') }}</span>
    </template>

    <KrPillDropdown
      v-if="showAggregation"
      :model-value="aggregationValue ?? 'sum'"
      :options="aggregationOptions"
      :disabled="disabled"
      @update:model-value="onAggregation"
    />

    <template v-if="target">
      <KrPillDropdown
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
        class="mg-v2-field mg-v2-sentence__num"
        :aria-label="t('planning.objects.form.targetValue')"
        @change="commitValue"
        @keydown.enter.prevent="commitValue"
      />

      <span v-if="valueUnit">{{ valueUnit }}</span>

      <template v-if="entryDays">
        <span class="mg-v2-sentence__sep">·</span>
        <KrPillDropdown
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
          class="mg-v2-field mg-v2-sentence__num"
          :aria-label="s('entryDaysValueLabel')"
          @change="commitEntryDaysValue"
          @keydown.enter.prevent="commitEntryDaysValue"
        />
        <span>{{ s('entryDaysUnit') }}</span>
        <button
          v-if="!disabled"
          type="button"
          class="mg-v2-button mg-v2-button--icon mg-v2-button--icon-sm mg-v2-button--quiet"
          :aria-label="s('removeEntryDays')"
          :title="s('removeEntryDays')"
          @click="commitEntryDays(undefined)"
        >
          <AppIcon name="close" class="text-sm" />
        </button>
      </template>
    </template>

    <KrPillDropdown
      v-if="showCadence"
      :model-value="cadence"
      :options="cadenceOptions"
      :disabled="disabled"
      @update:model-value="onCadence"
    />
    <span v-else>{{ periodText }}</span>

    <button
      v-if="canHaveEntryDays && !entryDays && !disabled"
      type="button"
      class="mg-v2-ghost mg-v2-ghost--pill"
      :aria-label="s('addEntryDays')"
      :title="s('addEntryDays')"
      @click="addEntryDays"
    >
      {{ s('addEntryDaysShort') }}
    </button>
  </div>
</template>
