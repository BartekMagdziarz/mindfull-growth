import { ref, computed } from 'vue'
import type {
  CreateIFSPartsDialoguePayload,
  IFSDialogueMessage,
  IFSInsight,
  IFSPart,
} from '@/domain/exercises'
import { useIFSPartsDialogueStore } from '@/stores/ifsPartsDialogue.store'
import { suggestPartDialogueResponse } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

type IFSInsightTag = IFSInsight['tag']

export type PartsDialogueStep =
  | 'part-select'
  | 'intention'
  | 'dialogue'
  | 'insights'
  | 'summary'

const STEP_ORDER: PartsDialogueStep[] = [
  'part-select',
  'intention',
  'dialogue',
  'insights',
  'summary',
]

export function usePartsDialogueWizard() {
  const store = useIFSPartsDialogueStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<PartsDialogueStep>('part-select')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Part selection
  const partId = ref<string | null>(null)

  // Intention
  const intention = ref('')

  // Dialogue
  const messages = ref<IFSDialogueMessage[]>([])
  const currentSpeaker = ref<'self' | 'part'>('self')
  const insights = ref<IFSInsight[]>([])

  // LLM assist
  const llmAssistUsed = ref(false)
  const isLoadingAssist = ref(false)
  const llmSuggestion = ref('')
  const llmError = ref<string | null>(null)

  // Summary
  const summary = ref('')
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'part-select':
        return partId.value !== null
      case 'intention':
        return intention.value.trim().length > 0
      case 'dialogue':
        return messages.value.length >= 2
      case 'insights':
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

  function goToStep(step: PartsDialogueStep) {
    currentStep.value = step
  }

  // Dialogue methods
  function addMessage(content: string) {
    messages.value.push({
      role: currentSpeaker.value === 'self' ? 'user' : 'assistant',
      content,
      timestamp: new Date().toISOString(),
    })
    // Toggle speaker after each message
    currentSpeaker.value = currentSpeaker.value === 'self' ? 'part' : 'self'
  }

  async function requestAssist(part: IFSPart) {
    isLoadingAssist.value = true
    llmError.value = null
    llmSuggestion.value = ''
    try {
      const response = await suggestPartDialogueResponse({
        part,
        dialogue: [...messages.value],
        intention: intention.value,
        locale: locale.value,
      })
      llmSuggestion.value = response
    } catch (err) {
      llmError.value = err instanceof Error ? err.message : 'Failed to get suggestion'
      console.error('Parts dialogue assist error:', err)
    } finally {
      isLoadingAssist.value = false
    }
  }

  function acceptSuggestion() {
    if (!llmSuggestion.value) return
    // Ensure speaker is set to 'part' for the suggestion
    currentSpeaker.value = 'part'
    addMessage(llmSuggestion.value)
    llmAssistUsed.value = true
    llmSuggestion.value = ''
  }

  function discardSuggestion() {
    llmSuggestion.value = ''
  }

  // Insight methods
  function addInsight(content: string, tag: IFSInsightTag) {
    insights.value.push({
      id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content,
      tag,
      createdAt: new Date().toISOString(),
    })
  }

  function removeInsight(id: string) {
    insights.value = insights.value.filter((i) => i.id !== id)
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      const payload: CreateIFSPartsDialoguePayload = {
        partId: partId.value!,
        intention: intention.value.trim(),
        messages: [...messages.value],
        insights: [...insights.value],
        summary: summary.value.trim() || undefined,
        llmAssistUsed: llmAssistUsed.value,
        notes: notes.value.trim() || undefined,
      }
      await store.createDialogue(payload)
      reset()
    } catch (err) {
      console.error('Error saving parts dialogue:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'part-select'
    partId.value = null
    intention.value = ''
    messages.value = []
    currentSpeaker.value = 'self'
    insights.value = []
    llmAssistUsed.value = false
    isLoadingAssist.value = false
    llmSuggestion.value = ''
    llmError.value = null
    summary.value = ''
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

    // Intention
    intention,

    // Dialogue
    messages,
    currentSpeaker,
    addMessage,

    // LLM assist
    llmAssistUsed,
    isLoadingAssist,
    llmSuggestion,
    llmError,
    requestAssist,
    acceptSuggestion,
    discardSuggestion,

    // Insights
    insights,
    addInsight,
    removeInsight,

    // Summary
    summary,
    notes,

    // Saving
    isSaving,
    save,
  }
}
