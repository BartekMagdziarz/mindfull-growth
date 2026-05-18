<template>
  <div class="neo-surface space-y-3 rounded-2xl p-4 shadow-neu-raised-sm">
    <div class="flex items-start gap-2">
      <input
        :value="modelValue.title"
        type="text"
        class="neo-input min-w-0 flex-1 px-3 py-2 text-sm font-medium text-on-surface"
        :placeholder="t('planning.goalWizard.steps.measurable.krTitlePlaceholder')"
        :aria-label="t('planning.goalWizard.steps.measurable.krTitleLabel')"
        @input="onTitleInput"
      />
      <button
        v-if="canRemove"
        type="button"
        class="neo-icon-button neo-focus shrink-0"
        :aria-label="t('planning.goalWizard.steps.measurable.removeKr')"
        @click="$emit('remove')"
      >
        <AppIcon name="close" class="text-base" />
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.entryMode') }}
        </span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="option in entryModeOptions"
            :key="option.value"
            type="button"
            class="neo-pill neo-focus px-2 py-1 text-xs transition-all"
            :class="modelValue.entryMode === option.value
              ? 'bg-primary/15 text-primary font-semibold shadow-neu-pressed'
              : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
            @click="onEntryMode(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.cadence') }}
        </span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="option in cadenceOptions"
            :key="option.value"
            type="button"
            class="neo-pill neo-focus px-2 py-1 text-xs transition-all"
            :class="modelValue.cadence === option.value
              ? 'bg-primary/15 text-primary font-semibold shadow-neu-pressed'
              : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
            @click="onCadence(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="grid gap-2" :class="showAggregation ? 'grid-cols-3' : 'grid-cols-2'">
      <div class="space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.targetOperator') }}
        </span>
        <select
          class="neo-input w-full px-2 py-1.5 text-xs"
          :value="modelValue.target.operator"
          @change="onOperator(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="option in targetOperatorOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div v-if="showAggregation" class="space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.targetAggregation') }}
        </span>
        <select
          class="neo-input w-full px-2 py-1.5 text-xs"
          :value="aggregationValue"
          @change="onAggregation(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="option in targetAggregationOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.targetValue') }}
        </span>
        <input
          type="number"
          step="any"
          :value="modelValue.target.value"
          class="neo-input w-full px-2 py-1.5 text-xs"
          @input="onTargetValue(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type {
  ComparisonOperator,
  CountTargetOperator,
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  ValueTargetAggregation,
} from '@/domain/planning'
import type { KrDraft } from '@/composables/useGoalCreationWizard'

const { t } = useT()

const props = defineProps<{
  modelValue: KrDraft
  canRemove: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: KrDraft]
  remove: []
}>()

const entryModeOptions = computed(() => [
  { value: 'completion' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.completion') },
  { value: 'counter' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.counter') },
  { value: 'value' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.value') },
  { value: 'rating' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.rating') },
])

const cadenceOptions = computed(() => [
  { value: 'weekly' as PlanningCadence, label: t('planning.objects.badges.cadence.weekly') },
  { value: 'monthly' as PlanningCadence, label: t('planning.objects.badges.cadence.monthly') },
])

const targetOperatorOptions = computed(() => {
  if (props.modelValue.entryMode === 'completion' || props.modelValue.entryMode === 'counter') {
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

const targetAggregationOptions = computed(() => {
  if (props.modelValue.entryMode === 'rating') {
    return [{ value: 'average', label: t('planning.objects.targetAggregations.average') }]
  }
  return [
    { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
    { value: 'average', label: t('planning.objects.targetAggregations.average') },
    { value: 'last', label: t('planning.objects.targetAggregations.last') },
  ]
})

const showAggregation = computed(
  () => props.modelValue.entryMode === 'value' || props.modelValue.entryMode === 'rating',
)

const aggregationValue = computed(() => {
  const target = props.modelValue.target
  if (target.kind === 'value') return target.aggregation
  if (target.kind === 'rating') return target.aggregation
  return undefined
})

function patch(update: Partial<KrDraft>): void {
  emit('update:modelValue', { ...props.modelValue, ...update })
}

function onTitleInput(event: Event): void {
  patch({ title: (event.target as HTMLInputElement).value })
}

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

function onEntryMode(mode: MeasurementEntryMode): void {
  if (mode === props.modelValue.entryMode) return
  patch({ entryMode: mode, target: defaultTargetFor(mode) })
}

function onCadence(cadence: PlanningCadence): void {
  patch({ cadence })
}

function onOperator(value: string): void {
  const target = props.modelValue.target
  if (target.kind === 'count') {
    patch({ target: { ...target, operator: value as CountTargetOperator } })
  } else {
    patch({ target: { ...target, operator: value as ComparisonOperator } })
  }
}

function onAggregation(value: string): void {
  const target = props.modelValue.target
  if (target.kind === 'value') {
    patch({ target: { ...target, aggregation: value as ValueTargetAggregation } })
  } else if (target.kind === 'rating') {
    patch({ target: { ...target, aggregation: 'average' } })
  }
}

function onTargetValue(raw: string): void {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return
  patch({ target: { ...props.modelValue.target, value: parsed } as MeasurementTarget })
}
</script>
