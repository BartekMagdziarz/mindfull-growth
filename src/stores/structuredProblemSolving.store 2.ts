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

export const useStructuredProblemSolvingStore = defineStore('structuredProblemSolving', () => {
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
    return sortedSessions.value.filter((s) => s.status === 'in-progress')
  })

  const completedSessions = computed(() => {
    return sortedSessions.value.filter((s) => s.status === 'completed')
  })

  const getSessionById = computed(() => {
    return (id: string): StructuredProblemSolving | undefined => {
      return sessions.value.find((s) => s.id === id)
    }
  })

  async function loadSessions(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      sessions.value = await structuredProblemSolvingDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load problem solving sessions'
      console.error('Error loading problem solving sessions:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createSession(data: CreateStructuredProblemSolvingPayload): Promise<StructuredProblemSolving> {
    error.value = null
    try {
      const session = await structuredProblemSolvingDexieRepository.create(data)
      sessions.value.push(session)
      return session
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create problem solving session'
      console.error('Error creating problem solving session:', err)
      throw err
    }
  }

  async function updateSession(
    id: string,
    data: UpdateStructuredProblemSolvingPayload,
  ): Promise<StructuredProblemSolving> {
    error.value = null
    try {
      const updated = await structuredProblemSolvingDexieRepository.update(id, data)
      const index = sessions.value.findIndex((s) => s.id === id)
      if (index !== -1) {
        sessions.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update problem solving session'
      console.error('Error updating problem solving session:', err)
      throw err
    }
  }

  async function deleteSession(id: string): Promise<void> {
    error.value = null
    try {
      await structuredProblemSolvingDexieRepository.delete(id)
      sessions.value = sessions.value.filter((s) => s.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete problem solving session'
      console.error('Error deleting problem solving session:', err)
      throw err
    }
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
  }
})
