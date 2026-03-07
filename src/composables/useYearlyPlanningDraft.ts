/**
 * Yearly Planning Draft Composable
 *
 * Manages the in-progress state of the yearly planning flow using IndexedDB.
 * This allows users to navigate away and resume their progress without losing data,
 * even after browser refresh or tab close.
 * Final persistence to IndexedDB happens only when the user completes the flow.
 */

import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'

/**
 * Draft Priority - temporary state before committing to IndexedDB
 */
export interface DraftPriority {
  id: string
  lifeAreaIds: string[]
  name: string
  icon?: string
  successSignals: string[]
  constraints: string[]
  isActive: boolean
  sortOrder: number
}

/**
 * Draft data structure for yearly planning flow
 */
/**
 * Dreaming item — what the user wants more of, and why
 * @deprecated Use DraftDreaming instead
 */
export interface DraftDreamingItem {
  wantMoreOf: string
  why: string
}

/**
 * Structured dreaming exercise data — guided multi-question flow
 */
export interface DraftDreaming {
  /** Q1: Outcomes list (aim for 25) */
  outcomes: string[]
  /** Q2: What difference will doing those things make? */
  difference: string
  /** Q3: What would tell you it had been worth doing? */
  worthDoing: string
  /** Q4: What would VIPs notice? */
  vipsNotice: string
  /** Q5: If a VIP hadn't seen you for the year... */
  vipAfterYear: string
  /** Q6: What do your VIPs see in you? */
  vipsSeeInYou: string
  /** Q7: What would VIPs notice about progress? */
  vipsNoticeProgress: string
  /** Q8: What do you know about yourself now? */
  knowAboutYourself: string
  /** Q9: One clue you're on the right path */
  oneClue: string
  /** Q10: Clues you'd notice about progress (seeds for goals) */
  progressClues: string[]
}

export const createDefaultDreaming = (): DraftDreaming => ({
  outcomes: [],
  difference: '',
  worthDoing: '',
  vipsNotice: '',
  vipAfterYear: '',
  vipsSeeInYou: '',
  vipsNoticeProgress: '',
  knowAboutYourself: '',
  oneClue: '',
  progressClues: [],
})

/**
 * Draft data structure for yearly planning flow
 */
export interface YearlyPlanningDraft {
  /** Current step index (0-based, 0–9) */
  activeStep: number
  /** Start date for the year (user-defined) */
  startDate: string
  /** End date for the year (user-defined) */
  endDate: string
  /** Optional custom name for the period */
  name: string
  /** Theme/word of the year */
  yearTheme: string

  // New fields (steps 2–5)
  /** Values alignment ratings (value name → 1–10) */
  valuesAlignment: Record<string, number>
  /** Values alignment reflection note */
  valuesReflectionNote: string
  /** ID of the ValuesDiscovery exercise used */
  valuesDiscoveryId: string
  /** Your Story narrative */
  yourStory: string
  /** Fantastic Day description */
  fantasticDay: string
  /** ID of the WoL snapshot referenced during planning */
  wheelOfLifeSnapshotId: string
  /** Dreaming exercise data */
  dreaming: DraftDreaming

  /** Life Area narrative baselines (lifeAreaId -> narrative) */
  lifeAreaNarratives: Record<string, string>

  /** Focus Life Areas for the year */
  focusLifeAreaIds: string[]
  /** Primary Focus Life Area for the year */
  primaryFocusLifeAreaId: string
  /** Draft priorities for the year */
  priorities: DraftPriority[]
}

/**
 * Default/initial draft values
 */
const createDefaultDraft = (year: number): YearlyPlanningDraft => ({
  activeStep: 0,
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
  name: '',
  yearTheme: '',
  valuesAlignment: {},
  valuesReflectionNote: '',
  valuesDiscoveryId: '',
  yourStory: '',
  fantasticDay: '',
  wheelOfLifeSnapshotId: '',
  dreaming: createDefaultDreaming(),
  lifeAreaNarratives: {},
  focusLifeAreaIds: [],
  primaryFocusLifeAreaId: '',
  priorities: [],
})

/**
 * Generate the storage key for a given year
 */
function getStorageKey(year: number): string {
  return `yearly-planning-draft-${year}`
}

/**
 * Composable for managing yearly planning draft state
 *
 * @param year - The year being planned
 * @returns Draft state and methods for managing it
 */
