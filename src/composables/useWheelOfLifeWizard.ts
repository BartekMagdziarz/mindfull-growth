import { computed, ref } from 'vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useT } from '@/composables/useT'
import { sortLifeAreaAssessmentsByCreatedAt } from '@/utils/lifeAreaAssessments'
import type { WheelChartArea, WheelDraftArea } from '@/components/exercises/wheelOfLifeTypes'

export type WheelOfLifeMode = 'standalone' | 'reflection'

export interface WheelOfLifeStep {
  id: string
  title: string
  subtitle: string
}

export interface WheelOfLifeWizardOptions {
  mode: WheelOfLifeMode
  assessmentId?: string
}

export function useWheelOfLifeWizard(options: WheelOfLifeWizardOptions) {
  const lifeAreaStore = useLifeAreaStore()
  const lifeAreaAssessmentStore = useLifeAreaAssessmentStore()
  const { t } = useT()

  const currentStep = ref(0)
  const areas = ref<WheelDraftArea[]>([])
  const currentAreaIndex = ref(0)
  const notes = ref('')
  const isLoadingAreas = ref(false)

  const isEditing = computed(() => Boolean(options.assessmentId))
  const needsSetup = computed(() => !isEditing.value && !isLoadingAreas.value && areas.value.length === 0)

  const stepTitle = computed(() => {
    if (isEditing.value) {
      return t('exerciseWizards.wheelOfLife.stepTitles.edit')
    }

    return t('exerciseWizards.wheelOfLife.stepTitles.intro')
  })

  const introSubtitle = computed(() => {
    if (needsSetup.value) {
      return t('exerciseWizards.wheelOfLife.stepSubtitles.setup')
    }

    return t('exerciseWizards.wheelOfLife.stepSubtitles.intro')
  })

  const steps = computed<WheelOfLifeStep[]>(() => [
    {
      id: 'intro',
      title: stepTitle.value,
      subtitle: introSubtitle.value,
    },
    {
      id: 'rate',
      title: t('exerciseWizards.wheelOfLife.stepTitles.rate'),
      subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.rate'),
    },
    {
      id: 'reflect',
      title: t('exerciseWizards.wheelOfLife.stepTitles.reflect'),
      subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.reflectStandalone'),
    },
  ])

  const currentStepDef = computed(() => steps.value[currentStep.value])
  const isLastStep = computed(() => currentStep.value === steps.value.length - 1)
  const isFirstStep = computed(() => currentStep.value === 0)
  const isRatingStep = computed(() => currentStepDef.value?.id === 'rate')
  const isLastArea = computed(() => currentAreaIndex.value === areas.value.length - 1)
  const currentArea = computed(() => areas.value[currentAreaIndex.value])

  const comparisonAreas = computed<WheelChartArea[] | undefined>(() => {
    const sortedFullAssessments = sortLifeAreaAssessmentsByCreatedAt(
      lifeAreaAssessmentStore.fullAssessments,
    )

    const currentAssessment = options.assessmentId
      ? lifeAreaAssessmentStore.getAssessmentById(options.assessmentId)
      : undefined

    const referenceAssessment = currentAssessment
      ? sortedFullAssessments.find((assessment) => assessment.createdAt < currentAssessment.createdAt)
      : sortedFullAssessments[0]

    if (!referenceAssessment) {
      return undefined
    }

    return referenceAssessment.items.map((item) => ({
      id: item.lifeAreaId,
      name: item.lifeAreaNameSnapshot,
      rating: item.score,
    }))
  })

  const canProceed = computed(() => {
    const step = currentStepDef.value
    if (!step) return false

    switch (step.id) {
      case 'intro':
        return areas.value.length > 0
      case 'rate':
        return areas.value.length > 0 && isLastArea.value
      default:
        return true
    }
  })

  async function initialize() {
    isLoadingAreas.value = true

    if (lifeAreaStore.lifeAreas.length === 0) {
      await lifeAreaStore.loadLifeAreas()
    }

    if (lifeAreaAssessmentStore.assessments.length === 0) {
      await lifeAreaAssessmentStore.loadAssessments()
    }

    const existingAssessment = options.assessmentId
      ? lifeAreaAssessmentStore.getAssessmentById(options.assessmentId)
      : undefined

    if (existingAssessment) {
      areas.value = existingAssessment.items.map((item) => ({
        id: item.lifeAreaId,
        name: item.lifeAreaNameSnapshot,
        rating: item.score,
        note: item.note ?? '',
        visionSnapshot: item.visionSnapshot ?? '',
      }))
      notes.value = existingAssessment.notes ?? ''
    } else {
      areas.value = lifeAreaStore.activeLifeAreas.map((lifeArea) => ({
        id: lifeArea.id,
        name: lifeArea.name,
        rating: 5,
        note: '',
        visionSnapshot: lifeArea.successPicture ?? '',
      }))
      notes.value = ''
    }

    currentAreaIndex.value = 0
    currentStep.value = 0
    isLoadingAreas.value = false
  }

  function rateArea(index: number, rating: number) {
    const target = areas.value[index]
    if (!target) return
    target.rating = rating
  }

  function setAreaNote(index: number, value: string) {
    const target = areas.value[index]
    if (!target) return
    target.note = value
  }

  function setAreaVisionSnapshot(index: number, value: string) {
    const target = areas.value[index]
    if (!target) return
    target.visionSnapshot = value
  }

  function nextArea() {
    if (currentAreaIndex.value < areas.value.length - 1) {
      currentAreaIndex.value++
    }
  }

  function prevArea() {
    if (currentAreaIndex.value > 0) {
      currentAreaIndex.value--
    }
  }

  function next() {
    if (isRatingStep.value && !isLastArea.value) {
      nextArea()
      return
    }

    if (currentStep.value < steps.value.length - 1) {
      currentStep.value++
    }
  }

  function back() {
    if (isRatingStep.value && currentAreaIndex.value > 0) {
      prevArea()
      return
    }

    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  async function save(): Promise<string> {
    const items = areas.value
      .filter((area) => area.id && area.name.trim().length > 0)
      .map((area) => ({
        lifeAreaId: area.id as string,
        lifeAreaNameSnapshot: area.name,
        score: area.rating,
        note: area.note || undefined,
        visionSnapshot: area.visionSnapshot || undefined,
      }))

    if (items.length === 0) {
      throw new Error('Cannot save life area assessment without any life areas')
    }

    const payload = {
      scope: 'full' as const,
      notes: notes.value || undefined,
      lifeAreaIds: items.map((item) => item.lifeAreaId),
      items,
    }

    const assessment = options.assessmentId
      ? await lifeAreaAssessmentStore.updateAssessment(options.assessmentId, payload)
      : await lifeAreaAssessmentStore.createAssessment(payload)

    return assessment.id
  }

  void initialize()

  return {
    currentStep,
    steps,
    currentStepDef,
    areas,
    currentAreaIndex,
    currentArea,
    notes,
    isLoadingAreas,
    isEditing,
    needsSetup,
    comparisonAreas,
    isFirstStep,
    isLastStep,
    isRatingStep,
    isLastArea,
    canProceed,
    rateArea,
    setAreaNote,
    setAreaVisionSnapshot,
    nextArea,
    prevArea,
    next,
    back,
    save,
    initialize,
  }
}
