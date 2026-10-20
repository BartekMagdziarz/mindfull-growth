import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EmotionLog } from '@/domain/emotionLog'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { reportError } from '@/utils/reportError'

const EMOTION_VALIDATION_ERROR = 'At least one emotion or family must be selected'

// Wpis jest ważny, gdy wybrano przynajmniej jedną emocję LUB jedną rodzinę
// (obsługa „rodzina-only" — użytkownik mógł zatrzymać się na poziomie rodzin).
function validateSelection(emotionIds: unknown, emotionFamilyIds: unknown): void {
  const e = Array.isArray(emotionIds) ? emotionIds : []
  const f = Array.isArray(emotionFamilyIds) ? emotionFamilyIds : []
  if (e.length === 0 && f.length === 0) {
    throw new Error(EMOTION_VALIDATION_ERROR)
  }
}

export const useEmotionLogStore = defineStore('emotionLog', () => {
  const sessionScope = createStoreSessionScope()
  const logs = ref<EmotionLog[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
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
      emotionFamilyIds: log.emotionFamilyIds ?? [],
    }
  }

  async function loadLogs(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        const loadedLogs = await operation.wait(emotionLogDexieRepository.getAll())
        logs.value = loadedLogs.map(withDefaults)
        isLoaded.value = true
      } catch (err) {
        if (!operation.isCurrent()) return
        const message = err instanceof Error ? err.message : 'Failed to load emotion logs'
        error.value = message
        reportError('emotionLogStore.loadLogs', err)
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
   * `sortedLogs` directly (e.g. calendar summary cards) call this on
   * mount so they work on a cold start, without re-reading the database
   * on every navigation. After a failed load `isLoaded` stays false, so
   * the next caller retries.
   */
  async function ensureLoaded(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      if (isLoaded.value || isLoading.value) return
      await operation.wait(loadLogs())
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createLog(
    payload: Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string }
  ): Promise<EmotionLog> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      validateSelection(payload.emotionIds, payload.emotionFamilyIds)
      const createdLog = withDefaults(
        await operation.wait(emotionLogDexieRepository.create(payload))
      )
      logs.value.push(createdLog)
      return createdLog
    } catch (err) {
      operation.assertCurrent()
      const message = err instanceof Error ? err.message : 'Failed to create emotion log'
      error.value = message
      reportError('emotionLogStore.createLog', err)
      throw err
    }
  }

  async function updateLog(log: EmotionLog): Promise<EmotionLog> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      validateSelection(log.emotionIds, log.emotionFamilyIds)
      const updatedLog = withDefaults(await operation.wait(emotionLogDexieRepository.update(log)))
      const index = logs.value.findIndex(existing => existing.id === log.id)
      if (index !== -1) {
        logs.value[index] = updatedLog
      }
      return updatedLog
    } catch (err) {
      operation.assertCurrent()
      const message = err instanceof Error ? err.message : 'Failed to update emotion log'
      error.value = message
      reportError('emotionLogStore.updateLog', err)
      throw err
    }
  }

  async function deleteLog(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(emotionLogDexieRepository.delete(id))
        logs.value = logs.value.filter(log => log.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        const message = err instanceof Error ? err.message : 'Failed to delete emotion log'
        error.value = message
        reportError('emotionLogStore.deleteLog', err)
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
    isLoaded.value = false
    error.value = null
  }

  return {
    logs,
    isLoading,
    isLoaded,
    error,
    sortedLogs,
    loadLogs,
    ensureLoaded,
    createLog,
    updateLog,
    deleteLog,
    reset,
  }
})
