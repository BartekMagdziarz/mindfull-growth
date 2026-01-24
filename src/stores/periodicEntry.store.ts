import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PeriodicEntry,
  PeriodicEntryType,
  CreatePeriodicEntryPayload,
  UpdatePeriodicEntryPayload,
} from '@/domain/periodicEntry'
import { periodicEntryDexieRepository } from '@/repositories/periodicEntryDexieRepository'

export const usePeriodicEntryStore = defineStore('periodicEntry', () => {
  // State
  const entries = ref<PeriodicEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => {
      // Sort by periodStartDate descending (most recent first)
      return new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime()
    })
  })

  const weeklyEntries = computed(() => {
    return sortedEntries.value.filter((e) => e.type === 'weekly')
  })

  const monthlyEntries = computed(() => {
    return sortedEntries.value.filter((e) => e.type === 'monthly')
  })

  const quarterlyEntries = computed(() => {
    return sortedEntries.value.filter((e) => e.type === 'quarterly')
  })

  const yearlyEntries = computed(() => {
    return sortedEntries.value.filter((e) => e.type === 'yearly')
  })

  // Helper to get entries by type
  function getEntriesByType(type: PeriodicEntryType): PeriodicEntry[] {
    switch (type) {
      case 'weekly':
        return weeklyEntries.value
      case 'monthly':
        return monthlyEntries.value
      case 'quarterly':
        return quarterlyEntries.value
      case 'yearly':
        return yearlyEntries.value
    }
  }

  // Actions
  function withDefaults(entry: PeriodicEntry): PeriodicEntry {
    return {
      ...entry,
      wins: entry.wins ?? [],
      challenges: entry.challenges ?? [],
      learnings: entry.learnings ?? [],
      gratitude: entry.gratitude ?? [],
      freeWriting: entry.freeWriting ?? '',
    }
  }

  async function loadEntries() {
    isLoading.value = true
    error.value = null
    try {
      const loadedEntries = await periodicEntryDexieRepository.getAll()
      entries.value = loadedEntries.map(withDefaults)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load periodic entries'
      error.value = errorMessage
      console.error('Error loading periodic entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createEntry(payload: CreatePeriodicEntryPayload): Promise<PeriodicEntry> {
    error.value = null
    try {
      const newEntry = withDefaults(await periodicEntryDexieRepository.create(payload))
      entries.value.push(newEntry)
      return newEntry
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create periodic entry'
      error.value = errorMessage
      console.error('Error creating periodic entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    updates: UpdatePeriodicEntryPayload
  ): Promise<PeriodicEntry> {
    error.value = null
    try {
      // Find the existing entry
      const existingEntry = entries.value.find((e) => e.id === id)
      if (!existingEntry) {
        throw new Error(`Periodic entry with id ${id} not found`)
      }

      // Merge updates
      const updatedEntry: PeriodicEntry = {
        ...existingEntry,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const savedEntry = withDefaults(await periodicEntryDexieRepository.update(updatedEntry))

      // Update in-memory state
      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        entries.value[index] = savedEntry
      }

      return savedEntry
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update periodic entry'
      error.value = errorMessage
      console.error('Error updating periodic entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      await periodicEntryDexieRepository.delete(id)
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete periodic entry'
      error.value = errorMessage
      console.error('Error deleting periodic entry:', err)
      throw err
    }
  }

  async function getEntryById(id: string): Promise<PeriodicEntry | undefined> {
    error.value = null
    try {
      // Check in-memory entries first
      const inMemoryEntry = entries.value.find((e) => e.id === id)
      if (inMemoryEntry) {
        return withDefaults(inMemoryEntry)
      }

      // Fall back to repository if not found in memory
      const entry = await periodicEntryDexieRepository.getById(id)
      if (entry) {
        return withDefaults(entry)
      }

      return undefined
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to retrieve periodic entry with id ${id}`
      error.value = errorMessage
      console.error(`Error retrieving periodic entry with id ${id}:`, err)
      throw err
    }
  }

  async function getEntryByTypeAndPeriodStart(
    type: PeriodicEntryType,
    periodStartDate: string
  ): Promise<PeriodicEntry | undefined> {
    error.value = null
    try {
      // Check in-memory entries first
      const inMemoryEntry = entries.value.find(
        (e) => e.type === type && e.periodStartDate === periodStartDate
      )
      if (inMemoryEntry) {
        return withDefaults(inMemoryEntry)
      }

      // Fall back to repository
      const entry = await periodicEntryDexieRepository.getByTypeAndPeriodStart(
        type,
        periodStartDate
      )
      if (entry) {
        return withDefaults(entry)
      }

      return undefined
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to retrieve ${type} entry for ${periodStartDate}`
      error.value = errorMessage
      console.error(`Error retrieving ${type} entry for ${periodStartDate}:`, err)
      throw err
    }
  }

  async function getPreviousEntry(
    type: PeriodicEntryType,
    currentPeriodStart: string
  ): Promise<PeriodicEntry | undefined> {
    error.value = null
    try {
      const entry = await periodicEntryDexieRepository.getPreviousEntry(type, currentPeriodStart)
      if (entry) {
        return withDefaults(entry)
      }
      return undefined
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to retrieve previous entry'
      error.value = errorMessage
      console.error('Error retrieving previous entry:', err)
      throw err
    }
  }

  return {
    // State
    entries,
    isLoading,
    error,
    // Getters
    sortedEntries,
    weeklyEntries,
    monthlyEntries,
    quarterlyEntries,
    yearlyEntries,
    getEntriesByType,
    // Actions
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntryById,
    getEntryByTypeAndPeriodStart,
    getPreviousEntry,
  }
})
