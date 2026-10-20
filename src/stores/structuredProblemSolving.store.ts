/**
 * Structured Problem Solving Store
 *
 * Manages StructuredProblemSolving sessions — systematic approach to
 * overwhelming problems using evidence-based problem-solving therapy
 * (D'Zurilla & Nezu, 2007).
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  StructuredProblemSolving,
  CreateStructuredProblemSolvingPayload,
  UpdateStructuredProblemSolvingPayload,
} from '@/domain/exercises'
import { structuredProblemSolvingDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useStructuredProblemSolvingStore = defineStore('structuredProblemSolving', () => {
  const sessions = useExerciseCollection<
    StructuredProblemSolving,
    CreateStructuredProblemSolvingPayload,
    UpdateStructuredProblemSolvingPayload
  >({
    repository: structuredProblemSolvingDexieRepository,
    label: 'problem solving session',
    scope: 'structuredProblemSolvingStore',
    completionSlug: 'structured-problem-solving',
  })

  const inProgressSessions = computed(() =>
    sessions.sorted.value.filter(s => s.status === 'in-progress')
  )
  const completedSessions = computed(() =>
    sessions.sorted.value.filter(s => s.status === 'completed')
  )

  return {
    sessions: sessions.items,
    isLoading: sessions.isLoading,
    error: sessions.error,
    sortedSessions: sessions.sorted,
    latestSession: sessions.latest,
    inProgressSessions,
    completedSessions,
    getSessionById: sessions.getById,
    loadSessions: sessions.loadAll,
    createSession: sessions.create,
    updateSession: sessions.update,
    deleteSession: sessions.remove,
    reset: sessions.reset,
  }
})
