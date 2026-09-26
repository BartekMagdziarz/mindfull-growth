import { ref, computed } from 'vue'
import type {
  IFSBodyLocation,
  IFSExilePostState,
  CreateIFSExileWitnessingPayload,
} from '@/domain/exercises'
import { useIFSExileWitnessingStore } from '@/stores/ifsExileWitnessing.store'
import { enrichPartFromDiscoveries } from '@/services/ifsPartEnrichment'

export type ExileWitnessingStep =
  | 'safety'
  | 'protector-check'
  | 'approach'
  | 'self-check'
  | 'witnessing'
  | 'compassion'
  | 'closing'
  | 'reflection'

const STEP_ORDER: ExileWitnessingStep[] = [
  'safety',
  'protector-check',
  'approach',
  'self-check',
  'witnessing',
  'compassion',
  'closing',
  'reflection',
]

export function useExileWitnessingWizard() {
  const store = useIFSExileWitnessingStore()

  // Step management
  const currentStep = ref<ExileWitnessingStep>('safety')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Safety
  const safetyAcknowledged = ref(false)

  // Protector Check
  const protectorPartIds = ref<string[]>([])
  const protectorPermission = ref<'okay' | 'nervous-but-willing' | 'blocking' | null>(null)

  // Approach
  const exilePartId = ref<string | null>(null)
  const bodyLocation = ref<IFSBodyLocation | null>(null)
  const feltAge = ref<number | null>(null)
  const emotionIds = ref<string[]>([])
  const emotionFamilyIds = ref<string[]>([])

  // Self check (magic question toward the exile): null = unanswered
  const selfCheckPassed = ref<boolean | null>(null)

  // Witnessing
  const exileMessage = ref('')
  const exileBelief = ref('')

  // Compassion
  const compassionMessage = ref('')

  // Closing
  const postSessionState = ref<IFSExilePostState | null>(null)
  const promise = ref('')

  // "Stop here" — grounding exit that still lets the session be closed and saved
  const stoppedEarly = ref(false)

  // Reflection step: copy felt age / burden / body to the exile's card (empty fields only)
  const updatePartCard = ref(true)

  // Reflection
  const reflection = ref('')
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'safety':
        return safetyAcknowledged.value
      case 'protector-check':
        return protectorPermission.value !== null && protectorPermission.value !== 'blocking'
      case 'approach':
        return exilePartId.value !== null && bodyLocation.value !== null && (emotionIds.value.length > 0 || emotionFamilyIds.value.length > 0)
      case 'self-check':
        return selfCheckPassed.value === true
      case 'witnessing':
        return exileMessage.value.trim().length > 0
      case 'compassion':
        return compassionMessage.value.trim().length > 0
      case 'closing':
        return postSessionState.value !== null
      case 'reflection':
        return true
      default:
        return false
    }
  })

  const isBlocking = computed(() => protectorPermission.value === 'blocking')

  /** Steps during which the user may press "stop here" (only once an exile is chosen). */
  const canStopEarly = computed(
    () =>
      ['approach', 'self-check', 'witnessing', 'compassion'].includes(currentStep.value) &&
      exilePartId.value !== null &&
      bodyLocation.value !== null,
  )

  /** Ground, then jump to closing so the session can still be honoured and saved. */
  function stopEarly() {
    stoppedEarly.value = true
    currentStep.value = 'closing'
  }

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

  function goToStep(step: ExileWitnessingStep) {
    currentStep.value = step
  }

  // Protector multi-select
  function toggleProtector(partId: string) {
    const idx = protectorPartIds.value.indexOf(partId)
    if (idx === -1) {
      protectorPartIds.value.push(partId)
    } else {
      protectorPartIds.value.splice(idx, 1)
    }
  }

  function insertPromiseChip(text: string) {
    if (promise.value.trim()) {
      promise.value += ' ' + text
    } else {
      promise.value = text
    }
  }

  // Compassion chip insert
  function insertCompassionChip(text: string) {
    if (compassionMessage.value.trim()) {
      compassionMessage.value += ' ' + text
    } else {
      compassionMessage.value = text
    }
  }

  // Save
  async function save() {
    if (!exilePartId.value || !bodyLocation.value || !postSessionState.value) return
    isSaving.value = true
    try {
      const payload: CreateIFSExileWitnessingPayload = {
        exilePartId: exilePartId.value,
        protectorPartIds: [...protectorPartIds.value],
        protectorPermission: protectorPermission.value as 'okay' | 'nervous-but-willing' | 'blocking',
        bodyLocation: bodyLocation.value,
        feltAge: feltAge.value ?? undefined,
        emotionIds: [...emotionIds.value],
        emotionFamilyIds: [...emotionFamilyIds.value],
        exileMessage: exileMessage.value.trim(),
        exileBelief: exileBelief.value.trim(),
        compassionMessage: compassionMessage.value.trim(),
        postSessionState: postSessionState.value,
        safetyAcknowledged: safetyAcknowledged.value,
        selfCheckPassed: selfCheckPassed.value ?? undefined,
        promise: promise.value.trim() || undefined,
        stoppedEarly: stoppedEarly.value || undefined,
        reflection: reflection.value.trim() || undefined,
        notes: notes.value.trim() || undefined,
      }
      await store.createWitnessing(payload)
      if (updatePartCard.value) {
        await enrichPartFromDiscoveries(payload.exilePartId, {
          feltAge: payload.feltAge,
          burden: payload.exileBelief,
          bodyLocations: [payload.bodyLocation],
        })
      }
      reset()
    } catch (err) {
      console.error('Error saving exile witnessing:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'safety'
    safetyAcknowledged.value = false
    protectorPartIds.value = []
    protectorPermission.value = null
    exilePartId.value = null
    bodyLocation.value = null
    feltAge.value = null
    emotionIds.value = []
    emotionFamilyIds.value = []
    exileMessage.value = ''
    exileBelief.value = ''
    compassionMessage.value = ''
    postSessionState.value = null
    selfCheckPassed.value = null
    promise.value = ''
    stoppedEarly.value = false
    updatePartCard.value = true
    reflection.value = ''
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

    // Safety
    safetyAcknowledged,

    // Protector Check
    protectorPartIds,
    protectorPermission,
    isBlocking,
    toggleProtector,

    // Approach
    exilePartId,
    bodyLocation,
    feltAge,
    emotionIds,
    emotionFamilyIds,

    // Self check
    selfCheckPassed,

    // Witnessing
    exileMessage,
    exileBelief,

    // Compassion
    compassionMessage,
    insertCompassionChip,

    // Closing
    postSessionState,
    promise,
    insertPromiseChip,

    // Stop early
    canStopEarly,
    stoppedEarly,
    stopEarly,

    // Part card write-back
    updatePartCard,

    // Reflection
    reflection,
    notes,

    // Saving
    isSaving,
    save,
  }
}
