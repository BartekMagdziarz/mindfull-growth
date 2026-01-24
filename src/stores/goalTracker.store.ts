import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GoalTracker,
  TrackerEntry,
  CreateGoalTrackerPayload,
  CreateTrackerEntryPayload,
} from '@/domain/lifeSeasons'
import { goalTrackerDexieRepository } from '@/repositories/goalTrackerDexieRepository'

export const useGoalTrackerStore = defineStore('goalTracker', () => {
  // State
  const trackers = ref<GoalTracker[]>([])
  const entries = ref<TrackerEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedTrackers = computed(() => {
    return [...trackers.value].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  const dailyTrackers = computed(() => {
    return sortedTrackers.value.filter((t) => t.frequency === 'daily')
  })

  const weeklyTrackers = computed(() => {
    return sortedTrackers.value.filter((t) => t.frequency === 'weekly')
  })

  // Helper to get trackers by goal
  function getTrackersByGoal(goalId: string): GoalTracker[] {
    return sortedTrackers.value.filter((t) => t.goalId === goalId)
  }

  // Helper to get entries by tracker
  function getEntriesByTracker(trackerId: string): TrackerEntry[] {
    return entries.value
      .filter((e) => e.trackerId === trackerId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  // Helper to get entry for a specific tracker and date
  function getEntryByTrackerAndDate(trackerId: string, date: string): TrackerEntry | undefined {
    return entries.value.find((e) => e.trackerId === trackerId && e.date === date)
  }

  // Helper to get entries in a date range
  function getEntriesInDateRange(
    trackerId: string,
    startDate: string,
    endDate: string
  ): TrackerEntry[] {
    return entries.value
      .filter(
        (e) => e.trackerId === trackerId && e.date >= startDate && e.date <= endDate
      )
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // Helper to get today's entries for daily trackers
  function getTodayEntries(): TrackerEntry[] {
    const today = new Date().toISOString().split('T')[0]
    return entries.value.filter((e) => e.date === today)
  }

  // Helper to check if a tracker is complete for today
  function isTrackerCompleteToday(trackerId: string): boolean {
    const tracker = trackers.value.find((t) => t.id === trackerId)
    if (!tracker) return false

    const today = new Date().toISOString().split('T')[0]
    const entry = getEntryByTrackerAndDate(trackerId, today)

    if (!entry) return false

    if (tracker.type === 'boolean') {
      return entry.value === true
    }

    if (tracker.targetValue !== undefined) {
      return (entry.value as number) >= tracker.targetValue
    }

    return true
  }

  // Helper to calculate completion percentage for a tracker in a date range
  function getCompletionPercentage(
    trackerId: string,
    startDate: string,
    endDate: string
  ): number {
    const tracker = trackers.value.find((t) => t.id === trackerId)
    if (!tracker) return 0

    const entriesInRange = getEntriesInDateRange(trackerId, startDate, endDate)

    // Calculate total days in range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    if (tracker.type === 'boolean') {
      const completedDays = entriesInRange.filter((e) => e.value === true).length
      return Math.round((completedDays / totalDays) * 100)
    }

    if (tracker.targetValue !== undefined) {
      const completedDays = entriesInRange.filter(
        (e) => (e.value as number) >= tracker.targetValue!
      ).length
      return Math.round((completedDays / totalDays) * 100)
    }

    return Math.round((entriesInRange.length / totalDays) * 100)
  }

  // Actions
  async function loadTrackers() {
    isLoading.value = true
    error.value = null
    try {
      trackers.value = await goalTrackerDexieRepository.getAllTrackers()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load goal trackers'
      error.value = errorMessage
      console.error('Error loading goal trackers:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadEntries() {
    isLoading.value = true
    error.value = null
    try {
      entries.value = await goalTrackerDexieRepository.getAllEntries()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load tracker entries'
      error.value = errorMessage
      console.error('Error loading tracker entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadAll() {
    isLoading.value = true
    error.value = null
    try {
      const [loadedTrackers, loadedEntries] = await Promise.all([
        goalTrackerDexieRepository.getAllTrackers(),
        goalTrackerDexieRepository.getAllEntries(),
      ])
      trackers.value = loadedTrackers
      entries.value = loadedEntries
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load tracker data'
      error.value = errorMessage
      console.error('Error loading tracker data:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createTracker(payload: CreateGoalTrackerPayload): Promise<GoalTracker> {
    error.value = null
    try {
      const newTracker = await goalTrackerDexieRepository.createTracker(payload)
      trackers.value.push(newTracker)
      return newTracker
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create goal tracker'
      error.value = errorMessage
      console.error('Error creating goal tracker:', err)
      throw err
    }
  }

  async function updateTracker(
    id: string,
    updates: Partial<GoalTracker>
  ): Promise<GoalTracker> {
    error.value = null
    try {
      const existingTracker = trackers.value.find((t) => t.id === id)
      if (!existingTracker) {
        throw new Error(`Tracker with id ${id} not found`)
      }

      const updatedTracker: GoalTracker = {
        ...existingTracker,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const savedTracker = await goalTrackerDexieRepository.updateTracker(updatedTracker)

      const index = trackers.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        trackers.value[index] = savedTracker
      }

      return savedTracker
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update goal tracker'
      error.value = errorMessage
      console.error('Error updating goal tracker:', err)
      throw err
    }
  }

  async function deleteTracker(id: string): Promise<void> {
    error.value = null
    try {
      await goalTrackerDexieRepository.deleteTracker(id)
      trackers.value = trackers.value.filter((t) => t.id !== id)
      entries.value = entries.value.filter((e) => e.trackerId !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete goal tracker'
      error.value = errorMessage
      console.error('Error deleting goal tracker:', err)
      throw err
    }
  }

  async function createEntry(payload: CreateTrackerEntryPayload): Promise<TrackerEntry> {
    error.value = null
    try {
      const newEntry = await goalTrackerDexieRepository.createEntry(payload)

      // Update or add the entry in memory
      const existingIndex = entries.value.findIndex(
        (e) => e.trackerId === payload.trackerId && e.date === payload.date
      )
      if (existingIndex !== -1) {
        entries.value[existingIndex] = newEntry
      } else {
        entries.value.push(newEntry)
      }

      return newEntry
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create tracker entry'
      error.value = errorMessage
      console.error('Error creating tracker entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    updates: Partial<TrackerEntry>
  ): Promise<TrackerEntry> {
    error.value = null
    try {
      const existingEntry = entries.value.find((e) => e.id === id)
      if (!existingEntry) {
        throw new Error(`Entry with id ${id} not found`)
      }

      const updatedEntry: TrackerEntry = {
        ...existingEntry,
        ...updates,
      }

      const savedEntry = await goalTrackerDexieRepository.updateEntry(updatedEntry)

      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        entries.value[index] = savedEntry
      }

      return savedEntry
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update tracker entry'
      error.value = errorMessage
      console.error('Error updating tracker entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      await goalTrackerDexieRepository.deleteEntry(id)
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete tracker entry'
      error.value = errorMessage
      console.error('Error deleting tracker entry:', err)
      throw err
    }
  }

  // Quick log entry for today
  async function logTodayEntry(
    trackerId: string,
    value: number | boolean,
    note?: string
  ): Promise<TrackerEntry> {
    const today = new Date().toISOString().split('T')[0]
    return createEntry({
      trackerId,
      date: today,
      value,
      note,
    })
  }

  return {
    // State
    trackers,
    entries,
    isLoading,
    error,
    // Getters
    sortedTrackers,
    dailyTrackers,
    weeklyTrackers,
    getTrackersByGoal,
    getEntriesByTracker,
    getEntryByTrackerAndDate,
    getEntriesInDateRange,
    getTodayEntries,
    isTrackerCompleteToday,
    getCompletionPercentage,
    // Actions
    loadTrackers,
    loadEntries,
    loadAll,
    createTracker,
    updateTracker,
    deleteTracker,
    createEntry,
    updateEntry,
    deleteEntry,
    logTodayEntry,
  }
})
