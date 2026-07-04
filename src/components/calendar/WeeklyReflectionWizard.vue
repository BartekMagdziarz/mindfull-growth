<template>
  <section data-testid="weekly-reflection-wizard" class="neo-card space-y-8 px-4 py-4 md:px-5">
    <!-- Header with step indicator -->
    <WizardHeader
      :title="t('planning.weekWizard.title')"
      :subtitle="stepSubtitle"
      :step-labels="stepLabels"
      :step-index="stepIndex"
      :locked-steps="lockedSteps"
      :progress-label="t('planning.reflection.weekly.progress')"
      @close="emit('close')"
      @go-to-step="goToStep(STEP_ORDER[$event])"
    />

    <!-- Step Content. Enter-only fade: an interruptible leave (out-in) could
         strand the incoming step at opacity-0 when autosave re-renders land
         mid-transition. -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
    >
      <!-- Step: Plan (intentions + top-3, combined) -->
      <div v-if="currentStep === 'plan'" key="plan" class="space-y-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-sm text-on-surface-variant">
            {{ t('planning.weekWizard.prioritiesIntro') }}
          </p>
          <div class="flex shrink-0 items-baseline gap-2">
            <span
              v-if="isSavingPlan || hasSavedPlan"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant/80"
              :aria-live="'polite'"
            >
              <AppIcon
                :name="isSavingPlan ? 'sync' : 'cloud_done'"
                class="text-sm"
                :class="isSavingPlan ? 'animate-spin' : 'text-primary'"
              />
              {{ isSavingPlan ? t('planning.weekPlanning.priorities.saving') : t('planning.weekPlanning.priorities.saved') }}
            </span>
            <span
              v-if="candidates.length > 0"
              class="text-xs font-semibold"
              :class="selectedKeys.length > SOFT_LIMIT ? 'text-amber-600' : 'text-on-surface-variant'"
            >
              {{ t('planning.weekPlanning.priorities.counter', { n: selectedKeys.length, max: SOFT_LIMIT }) }}
            </span>
          </div>
        </div>

        <div v-if="candidates.length > 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <WeekPlanObjectCard
            v-for="candidate in candidates"
            :key="candidate.key"
            :candidate="candidate"
            :selected="selectedKeys.includes(candidate.key)"
            :priorities="activePriorities"
            @toggle="toggleCandidate(candidate.key)"
            @save="(payload) => onSaveIntention(candidate, payload)"
            @delete="onDeleteIntention(candidate)"
          />
        </div>
        <p v-else class="text-xs text-on-surface-variant">
          {{ t('planning.weekPlanning.priorities.empty') }}
        </p>

        <p v-if="selectedKeys.length > SOFT_LIMIT" class="text-xs font-medium text-amber-600">
          {{ t('planning.weekPlanning.priorities.softLimitWarning', { n: SOFT_LIMIT }) }}
        </p>

        <!-- Inline composer to add a new intention; new intentions join the grid above. -->
        <div class="neo-card neo-raised border border-neu-border/30 p-3.5">
          <IntentionComposer
            :week-ref="props.weekRef"
            :priorities="activePriorities"
            @created="onIntentionCreated"
          />
        </div>

        <p v-if="!reflectionUnlocked" class="text-xs text-on-surface-variant">
          {{ t('planning.weekWizard.reflectionLockedHint') }}
        </p>
      </div>

      <!-- Step: Days (assign objects to specific days, stream-style) -->
      <div v-else-if="currentStep === 'days'" key="days">
        <WeekDayAssignmentStep :week-ref="props.weekRef" @updated="emit('updated')" />
      </div>

      <!-- Step: Review (confrontation + per-object comments) -->
      <div v-else-if="currentStep === 'review'" key="review" class="space-y-3">
        <p class="text-sm text-on-surface-variant">
          {{ t('planning.reflection.review.intro') }}
        </p>
        <ReflectionObjectReview
          v-if="dataBundle"
          v-model:comments="objectComments"
          :items="dataBundle.weekObjectItems"
          :raw-entries="dataBundle.rawEntries"
          :all-day-assignments="dataBundle.allDayAssignments"
          :week-ref="props.weekRef"
          :today-day-ref="reviewTodayDayRef"
          :top-priority-keys="topPriorityKeys"
        />
        <p v-else class="text-sm text-on-surface-variant">
          {{ t('common.loading') }}
        </p>
      </div>

      <!-- Steps: matrix area ratings — one life area per step, questions in
           causal order: demand → action → state -->
      <div v-else-if="currentArea" :key="currentArea.key" class="space-y-5">
        <div class="flex items-center justify-center gap-2">
          <AppIcon :name="currentArea.icon" class="text-xl text-primary-strong" />
          <h3 class="text-base font-semibold text-on-surface">
            {{ t(areaTitleKey(currentArea.key)) }}
          </h3>
        </div>
        <ReflectionDimensionRatings
          :groups="areaGroups"
          @update:rating="handleRatingUpdate"
        />
      </div>

      <!-- Step: Anchors -->
      <div v-else-if="currentStep === 'anchors'" key="anchors">
        <ReflectionAnchorsGrid
          :categories="weeklyAnchorCategories"
          :model-value="promptResponses"
          @update:model-value="promptResponses = $event"
        />
      </div>

      <!-- Step: Journal -->
      <div v-else-if="currentStep === 'journal'" key="journal">
        <ReflectionJournalSidebar
          :model-value="freeformReflection"
          :placeholder="t('planning.reflection.weekly.journalPlaceholder')"
          :anchors="promptResponses"
          :anchor-categories="weeklyAnchorCategories"
          :rating-groups="weeklyRatingSummary"
          :data-bundle="dataBundle"
          :week-ref="props.weekRef"
          :ai-summary="aiSummary"
          :summary-context="summaryContext"
          @update:model-value="freeformReflection = $event"
          @update:ai-summary="aiSummary = $event"
        />
      </div>
    </Transition>

    <!-- Navigation Footer -->
    <WizardFooter :show-back="stepIndex > 0" @back="prevStep()">
      <!-- Last reflection step: save + jump to planning next week. -->
      <template v-if="currentStep === 'journal'">
        <AppButton variant="text" :disabled="isSaving" @click="handleSaveAndPlanNext">
          {{ t('planning.weekWizard.planNextWeek') }}
        </AppButton>
        <AppButton variant="filled" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? t('planning.reflection.saving') : t('planning.reflection.save') }}
        </AppButton>
      </template>
      <!-- Last reachable step while reflection is still locked: planning is saved live, just close. -->
      <AppButton
        v-else-if="isLastStep"
        variant="filled"
        @click="emit('close')"
      >
        {{ t('planning.weekWizard.done') }}
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
import { computed, onMounted, ref, toRef, watch } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import IntentionComposer from './IntentionComposer.vue'
import WeekPlanObjectCard from './WeekPlanObjectCard.vue'
import WeekDayAssignmentStep from './WeekDayAssignmentStep.vue'
import WizardHeader from './WizardHeader.vue'
import WizardFooter from './WizardFooter.vue'
import type { WeekPlanCandidate, WeekPlanPriorityOption } from './weekPlanCandidate'
import ReflectionDimensionRatings from './ReflectionDimensionRatings.vue'
import ReflectionAnchorsGrid from './ReflectionAnchorsGrid.vue'
import ReflectionJournalSidebar from './ReflectionJournalSidebar.vue'
import ReflectionObjectReview from './ReflectionObjectReview.vue'
import type { RatingGroup } from './ReflectionDimensionRatings.vue'
import type { SidebarRatingGroup } from './ReflectionJournalSidebar.vue'
import type { MeasurementEntryMode, MeasurementTarget } from '@/domain/planning'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { getWeekPlanningBundle } from '@/services/planningStateQueries'
import { isMeasurementSubjectOpen } from '@/services/planningVisibility'
import { getActivePrioritiesForMonth } from '@/services/monthlyPriorityService'
import {
  deleteWeeklyIntention,
  setWeekTopPriorities,
  updateWeeklyIntention,
} from '@/services/weeklyIntentionService'
import {
  STEP_ORDER,
  useWeeklyReflectionWizard,
  type WeeklyReflectionStep,
} from '@/composables/useWeeklyReflectionWizard'
import type { WeeklyRatingKey } from '@/domain/reflection'
import {
  MATRIX_CELL_ICONS,
  MATRIX_SECTIONS,
  REFLECTION_MATRIX_AREAS,
  areaTitleKey,
  cellAnchorKey,
  cellQuestionKey,
  sectionTitleKey,
} from '@/domain/reflectionMatrix'
import { useSerializedSave } from '@/composables/useSerializedSave'
import { useT } from '@/composables/useT'
import type { DayRef, WeekRef } from '@/domain/period'
import { getParentPeriod, getPeriodBounds } from '@/utils/periods'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'

