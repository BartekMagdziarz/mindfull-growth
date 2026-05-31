<template>
  <section data-testid="annual-planning-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-baseline gap-2">
        <h2 class="text-lg font-bold text-on-surface">
          {{ t('planning.annual.title') }}
        </h2>
        <span v-if="stepSubtitle" class="text-xs text-on-surface-variant">- {{ stepSubtitle }}</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5" role="group" :aria-label="t('planning.annual.progress')">
          <button
            v-for="(label, idx) in stepLabels"
            :key="label"
            type="button"
            :aria-label="`Step ${idx + 1}: ${label}`"
            class="rounded-full transition-all duration-200"
            :class="
              idx < stepIndex
                ? 'neo-step-completed h-2.5 w-2.5 cursor-pointer'
                : idx === stepIndex
                  ? 'neo-step-active h-3.5 w-3.5'
                  : 'neo-step-future h-2.5 w-2.5'
            "
            @click="idx < stepIndex && goToStep(STEPS[idx])"
          />
        </div>
        <span class="text-xs font-medium text-on-surface-variant">
          {{ stepLabels[stepIndex] }}
        </span>
      </div>
    </div>

    <PlanningStatePanel
      v-if="isLoading"
      compact
      :title="t('common.loading')"
      :body="t('planning.annual.loading')"
      :eyebrow="t('planning.annual.title')"
    />

    <PlanningStatePanel
      v-else-if="loadError"
      compact
      :title="t('planning.annual.loadError')"
      :body="loadError"
      :eyebrow="t('planning.annual.title')"
      :action-label="t('common.buttons.tryAgain')"
      @action="void loadAll()"
    />

    <Transition
      v-else
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      mode="out-in"
    >
      <div v-if="currentStep === 'brief'" key="brief" class="space-y-4">
        <PlaceholderPanel
          icon="auto_awesome"
          :title="t('planning.annual.brief.title')"
          :body="t('planning.annual.brief.body')"
        />
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-on-surface">{{ t('planning.annual.brief.note') }}</span>
          <textarea
            v-model="annualBriefNote"
            rows="5"
            class="neo-input min-h-[9rem] w-full resize-y px-4 py-3 text-sm leading-relaxed"
            :placeholder="t('planning.annual.brief.placeholder')"
          />
        </label>
      </div>

      <div v-else-if="currentStep === 'life-areas'" key="life-areas" class="space-y-4">
        <div v-if="lifeAreas.length === 0" class="neo-inset rounded-[1.75rem] p-5 text-sm text-on-surface-variant">
          {{ t('planning.annual.lifeAreas.empty') }}
        </div>

        <div v-else class="grid gap-3 lg:grid-cols-2">
          <article
            v-for="area in lifeAreas"
            :key="area.id"
            class="neo-inset rounded-[1.5rem] p-3"
          >
            <div class="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center">
              <EntityIcon v-if="area.icon" :icon="area.icon" size="sm" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold text-on-surface">{{ area.name }}</div>
                <div class="text-[11px] text-on-surface-variant">
                  {{ t('planning.annual.lifeAreas.score', { score: assessmentItem(area.id)?.score ?? '-' }) }}
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-1 sm:justify-end">
                <button
                  v-for="score in scoreOptions"
                  :key="score"
                  type="button"
                  class="h-7 w-7 rounded-lg text-[11px] font-semibold transition-all"
                  :class="assessmentItem(area.id)?.score === score ? 'neo-pill neo-pill--primary text-primary' : 'neo-pill text-on-surface-variant'"
                  @click.stop="void updateLifeAreaScore(area.id, score)"
                >
                  {{ score }}
                </button>
              </div>
              <button
                type="button"
                class="neo-icon-button neo-focus h-9 w-9 shrink-0 rounded-xl"
                :aria-label="expandedAreaIds.has(area.id) ? t('common.buttons.close') : t('planning.annual.lifeAreas.expand')"
                @click="toggleAreaExpanded(area.id)"
              >
                <AppIcon
                  name="expand_more"
                  class="text-base text-on-surface-variant transition-transform"
                  :class="expandedAreaIds.has(area.id) ? 'rotate-180' : ''"
                />
              </button>
            </div>

            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="max-h-0 opacity-0"
              enter-to-class="max-h-[52rem] opacity-100"
              leave-from-class="max-h-[52rem] opacity-100"
              leave-to-class="max-h-0 opacity-0"
            >
              <div v-if="expandedAreaIds.has(area.id)" class="mt-3 grid gap-2 overflow-hidden">
                <textarea
                  :value="area.meaning ?? ''"
                  rows="2"
                  class="neo-input min-h-[4.5rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
                  :placeholder="t('planning.annual.lifeAreas.meaning')"
                  @change="handleLifeAreaText(area.id, 'meaning', $event)"
                />
                <textarea
                  :value="area.desiredState ?? ''"
                  rows="2"
                  class="neo-input min-h-[4.5rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
                  :placeholder="t('planning.annual.lifeAreas.desiredState')"
                  @change="handleLifeAreaText(area.id, 'desiredState', $event)"
                />
                <textarea
                  :value="area.typicalRisks ?? ''"
                  rows="2"
                  class="neo-input min-h-[4.5rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
                  :placeholder="t('planning.annual.lifeAreas.typicalRisks')"
                  @change="handleLifeAreaText(area.id, 'typicalRisks', $event)"
                />
                <textarea
                  :value="area.reflectionSignals.join('\n')"
                  rows="3"
                  class="neo-input min-h-[5.5rem] w-full resize-y px-3 py-2 text-xs leading-relaxed"
                  :placeholder="t('planning.annual.lifeAreas.reflectionSignals')"
                  @change="handleLifeAreaText(area.id, 'reflectionSignals', $event)"
                />
              </div>
            </Transition>
          </article>
        </div>
      </div>

      <div v-else-if="currentStep === 'narrative'" key="narrative" class="grid gap-3 md:grid-cols-2">
        <NarrativeField
          v-model="narrativeTheme"
          icon="flag"
          :label="t('planning.annual.narrative.theme')"
          :placeholder="t('planning.annual.narrative.themePlaceholder')"
        />
        <NarrativeField
          v-model="narrativeStory"
          icon="auto_stories"
          :label="t('planning.annual.narrative.story')"
          :placeholder="t('planning.annual.narrative.storyPlaceholder')"
        />
        <NarrativeField
          v-model="narrativeFantasticDay"
          icon="wb_sunny"
          :label="t('planning.annual.narrative.fantasticDay')"
          :placeholder="t('planning.annual.narrative.fantasticDayPlaceholder')"
        />
        <NarrativeField
          v-model="narrativeBestHopes"
          icon="north_star"
          :label="t('planning.annual.narrative.bestHopes')"
          :placeholder="t('planning.annual.narrative.bestHopesPlaceholder')"
        />
      </div>

      <div v-else-if="currentStep === 'priorities'" key="priorities" class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="neo-inset rounded-2xl px-4 py-3">
            <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              {{ t('planning.annual.priorities.counter') }}
            </div>
            <div class="mt-1 text-lg font-semibold text-on-surface">
              {{ activePriorityCount }}/{{ maxActivePriorities }}
            </div>
          </div>
          <AppButton
            variant="filled"
            :disabled="!canCreatePriority"
            @click="void createPriority(t('planning.annual.priorities.defaultTitle'))"
          >
            <AppIcon name="add" class="text-base" />
            {{ t('planning.annual.priorities.add') }}
          </AppButton>
        </div>

        <PlanningStatePanel
          v-if="activePriorities.length === 0"
          compact
          :title="t('planning.annual.priorities.emptyTitle')"
          :body="t('planning.annual.priorities.emptyBody')"
          :eyebrow="t('planning.annual.priorities.title')"
          :action-label="t('planning.annual.priorities.add')"
          @action="void createPriority(t('planning.annual.priorities.defaultTitle'))"
        />

        <div v-else class="grid gap-3 xl:grid-cols-2">
          <AnnualPlanningPriorityCard
            v-for="priority in activePriorities"
            :key="priority.id"
            :priority="priority"
            :status-options="priorityStatusOptions"
            :life-area-options="lifeAreaOptions"
            :icon-aria-label="t('planning.annual.priorities.icon')"
            :title-placeholder="t('planning.objects.form.priorityTitlePlaceholder')"
            :life-areas-label="t('planning.objects.form.lifeAreas')"
            :life-areas-empty-label="t('planning.objects.filters.noOptions')"
            :life-areas-clear-label="t('planning.objects.filters.clear')"
            :life-areas-add-label="t('common.buttons.add')"
            :years-label="t('planning.objects.form.years')"
            :why-now-placeholder="t('planning.objects.form.whyNow')"
            :desired-direction-placeholder="t('planning.objects.form.desiredDirection')"
            :tradeoffs-placeholder="t('planning.objects.form.tradeoffs')"
            :progress-signals-placeholder="t('planning.objects.form.progressSignals')"
            :risk-signals-placeholder="t('planning.objects.form.riskSignals')"
            @field-change="(field, value) => void updatePriorityField(priority.id, field, value)"
          />
        </div>
      </div>

      <div v-else-if="currentStep === 'execution'" key="execution" class="space-y-4">
        <PlaceholderPanel
          icon="account_tree"
          :title="t('planning.annual.execution.title')"
          :body="t('planning.annual.execution.body')"
        />
        <label class="block space-y-2">
          <span class="text-xs font-semibold text-on-surface">{{ t('planning.annual.execution.note') }}</span>
          <textarea
            v-model="executionPlaceholderNote"
            rows="5"
            class="neo-input min-h-[9rem] w-full resize-y px-4 py-3 text-sm leading-relaxed"
            :placeholder="t('planning.annual.execution.placeholder')"
          />
        </label>
      </div>

      <div v-else key="summary" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div class="neo-inset rounded-[1.5rem] px-4 py-4">
            <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              {{ t('planning.annual.summary.status') }}
            </div>
            <div class="mt-2 text-lg font-semibold text-on-surface">
              {{ annualPlan?.status === 'completed' ? t('planning.annual.summary.completed') : t('planning.annual.summary.draft') }}
            </div>
          </div>
          <div class="neo-inset rounded-[1.5rem] px-4 py-4">
            <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              {{ t('planning.annual.summary.lifeAreas') }}
            </div>
            <div class="mt-2 text-lg font-semibold text-on-surface">{{ lifeAreas.length }}</div>
          </div>
          <div class="neo-inset rounded-[1.5rem] px-4 py-4">
            <div class="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
              {{ t('planning.annual.summary.priorities') }}
            </div>
            <div class="mt-2 text-lg font-semibold text-on-surface">
              {{ activePriorityCount }}/{{ maxActivePriorities }}
            </div>
          </div>
        </div>
        <div class="neo-inset rounded-[1.75rem] p-5 text-sm leading-relaxed text-on-surface-variant">
          {{ t('planning.annual.summary.body') }}
        </div>
      </div>
    </Transition>

    <div v-if="!isLoading && !loadError" class="flex items-center justify-between pt-2">
      <AppButton
        v-if="stepIndex > 0"
        variant="tonal"
        :aria-label="t('common.buttons.back')"
        @click="prevStep()"
      >
        <AppIcon name="arrow_back" class="text-lg" />
      </AppButton>
      <div v-else />

      <AppButton
        v-if="currentStep === 'summary'"
        variant="filled"
        :disabled="isSaving"
        @click="handleComplete"
      >
        {{ isSaving ? t('common.saving') : t('planning.annual.finish') }}
      </AppButton>
      <AppButton
        v-else
        variant="filled"
        :disabled="!canAdvance"
        :aria-label="t('common.buttons.next')"
        @click="nextStep()"
      >
        <AppIcon name="arrow_forward" class="text-lg" />
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, reactive, toRef } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import AnnualPlanningPriorityCard from '@/components/calendar/AnnualPlanningPriorityCard.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import { useAnnualPlanningWizard, type AnnualPlanningStep } from '@/composables/useAnnualPlanningWizard'
import { useT } from '@/composables/useT'
import type { YearRef } from '@/domain/period'

