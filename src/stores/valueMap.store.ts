import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CreateValueMapPayload,
  UpdateValueMapPayload,
  ValueMap,
} from '@/domain/exercises'
import { valueMapDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useValueMapStore = defineStore('valueMap', () => {
  const maps = ref<ValueMap[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedMaps = computed(() => {
    return [...maps.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestMap = computed(() => sortedMaps.value[0] ?? null)

  const getMapById = computed(() => {
    return (id: string): ValueMap | undefined => maps.value.find((map) => map.id === id)
  })

  async function loadMaps(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      maps.value = await valueMapDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load value maps'
      console.error('Error loading value maps:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createMap(data: CreateValueMapPayload): Promise<ValueMap> {
    error.value = null
    try {
      validateValueMapPayload(data)
      const map = await valueMapDexieRepository.create(data)
      maps.value.push(map)
      return map
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create value map'
      console.error('Error creating value map:', err)
      throw err
    }
  }

  async function updateMap(id: string, data: UpdateValueMapPayload): Promise<ValueMap> {
    error.value = null
    try {
      const existing = maps.value.find((map) => map.id === id)
      if (existing) {
        validateValueMapPayload({ ...existing, ...data })
      }
      const updated = await valueMapDexieRepository.update(id, data)
      const index = maps.value.findIndex((map) => map.id === id)
      if (index !== -1) {
        maps.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update value map'
      console.error('Error updating value map:', err)
      throw err
    }
  }

  async function deleteMap(id: string): Promise<void> {
    error.value = null
    try {
      await valueMapDexieRepository.delete(id)
      maps.value = maps.value.filter((map) => map.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete value map'
      console.error('Error deleting value map:', err)
      throw err
    }
  }

  function reset(): void {
    maps.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    maps,
    isLoading,
    error,
    sortedMaps,
    latestMap,
    getMapById,
    loadMaps,
    createMap,
    updateMap,
    deleteMap,
    reset,
  }
})

function validateValueMapPayload(data: CreateValueMapPayload): void {
  if (data.rankedValues.length < 5 || data.rankedValues.length > 10) {
    throw new Error('Value map must include between 5 and 10 ranked values')
  }

  const ranks = data.rankedValues.map((value) => value.rank).sort((a, b) => a - b)
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