const { t, tg } = useT()

const props = defineProps<{
  weekRef: WeekRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
  'plan-next-week': []
}>()

// Unified week ritual: step order comes from the composable (planning steps first,
// then the date-gated reflection steps — one rating step per matrix life area).
function stepLabel(step: WeeklyReflectionStep): string {
  switch (step) {
    case 'plan':
      return t('planning.weekWizard.steps.plan')
    case 'days':
      return t('planning.weekWizard.steps.days')
    case 'review':
      return t('planning.reflection.steps.review')
    case 'anchors':
      return t('planning.reflection.steps.anchors')
    case 'journal':
      return t('planning.reflection.steps.journal')
    default:
      // Area steps: the pip label is the area name itself.
      return t(areaTitleKey(step))
  }
}

const stepLabels = computed(() => STEP_ORDER.map(stepLabel))

const lockedSteps = computed(() => STEP_ORDER.map((step) => isStepLocked(step)))

const stepSubtitle = computed(() => {
  switch (currentStep.value) {
    case 'plan':
      return t('planning.weekWizard.stepSubtitles.plan')
    case 'days':
      return t('planning.weekWizard.stepSubtitles.days')
    case 'review':
      return t('planning.weekWizard.stepSubtitles.review')
    case 'anchors':
      return ''
    case 'journal':
      return t('planning.weekWizard.stepSubtitles.journal')
    default:
      // Area rating steps share the causal-chain subtitle.
      return t('planning.weekWizard.stepSubtitles.area')
  }
})

