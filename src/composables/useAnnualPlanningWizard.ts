import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import type { AnnualPlan } from '@/domain/annualPlan'
import type { LifeArea } from '@/domain/lifeArea'
import type { UpdateLifeAreaPayload } from '@/domain/lifeArea'
import type { LifeAreaAssessment, LifeAreaAssessmentItem } from '@/domain/lifeAreaAssessment'
import type { Priority, PriorityStatus, UpdatePriorityPayload } from '@/domain/planning'
import { MAX_ACTIVE_PRIORITIES } from '@/domain/planning'
import type { YearRef } from '@/domain/period'
import { annualPlanDexieRepository } from '@/repositories/annualPlanDexieRepository'
import { lifeAreaAssessmentDexieRepository } from '@/repositories/lifeAreaAssessmentDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'

export type AnnualPlanningStep =
  | 'brief'
  | 'life-areas'
  | 'narrative'
  | 'priorities'
  | 'execution'
  | 'summary'

const STEP_ORDER: AnnualPlanningStep[] = [
  'brief',
  'life-areas',
  'narrative',
  'priorities',
  'execution',
  'summary',
]

function normalizeSignalText(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  )
}

function assessmentItemFromLifeArea(
  lifeArea: LifeArea,
  existing?: LifeAreaAssessmentItem,
): LifeAreaAssessmentItem {
  return {
    lifeAreaId: lifeArea.id,
    lifeAreaNameSnapshot: lifeArea.name,
    score: existing?.score ?? 5,
    note: existing?.note,
    visionSnapshot: lifeArea.desiredState,
  }
}

function sortLifeAreas(items: LifeArea[]): LifeArea[] {
  return [...items].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  )
}

