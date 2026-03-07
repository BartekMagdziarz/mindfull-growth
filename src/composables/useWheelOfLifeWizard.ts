import { ref, computed } from 'vue'
import type { WheelOfLifeArea, WheelOfLifeAreaReflection } from '@/domain/exercises'
import { DEFAULT_WHEEL_OF_LIFE_AREAS } from '@/domain/exercises'
import { useWheelOfLifeStore } from '@/stores/wheelOfLife.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useT } from '@/composables/useT'

export type WheelOfLifeMode = 'standalone' | 'planning' | 'reflection'

export interface WheelOfLifeStep {
  id: string
  title: string
  subtitle: string
}

export interface WheelOfLifeWizardOptions {
  mode: WheelOfLifeMode
  presetAreas?: WheelOfLifeArea[]
  comparisonAreas?: WheelOfLifeArea[]
}

export function useWheelOfLifeWizard(options: WheelOfLifeWizardOptions) {
  const wheelOfLifeStore = useWheelOfLifeStore()
  const lifeAreaStore = useLifeAreaStore()
  const { t } = useT()

  const currentStep = ref(0)
  const areas = ref<WheelOfLifeArea[]>([])
  const currentAreaIndex = ref(0)
  const notes = ref('')
  const selectedFocusAreas = ref<string[]>([])
  const isLoadingAreas = ref(false)

  // Reflection text answers
  const reflectionAnswers = ref<Record<string, string>>({})

  // Initialize areas
  async function initialize() {
    isLoadingAreas.value = true

    if (!options.presetAreas || options.presetAreas.length === 0) {
      if (lifeAreaStore.lifeAreas.length === 0) {
        await lifeAreaStore.loadLifeAreas()
      }
    }

    if (options.presetAreas && options.presetAreas.length > 0) {
      areas.value = options.presetAreas.map((a) => ({
        ...a,
        rating: 5,
        reflections: {},
      }))
    } else if (lifeAreaStore.activeLifeAreas.length > 0) {
      // Use Life Areas as the canonical source
      areas.value = lifeAreaStore.activeLifeAreas.map((la) => ({
        name: la.name,
        rating: 5,
        lifeAreaId: la.id,
        reflections: {},
      }))
    } else {
      const latest = wheelOfLifeStore.latestSnapshot
      if (latest) {
        areas.value = latest.areas.map((a) => ({
          ...a,
          rating: 5,
          reflections: {},
        }))
      } else {
        areas.value = DEFAULT_WHEEL_OF_LIFE_AREAS.map((name) => ({
          name,
          rating: 5,
          reflections: {},
        }))
      }
    }

    currentAreaIndex.value = 0
    currentStep.value = 0
    notes.value = ''
    selectedFocusAreas.value = []
    reflectionAnswers.value = {}
    isLoadingAreas.value = false
  }

  // Steps vary by mode
  const steps = computed<WheelOfLifeStep[]>(() => {
    const allSteps: WheelOfLifeStep[] = []

    allSteps.push({
      id: 'intro',
      title: t('exerciseWizards.wheelOfLife.stepTitles.intro'),
      subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.intro'),
    })

    allSteps.push({
      id: 'rate',
      title: t('exerciseWizards.wheelOfLife.stepTitles.rate'),
      subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.rate'),
    })

    if (options.mode === 'planning') {
      allSteps.push({
        id: 'focus',
        title: t('exerciseWizards.wheelOfLife.stepTitles.focus'),
        subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.focus'),
      })
    } else if (options.mode === 'reflection') {
      allSteps.push({
        id: 'reflect',
        title: t('exerciseWizards.wheelOfLife.stepTitles.reflect'),
        subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.reflectReflection'),
      })
    } else {
      allSteps.push({
        id: 'reflect',
        title: t('exerciseWizards.wheelOfLife.stepTitles.reflect'),
        subtitle: t('exerciseWizards.wheelOfLife.stepSubtitles.reflectStandalone'),
      })
    }

    return allSteps
  })

  const currentStepDef = computed(() => steps.value[currentStep.value])
  const isLastStep = computed(() => currentStep.value === steps.value.length - 1)
  const isFirstStep = computed(() => currentStep.value === 0)
  const isRatingStep = computed(() => currentStepDef.value?.id === 'rate')
  const isLastArea = computed(() => currentAreaIndex.value === areas.value.length - 1)
  const currentArea = computed(() => areas.value[currentAreaIndex.value])
  const ratedAreas = computed(() => areas.value.slice(0, currentAreaIndex.value + 1))

  const canProceed = computed(() => {
    const step = currentStepDef.value
    if (!step) return false

    switch (step.id) {
      case 'intro':
        return true
      case 'rate':
        return isLastArea.value
      case 'focus':
        return selectedFocusAreas.value.length >= 1
      case 'reflect':
        return true
      default:
        return true
    }
  })

  // Area management (for domain selection step)
  function addArea(name = '') {
    areas.value.push({ name, rating: 5 })
  }

  function removeArea(index: number) {
    areas.value.splice(index, 1)
  }

  function renameArea(index: number, name: string) {
    areas.value[index].name = name
  }

  // Rating
  function rateArea(index: number, rating: number) {
    areas.value[index].rating = rating
  }

  function setAreaReflection(
    index: number,
    key: keyof WheelOfLifeAreaReflection,
    value: string,
  ) {
    const target = areas.value[index]
    if (!target) return
    if (!target.reflections) target.reflections = {}
    target.reflections[key] = value
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

  // Focus area selection (planning mode)
  function toggleFocusArea(areaName: string) {
    const idx = selectedFocusAreas.value.indexOf(areaName)
    if (idx >= 0) {
      selectedFocusAreas.value.splice(idx, 1)
    } else {
      selectedFocusAreas.value.push(areaName)
    }
  }

  // Navigation
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

  // Reflection prompts per mode
  const reflectionPrompts = computed(() => {
    if (options.mode === 'reflection') {
      return [
        { key: 'growth', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.growth') },
        { key: 'surprise', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.surprise') },
        { key: 'gratitude', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.gratitude') },
      ]
    }
    // Standalone
    return [
      { key: 'overallBalance', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.overallBalance') },
      { key: 'negativeImpact', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.negativeImpact') },
      { key: 'positiveImpact', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.positiveImpact') },
      { key: 'energyCare', label: t('exerciseWizards.wheelOfLife.reflectionPrompts.energyCare') },
    ]
  })

  // Save
  async function save(): Promise<string> {
    const snapshot = await wheelOfLifeStore.createSnapshot({
      areas: areas.value.filter((a) => a.name.trim().length > 0),
      notes: notes.value || undefined,
    })
    return snapshot.id
  }

  void initialize()

  return {
    // State
    currentStep,
    steps,
    currentStepDef,
    areas,
    currentAreaIndex,
    currentArea,
    ratedAreas,
    notes,
    selectedFocusAreas,
    reflectionAnswers,
    reflectionPrompts,
    isLoadingAreas,

    // Computed
    isFirstStep,
    isLastStep,
    isRatingStep,
    isLastArea,
    canProceed,

    // Area management
    addArea,
    removeArea,
    renameArea,
    rateArea,
    setAreaReflection,

    // Rating navigation
    nextArea,
    prevArea,

    // Focus areas
    toggleFocusArea,

    // Wizard navigation
    next,
    back,

    // Actions
    save,
    initialize,
  }
}
