import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { WeekRef } from '@/domain/period'
import type { WeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { getWeeklyReflectionDataBundle } from '@/services/reflectionDataQueries'
import { useStructuredReflectionStore } from '@/stores/structuredReflection.store'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CreateWeeklyReflectionPayload } from '@/domain/reflection'

export type WeeklyReflectionStep = 'review' | 'ratings' | 'prompts' | 'journal' | 'ahead'

const STEP_ORDER: WeeklyReflectionStep[] = ['review', 'ratings', 'prompts', 'journal', 'ahead']

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

  // Dimension ratings (1-5, null = not rated)
  const moodRating = ref<number | null>(null)
  const energyRating = ref<number | null>(null)
  const focusRating = ref<number | null>(null)
  const socialConnectionRating = ref<number | null>(null)
  const stressLevelRating = ref<number | null>(null)

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
      case 'ratings':
        return (
          moodRating.value !== null ||
          energyRating.value !== null ||
          focusRating.value !== null ||
          socialConnectionRating.value !== null ||
          stressLevelRating.value !== null
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
      moodRating: moodRating.value,
      energyRating: energyRating.value,
      focusRating: focusRating.value,
      socialConnectionRating: socialConnectionRating.value,
      stressLevelRating: stressLevelRating.value,
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
      if (data.moodRating != null) moodRating.value = data.moodRating
      if (data.energyRating != null) energyRating.value = data.energyRating
      if (data.focusRating != null) focusRating.value = data.focusRating
      if (data.socialConnectionRating != null)
        socialConnectionRating.value = data.socialConnectionRating
      if (data.stressLevelRating != null) stressLevelRating.value = data.stressLevelRating
      if (data.promptResponses) promptResponses.value = data.promptResponses
      if (data.freeformReflection) freeformReflection.value = data.freeformReflection
      if (data.lookingAhead) lookingAhead.value = data.lookingAhead
    } catch {
      // Invalid draft, ignore
    }
  }

  function hydrateFromExisting(existing: {
    moodRating: number | null
    energyRating: number | null
    focusRating: number | null
    socialConnectionRating: number | null
    stressLevelRating: number | null
    promptResponses: Record<string, string>
    freeformReflection: string
    lookingAhead: string
  }) {
    moodRating.value = existing.moodRating
    energyRating.value = existing.energyRating
    focusRating.value = existing.focusRating
    socialConnectionRating.value = existing.socialConnectionRating
    stressLevelRating.value = existing.stressLevelRating
    promptResponses.value = { ...existing.promptResponses }
    freeformReflection.value = existing.freeformReflection
    lookingAhead.value = existing.lookingAhead
  }

  // Watch fields for auto-save
  watch(
    [
      moodRating,
      energyRating,
      focusRating,
      socialConnectionRating,
      stressLevelRating,
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
        moodRating: moodRating.value,
        energyRating: energyRating.value,
        focusRating: focusRating.value,
        socialConnectionRating: socialConnectionRating.value,
        stressLevelRating: stressLevelRating.value,
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

    // Ratings
    moodRating,
    energyRating,
    focusRating,
    socialConnectionRating,
    stressLevelRating,

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
