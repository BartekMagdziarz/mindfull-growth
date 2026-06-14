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
import { getPeriodBounds } from '@/utils/periods'

export type WeeklyReflectionStep =
  | 'review'
  | 'demands'
  | 'actions'
  | 'state'
  | 'anchors'
  | 'journal'

const STEP_ORDER: WeeklyReflectionStep[] = [
  'review',
  'demands',
  'actions',
  'state',
  'anchors',
  'journal',
]

/** Map old step names to new names for draft migration */
const LEGACY_STEP_MAP: Record<string, WeeklyReflectionStep> = {
  // 'review' is now the object-review/confrontation step (first step again).
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

export function useWeeklyReflectionWizard(weekRef: Ref<WeekRef>) {
  const store = useStructuredReflectionStore()

  // Step management
  const currentStep = ref<WeeklyReflectionStep>('review')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

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
    if (idx < STEP_ORDER.length - 1) {
      currentStep.value = STEP_ORDER[idx + 1]
    }
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx > 0) {
      currentStep.value = STEP_ORDER[idx - 1]
    }
  }

  function goToStep(step: WeeklyReflectionStep) {
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
