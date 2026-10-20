import { defineStore } from 'pinia'
import type {
  IFSDirectAccessSession,
  CreateIFSDirectAccessPayload,
  UpdateIFSDirectAccessPayload,
} from '@/domain/exercises'
import { ifsDirectAccessDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSDirectAccessStore = defineStore('ifsDirectAccess', () => {
  const sessions = useExerciseCollection<
    IFSDirectAccessSession,
    CreateIFSDirectAccessPayload,
    UpdateIFSDirectAccessPayload
  >({
    repository: ifsDirectAccessDexieRepository,
    label: 'direct access session',
    scope: 'iFSDirectAccessStore',
    completionSlug: 'direct-access',
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
