import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSUnblendingSession,
  CreateIFSUnblendingPayload,
  UpdateIFSUnblendingPayload,
} from '@/domain/exercises'
import { ifsUnblendingDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSUnblendingStore = defineStore('ifsUnblending', () => {
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
      return sessions.value.find((s) => s.id === id)
    }
  })

  async function loadSessions(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      sessions.value = await ifsUnblendingDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load unblending sessions'
      console.error('Error loading unblending sessions:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createSession(data: CreateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    error.value = null
    try {
      const session = await ifsUnblendingDexieRepository.create(data)
      sessions.value.push(session)
      return session
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create unblending session'
      console.error('Error creating unblending session:', err)
      throw err
    }
  }

  async function updateSession(id: string, data: UpdateIFSUnblendingPayload): Promise<IFSUnblendingSession> {
    error.value = null
    try {
      const updated = await ifsUnblendingDexieRepository.update(id, data)
      const index = sessions.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update unblending session'
      console.error('Error updating unblending session:', err)
      throw err
    }
  }

  async function deleteSession(id: string): Promise<void> {
    error.value = null
    try {
      await ifsUnblendingDexieRepository.delete(id)
      sessions.value = sessions.value.filter((s) => s.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete unblending session'
      console.error('Error deleting unblending session:', err)
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
