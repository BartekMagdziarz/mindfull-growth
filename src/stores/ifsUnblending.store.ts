import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSUnblendingSession,
  CreateIFSUnblendingPayload,
  UpdateIFSUnblendingPayload,
} from '@/domain/exercises'
import { ifsUnblendingDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSUnblendingStore = defineStore('ifsUnblending', () => {
  const sessionScope = createStoreSessionScope()
  const sessions = ref<IFSUnblendingSession[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestSession = computed(() => {
    return sortedSessions.value[0] ?? null
  })

  const getSessionById = computed(() => {
    return (id: string): IFSUnblendingSession | undefined => {
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
        sessions.value = await operation.wait(ifsUnblendingDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load unblending sessions'
        console.error('Error loading unblending sessions:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createSession(data: CreateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const session = await operation.wait(ifsUnblendingDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('unblending', session.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      sessions.value.push(session)
      return session
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create unblending session'
      console.error('Error creating unblending session:', err)
      throw err
    }
  }

  async function updateSession(
    id: string,
    data: UpdateIFSUnblendingPayload
  ): Promise<IFSUnblendingSession> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsUnblendingDexieRepository.update(id, data))
      const index = sessions.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update unblending session'
      console.error('Error updating unblending session:', err)
      throw err
    }
  }

  async function deleteSession(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsUnblendingDexieRepository.delete(id))
        sessions.value = sessions.value.filter(s => s.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete unblending session'
        console.error('Error deleting unblending session:', err)
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
