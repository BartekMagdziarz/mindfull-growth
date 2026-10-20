import { defineStore } from 'pinia'
import type {
  IFSExileWitnessing,
  CreateIFSExileWitnessingPayload,
  UpdateIFSExileWitnessingPayload,
} from '@/domain/exercises'
import { ifsExileWitnessingDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSExileWitnessingStore = defineStore('ifsExileWitnessing', () => {
  const witnessings = useExerciseCollection<
    IFSExileWitnessing,
    CreateIFSExileWitnessingPayload,
    UpdateIFSExileWitnessingPayload
  >({
    repository: ifsExileWitnessingDexieRepository,
    label: 'exile witnessing',
    scope: 'iFSExileWitnessingStore',
    completionSlug: 'exile-witnessing',
  })

  return {
    witnessings: witnessings.items,
    isLoading: witnessings.isLoading,
    error: witnessings.error,
    sortedWitnessings: witnessings.sorted,
    latestWitnessing: witnessings.latest,
    getWitnessingById: witnessings.getById,
    loadWitnessings: witnessings.loadAll,
    createWitnessing: witnessings.create,
    updateWitnessing: witnessings.update,
    deleteWitnessing: witnessings.remove,
    reset: witnessings.reset,
  }
})
