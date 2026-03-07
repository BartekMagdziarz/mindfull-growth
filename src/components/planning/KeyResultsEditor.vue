<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <label class="text-sm font-medium text-on-surface">{{ t('planning.components.keyResultsEditor.title') }}</label>
        <p class="text-xs text-on-surface-variant">
          {{ t('planning.components.keyResultsEditor.description') }}
        </p>
      </div>
      <button
        type="button"
        class="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
        @click="addTracker"
      >
        <PlusIcon class="w-4 h-4" />
        {{ t('planning.components.keyResultsEditor.addKR') }}
      </button>
    </div>

    <div
      v-if="localTrackers.length === 0"
      class="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2"
    >
      {{ t('planning.components.keyResultsEditor.emptyWarning') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(kr, index) in localTrackers"
        :key="kr.id"
        class="border border-neu-border/20 rounded-xl p-3 space-y-3"
      >
        <!-- Name + Delete -->
        <div class="flex items-start gap-2">
          <div class="flex-1">
            <label class="block text-xs font-medium text-on-surface-variant mb-1">
              {{ t('planning.components.keyResultsEditor.keyResultLabel') }}
            </label>
            <input
              v-model="kr.name"
              type="text"
              :placeholder="t('planning.components.keyResultsEditor.namePlaceholder')"
              class="neo-input w-full px-3 py-2 text-on-surface placeholder:text-on-surface-variant text-sm"
              :class="showErrors && errorsById[kr.id!]?.name ? 'border-error' : ''"
              @input="emitUpdate"
            />
            <p v-if="showErrors && errorsById[kr.id!]?.name" class="mt-1 text-xs text-error">
              {{ t('planning.common.validation.nameRequiredField') }}
            </p>
          </div>
          <button
            type="button"
            class="p-1.5 rounded-lg text-on-surface-variant/60 hover:text-error hover:bg-error/10 transition-colors"
            :aria-label="t('planning.components.keyResultsEditor.removeKeyResult')"
            @click="removeTracker(index)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Type Selector: Pill Row -->
        <div>
          <label class="block text-xs font-medium text-on-surface-variant mb-1.5">{{ t('planning.components.keyResultsEditor.typeLabel') }}</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in TYPE_OPTIONS"
              :key="option.value"
              type="button"
              :class="[
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors',
                kr.type === option.value
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-section/50 text-on-surface-variant border-neu-border/20 hover:bg-primary/10 hover:text-primary',
              ]"
              @click="handleTypeSelect(index, option.value)"
            >
              <component :is="option.icon" class="w-3.5 h-3.5" />
              {{ option.label }}
            </button>
          </div>
          <p class="mt-1 text-[11px] text-on-surface-variant">
            {{ getTypeDescription(kr.type) }}
          </p>
        </div>

        <!-- Type-specific fields: Completion -->
        <div
          v-if="kr.type === 'adherence'"
        >
          <label class="block text-xs font-medium text-on-surface-variant mb-1">
            {{ t('planning.components.keyResultsEditor.howMany') }}
          </label>
          <input
            v-model.number="kr.targetCount"
            type="number"
            min="1"
            class="neo-input w-full sm:w-40 px-3 py-2 text-on-surface text-sm"
            :class="showErrors && errorsById[kr.id!]?.targetCount ? 'border-error' : ''"
            @input="emitUpdate"
          />
          <p v-if="showErrors && errorsById[kr.id!]?.targetCount" class="mt-1 text-xs text-error">
            {{ t('planning.common.validation.targetRequired') }}
          </p>
        </div>

        <!-- Type-specific fields: Value / Measure -->
        <div v-else-if="kr.type === 'value'" class="space-y-3">
          <div class="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,8rem)_auto]">
            <div>
              <label class="block text-xs font-medium text-on-surface-variant mb-1">
                {{ t('planning.components.keyResultsEditor.target') }}
              </label>
              <input
                v-model.number="kr.targetValue"
                type="number"
                class="neo-input w-full px-3 py-2 text-on-surface text-sm"
                :class="showErrors && errorsById[kr.id!]?.targetValue ? 'border-error' : ''"
                @input="emitUpdate"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-on-surface-variant mb-1">
                {{ t('planning.components.keyResultsEditor.unitOptional') }}
              </label>
              <input
                v-model="kr.unit"
                type="text"
                :placeholder="t('planning.components.keyResultsEditor.unitPlaceholder')"
                class="neo-input w-full px-3 py-2 text-on-surface placeholder:text-on-surface-variant text-sm"
                @input="emitUpdate"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-on-surface-variant mb-1.5">{{ t('planning.components.keyResultsEditor.direction') }}</label>
              <div class="flex gap-1.5">
                <button
                  v-for="option in DIRECTION_OPTIONS"
                  :key="option.value"
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    kr.direction === option.value
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-section/50 text-on-surface-variant border-neu-border/20 hover:bg-primary/10 hover:text-primary',
                  ]"
                  @click="kr.direction = option.value; emitUpdate()"
                >
                  <component :is="option.icon" class="w-3.5 h-3.5" />
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
          <p v-if="showErrors && errorsById[kr.id!]?.targetValue" class="text-xs text-error">
            {{ t('planning.common.validation.targetRequired') }}
          </p>
        </div>

        <!-- Type-specific fields: Rating -->
        <div v-else-if="kr.type === 'rating'" class="space-y-2">
          <label class="block text-xs font-medium text-on-surface-variant">{{ t('planning.common.trackers.scale') }}</label>
          <div class="flex items-center gap-2">
            <span class="text-xs text-on-surface-variant">{{ t('planning.common.trackers.scaleFrom') }}</span>
            <input
              v-model.number="kr.ratingScaleMin"
              type="number"
              class="neo-input w-16 px-2 py-1.5 text-on-surface text-center text-sm"
              :class="showErrors && errorsById[kr.id!]?.ratingScale ? 'border-error' : ''"
              @input="emitUpdate"
            />
            <span class="text-xs text-on-surface-variant">{{ t('planning.common.trackers.scaleTo') }}</span>
            <input
              v-model.number="kr.ratingScaleMax"
              type="number"
              class="neo-input w-16 px-2 py-1.5 text-on-surface text-center text-sm"
              :class="showErrors && errorsById[kr.id!]?.ratingScale ? 'border-error' : ''"
              @input="emitUpdate"
            />
          </div>
          <p v-if="showErrors && errorsById[kr.id!]?.ratingScale" class="text-xs text-error">
            {{ t('planning.common.validation.ratingScaleInvalid') }}
          </p>
        </div>

        <div class="rounded-2xl border border-neu-border/20 bg-section/40 p-3 space-y-3">
          <!-- Rollup -->
          <div v-if="getRollupOptionsForType(kr.type).length > 0">
            <label class="block text-[11px] font-medium text-on-surface-variant mb-1">{{ t('planning.common.trackers.calculation') }}</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="option in getRollupOptionsForType(kr.type)"
                :key="option.value"
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                  kr.rollup === option.value
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-section/50 text-on-surface-variant border-neu-border/20 hover:bg-primary/10 hover:text-primary',
                ]"
                @click="setRollup(index, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Cadence -->
          <div>
            <label class="block text-[11px] font-medium text-on-surface-variant mb-1">{{ t('planning.common.trackers.frequency') }}</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="option in CADENCE_OPTIONS"
                :key="option.value"
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                  kr.cadence === option.value
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-section/50 text-on-surface-variant border-neu-border/20 hover:bg-primary/10 hover:text-primary',
                ]"
                @click="handleCadenceSelect(index, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, toRaw } from 'vue'
