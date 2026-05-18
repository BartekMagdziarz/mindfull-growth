import { computed, reactive, ref } from 'vue'
import type {
  CountTargetOperator,
  CreateGoalPayload,
  CreateKeyResultPayload,
  KeyResultStatus,
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  ComparisonOperator,
  ValueTargetAggregation,
} from '@/domain/planning'
import { computeSmartCompleteness, type SmartCompleteness } from '@/domain/smartCompleteness'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'

export type GoalWizardStep =
  | 'specific'
  | 'measurable'
  | 'achievable'
  | 'relevant'
  | 'timebound'
  | 'review'

export const GOAL_WIZARD_STEPS: readonly GoalWizardStep[] = [
  'specific',
  'measurable',
  'achievable',
  'relevant',
  'timebound',
  'review',
] as const

export interface KrDraft {
  localId: string
  title: string
  description?: string
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
}

export interface GoalDraft {
  title: string
  description?: string
  icon?: string
  successDefinition?: string
  priorityIds: string[]
  lifeAreaIds: string[]
  whyMatters?: string
  confidenceRating?: number
  obstacles?: string
  resources?: string
  targetDate?: string
}

function createEmptyGoalDraft(): GoalDraft {
  return {
    title: '',
    description: undefined,
    icon: undefined,
    successDefinition: undefined,
    priorityIds: [],
    lifeAreaIds: [],
    whyMatters: undefined,
    confidenceRating: undefined,
    obstacles: undefined,
    resources: undefined,
    targetDate: undefined,
  }
}

function defaultTargetFor(entryMode: MeasurementEntryMode): MeasurementTarget {
  switch (entryMode) {
    case 'completion':
    case 'counter':
      return { kind: 'count', operator: 'min' as CountTargetOperator, value: 1 }
    case 'value':
      return {
        kind: 'value',
        aggregation: 'sum' as ValueTargetAggregation,
        operator: 'gte' as ComparisonOperator,
        value: 1,
      }
    case 'rating':
      return {
        kind: 'rating',
        aggregation: 'average',
        operator: 'gte' as ComparisonOperator,
        value: 3,
      }
  }
}

function createEmptyKrDraft(): KrDraft {
  return {
    localId: crypto.randomUUID(),
    title: '',
    description: undefined,
    entryMode: 'completion',
    cadence: 'weekly',
    target: defaultTargetFor('completion'),
  }
}

function isKrDraftValid(kr: KrDraft): boolean {
  if (!kr.title || kr.title.trim().length === 0) return false
  if (!kr.target || typeof kr.target.value !== 'number' || !Number.isFinite(kr.target.value)) {
    return false
  }
  return true
}

interface UseGoalCreationWizardOptions {
  repo?: Pick<typeof goalDexieRepository, 'createWithKeyResults'>
}