const props = defineProps<{
  yearRef: YearRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { t } = useT()

const STEPS: AnnualPlanningStep[] = [
  'brief',
  'life-areas',
  'narrative',
  'priorities',
  'execution',
  'summary',
]

const expandedAreaIds = reactive(new Set<string>())
const scoreOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  loadAll,
  annualPlan,
  isLoading,
  loadError,
  isSaving,
  annualBriefNote,
  narrativeTheme,
  narrativeStory,
  narrativeFantasticDay,
  narrativeBestHopes,
  executionPlaceholderNote,
  lifeAreas,
  assessmentItem,
  updateLifeAreaScore,
  updateLifeAreaField,
  activePriorities,
  activePriorityCount,
  canCreatePriority,
  createPriority,
  updatePriorityField,
  completePlan,
  maxActivePriorities,
} = useAnnualPlanningWizard(toRef(props, 'yearRef'))

const stepLabels = computed(() => [
  t('planning.annual.steps.brief'),
  t('planning.annual.steps.lifeAreas'),
  t('planning.annual.steps.narrative'),
  t('planning.annual.steps.priorities'),
  t('planning.annual.steps.execution'),
  t('planning.annual.steps.summary'),
])

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'brief': return t('planning.annual.stepsSubtitles.brief')
    case 'life-areas': return t('planning.annual.stepsSubtitles.lifeAreas')
    case 'narrative': return t('planning.annual.stepsSubtitles.narrative')
    case 'priorities': return t('planning.annual.stepsSubtitles.priorities')
    case 'execution': return t('planning.annual.stepsSubtitles.execution')
    case 'summary': return t('planning.annual.stepsSubtitles.summary')
    default: return ''
  }
})

