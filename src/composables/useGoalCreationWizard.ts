import { computed, reactive, ref } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  CountTargetOperator,
  CreateGoalPayload,
  CreateKeyResultPayload,
  Goal,
  KeyResult,
  KeyResultStatus,
  MeasurementEntryMode,
  MeasurementTarget,
  PlanningCadence,
  ComparisonOperator,
  UpdateGoalPayload,
  UpdateKeyResultPayload,
  ValueTargetAggregation,
} from '@/domain/planning'
import { createMultiCompletionItem } from '@/domain/planning'
import { computeSmartCompleteness, type SmartCompleteness } from '@/domain/smartCompleteness'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import {
  activateMeasurementInMonth,
  deactivateMeasurementInMonth,
  linkGoalToMonth,
  linkMeasurementPeriod,
  unlinkGoalFromMonth,
  unlinkMeasurementPeriod,
} from '@/services/planningMutations'
import { periodsInDateRange } from '@/utils/periodSchedule'
import { getPeriodRefsForDate, isPeriodRef, getWeekOverlappingMonths } from '@/utils/periods'

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
  existingId?: string
  title: string
  description?: string
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  target: MeasurementTarget
  ratingScaleMin?: number
  ratingScale?: number
}

export type GoalWizardMode = 'create' | 'edit'

export interface GoalWizardEditInput {
  goal: Goal
  keyResults: KeyResult[]
  goalMonthRefs: string[]
  krPeriodRefsByKrId: Record<string, string[]>
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
  achievabilityRationale?: string
  obstacles?: string
  resources?: string
  startDate?: string
  targetDate?: string
  linkedMonthRefs: string[]
  krPeriodRefsByLocalId: Record<string, string[]>
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
    achievabilityRationale: undefined,
    obstacles: undefined,
    resources: undefined,
    startDate: getPeriodRefsForDate(new Date()).day,
    targetDate: undefined,
    linkedMonthRefs: [],
    krPeriodRefsByLocalId: {},
  }
}

