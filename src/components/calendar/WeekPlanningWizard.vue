<template>
  <section data-testid="week-planning-wizard" class="neo-card space-y-6 px-4 py-4 md:px-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-on-surface">
        {{ t('planning.weekPlanning.title') }}
      </h2>
      <div class="flex items-center gap-3">
        <span class="text-xs font-medium text-on-surface-variant">
          {{ stepLabels[stepIndex] }}
        </span>
        <AppButton variant="text" @click="$emit('open-grid')">
          {{ t('planning.weekPlanning.editGrid') }}
        </AppButton>
        <AppButton variant="text" :aria-label="t('planning.weekPlanning.close')" @click="$emit('close')">
          <AppIcon name="close" />
        </AppButton>
      </div>
    </div>

    <p class="text-sm text-on-surface-variant">
      {{ t('planning.weekPlanning.intro') }}
    </p>

    <!-- Step 1: weekly intentions -->
    <div v-if="step === 'intentions'" class="space-y-4">
      <h3 class="text-sm font-semibold text-on-surface">
        {{ t('planning.weekPlanning.steps.intentions') }}
      </h3>

      <ul v-if="intentions.length > 0" class="space-y-2">
        <li
          v-for="intention in intentions"
          :key="intention.id"
          class="neo-surface flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-neu-raised-sm"
        >
          <AppIcon name="target" class="text-base text-on-surface-variant" />
          <span class="min-w-0 flex-1 truncate font-medium text-on-surface">{{ intention.title }}</span>
          <span class="shrink-0 text-xs text-on-surface-variant">{{ targetSummary(intention) }}</span>
        </li>
      </ul>
      <p v-else class="text-xs text-on-surface-variant">
        {{ t('planning.weekPlanning.intentions.empty') }}
      </p>

      <!-- Create form -->
      <div class="neo-surface space-y-3 rounded-2xl p-4 shadow-neu-raised-sm">
        <input
          v-model="draft.title"
          type="text"
          class="neo-input w-full px-3 py-2 text-sm font-medium text-on-surface"
          :placeholder="t('planning.weekPlanning.intentions.titlePlaceholder')"
          :aria-label="t('planning.weekPlanning.intentions.titleLabel')"
        />

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
              :class="draft.entryMode === option.value
                ? 'bg-primary/15 text-primary font-semibold shadow-neu-pressed'
                : 'bg-neu-base text-on-surface-variant shadow-neu-raised-sm hover:-translate-y-px'"
              @click="setEntryMode(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="grid gap-2" :class="showAggregation ? 'grid-cols-3' : 'grid-cols-2'">
          <div class="space-y-1">
            <span class="text-xs font-medium text-on-surface-variant">
              {{ t('planning.objects.form.targetOperator') }}
            </span>
            <select
              class="neo-input w-full px-2 py-1.5 text-xs"
              :value="draft.target.operator"
              @change="setOperator(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in targetOperatorOptions" :key="option.value" :value="option.value">
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
              @change="setAggregation(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in targetAggregationOptions" :key="option.value" :value="option.value">
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
              :value="draft.target.value"
              class="neo-input w-full px-2 py-1.5 text-xs"
              @input="setTargetValue(($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <AppButton variant="tonal" :disabled="!canAddIntention || isSaving" @click="addIntention">
          {{ t('planning.weekPlanning.intentions.add') }}
        </AppButton>
      </div>

      <div class="flex justify-end">
        <AppButton variant="filled" @click="step = 'priorities'">
          {{ t('planning.weekPlanning.next') }}
        </AppButton>
      </div>
    </div>

    <!-- Step 2: top-3 priorities -->
    <div v-else class="space-y-4">
      <h3 class="text-sm font-semibold text-on-surface">
        {{ t('planning.weekPlanning.steps.priorities') }}
      </h3>

      <ul v-if="candidates.length > 0" class="space-y-2">
        <li v-for="candidate in candidates" :key="candidate.key">
          <button
            type="button"
            class="neo-surface flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm shadow-neu-raised-sm transition-all"
            :class="selectedKeys.includes(candidate.key) ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'"
            @click="toggleCandidate(candidate.key)"
          >
            <AppIcon :name="selectedKeys.includes(candidate.key) ? 'check_circle' : 'radio_button_unchecked'" class="text-base" />
            <span class="min-w-0 flex-1 truncate">{{ candidate.title }}</span>
            <span class="shrink-0 text-xs text-on-surface-variant">{{ candidate.typeLabel }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="text-xs text-on-surface-variant">
        {{ t('planning.weekPlanning.priorities.empty') }}
      </p>

      <p v-if="selectedKeys.length > SOFT_LIMIT" class="text-xs font-medium text-amber-600">
        {{ t('planning.weekPlanning.priorities.softLimitWarning', { n: SOFT_LIMIT }) }}
      </p>

      <div class="flex justify-between">
        <AppButton variant="text" @click="step = 'intentions'">
          {{ t('planning.weekPlanning.back') }}
        </AppButton>
        <AppButton variant="filled" :disabled="isSaving" @click="save">
          {{ t('planning.weekPlanning.save') }}
        </AppButton>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type {
  ComparisonOperator,
  CountTargetOperator,
  MeasurementEntryMode,
  MeasurementTarget,
  ValueTargetAggregation,
  WeeklyIntention,
} from '@/domain/planning'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import { getWeekPlanningBundle } from '@/services/planningStateQueries'
import { isMeasurementSubjectOpen } from '@/services/planningVisibility'
import {
  createWeeklyIntention,
  listWeeklyIntentions,
  setWeekTopPriorities,
} from '@/services/weeklyIntentionService'

const SOFT_LIMIT = 3

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: []; 'open-grid': [] }>()