export function useGoalCreationWizard(options: UseGoalCreationWizardOptions = {}) {
  const repo = options.repo ?? goalDexieRepository

  const currentStep = ref<GoalWizardStep>('specific')
  const goalDraft = reactive<GoalDraft>(createEmptyGoalDraft())
  const krDrafts = ref<KrDraft[]>([createEmptyKrDraft()])
  const isSaving = ref(false)

  const stepIndex = computed(() => GOAL_WIZARD_STEPS.indexOf(currentStep.value))
  const stepCount = GOAL_WIZARD_STEPS.length

  const smartCompleteness = computed<SmartCompleteness>(() =>
    computeSmartCompleteness(goalDraft, krDrafts.value.filter(isKrDraftValid).length),
  )

  const canSave = computed(() => {
    return (
      goalDraft.title.trim().length > 0 &&
      typeof goalDraft.targetDate === 'string' &&
      goalDraft.targetDate.length > 0 &&
      krDrafts.value.length >= 1 &&
      krDrafts.value.every(isKrDraftValid)
    )
  })

  const canAdvance = computed(() => {
    switch (currentStep.value) {
      case 'specific':
        return goalDraft.title.trim().length > 0
      case 'measurable':
        return krDrafts.value.length >= 1 && krDrafts.value.every(isKrDraftValid)
      case 'achievable':
        return true
      case 'relevant':
        return true
      case 'timebound':
        return typeof goalDraft.targetDate === 'string' && goalDraft.targetDate.length > 0
      case 'review':
        return canSave.value
      default:
        return false
    }
  })

  function goToStep(step: GoalWizardStep): void {
    currentStep.value = step
  }

  function nextStep(): void {
    const idx = GOAL_WIZARD_STEPS.indexOf(currentStep.value)
    if (idx >= GOAL_WIZARD_STEPS.length - 1) return
    if (!canAdvance.value) return
    currentStep.value = GOAL_WIZARD_STEPS[idx + 1]
  }

  function prevStep(): void {
    const idx = GOAL_WIZARD_STEPS.indexOf(currentStep.value)
    if (idx <= 0) return
    currentStep.value = GOAL_WIZARD_STEPS[idx - 1]
  }

  function addKrDraft(): void {
    krDrafts.value.push(createEmptyKrDraft())
  }

  function removeKrDraft(localId: string): void {
    krDrafts.value = krDrafts.value.filter((kr) => kr.localId !== localId)
  }

  function updateKrDraft(localId: string, patch: Partial<KrDraft>): void {
    const idx = krDrafts.value.findIndex((kr) => kr.localId === localId)
    if (idx === -1) return
    const previous = krDrafts.value[idx]
    const merged: KrDraft = { ...previous, ...patch }
    if (patch.entryMode && patch.entryMode !== previous.entryMode) {
      merged.target = defaultTargetFor(patch.entryMode)
    }
    krDrafts.value[idx] = merged
  }

  function buildGoalPayload(): CreateGoalPayload {
    return {
      title: goalDraft.title.trim(),
      description: goalDraft.description?.trim() || undefined,
      isActive: true,
      icon: goalDraft.icon?.trim() || undefined,
      priorityIds: [...goalDraft.priorityIds],
      lifeAreaIds: [...goalDraft.lifeAreaIds],
      status: 'open',
      targetDate: goalDraft.targetDate,
      successDefinition: goalDraft.successDefinition?.trim() || undefined,
      whyMatters: goalDraft.whyMatters?.trim() || undefined,
      confidenceRating: goalDraft.confidenceRating,
      obstacles: goalDraft.obstacles?.trim() || undefined,
      resources: goalDraft.resources?.trim() || undefined,
    }
  }

  function buildKrPayloads(): Omit<CreateKeyResultPayload, 'goalId'>[] {
    return krDrafts.value.map((kr) => ({
      title: kr.title.trim(),
      description: kr.description?.trim() || undefined,
      isActive: true,
      entryMode: kr.entryMode,
      cadence: kr.cadence,
      target: kr.target,
      ratingScaleMin: kr.ratingScaleMin,
      ratingScale: kr.ratingScale,
      status: 'open' as KeyResultStatus,
    }))
  }

  async function save(): Promise<string> {
    if (!canSave.value) {
      throw new Error('Cannot save: required SMART fields missing')
    }
    isSaving.value = true
    try {
      const result = await repo.createWithKeyResults(buildGoalPayload(), buildKrPayloads())
      reset()
      return result.goal.id
    } finally {
      isSaving.value = false
    }
  }

  function reset(): void {
    currentStep.value = 'specific'
    Object.assign(goalDraft, createEmptyGoalDraft())
    krDrafts.value = [createEmptyKrDraft()]
    isSaving.value = false
  }

  return {
    currentStep,
    stepIndex,
    stepCount,
    canAdvance,
    canSave,
    goalDraft,
    krDrafts,
    isSaving,
    smartCompleteness,
    goToStep,
    nextStep,
    prevStep,
    addKrDraft,
    removeKrDraft,
    updateKrDraft,
    save,
    reset,
  }
}