import type { Component } from 'vue'
import { useT } from '@/composables/useT'
import {
  PlusIcon,
  TrashIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/vue/24/outline'
import type {
  Tracker,
  TrackerType,
  TrackerCadence,
  TrackerRollup,
  ValueDirection,
} from '@/domain/planning'

/* ── Option constants ────────────────────────────────────── */

const { t } = useT()

interface TypeOption {
  value: TrackerType
  label: string
  description: string
  icon: Component
}

const TYPE_OPTIONS = computed<TypeOption[]>(() => [
  { value: 'count',     label: t('planning.common.trackers.types.count'),      description: t('planning.common.trackers.typeDescriptions.count'),       icon: ChartBarIcon },
  { value: 'adherence', label: t('planning.common.trackers.types.completion'),  description: t('planning.common.trackers.typeDescriptions.completion'),      icon: CheckCircleIcon },
  { value: 'value',     label: t('planning.common.trackers.types.measure'),     description: t('planning.common.trackers.typeDescriptions.measure'), icon: ArrowTrendingUpIcon },
  { value: 'rating',    label: t('planning.common.trackers.types.rating'),      description: t('planning.common.trackers.typeDescriptions.rating'),       icon: StarIcon },
])

const DIRECTION_OPTIONS = computed<{ value: ValueDirection; label: string; icon: Component }[]>(() => [
  { value: 'increase', label: t('planning.common.trackers.direction.increase'), icon: ArrowUpIcon },
  { value: 'decrease', label: t('planning.common.trackers.direction.decrease'), icon: ArrowDownIcon },
])

const VALUE_ROLLUP_OPTIONS = computed<{ value: TrackerRollup; label: string }[]>(() => [
  { value: 'last',    label: t('planning.common.trackers.rollup.last') },
  { value: 'average', label: t('planning.common.trackers.rollup.average') },
])

const RATING_ROLLUP_OPTIONS = computed<{ value: TrackerRollup; label: string }[]>(() => [
  { value: 'average', label: t('planning.common.trackers.rollup.average') },
  { value: 'last',    label: t('planning.common.trackers.rollup.last') },
])

const CADENCE_OPTIONS = computed<{ value: TrackerCadence; label: string }[]>(() => [
  { value: 'weekly',   label: t('planning.common.trackers.cadence.weekly') },
  { value: 'monthly',  label: t('planning.common.trackers.cadence.monthly') },
])

/* ── Props / Emits ───────────────────────────────────────── */

const props = withDefaults(
  defineProps<{
    modelValue?: Partial<Tracker>[]
  }>(),
  {
    modelValue: () => [],
  }
)

const emit = defineEmits<{
  'update:modelValue': [trackers: Partial<Tracker>[]]
}>()

/* ── State ───────────────────────────────────────────────── */

const localTrackers = ref<Partial<Tracker>[]>(
  props.modelValue.map((tracker) => normalizeTrackerForType({ ...tracker }))
)
const showErrors = ref(false)

watch(
  () => props.modelValue,
  (newValue) => {
    localTrackers.value = newValue.map((tracker) => normalizeTrackerForType({ ...tracker }))
  },
  { deep: true }
)

/* ── Validation ──────────────────────────────────────────── */

const errorsById = computed(() => {
  const errors: Record<string, { name?: string; targetCount?: string; targetValue?: string; ratingScale?: string }> = {}

  localTrackers.value.forEach((kr) => {
    const entry: { name?: string; targetCount?: string; targetValue?: string; ratingScale?: string } = {}
    if (!kr.name?.trim()) {
      entry.name = 'required'
    }

    if (kr.type === 'adherence') {
      if (!isValidNumber(kr.targetCount) || (kr.targetCount ?? 0) <= 0) {
        entry.targetCount = 'required'
      }
    }

    if (kr.type === 'value') {
      if (!isValidNumber(kr.targetValue)) {
        entry.targetValue = 'required'
      }
    }

    if (kr.type === 'rating') {
      if (!isValidNumber(kr.ratingScaleMin) || !isValidNumber(kr.ratingScaleMax)) {
        entry.ratingScale = 'required'
      } else if ((kr.ratingScaleMin ?? 0) >= (kr.ratingScaleMax ?? 0)) {
        entry.ratingScale = 'invalid'
      }
    }

    if (Object.keys(entry).length > 0 && kr.id) {
      errors[kr.id] = entry
    }
  })

  return errors
})

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/* ── Helpers ─────────────────────────────────────────────── */

function getTypeDescription(type: TrackerType | undefined): string {
  if (!type) return ''
  return TYPE_OPTIONS.value.find((o) => o.value === type)?.description ?? ''
}

function getRollupOptionsForType(type: TrackerType | undefined): Array<{ value: TrackerRollup; label: string }> {
  if (type === 'value') return VALUE_ROLLUP_OPTIONS.value
  if (type === 'rating') return RATING_ROLLUP_OPTIONS.value
  return []
}

function isRollupAllowed(type: TrackerType | undefined, rollup: TrackerRollup | undefined): boolean {
  if (!rollup) return false
  return getRollupOptionsForType(type).some((option) => option.value === rollup)
}

function normalizeTrackerForType(raw: Partial<Tracker>): Partial<Tracker> {
  const type = raw.type
  if (!type) return { ...raw }

  if (type === 'count') {
    return {
      ...raw,
      targetCount: undefined,
      targetValue: undefined,
      baselineValue: undefined,
      unit: undefined,
      direction: undefined,
      ratingScaleMin: undefined,
      ratingScaleMax: undefined,
      rollup: undefined,
    }
  }

  if (type === 'adherence') {
    return {
      ...raw,
      targetCount: isValidNumber(raw.targetCount) && raw.targetCount > 0 ? raw.targetCount : 1,
      targetValue: undefined,
      baselineValue: undefined,
      unit: undefined,
      direction: undefined,
      ratingScaleMin: undefined,
      ratingScaleMax: undefined,
      rollup: undefined,
    }
  }

  if (type === 'value') {
    return {
      ...raw,
      targetCount: undefined,
      ratingScaleMin: undefined,
      ratingScaleMax: undefined,
      direction: raw.direction ?? 'increase',
      rollup: isRollupAllowed(type, raw.rollup) ? raw.rollup : 'last',
    }
  }

  if (type === 'rating') {
    const min = isValidNumber(raw.ratingScaleMin) ? raw.ratingScaleMin : 1
    const max = isValidNumber(raw.ratingScaleMax) ? raw.ratingScaleMax : 10
    const hasValidScale = min < max
    return {
      ...raw,
      targetCount: undefined,
      targetValue: undefined,
      baselineValue: undefined,
      unit: undefined,
      direction: undefined,
      ratingScaleMin: hasValidScale ? min : 1,
      ratingScaleMax: hasValidScale ? max : 10,
      rollup: isRollupAllowed(type, raw.rollup) ? raw.rollup : 'average',
    }
  }

  return { ...raw }
}

/* ── Tracker CRUD ────────────────────────────────────────── */

function createTracker(type: TrackerType = 'count'): Partial<Tracker> {
  return normalizeTrackerForType({
    id: globalThis.crypto.randomUUID(),
    name: '',
    type,
    cadence: 'weekly' as TrackerCadence,
  })
}

function applyDefaultsByType(tracker: Partial<Tracker>, type: TrackerType) {
  const normalized = normalizeTrackerForType({ ...tracker, type })
  Object.assign(tracker, normalized)
}

function addTracker() {
  localTrackers.value.push(createTracker())
  emitUpdate()
}

function removeTracker(index: number) {
  localTrackers.value.splice(index, 1)
  emitUpdate()
}

function handleTypeSelect(index: number, type: TrackerType) {
  const kr = localTrackers.value[index]
  if (!kr) return
  kr.type = type
  applyDefaultsByType(kr, type)
  emitUpdate()
}

function handleCadenceSelect(index: number, value: TrackerCadence) {
  const kr = localTrackers.value[index]
  if (!kr) return
  kr.cadence = value
  emitUpdate()
}

function setRollup(index: number, rollup: TrackerRollup) {
  const kr = localTrackers.value[index]
  if (!kr || !isRollupAllowed(kr.type, rollup)) return
  kr.rollup = rollup
  emitUpdate()
}

function emitUpdate() {
  const normalized = localTrackers.value.map((kr) =>
    normalizeTrackerForType(toRaw(kr) as Partial<Tracker>)
  )
  emit('update:modelValue', normalized)
}

/* ── Public API ──────────────────────────────────────────── */

function validate(): boolean {
  showErrors.value = true
  return Object.keys(errorsById.value).length === 0
}

defineExpose({ validate })
</script>
