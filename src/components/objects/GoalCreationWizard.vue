<template>
  <div class="mg-design-v2 goal-wizard-v2 space-y-6">
    <!-- Step Indicator -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex items-center gap-2" role="group" aria-label="SMART wizard progress">
        <button
          v-for="(label, idx) in stepLabels"
          :key="label.key"
          type="button"
          class="mg-v2-progress-marker wizard-step"
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
            class="mg-v2-field w-full text-sm"
            :placeholder="t('planning.goalWizard.steps.specific.titlePlaceholder')"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.specific.successDefinitionLabel') }}
          </span>
          <textarea
            v-model="successDefinitionModel"
            rows="2"
            class="mg-v2-field w-full resize-none text-sm"
            :placeholder="t('planning.goalWizard.steps.specific.successDefinitionPlaceholder')"
          />
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
        </div>

        <div
          v-if="krDrafts.length === 0"
          class="mg-v2-surface mg-v2-surface--flat p-4 text-center text-sm text-on-surface-variant"
        >
          {{ t('planning.goalWizard.steps.measurable.emptyState') }}
        </div>

        <div v-else class="space-y-3">
          <KrDraftCard
            v-for="kr in krDrafts"
            :key="kr.localId"
            :model-value="kr"
            :can-remove="krDrafts.length > 1"
            @update:model-value="value => updateKrDraft(kr.localId, value)"
            @remove="removeKrDraft(kr.localId)"
          />
        </div>

        <DsButton class="w-full" @click="addKrDraft">
          <AppIcon name="add" class="text-base" />
          {{ t('planning.goalWizard.buttons.addKr') }}
        </DsButton>
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

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.achievabilityRationaleLabel') }}
          </span>
          <textarea
            v-model="achievabilityRationaleModel"
            rows="3"
            class="mg-v2-field w-full resize-none text-sm"
            :placeholder="
              t('planning.goalWizard.steps.achievable.achievabilityRationalePlaceholder')
            "
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.contingencyPlanLabel') }}
          </span>
          <textarea
            v-model="obstaclesModel"
            rows="3"
            class="mg-v2-field w-full resize-none text-sm"
            :placeholder="t('planning.goalWizard.steps.achievable.contingencyPlanPlaceholder')"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.supportPlanLabel') }}
          </span>
          <textarea
            v-model="resourcesModel"
            rows="3"
            class="mg-v2-field w-full resize-none text-sm"
            :placeholder="t('planning.goalWizard.steps.achievable.supportPlanPlaceholder')"
          />
        </label>
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

        <div
          v-if="priorityOptions.length > 0"
          class="mg-v2-surface mg-v2-surface--flat flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
        >
          <span class="w-32 shrink-0 text-sm font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.prioritiesTagLabel') }}
          </span>
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              v-for="option in selectedPriorityOptions"
              :key="option.id"
              type="button"
              class="mg-v2-pill"
              @click="removePriority(option.id)"
            >
              <span>{{ option.label }}</span>
              <AppIcon name="close" class="text-xs text-on-surface-variant" />
            </button>
            <span
              v-if="selectedPriorityOptions.length === 0"
              class="text-xs text-on-surface-variant"
            >
              {{ t('planning.objects.form.noneSelected') }}
            </span>
          </div>
          <div ref="priorityMenuRef" class="relative shrink-0">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon"
              :aria-label="t('planning.goalWizard.steps.relevant.addPriority')"
              @click="toggleTagMenu('priority')"
            >
              <AppIcon name="add" class="text-base" />
            </button>
            <div
              v-if="openTagMenu === 'priority'"
              class="mg-v2-popover absolute right-0 z-20 mt-2 max-h-60 min-w-56 overflow-y-auto p-2"
            >
              <button
                v-for="option in priorityOptions"
                :key="option.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-primary-soft/30"
                @click="togglePriority(option.id)"
              >
                <AppIcon
                  :name="goalDraft.priorityIds.includes(option.id) ? 'check' : 'add'"
                  class="text-sm text-primary"
                />
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="lifeAreaOptions.length > 0"
          class="mg-v2-surface mg-v2-surface--flat flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
        >
          <span class="w-32 shrink-0 text-sm font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.lifeAreasTagLabel') }}
          </span>
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              v-for="option in selectedLifeAreaOptions"
              :key="option.id"
              type="button"
              class="mg-v2-pill"
              @click="removeLifeArea(option.id)"
            >
              <span>{{ option.label }}</span>
              <AppIcon name="close" class="text-xs text-on-surface-variant" />
            </button>
            <span
              v-if="selectedLifeAreaOptions.length === 0"
              class="text-xs text-on-surface-variant"
            >
              {{ t('planning.objects.form.noneSelected') }}
            </span>
          </div>
          <div ref="lifeAreaMenuRef" class="relative shrink-0">
            <button
              type="button"
              class="mg-v2-button mg-v2-button--icon"
              :aria-label="t('planning.goalWizard.steps.relevant.addLifeArea')"
              @click="toggleTagMenu('lifeArea')"
            >
              <AppIcon name="add" class="text-base" />
            </button>
            <div
              v-if="openTagMenu === 'lifeArea'"
              class="mg-v2-popover absolute right-0 z-20 mt-2 max-h-60 min-w-56 overflow-y-auto p-2"
            >
              <button
                v-for="option in lifeAreaOptions"
                :key="option.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-primary-soft/30"
                @click="toggleLifeArea(option.id)"
              >
                <AppIcon
                  :name="goalDraft.lifeAreaIds.includes(option.id) ? 'check' : 'add'"
                  class="text-sm text-primary"
                />
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.whyMattersLabel') }}
          </span>
          <textarea
            v-model="whyMattersModel"
            rows="3"
            class="mg-v2-field w-full resize-none text-sm"
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

        <p class="text-sm text-on-surface-variant">{{ t('planning.periodPicker.scheduleHint') }}</p>
        <p
          v-if="wizardMode === 'edit' && krDrafts.some(kr => !inheritsSchedule(kr.localId))"
          class="text-xs text-on-surface-variant"
        >
          {{ t('planning.periodPicker.preserved') }}
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1"
            ><span class="text-sm font-medium">{{ t('planning.periodPicker.start') }}</span>
            <input v-model="goalDraft.startDate" type="date" class="mg-v2-field w-full" />
          </label>
          <label class="space-y-1"
            ><span class="text-sm font-medium">{{
              t('planning.goalWizard.steps.timebound.dateLabel')
            }}</span>
            <input
              :value="goalDraft.targetDate ?? ''"
              type="date"
              :min="goalDraft.startDate"
              class="mg-v2-field w-full"
              @input="onTargetDateInput"
            />
          </label>
        </div>
        <p v-if="goalDraft.targetDate && !validDateRange" role="alert" class="text-sm text-danger">
          {{
            t(
              goalDraft.startDate
                ? 'planning.periodPicker.invalidRange'
                : 'planning.periodPicker.missingStart'
            )
          }}
        </p>
        <p v-else-if="countdownLabel" class="text-xs text-on-surface-variant">
          {{ countdownLabel }}
        </p>
        <div class="mg-v2-surface mg-v2-surface--flat space-y-3 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="font-semibold">
              {{ t('planning.goalWizard.steps.timebound.goalMonthsLabel') }}
            </h4>
            <label class="flex items-center gap-2 text-sm"
              ><input
                :checked="customGoalMonths"
                type="checkbox"
                class="mg-v2-checkbox"
                @change="onGoalMonthModeChange"
              />{{ t('planning.periodPicker.goalCustom') }}</label
            >
          </div>
          <PeriodCalendarPicker
            v-if="customGoalMonths"
            v-model="goalDraft.linkedMonthRefs"
            cadence="monthly"
          />
          <p class="text-xs text-on-surface-variant">{{ t('planning.periodPicker.automatic') }}</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="month in effectiveGoalMonths" :key="month" class="mg-v2-badge">{{
              formatMonthShort(month as MonthRef)
            }}</span>
          </div>
        </div>
        <div
          v-for="kr in krDrafts"
          :key="kr.localId"
          class="mg-v2-surface mg-v2-surface--flat space-y-3 p-4"
        >
          <h4 class="font-semibold">
            {{ kr.title || t('planning.goalWizard.steps.timebound.untitledKr') }}
          </h4>
          <label class="flex items-center gap-2 text-sm"
            ><input
              type="checkbox"
              class="mg-v2-checkbox"
              :checked="inheritsSchedule(kr.localId)"
              :disabled="!goalDraft.startDate && !inheritsSchedule(kr.localId)"
              @change="setKrScheduleMode(kr.localId, ($event.target as HTMLInputElement).checked)"
            />{{ t('planning.periodPicker.inherit') }}</label
          >
          <PeriodCalendarPicker
            v-if="!inheritsSchedule(kr.localId)"
            :model-value="krPeriods(kr.localId)"
            :cadence="kr.cadence"
            :label="t('planning.periodPicker.custom')"
            @update:model-value="goalDraft.krPeriodRefsByLocalId[kr.localId] = $event"
          />
          <PeriodSelectionSummary :periods="krPeriods(kr.localId)" :cadence="kr.cadence" />
          <p v-if="hasOutsidePeriods(kr)" class="text-xs text-on-surface-variant">
            {{ t('planning.periodPicker.outside') }}
          </p>
        </div>
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

        <div class="mg-v2-surface mg-v2-surface--flat space-y-2 p-4">
          <p class="text-sm font-semibold text-on-surface">
            {{ goalDraft.title || '—' }}
          </p>
          <p v-if="goalDraft.targetDate" class="text-xs text-on-surface-variant">
            {{ t('planning.goalWizard.steps.timebound.dateLabel') }}: {{ goalDraft.targetDate }}
          </p>
        </div>

        <p class="text-sm">
          {{ t('planning.periodPicker.review') }}:
          {{
            effectiveGoalMonths.map(month => formatMonthShort(month as MonthRef)).join(' · ') ||
            t('planning.periodPicker.noPeriods')
          }}
        </p>
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
              class="mg-v2-surface mg-v2-surface--flat px-3 py-1.5 text-xs text-on-surface"
            >
              {{ kr.title || '—' }}
              <PeriodSelectionSummary :periods="krPeriods(kr.localId)" :cadence="kr.cadence" />
            </li>
          </ul>
        </div>

        <p
          v-if="smartCompleteness.missing.length > 0 && smartCompleteness.score < 5"
          class="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning"
        >
          {{
            t('planning.goalWizard.steps.review.missingHint', {
              letters: smartCompleteness.missing.join(', '),
            })
          }}
        </p>
      </div>
    </Transition>

    <!-- Footer -->
    <div class="flex items-center justify-between gap-2 pt-2">
      <DsButton variant="quiet" @click="onCancel">
        {{ t('planning.goalWizard.buttons.cancel') }}
      </DsButton>
      <div class="flex items-center gap-2">
        <DsButton v-if="stepIndex > 0" variant="quiet" @click="prevStep">
          {{ t('planning.goalWizard.buttons.back') }}
        </DsButton>
        <DsButton v-if="currentStep !== 'review'" :disabled="!canAdvance" @click="nextStep">
          {{ t('planning.goalWizard.buttons.next') }}
        </DsButton>
        <DsButton v-else :loading="isSaving" :disabled="!canSave" @click="onSave">
          {{
            wizardMode === 'edit'
              ? t('planning.goalWizard.buttons.save')
              : t('planning.goalWizard.buttons.create')
          }}
        </DsButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { DsButton } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import PeriodSelectionSummary from '@/components/objects/PeriodSelectionSummary.vue'
