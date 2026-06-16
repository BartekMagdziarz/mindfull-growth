<template>
  <section class="neo-card neo-card--composer border-neu-border/30 bg-gradient-to-br from-neu-top to-neu-bottom p-3 md:p-3.5">
    <div class="border-b border-white/45 pb-2">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="neo-pill neo-pill--primary px-3 py-1 text-xs font-semibold">
              {{ modeLabel }}
            </span>
            <span class="neo-badge px-3 py-1 text-xs">
              {{ typeLabel }}
            </span>
            <span v-if="parentLabel" class="neo-badge px-3 py-1 text-xs">
              {{ parentLabel }}
            </span>
          </div>
          <h3 class="text-base font-semibold tracking-[-0.02em] text-on-surface md:text-lg">
            {{ heading }}
          </h3>
        </div>

        <p class="max-w-md text-xs leading-4 text-on-surface-variant md:text-right">
          {{ helpText }}
        </p>
      </div>
    </div>

    <div class="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(17rem,0.88fr)]">
      <div class="space-y-2">
        <label class="space-y-1">
          <span class="text-xs font-semibold text-on-surface">{{ labels.title }}</span>
          <input
            v-model="draft.title"
            type="text"
            class="neo-input w-full px-3 py-1.5 text-sm"
          />
        </label>

        <label class="space-y-1">
          <span class="text-xs font-semibold text-on-surface">{{ labels.description }}</span>
          <textarea
            v-model="draft.description"
            class="neo-input min-h-[2.5rem] w-full resize-y px-3 py-1.5 text-sm"
          />
        </label>

        <div class="grid gap-4 md:grid-cols-2">
          <label
            v-if="(panelType === 'keyResult' || panelType === 'initiative') && !hideGoalSelect"
            class="space-y-1"
          >
            <span class="text-xs font-semibold text-on-surface">{{ labels.goal }}</span>
            <select v-model="draft.goalId" class="neo-input w-full px-3 py-1.5 text-sm">
              <option value="">{{ noneLabel }}</option>
              <option v-for="goal in goalOptions" :key="goal.id" :value="goal.id">
                {{ goal.label }}
              </option>
            </select>
          </label>

        </div>

        <div
          v-if="panelType === 'habit' || panelType === 'keyResult'"
          class="neo-surface rounded-xl p-2.5"
        >
          <div class="text-xs font-semibold text-on-surface">{{ labels.target }}</div>
          <MeasurementTargetSentence
            bare
            :entry-mode="sentenceEntryMode"
            :target="sentenceTarget"
            :cadence="draft.cadence === 'monthly' ? 'monthly' : 'weekly'"
            show-cadence
            class="mt-3"
            @update:measurement="onTargetMeasurement"
            @update:cadence="onCadence"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div class="space-y-1">
          <span class="text-xs font-semibold text-on-surface">{{ labels.status }}</span>
          <div class="neo-segmented flex w-full flex-wrap">
            <button
              v-for="option in statusOptions"
              :key="option.value"
              type="button"
              :class="optionClass(draft.status === option.value)"
              :aria-pressed="draft.status === option.value"
              @click="draft.status = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <label
          v-if="!isCreateMode"
          class="neo-surface flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-on-surface"
        >
          <input v-model="draft.isActive" type="checkbox" class="neo-checkbox" />
          {{ labels.activeHint }}
        </label>

        <div v-if="panelType !== 'keyResult'" class="grid gap-2">
          <ObjectsLibraryPillSelect
            v-model="draft.lifeAreaIds"
            :options="lifeAreaOptions"
            :label="labels.lifeAreas"
            :empty-label="noneLabel"
            :clear-label="clearLabel"
            :add-label="addLabel"
          />

          <ObjectsLibraryPillSelect
            v-model="draft.priorityIds"
            :options="priorityOptions"
            :label="labels.priorities"
            :empty-label="noneLabel"
            :clear-label="clearLabel"
            :add-label="addLabel"
          />
        </div>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/45 pt-3">
      <button
        v-if="showDelete"
        type="button"
        class="neo-pill neo-focus px-4 py-2 text-sm font-semibold text-danger"
        @click="$emit('delete')"
      >
        {{ deleteLabel }}
      </button>
      <AppButton variant="outlined" @click="$emit('cancel')">
        {{ cancelLabel }}
      </AppButton>
      <AppButton variant="filled" :disabled="!canSave" @click="$emit('save')">
        {{ saveLabel }}
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/AppButton.vue'
import ObjectsLibraryPillSelect from '@/components/objects/ObjectsLibraryPillSelect.vue'
import MeasurementTargetSentence from '@/components/objects/MeasurementTargetSentence.vue'
import type { ObjectsLibraryFilterOption, ObjectsLibraryPanelType } from '@/services/objectsLibraryQueries'
import type { MeasurementEntryMode, MeasurementTarget, PlanningCadence } from '@/domain/planning'

