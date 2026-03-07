/**
 * Yearly Reflection Draft Composable
 *
 * Manages the in-progress state of the yearly reflection flow using IndexedDB.
 * This allows users to navigate away and resume their progress without losing data,
 * even after browser refresh or tab close.
 */

import { ref, watch, onBeforeUnmount } from 'vue'
import { loadDraftFromDB, saveDraftToDB, clearDraftFromDB } from '@/services/draftStorage'

export interface DraftSuccessByArea {
  area: string
  whatWentWell: string[]
  surprises: string
  learnings: string
  moreOf: string
  lessOf: string
}

export interface DraftChallenge {
  challenge: string
  whoOrWhatHelped: string
  whatYouLearned: string
}

export interface YearlyReflectionDraft {
  activeStep: number
  successesByArea: DraftSuccessByArea[]
  challenges: DraftChallenge[]
  favoriteExperiences: {
    books: string[]
    learnings: string[]
    movies: string[]
    photosAndVideos: string[]
    trips: string[]
    events: string[]
    moments: string[]
  }
  gratitude: {
    people: string[]
    experiences: string[]
    opportunities: string[]
  }
  healthReflection: {
    whatImproved: string
    howItHelped: string
    whatHindered: string
    habitsToKeep: string
    oneChangeForNextYear: string
  }
  forgiveness: string
  lettingGo: string
  yearInOnePhrase: string
  biggestWins: string[]
  biggestLessons: string[]
  carryForward: string
}

const createDefaultDraft = (): YearlyReflectionDraft => ({
  activeStep: 0,
  successesByArea: [],
  challenges: [],
  favoriteExperiences: {
    books: [],
    learnings: [],
    movies: [],
    photosAndVideos: [],
    trips: [],
    events: [],
    moments: [],
  },
  gratitude: {
    people: [],
    experiences: [],
    opportunities: [],
  },
  healthReflection: {
    whatImproved: '',
    howItHelped: '',
    whatHindered: '',
    habitsToKeep: '',
    oneChangeForNextYear: '',
  },
  forgiveness: '',
  lettingGo: '',
  yearInOnePhrase: '',
  biggestWins: [],
  biggestLessons: [],
  carryForward: '',
})

function getStorageKey(planId: string): string {
  return `yearly-reflection-draft-${planId}`
}

export function useYearlyReflectionDraft(planId: string) {
  const draft = ref<YearlyReflectionDraft>(createDefaultDraft())
  const isLoaded = ref(false)
  const _draftFound = ref(false)
  const storageKey = getStorageKey(planId)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  async function loadDraft(): Promise<void> {
    try {
      const stored = await loadDraftFromDB(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<YearlyReflectionDraft>
        const defaults = createDefaultDraft()
        draft.value = {
          ...defaults,
          ...parsed,
          favoriteExperiences: {
            ...defaults.favoriteExperiences,
            ...(parsed.favoriteExperiences || {}),
          },
          gratitude: {
            ...defaults.gratitude,
            ...(parsed.gratitude || {}),
          },
          healthReflection: {
            ...defaults.healthReflection,
            ...(parsed.healthReflection || {}),
          },
        }
        _draftFound.value = true
      }
    } catch (error) {
      console.warn('Failed to load yearly reflection draft:', error)
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
