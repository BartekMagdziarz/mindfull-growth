/**
 * Priority creator ritual — 6-step transactional creation flow.
 *
 * State lives here; the draft autosaves through the generic draftStorage
 * (survives refresh/tab close) and is deleted inside the finale transaction,
 * so the library never sees a half-written priority.
 *
 * Spec: ideas/html-plans/2026-07-23-priority-creator-port.html (D1–D8).
 */

import { computed, getCurrentInstance, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type {
  Goal,
  Habit,
  Priority,
  PriorityLinkProposalObjectType,
  PriorityLinkSubjectRef,
  Tracker,
  WeeklyIntention,
} from '@/domain/planning'
import { MAX_ACTIVE_PRIORITIES } from '@/domain/planning'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { priorityDexieRepository } from '@/repositories/priorityDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { weeklyIntentionDexieRepository } from '@/repositories/weeklyIntentionDexieRepository'
import { clearDraftFromDB, loadDraftFromDB, saveDraftToDB } from '@/services/draftStorage'
import {
  createPriorityFromRitual,
  type RitualCreationResult,
  type RitualLinkInput,
} from '@/services/priorityLinkService'
import { getPeriodRefsForDate } from '@/utils/periods'

export const PRIORITY_CREATOR_DRAFT_KEY = 'priority-creator-ritual'

export const RITUAL_STEPS = ['meaning', 'boundaries', 'signals', 'support', 'relations', 'review'] as const
export type RitualStepId = (typeof RITUAL_STEPS)[number]

export interface RitualProposalDraft {
  /** Local draft id (uuid) — becomes nothing; links get their own ids. */
  id: string
  kind: 'new' | 'existing'
  /** Only for kind 'new'. */
  objectType?: PriorityLinkProposalObjectType
  /** Only for kind 'existing'. */
  subjectRef?: PriorityLinkSubjectRef
  title: string
  contribution: string
  expectedSignal: string
  selected: boolean
}

export interface RitualFormState {
  title: string
  whyNow: string
  direction: string
}

/** Boundary answers are short bullet items; persisted newline-joined in Priority's text fields. */
export type BoundaryKind = 'influence' | 'notControlled' | 'tradeoffs'

interface RitualDraftBlob {
  stepIndex: number
  form: RitualFormState & Partial<Record<BoundaryKind, string>>
  progressSignals: string[]
  riskSignals: string[]
  boundaries?: Record<BoundaryKind, string[]>
  proposals: RitualProposalDraft[]
  savedAt: string
}

export interface LibraryLinkCandidate {
  subjectRef: PriorityLinkSubjectRef
  title: string
  /** Priority ids already linked (legacy array) — shown as context, not a blocker. */
  priorityIds: string[]
}

function emptyForm(): RitualFormState {
  return {
    title: '',
    whyNow: '',
    direction: '',
  }
}

const AUTOSAVE_DEBOUNCE_MS = 800

export function usePriorityCreatorRitual() {
  const stepIndex = ref(0)
  const form = reactive<RitualFormState>(emptyForm())
  const progressSignals = ref<string[]>([])
  const riskSignals = ref<string[]>([])
  const influenceItems = ref<string[]>([])
  const notControlledItems = ref<string[]>([])
  const tradeoffItems = ref<string[]>([])
  const proposals = ref<RitualProposalDraft[]>([])

  const boundaryLists: Record<BoundaryKind, typeof influenceItems> = {
    influence: influenceItems,
    notControlled: notControlledItems,
    tradeoffs: tradeoffItems,
  }

  const hydrated = ref(false)
  const resumedFromDraft = ref(false)
  const draftSavedAt = ref<string | null>(null)

  const activePriorities = ref<Priority[]>([])
  const libraryCandidates = ref<LibraryLinkCandidate[]>([])
  const loading = ref(false)
  const finishing = ref(false)
  const finishError = ref(false)
  const result = ref<RitualCreationResult | null>(null)

  const currentStep = computed<RitualStepId>(() => RITUAL_STEPS[stepIndex.value] ?? 'meaning')
  const atPortfolioLimit = computed(() => activePriorities.value.length >= MAX_ACTIVE_PRIORITIES)
  /** At 5/5 the finale saves the priority as a 'draft' waiting for a slot (D5). */
  const willCreateAsDraft = computed(() => atPortfolioLimit.value)

  const selectedProposals = computed(() => proposals.value.filter(item => item.selected))
  const selectedNewCount = computed(() => selectedProposals.value.filter(item => item.kind === 'new').length)
  const selectedExistingCount = computed(() => selectedProposals.value.filter(item => item.kind === 'existing').length)

  /** Only the meaning step is hard-required; everything else can be finished later. */
  const canFinish = computed(() => form.title.trim().length > 0 && form.direction.trim().length > 0)
  const canGoNext = computed(() => stepIndex.value < RITUAL_STEPS.length - 1)
  const canGoBack = computed(() => stepIndex.value > 0)

  // ── Draft persistence ────────────────────────────────────────────────────

  function serializeDraft(): string {
    const blob: RitualDraftBlob = {
      stepIndex: stepIndex.value,
      form: { ...form },
      progressSignals: [...progressSignals.value],
      riskSignals: [...riskSignals.value],
      boundaries: {
        influence: [...influenceItems.value],
        notControlled: [...notControlledItems.value],
        tradeoffs: [...tradeoffItems.value],
      },
      proposals: proposals.value.map(item => ({ ...item })),
      savedAt: new Date().toISOString(),
    }
    return JSON.stringify(blob)
  }

  function cleanList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : []
  }

  function applyDraft(blob: RitualDraftBlob): void {
    stepIndex.value = Math.min(Math.max(blob.stepIndex ?? 0, 0), RITUAL_STEPS.length - 1)
    const { title, whyNow, direction } = { ...emptyForm(), ...(blob.form ?? {}) }
    Object.assign(form, { title, whyNow, direction })
    progressSignals.value = cleanList(blob.progressSignals)
    riskSignals.value = cleanList(blob.riskSignals)
    for (const kind of Object.keys(boundaryLists) as BoundaryKind[]) {
      // Legacy drafts kept boundaries as free text on the form — split into bullets.
      const legacy = typeof blob.form?.[kind] === 'string'
        ? blob.form[kind]!.split('\n').map(s => s.trim()).filter(Boolean)
        : []
      boundaryLists[kind].value = blob.boundaries ? cleanList(blob.boundaries[kind]) : legacy
    }
    proposals.value = Array.isArray(blob.proposals) ? blob.proposals.filter(p => p && typeof p.id === 'string') : []
    draftSavedAt.value = typeof blob.savedAt === 'string' ? blob.savedAt : null
  }

  let autosaveTimer: ReturnType<typeof setTimeout> | undefined

  function scheduleAutosave(): void {
    if (!hydrated.value || result.value) return
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      void saveDraftToDB(PRIORITY_CREATOR_DRAFT_KEY, serializeDraft())
    }, AUTOSAVE_DEBOUNCE_MS)
  }

  watch(
    [form, progressSignals, riskSignals, influenceItems, notControlledItems, tradeoffItems, proposals, stepIndex],
    scheduleAutosave,
    { deep: true },
  )

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (autosaveTimer) clearTimeout(autosaveTimer)
    })
  }

  async function discardDraft(): Promise<void> {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    await clearDraftFromDB(PRIORITY_CREATOR_DRAFT_KEY)
    stepIndex.value = 0
    Object.assign(form, emptyForm())
    progressSignals.value = []
    riskSignals.value = []
    influenceItems.value = []
    notControlledItems.value = []
    tradeoffItems.value = []
    proposals.value = []
    resumedFromDraft.value = false
    draftSavedAt.value = null
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  async function loadPortfolio(): Promise<void> {
    const priorities = await priorityDexieRepository.listAll()
    activePriorities.value = priorities
      .filter(item => item.status === 'active')
      .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
  }

  async function loadLibraryCandidates(): Promise<void> {
    const [goals, habits, trackers, intentions] = await Promise.all([
      goalDexieRepository.listAll(),
      habitDexieRepository.listAll(),
      trackerDexieRepository.listAll(),
      weeklyIntentionDexieRepository.listAll(),
    ])

    const open = <T extends { status: string }>(items: T[]) => items.filter(item => item.status === 'open')
    const candidate = (
      subjectType: PriorityLinkSubjectRef['subjectType'],
      item: Goal | Habit | Tracker | WeeklyIntention,
    ): LibraryLinkCandidate => ({
      subjectRef: { subjectType, subjectId: item.id },
      title: item.title,
      priorityIds: item.priorityIds,
    })

    libraryCandidates.value = [
      ...open(goals).map(item => candidate('goal', item)),
      ...open(habits).map(item => candidate('habit', item)),
      ...open(trackers).map(item => candidate('tracker', item)),
      ...open(intentions).map(item => candidate('weeklyIntention', item)),
    ]
  }

  async function initialize(): Promise<void> {
    loading.value = true
    try {
      const raw = await loadDraftFromDB(PRIORITY_CREATOR_DRAFT_KEY)
      if (raw) {
        try {
          applyDraft(JSON.parse(raw) as RitualDraftBlob)
          resumedFromDraft.value = true
        } catch {
          // Corrupt draft: start clean rather than crash the ritual.
          await clearDraftFromDB(PRIORITY_CREATOR_DRAFT_KEY)
        }
      }
      await Promise.all([loadPortfolio(), loadLibraryCandidates()])
    } finally {
      loading.value = false
      hydrated.value = true
    }
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  function goNext(): void {
    if (canGoNext.value) stepIndex.value += 1
  }

  function goBack(): void {
    if (canGoBack.value) stepIndex.value -= 1
  }

  function goToStep(index: number): void {
    if (index >= 0 && index < RITUAL_STEPS.length) stepIndex.value = index
  }

  // ── Bullet lists (signals + boundaries, same convention as Priority.progressSignals) ─

  function addUnique(target: { value: string[] }, text: string): void {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!target.value.includes(trimmed)) target.value = [...target.value, trimmed]
  }

  function addSignal(kind: 'progress' | 'risk', text: string): void {
    addUnique(kind === 'progress' ? progressSignals : riskSignals, text)
  }

  function removeSignal(kind: 'progress' | 'risk', text: string): void {
    const target = kind === 'progress' ? progressSignals : riskSignals
    target.value = target.value.filter(item => item !== text)
  }

  function addBoundaryItem(kind: BoundaryKind, text: string): void {
    addUnique(boundaryLists[kind], text)
  }

  function removeBoundaryItem(kind: BoundaryKind, text: string): void {
    boundaryLists[kind].value = boundaryLists[kind].value.filter(item => item !== text)
  }

  // ── Support map ──────────────────────────────────────────────────────────

  function addNewProposal(objectType: PriorityLinkProposalObjectType, title: string): void {
    const trimmed = title.trim()
    if (!trimmed) return
    proposals.value = [...proposals.value, {
      id: crypto.randomUUID(),
      kind: 'new',
      objectType,
      title: trimmed,
      contribution: '',
      expectedSignal: '',
      selected: true,
    }]
  }

  function isLinkedCandidate(subjectRef: PriorityLinkSubjectRef): boolean {
    return proposals.value.some(item =>
      item.kind === 'existing' &&
      item.subjectRef?.subjectType === subjectRef.subjectType &&
      item.subjectRef?.subjectId === subjectRef.subjectId,
    )
  }

  function toggleExistingCandidate(candidate: LibraryLinkCandidate): void {
    const existing = proposals.value.find(item =>
      item.kind === 'existing' &&
      item.subjectRef?.subjectType === candidate.subjectRef.subjectType &&
      item.subjectRef?.subjectId === candidate.subjectRef.subjectId,
    )
    if (existing) {
      proposals.value = proposals.value.filter(item => item.id !== existing.id)
      return
    }
    proposals.value = [...proposals.value, {
      id: crypto.randomUUID(),
      kind: 'existing',
      subjectRef: { ...candidate.subjectRef },
      title: candidate.title,
      contribution: '',
      expectedSignal: '',
      selected: true,
    }]
  }

  function toggleProposalSelected(id: string): void {
    proposals.value = proposals.value.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item,
    )
  }

  function removeProposal(id: string): void {
    proposals.value = proposals.value.filter(item => item.id !== id)
  }

  function updateProposalField(
    id: string,
    field: 'contribution' | 'expectedSignal' | 'title',
    value: string,
  ): void {
    proposals.value = proposals.value.map(item =>
      item.id === id ? { ...item, [field]: value } : item,
    )
  }

  // ── Portfolio actions (boundaries step, D5) ──────────────────────────────

  async function pausePriority(id: string): Promise<void> {
    await priorityDexieRepository.update(id, { status: 'paused' })
    await loadPortfolio()
  }

  // ── Finale ───────────────────────────────────────────────────────────────

  function buildLinks(): RitualLinkInput[] {
    return selectedProposals.value.map((item) => {
      if (item.kind === 'existing' && item.subjectRef) {
        return {
          subjectRef: { ...item.subjectRef },
          contribution: item.contribution.trim(),
          expectedSignal: item.expectedSignal.trim(),
        }
      }
      return {
        proposal: { objectType: item.objectType ?? 'goal', title: item.title.trim() },
        contribution: item.contribution.trim(),
        expectedSignal: item.expectedSignal.trim(),
      }
    })
  }

  async function finish(): Promise<boolean> {
    if (!canFinish.value || finishing.value) return false
    finishing.value = true
    finishError.value = false
    if (autosaveTimer) clearTimeout(autosaveTimer)

    try {
      // Re-check the limit right before the transaction — a concurrent session
      // may have activated another priority since the boundaries step.
      await loadPortfolio()

      // Boundary bullets persist newline-joined so library textareas keep working.
      const joined = (items: string[]) => items.join('\n') || undefined

      result.value = await createPriorityFromRitual({
        priority: {
          title: form.title.trim(),
          description: undefined,
          years: [getPeriodRefsForDate(new Date()).year],
          status: willCreateAsDraft.value ? 'draft' : 'active',
          lifeAreaIds: [],
          whyNow: form.whyNow.trim() || undefined,
          desiredDirection: form.direction.trim() || undefined,
          tradeoffs: joined(tradeoffItems.value),
          influence: joined(influenceItems.value),
          notControlled: joined(notControlledItems.value),
          // Whether/how a priority ends is decided later, in the monthly reflection.
          progressSignals: [...progressSignals.value],
          riskSignals: [...riskSignals.value],
        },
        links: buildLinks(),
        draftKey: PRIORITY_CREATOR_DRAFT_KEY,
      })
      return true
    } catch (error) {
      console.error('Priority creator ritual finale failed:', error)
      finishError.value = true
      return false
    } finally {
      finishing.value = false
    }
  }

  return {
    // state
    stepIndex,
    currentStep,
    form,
    progressSignals,
    riskSignals,
    influenceItems,
    notControlledItems,
    tradeoffItems,
    proposals,
    selectedProposals,
    selectedNewCount,
    selectedExistingCount,
    activePriorities,
    libraryCandidates,
    loading,
    finishing,
    finishError,
    result,
    resumedFromDraft,
    draftSavedAt,
    atPortfolioLimit,
    willCreateAsDraft,
    canFinish,
    canGoNext,
    canGoBack,
    // lifecycle
    initialize,
    discardDraft,
    // navigation
    goNext,
    goBack,
    goToStep,
    // bullet lists
    addSignal,
    removeSignal,
    addBoundaryItem,
    removeBoundaryItem,
    // support map
    addNewProposal,
    toggleExistingCandidate,
    isLinkedCandidate,
    toggleProposalSelected,
    removeProposal,
    updateProposalField,
    // portfolio
    pausePriority,
    // finale
    finish,
  }
}
