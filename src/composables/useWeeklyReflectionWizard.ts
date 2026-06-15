import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { WeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getWeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateWeeklyReflectionPayload } from '@/domain/reflection'
import type { ReflectionSubjectType } from '@/domain/planningState'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'

// The week ritual is one wizard: planning steps (always available) then reflection
// steps (unlocked only from the penultimate day of the week onward — see reflectionUnlocked).
export type WeeklyReflectionStep =
  | 'intentions'
  | 'priorities'
  | 'review'
  | 'demands'
  | 'actions'
  | 'state'
  | 'anchors'
  | 'journal'

const PLANNING_STEPS: WeeklyReflectionStep[] = ['intentions', 'priorities']
const REFLECTION_STEPS: WeeklyReflectionStep[] = ['review', 'demands', 'actions', 'state', 'anchors', 'journal']

const STEP_ORDER: WeeklyReflectionStep[] = [...PLANNING_STEPS, ...REFLECTION_STEPS]

/** Map old step names to new names for draft migration */
const LEGACY_STEP_MAP: Record<string, WeeklyReflectionStep> = {
  intentions: 'intentions',
  priorities: 'priorities',
  // 'review' is now the object-review/confrontation step (first reflection step).
  review: 'review',
  reflect: 'demands',
  ratings: 'demands',
  write: 'journal',
  context: 'demands',
  demands: 'demands',
  evaluation: 'actions',
  actions: 'actions',
  state: 'state',
  prompts: 'anchors',
  anchors: 'anchors',
  journal: 'journal',
  ahead: 'anchors',
}

function getDraftKey(weekRef: WeekRef): string {
  return `weekly-reflection-${weekRef}`
}

/**
 * Reflection unlocks from the penultimate day (Saturday) of the week onward — which also
 * covers every already-ended week. Future weeks and the early current week stay planning-only.
 * Pure + exported so the gate can be unit-tested without mounting the wizard.
 */
export function isReflectionUnlocked(weekRef: WeekRef, todayDayRef: DayRef): boolean {
  const penultimateDay = getChildPeriods(weekRef)[5] // [Mon..Sun] → [5] = Saturday
  return penultimateDay ? todayDayRef >= penultimateDay : true
}

