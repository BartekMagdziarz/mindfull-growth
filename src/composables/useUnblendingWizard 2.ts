import { ref, computed } from 'vue'
import type { CreateIFSUnblendingPayload } from '@/domain/exercises'
import { useIFSUnblendingStore } from '@/stores/ifsUnblending.store'

export type UnblendingStep =
  | 'check-in'
  | 'awareness'
  | 'magic-question'
  | 'secondary-check'
  | 'stepping-back'
  | 'closing'
  | 'post-check'

const STEP_ORDER: UnblendingStep[] = [
  'check-in',
  'awareness',
  'magic-question',
  'secondary-check',
  'stepping-back',
  'closing',
  'post-check',
]

export function useUnblendingWizard() {
  const unblendingStore = useIFSUnblendingStore()

  // Step management
  const currentStep = ref<UnblendingStep>('check-in')

  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Emotion tracking
  const beforeEmotionIds = ref<string[]>([])
  const afterEmotionIds = ref<string[]>([])

  // Part references
  const blendedPartId = ref<string | null>(null)
  const secondaryPartId = ref<string | null>(null)

  // Practice state
  const selfEnergyPresent = ref<boolean | null>(null)
  const shiftRating = ref(5)
  const breathingCompleted = ref(false)
  const shiftNotes = ref('')
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'check-in':
        return true
      case 'awareness':
        return true
      case 'magic-question':
        return selfEnergyPresent.value !== null
      case 'secondary-check':
        return true
      case 'stepping-back':
        return true
      case 'closing':
        return shiftRating.value >= 1
      case 'post-check':
        return true
      default:
        return false
    }
  })

  function nextStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx >= STEP_ORDER.length - 1) return

    // If Self-energy is present at magic-question, skip secondary-check
    if (currentStep.value === 'magic-question' && selfEnergyPresent.value === true) {
      currentStep.value = 'stepping-back'
      return
    }

    currentStep.value = STEP_ORDER[idx + 1]
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx <= 0) return

    // If coming back from stepping-back and Self-energy was present, skip secondary-check
    if (currentStep.value === 'stepping-back' && selfEnergyPresent.value === true) {
      currentStep.value = 'magic-question'
      return
    }

    currentStep.value = STEP_ORDER[idx - 1]
  }

  function goToStep(step: UnblendingStep) {
    currentStep.value = step
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      const payload: CreateIFSUnblendingPayload = {
        beforeEmotionIds: [...beforeEmotionIds.value],
        afterEmotionIds: [...afterEmotionIds.value],
        blendedPartId: blendedPartId.value ?? undefined,
        secondaryPartId: secondaryPartId.value ?? undefined,
        selfEnergyPresent: selfEnergyPresent.value === true,
        shiftRating: shiftRating.value,
        breathingCompleted: breathingCompleted.value,
        shiftNotes: shiftNotes.value.trim() || undefined,
        notes: notes.value.trim() || undefined,
      }

      await unblendingStore.createSession(payload)
      reset()
    } catch (err) {
      console.error('Error saving unblending session:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'check-in'
    beforeEmotionIds.value = []
    afterEmotionIds.value = []
    blendedPartId.value = null
    secondaryPartId.value = null
    selfEnergyPresent.value = null
    shiftRating.value = 5
    breathingCompleted.value = false
    shiftNotes.value = ''
    notes.value = ''
    isSaving.value = false
  }

  return {
    // Step
    currentStep,
    stepIndex,
    canAdvance,
    nextStep,
    prevStep,
    goToStep,

    // Emotions
    beforeEmotionIds,
    afterEmotionIds,

    // Parts
    blendedPartId,
    secondaryPartId,

    // Practice state
    selfEnergyPresent,
    shiftRating,
    breathingCompleted,
    shiftNotes,
    notes,

    // Saving
    isSaving,
    save,
  }
}