export function useYearlyPlanningDraft(year: number) {
  // ============================================================================
  // State
  // ============================================================================

  /** The current draft data */
  const draft = ref<YearlyPlanningDraft>(createDefaultDraft(year))

  /** Whether the draft has been loaded from storage */
  const isLoaded = ref(false)

  /** Whether a saved draft was found during load */
  const _draftFound = ref(false)

  /** Storage key for this year's draft */
  const storageKey = computed(() => getStorageKey(year))

  /** Debounce timer for auto-save */
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Load draft from IndexedDB
   */
  async function loadDraft(): Promise<void> {
    try {
      const stored = await loadDraftFromDB(storageKey.value)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<YearlyPlanningDraft>
        // Merge with defaults to handle any missing fields
        draft.value = {
          ...createDefaultDraft(year),
          ...parsed,
        }
        // Backward compat: if dreaming is old array format, reset to new structure
        if (Array.isArray(draft.value.dreaming)) {
          draft.value.dreaming = createDefaultDreaming()
        }
        _draftFound.value = true
      }
    } catch (error) {
      console.warn('Failed to load yearly planning draft:', error)
      // Keep default values on error
    }
    isLoaded.value = true
  }

  /**
   * Save draft to IndexedDB (debounced)
   */
  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveDraftToDB(storageKey.value, JSON.stringify(draft.value))
    }, 300)
  }

  function flushSave(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      saveDraftToDB(storageKey.value, JSON.stringify(draft.value))
    }
  }

  function saveDraft(): void {
    saveDraftToDB(storageKey.value, JSON.stringify(draft.value))
  }

  /**
   * Clear draft from IndexedDB
   */
  function clearDraft(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    isLoaded.value = false
    clearDraftFromDB(storageKey.value)
    _draftFound.value = false
    draft.value = createDefaultDraft(year)
    isLoaded.value = true
  }

  /**
   * Check if a draft was found in storage during load
   */
  function hasDraft(): boolean {
    return _draftFound.value
  }

  // ============================================================================
  // Auto-save Watcher
  // ============================================================================

  watch(
    draft,
    () => {
      if (isLoaded.value) {
        scheduleSave()
      }
    },
    { deep: true }
  )

  onBeforeUnmount(() => {
    flushSave()
  })

  // ============================================================================
  // Focus Life Area Helpers
  // ============================================================================

  /**
   * Toggle a focus life area selection
   */
  function toggleFocusLifeArea(lifeAreaId: string): void {
    const isSelected = draft.value.focusLifeAreaIds.includes(lifeAreaId)
    if (isSelected) {
      draft.value.focusLifeAreaIds = draft.value.focusLifeAreaIds.filter((id) => id !== lifeAreaId)
      if (draft.value.primaryFocusLifeAreaId === lifeAreaId) {
        draft.value.primaryFocusLifeAreaId = draft.value.focusLifeAreaIds[0] || ''
      }
      return
    }

    draft.value.focusLifeAreaIds.push(lifeAreaId)
    if (!draft.value.primaryFocusLifeAreaId) {
      draft.value.primaryFocusLifeAreaId = lifeAreaId
    }
  }

  /**
   * Set the primary focus life area (must already be selected)
   */
  function setPrimaryFocusLifeArea(lifeAreaId: string): void {
    if (!draft.value.focusLifeAreaIds.includes(lifeAreaId)) return
    draft.value.primaryFocusLifeAreaId = lifeAreaId
  }

  /**
   * Replace all focus life area selections
   */
  function setFocusLifeAreas(lifeAreaIds: string[]): void {
    draft.value.focusLifeAreaIds = Array.from(new Set(lifeAreaIds))
    if (!draft.value.focusLifeAreaIds.includes(draft.value.primaryFocusLifeAreaId)) {
      draft.value.primaryFocusLifeAreaId = draft.value.focusLifeAreaIds[0] || ''
    }
  }

  // ============================================================================
  // Priority Helpers
  // ============================================================================

  /**
   * Add a new priority to the draft
   */
  function addPriority(priority: Omit<DraftPriority, 'id' | 'sortOrder'>): string {
    const id = crypto.randomUUID()
    const sortOrder = draft.value.priorities.length
    draft.value.priorities.push({ ...priority, id, sortOrder })
    return id
  }

  /**
   * Update an existing priority in the draft
   */
  function updatePriority(id: string, updates: Partial<Omit<DraftPriority, 'id'>>): void {
    const index = draft.value.priorities.findIndex((p) => p.id === id)
    if (index !== -1) {
      draft.value.priorities[index] = { ...draft.value.priorities[index], ...updates }
    }
  }

  /**
   * Delete a priority from the draft
   */
  function deletePriority(id: string): void {
    draft.value.priorities = draft.value.priorities.filter((p) => p.id !== id)
    draft.value.priorities.forEach((p, index) => {
      p.sortOrder = index
    })
  }

  /**
   * Get priorities for a specific life area, sorted by sortOrder
   */
  function getPrioritiesForLifeArea(lifeAreaId: string): DraftPriority[] {
    return draft.value.priorities
      .filter((p) => p.lifeAreaIds.includes(lifeAreaId))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /**
   * Seed the draft from existing focus life areas and priorities (for edit mode)
   */
  function seedFromExisting(
    focusLifeAreaIds: string[],
    primaryFocusLifeAreaId: string | undefined,
    priorities: Array<{
      id: string
      lifeAreaIds: string[]
      name: string
      icon?: string
      successSignals: string[]
      constraints?: string[]
      isActive: boolean
      sortOrder: number
    }>
  ): void {
    draft.value.focusLifeAreaIds = [...focusLifeAreaIds]
    draft.value.primaryFocusLifeAreaId = primaryFocusLifeAreaId || focusLifeAreaIds[0] || ''
    draft.value.priorities = priorities.map((p) => ({
      id: p.id,
      lifeAreaIds: [...p.lifeAreaIds],
      name: p.name,
      icon: p.icon,
      successSignals: [...p.successSignals],
      constraints: [...(p.constraints || [])],
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    }))
  }

  // ============================================================================
  // Initialize
  // ============================================================================

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
    // Focus Life Area helpers
    toggleFocusLifeArea,
    setPrimaryFocusLifeArea,
    setFocusLifeAreas,
    // Priority helpers
    addPriority,
    updatePriority,
    deletePriority,
    getPrioritiesForLifeArea,
    // Edit mode helper
    seedFromExisting,
  }
}
