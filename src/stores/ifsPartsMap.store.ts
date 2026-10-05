import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSPartsMap,
  CreateIFSPartsMapPayload,
  UpdateIFSPartsMapPayload,
} from '@/domain/exercises'
import { ifsPartsMapDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSPartsMapStore = defineStore('ifsPartsMap', () => {
  const sessionScope = createStoreSessionScope()
  const maps = ref<IFSPartsMap[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedMaps = computed(() => {
    return [...maps.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestMap = computed(() => {
    return sortedMaps.value[0] ?? null
  })

  const getMapById = computed(() => {
    return (id: string): IFSPartsMap | undefined => {
      return maps.value.find(m => m.id === id)
    }
  })

  async function loadMaps(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        maps.value = await operation.wait(ifsPartsMapDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load parts maps'
        console.error('Error loading parts maps:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createMap(data: CreateIFSPartsMapPayload): Promise<IFSPartsMap> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const map = await operation.wait(ifsPartsMapDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('parts-mapping', map.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      maps.value.push(map)
      return map
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create parts map'
      console.error('Error creating parts map:', err)
      throw err
    }
  }

  async function updateMap(id: string, data: UpdateIFSPartsMapPayload): Promise<IFSPartsMap> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsPartsMapDexieRepository.update(id, data))
      const index = maps.value.findIndex(m => m.id === id)
      if (index !== -1) {
        maps.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update parts map'
      console.error('Error updating parts map:', err)
      throw err
    }
  }

  async function deleteMap(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsPartsMapDexieRepository.delete(id))
        maps.value = maps.value.filter(m => m.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete parts map'
        console.error('Error deleting parts map:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
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
