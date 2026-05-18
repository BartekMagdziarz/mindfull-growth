<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="space-y-1">
      <h2 class="text-lg font-bold text-on-surface">{{ t('planning.goalWizard.title') }}</h2>
      <p class="text-xs text-on-surface-variant">{{ t('planning.goalWizard.subtitle') }}</p>
    </div>

    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-2" role="group" aria-label="SMART wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="label.key"
          type="button"
          class="flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 neo-focus"
          :class="dotClass(idx)"
          :aria-label="`Step ${idx + 1}: ${label.full}${idx < stepIndex ? ' (completed)' : idx === stepIndex ? ' (current)' : ''}`"
          @click="idx <= stepIndex && goToStep(label.key)"
        >
          {{ label.short }}
        </button>
      </div>
      <span class="text-xs font-medium text-on-surface-variant">
        {{ stepLabels[stepIndex].full }}
      </span>
    </div>

    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <!-- Specific -->
      <div v-if="currentStep === 'specific'" key="specific" class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.specific.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.specific.subtitle') }}
          </p>
        </div>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.specific.titleLabel') }}
          </span>
          <input
            ref="titleInputRef"
            v-model="goalDraft.title"
            type="text"
            class="neo-input w-full px-3 py-2 text-sm"
            :placeholder="t('planning.goalWizard.steps.specific.titlePlaceholder')"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.specific.descriptionLabel') }}
          </span>
          <textarea
            v-model="descriptionModel"
            rows="2"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
            :placeholder="t('planning.goalWizard.steps.specific.descriptionPlaceholder')"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.specific.successDefinitionLabel') }}
          </span>
          <textarea
            v-model="successDefinitionModel"
            rows="2"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
            :placeholder="t('planning.goalWizard.steps.specific.successDefinitionPlaceholder')"
          />
          <span class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.specific.successDefinitionHint') }}
          </span>
        </label>
      </div>

      <!-- Measurable -->
      <div v-else-if="currentStep === 'measurable'" key="measurable" class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.measurable.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.measurable.subtitle') }}
          </p>
          <p class="text-xs text-on-surface-variant/80">
            {{ t('planning.goalWizard.steps.measurable.hint') }}
          </p>
        </div>

        <div v-if="krDrafts.length === 0" class="neo-surface rounded-2xl p-4 text-center text-sm text-on-surface-variant">
          {{ t('planning.goalWizard.steps.measurable.emptyState') }}
        </div>

        <div v-else class="space-y-3">
          <KrDraftCard
            v-for="kr in krDrafts"
            :key="kr.localId"
            :model-value="kr"
            :can-remove="krDrafts.length > 1"
            @update:model-value="(value) => updateKrDraft(kr.localId, value)"
            @remove="removeKrDraft(kr.localId)"
          />
        </div>

        <AppButton variant="tonal" class="w-full" @click="addKrDraft">
          <AppIcon name="add" class="text-base" />
          {{ t('planning.goalWizard.buttons.addKr') }}
        </AppButton>
      </div>

      <!-- Achievable -->
      <div v-else-if="currentStep === 'achievable'" key="achievable" class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.achievable.subtitle') }}
          </p>
        </div>

        <RatingSlider
          :model-value="goalDraft.confidenceRating ?? 5"
          :label="t('planning.goalWizard.steps.achievable.confidenceLabel')"
          :min="1"
          :max="10"
          :low-label="t('planning.goalWizard.steps.achievable.confidenceLow')"
          :high-label="t('planning.goalWizard.steps.achievable.confidenceHigh')"
          @update:model-value="(value) => (goalDraft.confidenceRating = value)"
        />

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.obstaclesLabel') }}
          </span>
          <textarea
            v-model="obstaclesModel"
            rows="2"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
            :placeholder="t('planning.goalWizard.steps.achievable.obstaclesPlaceholder')"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.resourcesLabel') }}
          </span>
          <textarea
            v-model="resourcesModel"
            rows="2"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
            :placeholder="t('planning.goalWizard.steps.achievable.resourcesPlaceholder')"
          />
        </label>

        <p
          v-if="goalDraft.confidenceRating !== undefined && goalDraft.confidenceRating < 5"
          class="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning"
        >
          {{ t('planning.goalWizard.steps.achievable.lowConfidenceHint') }}
        </p>
      </div>

      <!-- Relevant -->
      <div v-else-if="currentStep === 'relevant'" key="relevant" class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.relevant.subtitle') }}
          </p>
        </div>

        <ObjectsLibraryMultiSelect
          v-if="priorityOptions.length > 0"
          :model-value="goalDraft.priorityIds"
          :options="priorityOptions"
          :label="t('planning.goalWizard.steps.relevant.prioritiesLabel')"
          :empty-label="t('planning.objects.form.noneSelected')"
          :clear-label="t('planning.objects.filterControls.clear')"
          :close-label="t('common.buttons.close')"
          @update:model-value="(value) => (goalDraft.priorityIds = value)"
        />

        <ObjectsLibraryMultiSelect
          v-if="lifeAreaOptions.length > 0"
          :model-value="goalDraft.lifeAreaIds"
          :options="lifeAreaOptions"
          :label="t('planning.goalWizard.steps.relevant.lifeAreasLabel')"
          :empty-label="t('planning.objects.form.noneSelected')"
          :clear-label="t('planning.objects.filterControls.clear')"
          :close-label="t('common.buttons.close')"
          @update:model-value="(value) => (goalDraft.lifeAreaIds = value)"
        />

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.whyMattersLabel') }}
          </span>
          <textarea
            v-model="whyMattersModel"
            rows="3"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
            :placeholder="t('planning.goalWizard.steps.relevant.whyMattersPlaceholder')"
          />
        </label>
      </div>

      <!-- Time-bound -->
      <div v-else-if="currentStep === 'timebound'" key="timebound" class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.timebound.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.timebound.subtitle') }}
          </p>
        </div>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.timebound.dateLabel') }}
          </span>
          <input
            :value="goalDraft.targetDate ?? ''"
            type="date"
            class="neo-input w-full px-3 py-2 text-sm"
            :min="today"
            @input="onTargetDateInput"
          />
        </label>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="neo-pill neo-focus px-3 py-1.5 text-xs"
            @click="applyPreset('thirtyDays')"
          >
            {{ t('planning.goalWizard.steps.timebound.presets.thirtyDays') }}
          </button>
          <button
            type="button"
            class="neo-pill neo-focus px-3 py-1.5 text-xs"
            @click="applyPreset('endOfQuarter')"
          >
            {{ t('planning.goalWizard.steps.timebound.presets.endOfQuarter') }}
          </button>
          <button
            type="button"
            class="neo-pill neo-focus px-3 py-1.5 text-xs"
            @click="applyPreset('endOfYear')"
          >
            {{ t('planning.goalWizard.steps.timebound.presets.endOfYear') }}
          </button>
        </div>

        <p v-if="countdownLabel" class="rounded-xl bg-neu-base px-3 py-2 text-xs text-on-surface-variant shadow-neu-pressed">
          {{ countdownLabel }}
        </p>
      </div>

      <!-- Review -->
      <div v-else-if="currentStep === 'review'" key="review" class="space-y-4">
        <div class="space-y-1">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.review.title') }}
          </h3>
          <p class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.review.subtitle') }}
          </p>
        </div>

        <div class="neo-surface space-y-2 rounded-2xl p-4">
          <p class="text-sm font-semibold text-on-surface">
            {{ goalDraft.title || '—' }}
          </p>
          <p v-if="goalDraft.targetDate" class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.timebound.dateLabel') }}: {{ goalDraft.targetDate }}
          </p>
        </div>

        <ul class="space-y-1.5">
          <li
            v-for="entry in completenessRows"
            :key="entry.key"
            class="flex items-center gap-2 text-sm"
          >
            <AppIcon
              :name="entry.ok ? 'check_circle' : 'radio_button_unchecked'"
              class="text-base"
              :class="entry.ok ? 'text-success' : 'text-on-surface-variant/60'"
            />
            <span :class="entry.ok ? 'text-on-surface' : 'text-on-surface-variant'">
              {{ entry.label }}
            </span>
          </li>
        </ul>

        <div v-if="krDrafts.length > 0" class="space-y-1.5">
          <p class="text-xs font-semibold uppercase text-on-surface-variant">
            {{ t('planning.goalWizard.steps.review.keyResults') }}
          </p>
          <ul class="space-y-1">
            <li
              v-for="kr in krDrafts"
              :key="kr.localId"
              class="rounded-xl bg-neu-base px-3 py-1.5 text-xs text-on-surface shadow-neu-pressed"
            >
              {{ kr.title || '—' }}
            </li>
          </ul>
        </div>

        <p
          v-if="smartCompleteness.missing.length > 0 && smartCompleteness.score < 5"
          class="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning"
        >
          {{ t('planning.goalWizard.steps.review.missingHint', { letters: smartCompleteness.missing.join(', ') }) }}
        </p>
      </div>
    </Transition>

    <!-- Footer -->
    <div class="flex items-center justify-between gap-2 pt-2">
      <AppButton variant="text" @click="onCancel">
        {{ t('planning.goalWizard.buttons.cancel') }}
      </AppButton>
      <div class="flex items-center gap-2">
        <AppButton v-if="stepIndex > 0" variant="text" @click="prevStep">
          {{ t('planning.goalWizard.buttons.back') }}
        </AppButton>
        <AppButton
          v-if="currentStep !== 'review'"
          variant="filled"
          :disabled="!canAdvance"
          @click="nextStep"
        >
          {{ t('planning.goalWizard.buttons.next') }}
        </AppButton>
        <AppButton
          v-else
          variant="filled"
          :loading="isSaving"
          :disabled="!canSave"
          @click="onSave"
        >
          {{ t('planning.goalWizard.buttons.create') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import RatingSlider from '@/components/exercises/RatingSlider.vue'
import ObjectsLibraryMultiSelect from '@/components/objects/ObjectsLibraryMultiSelect.vue'
import KrDraftCard from '@/components/objects/KrDraftCard.vue'
import { useT } from '@/composables/useT'
import { useGoalCreationWizard, type GoalWizardStep } from '@/composables/useGoalCreationWizard'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const { t } = useT()

defineProps<{
  priorityOptions: ObjectsLibraryFilterOption[]
  lifeAreaOptions: ObjectsLibraryFilterOption[]
}>()

const emit = defineEmits<{
  created: [goalId: string]
  cancelled: []
  error: [message: string]
}>()

const {
  currentStep,
  stepIndex,
  canAdvance,
  canSave,
  goalDraft,
  krDrafts,
  isSaving,
  smartCompleteness,
  goToStep,
  nextStep,
  prevStep,
  addKrDraft,
  removeKrDraft,
  updateKrDraft,
  save,
  reset,
} = useGoalCreationWizard()

const titleInputRef = ref<HTMLInputElement | null>(null)

const descriptionModel = computed({
  get: () => goalDraft.description ?? '',
  set: (value: string) => {
    goalDraft.description = value || undefined
  },
})
const successDefinitionModel = computed({
  get: () => goalDraft.successDefinition ?? '',
  set: (value: string) => {
    goalDraft.successDefinition = value || undefined
  },
})
const obstaclesModel = computed({
  get: () => goalDraft.obstacles ?? '',
  set: (value: string) => {
    goalDraft.obstacles = value || undefined
  },
})
const resourcesModel = computed({
  get: () => goalDraft.resources ?? '',
  set: (value: string) => {
    goalDraft.resources = value || undefined
  },
})
const whyMattersModel = computed({
  get: () => goalDraft.whyMatters ?? '',
  set: (value: string) => {
    goalDraft.whyMatters = value || undefined
  },
})

const today = computed(() => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const stepLabels = computed<Array<{ key: GoalWizardStep; full: string; short: string }>>(() => [
  {
    key: 'specific',
    full: t('planning.goalWizard.stepLabels.specific'),
    short: t('planning.goalWizard.stepLabels.short.specific'),
  },
  {
    key: 'measurable',
    full: t('planning.goalWizard.stepLabels.measurable'),
    short: t('planning.goalWizard.stepLabels.short.measurable'),
  },
  {
    key: 'achievable',
    full: t('planning.goalWizard.stepLabels.achievable'),
    short: t('planning.goalWizard.stepLabels.short.achievable'),
  },
  {
    key: 'relevant',
    full: t('planning.goalWizard.stepLabels.relevant'),
    short: t('planning.goalWizard.stepLabels.short.relevant'),
  },
  {
    key: 'timebound',
    full: t('planning.goalWizard.stepLabels.timebound'),
    short: t('planning.goalWizard.stepLabels.short.timebound'),
  },
  {
    key: 'review',
    full: t('planning.goalWizard.stepLabels.review'),
    short: t('planning.goalWizard.stepLabels.short.review'),
  },
])

function dotClass(idx: number): string {
  const base = 'w-8 h-8'
  if (idx === stepIndex.value) return `${base} bg-primary text-white shadow-neu-raised-sm`
  if (idx < stepIndex.value) return `${base} bg-primary/15 text-primary cursor-pointer hover:-translate-y-px`
  return `${base} bg-neu-base text-on-surface-variant shadow-neu-pressed`
}

const completenessRows = computed(() => [
  { key: 'S', ok: smartCompleteness.value.S, label: t('planning.goalWizard.steps.review.summary.specific') },
  { key: 'M', ok: smartCompleteness.value.M, label: t('planning.goalWizard.steps.review.summary.measurable') },
  { key: 'A', ok: smartCompleteness.value.A, label: t('planning.goalWizard.steps.review.summary.achievable') },
  { key: 'R', ok: smartCompleteness.value.R, label: t('planning.goalWizard.steps.review.summary.relevant') },
  { key: 'T', ok: smartCompleteness.value.T, label: t('planning.goalWizard.steps.review.summary.timebound') },
])

const countdownLabel = computed(() => {
  if (!goalDraft.targetDate) return ''
  const target = parseIsoUtc(goalDraft.targetDate)
  const now = parseIsoUtc(today.value)
  if (!target || !now) return ''
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86_400_000)
  if (diffDays === 0) return t('planning.goalWizard.steps.timebound.countdown.today')
  if (diffDays < 0) return t('planning.goalWizard.steps.timebound.countdown.overdue', { count: Math.abs(diffDays) })
  if (diffDays >= 14) {
    const weeks = Math.round(diffDays / 7)
    return t('planning.goalWizard.steps.timebound.countdown.weeks', { count: weeks })
  }
  return t('planning.goalWizard.steps.timebound.countdown.days', { count: diffDays })
})

function parseIsoUtc(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function onTargetDateInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  goalDraft.targetDate = value || undefined
}

function applyPreset(preset: 'thirtyDays' | 'endOfQuarter' | 'endOfYear'): void {
  const now = new Date()
  let target: Date
  switch (preset) {
    case 'thirtyDays': {
      target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30))
      break
    }
    case 'endOfQuarter': {
      const month = now.getUTCMonth()
      const lastMonthOfQuarter = Math.floor(month / 3) * 3 + 2
      target = new Date(Date.UTC(now.getUTCFullYear(), lastMonthOfQuarter + 1, 0))
      break
    }
    case 'endOfYear': {
      target = new Date(Date.UTC(now.getUTCFullYear(), 11, 31))
      break
    }
  }
  goalDraft.targetDate = formatIsoDate(target)
}

async function onSave(): Promise<void> {
  try {
    const id = await save()
    emit('created', id)
  } catch (err) {
    const message = err instanceof Error ? err.message : t('planning.goalWizard.messages.saveError')
    emit('error', message)
  }
}

function onCancel(): void {
  reset()
  emit('cancelled')
}

watch(
  currentStep,
  (step) => {
    if (step === 'specific') {
      void nextTick(() => titleInputRef.value?.focus())
    }
  },
)

onMounted(() => {
  void nextTick(() => titleInputRef.value?.focus())
})
</script>