import PeriodCalendarPicker from '@/components/objects/PeriodCalendarPicker.vue'
import { getPeriodRefsForDate } from '@/utils/periods'
import { periodsInDateRange } from '@/utils/periodSchedule'
import KrDraftCard from '@/components/objects/KrDraftCard.vue'
import { useT } from '@/composables/useT'
import {
  useGoalCreationWizard,
  type GoalWizardEditInput,
  type GoalWizardMode,
  type GoalWizardStep,
  type KrDraft,
} from '@/composables/useGoalCreationWizard'
import type { MonthRef } from '@/domain/period'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'

const { t, locale } = useT()

const props = withDefaults(
  defineProps<{
    priorityOptions: ObjectsLibraryFilterOption[]
    lifeAreaOptions: ObjectsLibraryFilterOption[]
    mode?: GoalWizardMode
    editInput?: GoalWizardEditInput
  }>(),
  {
    mode: 'create',
    editInput: undefined,
  }
)

const emit = defineEmits<{
  saved: [goalId: string, mode: GoalWizardMode]
  cancelled: []
  error: [message: string]
}>()

const {
  mode: wizardMode,
  currentStep,
  stepIndex,
  canAdvance,
  canSave,
  validDateRange,
  customGoalMonths,
  effectiveGoalMonths,
  inheritsSchedule,
  krPeriods,
  setKrScheduleMode,
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
  loadForEdit,
  save,
  reset,
} = useGoalCreationWizard()

