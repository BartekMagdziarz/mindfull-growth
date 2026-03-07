import { ref, computed } from 'vue'
import type {
  IFSConstellationRelationship,
  IFSConstellationRelationType,
  CreateIFSConstellationPayload,
} from '@/domain/exercises'
import { useIFSConstellationStore } from '@/stores/ifsConstellation.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { analyzeConstellation } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type ConstellationStep =
  | 'prerequisites'
  | 'select-parts'
  | 'map-relationships'
  | 'polarization-deep-dive'
  | 'visual'
  | 'reflection'
  | 'save'

const STEP_ORDER: ConstellationStep[] = [
  'prerequisites',
  'select-parts',
  'map-relationships',
  'polarization-deep-dive',
  'visual',
  'reflection',
  'save',
]

export function useConstellationWizard() {
  const constellationStore = useIFSConstellationStore()
  const partStore = useIFSPartStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<ConstellationStep>('prerequisites')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Safety
  const safetyAcknowledged = ref(false)

  // Part selection
  const selectedPartIds = ref<string[]>([])

  // Relationships
  const relationships = ref<IFSConstellationRelationship[]>([])

  // Polarization deep dives
  const polarizationDeepDives = ref<{
    partAId: string
    partBId: string
    partAThinks: string
    partBThinks: string
    ifOneWon: string
    commonProtection: string
  }[]>([])

  // Reflection
  const reflection = ref('')

  // LLM
  const llmInsight = ref('')
  const isLLMLoading = ref(false)
  const llmAssistUsed = ref(false)

  // Notes
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Computed
  const hasPrerequisites = computed(() => partStore.sortedParts.length >= 3)

  const allPairs = computed(() => {
    const pairs: { partAId: string; partBId: string }[] = []
    for (let i = 0; i < selectedPartIds.value.length; i++) {
      for (let j = i + 1; j < selectedPartIds.value.length; j++) {
        pairs.push({
          partAId: selectedPartIds.value[i],
          partBId: selectedPartIds.value[j],
        })
      }
    }
    return pairs
  })

  const polarizedRelationships = computed(() =>
    relationships.value.filter((r) => r.type === 'polarized'),
  )

  const hasPolarized = computed(() => polarizedRelationships.value.length > 0)

  const allPairsTyped = computed(() => {
    return allPairs.value.every((pair) =>
      relationships.value.some(
        (r) => r.partAId === pair.partAId && r.partBId === pair.partBId,
      ),
    )
  })

  // Validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'prerequisites':
        return safetyAcknowledged.value && hasPrerequisites.value
      case 'select-parts':
        return selectedPartIds.value.length >= 3 && selectedPartIds.value.length <= 5
      case 'map-relationships':
        return allPairsTyped.value
      case 'polarization-deep-dive':
        return true
      case 'visual':
        return true
      case 'reflection':
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

    // Skip polarization-deep-dive if no polarized relationships
    if (currentStep.value === 'map-relationships' && !hasPolarized.value) {
      currentStep.value = 'visual'
      return
    }

    // When entering polarization-deep-dive, initialize entries
    if (currentStep.value === 'map-relationships' && hasPolarized.value) {
      initPolarizationDeepDives()
    }

    currentStep.value = STEP_ORDER[idx + 1]
  }

  function prevStep() {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx <= 0) return

    // Skip polarization-deep-dive going back if no polarized
    if (currentStep.value === 'visual' && !hasPolarized.value) {
      currentStep.value = 'map-relationships'
      return
    }

    currentStep.value = STEP_ORDER[idx - 1]
  }

  function goToStep(step: ConstellationStep) {
    currentStep.value = step
  }

  // Part selection
  function togglePart(partId: string) {
    const idx = selectedPartIds.value.indexOf(partId)
    if (idx === -1) {
      if (selectedPartIds.value.length < 5) {
        selectedPartIds.value.push(partId)
      }
    } else {
      selectedPartIds.value.splice(idx, 1)
      // Remove relationships involving this part
      relationships.value = relationships.value.filter(
        (r) => r.partAId !== partId && r.partBId !== partId,
      )
    }
  }

  // Relationship management
  function setRelationshipType(partAId: string, partBId: string, type: IFSConstellationRelationType) {
    const existing = relationships.value.find(
      (r) => r.partAId === partAId && r.partBId === partBId,
    )
    if (existing) {
      existing.type = type
    } else {
      relationships.value.push({ partAId, partBId, type })
    }
  }

  function setRelationshipNote(partAId: string, partBId: string, noteText: string) {
    const existing = relationships.value.find(
      (r) => r.partAId === partAId && r.partBId === partBId,
    )
    if (existing) {
      existing.notes = noteText || undefined
    }
  }

  function getRelationship(partAId: string, partBId: string): IFSConstellationRelationship | undefined {
    return relationships.value.find(
      (r) => r.partAId === partAId && r.partBId === partBId,
    )
  }

  // Polarization deep dives
  function initPolarizationDeepDives() {
    const existing = new Set(
      polarizationDeepDives.value.map((d) => `${d.partAId}-${d.partBId}`),
    )
    for (const rel of polarizedRelationships.value) {
      const key = `${rel.partAId}-${rel.partBId}`
      if (!existing.has(key)) {
        polarizationDeepDives.value.push({
          partAId: rel.partAId,
          partBId: rel.partBId,
          partAThinks: '',
          partBThinks: '',
          ifOneWon: '',
          commonProtection: '',
        })
      }
    }
    // Remove deep dives for relationships that are no longer polarized
    polarizationDeepDives.value = polarizationDeepDives.value.filter((d) =>
      polarizedRelationships.value.some(
        (r) => r.partAId === d.partAId && r.partBId === d.partBId,
      ),
    )
  }

  function getDeepDive(partAId: string, partBId: string) {
    return polarizationDeepDives.value.find(
      (d) => d.partAId === partAId && d.partBId === partBId,
    )
  }

  // LLM analysis
  async function requestAnalysis() {
    isLLMLoading.value = true
    try {
      const selectedParts = selectedPartIds.value
        .map((id) => partStore.getPartById(id))
        .filter(Boolean) as NonNullable<ReturnType<typeof partStore.getPartById>>[]

      // Merge deep-dive data into relationships
      const enrichedRelationships: IFSConstellationRelationship[] = relationships.value.map((r) => {
        const deepDive = getDeepDive(r.partAId, r.partBId)
        if (deepDive) {
          return {
            ...r,
            partAThinks: deepDive.partAThinks || undefined,
            partBThinks: deepDive.partBThinks || undefined,
            ifOneWon: deepDive.ifOneWon || undefined,
            commonProtection: deepDive.commonProtection || undefined,
          }
        }
        return r
      })

      llmInsight.value = await analyzeConstellation({
        parts: selectedParts,
        relationships: enrichedRelationships,
        locale: locale.value,
      })
      llmAssistUsed.value = true
    } catch (err) {
      console.error('Error analyzing constellation:', err)
      llmInsight.value = ''
    } finally {
      isLLMLoading.value = false
    }
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      // Merge deep-dive data into relationships for saving
      const finalRelationships: IFSConstellationRelationship[] = relationships.value.map((r) => {
        const deepDive = getDeepDive(r.partAId, r.partBId)
        if (deepDive) {
          return {
            ...r,
            partAThinks: deepDive.partAThinks || undefined,
            partBThinks: deepDive.partBThinks || undefined,
            ifOneWon: deepDive.ifOneWon || undefined,
            commonProtection: deepDive.commonProtection || undefined,
          }
        }
        return r
      })

      const payload: CreateIFSConstellationPayload = {
        selectedPartIds: [...selectedPartIds.value],
        relationships: finalRelationships,
        polarizationDeepDives: polarizationDeepDives.value.length
          ? polarizationDeepDives.value.map((d) => ({
              partAId: d.partAId,
              partBId: d.partBId,
              partAThinks: d.partAThinks,
              partBThinks: d.partBThinks,
              ifOneWon: d.ifOneWon,
              commonProtection: d.commonProtection,
            }))
          : undefined,
        reflection: reflection.value.trim() || undefined,
        llmInsight: llmInsight.value || undefined,
        llmAssistUsed: llmAssistUsed.value || undefined,
        notes: notes.value.trim() || undefined,
      }
      await constellationStore.createConstellation(payload)
      reset()
    } catch (err) {
      console.error('Error saving constellation:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'prerequisites'
    safetyAcknowledged.value = false
    selectedPartIds.value = []
    relationships.value = []
    polarizationDeepDives.value = []
    reflection.value = ''
    llmInsight.value = ''
    isLLMLoading.value = false
    llmAssistUsed.value = false
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

    // Parts
    selectedPartIds,
    hasPrerequisites,
    togglePart,

    // Relationships
    relationships,
    allPairs,
    polarizedRelationships,
    hasPolarized,
    setRelationshipType,
    setRelationshipNote,
    getRelationship,

    // Deep dives
    polarizationDeepDives,
    getDeepDive,

    // Reflection
    reflection,

    // LLM
    llmInsight,
    isLLMLoading,
    llmAssistUsed,
    requestAnalysis,

    // Notes
    notes,

    // Saving
    isSaving,
    save,
  }
}
