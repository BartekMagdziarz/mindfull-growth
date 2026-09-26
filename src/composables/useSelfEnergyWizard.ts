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
  const { locale, gender } = useT()

  // Step management
  const currentStep = ref<SelfEnergyStep>('check-in')

  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Ratings
  const ratings = ref<Record<SelfEnergyQuality, number>>(createEmptyRatings())

  const allRated = computed(() => {
    return ALL_QUALITIES.every((q) => ratings.value[q] > 0)
  })

  const lowestRating = computed(() => {
    const rated = ALL_QUALITIES.map((q) => ratings.value[q]).filter((v) => v > 0)
    return rated.length ? Math.min(...rated) : 0
  })

  /** Every C sharing the lowest rating, in wheel order. */
  const tiedLowest = computed<SelfEnergyQuality[]>(() =>
    lowestRating.value ? ALL_QUALITIES.filter((q) => ratings.value[q] === lowestRating.value) : [],
  )

  /** With several C's tied, the user picks which one is today's gap. */
  const chosenGap = ref<SelfEnergyQuality | null>(null)

  const lowestQuality = computed<SelfEnergyQuality>(() => {
    if (chosenGap.value && tiedLowest.value.includes(chosenGap.value)) return chosenGap.value
    return tiedLowest.value[0] ?? 'calm'
  })

  /** All eight rated 4–5: there is no gap to work on today. */
  const allHigh = computed(() => allRated.value && lowestRating.value >= 4)

  /** Skip the micro-practice (offered when all C's are high). */
  const skipMicroPractice = ref(false)

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
      if (skipMicroPractice.value) {
        currentStep.value = 'save'
        return
      }
    }

    currentStep.value = STEP_ORDER[idx + 1]
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx <= 0) return
    if (currentStep.value === 'save' && skipMicroPractice.value) {
      currentStep.value = 'gap'
      return
    }
    currentStep.value = STEP_ORDER[idx - 1]
  }

  function goToStep(step: SelfEnergyStep) {
    currentStep.value = step
  }

  // LLM trend review
  async function requestTrendReview(options: { useProfile?: boolean } = {}) {
    if (!selfEnergyStore.hasEnoughForReview) return
    isLoadingReview.value = true
    try {
      trendReview.value = await reviewSelfEnergyTrends({
        checkIns: selfEnergyStore.checkIns,
        trailheadEntries: trailheadStore.entries,
        parts: partStore.sortedParts,
        locale: locale.value,
        gender: gender.value,
        useProfile: options.useProfile ?? false,
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
        microPracticeType: skipMicroPractice.value ? undefined : microPracticeType.value,
        microPracticeNotes: skipMicroPractice.value ? undefined : microPracticeNotes.value.trim() || undefined,
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
    chosenGap.value = null
    skipMicroPractice.value = false
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
    tiedLowest,
    chosenGap,
    allHigh,
    skipMicroPractice,

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