const lifeAreaOptions = computed(() =>
  lifeAreas.value.map((area) => ({ id: area.id, label: area.name })),
)

const priorityStatusOptions = computed(() => [
  { value: 'active', label: t('planning.objects.status.active') },
  { value: 'paused', label: t('planning.objects.status.paused') },
])

function toggleAreaExpanded(id: string): void {
  if (expandedAreaIds.has(id)) expandedAreaIds.delete(id)
  else expandedAreaIds.add(id)
}

function handleLifeAreaText(
  lifeAreaId: string,
  field: 'meaning' | 'desiredState' | 'typicalRisks' | 'reflectionSignals',
  event: Event,
): void {
  void updateLifeAreaField(lifeAreaId, field, (event.target as HTMLTextAreaElement).value)
}

async function handleComplete(): Promise<void> {
  try {
    await completePlan()
    emit('updated')
    emit('close')
  } catch (error) {
    console.error('Failed to complete annual plan:', error)
  }
}

const PlaceholderPanel = defineComponent({
  props: {
    icon: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  setup(componentProps) {
    return () =>
      h('div', { class: 'neo-inset rounded-[1.75rem] p-5 md:p-6' }, [
        h('div', { class: 'flex items-start gap-4' }, [
          h('div', { class: 'neo-icon-button h-12 w-12 shrink-0 text-primary' }, [
            h(AppIcon, { name: componentProps.icon, class: 'text-2xl' }),
          ]),
          h('div', { class: 'min-w-0 space-y-1' }, [
            h('h3', { class: 'text-base font-semibold text-on-surface' }, componentProps.title),
            h('p', { class: 'text-sm leading-relaxed text-on-surface-variant' }, componentProps.body),
          ]),
        ]),
      ])
  },
})

const NarrativeField = defineComponent({
  props: {
    modelValue: { type: String, required: true },
    icon: { type: String, required: true },
    label: { type: String, required: true },
    placeholder: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(componentProps, { emit: componentEmit }) {
    return () =>
      h('label', { class: 'neo-inset block rounded-[1.5rem] p-4' }, [
        h('div', { class: 'mb-3 flex items-center gap-2 text-primary' }, [
          h(AppIcon, { name: componentProps.icon, class: 'text-xl' }),
          h('span', { class: 'text-sm font-semibold text-on-surface' }, componentProps.label),
        ]),
        h('textarea', {
          value: componentProps.modelValue,
          rows: 7,
          class: 'min-h-[11rem] w-full resize-y bg-transparent text-sm leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/45',
          placeholder: componentProps.placeholder,
          onInput: (event: Event) =>
            componentEmit('update:modelValue', (event.target as HTMLTextAreaElement).value),
        }),
      ])
  },
})
</script>
