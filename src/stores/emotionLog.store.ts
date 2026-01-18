import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EmotionLog } from '@/domain/emotionLog'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'

const EMOTION_VALIDATION_ERROR = 'At least one emotion must be selected'

function validateEmotionIds(emotionIds: unknown): asserts emotionIds is string[] {
  if (!Array.isArray(emotionIds) || emotionIds.length === 0) {
    throw new Error(EMOTION_VALIDATION_ERROR)
  }
}

export const useEmotionLogStore = defineStore('emotionLog', () => {
  const logs = ref<EmotionLog[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedLogs = computed(() => {
    return [...logs.value].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  function withDefaults(log: EmotionLog): EmotionLog {
    return {
      ...log,
      peopleTagIds: log.peopleTagIds ?? [],
      contextTagIds: log.contextTagIds ?? [],
      emotionIds: log.emotionIds ?? [],
    }
  }

  async function loadLogs(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const loadedLogs = await emotionLogDexieRepository.getAll()
      logs.value = loadedLogs.map(withDefaults)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load emotion logs'
      error.value = message
      console.error('Error loading emotion logs:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLog(
    payload: Omit<EmotionLog, 'id' | 'updatedAt'> & { createdAt?: string }
  ): Promise<EmotionLog> {
    error.value = null
    try {
      validateEmotionIds(payload.emotionIds)
      const createdLog = withDefaults(await emotionLogDexieRepository.create(payload))
      logs.value.push(createdLog)
      return createdLog
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create emotion log'
      error.value = message
      console.error('Error creating emotion log:', err)
      throw err
    }
  }

  async function updateLog(log: EmotionLog): Promise<EmotionLog> {
    error.value = null
    try {
      validateEmotionIds(log.emotionIds)
      const updatedLog = withDefaults(await emotionLogDexieRepository.update(log))
      const index = logs.value.findIndex((existing) => existing.id === log.id)
      if (index !== -1) {
        logs.value[index] = updatedLog
      }
      return updatedLog
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update emotion log'
      error.value = message
      console.error(`Error updating emotion log with id ${log.id}:`, err)
      throw err
    }
  }

  async function deleteLog(id: string): Promise<void> {
    error.value = null
    try {
      await emotionLogDexieRepository.delete(id)
      logs.value = logs.value.filter((log) => log.id !== id)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete emotion log'
      error.value = message
      console.error(`Error deleting emotion log with id ${id}:`, err)
      throw err
    }
  }

  return {
    logs,
    isLoading,
    error,
    sortedLogs,
    loadLogs,
    createLog,
    updateLog,
    deleteLog,
  }
})


