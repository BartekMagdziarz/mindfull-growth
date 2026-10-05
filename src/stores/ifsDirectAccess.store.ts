import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSDirectAccessSession,
  CreateIFSDirectAccessPayload,
  UpdateIFSDirectAccessPayload,
} from '@/domain/exercises'
import { ifsDirectAccessDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSDirectAccessStore = defineStore('ifsDirectAccess', () => {
  const sessionScope = createStoreSessionScope()
  const sessions = ref<IFSDirectAccessSession[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestSession = computed(() => {
    return sortedSessions.value[0] ?? null
  })

  const getSessionById = computed(() => {
    return (id: string): IFSDirectAccessSession | undefined => {
      return sessions.value.find(s => s.id === id)
    }
  })

  async function loadSessions(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        sessions.value = await operation.wait(ifsDirectAccessDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load direct access sessions'
        console.error('Error loading direct access sessions:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createSession(
    data: CreateIFSDirectAccessPayload
  ): Promise<IFSDirectAccessSession> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const session = await operation.wait(ifsDirectAccessDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('direct-access', session.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      sessions.value.push(session)
      return session
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create direct access session'
      console.error('Error creating direct access session:', err)
      throw err
    }
  }

  async function updateSession(
    id: string,
    data: UpdateIFSDirectAccessPayload
  ): Promise<IFSDirectAccessSession> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsDirectAccessDexieRepository.update(id, data))
      const index = sessions.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update direct access session'
      console.error('Error updating direct access session:', err)
      throw err
    }
  }

  async function deleteSession(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsDirectAccessDexieRepository.delete(id))
        sessions.value = sessions.value.filter(s => s.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete direct access session'
        console.error('Error deleting direct access session:', err)
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
    sessions.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    sessions,
    isLoading,
    error,
    sortedSessions,
    latestSession,
    getSessionById,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    reset,
  }
})
