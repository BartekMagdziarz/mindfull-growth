import { ref, computed } from 'vue'
import type {
  CreateIFSDirectAccessPayload,
  IFSDialogueMessage,
  IFSInsight,
  IFSPart,
} from '@/domain/exercises'

type IFSInsightTag = IFSInsight['tag']
import { useIFSDirectAccessStore } from '@/stores/ifsDirectAccess.store'
import { directAccessDialogueTurn } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type DirectAccessStep =
  | 'part-select'
  | 'self-check'
  | 'dialogue'
  | 'summary'
  | 'save'

const STEP_ORDER: DirectAccessStep[] = [
  'part-select',
  'self-check',
  'dialogue',
  'summary',
  'save',
]

export function useDirectAccessWizard() {
  const store = useIFSDirectAccessStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<DirectAccessStep>('part-select')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Part selection
  const partId = ref<string | null>(null)

  // Self-check
  const selfCheckPassed = ref(false)

  // Dialogue
  const messages = ref<IFSDialogueMessage[]>([])
  const insights = ref<IFSInsight[]>([])
  const isLoadingResponse = ref(false)
  const llmError = ref<string | null>(null)

  // Summary
  const summary = ref('')
  const partJobDiscovered = ref('')
  const partFearDiscovered = ref('')
  const partNeedDiscovered = ref('')
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'part-select':
        return partId.value !== null
      case 'self-check':
        return selfCheckPassed.value
      case 'dialogue':
        return messages.value.length >= 2
      case 'summary':
        return true
      case 'save':
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

  function goToStep(step: DirectAccessStep) {
    currentStep.value = step
  }

  // Dialogue methods
  async function sendMessage(content: string, part: IFSPart) {
    const userMsg: IFSDialogueMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(userMsg)

    isLoadingResponse.value = true
    llmError.value = null
    try {
      const response = await directAccessDialogueTurn({
        part,
        userMessage: content,
        previousMessages: messages.value.slice(0, -1),
        locale: locale.value,
      })
      const partMsg: IFSDialogueMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      }
      messages.value.push(partMsg)
    } catch (err) {
      llmError.value = err instanceof Error ? err.message : 'Failed to get response'
      console.error('Direct access dialogue error:', err)
    } finally {
      isLoadingResponse.value = false
    }
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
      const payload: CreateIFSDirectAccessPayload = {
        partId: partId.value!,
        selfCheckPassed: selfCheckPassed.value,
        messages: [...messages.value],
        insights: [...insights.value],
        summary: summary.value.trim() || undefined,
        partJobDiscovered: partJobDiscovered.value.trim() || undefined,
        partFearDiscovered: partFearDiscovered.value.trim() || undefined,
        partNeedDiscovered: partNeedDiscovered.value.trim() || undefined,
        llmAssistUsed: true,
        notes: notes.value.trim() || undefined,
      }
      await store.createSession(payload)
      reset()
    } catch (err) {
      console.error('Error saving direct access session:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'part-select'
    partId.value = null
    selfCheckPassed.value = false
    messages.value = []
    insights.value = []
    isLoadingResponse.value = false
    llmError.value = null
    summary.value = ''
    partJobDiscovered.value = ''
    partFearDiscovered.value = ''
    partNeedDiscovered.value = ''
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

    // Self-check
    selfCheckPassed,

    // Dialogue
    messages,
    insights,
    isLoadingResponse,
    llmError,
    sendMessage,
    addInsight,
    removeInsight,

    // Summary
    summary,
    partJobDiscovered,
    partFearDiscovered,
    partNeedDiscovered,
    notes,

    // Saving
    isSaving,
    save,
  }
}
