<script lang="ts">
export type ComposerLayout = 'compact' | 'stacked'
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type {
  ComparisonOperator,
  CountTargetOperator,
  MeasurementEntryMode,
  MeasurementTarget,
  ValueTargetAggregation,
} from '@/domain/planning'
import { createWeeklyIntention } from '@/services/weeklyIntentionService'

const props = defineProps<{ weekRef: WeekRef; layout: ComposerLayout }>()
const emit = defineEmits<{ created: [] }>()

const { t } = useT()

interface IntentionDraft {
  title: string
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
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

// Default to 'completion': it is the simplest mental model and matches the
// "Wake up at 6am" placeholder (a did-I-do-it intention), unlike the old
// 'counter' default that rendered a meaningless "at least 1" target.
function emptyDraft(): IntentionDraft {
  return { title: '', entryMode: 'completion', target: defaultTargetFor('completion') }
}

const draft = ref<IntentionDraft>(emptyDraft())
const isSaving = ref(false)

const entryModeOptions = computed(() => [
  { value: 'completion' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.completion') },
  { value: 'counter' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.counter') },
  { value: 'value' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.value') },
  { value: 'rating' as MeasurementEntryMode, label: t('planning.objects.badges.entryMode.rating') },
])

const targetOperatorOptions = computed(() => {
  if (draft.value.entryMode === 'completion' || draft.value.entryMode === 'counter') {
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

const targetAggregationOptions = computed(() => [
  { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
  { value: 'average', label: t('planning.objects.targetAggregations.average') },
  { value: 'last', label: t('planning.objects.targetAggregations.last') },
])

// Aggregation is a real choice only for 'value'. 'rating' is locked to 'average',
// so we hide the dropdown (it used to render a useless single-option select).
const showAggregation = computed(() => draft.value.entryMode === 'value')

const aggregationValue = computed(() => {
  const target = draft.value.target
  if (target.kind === 'value' || target.kind === 'rating') return target.aggregation
  return undefined
})

// Count targets are whole numbers (times / total); value & rating allow decimals.
const targetValueAttrs = computed(() =>
  draft.value.target.kind === 'count'
    ? { min: 1, step: 1, inputmode: 'numeric' as const }
    : { step: 'any', inputmode: 'decimal' as const },
)

const canAddIntention = computed(() => draft.value.title.trim().length > 0)

function setEntryMode(mode: MeasurementEntryMode): void {
  if (mode === draft.value.entryMode) return
  draft.value = { ...draft.value, entryMode: mode, target: defaultTargetFor(mode) }
}

function setOperator(value: string): void {
  const target = draft.value.target
  if (target.kind === 'count') {
    draft.value = { ...draft.value, target: { ...target, operator: value as CountTargetOperator } }
  } else {
    draft.value = { ...draft.value, target: { ...target, operator: value as ComparisonOperator } }
  }
}

function setAggregation(value: string): void {
  const target = draft.value.target
  if (target.kind === 'value') {
    draft.value = { ...draft.value, target: { ...target, aggregation: value as ValueTargetAggregation } }
  } else if (target.kind === 'rating') {
    draft.value = { ...draft.value, target: { ...target, aggregation: 'average' } }
  }
}

function setTargetValue(raw: string): void {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return
  const value = draft.value.target.kind === 'count' ? Math.round(parsed) : parsed
  draft.value = { ...draft.value, target: { ...draft.value.target, value } as MeasurementTarget }
}

async function addIntention(): Promise<void> {
  if (!canAddIntention.value || isSaving.value) return
  isSaving.value = true
  try {
    await createWeeklyIntention({
      weekRef: props.weekRef,
      title: draft.value.title.trim(),
      entryMode: draft.value.entryMode,
      target: draft.value.target,
    })
    draft.value = emptyDraft()
    emit('created')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <!-- Stacked composer: name on its own row, mode as a discoverable segmented
       control, target as labelled fields. Clearer, slightly taller. -->
  <div
    v-if="layout === 'stacked'"
    data-testid="intention-composer-stacked"
    class="neo-card neo-card--composer space-y-4 rounded-2xl p-4"
  >
    <h4 class="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
      {{ t('planning.weekPlanning.intentions.heading') }}
    </h4>

    <label class="block">
      <span class="sr-only">{{ t('planning.weekPlanning.intentions.titleLabel') }}</span>
      <input
        v-model="draft.title"
        type="text"
        class="neo-input w-full max-w-md px-3 py-2 text-sm font-medium text-on-surface"
        :placeholder="t('planning.weekPlanning.intentions.titlePlaceholder')"
        @keydown.enter.prevent="addIntention"
      />
    </label>

    <div class="space-y-1.5">
      <span class="text-xs font-medium text-on-surface-variant">
        {{ t('planning.objects.form.entryMode') }}
      </span>
      <div class="neo-segmented flex-wrap" role="group" :aria-label="t('planning.objects.form.entryMode')">
        <button
          v-for="option in entryModeOptions"
          :key="option.value"
          type="button"
          class="neo-segmented__item neo-focus"
          :class="draft.entryMode === option.value ? 'neo-segmented__item--active' : ''"
          :aria-pressed="draft.entryMode === option.value"
          @click="setEntryMode(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="grid gap-3" :class="showAggregation ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
      <label v-if="showAggregation" class="block space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.targetAggregation') }}
        </span>
        <select
          class="neo-input w-full px-3 py-2 text-sm"
          :value="aggregationValue"
          @change="setAggregation(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in targetAggregationOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="block space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.targetOperator') }}
        </span>
        <select
          class="neo-input w-full px-3 py-2 text-sm"
          :value="draft.target.operator"
          @change="setOperator(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in targetOperatorOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="block space-y-1">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ t('planning.objects.form.targetValue') }}
        </span>
        <input
          type="number"
          v-bind="targetValueAttrs"
          :value="draft.target.value"
          class="neo-input w-full px-3 py-2 text-sm"
          @input="setTargetValue(($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="addIntention"
        />
      </label>
    </div>

    <div class="flex justify-end">
      <AppButton variant="filled" :disabled="!canAddIntention || isSaving" @click="addIntention">
        {{ t('planning.weekPlanning.intentions.add') }}
      </AppButton>
    </div>
  </div>

  <!-- Compact composer: a single horizontal row (name grows, mode + target as
       inline selects, add at the end). Wraps gracefully on narrow widths. -->
  <div
    v-else
    data-testid="intention-composer-compact"
    class="neo-card neo-card--composer space-y-2 rounded-2xl p-3"
  >
    <h4 class="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
      {{ t('planning.weekPlanning.intentions.heading') }}
    </h4>

    <div class="flex flex-wrap items-end gap-2">
      <label class="flex min-w-[12rem] flex-1 flex-col gap-1">
        <span class="sr-only">{{ t('planning.weekPlanning.intentions.titleLabel') }}</span>
        <input
          v-model="draft.title"
          type="text"
          class="neo-input w-full px-3 py-2 text-sm font-medium text-on-surface"
          :placeholder="t('planning.weekPlanning.intentions.titlePlaceholder')"
          @keydown.enter.prevent="addIntention"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="sr-only">{{ t('planning.objects.form.entryMode') }}</span>
        <select
          class="neo-input px-3 py-2 text-sm"
          :value="draft.entryMode"
          @change="setEntryMode(($event.target as HTMLSelectElement).value as MeasurementEntryMode)"
        >
          <option v-for="option in entryModeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label v-if="showAggregation" class="flex flex-col gap-1">
        <span class="sr-only">{{ t('planning.objects.form.targetAggregation') }}</span>
        <select
          class="neo-input px-3 py-2 text-sm"
          :value="aggregationValue"
          @change="setAggregation(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in targetAggregationOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="sr-only">{{ t('planning.objects.form.targetOperator') }}</span>
        <select
          class="neo-input px-3 py-2 text-sm"
          :value="draft.target.operator"
          @change="setOperator(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in targetOperatorOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="flex w-20 flex-col gap-1">
        <span class="sr-only">{{ t('planning.objects.form.targetValue') }}</span>
        <input
          type="number"
          v-bind="targetValueAttrs"
          :value="draft.target.value"
          class="neo-input w-full px-2 py-2 text-sm"
          @input="setTargetValue(($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="addIntention"
        />
      </label>

      <button
        type="button"
        class="neo-pill neo-pill--primary neo-focus shrink-0 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55"
        :disabled="!canAddIntention || isSaving"
        @click="addIntention"
      >
        {{ t('planning.weekPlanning.intentions.add') }}
      </button>
    </div>
  </div>
</template>
