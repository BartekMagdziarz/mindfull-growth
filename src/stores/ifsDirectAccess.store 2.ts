import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSDirectAccessSession,
  CreateIFSDirectAccessPayload,
  UpdateIFSDirectAccessPayload,
} from '@/domain/exercises'
import { ifsDirectAccessDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSDirectAccessStore = defineStore('ifsDirectAccess', () => {
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
      return sessions.value.find((s) => s.id === id)
    }
  })

  async function loadSessions(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      sessions.value = await ifsDirectAccessDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load direct access sessions'
      console.error('Error loading direct access sessions:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createSession(data: CreateIFSDirectAccessPayload): Promise<IFSDirectAccessSession> {
    error.value = null
    try {
      const session = await ifsDirectAccessDexieRepository.create(data)
      sessions.value.push(session)
      return session
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create direct access session'
      console.error('Error creating direct access session:', err)
      throw err
    }
  }

  async function updateSession(
    id: string,
    data: UpdateIFSDirectAccessPayload,
  ): Promise<IFSDirectAccessSession> {
    error.value = null
    try {
      const updated = await ifsDirectAccessDexieRepository.update(id, data)
      const index = sessions.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update direct access session'
      console.error('Error updating direct access session:', err)
      throw err
    }
  }

  async function deleteSession(id: string): Promise<void> {
    error.value = null
    try {
      await ifsDirectAccessDexieRepository.delete(id)
      sessions.value = sessions.value.filter((s) => s.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete direct access session'
      console.error('Error deleting direct access session:', err)
      throw err
    }
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
  }
})
