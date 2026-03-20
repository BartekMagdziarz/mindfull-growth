import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { MonthRef } from '@/domain/period'
import type { MonthlyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getMonthlyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateMonthlyReflectionPayload } from '@/domain/reflection'

export type MonthlyReflectionStep =
  | 'review'
  | 'weekly-recap'
  | 'ratings'
  | 'prompts'
  | 'journal'
  | 'ahead'

const STEP_ORDER: MonthlyReflectionStep[] = [
  'review',
  'weekly-recap',
  'ratings',
  'prompts',
  'journal',
  'ahead',
]

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
  const purposeRating = ref<number | null>(null)
  const motivationRating = ref<number | null>(null)
  const growthRating = ref<number | null>(null)
  const lifeSatisfactionRating = ref<number | null>(null)
  const alignmentRating = ref<number | null>(null)

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
      case 'weekly-recap':
        return true
      case 'ratings':
        return (
          purposeRating.value !== null ||
          motivationRating.value !== null ||
          growthRating.value !== null ||
          lifeSatisfactionRating.value !== null ||
          alignmentRating.value !== null
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
      purposeRating: purposeRating.value,
      motivationRating: motivationRating.value,
      growthRating: growthRating.value,
      lifeSatisfactionRating: lifeSatisfactionRating.value,
      alignmentRating: alignmentRating.value,
      promptResponses: promptResponses.value,
      freeformReflection: freeformReflection.value,
      lookingAhead: lookingAhead.value,
    }
  }

  function hydrateFromDraft(raw: string) {
    try {
      const data = JSON.parse(raw)
      if (data.currentStep && STEP_ORDER.includes(data.currentStep)) {
        currentStep.value = data.currentStep
      }
      if (data.purposeRating != null) purposeRating.value = data.purposeRating
      if (data.motivationRating != null) motivationRating.value = data.motivationRating
      if (data.growthRating != null) growthRating.value = data.growthRating
      if (data.lifeSatisfactionRating != null)
        lifeSatisfactionRating.value = data.lifeSatisfactionRating
      if (data.alignmentRating != null) alignmentRating.value = data.alignmentRating
      if (data.promptResponses) promptResponses.value = data.promptResponses
      if (data.freeformReflection) freeformReflection.value = data.freeformReflection
      if (data.lookingAhead) lookingAhead.value = data.lookingAhead
    } catch {
      // Invalid draft, ignore
    }
  }

  function hydrateFromExisting(existing: {
    purposeRating: number | null
    motivationRating: number | null
    growthRating: number | null
    lifeSatisfactionRating: number | null
    alignmentRating: number | null
    promptResponses: Record<string, string>
    freeformReflection: string
    lookingAhead: string
  }) {
    purposeRating.value = existing.purposeRating
    motivationRating.value = existing.motivationRating
    growthRating.value = existing.growthRating
    lifeSatisfactionRating.value = existing.lifeSatisfactionRating
    alignmentRating.value = existing.alignmentRating
    promptResponses.value = { ...existing.promptResponses }
    freeformReflection.value = existing.freeformReflection
    lookingAhead.value = existing.lookingAhead
  }

  // Watch fields for auto-save
  watch(
    [
      purposeRating,
      motivationRating,
      growthRating,
      lifeSatisfactionRating,
      alignmentRating,
      promptResponses,
      freeformReflection,
      lookingAhead,
    ],
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
        purposeRating: purposeRating.value,
        motivationRating: motivationRating.value,
        growthRating: growthRating.value,
        lifeSatisfactionRating: lifeSatisfactionRating.value,
        alignmentRating: alignmentRating.value,
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
    purposeRating,
    motivationRating,
    growthRating,
    lifeSatisfactionRating,
    alignmentRating,

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