const titleInputRef = ref<HTMLInputElement | null>(null)
const priorityMenuRef = ref<HTMLElement | null>(null)
const lifeAreaMenuRef = ref<HTMLElement | null>(null)
const openTagMenu = ref<'priority' | 'lifeArea' | null>(null)

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
const achievabilityRationaleModel = computed({
  get: () => goalDraft.achievabilityRationale ?? '',
  set: (value: string) => {
    goalDraft.achievabilityRationale = value || undefined
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

const selectedPriorityOptions = computed(() =>
  props.priorityOptions.filter(option => goalDraft.priorityIds.includes(option.id))
)

const selectedLifeAreaOptions = computed(() =>
  props.lifeAreaOptions.filter(option => goalDraft.lifeAreaIds.includes(option.id))
)

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
  if (idx === stepIndex.value) return 'wizard-step--current'
  if (idx < stepIndex.value) return 'mg-v2-progress-marker--done wizard-step--done'
  return 'wizard-step--upcoming'
}

function toggleTagMenu(menu: 'priority' | 'lifeArea'): void {
  openTagMenu.value = openTagMenu.value === menu ? null : menu
}

function togglePriority(id: string): void {
  goalDraft.priorityIds = goalDraft.priorityIds.includes(id)
    ? goalDraft.priorityIds.filter(value => value !== id)
    : [...goalDraft.priorityIds, id]
}

function removePriority(id: string): void {
  goalDraft.priorityIds = goalDraft.priorityIds.filter(value => value !== id)
}

function toggleLifeArea(id: string): void {
  goalDraft.lifeAreaIds = goalDraft.lifeAreaIds.includes(id)
    ? goalDraft.lifeAreaIds.filter(value => value !== id)
    : [...goalDraft.lifeAreaIds, id]
}

function removeLifeArea(id: string): void {
  goalDraft.lifeAreaIds = goalDraft.lifeAreaIds.filter(value => value !== id)
}

function onGoalMonthModeChange(): void {
  const current = [...effectiveGoalMonths.value]
  customGoalMonths.value = !customGoalMonths.value
  goalDraft.linkedMonthRefs = customGoalMonths.value ? current : []
}

function hasOutsidePeriods(kr: KrDraft): boolean {
  if (!goalDraft.startDate || !goalDraft.targetDate) return false
  const expected = new Set(
    periodsInDateRange(goalDraft.startDate, goalDraft.targetDate, kr.cadence)
  )
  return krPeriods(kr.localId).some(period => !expected.has(period))
}

function formatMonthShort(monthRef: MonthRef): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(2, 4)
  const monthName = new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(
    new Date(Number(monthRef.slice(0, 4)), monthIndex, 1)
  )
  return `${monthName} ${year}`
}

function handleOutsidePointerDown(event: PointerEvent): void {
  const target = event.target as Node
  const tagRoot = openTagMenu.value === 'priority' ? priorityMenuRef.value : lifeAreaMenuRef.value
  if (openTagMenu.value && tagRoot && !tagRoot.contains(target)) {
    openTagMenu.value = null
  }
}

const completenessRows = computed(() => [
  {
    key: 'S',
    ok: smartCompleteness.value.S,
    label: t('planning.goalWizard.steps.review.summary.specific'),
  },
  {
    key: 'M',
    ok: smartCompleteness.value.M,
    label: t('planning.goalWizard.steps.review.summary.measurable'),
  },
  {
    key: 'A',
    ok: smartCompleteness.value.A,
    label: t('planning.goalWizard.steps.review.summary.achievable'),
  },
  {
    key: 'R',
    ok: smartCompleteness.value.R,
    label: t('planning.goalWizard.steps.review.summary.relevant'),
  },
  {
    key: 'T',
    ok: smartCompleteness.value.T,
    label: t('planning.goalWizard.steps.review.summary.timebound'),
  },
])

const countdownLabel = computed(() => {
  if (!goalDraft.targetDate) return ''
  const target = parseIsoUtc(goalDraft.targetDate)
  const now = parseIsoUtc(getPeriodRefsForDate(new Date()).day)
  if (!target || !now) return ''
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86_400_000)
  if (diffDays === 0) return t('planning.goalWizard.steps.timebound.countdown.today')
  if (diffDays < 0)
    return t('planning.goalWizard.steps.timebound.countdown.overdue', { count: Math.abs(diffDays) })
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

function onTargetDateInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  goalDraft.targetDate = value || undefined
}

async function onSave(): Promise<void> {
  const submittingMode = wizardMode.value
  try {
    const id = await save()
    emit('saved', id, submittingMode)
  } catch (err) {
    const message = err instanceof Error ? err.message : t('planning.goalWizard.messages.saveError')
    emit('error', message)
  }
}

function onCancel(): void {
  reset()
  emit('cancelled')
}

watch(currentStep, step => {
  if (step === 'specific') {
    void nextTick(() => titleInputRef.value?.focus())
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
  if (props.mode === 'edit' && props.editInput) {
    loadForEdit(props.editInput)
  }
  void nextTick(() => titleInputRef.value?.focus())
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
})
</script>

<style scoped>
/* The v2 root's min-width/canvas background are meant for full-viewport
   workspaces; this wizard renders inside an AppDialog panel. */
.goal-wizard-v2 {
  min-width: 0;
  background: transparent;
}

.wizard-step {
  width: 2rem;
  height: 2rem;
}

.wizard-step--current {
  border-color: var(--mg-color-primary);
  color: var(--mg-color-on-primary);
  background: var(--mg-color-primary);
}

.wizard-step--done {
  cursor: pointer;
  /* Match DsProgressMarker: completed steps show the dot, not the letter. */
  font-size: 0;
}

.wizard-step--done:hover {
  transform: translateY(-1px);
}

.wizard-step--upcoming {
  color: var(--mg-color-muted);
  background: var(--mg-color-paper);
}
</style>
