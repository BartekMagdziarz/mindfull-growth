import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Positive Data Log Store
 *
 * Manages PositiveDataLogs — ongoing evidence logging against
 * negative core beliefs (Christine Padesky, 1994; Mooney & Padesky, 2000).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PositiveDataLog,
  CreatePositiveDataLogPayload,
  UpdatePositiveDataLogPayload,
} from '@/domain/exercises'
import { positiveDataLogDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const usePositiveDataLogStore = defineStore('positiveDataLog', () => {
  const sessionScope = createStoreSessionScope()
  const logs = ref<PositiveDataLog[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedLogs = computed(() => {
    return [...logs.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })

  const activeLogs = computed(() => {
    return sortedLogs.value
  })

  const latestLog = computed(() => {
    return sortedLogs.value[0] ?? null
  })

  const getLogById = computed(() => {
    return (id: string): PositiveDataLog | undefined => {
      return logs.value.find(l => l.id === id)
    }
  })

  async function loadLogs(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        logs.value = await operation.wait(positiveDataLogDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load positive data logs'
        console.error('Error loading positive data logs:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createLog(data: CreatePositiveDataLogPayload): Promise<PositiveDataLog> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const log = await operation.wait(positiveDataLogDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('positive-data-log', log.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      logs.value.push(log)
      return log
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create positive data log'
      console.error('Error creating positive data log:', err)
      throw err
    }
  }

  async function updateLog(
    id: string,
    data: UpdatePositiveDataLogPayload
  ): Promise<PositiveDataLog> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const previousEntryCount = logs.value.find(l => l.id === id)?.entries.length ?? 0
      const updated = await operation.wait(positiveDataLogDexieRepository.update(id, data))
      // Adding an entry to an ongoing log IS the exercise ("add one piece of
      // evidence") — edits/removals are not completions.
      if (updated.entries.length > previousEntryCount) {
        void useExerciseCompletionsStore()
          .record('positive-data-log', updated.id)
          .catch(err => console.error('Failed to record exercise completion:', err))
      }
      const index = logs.value.findIndex(l => l.id === id)
      if (index !== -1) {
        logs.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update positive data log'
      console.error('Error updating positive data log:', err)
      throw err
    }
  }

  async function deleteLog(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(positiveDataLogDexieRepository.delete(id))
        logs.value = logs.value.filter(l => l.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete positive data log'
        console.error('Error deleting positive data log:', err)
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
    logs.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    logs,
    isLoading,
    error,
    sortedLogs,
    activeLogs,
    latestLog,
    getLogById,
    loadLogs,
    createLog,
    updateLog,
    deleteLog,
    reset,
  }
})