const { t } = useT()

type WizardStep = 'intentions' | 'priorities'
const step = ref<WizardStep>('intentions')
const stepIndex = computed(() => (step.value === 'intentions' ? 0 : 1))
const stepLabels = computed(() => [
  t('planning.weekPlanning.steps.intentions'),
  t('planning.weekPlanning.steps.priorities'),
])

const intentions = ref<WeeklyIntention[]>([])
const isSaving = ref(false)

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

function emptyDraft(): IntentionDraft {
  return { title: '', entryMode: 'counter', target: defaultTargetFor('counter') }
}

const draft = ref<IntentionDraft>(emptyDraft())

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

const targetAggregationOptions = computed(() => {
  if (draft.value.entryMode === 'rating') {
    return [{ value: 'average', label: t('planning.objects.targetAggregations.average') }]
  }
  return [
    { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
    { value: 'average', label: t('planning.objects.targetAggregations.average') },
    { value: 'last', label: t('planning.objects.targetAggregations.last') },
  ]
})

const showAggregation = computed(
  () => draft.value.entryMode === 'value' || draft.value.entryMode === 'rating',
)

const aggregationValue = computed(() => {
  const target = draft.value.target
  if (target.kind === 'value' || target.kind === 'rating') return target.aggregation
  return undefined
})

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
  draft.value = { ...draft.value, target: { ...draft.value.target, value: parsed } as MeasurementTarget }
}

function targetSummary(intention: WeeklyIntention): string {
  return `${intention.target.operator} ${intention.target.value}`
}

async function loadIntentions(): Promise<void> {
  intentions.value = await listWeeklyIntentions(props.weekRef)
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
    await Promise.all([loadIntentions(), loadCandidates()])
    emit('updated')
  } finally {
    isSaving.value = false
  }
}

// --- Step 2: top-3 candidates ---
interface Candidate {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  typeLabel: string
}

const candidates = ref<Candidate[]>([])
const selectedKeys = ref<string[]>([])

function typeLabelFor(subjectType: MeasurementSubjectType): string {
  return t(`planning.weekPlanning.subjectType.${subjectType}`)
}

async function loadCandidates(): Promise<void> {
  const bundle = await getWeekPlanningBundle(props.weekRef)
  const seen = new Set<string>()
  const list: Candidate[] = []
  for (const item of bundle.relevant.measurementItems) {
    // Trackers have no target/verdict, so they are not eligible week priorities.
    if (item.subjectType === 'tracker') continue
    if (!isMeasurementSubjectOpen(item.subject)) continue
    const key = `${item.subjectType}:${item.subject.id}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push({
      key,
      subjectType: item.subjectType,
      subjectId: item.subject.id,
      title: item.subject.title,
      typeLabel: typeLabelFor(item.subjectType),
    })
  }
  candidates.value = list
  selectedKeys.value = (bundle.weekPlan?.topPriorities ?? []).map(
    (ref) => `${ref.subjectType}:${ref.subjectId}`,
  )
}

function toggleCandidate(key: string): void {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((value) => value !== key)
    : [...selectedKeys.value, key]
}

async function save(): Promise<void> {
  if (isSaving.value) return
  isSaving.value = true
  try {
    const keyToCandidate = new Map(candidates.value.map((candidate) => [candidate.key, candidate]))
    const topPriorities: WeekTopPriorityRef[] = selectedKeys.value
      .map((key) => keyToCandidate.get(key))
      .filter((candidate): candidate is Candidate => Boolean(candidate))
      .map((candidate) => ({ subjectType: candidate.subjectType, subjectId: candidate.subjectId }))
    await setWeekTopPriorities(props.weekRef, topPriorities)
    emit('updated')
    emit('close')
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadIntentions(), loadCandidates()])
})

watch(
  () => props.weekRef,
  async () => {
    step.value = 'intentions'
    draft.value = emptyDraft()
    await Promise.all([loadIntentions(), loadCandidates()])
  },
)
</script>
