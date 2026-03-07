/**
 * Weekly Reflection Draft Composable
 *
 * Manages the in-progress state of the weekly reflection flow using IndexedDB.
 * This allows users to navigate away and resume their progress without losing data,
 * even after browser refresh or tab close.
 */

import { ref, watch, onBeforeUnmount } from 'vue'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'
import type { CommitmentStatus } from '@/domain/planning'

type WeeklyBatteryKey = 'body' | 'mind' | 'emotion' | 'social'

interface BatteryRating {
  demand: number | null
  state: number | null
}

interface CommitmentEdit {
  status: CommitmentStatus
  reflectionNote: string
}

export interface WeeklyReflectionDraft {
  /** Commitment edits keyed by commitment ID */
  commitmentEdits: Record<string, CommitmentEdit>
  /** Battery check-in ratings */
  batteryRatings: Record<WeeklyBatteryKey, BatteryRating>
  /** Battery check-in notes */
  batteryNotes: Record<WeeklyBatteryKey, string>
  /** Reflection prompt: what helped */
  whatHelped: string
  /** Reflection prompt: what got in the way */
  whatGotInTheWay: string
  /** Reflection prompt: what I learned */
  whatILearned: string
  /** Forward handoff seed */
  nextWeekSeed: string
  /** Battery drainers */
  batteryDrainers: string
  /** Battery rechargers */
  batteryRechargers: string
  /** Battery boundary for next week */
  batteryBoundaryNextWeek: string
  /** IFS reflection note */
  ifsReflectionNote: string
}

const createDefaultBatteryRatings = (): Record<WeeklyBatteryKey, BatteryRating> => ({
  body: { demand: null, state: null },
  mind: { demand: null, state: null },
  emotion: { demand: null, state: null },
  social: { demand: null, state: null },
})

const createDefaultBatteryNotes = (): Record<WeeklyBatteryKey, string> => ({
  body: '',
  mind: '',
  emotion: '',
  social: '',
})

const createDefaultDraft = (): WeeklyReflectionDraft => ({
  commitmentEdits: {},
  batteryRatings: createDefaultBatteryRatings(),
  batteryNotes: createDefaultBatteryNotes(),
  whatHelped: '',
  whatGotInTheWay: '',
  whatILearned: '',
  nextWeekSeed: '',
  batteryDrainers: '',
  batteryRechargers: '',
  batteryBoundaryNextWeek: '',
  ifsReflectionNote: '',
})

function getStorageKey(planId: string): string {
  return `weekly-reflection-draft-${planId}`
}

export function useWeeklyReflectionDraft(planId: string) {
  const draft = ref<WeeklyReflectionDraft>(createDefaultDraft())
  const isLoaded = ref(false)
  const _draftFound = ref(false)
  const storageKey = getStorageKey(planId)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  async function loadDraft(): Promise<void> {
    try {
      const stored = await loadDraftFromDB(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<WeeklyReflectionDraft>
        const defaults = createDefaultDraft()

        draft.value = {
          ...defaults,
          ...parsed,
          commitmentEdits: parsed.commitmentEdits ?? {},
          batteryRatings: {
            ...defaults.batteryRatings,
            ...(parsed.batteryRatings || {}),
          },
          batteryNotes: {
            ...defaults.batteryNotes,
            ...(parsed.batteryNotes || {}),
          },
        }
        _draftFound.value = true
      }
    } catch (error) {
      console.warn('Failed to load weekly reflection draft:', error)
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
    { deep: true },
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
