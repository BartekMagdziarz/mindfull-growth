import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { DayRef, MonthRef } from '@/domain/period'
import type { Priority } from '@/domain/planning'
import type { PriorityVerdict } from '@/domain/planningState'
import type { MonthlyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getMonthlyReflectionDataBundle } from '@/services/reflectionDataQueries'
import {
  getActivePrioritiesForMonth,
  setMonthTopPriorities,
  setMonthlyPriorityAssessment,
} from '@/services/monthlyPriorityService'
import {
  getMonthlyFocusConfrontation,
  type MonthlyFocusConfrontation,
} from '@/services/monthlyFocusService'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateMonthlyReflectionPayload } from '@/domain/reflection'

// The month ritual is one wizard: planning steps ("Zaplanuj miesiąc" — pick the month's top
// priorities, then assign objects to weeks) then reflection steps (unlocked only in the month's
// closing stretch — see isMonthlyReflectionUnlocked). Mirrors the weekly transition wizard.
export type MonthlyReflectionStep =
  | 'plan'
  | 'weeks'
  | 'priorities-review'
  | 'ratings'
  | 'anchors'
  | 'journal'

const PLANNING_STEPS: MonthlyReflectionStep[] = ['plan', 'weeks']
const REFLECTION_STEPS: MonthlyReflectionStep[] = ['priorities-review', 'ratings', 'anchors', 'journal']
const STEP_ORDER: MonthlyReflectionStep[] = [...PLANNING_STEPS, ...REFLECTION_STEPS]

/** Soft cap on the month's top priorities (exceedable with a gentle warning). */
export const MONTH_TOP_PRIORITY_SOFT_LIMIT = 3

/** Map old/removed step names to current ones for draft migration. */
const LEGACY_STEP_MAP: Record<string, MonthlyReflectionStep> = {
  plan: 'plan',
  weeks: 'weeks',
  'priorities-review': 'priorities-review',
  review: 'priorities-review',
  goals: 'priorities-review',
  'weekly-recap': 'ratings',
  ratings: 'ratings',
  prompts: 'anchors',
  anchors: 'anchors',
  journal: 'journal',
  ahead: 'anchors',
}

export interface PriorityAssessment {
  /** 1–5 effort self-rating, or null. */
  effort: number | null
  verdict: PriorityVerdict | null
  note: string
}

function emptyAssessment(): PriorityAssessment {
  return { effort: null, verdict: null, note: '' }
}

function getDraftKey(monthRef: MonthRef): string {
  return `monthly-reflection-${monthRef}`
}

/**
 * Reflection unlocks in the month's closing stretch (its last 7 days) and stays unlocked for
 * any already-ended month. The early/mid current month is planning-only. Pure + exported so the
 * gate can be unit-tested without mounting the wizard.
 */
export function isMonthlyReflectionUnlocked(monthRef: MonthRef, todayDayRef: DayRef): boolean {
  // Threshold = the month's last day minus 6 (its closing week). Computed entirely in UTC so it
  // is a fixed calendar date regardless of the viewer's timezone (avoids a local off-by-one).
  const monthEnd = getPeriodBounds(monthRef).end
  const endDate = new Date(`${monthEnd}T00:00:00Z`)
  endDate.setUTCDate(endDate.getUTCDate() - 6)
  const threshold = endDate.toISOString().slice(0, 10)
  return todayDayRef >= threshold
}

