/**
 * Monthly Reflection Draft Composable
 *
 * Manages the in-progress state of the monthly reflection flow using IndexedDB.
 * This allows users to navigate away and resume their progress without losing data,
 * even after browser refresh or tab close.
 */

import { ref, watch, onBeforeUnmount } from 'vue'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'

interface DraftDirectionRatings {
  projects: number | null
  priorities: number | null
  relationships: number | null
  meaning: number | null
  impact: number | null
  stuckness: number | null
}

export interface DraftProjectReview {
  projectId: string
  progress: number | null
  decision: 'continue' | 'rescope' | 'pause' | 'complete' | 'abandon'
  note: string
}

export interface DraftFocusAreaReview {
  lifeAreaId: string
  progress: number | null
  deteriorated: boolean
  note: string
}

export interface MonthlyReflectionDraft {
  activeStep: number
  directionRatings: DraftDirectionRatings
  projectReviews: DraftProjectReview[]
  focusAreaReview: DraftFocusAreaReview[]
  courseCorrection: {
    start: string[]
    stop: string[]
    continue: string[]
    ifThenPlan: string
  }
  wins: string[]
  challenges: string[]
  learnings: string[]
  adjustments: string
}

const createDefaultDirectionRatings = (): DraftDirectionRatings => ({
  projects: null,
  priorities: null,
  relationships: null,
  meaning: null,
  impact: null,
  stuckness: null,
})

const createDefaultDraft = (): MonthlyReflectionDraft => ({
  activeStep: 0,
  directionRatings: createDefaultDirectionRatings(),
  projectReviews: [],
  focusAreaReview: [],
  courseCorrection: {
    start: [],
    stop: [],
    continue: [],
    ifThenPlan: '',
  },
  wins: [],
  challenges: [],
  learnings: [],
  adjustments: '',
})

function getStorageKey(planId: string): string {
  return `monthly-reflection-draft-${planId}`
}

export function useMonthlyReflectionDraft(planId: string) {
  const draft = ref<MonthlyReflectionDraft>(createDefaultDraft())
  const isLoaded = ref(false)
  const _draftFound = ref(false)
  const storageKey = getStorageKey(planId)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  async function loadDraft(): Promise<void> {
    try {
      const stored = await loadDraftFromDB(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MonthlyReflectionDraft>
        const defaults = createDefaultDraft()

        draft.value = {
          ...defaults,
          ...parsed,
          directionRatings: {
            ...defaults.directionRatings,
            ...(parsed.directionRatings || {}),
          },
          projectReviews: (parsed.projectReviews || []).map((item) => ({
            projectId: item.projectId,
            progress: item.progress ?? null,
            decision: item.decision ?? 'continue',
            note: item.note ?? '',
          })),
          focusAreaReview: (parsed.focusAreaReview || []).map((item) => ({
            lifeAreaId: item.lifeAreaId,
            progress: item.progress ?? null,
            deteriorated: item.deteriorated ?? false,
            note: item.note ?? '',
          })),
          courseCorrection: {
            ...defaults.courseCorrection,
            ...(parsed.courseCorrection || {}),
            start: parsed.courseCorrection?.start ?? [],
            stop: parsed.courseCorrection?.stop ?? [],
            continue: parsed.courseCorrection?.continue ?? [],
            ifThenPlan: parsed.courseCorrection?.ifThenPlan ?? '',
          },
          wins: parsed.wins ?? [],
          challenges: parsed.challenges ?? [],
          learnings: parsed.learnings ?? [],
          adjustments: parsed.adjustments ?? '',
        }
        _draftFound.value = true
      }
    } catch (error) {
      console.warn('Failed to load monthly reflection draft:', error)
    }

    isLoaded.value = true
  }

  function scheduleSave(): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveDraftToDB(storageKey, JSON.stringify(draft.value))
    }, 300)
  }

  function flushSave(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      saveDraftToDB(storageKey, JSON.stringify(draft.value))
    }
  }

  function saveDraft(): void {
    saveDraftToDB(storageKey, JSON.stringify(draft.value))
  }

  function clearDraft(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    clearDraftFromDB(storageKey)
    _draftFound.value = false
    draft.value = createDefaultDraft()
  }

  function hasDraft(): boolean {
    return _draftFound.value
  }

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

  const ready = loadDraft()

  return {
    draft,
    isLoaded,
    ready,
    saveDraft,
    clearDraft,
    hasDraft,
  }
}
