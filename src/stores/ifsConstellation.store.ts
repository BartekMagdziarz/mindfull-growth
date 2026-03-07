import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSConstellation,
  CreateIFSConstellationPayload,
  UpdateIFSConstellationPayload,
} from '@/domain/exercises'
import { ifsConstellationDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSConstellationStore = defineStore('ifsConstellation', () => {
  const constellations = ref<IFSConstellation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedConstellations = computed(() => {
    return [...constellations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestConstellation = computed(() => {
    return sortedConstellations.value[0] ?? null
  })

  const getConstellationById = computed(() => {
    return (id: string): IFSConstellation | undefined => {
      return constellations.value.find((c) => c.id === id)
    }
  })

  async function loadConstellations(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      constellations.value = await ifsConstellationDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load constellations'
      console.error('Error loading constellations:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createConstellation(data: CreateIFSConstellationPayload): Promise<IFSConstellation> {
    error.value = null
    try {
      const constellation = await ifsConstellationDexieRepository.create(data)
      constellations.value.push(constellation)
      return constellation
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create constellation'
      console.error('Error creating constellation:', err)
      throw err
    }
  }

  async function updateConstellation(
    id: string,
    data: UpdateIFSConstellationPayload,
  ): Promise<IFSConstellation> {
    error.value = null
    try {
      const updated = await ifsConstellationDexieRepository.update(id, data)
      const index = constellations.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        constellations.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update constellation'
      console.error('Error updating constellation:', err)
      throw err
    }
  }

  async function deleteConstellation(id: string): Promise<void> {
    error.value = null
    try {
      await ifsConstellationDexieRepository.delete(id)
      constellations.value = constellations.value.filter((c) => c.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete constellation'
      console.error('Error deleting constellation:', err)
      throw err
    }
  }

  return {
    constellations,
    isLoading,
    error,
    sortedConstellations,
    latestConstellation,
    getConstellationById,
    loadConstellations,
    createConstellation,
    updateConstellation,
    deleteConstellation,
  }
})
