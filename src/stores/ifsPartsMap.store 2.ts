import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IFSPartsMap, CreateIFSPartsMapPayload, UpdateIFSPartsMapPayload } from '@/domain/exercises'
import { ifsPartsMapDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSPartsMapStore = defineStore('ifsPartsMap', () => {
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
      return maps.value.find((m) => m.id === id)
    }
  })

  async function loadMaps(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      maps.value = await ifsPartsMapDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load parts maps'
      console.error('Error loading parts maps:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createMap(data: CreateIFSPartsMapPayload): Promise<IFSPartsMap> {
    error.value = null
    try {
      const map = await ifsPartsMapDexieRepository.create(data)
      maps.value.push(map)
      return map
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create parts map'
      console.error('Error creating parts map:', err)
      throw err
    }
  }

  async function updateMap(id: string, data: UpdateIFSPartsMapPayload): Promise<IFSPartsMap> {
    error.value = null
    try {
      const updated = await ifsPartsMapDexieRepository.update(id, data)
      const index = maps.value.findIndex((m) => m.id === id)
      if (index !== -1) {
        maps.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update parts map'
      console.error('Error updating parts map:', err)
      throw err
    }
  }

  async function deleteMap(id: string): Promise<void> {
    error.value = null
    try {
      await ifsPartsMapDexieRepository.delete(id)
      maps.value = maps.value.filter((m) => m.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete parts map'
      console.error('Error deleting parts map:', err)
      throw err
    }
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
  }
})
