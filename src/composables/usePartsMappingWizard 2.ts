import { ref, computed } from 'vue'
import type {
  IFSPartRole,
  IFSBodyLocation,
  IFSRelationship,
  CreateIFSPartPayload,
  CreateIFSPartsMapPayload,
} from '@/domain/exercises'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSPartsMapStore } from '@/stores/ifsPartsMap.store'
import { reflectOnPartsMap } from '@/services/ifsLLMAssists'
import { useT } from '@/composables/useT'

export type PartsMappingStep =
  | 'intro'
  | 'trailhead'
  | 'identify-part'
  | 'add-more'
  | 'visual-map'
  | 'reflection'
  | 'life-areas'
  | 'summary'

const STEP_ORDER: PartsMappingStep[] = [
  'intro',
  'trailhead',
  'identify-part',
  'add-more',
  'visual-map',
  'reflection',
  'life-areas',
  'summary',
]

export interface DraftPart {
  name: string
  role: IFSPartRole
  bodyLocations: IFSBodyLocation[]
  emotionIds: string[]
  lifeAreaIds: string[]
  positiveIntention: string
  fears: string
}

export function usePartsMappingWizard() {
  const partStore = useIFSPartStore()
  const mapStore = useIFSPartsMapStore()
  const { locale } = useT()

  // Step management
  const currentStep = ref<PartsMappingStep>('intro')

  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))

  // Trailhead fields
  const trailheadSituation = ref('')
  const trailheadEmotionIds = ref<string[]>([])
  const trailheadThoughts = ref('')

  // Emotion tracking
  const beforeEmotionIds = ref<string[]>([])
  const afterEmotionIds = ref<string[]>([])

  // Parts
  const identifiedParts = ref<DraftPart[]>([])
  const editingPartIndex = ref<number | null>(null)

  // Current part being created/edited
  const currentPartName = ref('')
  const currentPartRole = ref<IFSPartRole>('unknown')
  const currentPartBodyLocations = ref<IFSBodyLocation[]>([])
  const currentPartEmotionIds = ref<string[]>([])
  const currentPartPositiveIntention = ref('')
  const currentPartFears = ref('')

  // Relationships
  const relationships = ref<IFSRelationship[]>([])

  // Reflection & LLM
  const reflection = ref('')
  const llmInsight = ref<string | null>(null)
  const isLoadingLLM = ref(false)

  // Life area links per part (indexed by part index)
  const partLifeAreaIds = ref<string[][]>([])

  // Notes
  const notes = ref('')

  // Saving
  const isSaving = ref(false)

  // Step validation
  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'intro':
        return true
      case 'trailhead':
        return trailheadSituation.value.trim().length > 0
      case 'identify-part':
        return currentPartName.value.trim().length > 0
      case 'add-more':
        return identifiedParts.value.length >= 1
      case 'visual-map':
        return true
      case 'reflection':
        return true
      case 'life-areas':
        return true
      case 'summary':
        return true
      default:
        return false
    }
  })

  function nextStep() {
    // If on identify-part, save the current part first
    if (currentStep.value === 'identify-part') {
      saveCurrentPart()
    }

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

  function goToStep(step: PartsMappingStep) {
    currentStep.value = step
  }

  // Part management
  function saveCurrentPart() {
    if (!currentPartName.value.trim()) return

    const draft: DraftPart = {
      name: currentPartName.value.trim(),
      role: currentPartRole.value,
      bodyLocations: [...currentPartBodyLocations.value],
      emotionIds: [...currentPartEmotionIds.value],
      lifeAreaIds: [],
      positiveIntention: currentPartPositiveIntention.value.trim(),
      fears: currentPartFears.value.trim(),
    }

    if (editingPartIndex.value !== null) {
      // Preserve existing life area links
      draft.lifeAreaIds = partLifeAreaIds.value[editingPartIndex.value] ?? []
      identifiedParts.value[editingPartIndex.value] = draft
    } else {
      identifiedParts.value.push(draft)
      // Initialize life area ids for the new part
      partLifeAreaIds.value.push([])
    }

    resetCurrentPart()
  }

  function resetCurrentPart() {
    editingPartIndex.value = null
    currentPartName.value = ''
    currentPartRole.value = 'unknown'
    currentPartBodyLocations.value = []
    currentPartEmotionIds.value = []
    currentPartPositiveIntention.value = ''
    currentPartFears.value = ''
  }

  function editPart(index: number) {
    const part = identifiedParts.value[index]
    if (!part) return

    editingPartIndex.value = index
    currentPartName.value = part.name
    currentPartRole.value = part.role
    currentPartBodyLocations.value = [...part.bodyLocations]
    currentPartEmotionIds.value = [...part.emotionIds]
    currentPartPositiveIntention.value = part.positiveIntention
    currentPartFears.value = part.fears

    currentStep.value = 'identify-part'
  }

  function removePart(index: number) {
    identifiedParts.value.splice(index, 1)
    partLifeAreaIds.value.splice(index, 1)

    // Clean up relationships referencing the removed part
    const tempId = `temp-${index}`
    relationships.value = relationships.value.filter(
      (r) => r.fromPartId !== tempId && r.toPartId !== tempId,
    )

    // Re-index remaining relationships
    relationships.value = relationships.value.map((r) => ({
      ...r,
      fromPartId: reindexTempId(r.fromPartId, index),
      toPartId: reindexTempId(r.toPartId, index),
    }))
  }

  function reindexTempId(tempId: string, removedIndex: number): string {
    const idx = parseInt(tempId.replace('temp-', ''), 10)
    if (idx > removedIndex) return `temp-${idx - 1}`
    return tempId
  }

  function addAnotherPart() {
    resetCurrentPart()
    currentStep.value = 'identify-part'
  }

  // Relationships
  function addRelationship(rel: IFSRelationship) {
    relationships.value.push(rel)
  }

  function removeRelationship(index: number) {
    relationships.value.splice(index, 1)
  }

  // LLM
  async function fetchLLMInsight(options: { lifeAreaNames?: string[] }) {
    if (identifiedParts.value.length < 2) return
    isLoadingLLM.value = true
    try {
      const partsForLLM = identifiedParts.value.map((p) => ({
        id: '',
        createdAt: '',
        updatedAt: '',
        name: p.name,
        role: p.role,
        bodyLocations: p.bodyLocations,
        emotionIds: p.emotionIds,
        lifeAreaIds: p.lifeAreaIds,
        positiveIntention: p.positiveIntention,
        fears: p.fears,
      }))

      llmInsight.value = await reflectOnPartsMap({
        parts: partsForLLM,
        relationships: relationships.value,
        lifeAreaNames: options.lifeAreaNames,
        locale: locale.value,
      })
    } catch (err) {
      console.error('Error fetching LLM insight:', err)
      llmInsight.value = null
    } finally {
      isLoadingLLM.value = false
    }
  }

  // Save
  async function save() {
    isSaving.value = true
    try {
      // Create each part in the store and collect real IDs
      const createdPartIds: string[] = []
      const tempToRealId = new Map<string, string>()

      for (let i = 0; i < identifiedParts.value.length; i++) {
        const draft = identifiedParts.value[i]
        const payload: CreateIFSPartPayload = {
          name: draft.name,
          role: draft.role,
          bodyLocations: draft.bodyLocations,
          emotionIds: draft.emotionIds,
          lifeAreaIds: partLifeAreaIds.value[i] ?? [],
          positiveIntention: draft.positiveIntention || undefined,
          fears: draft.fears || undefined,
        }

        const created = await partStore.createPart(payload)
        createdPartIds.push(created.id)
        tempToRealId.set(`temp-${i}`, created.id)
      }

      // Map relationships from temp IDs to real IDs
      const realRelationships: IFSRelationship[] = relationships.value.map((r) => ({
        fromPartId: tempToRealId.get(r.fromPartId) ?? r.fromPartId,
        toPartId: tempToRealId.get(r.toPartId) ?? r.toPartId,
        type: r.type,
        notes: r.notes,
      }))

      // Create the map
      const mapPayload: CreateIFSPartsMapPayload = {
        partIds: createdPartIds,
        relationships: realRelationships,
        trailheadSituation: trailheadSituation.value.trim() || undefined,
        trailheadEmotionIds: trailheadEmotionIds.value.length
          ? trailheadEmotionIds.value
          : undefined,
        trailheadThoughts: trailheadThoughts.value.trim() || undefined,
        reflection: reflection.value.trim() || undefined,
        llmInsight: llmInsight.value ?? undefined,
        llmAssistUsed: !!llmInsight.value,
        notes: notes.value.trim() || undefined,
      }

      await mapStore.createMap(mapPayload)

      // Reset wizard
      reset()
    } catch (err) {
      console.error('Error saving parts map:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function reset() {
    currentStep.value = 'intro'
    trailheadSituation.value = ''
    trailheadEmotionIds.value = []
    trailheadThoughts.value = ''
    beforeEmotionIds.value = []
    afterEmotionIds.value = []
    identifiedParts.value = []
    editingPartIndex.value = null
    resetCurrentPart()
    relationships.value = []
    reflection.value = ''
    llmInsight.value = null
    isLoadingLLM.value = false
    partLifeAreaIds.value = []
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

    // Trailhead
    trailheadSituation,
    trailheadEmotionIds,
    trailheadThoughts,

    // Emotions
    beforeEmotionIds,
    afterEmotionIds,

    // Parts
    identifiedParts,
    editingPartIndex,
    currentPartName,
    currentPartRole,
    currentPartBodyLocations,
    currentPartEmotionIds,
    currentPartPositiveIntention,
    currentPartFears,
    editPart,
    removePart,
    addAnotherPart,

    // Relationships
    relationships,
    addRelationship,
    removeRelationship,

    // Reflection & LLM
    reflection,
    llmInsight,
    isLoadingLLM,
    fetchLLMInsight,

    // Life areas
    partLifeAreaIds,

    // Notes & save
    notes,
    isSaving,
    save,
  }
}
