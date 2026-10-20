import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionGroupSelection as EmotionSelection } from '@/domain/emotionGroups'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { reportError } from '@/utils/reportError'

export const useJournalStore = defineStore('journal', () => {
  const sessionScope = createStoreSessionScope()
  // State
  const entries = ref<JournalEntry[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => {
      // Sort by createdAt descending (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  // Actions
  function withDefaults(entry: JournalEntry): JournalEntry {
    return {
      ...entry,
      emotionIds: entry.emotionIds ?? [],
      peopleTagIds: entry.peopleTagIds ?? [],
      contextTagIds: entry.contextTagIds ?? [],
    }
  }

  async function loadEntries() {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        const loadedEntries = await operation.wait(journalDexieRepository.getAll())
        entries.value = loadedEntries.map(withDefaults)
        isLoaded.value = true
      } catch (err) {
        operation.assertCurrent()
        const errorMessage = err instanceof Error ? err.message : 'Failed to load journal entries'
        error.value = errorMessage
        reportError('journalStore.loadEntries', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Hydrates the store from Dexie at most once. Components that read
   * `sortedEntries` directly (e.g. calendar summary cards) call this on
   * mount so they work on a cold start, without re-reading the database
   * on every navigation. After a failed load `isLoaded` stays false, so
   * the next caller retries.
   */
  async function ensureLoaded() {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      if (isLoaded.value || isLoading.value) return
      await operation.wait(loadEntries())
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createEntry(payload: {
    companionConversationId?: string
    title?: string
    body: string
    emotionIds?: string[]
    emotionFamilyIds?: string[]
    emotions?: EmotionSelection[]
    peopleTagIds?: string[]
    contextTagIds?: string[]
    createdAt?: string
  }) {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const entryData = {
        ...payload,
        emotionIds: payload.emotionIds ?? [],
        peopleTagIds: payload.peopleTagIds ?? [],
        contextTagIds: payload.contextTagIds ?? [],
      }
      const newEntry = withDefaults(await operation.wait(journalDexieRepository.create(entryData)))
      entries.value.push(newEntry)
      return newEntry
    } catch (err) {
      operation.assertCurrent()
      const errorMessage = err instanceof Error ? err.message : 'Failed to create journal entry'
      error.value = errorMessage
      reportError('journalStore.createEntry', err)
      throw err
    }
  }

  async function updateEntry(entry: JournalEntry) {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updatedEntry = withDefaults(await operation.wait(journalDexieRepository.update(entry)))
      const index = entries.value.findIndex(e => e.id === entry.id)
      if (index !== -1) {
        entries.value[index] = updatedEntry
      }
      return updatedEntry
    } catch (err) {
      operation.assertCurrent()
      const errorMessage = err instanceof Error ? err.message : 'Failed to update journal entry'
      error.value = errorMessage
      reportError('journalStore.updateEntry', err)
      throw err
    }
  }

  async function deleteEntry(id: string) {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(journalDexieRepository.delete(id))
        entries.value = entries.value.filter(e => e.id !== id)
      } catch (err) {
        operation.assertCurrent()
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete journal entry'
        error.value = errorMessage
        reportError('journalStore.deleteEntry', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function getEntryById(id: string): Promise<JournalEntry | undefined> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      // Check in-memory entries first
      const inMemoryEntry = entries.value.find(e => e.id === id)
      if (inMemoryEntry) {
        return withDefaults(inMemoryEntry)
      }

      // Fall back to repository if not found in memory
      const entry = await operation.wait(journalDexieRepository.getById(id))
      if (entry) {
        return withDefaults(entry)
      }

      return undefined
    } catch (err) {
      operation.assertCurrent()
      const errorMessage =
        err instanceof Error ? err.message : `Failed to retrieve journal entry with id ${id}`
      error.value = errorMessage
      reportError('journalStore.getEntryById', err)
      throw err
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    sessionScope.reset()
    entries.value = []
    isLoading.value = false
    isLoaded.value = false
    error.value = null
  }

  return {
    // State
    entries,
    isLoading,
    isLoaded,
    error,
    // Getters
    sortedEntries,
    // Actions
    loadEntries,
    ensureLoaded,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntryById,
    reset,
  }
})
