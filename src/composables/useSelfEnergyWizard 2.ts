import { ref, computed } from 'vue'
import type {
  SelfEnergyQuality,
  CreateIFSSelfEnergyPayload,
} from '@/domain/exercises'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { reviewSelfEnergyTrends } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type SelfEnergyStep = 'check-in' | 'gap' | 'micro-practice' | 'save'

const STEP_ORDER: SelfEnergyStep[] = ['check-in', 'gap', 'micro-practice', 'save']

const ALL_QUALITIES: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

function createEmptyRatings(): Record<SelfEnergyQuality, number> {
  const r = {} as Record<SelfEnergyQuality, number>
  for (const q of ALL_QUALITIES) {
    r[q] = 0
  }
  return r
}

export function useSelfEnergyWizard() {
  const selfEnergyStore = useIFSSelfEnergyStore()
  const partStore = useIFSPartStore()
  const trailheadStore = useIFSTrailheadStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<SelfEnergyStep>('check-in')

  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Ratings
  const ratings = ref<Record<SelfEnergyQuality, number>>(createEmptyRatings())

  const allRated = computed(() => {
    return ALL_QUALITIES.every((q) => ratings.value[q] > 0)
  })

  const lowestQuality = computed<SelfEnergyQuality>(() => {
    let lowest: SelfEnergyQuality = 'calm'
    let lowestVal = Infinity
    for (const q of ALL_QUALITIES) {
      const val = ratings.value[q]
      if (val > 0 && val < lowestVal) {
        lowestVal = val
        lowest = q
      }
    }
    return lowest
  })

  // Part identification
  const identifiedPartId = ref<string | null>(null)

  // Micro-practice
  const microPracticeType = ref<SelfEnergyQuality>('calm')
  const microPracticeNotes = ref('')

  // Notes
  const notes = ref('')

  // LLM
  const trendReview = ref<string | null>(null)
  const isLoadingReview = ref(false)

  // Saving
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'check-in':
        return allRated.value
      case 'gap':
        return true
      case 'micro-practice':
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

    // When advancing from gap, set micro-practice type to lowest quality
    if (currentStep.value === 'gap') {
      microPracticeType.value = lowestQuality.value
    }

    currentStep.value = STEP_ORDER[idx + 1]
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx > 0) {
      currentStep.value = STEP_ORDER[idx - 1]
    }
  }

  function goToStep(step: SelfEnergyStep) {
    currentStep.value = step
  }

  // LLM trend review
  async function requestTrendReview() {
    if (!selfEnergyStore.hasEnoughForReview) return
    isLoadingReview.value = true
    try {
      trendReview.value = await reviewSelfEnergyTrends({
        checkIns: selfEnergyStore.checkIns,
        trailheadEntries: trailheadStore.entries,
        parts: partStore.sortedParts,
        locale: locale.value,
      })
    } catch (err) {
      console.error('Error reviewing self-energy trends:', err)
      trendReview.value = null
    } finally {
      isLoadingReview.value = false
    }
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      const payload: CreateIFSSelfEnergyPayload = {
        ratings: { ...ratings.value },
        lowestQuality: lowestQuality.value,
        identifiedPartId: identifiedPartId.value ?? undefined,
        microPracticeType: microPracticeType.value,
        microPracticeNotes: microPracticeNotes.value.trim() || undefined,
        notes: notes.value.trim() || undefined,
      }

      await selfEnergyStore.createCheckIn(payload)
      reset()
    } catch (err) {
      console.error('Error saving self-energy check-in:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'check-in'
    ratings.value = createEmptyRatings()
    identifiedPartId.value = null
    microPracticeType.value = 'calm'
    microPracticeNotes.value = ''
    notes.value = ''
    trendReview.value = null
    isLoadingReview.value = false
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

    // Ratings
    ratings,
    allRated,
    lowestQuality,

    // Part
    identifiedPartId,

    // Micro-practice
    microPracticeType,
    microPracticeNotes,

    // Notes
    notes,

    // LLM
    trendReview,
    isLoadingReview,
    requestTrendReview,

    // Saving
    isSaving,
    save,
  }
}
