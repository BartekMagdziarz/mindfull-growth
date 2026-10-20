import { defineStore } from 'pinia'
import type {
  IFSUnblendingSession,
  CreateIFSUnblendingPayload,
  UpdateIFSUnblendingPayload,
} from '@/domain/exercises'
import { ifsUnblendingDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSUnblendingStore = defineStore('ifsUnblending', () => {
  const sessions = useExerciseCollection<
    IFSUnblendingSession,
    CreateIFSUnblendingPayload,
    UpdateIFSUnblendingPayload
  >({
    repository: ifsUnblendingDexieRepository,
    label: 'unblending session',
    scope: 'iFSUnblendingStore',
    completionSlug: 'unblending',
  })

  return {
    sessions: sessions.items,
    isLoading: sessions.isLoading,
    error: sessions.error,
    sortedSessions: sessions.sorted,
    latestSession: sessions.latest,
    getSessionById: sessions.getById,
    loadSessions: sessions.loadAll,
    createSession: sessions.create,
    updateSession: sessions.update,
    deleteSession: sessions.remove,
    reset: sessions.reset,
  }
})
