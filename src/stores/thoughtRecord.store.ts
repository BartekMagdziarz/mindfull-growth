import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Thought Record Store
 *
 * Manages ThoughtRecords — 7-column cognitive restructuring exercises.
 * Each completion creates a new record, forming a time-series.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ThoughtRecord,
  CreateThoughtRecordPayload,
  UpdateThoughtRecordPayload,
} from '@/domain/exercises'
import { thoughtRecordDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useThoughtRecordStore = defineStore('thoughtRecord', () => {
  const sessionScope = createStoreSessionScope()
  const records = ref<ThoughtRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestRecord = computed(() => {
    return sortedRecords.value[0] ?? null
  })

  const getRecordById = computed(() => {
    return (id: string): ThoughtRecord | undefined => {
      return records.value.find(r => r.id === id)
    }
  })

  async function loadRecords(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        records.value = await operation.wait(thoughtRecordDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load thought records'
        console.error('Error loading thought records:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createRecord(data: CreateThoughtRecordPayload): Promise<ThoughtRecord> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const record = await operation.wait(thoughtRecordDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('thought-record', record.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      records.value.push(record)
      return record
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create thought record'
      console.error('Error creating thought record:', err)
      throw err
    }
  }

  async function updateRecord(
    id: string,
    data: UpdateThoughtRecordPayload
  ): Promise<ThoughtRecord> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(thoughtRecordDexieRepository.update(id, data))
      const index = records.value.findIndex(r => r.id === id)
      if (index !== -1) {
        records.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update thought record'
      console.error('Error updating thought record:', err)
      throw err
    }
  }

  async function deleteRecord(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(thoughtRecordDexieRepository.delete(id))
        records.value = records.value.filter(r => r.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete thought record'
        console.error('Error deleting thought record:', err)
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
    records.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    records,
    isLoading,
    error,
    sortedRecords,
    latestRecord,
    getRecordById,
    loadRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    reset,
  }
})