function defaultTargetFor(entryMode: MeasurementEntryMode): MeasurementTarget {
  switch (entryMode) {
    case 'completion':
    case 'counter':
    case 'multi-completion':
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
  repo?: Pick<typeof goalDexieRepository, 'createWithKeyResults' | 'update'>
  krRepo?: Pick<typeof keyResultDexieRepository, 'create' | 'update' | 'delete'> &
    Partial<Pick<typeof keyResultDexieRepository, 'getById'>>
}

export function useGoalCreationWizard(options: UseGoalCreationWizardOptions = {}) {
  const repo = options.repo ?? goalDexieRepository
  const krRepo = options.krRepo ?? keyResultDexieRepository

  const mode = ref<GoalWizardMode>('create')
  const goalId = ref<string | null>(null)
  const currentStep = ref<GoalWizardStep>('specific')
  const goalDraft = reactive<GoalDraft>(createEmptyGoalDraft())
  const krDrafts = ref<KrDraft[]>([createEmptyKrDraft()])
  const isSaving = ref(false)
  const customGoalMonths = ref(false)

  const initialGoalMonthRefs = ref<Set<string>>(new Set())
  const initialKrPeriodRefsByLocalId = ref<Record<string, string[]>>({})
  const initialKrCadenceByLocalId = ref<Record<string, PlanningCadence>>({})
  const removedKrEntries = ref<
    Array<{ id: string; cadence: PlanningCadence; periodRefs: string[] }>
  >([])

  const stepIndex = computed(() => GOAL_WIZARD_STEPS.indexOf(currentStep.value))
  const stepCount = GOAL_WIZARD_STEPS.length

  const smartCompleteness = computed<SmartCompleteness>(() =>
    computeSmartCompleteness(goalDraft, krDrafts.value.filter(isKrDraftValid).length)
  )

  const validDateRange = computed(() => {
    const end = goalDraft.targetDate
    const start = goalDraft.startDate
    const needsStart =
      !customGoalMonths.value || krDrafts.value.some(kr => inheritsSchedule(kr.localId))
    return (
      !!end &&
      /^\d{4}-\d{2}-\d{2}$/.test(end) &&
      isPeriodRef(end) &&
      (!needsStart || !!start) &&
      (!start || (/^\d{4}-\d{2}-\d{2}$/.test(start) && isPeriodRef(start) && start <= end))
    )
  })

  function inheritsSchedule(localId: string): boolean {
    return goalDraft.krPeriodRefsByLocalId[localId] === undefined
  }

  function krPeriods(localId: string): string[] {
    const explicit = goalDraft.krPeriodRefsByLocalId[localId]
    if (explicit !== undefined) return explicit
    const kr = krDrafts.value.find(kr => kr.localId === localId)
    return kr
      ? periodsInDateRange(goalDraft.startDate ?? '', goalDraft.targetDate ?? '', kr.cadence)
      : []
  }

  function setKrScheduleMode(localId: string, inherit: boolean): void {
    if (inherit) delete goalDraft.krPeriodRefsByLocalId[localId]
    else goalDraft.krPeriodRefsByLocalId[localId] = [...krPeriods(localId)]
  }

  const effectiveGoalMonths = computed(() => {
    const months = new Set(
      customGoalMonths.value || goalDraft.linkedMonthRefs.length
        ? goalDraft.linkedMonthRefs
        : periodsInDateRange(goalDraft.startDate ?? '', goalDraft.targetDate ?? '', 'monthly')
    )
    for (const kr of krDrafts.value) {
      for (const period of krPeriods(kr.localId)) {
        if (kr.cadence === 'monthly') months.add(period)
        else for (const month of getWeekOverlappingMonths(period as WeekRef)) months.add(month)
      }
    }
    return [...months].sort()
  })

  const canSave = computed(() => {
    return (
      goalDraft.title.trim().length > 0 &&
      validDateRange.value &&
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
        return validDateRange.value
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
    const draft = createEmptyKrDraft()
    krDrafts.value.push(draft)
    if (mode.value === 'edit' && !goalDraft.startDate) {
      goalDraft.krPeriodRefsByLocalId[draft.localId] = []
    }
  }

  function removeKrDraft(localId: string): void {
    const removed = krDrafts.value.find(kr => kr.localId === localId)
    if (removed?.existingId) {
      removedKrEntries.value.push({
        id: removed.existingId,
        cadence: initialKrCadenceByLocalId.value[localId] ?? removed.cadence,
        periodRefs: [...(initialKrPeriodRefsByLocalId.value[localId] ?? [])],
      })
    }
    krDrafts.value = krDrafts.value.filter(kr => kr.localId !== localId)
    delete goalDraft.krPeriodRefsByLocalId[localId]
  }

  function updateKrDraft(localId: string, patch: Partial<KrDraft>): void {
    const idx = krDrafts.value.findIndex(kr => kr.localId === localId)
    if (idx === -1) return
    const previous = krDrafts.value[idx]
    const merged: KrDraft = { ...previous, ...patch }
    if (patch.entryMode && patch.entryMode !== previous.entryMode) {
      merged.target = defaultTargetFor(patch.entryMode)
    }
    if (patch.cadence && patch.cadence !== previous.cadence && !inheritsSchedule(localId)) {
      goalDraft.krPeriodRefsByLocalId[localId] = []
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
      periodAssignmentMode: customGoalMonths.value ? 'custom' : 'automatic',
      startDate: goalDraft.startDate,
      targetDate: goalDraft.targetDate,
      successDefinition: goalDraft.successDefinition?.trim() || undefined,
      whyMatters: goalDraft.whyMatters?.trim() || undefined,
      confidenceRating: goalDraft.confidenceRating,
      achievabilityRationale: goalDraft.achievabilityRationale?.trim() || undefined,
      obstacles: goalDraft.obstacles?.trim() || undefined,
      resources: goalDraft.resources?.trim() || undefined,
    }
  }

  function buildKrPayloads(): Omit<CreateKeyResultPayload, 'goalId'>[] {
    return krDrafts.value.map(kr => ({
      periodAssignmentMode: inheritsSchedule(kr.localId) ? 'automatic' : 'custom',
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
      if (mode.value === 'edit' && goalId.value) {
        const id = goalId.value
        await saveEdit(id)
        reset()
        return id
      }
      const result = await repo.createWithKeyResults(buildGoalPayload(), buildKrPayloads())
      await applyPeriodLinks(
        result.goal.id,
        result.keyResults.map((kr, index) => ({
          localId: krDrafts.value[index]?.localId ?? '',
          id: kr.id,
          cadence: kr.cadence,
        }))
      )
      reset()
      return result.goal.id
    } finally {
      isSaving.value = false
    }
  }

  function loadForEdit(input: GoalWizardEditInput): void {
    mode.value = 'edit'
    customGoalMonths.value = input.goal.periodAssignmentMode !== 'automatic'
    goalId.value = input.goal.id
    currentStep.value = 'specific'
    removedKrEntries.value = []

    Object.assign(goalDraft, {
      title: input.goal.title,
      description: input.goal.description,
      icon: input.goal.icon,
      successDefinition: input.goal.successDefinition,
      priorityIds: [...input.goal.priorityIds],
      lifeAreaIds: [...input.goal.lifeAreaIds],
      whyMatters: input.goal.whyMatters,
      confidenceRating: input.goal.confidenceRating,
      achievabilityRationale: input.goal.achievabilityRationale,
      obstacles: input.goal.obstacles,
      resources: input.goal.resources,
      startDate: input.goal.startDate,
      targetDate: input.goal.targetDate,
      linkedMonthRefs: customGoalMonths.value ? [...input.goalMonthRefs] : [],
      krPeriodRefsByLocalId: {},
    } satisfies GoalDraft)

    initialGoalMonthRefs.value = new Set(input.goalMonthRefs)
    initialKrPeriodRefsByLocalId.value = {}
    initialKrCadenceByLocalId.value = {}

    if (input.keyResults.length === 0) {
      krDrafts.value = [createEmptyKrDraft()]
      if (!goalDraft.startDate) goalDraft.krPeriodRefsByLocalId[krDrafts.value[0].localId] = []
    } else {
      krDrafts.value = input.keyResults.map(kr => {
        const periods = input.krPeriodRefsByKrId[kr.id] ?? []
        const localId = kr.id
        const expected = periodsInDateRange(
          input.goal.startDate ?? '',
          input.goal.targetDate ?? '',
          kr.cadence
        )
        // Preserve assignments changed elsewhere, even if the object previously followed the goal.
        const matchesSchedule = [...new Set(periods)].sort().join(',') === expected.join(',')
        if (kr.periodAssignmentMode !== 'automatic' || !input.goal.startDate || !matchesSchedule) {
          goalDraft.krPeriodRefsByLocalId[localId] = [...periods]
        }
        initialKrPeriodRefsByLocalId.value[localId] = [...periods]
        initialKrCadenceByLocalId.value[localId] = kr.cadence
        return {
          localId,
          existingId: kr.id,
          title: kr.title,
          description: kr.description,
          entryMode: kr.entryMode,
          cadence: kr.cadence,
          target: kr.target,
          ratingScaleMin: kr.ratingScaleMin,
          ratingScale: kr.ratingScale,
        }
      })
    }
    isSaving.value = false
  }

  async function saveEdit(id: string): Promise<void> {
    const goalUpdate: UpdateGoalPayload = {
      title: goalDraft.title.trim(),
      description: goalDraft.description?.trim() || undefined,
      icon: goalDraft.icon?.trim() || undefined,
      priorityIds: [...goalDraft.priorityIds],
      lifeAreaIds: [...goalDraft.lifeAreaIds],
      periodAssignmentMode: customGoalMonths.value ? 'custom' : 'automatic',
      startDate: goalDraft.startDate,
      targetDate: goalDraft.targetDate,
      successDefinition: goalDraft.successDefinition?.trim() || undefined,
      whyMatters: goalDraft.whyMatters?.trim() || undefined,
      confidenceRating: goalDraft.confidenceRating,
      achievabilityRationale: goalDraft.achievabilityRationale?.trim() || undefined,
      obstacles: goalDraft.obstacles?.trim() || undefined,
      resources: goalDraft.resources?.trim() || undefined,
    }
    await repo.update(id, goalUpdate)

    for (const removed of removedKrEntries.value) {
      for (const periodRef of removed.periodRefs) {
        await unlinkKrPeriod(removed.id, removed.cadence, periodRef)
      }
      await krRepo.delete(removed.id)
    }

    const resolved: Array<{ localId: string; id: string; cadence: PlanningCadence }> = []
    for (const draft of krDrafts.value) {
      const payload = {
        periodAssignmentMode: inheritsSchedule(draft.localId) ? 'automatic' : 'custom',
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        entryMode: draft.entryMode,
        cadence: draft.cadence,
        target: draft.target,
        ratingScaleMin: draft.ratingScaleMin,
        ratingScale: draft.ratingScale,
      } satisfies UpdateKeyResultPayload
      // The wizard doesn't edit multi-completion items; seed one default item
      // (named after the KR) when the mode requires items and none exist yet —
      // the full item editor lives on the library KR card.
      const multiSeed = () => ({
        multiItems: [createMultiCompletionItem(draft.title.trim() || draft.localId)],
      })
      if (draft.existingId) {
        let updatePayload: UpdateKeyResultPayload = payload
        if (draft.entryMode === 'multi-completion') {
          const existing = await krRepo.getById?.(draft.existingId)
          if (!existing?.multiItems?.length) {
            updatePayload = { ...payload, ...multiSeed() }
          }
        }
        const updated = await krRepo.update(draft.existingId, updatePayload)
        resolved.push({ localId: draft.localId, id: updated.id, cadence: updated.cadence })
      } else {
        const created = await krRepo.create({
          goalId: id,
          isActive: true,
          status: 'open' as KeyResultStatus,
          ...payload,
          ...(draft.entryMode === 'multi-completion' ? multiSeed() : {}),
        })
        resolved.push({ localId: draft.localId, id: created.id, cadence: created.cadence })
      }
    }

    await syncEditPeriodLinks(id, resolved)
  }

  async function syncEditPeriodLinks(
    goalId: string,
    keyResults: Array<{ localId: string; id: string; cadence: PlanningCadence }>
  ): Promise<void> {
    const desiredGoalMonths = new Set<string>(effectiveGoalMonths.value)
    for (const { localId, cadence } of keyResults) {
      for (const periodRef of krPeriods(localId)) {
        if (cadence === 'monthly') {
          desiredGoalMonths.add(periodRef)
        } else {
          for (const monthRef of getWeekOverlappingMonths(periodRef as WeekRef)) {
            desiredGoalMonths.add(monthRef)
          }
        }
      }
    }

    const toLinkGoal = [...desiredGoalMonths].filter(ref => !initialGoalMonthRefs.value.has(ref))
    const toUnlinkGoal = [...initialGoalMonthRefs.value].filter(ref => !desiredGoalMonths.has(ref))

    for (const monthRef of toLinkGoal) {
      await linkGoalToMonth(goalId, monthRef as MonthRef)
    }
    for (const monthRef of toUnlinkGoal) {
      await unlinkGoalFromMonth(goalId, monthRef as MonthRef)
    }

    for (const { localId, id, cadence } of keyResults) {
      const desired = new Set(krPeriods(localId))
      const initial = new Set(initialKrPeriodRefsByLocalId.value[localId] ?? [])
      const oldCadence = initialKrCadenceByLocalId.value[localId] ?? cadence

      for (const periodRef of [...initial].filter(ref => !desired.has(ref))) {
        await unlinkKrPeriod(id, oldCadence, periodRef)
      }
      for (const periodRef of [...desired].filter(ref => !initial.has(ref))) {
        await linkKrPeriod(id, cadence, periodRef)
      }
    }
  }

  async function linkKrPeriod(
    keyResultId: string,
    cadence: PlanningCadence,
    periodRef: string
  ): Promise<void> {
    if (cadence === 'monthly') {
      await activateMeasurementInMonth({
        monthRef: periodRef as MonthRef,
        subjectType: 'keyResult',
        subjectId: keyResultId,
      })
    } else {
      await linkMeasurementPeriod({
        periodRef: periodRef as WeekRef,
        cadence,
        subjectType: 'keyResult',
        subjectId: keyResultId,
      })
    }
  }

  async function unlinkKrPeriod(
    keyResultId: string,
    cadence: PlanningCadence,
    periodRef: string
  ): Promise<void> {
    if (cadence === 'monthly') {
      await deactivateMeasurementInMonth({
        monthRef: periodRef as MonthRef,
        subjectType: 'keyResult',
        subjectId: keyResultId,
      })
    } else {
      await unlinkMeasurementPeriod({
        periodRef: periodRef as WeekRef,
        cadence,
        subjectType: 'keyResult',
        subjectId: keyResultId,
      })
    }
  }

  async function applyPeriodLinks(
    goalId: string,
    keyResults: Array<{ localId: string; id: string; cadence: PlanningCadence }>
  ): Promise<void> {
    const goalMonthRefs = new Set<string>(effectiveGoalMonths.value)

    for (const { localId, cadence } of keyResults) {
      for (const periodRef of krPeriods(localId)) {
        if (cadence === 'monthly') {
          goalMonthRefs.add(periodRef)
        } else {
          for (const monthRef of getWeekOverlappingMonths(periodRef as WeekRef)) {
            goalMonthRefs.add(monthRef)
          }
        }
      }
    }

    await Promise.all(
      [...goalMonthRefs].map(monthRef => linkGoalToMonth(goalId, monthRef as MonthRef))
    )

    // Link KR periods sequentially: when one KR spans multiple weeks in the same
    // month, each week's link upserts the same measurement-month-state record.
    // Running them concurrently makes every call read "no existing row" before any
    // write lands, so they all take the insert path and collide on the unique
    // [monthRef+subjectType+subjectId] index. The edit path (syncEditPeriodLinks)
    // is sequential for the same reason.
    for (const { localId, id, cadence } of keyResults) {
      for (const periodRef of krPeriods(localId)) {
        await linkKrPeriod(id, cadence, periodRef)
      }
    }
  }

  function reset(): void {
    mode.value = 'create'
    customGoalMonths.value = false
    goalId.value = null
    currentStep.value = 'specific'
    Object.assign(goalDraft, createEmptyGoalDraft())
    krDrafts.value = [createEmptyKrDraft()]
    isSaving.value = false
    initialGoalMonthRefs.value = new Set()
    initialKrPeriodRefsByLocalId.value = {}
    initialKrCadenceByLocalId.value = {}
    removedKrEntries.value = []
  }

  return {
    mode,
    goalId,
    currentStep,
    stepIndex,
    stepCount,
    canAdvance,
    canSave,
    validDateRange,
    customGoalMonths,
    effectiveGoalMonths,
    inheritsSchedule,
    krPeriods,
    setKrScheduleMode,
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
    loadForEdit,
    save,
    reset,
  }
}
