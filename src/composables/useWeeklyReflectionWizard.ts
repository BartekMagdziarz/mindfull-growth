import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { WeekRef } from '@/domain/period'
import type { WeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getWeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateWeeklyReflectionPayload } from '@/domain/reflection'

export type WeeklyReflectionStep =
  | 'review'
  | 'context'
  | 'state'
  | 'evaluation'
  | 'prompts'
  | 'journal'
  | 'ahead'

const STEP_ORDER: WeeklyReflectionStep[] = [
  'review',
  'context',
  'state',
  'evaluation',
  'prompts',
  'journal',
  'ahead',
]

/** Map old step names to new names for draft migration */
const LEGACY_STEP_MAP: Record<string, WeeklyReflectionStep> = {
  review: 'review',
  reflect: 'context',
  ratings: 'context',
  write: 'journal',
  context: 'context',
  state: 'state',
  evaluation: 'evaluation',
  prompts: 'prompts',
  journal: 'journal',
  ahead: 'ahead',
}

/** Map old field names to new field names for draft migration */
const LEGACY_FIELD_MAP: Record<string, string> = {
  focusRating: 'productivityRating',
  socialConnectionRating: 'connectionRating',
  // stressLevelRating needs inversion — handled separately
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

  // Context ratings (1-5, null = not rated)
  const physicalIntensityRating = ref<number | null>(null)
  const taskLoadRating = ref<number | null>(null)
  const emotionalIntensityRating = ref<number | null>(null)
  const socialIntensityRating = ref<number | null>(null)

  // State ratings
  const moodRating = ref<number | null>(null)
  const energyRating = ref<number | null>(null)
  const calmRating = ref<number | null>(null)
  const connectionRating = ref<number | null>(null)

  // Evaluation ratings
  const productivityRating = ref<number | null>(null)
  const engagementRating = ref<number | null>(null)
  const emotionalRegulationRating = ref<number | null>(null)
  const selfCareRating = ref<number | null>(null)

  // Structured prompt responses
  const promptResponses = ref<Record<string, string>>({})

  // Free-form reflection + looking ahead
  const freeformReflection = ref('')
  const lookingAhead = ref('')

  // State
  const isEditing = ref(false)
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'review':
        return true
      case 'context':
        return (
          physicalIntensityRating.value !== null ||
          taskLoadRating.value !== null ||
          emotionalIntensityRating.value !== null ||
          socialIntensityRating.value !== null
        )
      case 'state':
        return (
          moodRating.value !== null ||
          energyRating.value !== null ||
          calmRating.value !== null ||
          connectionRating.value !== null
        )
      case 'evaluation':
        return (
          productivityRating.value !== null ||
          engagementRating.value !== null ||
          emotionalRegulationRating.value !== null ||
          selfCareRating.value !== null
        )
      case 'prompts':
        return Object.values(promptResponses.value).some((v) => v.trim().length > 0)
      case 'journal':
        return true
      case 'ahead':
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
    taskLoadRating,
    emotionalIntensityRating,
    socialIntensityRating,
    moodRating,
    energyRating,
    calmRating,
    connectionRating,
    productivityRating,
    engagementRating,
    emotionalRegulationRating,
    selfCareRating,
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
      taskLoadRating: taskLoadRating.value,
      emotionalIntensityRating: emotionalIntensityRating.value,
      socialIntensityRating: socialIntensityRating.value,
      moodRating: moodRating.value,
      energyRating: energyRating.value,
      calmRating: calmRating.value,
      connectionRating: connectionRating.value,
      productivityRating: productivityRating.value,
      engagementRating: engagementRating.value,
      emotionalRegulationRating: emotionalRegulationRating.value,
      selfCareRating: selfCareRating.value,
      promptResponses: promptResponses.value,
      freeformReflection: freeformReflection.value,
      lookingAhead: lookingAhead.value,
    }
  }

  function hydrateFromDraft(raw: string) {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      if (data.currentStep) {
        const mapped = LEGACY_STEP_MAP[data.currentStep as string]
        if (mapped) currentStep.value = mapped
      }

      // Handle legacy field migration
      for (const [oldKey, newKey] of Object.entries(LEGACY_FIELD_MAP)) {
        if (data[oldKey] != null && data[newKey] == null) {
          data[newKey] = data[oldKey]
        }
      }
      // Invert stressLevelRating → calmRating
      if (data.stressLevelRating != null && data.calmRating == null) {
        data.calmRating = 6 - (data.stressLevelRating as number)
      }

      // Hydrate all rating fields
      if (data.physicalIntensityRating != null) physicalIntensityRating.value = data.physicalIntensityRating as number
      if (data.taskLoadRating != null) taskLoadRating.value = data.taskLoadRating as number
      if (data.emotionalIntensityRating != null) emotionalIntensityRating.value = data.emotionalIntensityRating as number
      if (data.socialIntensityRating != null) socialIntensityRating.value = data.socialIntensityRating as number
      if (data.moodRating != null) moodRating.value = data.moodRating as number
      if (data.energyRating != null) energyRating.value = data.energyRating as number
      if (data.calmRating != null) calmRating.value = data.calmRating as number
      if (data.connectionRating != null) connectionRating.value = data.connectionRating as number
      if (data.productivityRating != null) productivityRating.value = data.productivityRating as number
      if (data.engagementRating != null) engagementRating.value = data.engagementRating as number
      if (data.emotionalRegulationRating != null) emotionalRegulationRating.value = data.emotionalRegulationRating as number
      if (data.selfCareRating != null) selfCareRating.value = data.selfCareRating as number

      if (data.promptResponses) promptResponses.value = data.promptResponses as Record<string, string>
      if (data.freeformReflection) freeformReflection.value = data.freeformReflection as string
      if (data.lookingAhead) lookingAhead.value = data.lookingAhead as string
    } catch {
      // Invalid draft, ignore
    }
  }

  function hydrateFromExisting(existing: CreateWeeklyReflectionPayload) {
    physicalIntensityRating.value = existing.physicalIntensityRating
    taskLoadRating.value = existing.taskLoadRating
    emotionalIntensityRating.value = existing.emotionalIntensityRating
    socialIntensityRating.value = existing.socialIntensityRating
    moodRating.value = existing.moodRating
    energyRating.value = existing.energyRating
    calmRating.value = existing.calmRating
    connectionRating.value = existing.connectionRating
    productivityRating.value = existing.productivityRating
    engagementRating.value = existing.engagementRating
    emotionalRegulationRating.value = existing.emotionalRegulationRating
    selfCareRating.value = existing.selfCareRating
    promptResponses.value = { ...existing.promptResponses }
    freeformReflection.value = existing.freeformReflection
    lookingAhead.value = existing.lookingAhead
  }

  // Watch fields for auto-save
  watch(
    [...allRatingRefs, promptResponses, freeformReflection, lookingAhead],
    scheduleDraftSave,
    { deep: true }
  )

  // Initialization
  onMounted(async () => {
    // Load data bundle for review step
    isBundleLoading.value = true
    try {
      dataBundle.value = await getWeeklyReflectionDataBundle(weekRef.value)
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
        taskLoadRating: taskLoadRating.value,
        emotionalIntensityRating: emotionalIntensityRating.value,
        socialIntensityRating: socialIntensityRating.value,
        moodRating: moodRating.value,
        energyRating: energyRating.value,
        calmRating: calmRating.value,
        connectionRating: connectionRating.value,
        productivityRating: productivityRating.value,
        engagementRating: engagementRating.value,
        emotionalRegulationRating: emotionalRegulationRating.value,
        selfCareRating: selfCareRating.value,
        promptResponses: { ...promptResponses.value },
        freeformReflection: freeformReflection.value,
        lookingAhead: lookingAhead.value,
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

    // Context ratings
    physicalIntensityRating,
    taskLoadRating,
    emotionalIntensityRating,
    socialIntensityRating,

    // State ratings
    moodRating,
    energyRating,
    calmRating,
    connectionRating,

    // Evaluation ratings
    productivityRating,
    engagementRating,
    emotionalRegulationRating,
    selfCareRating,

    // Prompts
    promptResponses,

    // Free-form
    freeformReflection,
    lookingAhead,

    // State
    isEditing,
    isSaving,
    save,
  }
}
