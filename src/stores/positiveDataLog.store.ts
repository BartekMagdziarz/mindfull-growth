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

export const usePositiveDataLogStore = defineStore('positiveDataLog', () => {
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
      return logs.value.find((l) => l.id === id)
    }
  })

  async function loadLogs(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      logs.value = await positiveDataLogDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load positive data logs'
      console.error('Error loading positive data logs:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLog(data: CreatePositiveDataLogPayload): Promise<PositiveDataLog> {
    error.value = null
    try {
      const log = await positiveDataLogDexieRepository.create(data)
      logs.value.push(log)
      return log
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create positive data log'
      console.error('Error creating positive data log:', err)
      throw err
    }
  }

  async function updateLog(
    id: string,
    data: UpdatePositiveDataLogPayload,
  ): Promise<PositiveDataLog> {
    error.value = null
    try {
      const updated = await positiveDataLogDexieRepository.update(id, data)
      const index = logs.value.findIndex((l) => l.id === id)
      if (index !== -1) {
        logs.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update positive data log'
      console.error('Error updating positive data log:', err)
      throw err
    }
  }

  async function deleteLog(id: string): Promise<void> {
    error.value = null
    try {
      await positiveDataLogDexieRepository.delete(id)
      logs.value = logs.value.filter((l) => l.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete positive data log'
      console.error('Error deleting positive data log:', err)
      throw err
    }
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
  }
})