// Slimmed to a 3-anchor core (D2): wins / hard parts / synthesis. The forward-looking
// anchors (improvements, lookingAhead) moved to the planning side (week intention + top-3),
// and gratitude was dropped from the default set. Object-level recap now lives in the
// review step's per-object comments.
const weeklyAnchorCategories = computed(() => [
  { key: 'wentWell', label: t('planning.reflection.weekly.anchors.wentWell'), icon: 'thumb_up' },
  { key: 'challenges', label: t('planning.reflection.weekly.anchors.challenges'), icon: 'warning' },
  { key: 'lessons', label: t('planning.reflection.weekly.anchors.lessons'), icon: 'lightbulb' },
])

const {
  currentStep,
  stepIndex,
  canAdvance,
  nextStep,
  prevStep,
  goToStep,
  reflectionUnlocked,
  isStepLocked,
  isLastStep,
  dataBundle,
  objectComments,
  topPriorityKeys,
  ratingRefsByKey,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
} = useWeeklyReflectionWizard(toRef(props, 'weekRef'))

// Charts in the review step mark "today" at the week's end (the reflection's as-of day).
const reviewTodayDayRef = computed(() => getPeriodBounds(props.weekRef).end as DayRef)

// --- Planning step (intentions + top-3, combined) ------------------------------------
// Planning persists live: intentions via IntentionComposer (creates on submit), top-3 via
// setWeekTopPriorities on every toggle. The wizard's explicit Save is purely for reflection.
const candidates = ref<WeekPlanCandidate[]>([])
const selectedKeys = ref<string[]>([])
// The month's active priorities, offered as optional links when creating/editing an
// intention (M5) so it maps in the monthly focus confrontation instead of drifting.
// A boundary week is attributed to the month holding its start (getParentPeriod).
const activePriorities = ref<WeekPlanPriorityOption[]>([])

function typeLabelFor(subjectType: MeasurementSubjectType): string {
  return t(`planning.weekPlanning.subjectType.${subjectType}`)
}

