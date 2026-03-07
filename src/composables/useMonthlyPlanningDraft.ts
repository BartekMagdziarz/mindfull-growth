/**
 * Monthly Planning Draft Composable
 *
 * Manages the in-progress state of the monthly planning flow using IndexedDB.
 * This allows users to navigate away and resume their progress without losing data,
 * even after browser refresh or tab close.
 * Final persistence to IndexedDB happens only when the user completes the flow.
 */

import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { ProjectStatus, Tracker } from '@/domain/planning'

/**
 * Draft Project - temporary state before committing to IndexedDB
 */
export interface DraftProject {
  id: string
  name: string
  icon?: string
  lifeAreaIds: string[]
  priorityIds: string[]
  description?: string
  targetOutcome?: string
  objective?: string
  startDate?: string
  endDate?: string
  focusMonthIds?: string[]
  /** Focus toggle for current month in draft */
  isFocusedThisMonth?: boolean
  /** Draft key results for this project */
  keyResults?: Partial<Tracker>[]
  status: ProjectStatus
  sortOrder: number
  /** Indicates this project was carried forward from previous month */
  isCarriedForward?: boolean
}

function cloneDraftKeyResult(keyResult: Partial<Tracker>): Partial<Tracker> {
  return {
    ...keyResult,
    lifeAreaIds: Array.isArray(keyResult.lifeAreaIds) ? [...keyResult.lifeAreaIds] : [],
    priorityIds: Array.isArray(keyResult.priorityIds) ? [...keyResult.priorityIds] : [],
    tickLabels: Array.isArray(keyResult.tickLabels) ? [...keyResult.tickLabels] : undefined,
  }
}

function normalizeDraftKeyResults(keyResults?: Partial<Tracker>[]): Partial<Tracker>[] {
  if (!Array.isArray(keyResults)) return []
  return keyResults.map((keyResult) => cloneDraftKeyResult(keyResult))
}

/**
 * Draft data structure for monthly planning flow
 */
export interface MonthlyPlanningDraft {
  /** Current step index (0-based) */
  activeStep: number
  /** Start date for the month (user-defined) */
  startDate: string
  /** End date for the month (user-defined) */
  endDate: string
  /** Optional custom name for the period */
  name: string
  /** Primary focus life area for the month (required) */
  primaryFocusLifeAreaId: string
  /** Secondary focus life areas (max 2) */
  secondaryFocusLifeAreaIds: string[]
  /** Overall intention for the month */
  monthIntention: string
  /** Observable signal that indicates monthly focus success */
  focusSuccessSignal: string
  /** Boundary that protects balance while pursuing focus */
  balanceGuardrail: string
  /** Draft projects for the month */
  projects: DraftProject[]
  /** Explicit tracker selection for this month (project tracker IDs) */
  selectedTrackerIds: string[]
  /** True once the user manually changes tracker selection */
  hasCustomTrackerSelection: boolean
}

/**
 * Default/initial draft values
 */
const createDefaultDraft = (): MonthlyPlanningDraft => {
  // Default to current month's date range
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  return {
    activeStep: 0,
    startDate,
    endDate,
    name: '',
    primaryFocusLifeAreaId: '',
    secondaryFocusLifeAreaIds: [],
    monthIntention: '',
    focusSuccessSignal: '',
    balanceGuardrail: '',
    projects: [],
    selectedTrackerIds: [],
    hasCustomTrackerSelection: false,
  }
}

/**
 * Generate the storage key for a given month
 */
function getStorageKey(monthId: string): string {
  return `monthly-planning-draft-${monthId}`
}

/**
 * Composable for managing monthly planning draft state
 *
 * @param monthId - The month ID being planned (for new plans, use 'new')
 * @returns Draft state and methods for managing it
 */
