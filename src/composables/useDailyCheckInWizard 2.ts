import { ref, computed } from 'vue'
import type {
  IFSDailyCheckInType,
  IFSActivePartEntry,
  IFSSelfLeadershipRating,
  SelfEnergyQuality,
  CreateIFSDailyCheckInPayload,
} from '@/domain/exercises'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { generateWeeklySummary } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type DailyCheckInStep = 'select-practice' | 'practice' | 'save'

const STEP_ORDER: DailyCheckInStep[] = ['select-practice', 'practice', 'save']

export function useDailyCheckInWizard() {
  const checkInStore = useIFSDailyCheckInStore()
  const partStore = useIFSPartStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<DailyCheckInStep>('select-practice')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Practice type
  const practiceType = ref<IFSDailyCheckInType | null>(null)

  // Weather Report state
  const activeParts = ref<IFSActivePartEntry[]>([])

  // Gratitude state
  const gratitudePartId = ref<string | null>(null)
  const gratitudeNote = ref('')

  // Self-Energy Moment state
  const selfEnergyQuality = ref<SelfEnergyQuality | null>(null)
  const microPracticeNotes = ref('')

  // Evening Reflection state
  const eveningReflection = ref('')
  const selfLeadershipRating = ref<IFSSelfLeadershipRating | null>(null)
  const appreciationNote = ref('')

  // Shared
  const notes = ref('')

  // LLM
  const weeklySummary = ref<string | null>(null)
  const isLoadingSummary = ref(false)

  // Saving
  const isSaving = ref(false)

  // Validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'select-practice':
        return practiceType.value !== null
      case 'practice':
        return validatePractice()
      case 'save':
        return true
      default:
        return false
    }
  })

  function validatePractice(): boolean {
    switch (practiceType.value) {
      case 'weather-report':
        return activeParts.value.length > 0
      case 'gratitude-to-part':
        return gratitudePartId.value !== null && gratitudeNote.value.trim().length > 0
      case 'self-energy-moment':
        return selfEnergyQuality.value !== null
      case 'evening-reflection':
        return selfLeadershipRating.value !== null
      default:
        return false
    }
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

  function goToStep(step: DailyCheckInStep) {
    currentStep.value = step
  }

  // Active parts management (Weather Report + Evening Reflection)
  function toggleActivePart(partId: string) {
    const idx = activeParts.value.findIndex((ap) => ap.partId === partId)
    if (idx === -1) {
      activeParts.value.push({ partId, intensity: 5 })
    } else {
      activeParts.value.splice(idx, 1)
    }
  }

  function updatePartIntensity(partId: string, intensity: number) {
    const entry = activeParts.value.find((ap) => ap.partId === partId)
    if (entry) {
      entry.intensity = intensity
    }
  }

  function updatePartTrigger(partId: string, triggerNote: string) {
    const entry = activeParts.value.find((ap) => ap.partId === partId)
    if (entry) {
      entry.triggerNote = triggerNote || undefined
    }
  }

  // Weekly summary
  async function requestWeeklySummary() {
    if (checkInStore.weeklyCheckInCount < 7) return
    isLoadingSummary.value = true
    try {
      weeklySummary.value = await generateWeeklySummary({
        checkIns: checkInStore.currentWeekCheckIns,
        parts: partStore.sortedParts,
        locale: locale.value,
      })
    } catch (err) {
      console.error('Error generating weekly summary:', err)
      weeklySummary.value = null
    } finally {
      isLoadingSummary.value = false
    }
  }

  // Save
  async function save() {
    if (!practiceType.value) return
    isSaving.value = true
    try {
      const payload: CreateIFSDailyCheckInPayload = {
        practiceType: practiceType.value,
        activeParts: practiceType.value === 'weather-report' || practiceType.value === 'evening-reflection'
          ? activeParts.value.length ? [...activeParts.value] : undefined
          : undefined,
        gratitudePartId: practiceType.value === 'gratitude-to-part' ? gratitudePartId.value ?? undefined : undefined,
        gratitudeNote: practiceType.value === 'gratitude-to-part' ? gratitudeNote.value.trim() || undefined : undefined,
        selfEnergyQuality: practiceType.value === 'self-energy-moment' ? selfEnergyQuality.value ?? undefined : undefined,
        eveningReflection: practiceType.value === 'evening-reflection' ? eveningReflection.value.trim() || undefined : undefined,
        selfLeadershipRating: practiceType.value === 'evening-reflection' ? selfLeadershipRating.value ?? undefined : undefined,
        appreciationNote: practiceType.value === 'evening-reflection' ? appreciationNote.value.trim() || undefined : undefined,
        notes: notes.value.trim() || undefined,
      }
      await checkInStore.createCheckIn(payload)
      reset()
    } catch (err) {
      console.error('Error saving daily check-in:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'select-practice'
    practiceType.value = null
    activeParts.value = []
    gratitudePartId.value = null
    gratitudeNote.value = ''
    selfEnergyQuality.value = null
    microPracticeNotes.value = ''
    eveningReflection.value = ''
    selfLeadershipRating.value = null
    appreciationNote.value = ''
    notes.value = ''
    weeklySummary.value = null
    isLoadingSummary.value = false
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

    // Practice type
    practiceType,

    // Weather Report
    activeParts,
    toggleActivePart,
    updatePartIntensity,
    updatePartTrigger,

    // Gratitude
    gratitudePartId,
    gratitudeNote,

    // Self-Energy Moment
    selfEnergyQuality,
    microPracticeNotes,

    // Evening Reflection
    eveningReflection,
    selfLeadershipRating,
    appreciationNote,

    // Shared
    notes,

    // LLM
    weeklySummary,
    isLoadingSummary,
    requestWeeklySummary,

    // Saving
    isSaving,
    save,
  }
}
