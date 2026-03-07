/**
 * Tragic Optimism Store
 *
 * Manages TragicOptimism exercises — find meaning within suffering,
 * guilt, or awareness of limited time (Viktor Frankl's tragic triad).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  TragicOptimism,
  CreateTragicOptimismPayload,
  UpdateTragicOptimismPayload,
} from '@/domain/exercises'
import { tragicOptimismDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useTragicOptimismStore = defineStore('tragicOptimism', () => {
  const entries = ref<TragicOptimism[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestEntry = computed(() => {
    return sortedEntries.value[0] ?? null
  })

  const getEntryById = computed(() => {
    return (id: string): TragicOptimism | undefined => {
      return entries.value.find((e) => e.id === id)
    }
  })

  async function loadEntries(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      entries.value = await tragicOptimismDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tragic optimism entries'
      console.error('Error loading tragic optimism entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createEntry(data: CreateTragicOptimismPayload): Promise<TragicOptimism> {
    error.value = null
    try {
      const entry = await tragicOptimismDexieRepository.create(data)
      entries.value.push(entry)
      return entry
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create tragic optimism entry'
      console.error('Error creating tragic optimism entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    data: UpdateTragicOptimismPayload,
  ): Promise<TragicOptimism> {
    error.value = null
    try {
      const updated = await tragicOptimismDexieRepository.update(id, data)
      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update tragic optimism entry'
      console.error('Error updating tragic optimism entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      await tragicOptimismDexieRepository.delete(id)
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete tragic optimism entry'
      console.error('Error deleting tragic optimism entry:', err)
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
