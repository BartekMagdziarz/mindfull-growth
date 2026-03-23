import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { MonthRef } from '@/domain/period'
import type { MonthlyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getMonthlyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateMonthlyReflectionPayload } from '@/domain/reflection'

export type MonthlyReflectionStep =
  | 'review'
  | 'goals'
  | 'weekly-recap'
  | 'ratings'
  | 'prompts'
  | 'journal'
  | 'ahead'

const STEP_ORDER: MonthlyReflectionStep[] = [
  'review',
  'goals',
  'weekly-recap',
  'ratings',
  'prompts',
  'journal',
  'ahead',
]

/** Map old step names to new names for draft migration */
const LEGACY_STEP_MAP: Record<string, MonthlyReflectionStep> = {
  review: 'review',
  goals: 'goals',
  'weekly-recap': 'weekly-recap',
  ratings: 'ratings',
  prompts: 'prompts',
  journal: 'journal',
  ahead: 'ahead',
}

function getDraftKey(monthRef: MonthRef): string {
  return `monthly-reflection-${monthRef}`
}

export function useMonthlyReflectionWizard(monthRef: Ref<MonthRef>) {
  const store = useStructuredReflectionStore()

  // Step management
  const currentStep = ref<MonthlyReflectionStep>('review')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Data bundle for review step
  const dataBundle = ref<MonthlyReflectionDataBundle | null>(null)
  const isBundleLoading = ref(true)

  // Dimension ratings (1-5, null = not rated)
  const balanceRating = ref<number | null>(null)
  const purposeRating = ref<number | null>(null)
  const growthRating = ref<number | null>(null)
  const coherenceRating = ref<number | null>(null)
  const agencyRating = ref<number | null>(null)

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
      case 'goals':
        return true
      case 'weekly-recap':
        return true
      case 'ratings':
        return (
          balanceRating.value !== null ||
          purposeRating.value !== null ||
          growthRating.value !== null ||
          coherenceRating.value !== null ||
          agencyRating.value !== null
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

  function goToStep(step: MonthlyReflectionStep) {
    currentStep.value = step
  }

  // All rating refs for watchers
  const allRatingRefs = [
    balanceRating,
    purposeRating,
    growthRating,
    coherenceRating,
    agencyRating,
  ]

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
      balanceRating: balanceRating.value,
      purposeRating: purposeRating.value,
      growthRating: growthRating.value,
      coherenceRating: coherenceRating.value,
      agencyRating: agencyRating.value,
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
      if (data.alignmentRating != null && data.coherenceRating == null) {
        data.coherenceRating = data.alignmentRating
      }

      if (data.balanceRating != null) balanceRating.value = data.balanceRating as number
      if (data.purposeRating != null) purposeRating.value = data.purposeRating as number
      if (data.growthRating != null) growthRating.value = data.growthRating as number
      if (data.coherenceRating != null) coherenceRating.value = data.coherenceRating as number
      if (data.agencyRating != null) agencyRating.value = data.agencyRating as number

      if (data.promptResponses) promptResponses.value = data.promptResponses as Record<string, string>
      if (data.freeformReflection) freeformReflection.value = data.freeformReflection as string
      if (data.lookingAhead) lookingAhead.value = data.lookingAhead as string
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
      dataBundle.value = await getMonthlyReflectionDataBundle(monthRef.value)
    } catch (err) {
      console.error('Error loading monthly reflection data bundle:', err)
    } finally {
      isBundleLoading.value = false
    }

    // Load draft or existing reflection
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
  })

  onUnmounted(() => {
    flushDraft()
  })

  // Save
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
        lookingAhead: lookingAhead.value,
      }

      await store.upsertMonthly(payload)
      await clearDraftFromDB(getDraftKey(monthRef.value))
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
    lookingAhead,

    // State
    isEditing,
    isSaving,
    save,
  }
}
