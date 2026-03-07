import { ref, computed } from 'vue'
import type {
  IFSBodyLocation,
  CreateIFSTrailheadPayload,
  CreateIFSPartPayload,
} from '@/domain/exercises'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { analyzeTrailheadPatterns } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type TrailheadStep =
  | 'trigger'
  | 'thoughts'
  | 'sensations'
  | 'images'
  | 'behaviors'
  | 'perception'
  | 'part-link'
  | 'reflection'

const STEP_ORDER: TrailheadStep[] = [
  'trigger',
  'thoughts',
  'sensations',
  'images',
  'behaviors',
  'perception',
  'part-link',
  'reflection',
]

export function useTrailheadWizard() {
  const trailheadStore = useIFSTrailheadStore()
  const partStore = useIFSPartStore()
  const emotionStore = useEmotionStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<TrailheadStep>('trigger')

  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Trigger capture
  const triggerDescription = ref('')
  const emotionIds = ref<string[]>([])
  const intensity = ref(5)
  const bodyLocations = ref<IFSBodyLocation[]>([])

  // TSIBP fields
  const thoughts = ref('')
  const sensations = ref('')
  const images = ref('')
  const behaviors = ref('')
  const perception = ref(5)

  // Part link
  const linkedPartId = ref<string | null>(null)
  const linkedPartIsNew = ref(false)

  // Reflection
  const reflection = ref('')
  const notes = ref('')

  // LLM
  const patternAnalysis = ref<string | null>(null)
  const isLoadingAnalysis = ref(false)

  // Saving
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'trigger':
        return triggerDescription.value.trim().length > 0 && emotionIds.value.length > 0
      case 'thoughts':
        return thoughts.value.trim().length > 0
      case 'sensations':
        return sensations.value.trim().length > 0
      case 'images':
        return true // optional step
      case 'behaviors':
        return behaviors.value.trim().length > 0
      case 'perception':
        return true
      case 'part-link':
        return true // optional
      case 'reflection':
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

  function goToStep(step: TrailheadStep) {
    currentStep.value = step
  }

  // Part creation
  async function createAndLinkPart(data: { name: string; role: CreateIFSPartPayload['role'] }) {
    const payload: CreateIFSPartPayload = {
      name: data.name,
      role: data.role,
      bodyLocations: [],
      emotionIds: [],
      lifeAreaIds: [],
    }
    const created = await partStore.createPart(payload)
    linkedPartId.value = created.id
    linkedPartIsNew.value = true
  }

  // LLM analysis
  async function requestPatternAnalysis() {
    if (!trailheadStore.hasEnoughForAnalysis) return
    isLoadingAnalysis.value = true
    try {
      const partNames: Record<string, string> = {}
      for (const part of partStore.sortedParts) {
        partNames[part.id] = part.name
      }
      const emotionNames: Record<string, string> = {}
      for (const entry of trailheadStore.entries) {
        for (const eid of entry.emotionIds) {
          if (!emotionNames[eid]) {
            const emotion = emotionStore.getEmotionById(eid)
            if (emotion) emotionNames[eid] = emotion.name
          }
        }
      }

      patternAnalysis.value = await analyzeTrailheadPatterns({
        entries: trailheadStore.entries,
        partNames,
        emotionNames,
        locale: locale.value,
      })
    } catch (err) {
      console.error('Error analyzing trailhead patterns:', err)
      patternAnalysis.value = null
    } finally {
      isLoadingAnalysis.value = false
    }
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      const payload: CreateIFSTrailheadPayload = {
        triggerDescription: triggerDescription.value.trim(),
        emotionIds: [...emotionIds.value],
        intensity: intensity.value,
        bodyLocation: bodyLocations.value[0] ?? 'chest',
        thoughts: thoughts.value.trim(),
        sensations: sensations.value.trim(),
        images: images.value.trim() || undefined,
        behaviors: behaviors.value.trim(),
        perception: perception.value,
        linkedPartId: linkedPartId.value ?? undefined,
        linkedPartIsNew: linkedPartIsNew.value || undefined,
        reflection: reflection.value.trim() || undefined,
        notes: notes.value.trim() || undefined,
      }

      await trailheadStore.createEntry(payload)
      reset()
    } catch (err) {
      console.error('Error saving trailhead entry:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'trigger'
    triggerDescription.value = ''
    emotionIds.value = []
    intensity.value = 5
    bodyLocations.value = []
    thoughts.value = ''
    sensations.value = ''
    images.value = ''
    behaviors.value = ''
    perception.value = 5
    linkedPartId.value = null
    linkedPartIsNew.value = false
    reflection.value = ''
    notes.value = ''
    patternAnalysis.value = null
    isLoadingAnalysis.value = false
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

    // Trigger
    triggerDescription,
    emotionIds,
    intensity,
    bodyLocations,

    // TSIBP
    thoughts,
    sensations,
    images,
    behaviors,
    perception,

    // Part link
    linkedPartId,
    linkedPartIsNew,
    createAndLinkPart,

    // Reflection
    reflection,
    notes,

    // LLM
    patternAnalysis,
    isLoadingAnalysis,
    requestPatternAnalysis,

    // Saving
    isSaving,
    save,
  }
}