export function useWeeklyReflectionWizard(weekRef: Ref<WeekRef>) {
  const store = useStructuredReflectionStore()

  // Step management — start on planning; reflection unlocks late in the week.
  const currentStep = ref<WeeklyReflectionStep>('intentions')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Reflection unlocks from the penultimate day (Saturday) of the week onward, which also
  // covers every already-ended week. Future weeks and the early current week stay planning-only.
  const reflectionUnlocked = computed(() =>
    isReflectionUnlocked(weekRef.value, getPeriodRefsForDate(new Date()).day),
  )

  function isStepLocked(step: WeeklyReflectionStep): boolean {
    return REFLECTION_STEPS.includes(step) && !reflectionUnlocked.value
  }

  // The last step the user can reach right now (priorities when reflection is locked,
  // journal when it's unlocked). The footer shows Save/Done here instead of Next.
  const isLastStep = computed(() => {
    const next = STEP_ORDER[stepIndex.value + 1]
    return !next || isStepLocked(next)
  })

  // Data bundle backing the journal step (emotion context + AI summary payload)
  const dataBundle = ref<WeeklyReflectionDataBundle | null>(null)
  const isBundleLoading = ref(true)

  // Review step: per-object free-text comments (key = `subjectType:subjectId`),
  // persisted as PeriodObjectReflection. topPriorityKeys highlights the week's top-3.
  const objectComments = ref<Record<string, string>>({})
  const topPriorityKeys = ref<string[]>([])
  // Snapshot of comments at load time, to diff for upsert vs delete on save.
  let initialComments: Record<string, string> = {}

  // Demands ratings (1-5, null = not rated)
  const physicalIntensityRating = ref<number | null>(null)
  const emotionalIntensityRating = ref<number | null>(null)
  const taskLoadRating = ref<number | null>(null)
  const closeOnesNeedsRating = ref<number | null>(null)

  // Actions ratings
  const physicalCareRating = ref<number | null>(null)
  const emotionalProcessingRating = ref<number | null>(null)
  const productivityRating = ref<number | null>(null)
  const closeOnesSupportRating = ref<number | null>(null)

  // State ratings
  const moodRating = ref<number | null>(null)
  const energyRating = ref<number | null>(null)
  const calmRating = ref<number | null>(null)
  const connectionRating = ref<number | null>(null)

  // Structured prompt responses
  const promptResponses = ref<Record<string, string>>({})

  // Free-form reflection
  const freeformReflection = ref('')

  // AI-generated narrative summary (mock content for now; empty = none)
  const aiSummary = ref('')

  // State
  const isEditing = ref(false)
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'intentions':
      case 'priorities':
        return true
      case 'review':
        return true
      case 'demands':
        return (
          physicalIntensityRating.value !== null ||
          emotionalIntensityRating.value !== null ||
          taskLoadRating.value !== null ||
          closeOnesNeedsRating.value !== null
        )
      case 'actions':
        return (
          physicalCareRating.value !== null ||
          emotionalProcessingRating.value !== null ||
          productivityRating.value !== null ||
          closeOnesSupportRating.value !== null
        )
      case 'state':
        return (
          moodRating.value !== null ||
          energyRating.value !== null ||
          calmRating.value !== null ||
          connectionRating.value !== null
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
    // Never advance into a locked (not-yet-unlocked reflection) step.
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

  function goToStep(step: WeeklyReflectionStep) {
    if (isStepLocked(step)) return
    currentStep.value = step
  }

  // All rating refs for watchers
  const allRatingRefs = [
    physicalIntensityRating,
    emotionalIntensityRating,
    taskLoadRating,
    closeOnesNeedsRating,
    physicalCareRating,
    emotionalProcessingRating,
    productivityRating,
    closeOnesSupportRating,
    moodRating,
    energyRating,
    calmRating,
    connectionRating,
  ]

  // Draft persistence
  let draftSaveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer)
    draftSaveTimer = setTimeout(() => {
      void saveDraftToDB(getDraftKey(weekRef.value), JSON.stringify(serializeFields()))
    }, 300)
  }

  function flushDraft() {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer)
      draftSaveTimer = null
      void saveDraftToDB(getDraftKey(weekRef.value), JSON.stringify(serializeFields()))
    }
  }

  function serializeFields() {
    return {
      currentStep: currentStep.value,
      physicalIntensityRating: physicalIntensityRating.value,
      emotionalIntensityRating: emotionalIntensityRating.value,
      taskLoadRating: taskLoadRating.value,
      closeOnesNeedsRating: closeOnesNeedsRating.value,
      physicalCareRating: physicalCareRating.value,
      emotionalProcessingRating: emotionalProcessingRating.value,
      productivityRating: productivityRating.value,
      closeOnesSupportRating: closeOnesSupportRating.value,
      moodRating: moodRating.value,
      energyRating: energyRating.value,
      calmRating: calmRating.value,
      connectionRating: connectionRating.value,
      promptResponses: promptResponses.value,
      freeformReflection: freeformReflection.value,
      aiSummary: aiSummary.value,
      objectComments: objectComments.value,
    }
  }

  function hydrateFromDraft(raw: string) {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      if (data.currentStep) {
        const mapped = LEGACY_STEP_MAP[data.currentStep as string]
        if (mapped) currentStep.value = mapped
      }

      // Hydrate demands
      if (data.physicalIntensityRating != null) physicalIntensityRating.value = data.physicalIntensityRating as number
      if (data.emotionalIntensityRating != null) emotionalIntensityRating.value = data.emotionalIntensityRating as number
      if (data.taskLoadRating != null) taskLoadRating.value = data.taskLoadRating as number
      if (data.closeOnesNeedsRating != null) closeOnesNeedsRating.value = data.closeOnesNeedsRating as number
      // Hydrate actions
      if (data.physicalCareRating != null) physicalCareRating.value = data.physicalCareRating as number
      if (data.emotionalProcessingRating != null) emotionalProcessingRating.value = data.emotionalProcessingRating as number
      if (data.productivityRating != null) productivityRating.value = data.productivityRating as number
      if (data.closeOnesSupportRating != null) closeOnesSupportRating.value = data.closeOnesSupportRating as number
      // Hydrate state
      if (data.moodRating != null) moodRating.value = data.moodRating as number
      if (data.energyRating != null) energyRating.value = data.energyRating as number
      if (data.calmRating != null) calmRating.value = data.calmRating as number
      if (data.connectionRating != null) connectionRating.value = data.connectionRating as number

      if (data.promptResponses) promptResponses.value = data.promptResponses as Record<string, string>
      if (data.freeformReflection) freeformReflection.value = data.freeformReflection as string
      if (typeof data.aiSummary === 'string') aiSummary.value = data.aiSummary
      if (data.objectComments) objectComments.value = data.objectComments as Record<string, string>
    } catch {
      // Invalid draft, ignore
    }
  }

  function hydrateFromExisting(existing: CreateWeeklyReflectionPayload) {
    physicalIntensityRating.value = existing.physicalIntensityRating
    emotionalIntensityRating.value = existing.emotionalIntensityRating
    taskLoadRating.value = existing.taskLoadRating
    closeOnesNeedsRating.value = existing.closeOnesNeedsRating
    physicalCareRating.value = existing.physicalCareRating
    emotionalProcessingRating.value = existing.emotionalProcessingRating
    productivityRating.value = existing.productivityRating
    closeOnesSupportRating.value = existing.closeOnesSupportRating
    moodRating.value = existing.moodRating
    energyRating.value = existing.energyRating
    calmRating.value = existing.calmRating
    connectionRating.value = existing.connectionRating
    promptResponses.value = { ...existing.promptResponses }
    freeformReflection.value = existing.freeformReflection
    aiSummary.value = existing.aiSummary ?? ''
  }

  // Watch fields for auto-save
  watch(
    [...allRatingRefs, promptResponses, freeformReflection, aiSummary, objectComments],
    scheduleDraftSave,
    { deep: true }
  )

  // Initialization
  onMounted(async () => {
    // Load the data bundle backing the journal step / AI summary context
    isBundleLoading.value = true
    try {
      const weekEnd = getPeriodBounds(weekRef.value).end as DayRef
      const [bundle, weekPlan, allObjectReflections] = await Promise.all([
        getWeeklyReflectionDataBundle(weekRef.value, weekEnd),
        periodPlanDexieRepository.getWeekPlan(weekRef.value),
        reflectionDexieRepository.listPeriodObjectReflections(),
      ])
      dataBundle.value = bundle
      topPriorityKeys.value = (weekPlan?.topPriorities ?? []).map(
        (ref) => `${ref.subjectType}:${ref.subjectId}`,
      )
      const existingComments: Record<string, string> = {}
      for (const reflection of allObjectReflections) {
        if (reflection.periodType === 'week' && reflection.periodRef === weekRef.value) {
          existingComments[`${reflection.subjectType}:${reflection.subjectId}`] = reflection.note
        }
      }
      initialComments = { ...existingComments }
      // Seed from DB; a restored draft (hydrated just below) overrides if present.
      objectComments.value = { ...existingComments }
    } catch (err) {
      console.error('Error loading weekly reflection data bundle:', err)
    } finally {
      isBundleLoading.value = false
    }

    // Load draft or existing reflection
    const draftRaw = await loadDraftFromDB(getDraftKey(weekRef.value))
    if (draftRaw) {
      hydrateFromDraft(draftRaw)
      // Check if an existing record also exists (for isEditing flag)
      const existing = store.getWeeklyByRef(weekRef.value)
      if (existing) isEditing.value = true
    } else {
      const existing = store.getWeeklyByRef(weekRef.value)
      if (existing) {
        hydrateFromExisting(existing)
        isEditing.value = true
      }
    }

    // Defensive: a restored draft could point at a now-locked reflection step.
    if (isStepLocked(currentStep.value)) {
      currentStep.value = 'priorities'
    }
  })

  onUnmounted(() => {
    flushDraft()
  })

  // Save
  async function save(): Promise<void> {
    isSaving.value = true
    try {
      const payload: CreateWeeklyReflectionPayload = {
        weekRef: weekRef.value,
        physicalIntensityRating: physicalIntensityRating.value,
        emotionalIntensityRating: emotionalIntensityRating.value,
        taskLoadRating: taskLoadRating.value,
        closeOnesNeedsRating: closeOnesNeedsRating.value,
        physicalCareRating: physicalCareRating.value,
        emotionalProcessingRating: emotionalProcessingRating.value,
        productivityRating: productivityRating.value,
        closeOnesSupportRating: closeOnesSupportRating.value,
        moodRating: moodRating.value,
        energyRating: energyRating.value,
        calmRating: calmRating.value,
        connectionRating: connectionRating.value,
        promptResponses: { ...promptResponses.value },
        freeformReflection: freeformReflection.value,
        aiSummary: aiSummary.value,
      }

      await store.upsertWeekly(payload)
      await persistObjectComments()
      await clearDraftFromDB(getDraftKey(weekRef.value))
    } finally {
      isSaving.value = false
    }
  }

  /** Sync per-object comments to PeriodObjectReflection: upsert non-empty, delete cleared. */
  async function persistObjectComments(): Promise<void> {
    const keys = new Set([...Object.keys(initialComments), ...Object.keys(objectComments.value)])
    const ops: Promise<unknown>[] = []
    for (const key of keys) {
      const sep = key.indexOf(':')
      if (sep < 0) continue
      const subjectType = key.slice(0, sep) as ReflectionSubjectType
      const subjectId = key.slice(sep + 1)
      const note = (objectComments.value[key] ?? '').trim()
      if (note) {
        ops.push(
          reflectionDexieRepository.upsertPeriodObjectReflection({
            periodType: 'week',
            periodRef: weekRef.value,
            subjectType,
            subjectId,
            note,
          }),
        )
      } else if (initialComments[key]) {
        ops.push(
          reflectionDexieRepository.deletePeriodObjectReflection(
            'week',
            weekRef.value,
            subjectType,
            subjectId,
          ),
        )
      }
    }
    await Promise.all(ops)
    initialComments = { ...objectComments.value }
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

    // Step gating (planning always available; reflection unlocks late in the week)
    reflectionUnlocked,
    isStepLocked,
    isLastStep,

    // Data bundle
    dataBundle,
    isBundleLoading,

    // Review step
    objectComments,
    topPriorityKeys,

    // Demands ratings
    physicalIntensityRating,
    emotionalIntensityRating,
    taskLoadRating,
    closeOnesNeedsRating,

    // Actions ratings
    physicalCareRating,
    emotionalProcessingRating,
    productivityRating,
    closeOnesSupportRating,

    // State ratings
    moodRating,
    energyRating,
    calmRating,
    connectionRating,

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
