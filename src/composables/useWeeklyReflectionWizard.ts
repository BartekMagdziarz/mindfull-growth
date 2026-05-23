import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { WeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getWeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateWeeklyReflectionPayload } from '@/domain/reflection'
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

  // Data bundle for review step
  const dataBundle = ref<WeeklyReflectionDataBundle | null>(null)
  const isBundleLoading = ref(true)

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
    [...allRatingRefs, promptResponses, freeformReflection, aiSummary],
    scheduleDraftSave,
    { deep: true }
  )

  // Initialization
  onMounted(async () => {
    // Load data bundle for review step
    isBundleLoading.value = true
    try {
      const weekEnd = getPeriodBounds(weekRef.value).end as DayRef
      dataBundle.value = await getWeeklyReflectionDataBundle(weekRef.value, weekEnd)
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
      await clearDraftFromDB(getDraftKey(weekRef.value))
    } finally {
      isSaving.value = false
    }
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
