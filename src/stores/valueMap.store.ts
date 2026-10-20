import { defineStore } from 'pinia'
import type { CreateValueMapPayload, UpdateValueMapPayload, ValueMap } from '@/domain/exercises'
import { valueMapDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useValueMapStore = defineStore('valueMap', () => {
  const maps = useExerciseCollection<ValueMap, CreateValueMapPayload, UpdateValueMapPayload>({
    repository: valueMapDexieRepository,
    label: 'value map',
    scope: 'valueMapStore',
    completionSlug: 'value-map',
    validateCreate: validateValueMapPayload,
    validateUpdate: (existing, data) => {
      if (existing) {
        validateValueMapPayload({ ...existing, ...data })
      }
    },
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

function validateValueMapPayload(data: CreateValueMapPayload): void {
  if (data.rankedValues.length < 5 || data.rankedValues.length > 10) {
    throw new Error('Value map must include between 5 and 10 ranked values')
  }

  const ranks = data.rankedValues.map(value => value.rank).sort((a, b) => a - b)
  const hasContinuousRanks = ranks.every((rank, index) => rank === index + 1)
  if (!hasContinuousRanks) {
    throw new Error('Value map ranks must be unique and continuous from 1')
  }

  if (data.globalConflicts.length > 5) {
    throw new Error('Value map can include at most 5 global conflicts')
  }

  for (const conflict of data.globalConflicts) {
    if (conflict.valueId === conflict.conflictingValueId) {
      throw new Error('A value cannot conflict with itself')
    }
  }

  for (const assignment of data.lifeAreaAssignments) {
    if (assignment.valueIds.length > 5) {
      throw new Error('Each life area can include at most 5 values')
    }
    if (
      assignment.tension &&
      assignment.tension.valueId === assignment.tension.conflictingValueId
    ) {
      throw new Error('A life-area value tension cannot compare the same value')
    }
  }
}
