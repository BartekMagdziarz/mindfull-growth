import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSTrailheadEntry,
  CreateIFSTrailheadPayload,
  UpdateIFSTrailheadPayload,
} from '@/domain/exercises'
import { ifsTrailheadDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSTrailheadStore = defineStore('ifsTrailhead', () => {
  const entries = ref<IFSTrailheadEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedEntries = computed(() => {
    return [...entries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestEntry = computed(() => {
    return sortedEntries.value[0] ?? null
  })

  const getEntryById = computed(() => {
    return (id: string): IFSTrailheadEntry | undefined => {
      return entries.value.find((e) => e.id === id)
    }
  })

  const hasEnoughForAnalysis = computed(() => {
    return entries.value.length >= 3
  })

  async function loadEntries(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      entries.value = await ifsTrailheadDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load trailhead entries'
      console.error('Error loading trailhead entries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createEntry(data: CreateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    error.value = null
    try {
      const entry = await ifsTrailheadDexieRepository.create(data)
      entries.value.push(entry)
      return entry
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create trailhead entry'
      console.error('Error creating trailhead entry:', err)
      throw err
    }
  }

  async function updateEntry(id: string, data: UpdateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    error.value = null
    try {
      const updated = await ifsTrailheadDexieRepository.update(id, data)
      const index = entries.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update trailhead entry'
      console.error('Error updating trailhead entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    error.value = null
    try {
      await ifsTrailheadDexieRepository.delete(id)
      entries.value = entries.value.filter((e) => e.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete trailhead entry'
      console.error('Error deleting trailhead entry:', err)
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
    hasEnoughForAnalysis,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  }
})
