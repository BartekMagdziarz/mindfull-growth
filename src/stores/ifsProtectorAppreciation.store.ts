import { defineStore } from 'pinia'
import type {
  IFSProtectorAppreciation,
  CreateIFSProtectorAppreciationPayload,
  UpdateIFSProtectorAppreciationPayload,
} from '@/domain/exercises'
import { ifsProtectorAppreciationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSProtectorAppreciationStore = defineStore('ifsProtectorAppreciation', () => {
  const appreciations = useExerciseCollection<
    IFSProtectorAppreciation,
    CreateIFSProtectorAppreciationPayload,
    UpdateIFSProtectorAppreciationPayload
  >({
    repository: ifsProtectorAppreciationDexieRepository,
    label: 'protector appreciation',
    scope: 'iFSProtectorAppreciationStore',
    completionSlug: 'protector-appreciation',
  })

  return {
    appreciations: appreciations.items,
    isLoading: appreciations.isLoading,
    error: appreciations.error,
    sortedAppreciations: appreciations.sorted,
    latestAppreciation: appreciations.latest,
    getAppreciationById: appreciations.getById,
    loadAppreciations: appreciations.loadAll,
    createAppreciation: appreciations.create,
    updateAppreciation: appreciations.update,
    deleteAppreciation: appreciations.remove,
    reset: appreciations.reset,
  }
})