export function useMonthlyPlanningDraft(monthId: string) {
  // ============================================================================
  // State
  // ============================================================================

  /** The current draft data */
  const draft = ref<MonthlyPlanningDraft>(createDefaultDraft())

  /** Whether the draft has been loaded from storage */
  const isLoaded = ref(false)

  /** Whether a saved draft was found during load */
  const _draftFound = ref(false)

  /** Storage key for this month's draft */
  const storageKey = computed(() => getStorageKey(monthId))

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
        const parsed = JSON.parse(stored) as Partial<MonthlyPlanningDraft> & {
          primaryFocusAreaId?: string
          secondaryFocusAreaIds?: string[]
          projects?: Array<{
            focusAreaId?: string
            priorityId?: string
            lifeAreaIds?: string[]
            priorityIds?: string[]
            keyResults?: Partial<Tracker>[]
          }>
        }
        // Merge with defaults to handle any missing fields
        const merged: MonthlyPlanningDraft = {
          ...createDefaultDraft(),
          ...parsed,
        }

        if (!merged.primaryFocusLifeAreaId && parsed.primaryFocusAreaId) {
          merged.primaryFocusLifeAreaId = parsed.primaryFocusAreaId
        }
        if (merged.secondaryFocusLifeAreaIds.length === 0 && parsed.secondaryFocusAreaIds) {
          merged.secondaryFocusLifeAreaIds = [...parsed.secondaryFocusAreaIds]
        }
        merged.selectedTrackerIds = merged.selectedTrackerIds ?? []
        merged.hasCustomTrackerSelection = merged.hasCustomTrackerSelection ?? false

        merged.projects = (merged.projects || []).map((project) => {
          const legacyProject = project as DraftProject & {
            focusAreaId?: string
            priorityId?: string
          }
          const focusMonthIds = project.focusMonthIds ?? []
          return {
            ...project,
            icon: project.icon,
            lifeAreaIds:
              project.lifeAreaIds ??
              (legacyProject.focusAreaId ? [legacyProject.focusAreaId] : []),
            priorityIds:
              project.priorityIds ??
              (legacyProject.priorityId ? [legacyProject.priorityId] : []),
            focusMonthIds,
            isFocusedThisMonth: project.isFocusedThisMonth ?? true,
            keyResults: normalizeDraftKeyResults(project.keyResults),
          }
        })

        draft.value = merged
        _draftFound.value = true
      }
    } catch (error) {
      console.warn('Failed to load monthly planning draft:', error)
      // Keep default values on error
    }
    isLoaded.value = true
  }

  /**
   * Save draft to IndexedDB (debounced).
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
    draft.value = createDefaultDraft()
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
  // Project Helpers
  // ============================================================================

  /**
   * Add a new project to the draft
   */
  function addProject(project: Omit<DraftProject, 'id' | 'sortOrder'>): string {
    const id = crypto.randomUUID()
    const sortOrder = draft.value.projects.length
    draft.value.projects.push({
      ...project,
      id,
      sortOrder,
      focusMonthIds: project.focusMonthIds ?? [],
      isFocusedThisMonth: project.isFocusedThisMonth ?? true,
      keyResults: normalizeDraftKeyResults(project.keyResults),
    })
    return id
  }

  /**
   * Adopt an existing project into the draft, preserving its ID.
   * Used for carrying forward non-terminal projects from previous months.
   */
  function adoptProject(existingProject: {
    id: string
    name: string
    icon?: string
    lifeAreaIds: string[]
    priorityIds: string[]
    description?: string
    targetOutcome?: string
    objective?: string
    startDate?: string
    endDate?: string
    focusMonthIds?: string[]
    keyResults?: Partial<Tracker>[]
    status: ProjectStatus
  }): void {
    // Skip if already in draft
    if (draft.value.projects.some((p) => p.id === existingProject.id)) return

    draft.value.projects.push({
      ...existingProject,
      sortOrder: draft.value.projects.length,
      isCarriedForward: true,
      isFocusedThisMonth: true,
      keyResults: normalizeDraftKeyResults(existingProject.keyResults),
    })
  }

  /**
   * Update an existing project in the draft
   */
  function updateProject(id: string, updates: Partial<Omit<DraftProject, 'id'>>): void {
    const index = draft.value.projects.findIndex((p) => p.id === id)
    if (index !== -1) {
      draft.value.projects[index] = { ...draft.value.projects[index], ...updates }
    }
  }

  /**
   * Delete a project from the draft
   */
  function deleteProject(id: string): void {
    draft.value.projects = draft.value.projects.filter((p) => p.id !== id)
    // Recalculate sortOrders
    draft.value.projects.forEach((p, index) => {
      p.sortOrder = index
    })
  }

  /**
   * Reorder projects based on new order of IDs
   */
  function reorderProjects(idsInOrder: string[]): void {
    const reordered: DraftProject[] = []
    idsInOrder.forEach((id, index) => {
      const project = draft.value.projects.find((p) => p.id === id)
      if (project) {
        reordered.push({ ...project, sortOrder: index })
      }
    })
    draft.value.projects = reordered
  }

  // ============================================================================
  // Focus Life Area Selection Helpers
  // ============================================================================

  /**
   * Set the primary focus life area (clears it from secondary if present)
   */
  function setPrimaryFocusLifeArea(lifeAreaId: string): void {
    draft.value.primaryFocusLifeAreaId = lifeAreaId
    // Remove from secondary if it was there
    draft.value.secondaryFocusLifeAreaIds = draft.value.secondaryFocusLifeAreaIds.filter(
      (id) => id !== lifeAreaId
    )
  }

  /**
   * Toggle a secondary focus life area (max 2, can't be primary)
   */
  function toggleSecondaryFocusLifeArea(lifeAreaId: string): void {
    // Can't add primary as secondary
    if (lifeAreaId === draft.value.primaryFocusLifeAreaId) {
      return
    }

    const isSelected = draft.value.secondaryFocusLifeAreaIds.includes(lifeAreaId)
    if (isSelected) {
      draft.value.secondaryFocusLifeAreaIds = draft.value.secondaryFocusLifeAreaIds.filter(
        (id) => id !== lifeAreaId
      )
    } else if (draft.value.secondaryFocusLifeAreaIds.length < 2) {
      draft.value.secondaryFocusLifeAreaIds.push(lifeAreaId)
    }
  }

  /**
   * Check if a secondary focus life area can be selected (max 2, not primary)
   */
  function canSelectSecondaryFocusLifeArea(lifeAreaId: string): boolean {
    if (lifeAreaId === draft.value.primaryFocusLifeAreaId) {
      return false
    }
    if (draft.value.secondaryFocusLifeAreaIds.includes(lifeAreaId)) {
      return true // Can always deselect
    }
    return draft.value.secondaryFocusLifeAreaIds.length < 2
  }

  // ============================================================================
  // Edit Mode Helper
  // ============================================================================

  /**
   * Seed the draft from existing MonthlyPlan and Projects (for edit mode)
   */
  function seedFromExisting(
    monthlyPlan: {
      startDate: string
      endDate: string
      name?: string
      primaryFocusLifeAreaId?: string
      secondaryFocusLifeAreaIds: string[]
      monthIntention?: string
      focusSuccessSignal?: string
      balanceGuardrail?: string
      selectedTrackerIds?: string[]
    },
    existingProjects: Array<{
      id: string
      name: string
      icon?: string
      lifeAreaIds: string[]
      priorityIds: string[]
      description?: string
      targetOutcome?: string
      objective?: string
      startDate?: string
      endDate?: string
      focusMonthIds?: string[]
      keyResults?: Partial<Tracker>[]
      status: ProjectStatus
    }>,
    currentPlanId?: string
  ): void {
    draft.value.startDate = monthlyPlan.startDate
    draft.value.endDate = monthlyPlan.endDate
    draft.value.name = monthlyPlan.name || ''
    draft.value.primaryFocusLifeAreaId = monthlyPlan.primaryFocusLifeAreaId || ''
    draft.value.secondaryFocusLifeAreaIds = [...monthlyPlan.secondaryFocusLifeAreaIds]
    draft.value.monthIntention = monthlyPlan.monthIntention || ''
    draft.value.focusSuccessSignal = monthlyPlan.focusSuccessSignal || ''
    draft.value.balanceGuardrail = monthlyPlan.balanceGuardrail || ''
    draft.value.selectedTrackerIds = [...(monthlyPlan.selectedTrackerIds ?? [])]
    draft.value.hasCustomTrackerSelection = Array.isArray(monthlyPlan.selectedTrackerIds)

    draft.value.projects = existingProjects.map((p, index) => {
      const focusMonthIds = p.focusMonthIds ?? []
      const hasExplicitFocus = p.focusMonthIds !== undefined
      return {
        id: p.id,
        name: p.name,
        icon: p.icon,
        lifeAreaIds: p.lifeAreaIds ?? [],
        priorityIds: p.priorityIds ?? [],
        description: p.description,
        targetOutcome: p.targetOutcome,
        objective: p.objective,
        startDate: p.startDate,
        endDate: p.endDate,
        focusMonthIds,
        isFocusedThisMonth: currentPlanId
          ? (hasExplicitFocus ? focusMonthIds.includes(currentPlanId) : true)
          : true,
        keyResults: normalizeDraftKeyResults(p.keyResults),
        status: p.status,
        sortOrder: index,
        isCarriedForward: false,
      }
    })
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
    // Project helpers
    addProject,
    adoptProject,
    updateProject,
    deleteProject,
    reorderProjects,
    // Focus life area selection helpers
    setPrimaryFocusLifeArea,
    toggleSecondaryFocusLifeArea,
    canSelectSecondaryFocusLifeArea,
    // Edit mode helper
    seedFromExisting,
  }
}