export function useMonthlyReflectionWizard(monthRef: Ref<MonthRef>) {
  const store = useStructuredReflectionStore()

  // Step management — start on planning; reflection unlocks late in the month.
  const currentStep = ref<MonthlyReflectionStep>('plan')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  const reflectionUnlocked = computed(() =>
    isMonthlyReflectionUnlocked(monthRef.value, getPeriodRefsForDate(new Date()).day),
  )

  function isStepLocked(step: MonthlyReflectionStep): boolean {
    return REFLECTION_STEPS.includes(step) && !reflectionUnlocked.value
  }

  // The last step the user can reach right now (the plan step when reflection is locked,
  // journal when it's unlocked). The footer shows Save/Done here instead of Next.
  const isLastStep = computed(() => {
    const next = STEP_ORDER[stepIndex.value + 1]
    return !next || isStepLocked(next)
  })

  // Data bundle backing the journal step (emotion/weekly context + AI summary payload)
  const dataBundle = ref<MonthlyReflectionDataBundle | null>(null)
  const isBundleLoading = ref(true)

  // Planning + review: the month's active Priorities, the chosen top-3 (persisted live on
  // toggle), and the per-priority assessment captured during reflection (persisted on save).
  const activePriorities = ref<Priority[]>([])
  const selectedPriorityIds = ref<string[]>([])
  const priorityAssessments = ref<Record<string, PriorityAssessment>>({})
  let initialAssessments: Record<string, PriorityAssessment> = {}

  // M4 — weekly↔monthly focus confrontation (read-only; rolled up from the month's weekly top-3 picks).
  const focusConfrontation = ref<MonthlyFocusConfrontation | null>(null)

  // Dimension ratings (1-5, null = not rated)
  const balanceRating = ref<number | null>(null)
  const purposeRating = ref<number | null>(null)
  const growthRating = ref<number | null>(null)
  const coherenceRating = ref<number | null>(null)
  const agencyRating = ref<number | null>(null)

  // Structured prompt responses
  const promptResponses = ref<Record<string, string>>({})

  // Free-form reflection
  const freeformReflection = ref('')

  // AI-generated narrative summary (empty = none)
  const aiSummary = ref('')

  // State
  const isEditing = ref(false)
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'plan':
        return true
      case 'weeks':
        return true
      case 'priorities-review':
        return true
      case 'ratings':
        return (
          balanceRating.value !== null ||
          purposeRating.value !== null ||
          growthRating.value !== null ||
          coherenceRating.value !== null ||
          agencyRating.value !== null
        )
      case 'anchors':
        return true
      case 'journal':
        return true
      default:
        return false
    }
  })

  function nextStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    const next = STEP_ORDER[idx + 1]
    if (next && !isStepLocked(next)) {
      currentStep.value = next
    }
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx > 0) {
      currentStep.value = STEP_ORDER[idx - 1]
    }
  }

  function goToStep(step: MonthlyReflectionStep) {
    if (isStepLocked(step)) return
    currentStep.value = step
  }

  /** Toggle a top-priority pick (soft cap, exceedable) and persist the new set live. */
  async function toggleTopPriority(priorityId: string): Promise<void> {
    const set = new Set(selectedPriorityIds.value)
    if (set.has(priorityId)) {
      set.delete(priorityId)
    } else {
      set.add(priorityId)
    }
    // Keep the order stable (follows the active-priority order).
    selectedPriorityIds.value = activePriorities.value
      .map((p) => p.id)
      .filter((id) => set.has(id))
    await setMonthTopPriorities(monthRef.value, selectedPriorityIds.value)
  }

  function assessmentFor(priorityId: string): PriorityAssessment {
    return priorityAssessments.value[priorityId] ?? emptyAssessment()
  }

  function updateAssessment(priorityId: string, patch: Partial<PriorityAssessment>): void {
    priorityAssessments.value = {
      ...priorityAssessments.value,
      [priorityId]: { ...assessmentFor(priorityId), ...patch },
    }
  }

  // All rating refs for watchers
  const allRatingRefs = [balanceRating, purposeRating, growthRating, coherenceRating, agencyRating]

  // Draft persistence
  let draftSaveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer)
    draftSaveTimer = setTimeout(() => {
      void saveDraftToDB(getDraftKey(monthRef.value), JSON.stringify(serializeFields()))
    }, 300)
  }

  function flushDraft() {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer)
      draftSaveTimer = null
      void saveDraftToDB(getDraftKey(monthRef.value), JSON.stringify(serializeFields()))
    }
  }

  function serializeFields() {
    return {
      currentStep: currentStep.value,
      selectedPriorityIds: selectedPriorityIds.value,
      priorityAssessments: priorityAssessments.value,
      balanceRating: balanceRating.value,
      purposeRating: purposeRating.value,
      growthRating: growthRating.value,
      coherenceRating: coherenceRating.value,
      agencyRating: agencyRating.value,
      promptResponses: promptResponses.value,
      freeformReflection: freeformReflection.value,
      aiSummary: aiSummary.value,
    }
  }

  function hydrateFromDraft(raw: string) {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      if (data.currentStep) {
        const mapped = LEGACY_STEP_MAP[data.currentStep as string]
        if (mapped) currentStep.value = mapped
      }

      // Legacy field migration
      if (data.alignmentRating != null && data.coherenceRating == null) {
        data.coherenceRating = data.alignmentRating
      }

      if (Array.isArray(data.selectedPriorityIds)) {
        selectedPriorityIds.value = data.selectedPriorityIds as string[]
      }
      if (data.priorityAssessments && typeof data.priorityAssessments === 'object') {
        priorityAssessments.value = data.priorityAssessments as Record<string, PriorityAssessment>
      }

      if (data.balanceRating != null) balanceRating.value = data.balanceRating as number
      if (data.purposeRating != null) purposeRating.value = data.purposeRating as number
      if (data.growthRating != null) growthRating.value = data.growthRating as number
      if (data.coherenceRating != null) coherenceRating.value = data.coherenceRating as number
      if (data.agencyRating != null) agencyRating.value = data.agencyRating as number

      if (data.promptResponses) promptResponses.value = data.promptResponses as Record<string, string>
      if (data.freeformReflection) freeformReflection.value = data.freeformReflection as string
      if (typeof data.aiSummary === 'string') aiSummary.value = data.aiSummary
    } catch {
      // Invalid draft, ignore
    }
  }

  function hydrateFromExisting(existing: CreateMonthlyReflectionPayload) {
    balanceRating.value = existing.balanceRating
    purposeRating.value = existing.purposeRating
    growthRating.value = existing.growthRating
    coherenceRating.value = existing.coherenceRating
    agencyRating.value = existing.agencyRating
    promptResponses.value = { ...existing.promptResponses }
    freeformReflection.value = existing.freeformReflection
    aiSummary.value = existing.aiSummary ?? ''
  }

  // Watch fields for auto-save
  watch(
    [
      ...allRatingRefs,
      promptResponses,
      freeformReflection,
      aiSummary,
      selectedPriorityIds,
      priorityAssessments,
    ],
    scheduleDraftSave,
    { deep: true },
  )

  // Initialization
  onMounted(async () => {
    isBundleLoading.value = true
    try {
      const [bundle, priorities, monthPlan, allObjectReflections] = await Promise.all([
        getMonthlyReflectionDataBundle(monthRef.value),
        getActivePrioritiesForMonth(monthRef.value),
        periodPlanDexieRepository.getMonthPlan(monthRef.value),
        reflectionDexieRepository.listPeriodObjectReflections(),
      ])
      dataBundle.value = bundle
      activePriorities.value = priorities

      const activeIds = new Set(priorities.map((p) => p.id))
      selectedPriorityIds.value = (monthPlan?.topPriorityIds ?? []).filter((id) => activeIds.has(id))

      const existing: Record<string, PriorityAssessment> = {}
      for (const reflection of allObjectReflections) {
        if (
          reflection.periodType === 'month' &&
          reflection.periodRef === monthRef.value &&
          reflection.subjectType === 'priority'
        ) {
          existing[reflection.subjectId] = {
            effort: reflection.effort ?? null,
            verdict: reflection.verdict ?? null,
            note: reflection.note ?? '',
          }
        }
      }
      initialAssessments = { ...existing }
      priorityAssessments.value = { ...existing }

      focusConfrontation.value = await getMonthlyFocusConfrontation(
        monthRef.value,
        priorities.map((p) => p.id),
      )
    } catch (err) {
      console.error('Error loading monthly reflection data bundle:', err)
    } finally {
      isBundleLoading.value = false
    }

    // Load draft or existing reflection (draft overrides DB-seeded state)
    const draftRaw = await loadDraftFromDB(getDraftKey(monthRef.value))
    if (draftRaw) {
      hydrateFromDraft(draftRaw)
      const existing = store.getMonthlyByRef(monthRef.value)
      if (existing) isEditing.value = true
    } else {
      const existing = store.getMonthlyByRef(monthRef.value)
      if (existing) {
        hydrateFromExisting(existing)
        isEditing.value = true
      }
    }

    // Defensive: a restored draft could point at a now-locked reflection step.
    if (isStepLocked(currentStep.value)) {
      currentStep.value = 'plan'
    }
  })

  onUnmounted(() => {
    flushDraft()
  })

  // Save (reflection half). Top-3 picks already persist live on toggle.
  async function save(): Promise<void> {
    isSaving.value = true
    try {
      const payload: CreateMonthlyReflectionPayload = {
        monthRef: monthRef.value,
        balanceRating: balanceRating.value,
        purposeRating: purposeRating.value,
        growthRating: growthRating.value,
        coherenceRating: coherenceRating.value,
        agencyRating: agencyRating.value,
        promptResponses: { ...promptResponses.value },
        freeformReflection: freeformReflection.value,
        aiSummary: aiSummary.value,
      }

      await store.upsertMonthly(payload)
      await setMonthTopPriorities(monthRef.value, selectedPriorityIds.value)
      await persistPriorityAssessments()
      await clearDraftFromDB(getDraftKey(monthRef.value))
    } finally {
      isSaving.value = false
    }
  }

  /** Sync per-priority assessments to PeriodObjectReflection (the service upserts/deletes). */
  async function persistPriorityAssessments(): Promise<void> {
    const ids = new Set([
      ...Object.keys(initialAssessments),
      ...Object.keys(priorityAssessments.value),
    ])
    await Promise.all(
      [...ids].map((id) =>
        setMonthlyPriorityAssessment(monthRef.value, id, priorityAssessments.value[id] ?? emptyAssessment()),
      ),
    )
    initialAssessments = { ...priorityAssessments.value }
  }

  return {
    // Step
    currentStep,
    stepIndex,
    stepCount: STEP_ORDER.length,
    canAdvance,
    nextStep,
    prevStep,
    goToStep,

    // Step gating (planning always available; reflection unlocks late in the month)
    reflectionUnlocked,
    isStepLocked,
    isLastStep,

    // Data bundle
    dataBundle,
    isBundleLoading,

    // Planning + review
    activePriorities,
    selectedPriorityIds,
    toggleTopPriority,
    priorityAssessments,
    assessmentFor,
    updateAssessment,
    focusConfrontation,

    // Ratings
    balanceRating,
    purposeRating,
    growthRating,
    coherenceRating,
    agencyRating,

    // Prompts
    promptResponses,

    // Free-form
    freeformReflection,

    // AI summary
    aiSummary,

    // State
    isEditing,
    isSaving,
    save,
  }
}
