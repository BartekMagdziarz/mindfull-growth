/**
 * Weekly Planning Draft Composable
 *
 * Manages the in-progress state of the weekly planning flow using IndexedDB.
 * This allows users to navigate away and resume their progress without losing data,
 * even after browser refresh or tab close.
 * Final persistence to IndexedDB happens only when the user completes the flow.
 */

import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { getWeekRange, toLocalISODateString } from '@/utils/periodUtils'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type {
  CommitmentStatus,
  Commitment,
  WeeklyPlan,
} from '@/domain/planning'

/**
 * Draft Commitment - temporary state before committing to IndexedDB
 */
export interface DraftCommitment {
  id: string
  name: string
  projectId?: string
  lifeAreaIds: string[]
  priorityIds: string[]
  status: CommitmentStatus
  sortOrder: number
}

/**
 * Draft data structure for weekly planning flow
 */
export interface WeeklyPlanningDraft {
  /** Current step index (0-based) */
  activeStep: number
  /** Start date for the week (user-defined) */
  startDate: string
  /** End date for the week (user-defined) */
  endDate: string
  /** Optional custom name for the period */
  name: string
  /** Optional notes about constraints/resources this week */
  constraintsNote: string
  /** What would make this a good week? */
  focusSentence: string
  /** How to show up if things get messy */
  adaptiveIntention: string
  /** Draft commitments for the week */
  commitments: DraftCommitment[]
  /** Project IDs focused for this week */
  focusedProjectIds: string[]
  /** Explicit tracker selection for this week (project tracker IDs) */
  selectedTrackerIds: string[]
  /** Optional weekly target overrides keyed by trackerId */
  weeklyTrackerTargets: Record<string, number>
  /** True once the user manually changes tracker selection */
  hasCustomTrackerSelection: boolean
}

/**
 * Default/initial draft values
 */
const createDefaultDraft = (defaults?: {
  startDate: string
  endDate: string
  name?: string
}): WeeklyPlanningDraft => {
  const range = getWeekRange(new Date())
  const fallbackStart = toLocalISODateString(range.start)
  const fallbackEnd = toLocalISODateString(range.end)

  return {
    activeStep: 0,
    startDate: defaults?.startDate || fallbackStart,
    endDate: defaults?.endDate || fallbackEnd,
    name: defaults?.name || '',
    constraintsNote: '',
    focusSentence: '',
    adaptiveIntention: '',
    commitments: [],
    focusedProjectIds: [],
    selectedTrackerIds: [],
    weeklyTrackerTargets: {},
    hasCustomTrackerSelection: false,
  }
}

/**
 * Generate the storage key for a given week
 */
function getStorageKey(planKey: string): string {
  return `weekly-planning-draft-${planKey}`
}

/**
 * Composable for managing weekly planning draft state
 *
 * @param planKey - Unique key for the draft scope (date or plan id)
 * @returns Draft state and methods for managing it
 *
 * @example
 * ```typescript
 * const { draft, clearDraft, addCommitment, ready } = useWeeklyPlanningDraft('2026-01-20')
 *
 * // Wait for draft to load from IndexedDB before checking hasDraft
 * await ready
 *
 * // Update draft values (auto-saves)
 * draft.value.constraintsNote = 'Travel and low sleep this week'
 *
 * // Add a commitment
 * addCommitment({ name: 'Run 3 times' })
 *
 * // Clear draft when flow is completed
 * clearDraft()
 * ```
 */