function sortPriorities(items: Priority[]): Priority[] {
  return [...items].sort(
    (left, right) =>
      (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
      left.title.localeCompare(right.title) ||
      left.createdAt.localeCompare(right.createdAt),
  )
}

export function useAnnualPlanningWizard(yearRef: Ref<YearRef>) {
  const currentStep = ref<AnnualPlanningStep>('brief')
  const stepIndex = computed(() => STEP_ORDER.indexOf(currentStep.value))
  const stepCount = STEP_ORDER.length

  const annualPlan = ref<AnnualPlan | null>(null)
  const lifeAreas = ref<LifeArea[]>([])
  const lifeAreaAssessment = ref<LifeAreaAssessment | null>(null)
  const activePriorities = ref<Priority[]>([])
  const isLoading = ref(true)
  const loadError = ref<string | null>(null)
  const savingKey = ref('')
  const isSaving = ref(false)
  const isReady = ref(false)

  const annualBriefNote = ref('')
  const narrativeTheme = ref('')
  const narrativeStory = ref('')
  const narrativeFantasticDay = ref('')
  const narrativeBestHopes = ref('')
  const executionPlaceholderNote = ref('')

  const canAdvance = computed(() => true)
  const activePriorityCount = computed(() => activePriorities.value.length)
  const canCreatePriority = computed(() => activePriorityCount.value < MAX_ACTIVE_PRIORITIES)

  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  function serializePlanFields() {
    return {
      annualBriefNote: annualBriefNote.value,
      narrative: {
        theme: narrativeTheme.value,
        story: narrativeStory.value,
        fantasticDay: narrativeFantasticDay.value,
        bestHopes: narrativeBestHopes.value,
      },
      executionPlaceholderNote: executionPlaceholderNote.value,
      lifeAreaAssessmentId: lifeAreaAssessment.value?.id,
      status: annualPlan.value?.status ?? 'draft',
    }
  }

  function hydratePlan(plan: AnnualPlan): void {
    annualPlan.value = plan
    annualBriefNote.value = plan.annualBriefNote ?? ''
    narrativeTheme.value = plan.narrative?.theme ?? ''
    narrativeStory.value = plan.narrative?.story ?? ''
    narrativeFantasticDay.value = plan.narrative?.fantasticDay ?? ''
    narrativeBestHopes.value = plan.narrative?.bestHopes ?? ''
    executionPlaceholderNote.value = plan.executionPlaceholderNote ?? ''
  }

  async function savePlanNow(): Promise<void> {
    if (!annualPlan.value) return
    isSaving.value = true
    try {
      const updated = await annualPlanDexieRepository.update(
        annualPlan.value.id,
        serializePlanFields(),
      )
      annualPlan.value = updated
    } finally {
      isSaving.value = false
    }
  }

  function schedulePlanSave(): void {
    if (!isReady.value || !annualPlan.value) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      void savePlanNow()
    }, 350)
  }

  async function flushPlanSave(): Promise<void> {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
      await savePlanNow()
    }
  }

  async function loadPriorities(): Promise<void> {
    const priorities = await priorityDexieRepository.listAll()
    activePriorities.value = sortPriorities(
      priorities.filter(
        (priority) => priority.status === 'active' && priority.years.includes(yearRef.value),
      ),
    )
  }

  async function ensureLifeAreaAssessment(plan: AnnualPlan, areas: LifeArea[]): Promise<void> {
    if (plan.lifeAreaAssessmentId) {
      const existing = await lifeAreaAssessmentDexieRepository.getById(plan.lifeAreaAssessmentId)
      if (existing) {
        lifeAreaAssessment.value = existing
        return
      }
    }

    const latest = await lifeAreaAssessmentDexieRepository.getLatest()
    const latestByArea = new Map(latest?.items.map((item) => [item.lifeAreaId, item]))
    const items = areas.map((area) => assessmentItemFromLifeArea(area, latestByArea.get(area.id)))
    const created = await lifeAreaAssessmentDexieRepository.create({
      scope: 'full',
      notes: `Annual planning ${yearRef.value}`,
      lifeAreaIds: items.map((item) => item.lifeAreaId),
      items,
    })
    lifeAreaAssessment.value = created
    const updated = await annualPlanDexieRepository.update(plan.id, {
      lifeAreaAssessmentId: created.id,
    })
    annualPlan.value = updated
  }

  async function loadAll(): Promise<void> {
    isLoading.value = true
    loadError.value = null
    isReady.value = false

    try {
      const plan = await annualPlanDexieRepository.upsertForYear(yearRef.value)
      hydratePlan(plan)
      const areas = sortLifeAreas((await lifeAreaDexieRepository.getActive()).filter(area => area.isActive))
      lifeAreas.value = areas
      await ensureLifeAreaAssessment(plan, areas)
      await loadPriorities()
      isReady.value = true
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : String(error)
    } finally {
      isLoading.value = false
    }
  }

  function nextStep(): void {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx < STEP_ORDER.length - 1) currentStep.value = STEP_ORDER[idx + 1]
  }

  function prevStep(): void {
    const idx = STEP_ORDER.indexOf(currentStep.value)
    if (idx > 0) currentStep.value = STEP_ORDER[idx - 1]
  }

  function goToStep(step: AnnualPlanningStep): void {
    currentStep.value = step
  }

  function assessmentItem(lifeAreaId: string): LifeAreaAssessmentItem | undefined {
    return lifeAreaAssessment.value?.items.find((item) => item.lifeAreaId === lifeAreaId)
  }

  async function updateLifeAreaScore(lifeAreaId: string, score: number): Promise<void> {
    const assessment = lifeAreaAssessment.value
    if (!assessment) return
    savingKey.value = `area-score:${lifeAreaId}`
    try {
      const items = assessment.items.map((item) =>
        item.lifeAreaId === lifeAreaId
          ? { ...item, score: Math.max(1, Math.min(10, Math.round(score))) }
          : item,
      )
      lifeAreaAssessment.value = await lifeAreaAssessmentDexieRepository.update(assessment.id, {
        items,
        lifeAreaIds: items.map((item) => item.lifeAreaId),
      })
    } finally {
      savingKey.value = ''
    }
  }

  async function updateLifeAreaField(
    lifeAreaId: string,
    field: 'meaning' | 'desiredState' | 'typicalRisks' | 'reflectionSignals',
    value: string,
  ): Promise<void> {
    savingKey.value = `area:${lifeAreaId}:${field}`
    try {
      const updated = await lifeAreaDexieRepository.update(lifeAreaId, {
        [field]: field === 'reflectionSignals' ? normalizeSignalText(value) : value,
      } as UpdateLifeAreaPayload)
      lifeAreas.value = sortLifeAreas(
        lifeAreas.value.map((area) => (area.id === lifeAreaId ? updated : area)),
      )
    } finally {
      savingKey.value = ''
    }
  }

  async function createPriority(title: string): Promise<void> {
    if (!canCreatePriority.value) return
    savingKey.value = 'priority:create'
    try {
      await priorityDexieRepository.create({
        title,
        years: [yearRef.value],
        status: 'active',
        lifeAreaIds: [],
        progressSignals: [],
        riskSignals: [],
      })
      await loadPriorities()
    } finally {
      savingKey.value = ''
    }
  }

  async function updatePriorityField(
    priorityId: string,
    field: string,
    value: unknown,
  ): Promise<void> {
    const priority = activePriorities.value.find((item) => item.id === priorityId)
    if (!priority) return

    savingKey.value = `priority:${priorityId}:${field}`
    try {
      if (field === 'toggleLifeArea') {
        const lifeAreaId = String(value)
        const lifeAreaIds = priority.lifeAreaIds.includes(lifeAreaId)
          ? priority.lifeAreaIds.filter((id) => id !== lifeAreaId)
          : [...priority.lifeAreaIds, lifeAreaId]
        await priorityDexieRepository.update(priorityId, { lifeAreaIds })
      } else if (field === 'progressSignals' || field === 'riskSignals') {
        await priorityDexieRepository.update(priorityId, {
          [field]: normalizeSignalText(String(value)),
        })
      } else if (field === 'years') {
        const yearValues = String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean) as YearRef[]
        await priorityDexieRepository.update(priorityId, { years: yearValues })
      } else if (field === 'status') {
        await priorityDexieRepository.update(priorityId, { status: value as PriorityStatus })
      } else {
        await priorityDexieRepository.update(priorityId, { [field]: value } as UpdatePriorityPayload)
      }
      await loadPriorities()
    } finally {
      savingKey.value = ''
    }
  }

  async function completePlan(): Promise<void> {
    await flushPlanSave()
    if (!annualPlan.value) return
    isSaving.value = true
    try {
      annualPlan.value = await annualPlanDexieRepository.update(annualPlan.value.id, {
        ...serializePlanFields(),
        status: 'completed',
      })
    } finally {
      isSaving.value = false
    }
  }

  watch(
    [
      annualBriefNote,
      narrativeTheme,
      narrativeStory,
      narrativeFantasticDay,
      narrativeBestHopes,
      executionPlaceholderNote,
    ],
    schedulePlanSave,
  )

  watch(
    () => yearRef.value,
    () => {
      currentStep.value = 'brief'
      void loadAll()
    },
  )

  onMounted(() => {
    void loadAll()
  })

  onUnmounted(() => {
    void flushPlanSave()
  })

  return {
    currentStep,
    stepIndex,
    stepCount,
    canAdvance,
    nextStep,
    prevStep,
    goToStep,
    loadAll,
    annualPlan,
    isLoading,
    loadError,
    savingKey,
    isSaving,
    annualBriefNote,
    narrativeTheme,
    narrativeStory,
    narrativeFantasticDay,
    narrativeBestHopes,
    executionPlaceholderNote,
    lifeAreas,
    lifeAreaAssessment,
    assessmentItem,
    updateLifeAreaScore,
    updateLifeAreaField,
    activePriorities,
    activePriorityCount,
    canCreatePriority,
    createPriority,
    updatePriorityField,
    completePlan,
    maxActivePriorities: MAX_ACTIVE_PRIORITIES,
  }
}
