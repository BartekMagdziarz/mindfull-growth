import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { JournalEntry } from '@/domain/journal'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'

export const useJournalStore = defineStore('journal', () => {
  // State
  const entries = ref<JournalEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => {
      // Sort by createdAt descending (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  // Actions
  async function loadEntries() {
    isLoading.value = true
    error.value = null
    try {
      const loadedEntries = await journalDexieRepository.getAll()
      entries.value = loadedEntries
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load journal entries'
      error.value = errorMessage
      console.error('Error loading journal entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createEntry(payload: { title?: string; body: string }) {
    error.value = null
    try {
      const newEntry = await journalDexieRepository.create(payload)
      entries.value.push(newEntry)
      return newEntry
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create journal entry'
      error.value = errorMessage
      console.error('Error creating journal entry:', err)
      throw err
    }
  }

  async function updateEntry(entry: JournalEntry) {
    error.value = null
    try {
      const updatedEntry = await journalDexieRepository.update(entry)
      const index = entries.value.findIndex((e) => e.id === entry.id)
      if (index !== -1) {
        entries.value[index] = updatedEntry
      }
      return updatedEntry
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update journal entry'
      error.value = errorMessage
      console.error('Error updating journal entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string) {
    error.value = null
    try {
      await journalDexieRepository.delete(id)
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete journal entry'
      error.value = errorMessage
      console.error('Error deleting journal entry:', err)
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
    // Actions
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  }
})