interface LibraryTargetDraft {
  kind: 'count' | 'value' | 'rating'
  operator: 'min' | 'max' | 'gte' | 'lte'
  aggregation?: 'sum' | 'average' | 'last'
  value: number
}

interface LibraryDraft {
  title: string
  description: string
  isActive: boolean
  status: string
  goalId?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  cadence?: 'weekly' | 'monthly'
  entryMode?: MeasurementEntryMode
  target: LibraryTargetDraft
}

interface SelectOption {
  value: string
  label: string
}

interface CadenceOption {
  value: NonNullable<LibraryDraft['cadence']>
  label: string
}

interface EntryModeOption {
  value: NonNullable<LibraryDraft['entryMode']>
  label: string
}

interface TargetOperatorOption {
  value: LibraryTargetDraft['operator']
  label: string
}

interface TargetAggregationOption {
  value: NonNullable<LibraryTargetDraft['aggregation']>
  label: string
}

const draft = defineModel<LibraryDraft>('draft', { required: true })

defineProps<{
  panelType: ObjectsLibraryPanelType
  isCreateMode: boolean
  heading: string
  modeLabel: string
  typeLabel: string
  parentLabel?: string
  helpText: string
  saveLabel: string
  cancelLabel: string
  deleteLabel: string
  noneLabel: string
  clearLabel: string
  addLabel: string
  canSave: boolean
  showDelete: boolean
  hideGoalSelect?: boolean
  goalOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
  priorityOptions: ObjectsLibraryFilterOption[]
  statusOptions: SelectOption[]
  cadenceOptions: CadenceOption[]
  entryModeOptions: EntryModeOption[]
  targetOperatorOptions: TargetOperatorOption[]
  targetAggregationOptions: TargetAggregationOption[]
  showTargetAggregation: boolean
  labels: {
    title: string
    description: string
    status: string
    activeHint: string
    goal: string
    cadence: string
    entryMode: string
    target: string
    targetOperator: string
    targetAggregation: string
    targetValue: string
    lifeAreas: string
    priorities: string
  }
}>()

defineEmits<{
  save: []
  cancel: []
  delete: []
}>()

function optionClass(active: boolean): string {
  return [
    'neo-segmented__item',
    'neo-focus',
    'flex-1',
    'whitespace-nowrap',
    '!min-h-[34px]',
    '!py-1',
    '!px-2.5',
    '!text-xs',
    active ? 'neo-segmented__item--active' : '',
  ].join(' ')
}

// Adapter: the draft holds a flat LibraryTargetDraft; the sentence speaks the domain
// MeasurementTarget. Derive the mode from target.kind (authoritative for operator/
// aggregation options), falling back to draft.entryMode only for completion-vs-counter.
const sentenceEntryMode = computed<MeasurementEntryMode>(() => {
  const kind = draft.value.target.kind
  if (kind === 'value') return 'value'
  if (kind === 'rating') return 'rating'
  return draft.value.entryMode === 'counter' ? 'counter' : 'completion'
})

const sentenceTarget = computed<MeasurementTarget>(() => {
  const d = draft.value.target
  if (d.kind === 'count') {
    return { kind: 'count', operator: d.operator === 'max' ? 'max' : 'min', value: d.value }
  }
  if (d.kind === 'rating') {
    return { kind: 'rating', aggregation: 'average', operator: d.operator === 'lte' ? 'lte' : 'gte', value: d.value }
  }
  return {
    kind: 'value',
    aggregation: d.aggregation ?? 'sum',
    operator: d.operator === 'lte' ? 'lte' : 'gte',
    value: d.value,
  }
})

function onTargetMeasurement(measurement: {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
}): void {
  draft.value.entryMode = measurement.entryMode
  const next = measurement.target
  const target = draft.value.target
  target.kind = next.kind
  target.operator = next.operator
  target.value = next.value
  target.aggregation = next.kind === 'value' || next.kind === 'rating' ? next.aggregation : undefined
}

function onCadence(value: PlanningCadence): void {
  draft.value.cadence = value
}
</script>
