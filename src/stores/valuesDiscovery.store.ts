/**
 * Values Discovery Store
 *
 * Manages ValuesDiscovery exercises — identifying core values through admiration analysis.
 */

import { defineStore } from 'pinia'
import type {
  ValuesDiscovery,
  CreateValuesDiscoveryPayload,
  UpdateValuesDiscoveryPayload,
} from '@/domain/exercises'
import { valuesDiscoveryDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useValuesDiscoveryStore = defineStore('valuesDiscovery', () => {
  const discoveries = useExerciseCollection<
    ValuesDiscovery,
    CreateValuesDiscoveryPayload,
    UpdateValuesDiscoveryPayload
  >({
    repository: valuesDiscoveryDexieRepository,
    label: 'values discovery',
    labelPlural: 'values discoveries',
    scope: 'valuesDiscoveryStore',
    completionSlug: 'values',
  })

  return {
    discoveries: discoveries.items,
    isLoading: discoveries.isLoading,
    error: discoveries.error,
    sortedDiscoveries: discoveries.sorted,
    latestDiscovery: discoveries.latest,
    getDiscoveryById: discoveries.getById,
    loadDiscoveries: discoveries.loadAll,
    createDiscovery: discoveries.create,
    updateDiscovery: discoveries.update,
    deleteDiscovery: discoveries.remove,
    reset: discoveries.reset,
  }
})
