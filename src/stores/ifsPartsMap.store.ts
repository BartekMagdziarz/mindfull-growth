import { defineStore } from 'pinia'
import type {
  IFSPartsMap,
  CreateIFSPartsMapPayload,
  UpdateIFSPartsMapPayload,
} from '@/domain/exercises'
import { ifsPartsMapDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSPartsMapStore = defineStore('ifsPartsMap', () => {
  const maps = useExerciseCollection<
    IFSPartsMap,
    CreateIFSPartsMapPayload,
    UpdateIFSPartsMapPayload
  >({
    repository: ifsPartsMapDexieRepository,
    label: 'parts map',
    scope: 'iFSPartsMapStore',
    completionSlug: 'parts-mapping',
  })

  return {
    maps: maps.items,
    isLoading: maps.isLoading,
    error: maps.error,
    sortedMaps: maps.sorted,
    latestMap: maps.latest,
    getMapById: maps.getById,
    loadMaps: maps.loadAll,
    createMap: maps.create,
    updateMap: maps.update,
    deleteMap: maps.remove,
    reset: maps.reset,
  }
})
