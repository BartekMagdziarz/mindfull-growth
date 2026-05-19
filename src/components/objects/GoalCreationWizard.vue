<template>
  <div class="space-y-6">
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
            {{ t('planning.goalWizard.steps.specific.successDefinitionLabel') }}
          </span>
          <textarea
            v-model="successDefinitionModel"
            rows="2"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
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

        <label class="block space-y-1">
          <span class="text-sm font-medium text-on-surface">
            {{ t('planning.goalWizard.steps.achievable.contingencyPlanLabel') }}
          </span>
          <textarea
            v-model="obstaclesModel"
            rows="3"
            class="neo-input w-full resize-none px-3 py-2 text-sm"
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
            class="neo-input w-full resize-none px-3 py-2 text-sm"
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
          class="neo-surface flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center"
        >
          <span class="w-32 shrink-0 text-sm font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.prioritiesTagLabel') }}
          </span>
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              v-for="option in selectedPriorityOptions"
              :key="option.id"
              type="button"
              class="neo-pill neo-focus inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
              @click="removePriority(option.id)"
            >
              <span>{{ option.label }}</span>
              <AppIcon name="close" class="text-xs text-on-surface-variant" />
            </button>
            <span v-if="selectedPriorityOptions.length === 0" class="text-xs text-on-surface-variant">
              {{ t('planning.objects.form.noneSelected') }}
            </span>
          </div>
          <div ref="priorityMenuRef" class="relative shrink-0">
            <button
              type="button"
              class="neo-icon-button neo-focus"
              :aria-label="t('planning.goalWizard.steps.relevant.addPriority')"
              @click="toggleTagMenu('priority')"
            >
              <AppIcon name="add" class="text-base" />
            </button>
            <div
              v-if="openTagMenu === 'priority'"
              class="absolute right-0 z-20 mt-2 max-h-60 min-w-56 overflow-y-auto rounded-2xl border border-white/40 bg-white p-2 shadow-lg"
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
          class="neo-surface flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center"
        >
          <span class="w-32 shrink-0 text-sm font-semibold text-on-surface">
            {{ t('planning.goalWizard.steps.relevant.lifeAreasTagLabel') }}
          </span>
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              v-for="option in selectedLifeAreaOptions"
              :key="option.id"
              type="button"
              class="neo-pill neo-focus inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
              @click="removeLifeArea(option.id)"
            >
              <span>{{ option.label }}</span>
              <AppIcon name="close" class="text-xs text-on-surface-variant" />
            </button>
            <span v-if="selectedLifeAreaOptions.length === 0" class="text-xs text-on-surface-variant">
              {{ t('planning.objects.form.noneSelected') }}
            </span>
          </div>
          <div ref="lifeAreaMenuRef" class="relative shrink-0">
            <button
              type="button"
              class="neo-icon-button neo-focus"
              :aria-label="t('planning.goalWizard.steps.relevant.addLifeArea')"
              @click="toggleTagMenu('lifeArea')"
            >
              <AppIcon name="add" class="text-base" />
            </button>
            <div
              v-if="openTagMenu === 'lifeArea'"
              class="absolute right-0 z-20 mt-2 max-h-60 min-w-56 overflow-y-auto rounded-2xl border border-white/40 bg-white p-2 shadow-lg"
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

        <div class="grid gap-4 lg:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(260px,1.3fr)]">
          <div class="space-y-3">
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

            <p
              v-if="countdownLabel"
              class="rounded-xl bg-neu-base px-3 py-2 text-xs text-on-surface-variant shadow-neu-pressed"
            >
              {{ countdownLabel }}
            </p>
          </div>

          <div class="neo-surface space-y-3 rounded-2xl p-4">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-semibold text-on-surface">
                {{ t('planning.goalWizard.steps.timebound.goalMonthsLabel') }}
              </span>
              <div ref="goalMonthsMenuRef" class="relative">
                <button
                  type="button"
                  class="neo-icon-button neo-focus"
                  :aria-label="t('planning.goalWizard.steps.timebound.addGoalMonth')"
                  @click="togglePeriodMenu('goal-months')"
                >
                  <AppIcon name="add" class="text-base" />
                </button>
                <div
                  v-if="openPeriodMenu === 'goal-months'"
                  class="absolute right-0 z-20 mt-2 max-h-60 min-w-40 overflow-y-auto rounded-2xl border border-white/40 bg-white p-2 shadow-lg"
                >
                  <button
                    v-for="month in availableMonthOptions"
                    :key="month.ref"
                    type="button"
                    class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-primary-soft/30"
                    @click="toggleGoalMonth(month.ref)"
                  >
                    <AppIcon
                      :name="goalDraft.linkedMonthRefs.includes(month.ref) ? 'check' : 'add'"
                      class="text-sm text-primary"
                    />
                    {{ month.label }}
                  </button>
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="month in selectedGoalMonthOptions"
                :key="month.ref"
                type="button"
                class="neo-pill neo-focus inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                @click="toggleGoalMonth(month.ref)"
              >
                {{ month.label }}
                <AppIcon name="close" class="text-xs text-on-surface-variant" />
              </button>
              <span v-if="selectedGoalMonthOptions.length === 0" class="text-xs text-on-surface-variant">
                {{ t('planning.goalWizard.steps.timebound.noGoalMonths') }}
              </span>
            </div>
          </div>

          <div class="neo-surface space-y-3 rounded-2xl p-4">
            <p class="text-sm font-semibold text-on-surface">
              {{ t('planning.goalWizard.steps.timebound.krPeriodsLabel') }}
            </p>
            <div class="space-y-3">
              <div
                v-for="kr in krDrafts"
                :key="kr.localId"
                class="flex flex-col gap-2 rounded-xl bg-neu-base px-3 py-2 shadow-neu-pressed"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="min-w-0 truncate text-xs font-semibold text-on-surface">
                    {{ kr.title || t('planning.goalWizard.steps.timebound.untitledKr') }}
                  </span>
                  <div :ref="(el) => setKrPeriodMenuRef(kr.localId, el)" class="relative shrink-0">
                    <button
                      type="button"
                      class="neo-icon-button neo-focus h-8 w-8"
                      :aria-label="t('planning.goalWizard.steps.timebound.addKrPeriod')"
                      @click="togglePeriodMenu(`kr:${kr.localId}`)"
                    >
                      <AppIcon name="add" class="text-sm" />
                    </button>
                    <div
                      v-if="openPeriodMenu === `kr:${kr.localId}`"
                      class="absolute right-0 z-20 mt-2 max-h-60 min-w-40 overflow-y-auto rounded-2xl border border-white/40 bg-white p-2 shadow-lg"
                    >
                      <button
                        v-for="period in periodOptionsForKr(kr)"
                        :key="period.ref"
                        type="button"
                        class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-primary-soft/30"
                        @click="toggleKrPeriod(kr.localId, period.ref)"
                      >
                        <AppIcon
                          :name="krPeriodRefs(kr.localId).includes(period.ref) ? 'check' : 'add'"
                          class="text-sm text-primary"
                        />
                        {{ period.label }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="period in selectedKrPeriodOptions(kr)"
                    :key="period.ref"
                    type="button"
                    class="neo-pill neo-focus inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
                    @click="toggleKrPeriod(kr.localId, period.ref)"
                  >
                    {{ period.label }}
                    <AppIcon name="close" class="text-xs text-on-surface-variant" />
                  </button>
                  <span v-if="selectedKrPeriodOptions(kr).length === 0" class="text-xs text-on-surface-variant">
                    {{ t('planning.goalWizard.steps.timebound.noKrPeriods') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import KrDraftCard from '@/components/objects/KrDraftCard.vue'
import { useT } from '@/composables/useT'
import { useGoalCreationWizard, type GoalWizardStep, type KrDraft } from '@/composables/useGoalCreationWizard'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { ObjectsLibraryFilterOption } from '@/services/objectsLibraryQueries'
import { getChildPeriods, getNextPeriod, getPeriodRefsForDate, getPreviousPeriod } from '@/utils/periods'

const { t, locale } = useT()

const props = defineProps<{
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
const priorityMenuRef = ref<HTMLElement | null>(null)
const lifeAreaMenuRef = ref<HTMLElement | null>(null)
const goalMonthsMenuRef = ref<HTMLElement | null>(null)
const krPeriodMenuRefs = new Map<string, HTMLElement>()
const openTagMenu = ref<'priority' | 'lifeArea' | null>(null)
const openPeriodMenu = ref<string | null>(null)

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

const selectedPriorityOptions = computed(() =>
  props.priorityOptions.filter((option) => goalDraft.priorityIds.includes(option.id)),
)

const selectedLifeAreaOptions = computed(() =>
  props.lifeAreaOptions.filter((option) => goalDraft.lifeAreaIds.includes(option.id)),
)

const availableMonthOptions = computed(() => {
  const now = new Date()
  const currentRef = getPeriodRefsForDate(now).month as string
  let ref = currentRef
  for (let i = 0; i < 4; i++) {
    ref = getPreviousPeriod(ref as MonthRef) as string
  }

  const months: Array<{ ref: string; label: string }> = []
  for (let i = 0; i < 12; i++) {
    months.push({ ref, label: formatMonthShort(ref as MonthRef) })
    ref = getNextPeriod(ref as MonthRef) as string
  }
  return months
})

const selectedGoalMonthOptions = computed(() =>
  goalDraft.linkedMonthRefs.map((ref) => ({
    ref,
    label: formatMonthShort(ref as MonthRef),
  })),
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
  const base = 'w-8 h-8'
  if (idx === stepIndex.value) return `${base} bg-primary text-white shadow-neu-raised-sm`
  if (idx < stepIndex.value) return `${base} bg-primary/15 text-primary cursor-pointer hover:-translate-y-px`
  return `${base} bg-neu-base text-on-surface-variant shadow-neu-pressed`
}

function toggleTagMenu(menu: 'priority' | 'lifeArea'): void {
  openTagMenu.value = openTagMenu.value === menu ? null : menu
  openPeriodMenu.value = null
}

function togglePeriodMenu(menu: string): void {
  openPeriodMenu.value = openPeriodMenu.value === menu ? null : menu
  openTagMenu.value = null
}

function togglePriority(id: string): void {
  goalDraft.priorityIds = goalDraft.priorityIds.includes(id)
    ? goalDraft.priorityIds.filter((value) => value !== id)
    : [...goalDraft.priorityIds, id]
}

function removePriority(id: string): void {
  goalDraft.priorityIds = goalDraft.priorityIds.filter((value) => value !== id)
}

function toggleLifeArea(id: string): void {
  goalDraft.lifeAreaIds = goalDraft.lifeAreaIds.includes(id)
    ? goalDraft.lifeAreaIds.filter((value) => value !== id)
    : [...goalDraft.lifeAreaIds, id]
}

function removeLifeArea(id: string): void {
  goalDraft.lifeAreaIds = goalDraft.lifeAreaIds.filter((value) => value !== id)
}

function toggleGoalMonth(ref: string): void {
  goalDraft.linkedMonthRefs = goalDraft.linkedMonthRefs.includes(ref)
    ? goalDraft.linkedMonthRefs.filter((value) => value !== ref)
    : [...goalDraft.linkedMonthRefs, ref]
}

function krPeriodRefs(localId: string): string[] {
  return goalDraft.krPeriodRefsByLocalId[localId] ?? []
}

function toggleKrPeriod(localId: string, ref: string): void {
  const current = krPeriodRefs(localId)
  goalDraft.krPeriodRefsByLocalId[localId] = current.includes(ref)
    ? current.filter((value) => value !== ref)
    : [...current, ref]
}

function setKrPeriodMenuRef(localId: string, el: Element | { $el?: Element } | null): void {
  if (el && '$el' in el && el.$el instanceof HTMLElement) {
    krPeriodMenuRefs.set(localId, el.$el)
    return
  }

  if (el instanceof HTMLElement) {
    krPeriodMenuRefs.set(localId, el)
  } else {
    krPeriodMenuRefs.delete(localId)
  }
}

function periodOptionsForKr(kr: KrDraft): Array<{ ref: string; label: string }> {
  const selectedGoalMonths = goalDraft.linkedMonthRefs
  if (kr.cadence === 'monthly') {
    if (selectedGoalMonths.length > 0) {
      return [...selectedGoalMonths]
        .sort()
        .map((ref) => ({ ref, label: formatMonthShort(ref as MonthRef) }))
    }
    return availableMonthOptions.value
  }

  if (selectedGoalMonths.length > 0) {
    const weekSet = new Set<string>()
    for (const monthRef of selectedGoalMonths) {
      for (const weekRef of getChildPeriods(monthRef as MonthRef)) {
        weekSet.add(weekRef)
      }
    }
    return [...weekSet]
      .sort()
      .map((ref) => ({ ref, label: formatWeekShort(ref as WeekRef) }))
  }

  const currentRef = getPeriodRefsForDate(new Date()).week as string
  let ref = currentRef
  for (let i = 0; i < 4; i++) {
    ref = getPreviousPeriod(ref as WeekRef) as string
  }

  const weeks: Array<{ ref: string; label: string }> = []
  for (let i = 0; i < 12; i++) {
    weeks.push({ ref, label: formatWeekShort(ref as WeekRef) })
    ref = getNextPeriod(ref as WeekRef) as string
  }
  return weeks
}

function selectedKrPeriodOptions(kr: KrDraft): Array<{ ref: string; label: string }> {
  return krPeriodRefs(kr.localId).map((ref) => ({
    ref,
    label: kr.cadence === 'weekly' ? formatWeekShort(ref as WeekRef) : formatMonthShort(ref as MonthRef),
  }))
}

function formatMonthShort(monthRef: MonthRef): string {
  const monthIndex = Number(monthRef.slice(5, 7)) - 1
  const year = monthRef.slice(2, 4)
  const monthName = new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(
    new Date(Number(monthRef.slice(0, 4)), monthIndex, 1),
  )
  return `${monthName} ${year}`
}

function formatWeekShort(weekRef: WeekRef): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekRef)
  if (!match) return weekRef
  return `W${match[2]}-${match[1].slice(2)}`
}

function handleOutsidePointerDown(event: PointerEvent): void {
  const target = event.target as Node
  const tagRoot = openTagMenu.value === 'priority' ? priorityMenuRef.value : lifeAreaMenuRef.value
  if (openTagMenu.value && tagRoot && !tagRoot.contains(target)) {
    openTagMenu.value = null
  }

  if (!openPeriodMenu.value) return
  const periodRoot = openPeriodMenu.value === 'goal-months'
    ? goalMonthsMenuRef.value
    : krPeriodMenuRefs.get(openPeriodMenu.value.replace(/^kr:/, ''))
  if (periodRoot && !periodRoot.contains(target)) {
    openPeriodMenu.value = null
  }
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
  document.addEventListener('pointerdown', handleOutsidePointerDown)
  void nextTick(() => titleInputRef.value?.focus())
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
})
</script>
