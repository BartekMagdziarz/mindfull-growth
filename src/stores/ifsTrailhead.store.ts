import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSTrailheadEntry,
  CreateIFSTrailheadPayload,
  UpdateIFSTrailheadPayload,
} from '@/domain/exercises'
import { ifsTrailheadDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSTrailheadStore = defineStore('ifsTrailhead', () => {
  const sessionScope = createStoreSessionScope()
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
      return entries.value.find(e => e.id === id)
    }
  })

  const hasEnoughForAnalysis = computed(() => {
    return entries.value.length >= 3
  })

  async function loadEntries(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        entries.value = await operation.wait(ifsTrailheadDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load trailhead entries'
        console.error('Error loading trailhead entries:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createEntry(data: CreateIFSTrailheadPayload): Promise<IFSTrailheadEntry> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const entry = await operation.wait(ifsTrailheadDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('trailhead', entry.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      entries.value.push(entry)
      return entry
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create trailhead entry'
      console.error('Error creating trailhead entry:', err)
      throw err
    }
  }

  async function updateEntry(
    id: string,
    data: UpdateIFSTrailheadPayload
  ): Promise<IFSTrailheadEntry> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsTrailheadDexieRepository.update(id, data))
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update trailhead entry'
      console.error('Error updating trailhead entry:', err)
      throw err
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsTrailheadDexieRepository.delete(id))
        entries.value = entries.value.filter(e => e.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete trailhead entry'
        console.error('Error deleting trailhead entry:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
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
    error.value = null
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
    reset,
  }
})
