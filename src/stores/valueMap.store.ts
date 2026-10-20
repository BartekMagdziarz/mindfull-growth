import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CreateValueMapPayload, UpdateValueMapPayload, ValueMap } from '@/domain/exercises'
import { valueMapDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { reportError } from '@/utils/reportError'

export const useValueMapStore = defineStore('valueMap', () => {
  const sessionScope = createStoreSessionScope()
  const maps = ref<ValueMap[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedMaps = computed(() => {
    return [...maps.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestMap = computed(() => sortedMaps.value[0] ?? null)

  const getMapById = computed(() => {
    return (id: string): ValueMap | undefined => maps.value.find(map => map.id === id)
  })

  async function loadMaps(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        maps.value = await operation.wait(valueMapDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load value maps'
        reportError('valueMapStore.loadMaps', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createMap(data: CreateValueMapPayload): Promise<ValueMap> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      validateValueMapPayload(data)
      const map = await operation.wait(valueMapDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('value-map', map.id)
        .catch(err => reportError('valueMapStore.recordCompletion', err))
      maps.value.push(map)
      return map
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create value map'
      reportError('valueMapStore.createMap', err)
      throw err
    }
  }

  async function updateMap(id: string, data: UpdateValueMapPayload): Promise<ValueMap> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const existing = maps.value.find(map => map.id === id)
      if (existing) {
        validateValueMapPayload({ ...existing, ...data })
      }
      const updated = await operation.wait(valueMapDexieRepository.update(id, data))
      const index = maps.value.findIndex(map => map.id === id)
      if (index !== -1) {
        maps.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update value map'
      reportError('valueMapStore.updateMap', err)
      throw err
    }
  }

  async function deleteMap(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(valueMapDexieRepository.delete(id))
        maps.value = maps.value.filter(map => map.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete value map'
        reportError('valueMapStore.deleteMap', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  function reset(): void {
    sessionScope.reset()
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
