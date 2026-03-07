/**
 * Worry Tree Store
 *
 * Manages WorryTreeEntries — quick anxiety management exercises using
 * a decision flowchart (Adrian Wells, 1997; Robert Leahy, 2005).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  WorryTreeEntry,
  CreateWorryTreeEntryPayload,
  UpdateWorryTreeEntryPayload,
} from '@/domain/exercises'
import { worryTreeEntryDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useWorryTreeStore = defineStore('worryTree', () => {
  const entries = ref<WorryTreeEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestEntry = computed(() => {
    return sortedEntries.value[0] ?? null
  })

  const getEntryById = computed(() => {
    return (id: string): WorryTreeEntry | undefined => {
      return entries.value.find((e) => e.id === id)
    }
  })

  async function loadEntries(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      entries.value = await worryTreeEntryDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load worry tree entries'
      console.error('Error loading worry tree entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createEntry(data: CreateWorryTreeEntryPayload): Promise<WorryTreeEntry> {
    error.value = null
    try {
      const entry = await worryTreeEntryDexieRepository.create(data)
      entries.value.push(entry)
      return entry
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create worry tree entry'
      console.error('Error creating worry tree entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    data: UpdateWorryTreeEntryPayload,
  ): Promise<WorryTreeEntry> {
    error.value = null
    try {
      const updated = await worryTreeEntryDexieRepository.update(id, data)
      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update worry tree entry'
      console.error('Error updating worry tree entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      await worryTreeEntryDexieRepository.delete(id)
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete worry tree entry'
      console.error('Error deleting worry tree entry:', err)
      throw err
    }
  }

  return {
    entries,
    isLoading,
    error,
    sortedEntries,
    latestEntry,
    getEntryById,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  }
})
