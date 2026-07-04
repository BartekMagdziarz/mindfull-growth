<template>
  <section data-testid="monthly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <WizardHeader
      :title="t('planning.reflection.monthly.title')"
      :subtitle="stepSubtitle"
      :step-labels="stepLabels"
      :step-index="stepIndex"
      :locked-steps="lockedSteps"
      :progress-label="t('planning.reflection.monthly.progress')"
      @close="emit('close')"
      @go-to-step="goToStep(STEPS[$event])"
    />

    <!-- Step Content. Enter-only fade: an interruptible leave (out-in) could
         strand the incoming step at opacity-0 when autosave re-renders land
         mid-transition. -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
    >
      <!-- Step: Plan (pick the month's top priorities) -->
      <div v-if="currentStep === 'plan'" key="plan" class="space-y-4">
        <header class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary-strong">
            {{ t('planning.monthlyPlanning.priorities.eyebrow') }}
          </p>
          <h3 class="text-base font-bold text-on-surface">
            {{ t('planning.monthlyPlanning.priorities.title') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.monthlyPlanning.priorities.description') }}
          </p>
        </header>

        <p v-if="activePriorities.length === 0" class="text-sm text-on-surface-variant">
          {{ t('planning.monthlyPlanning.priorities.empty') }}
        </p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li v-for="priority in activePriorities" :key="priority.id">
            <button
              type="button"
              class="neo-card neo-raised flex w-full items-center gap-2 border p-3 text-left text-sm transition"
              :class="selectedPriorityIds.includes(priority.id)
                ? 'border-primary/50 bg-primary/5 font-semibold text-primary-strong'
                : 'border-neu-border/30 text-on-surface'"
              @click="toggleTopPriority(priority.id)"
            >
              <AppIcon
                :name="selectedPriorityIds.includes(priority.id) ? 'check_circle' : 'radio_button_unchecked'"
                class="text-lg"
              />
              <span class="min-w-0 flex-1 truncate">{{ priority.title }}</span>
              <AppIcon
                v-if="selectedPriorityIds.includes(priority.id)"
                name="star"
                class="text-sm text-primary-strong"
              />
            </button>
          </li>
        </ul>

        <p
          v-if="selectedPriorityIds.length > MONTH_TOP_PRIORITY_SOFT_LIMIT"
          class="text-xs font-medium text-amber-600"
        >
          {{ t('planning.monthlyPlanning.priorities.softLimitWarning', { n: MONTH_TOP_PRIORITY_SOFT_LIMIT }) }}
        </p>
      </div>

      <!-- Step: Weeks (activate objects and assign them to the month's weeks) -->
      <div v-else-if="currentStep === 'weeks'" key="weeks" class="space-y-4">
        <header class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-wide text-primary-strong">
            {{ t('planning.monthlyPlanning.weeks.eyebrow') }}
          </p>
          <h3 class="text-base font-bold text-on-surface">
            {{ t('planning.monthlyPlanning.weeks.title') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.monthlyPlanning.weeks.description') }}
          </p>
        </header>

        <MonthlyPlanner
          :month-ref="monthRef"
          show-sidebar
          @updated="emit('updated')"
        />
      </div>

      <!-- Step: Priorities review (effort + verdict per active priority) -->
      <div v-else-if="currentStep === 'priorities-review'" key="priorities-review" class="space-y-4">
        <header class="space-y-1">
          <h3 class="text-base font-bold text-on-surface">
            {{ t('planning.reflection.monthly.prioritiesReview.title') }}
          </h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.reflection.monthly.prioritiesReview.description') }}
          </p>
        </header>

        <p v-if="activePriorities.length === 0" class="text-sm text-on-surface-variant">
          {{ t('planning.reflection.monthly.prioritiesReview.empty') }}
        </p>
        <div
          v-else
          class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div
            v-for="priority in activePriorities"
            :key="priority.id"
            class="neo-card neo-raised flex min-w-0 flex-col gap-2.5 border border-neu-border/30 p-3"
          >
            <!-- header -->
            <div class="flex items-center gap-1">
              <AppIcon
                v-if="selectedPriorityIds.includes(priority.id)"
                name="star"
                class="text-xs text-primary-strong"
              />
              <span
                class="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface"
                :title="priority.title"
              >
                {{ priority.title }}
              </span>
            </div>

            <!-- effort 1–5 -->
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.reflection.monthly.prioritiesReview.effortLabel') }}
              </span>
              <div class="mt-1 flex gap-1">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="h-6 flex-1 rounded text-xs font-semibold transition"
                  :class="assessmentFor(priority.id).effort === n
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface text-on-surface-variant hover:bg-primary/10'"
                  @click="setEffort(priority.id, n)"
                >
                  {{ n }}
                </button>
              </div>
            </div>

            <!-- verdict (compact select) -->
            <div>
              <span class="block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('planning.reflection.monthly.prioritiesReview.verdictLabel') }}
              </span>
              <select
                class="mt-1 w-full rounded-lg bg-surface px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40"
                :value="assessmentFor(priority.id).verdict ?? ''"
                @change="onVerdictChange(priority.id, $event)"
              >
                <option value="">—</option>
                <option v-for="v in VERDICTS" :key="v" :value="v">{{ verdictLabel(v) }}</option>
              </select>
            </div>

            <!-- reason -->
            <textarea
              :value="assessmentFor(priority.id).note"
              rows="2"
              class="w-full resize-none rounded-lg bg-surface px-2 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
              :placeholder="t('planning.reflection.monthly.prioritiesReview.reasonPlaceholder')"
              @input="setNote(priority.id, ($event.target as HTMLTextAreaElement).value)"
            />

            <!-- M4: weekly focus rolled up to this priority -->
            <div class="mt-0.5 border-t border-outline/15 pt-2">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  {{ t('planning.reflection.monthly.prioritiesReview.focusLabel') }}
                </span>
                <span class="flex items-center gap-0.5">
                  <span
                    v-for="i in weeksInMonth"
                    :key="i"
                    class="h-1.5 w-1.5 rounded-full"
                    :class="i <= focusCount(priority.id) ? 'bg-primary' : 'bg-on-surface-variant/25'"
                  />
                </span>
                <span class="text-[10px] font-semibold tabular-nums text-on-surface-variant">
                  {{ focusCount(priority.id) }}/{{ weeksInMonth }}
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-[11px] leading-snug text-on-surface-variant">
                <template v-if="focusObjects(priority.id).length">
                  {{ focusObjects(priority.id).join(', ') }}
                </template>
                <template v-else>—</template>
              </p>
            </div>
          </div>
        </div>

        <!-- M4: drift — weekly picks that didn't land on any active month priority -->
        <div v-if="driftPicks.length" class="rounded-xl bg-section/40 p-3">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('planning.reflection.monthly.prioritiesReview.driftTitle') }}
          </span>
          <ul class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            <li
              v-for="d in driftPicks"
              :key="d.subjectType + ':' + d.subjectId"
              class="flex items-center gap-1 text-xs text-on-surface-variant"
            >
              <span class="truncate">{{ d.title }}</span>
              <span
                v-if="d.subjectType === 'weeklyIntention'"
                class="text-[10px] text-on-surface-variant/70"
              >
                ({{ t('planning.reflection.monthly.prioritiesReview.intentionTag') }})
              </span>
              <span class="text-[10px] tabular-nums text-on-surface-variant/60">{{ d.weekRefs.length }}×</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Step: Ratings -->
      <div v-else-if="currentStep === 'ratings'" key="ratings" class="space-y-4">
        <ReflectionDimensionRatings
          :groups="monthlyGroups"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Anchors (optional) -->
      <div v-else-if="currentStep === 'anchors'" key="anchors" class="space-y-3">
        <p class="text-xs text-on-surface-variant">
          {{ t('planning.reflection.monthly.anchorsOptionalHint') }}
        </p>
        <ReflectionAnchorsGrid
          :categories="monthlyAnchorCategories"
          :model-value="promptResponses"
          @update:model-value="promptResponses = $event"
        />
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal">
        <ReflectionJournalSidebar
          :model-value="freeformReflection"
          :placeholder="t('planning.reflection.monthly.journalPlaceholder')"
          :anchors="promptResponses"
          :anchor-categories="monthlyAnchorCategories"
          :rating-groups="monthlyRatingSummary"
          :ai-summary="aiSummary"
          :summary-context="summaryContext"
          @update:model-value="freeformReflection = $event"
          @update:ai-summary="aiSummary = $event"
        />
      </div>
    </Transition>

    <!-- Navigation Footer -->
    <WizardFooter :show-back="stepIndex > 0" @back="prevStep()">
      <AppButton
        v-if="currentStep === 'journal'"
        variant="filled"
        :disabled="isSaving"
        @click="handleSave"
      >
        {{ isSaving ? t('planning.reflection.saving') : t('planning.reflection.save') }}
      </AppButton>
      <AppButton
        v-else-if="isLastStep"
        variant="filled"
        @click="emit('close')"
      >
        {{ t('planning.monthlyPlanning.finishPlanning') }}
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
    </WizardFooter>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import MonthlyPlanner from './MonthlyPlanner.vue'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import ReflectionAnchorsGrid from './ReflectionAnchorsGrid.vue'
import ReflectionJournalSidebar from './ReflectionJournalSidebar.vue'
import WizardHeader from './WizardHeader.vue'
import WizardFooter from './WizardFooter.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
import type { SidebarRatingGroup } from './ReflectionJournalSidebar.vue'
import {
  useMonthlyReflectionWizard,
  MONTH_TOP_PRIORITY_SOFT_LIMIT,
  type MonthlyReflectionStep,
} from '@/composables/useMonthlyReflectionWizard'
import { useT } from '@/composables/useT'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { PriorityVerdict } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { getPeriodBounds } from '@/utils/periods'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'

const { t } = useT()

const props = defineProps<{
  monthRef: MonthRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const STEPS: MonthlyReflectionStep[] = ['plan', 'weeks', 'priorities-review', 'ratings', 'anchors', 'journal']

const stepLabels = computed(() => [
  t('planning.reflection.steps.plan'),
  t('planning.reflection.steps.weeks'),
  t('planning.reflection.steps.prioritiesReview'),
  t('planning.reflection.steps.ratings'),
  t('planning.reflection.steps.anchors'),
  t('planning.reflection.steps.journal'),
])

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'plan': return t('planning.monthlyPlanning.priorities.subtitle')
    case 'weeks': return t('planning.monthlyPlanning.weeks.subtitle')
    case 'priorities-review': return t('planning.reflection.monthly.prioritiesReview.subtitle')
    case 'ratings': return t('planning.reflection.monthly.groups.ratings.subtitle')
    default: return ''
  }
})

const lockedSteps = computed(() => STEPS.map((step) => isStepLocked(step)))

// Slimmed to 3 anchors (was 6) — mirrors the weekly slim; the month review summary card
// still renders any historical 6-anchor reflections (it filters empty categories).
const monthlyAnchorCategories = computed(() => [
  { key: 'proudOf', label: t('planning.reflection.monthly.anchors.proudOf'), icon: 'emoji_events' },
  { key: 'challenges', label: t('planning.reflection.monthly.anchors.challenges'), icon: 'warning' },
  { key: 'growth', label: t('planning.reflection.monthly.anchors.growth'), icon: 'trending_up' },
])

const VERDICTS: PriorityVerdict[] = ['continue', 'adjust', 'pause', 'drop']

function verdictLabel(v: PriorityVerdict): string {
  return t(`planning.reflection.monthly.verdicts.${v}`)
}

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  isStepLocked,
  isLastStep,
  dataBundle,
  activePriorities,
  selectedPriorityIds,
  toggleTopPriority,
  assessmentFor,
  updateAssessment,
  focusConfrontation,
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

// The weeks step is the month's assignment workspace (formerly the standalone
// "create/edit plan" affordance) — entering it guarantees the MonthPlan record
// that backs the plan-vs-execution summary. `immediate` covers drafts restored
// straight onto this step.
watch(
  currentStep,
  async (step) => {
    if (step !== 'weeks') return
    const existing = await periodPlanDexieRepository.getMonthPlan(props.monthRef)
    if (!existing) {
      await periodPlanDexieRepository.createMonthPlan({ monthRef: props.monthRef })
      emit('updated')
    }
  },
  { immediate: true },
)

// Toggling effort/verdict on a value that's already selected clears it.
function setEffort(priorityId: string, n: number) {
  updateAssessment(priorityId, { effort: assessmentFor(priorityId).effort === n ? null : n })
}

function onVerdictChange(priorityId: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value
  updateAssessment(priorityId, { verdict: (value || null) as PriorityVerdict | null })
}

function setNote(priorityId: string, note: string) {
  updateAssessment(priorityId, { note })
}

// M4 — weekly focus rolled up by priority (read-only).
const focusByPriority = computed(
  () => new Map((focusConfrontation.value?.perPriority ?? []).map((p) => [p.priorityId, p])),
)
const weeksInMonth = computed(() => focusConfrontation.value?.weekRefs.length ?? 0)
const driftPicks = computed(() => focusConfrontation.value?.drift ?? [])
function focusCount(priorityId: string): number {
  return focusByPriority.value.get(priorityId)?.focusWeekRefs.length ?? 0
}
function focusObjects(priorityId: string): string[] {
  return (focusByPriority.value.get(priorityId)?.objects ?? []).map((o) => o.title)
}

// ---------------------------------------------------------------------------
// Week label helpers
// ---------------------------------------------------------------------------

function formatWeekLabel(weekRef: WeekRef): string {
  const bounds = getPeriodBounds(weekRef)
  const startDay = bounds.start.slice(8, 10).replace(/^0/, '')
  const endDay = bounds.end.slice(8, 10).replace(/^0/, '')
  const startMonth = parseInt(bounds.start.slice(5, 7), 10)
  const endMonth = parseInt(bounds.end.slice(5, 7), 10)
  const months = ['', 'sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${months[startMonth]}`
  }
  return `${startDay} ${months[startMonth]}–${endDay} ${months[endMonth]}`
}

// Icon sets for monthly dimensions
const ICONS = {
  balance: ['landslide', 'falling', 'tune', 'balance', 'all_inclusive'] as [string, string, string, string, string],
  purpose: ['search', 'question_mark', 'lightbulb', 'auto_awesome', 'moon_stars'] as [string, string, string, string, string],
  growth: ['park', 'potted_plant', 'forest', 'nature', 'landscape'] as [string, string, string, string, string],
  coherence: ['call_split', 'conversion_path', 'timeline', 'adjust', 'gps_fixed'] as [string, string, string, string, string],
  agency: ['anchor', 'explore', 'navigation', 'sailing', 'flight'] as [string, string, string, string, string],
}

const monthlyGroups = computed<RatingGroup[]>(() => [
  {
    title: t('planning.reflection.monthly.groups.ratings.title'),
    dimensions: [
      {
        key: 'balance',
        label: t('planning.reflection.monthly.dimensions.balance'),
        value: balanceRating.value,
        icons: ICONS.balance,
        lowLabel: t('planning.reflection.monthly.scaleLabels.balance.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.balance.high'),
      },
      {
        key: 'purpose',
        label: t('planning.reflection.monthly.dimensions.purpose'),
        value: purposeRating.value,
        icons: ICONS.purpose,
        lowLabel: t('planning.reflection.monthly.scaleLabels.purpose.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.purpose.high'),
      },
      {
        key: 'growth',
        label: t('planning.reflection.monthly.dimensions.growth'),
        value: growthRating.value,
        icons: ICONS.growth,
        lowLabel: t('planning.reflection.monthly.scaleLabels.growth.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.growth.high'),
      },
      {
        key: 'coherence',
        label: t('planning.reflection.monthly.dimensions.coherence'),
        value: coherenceRating.value,
        icons: ICONS.coherence,
        lowLabel: t('planning.reflection.monthly.scaleLabels.coherence.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.coherence.high'),
      },
      {
        key: 'agency',
        label: t('planning.reflection.monthly.dimensions.agency'),
        value: agencyRating.value,
        icons: ICONS.agency,
        lowLabel: t('planning.reflection.monthly.scaleLabels.agency.low'),
        highLabel: t('planning.reflection.monthly.scaleLabels.agency.high'),
      },
    ],
  },
])

function handleRatingUpdate(key: string, value: number) {
  switch (key) {
    case 'balance': balanceRating.value = value; break
    case 'purpose': purposeRating.value = value; break
    case 'growth': growthRating.value = value; break
    case 'coherence': coherenceRating.value = value; break
    case 'agency': agencyRating.value = value; break
  }
}

const monthlyRatingSummary = computed<SidebarRatingGroup[]>(() => [
  {
    title: t('planning.reflection.monthly.groups.ratings.title'),
    items: [
      { label: t('planning.reflection.monthly.dimensions.balance'), value: balanceRating.value },
      { label: t('planning.reflection.monthly.dimensions.purpose'), value: purposeRating.value },
      { label: t('planning.reflection.monthly.dimensions.growth'), value: growthRating.value },
      { label: t('planning.reflection.monthly.dimensions.coherence'), value: coherenceRating.value },
      { label: t('planning.reflection.monthly.dimensions.agency'), value: agencyRating.value },
    ],
  },
])

const summaryPeriodLabel = computed(() => {
  const parts = props.monthRef.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(y) || !Number.isFinite(m)) return props.monthRef
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
})

// Active priorities that are top-3 OR carry an assessment → fed to the AI as [PRIORYTETY].
const summaryPriorities = computed<ReflectionPriorityLine[]>(() =>
  activePriorities.value
    .filter((p) => {
      const a = assessmentFor(p.id)
      return selectedPriorityIds.value.includes(p.id) || a.effort != null || a.verdict != null || a.note.trim().length > 0
    })
    .map((p) => {
      const a = assessmentFor(p.id)
      return { title: p.title, effort: a.effort, verdict: a.verdict, comment: a.note.trim() || undefined }
    }),
)

// Localized, kind-agnostic payload the AI summary/questions are built from.
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'monthly',
    periodLabel: summaryPeriodLabel.value,
    ratings: monthlyRatingSummary.value.flatMap((g) => g.items),
    priorities: summaryPriorities.value,
    anchors: monthlyAnchorCategories.value
      .map((c) => ({ label: c.label, text: (promptResponses.value[c.key] ?? '').trim() }))
      .filter((a) => a.text.length > 0),
    freeform: freeformReflection.value,
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    weeklyTrends: (bundle?.weeklyRatingTrends ?? []).map((tr) => ({
      weekLabel: formatWeekLabel(tr.weekRef),
      mood: tr.moodRating,
      energy: tr.energyRating,
      calm: tr.calmRating,
      connection: tr.connectionRating,
    })),
    weeklyExcerpts: (bundle?.weeklyReflectionDetails ?? [])
      .map((d) => ({ weekLabel: formatWeekLabel(d.weekRef), text: d.freeformReflection }))
      .filter((w) => w.text.trim().length > 0),
    goals: (bundle?.goalSummaries ?? []).map((g) => ({
      title: g.goal.title,
      metKRs: g.keyResults.filter((k) => k.evaluationStatus === 'met').length,
      totalKRs: g.keyResults.length,
    })),
    habits: (bundle?.habitDetails ?? []).map((h) => ({
      title: h.title,
      status: h.evaluationStatus,
    })),
    trackers: (bundle?.trackerDetails ?? []).map((tr) => ({
      title: tr.title,
      latest: tr.latestValue ?? null,
    })),
  }
})

async function handleSave() {
  try {
    await save()
    emit('updated')
    emit('close')
  } catch (err) {
    console.error('Failed to save monthly reflection:', err)
  }
}
</script>