async function loadActivePriorities(): Promise<void> {
  const monthRef = getParentPeriod(props.weekRef)
  const priorities = await getActivePrioritiesForMonth(monthRef)
  activePriorities.value = priorities.map((priority) => ({ id: priority.id, title: priority.title }))
}

async function loadCandidates(): Promise<void> {
  // Kept on getWeekPlanningBundle (which includes weeklyIntentions) rather than
  // buildWeekObjectItems, which drops them. Goals enrich KR cards with their parent.
  const [bundle, goals] = await Promise.all([
    getWeekPlanningBundle(props.weekRef),
    goalDexieRepository.listAll(),
  ])
  const goalMap = new Map(goals.map((goal) => [goal.id, goal]))
  const seen = new Set<string>()
  const list: WeekPlanCandidate[] = []
  for (const item of bundle.relevant.measurementItems) {
    const subject = item.subject
    // Trackers have no measurement target → not an eligible priority.
    if (!('target' in subject)) continue
    if (!isMeasurementSubjectOpen(subject)) continue
    const key = `${item.subjectType}:${subject.id}`
    if (seen.has(key)) continue
    seen.add(key)

    const candidate: WeekPlanCandidate = {
      key,
      subjectType: item.subjectType,
      subjectId: subject.id,
      title: subject.title,
      typeLabel: typeLabelFor(item.subjectType),
      entryMode: subject.entryMode,
      target: subject.target,
      description: subject.description,
      icon: 'icon' in subject ? subject.icon : undefined,
    }

    if ('goalId' in subject) {
      const goal = goalMap.get(subject.goalId)
      candidate.parentGoalTitle = goal?.title
      candidate.parentGoalIcon = goal?.icon
      candidate.icon = candidate.icon ?? goal?.icon
    }

    // Intentions carry the priority links (M5) — prefill the edit-mode picker.
    if (item.subjectType === 'weeklyIntention' && 'priorityIds' in subject) {
      candidate.priorityIds = subject.priorityIds
    }

    list.push(candidate)
  }
  candidates.value = list
  selectedKeys.value = (bundle.weekPlan?.topPriorities ?? []).map(
    (ref) => `${ref.subjectType}:${ref.subjectId}`,
  )
}

function buildTopPriorityRefs(): WeekTopPriorityRef[] {
  const byKey = new Map(candidates.value.map((c) => [c.key, c]))
  return selectedKeys.value
    .map((key) => byKey.get(key))
    .filter((c): c is WeekPlanCandidate => Boolean(c))
    .map((c) => ({ subjectType: c.subjectType, subjectId: c.subjectId }))
}

// Top-3 persists live on every toggle. Serialize the writes so rapid clicks never
// overlap and the last selection always wins: `buildTopPriorityRefs` reads the current
// `selectedKeys` on each write, and a toggle mid-write re-runs it (see useSerializedSave).
const {
  save: persistTopPriorities,
  isSaving: isSavingPlan,
  hasSaved: hasSavedPlan,
} = useSerializedSave(async () => {
  await setWeekTopPriorities(props.weekRef, buildTopPriorityRefs())
  emit('updated')
})

function toggleCandidate(key: string): void {
  selectedKeys.value = selectedKeys.value.includes(key)
    ? selectedKeys.value.filter((value) => value !== key)
    : [...selectedKeys.value, key]
  void persistTopPriorities()
}

async function onIntentionCreated(): Promise<void> {
  await loadCandidates()
  emit('updated')
}

async function onSaveIntention(
  candidate: WeekPlanCandidate,
  payload: {
    title: string
    entryMode: MeasurementEntryMode
    target: MeasurementTarget
    priorityIds: string[]
  },
): Promise<void> {
  await updateWeeklyIntention(candidate.subjectId, payload)
  await loadCandidates()
  emit('updated')
}

async function onDeleteIntention(candidate: WeekPlanCandidate): Promise<void> {
  await deleteWeeklyIntention(candidate.subjectId, props.weekRef)
  // Prune a now-dangling top-3 ref so the persisted plan doesn't keep a stale entry.
  if (selectedKeys.value.includes(candidate.key)) {
    selectedKeys.value = selectedKeys.value.filter((key) => key !== candidate.key)
    await persistTopPriorities()
  }
  await loadCandidates()
  emit('updated')
}

