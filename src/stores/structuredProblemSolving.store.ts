import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Structured Problem Solving Store
 *
 * Manages StructuredProblemSolving sessions — systematic approach to
 * overwhelming problems using evidence-based problem-solving therapy
 * (D'Zurilla & Nezu, 2007).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  StructuredProblemSolving,
  CreateStructuredProblemSolvingPayload,
  UpdateStructuredProblemSolvingPayload,
} from '@/domain/exercises'
import { structuredProblemSolvingDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useStructuredProblemSolvingStore = defineStore('structuredProblemSolving', () => {
  const sessionScope = createStoreSessionScope()
  const sessions = ref<StructuredProblemSolving[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestSession = computed(() => {
    return sortedSessions.value[0] ?? null
  })

  const inProgressSessions = computed(() => {
    return sortedSessions.value.filter(s => s.status === 'in-progress')
  })

  const completedSessions = computed(() => {
    return sortedSessions.value.filter(s => s.status === 'completed')
  })

  const getSessionById = computed(() => {
    return (id: string): StructuredProblemSolving | undefined => {
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
        sessions.value = await operation.wait(structuredProblemSolvingDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load problem solving sessions'
        console.error('Error loading problem solving sessions:', err)
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
    data: CreateStructuredProblemSolvingPayload
  ): Promise<StructuredProblemSolving> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const session = await operation.wait(structuredProblemSolvingDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('structured-problem-solving', session.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      sessions.value.push(session)
      return session
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create problem solving session'
      console.error('Error creating problem solving session:', err)
      throw err
    }
  }

  async function updateSession(
    id: string,
    data: UpdateStructuredProblemSolvingPayload
  ): Promise<StructuredProblemSolving> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(structuredProblemSolvingDexieRepository.update(id, data))
      const index = sessions.value.findIndex(s => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update problem solving session'
      console.error('Error updating problem solving session:', err)
      throw err
    }
  }

  async function deleteSession(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(structuredProblemSolvingDexieRepository.delete(id))
        sessions.value = sessions.value.filter(s => s.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value =
          err instanceof Error ? err.message : 'Failed to delete problem solving session'
        console.error('Error deleting problem solving session:', err)
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
    inProgressSessions,
    completedSessions,
    getSessionById,
    loadSessions,
    createSession,
    updateSession,
    deleteSession,
    reset,
  }
})
