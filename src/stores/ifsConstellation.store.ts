import { defineStore } from 'pinia'
import type {
  IFSConstellation,
  CreateIFSConstellationPayload,
  UpdateIFSConstellationPayload,
} from '@/domain/exercises'
import { ifsConstellationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSConstellationStore = defineStore('ifsConstellation', () => {
  const constellations = useExerciseCollection<
    IFSConstellation,
    CreateIFSConstellationPayload,
    UpdateIFSConstellationPayload
  >({
    repository: ifsConstellationDexieRepository,
    label: 'constellation',
    scope: 'iFSConstellationStore',
    completionSlug: 'constellation',
  })

  return {
    constellations: constellations.items,
    isLoading: constellations.isLoading,
    error: constellations.error,
    sortedConstellations: constellations.sorted,
    latestConstellation: constellations.latest,
    getConstellationById: constellations.getById,
    loadConstellations: constellations.loadAll,
    createConstellation: constellations.create,
    updateConstellation: constellations.update,
    deleteConstellation: constellations.remove,
    reset: constellations.reset,
  }
})
