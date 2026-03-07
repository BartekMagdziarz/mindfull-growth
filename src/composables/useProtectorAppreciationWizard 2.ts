import { ref, computed } from 'vue'
import type {
  CreateIFSProtectorAppreciationPayload,
  IFSProtectorBehavior,
  IFSPart,
} from '@/domain/exercises'
import { useIFSProtectorAppreciationStore } from '@/stores/ifsProtectorAppreciation.store'
import { generateProtectorResponse } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type ProtectorAppreciationStep =
  | 'select-protector'
  | 'understand-job'
  | 'write-letter'
  | 'part-response'
  | 'commitment'
  | 'check-in'
  | 'summary'

const STEP_ORDER: ProtectorAppreciationStep[] = [
  'select-protector',
  'understand-job',
  'write-letter',
  'part-response',
  'commitment',
  'check-in',
  'summary',
]

export function useProtectorAppreciationWizard() {
  const store = useIFSProtectorAppreciationStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<ProtectorAppreciationStep>('select-protector')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Part selection
  const partId = ref<string | null>(null)

  // Understand job
  const activationTriggers = ref('')
  const behaviors = ref<IFSProtectorBehavior[]>([])
  const customBehaviors = ref<string[]>([])
  const workloadRating = ref(5)

  // Letter
  const appreciationLetter = ref('')

  // Response
  const partResponse = ref('')
  const responseMode = ref<'ai' | 'self' | null>(null)
  const llmAssistUsed = ref(false)
  const isLoadingResponse = ref(false)
  const llmError = ref<string | null>(null)

  // Commitment
  const commitment = ref('')

  // Check-in
  const checkInFrequency = ref<'weekly' | 'biweekly' | 'monthly' | null>(null)

  // Notes
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'select-protector':
        return partId.value !== null
      case 'understand-job':
        return activationTriggers.value.trim().length > 0 && behaviors.value.length > 0
      case 'write-letter':
        return appreciationLetter.value.trim().length > 0
      case 'part-response':
        return responseMode.value !== null &&
          (responseMode.value === 'ai' ? partResponse.value.length > 0 : partResponse.value.trim().length > 0)
      case 'commitment':
        return true
      case 'check-in':
        return true
      case 'summary':
        return true
      default:
        return false
    }
  })

  function nextStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx >= STEP_ORDER.length - 1) return
    currentStep.value = STEP_ORDER[idx + 1]
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx <= 0) return
    currentStep.value = STEP_ORDER[idx - 1]
  }

  function goToStep(step: ProtectorAppreciationStep) {
    currentStep.value = step
  }

  // Behavior toggle
  function toggleBehavior(behavior: IFSProtectorBehavior) {
    const idx = behaviors.value.indexOf(behavior)
    if (idx === -1) {
      behaviors.value.push(behavior)
    } else {
      behaviors.value.splice(idx, 1)
    }
  }

  function addCustomBehavior(behavior: string) {
    if (behavior.trim() && !customBehaviors.value.includes(behavior.trim())) {
      customBehaviors.value.push(behavior.trim())
      if (!behaviors.value.includes('custom')) {
        behaviors.value.push('custom')
      }
    }
  }

  function removeCustomBehavior(behavior: string) {
    customBehaviors.value = customBehaviors.value.filter((b) => b !== behavior)
    if (!customBehaviors.value.length) {
      behaviors.value = behaviors.value.filter((b) => b !== 'custom')
    }
  }

  // LLM response generation
  async function generateResponse(part: IFSPart) {
    isLoadingResponse.value = true
    llmError.value = null
    try {
      const allBehaviors = [
        ...behaviors.value.filter((b) => b !== 'custom'),
        ...customBehaviors.value,
      ]
      const response = await generateProtectorResponse({
        part,
        appreciationLetter: appreciationLetter.value,
        behaviors: allBehaviors,
        locale: locale.value,
      })
      partResponse.value = response
      llmAssistUsed.value = true
    } catch (err) {
      llmError.value = err instanceof Error ? err.message : 'Failed to generate response'
      console.error('Protector response error:', err)
    } finally {
      isLoadingResponse.value = false
    }
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      const payload: CreateIFSProtectorAppreciationPayload = {
        partId: partId.value!,
        activationTriggers: activationTriggers.value.trim(),
        behaviors: [...behaviors.value],
        customBehaviors: customBehaviors.value.length ? [...customBehaviors.value] : undefined,
        workloadRating: workloadRating.value,
        appreciationLetter: appreciationLetter.value.trim(),
        partResponse: partResponse.value.trim() || undefined,
        commitment: commitment.value.trim() || undefined,
        checkInFrequency: checkInFrequency.value ?? undefined,
        llmAssistUsed: llmAssistUsed.value,
        notes: notes.value.trim() || undefined,
      }
      await store.createAppreciation(payload)
      reset()
    } catch (err) {
      console.error('Error saving protector appreciation:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'select-protector'
    partId.value = null
    activationTriggers.value = ''
    behaviors.value = []
    customBehaviors.value = []
    workloadRating.value = 5
    appreciationLetter.value = ''
    partResponse.value = ''
    responseMode.value = null
    llmAssistUsed.value = false
    isLoadingResponse.value = false
    llmError.value = null
    commitment.value = ''
    checkInFrequency.value = null
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

    // Part
    partId,

    // Understand job
    activationTriggers,
    behaviors,
    customBehaviors,
    workloadRating,
    toggleBehavior,
    addCustomBehavior,
    removeCustomBehavior,

    // Letter
    appreciationLetter,

    // Response
    partResponse,
    responseMode,
    llmAssistUsed,
    isLoadingResponse,
    llmError,
    generateResponse,

    // Commitment
    commitment,

    // Check-in
    checkInFrequency,

    // Notes
    notes,

    // Saving
    isSaving,
    save,
  }
}