const SOFT_LIMIT = 3

onMounted(() => {
  void loadCandidates()
  void loadActivePriorities()
})

watch(
  () => props.weekRef,
  () => {
    void loadCandidates()
    void loadActivePriorities()
  },
)

// The matrix area whose ratings the current step edits (undefined on non-area steps).
const currentArea = computed(() =>
  REFLECTION_MATRIX_AREAS.find((area) => area.key === currentStep.value),
)

// One group per area step: 3 questions in causal order (demand → action → state).
// The question text (gendered via tg) carries the semantics; the cell itself has
// no standalone name — it is identified by area × section.
const areaGroups = computed<RatingGroup[]>(() => {
  const area = currentArea.value
  if (!area) return []
  return [
    {
      title: t(areaTitleKey(area.key)),
      dimensions: MATRIX_SECTIONS.map((section) => ({
        key: area.fields[section],
        label: tg(cellQuestionKey(area.key, section)),
        value: ratingRefsByKey[area.fields[section]].value,
        icons: MATRIX_CELL_ICONS[area.key][section],
        lowLabel: t(cellAnchorKey(area.key, section, 'low')),
        highLabel: t(cellAnchorKey(area.key, section, 'high')),
      })),
    },
  ]
})

function handleRatingUpdate(key: string, value: number) {
  const ratingRef = ratingRefsByKey[key as WeeklyRatingKey]
  if (ratingRef) ratingRef.value = value
}

// Journal-sidebar summary: section groups (Demands/Actions/State) with area-name items.
const weeklyRatingSummary = computed<SidebarRatingGroup[]>(() =>
  MATRIX_SECTIONS.map((section) => ({
    title: t(sectionTitleKey(section)),
    items: REFLECTION_MATRIX_AREAS.map((area) => ({
      label: t(areaTitleKey(area.key)),
      value: ratingRefsByKey[area.fields[section]].value,
    })),
  })),
)

const summaryPeriodLabel = computed(() => {
  const bounds = getPeriodBounds(props.weekRef)
  const start = new Date(bounds.start + 'T12:00:00')
  const end = new Date(bounds.end + 'T12:00:00')
  const startFmt = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const endFmt = end.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const match = /W(\d+)/.exec(props.weekRef)
  const weekLabel = match ? `W${match[1]}` : props.weekRef
  return `${weekLabel} · ${startFmt}–${endFmt}`
})

// Localized, kind-agnostic payload the AI summary/questions are built from.
// Top-3 + any commented object, with outcome — grounds the AI summary in the week's priorities.
const summaryPriorities = computed<ReflectionPriorityLine[]>(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  const keys = new Set(topPriorityKeys.value)
  return bundle.weekObjectItems
    .filter(
      (item) => keys.has(item.key) || (objectComments.value[item.key] ?? '').trim().length > 0,
    )
    .map((item) => ({
      title: item.subject.title,
      status: item.measurement.evaluationStatus,
      comment: objectComments.value[item.key],
    }))
})

const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'weekly',
    periodLabel: summaryPeriodLabel.value,
    ratings: weeklyRatingSummary.value.flatMap((g) => g.items),
    anchors: weeklyAnchorCategories.value
      .map((c) => ({ label: c.label, text: (promptResponses.value[c.key] ?? '').trim() }))
      .filter((a) => a.text.length > 0),
    freeform: freeformReflection.value,
    journalEntries: bundle?.journalEntries ?? [],
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    priorities: summaryPriorities.value,
  }
})

async function handleSave() {
  try {
    await save()
    emit('updated')
    emit('close')
  } catch (err) {
    console.error('Failed to save weekly reflection:', err)
  }
}

// Last reflection step: save this week's reflection, then jump to planning next week (W+1).
async function handleSaveAndPlanNext() {
  try {
    await save()
    emit('updated')
    emit('plan-next-week')
  } catch (err) {
    console.error('Failed to save weekly reflection:', err)
  }
}
</script>