export function useWeeklyPlanningDraft(
  planKey: string,
  defaults?: { startDate: string; endDate: string; name?: string }
) {
  // ============================================================================
  // State
  // ============================================================================

  /** The current draft data */
  const draft = ref<WeeklyPlanningDraft>(createDefaultDraft(defaults))

  /** Whether the draft has been loaded from storage */
  const isLoaded = ref(false)

  /** Whether a saved draft was found during load */
  const _draftFound = ref(false)

  /** Storage key for this week's draft */
  const storageKey = computed(() => getStorageKey(planKey))

  /** Debounce timer for auto-save */
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Load draft from IndexedDB
   * Called automatically when the composable is initialized
   */
  async function loadDraft(): Promise<void> {
    try {
      const stored = await loadDraftFromDB(storageKey.value)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WeeklyPlanningDraft> & {
          commitments?: Array<{
            focusAreaId?: string
            lifeAreaId?: string
            priorityIds?: string[]
            lifeAreaIds?: string[]
          }>
        }
        // Merge with defaults to handle any missing fields
        const merged: WeeklyPlanningDraft = {
          ...createDefaultDraft(defaults),
          ...parsed,
        }

        merged.focusedProjectIds = merged.focusedProjectIds ?? []
        merged.selectedTrackerIds = merged.selectedTrackerIds ?? []
        merged.weeklyTrackerTargets = merged.weeklyTrackerTargets ?? {}
        merged.hasCustomTrackerSelection = merged.hasCustomTrackerSelection ?? false

        merged.commitments = (merged.commitments || []).map((commitment) => {
          const legacyCommitment = commitment as DraftCommitment & {
            focusAreaId?: string
            lifeAreaId?: string
          }
          const lifeAreaIds = commitment.lifeAreaIds ?? []
          const priorityIds = commitment.priorityIds ?? []
          if (lifeAreaIds.length === 0 && legacyCommitment.lifeAreaId) {
            lifeAreaIds.push(legacyCommitment.lifeAreaId)
          }
          if (lifeAreaIds.length === 0 && legacyCommitment.focusAreaId) {
            lifeAreaIds.push(legacyCommitment.focusAreaId)
          }
          return {
            ...commitment,
            lifeAreaIds,
            priorityIds,
          }
        })

        draft.value = merged
        _draftFound.value = true
      }
    } catch (error) {
      console.warn('Failed to load weekly planning draft:', error)
      // Keep default values on error
    }
    isLoaded.value = true
  }

  /**
   * Save draft to IndexedDB (debounced).
   * Called automatically when draft values change.
   */
  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveDraftToDB(storageKey.value, JSON.stringify(draft.value))
    }, 300)
  }

  /**
   * Flush any pending debounced save immediately.
   */
  function flushSave(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      saveDraftToDB(storageKey.value, JSON.stringify(draft.value))
    }
  }

  /**
   * Manually trigger a save (for callers that need immediate persistence).
   */
  function saveDraft(): void {
    saveDraftToDB(storageKey.value, JSON.stringify(draft.value))
  }

  /**
   * Clear draft from IndexedDB.
   * Call this when the user completes or cancels the planning flow.
   */
  function clearDraft(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    isLoaded.value = false
    clearDraftFromDB(storageKey.value)
    _draftFound.value = false
    draft.value = createDefaultDraft(defaults)
    isLoaded.value = true
  }

  /**
   * Check if a draft was found in storage during load.
   * Only accurate after `ready` resolves.
   */
  function hasDraft(): boolean {
    return _draftFound.value
  }

  // ============================================================================
  // Auto-save Watcher
  // ============================================================================

  // Watch for changes and auto-save (deep watch for nested arrays)
  watch(
    draft,
    () => {
      if (isLoaded.value) {
        scheduleSave()
      }
    },
    { deep: true }
  )

  // Flush pending save on component unmount (in-app navigation)
  onBeforeUnmount(() => {
    flushSave()
  })

  // ============================================================================
  // Commitment Helpers
  // ============================================================================

  /**
   * Add a new commitment to the draft
   */
  function addCommitment(
    commitment: Omit<DraftCommitment, 'id' | 'sortOrder' | 'status'>
  ): string {
    const id = crypto.randomUUID()
    const sortOrder = draft.value.commitments.length
    draft.value.commitments.push({
      ...commitment,
      id,
      sortOrder,
      status: 'planned',
    })
    return id
  }

  /**
   * Update an existing commitment in the draft
   */
  function updateCommitment(
    id: string,
    updates: Partial<Omit<DraftCommitment, 'id'>>
  ): void {
    const index = draft.value.commitments.findIndex((c) => c.id === id)
    if (index !== -1) {
      draft.value.commitments[index] = {
        ...draft.value.commitments[index],
        ...updates,
      }
    }
  }

  /**
   * Delete a commitment from the draft
   */
  function deleteCommitment(id: string): void {
    draft.value.commitments = draft.value.commitments.filter((c) => c.id !== id)
    // Recalculate sortOrders
    draft.value.commitments.forEach((c, index) => {
      c.sortOrder = index
    })
  }

  /**
   * Get commitments sorted by sortOrder
   */
  function getSortedCommitments(): DraftCommitment[] {
    return [...draft.value.commitments].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /**
   * Reorder commitments based on new order of IDs
   */
  function reorderCommitments(idsInOrder: string[]): void {
    const reordered: DraftCommitment[] = []
    idsInOrder.forEach((id, index) => {
      const commitment = draft.value.commitments.find((c) => c.id === id)
      if (commitment) {
        reordered.push({ ...commitment, sortOrder: index })
      }
    })
    draft.value.commitments = reordered
  }

  /**
   * Check if any commitment has an empty name
   */
  function hasEmptyCommitmentNames(): boolean {
    return draft.value.commitments.some((c) => !c.name.trim())
  }

  // ============================================================================
  // Edit Mode Helper
  // ============================================================================

  /**
   * Seed the draft from existing WeeklyPlan and Commitments (for edit mode)
   */
  function seedFromExisting(
    weeklyPlan: WeeklyPlan,
    existingCommitments: Commitment[],
    focusedProjectIds: string[] = []
  ): void {
    draft.value.startDate = weeklyPlan.startDate
    draft.value.endDate = weeklyPlan.endDate
    draft.value.name = weeklyPlan.name || ''

    draft.value.constraintsNote =
      weeklyPlan.constraintsNote || parseLegacyCapacityNote(weeklyPlan.capacityNote)
    draft.value.focusSentence = weeklyPlan.focusSentence || ''
    draft.value.adaptiveIntention = weeklyPlan.adaptiveIntention || ''
    draft.value.focusedProjectIds = [...focusedProjectIds]
    draft.value.selectedTrackerIds = [...(weeklyPlan.selectedTrackerIds ?? [])]
    draft.value.weeklyTrackerTargets = {}
    draft.value.hasCustomTrackerSelection = Array.isArray(weeklyPlan.selectedTrackerIds)

    // Map existing commitments to draft format, preserving their status
    draft.value.commitments = existingCommitments.map((c, index) => ({
      id: c.id,
      name: c.name,
      projectId: c.projectId,
      lifeAreaIds: c.lifeAreaIds ?? [],
      priorityIds: c.priorityIds ?? [],
      status: c.status,
      sortOrder: index,
    }))
  }

  function parseLegacyCapacityNote(value?: string): string {
    if (!value) return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    const parts = trimmed.split(' - ')
    const first = parts[0]?.toLowerCase()
    if (first === 'low' || first === 'medium' || first === 'high') {
      return parts.slice(1).join(' - ').trim()
    }
    return trimmed
  }

  /**
   * Build constraintsNote value for persistence
   */
  function buildConstraintsNote(): string | undefined {
    return draft.value.constraintsNote.trim() || undefined
  }

  // ============================================================================
  // Initialize
  // ============================================================================

  // Load draft on composable creation (async — await `ready` before using hasDraft)
  const ready = loadDraft()

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    /** Reactive draft data */
    draft,
    /** Whether the draft has been loaded from storage */
    isLoaded,
    /** Promise that resolves when draft is loaded from IndexedDB */
    ready,
    /** Manually save draft (usually not needed due to auto-save) */
    saveDraft,
    /** Clear draft from storage */
    clearDraft,
    /** Check if a draft was found in storage (only accurate after `ready` resolves) */
    hasDraft,
    // Commitment helpers
    addCommitment,
    updateCommitment,
    deleteCommitment,
    getSortedCommitments,
    reorderCommitments,
    // Validation helpers
    hasEmptyCommitmentNames,
    // Edit mode helper
    seedFromExisting,
    buildConstraintsNote,
  }
}
