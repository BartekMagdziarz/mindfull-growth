import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSProtectorAppreciation,
  CreateIFSProtectorAppreciationPayload,
  UpdateIFSProtectorAppreciationPayload,
} from '@/domain/exercises'
import { ifsProtectorAppreciationDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSProtectorAppreciationStore = defineStore('ifsProtectorAppreciation', () => {
  const appreciations = ref<IFSProtectorAppreciation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedAppreciations = computed(() => {
    return [...appreciations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestAppreciation = computed(() => {
    return sortedAppreciations.value[0] ?? null
  })

  const getAppreciationById = computed(() => {
    return (id: string): IFSProtectorAppreciation | undefined => {
      return appreciations.value.find((a) => a.id === id)
    }
  })

  async function loadAppreciations(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      appreciations.value = await ifsProtectorAppreciationDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load protector appreciations'
      console.error('Error loading protector appreciations:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createAppreciation(
    data: CreateIFSProtectorAppreciationPayload,
  ): Promise<IFSProtectorAppreciation> {
    error.value = null
    try {
      const appreciation = await ifsProtectorAppreciationDexieRepository.create(data)
      appreciations.value.push(appreciation)
      return appreciation
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create protector appreciation'
      console.error('Error creating protector appreciation:', err)
      throw err
    }
  }

  async function updateAppreciation(
    id: string,
    data: UpdateIFSProtectorAppreciationPayload,
  ): Promise<IFSProtectorAppreciation> {
    error.value = null
    try {
      const updated = await ifsProtectorAppreciationDexieRepository.update(id, data)
      const index = appreciations.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        appreciations.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update protector appreciation'
      console.error('Error updating protector appreciation:', err)
      throw err
    }
  }

  async function deleteAppreciation(id: string): Promise<void> {
    error.value = null
    try {
      await ifsProtectorAppreciationDexieRepository.delete(id)
      appreciations.value = appreciations.value.filter((a) => a.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete protector appreciation'
      console.error('Error deleting protector appreciation:', err)
      throw err
    }
  }

  return {
    appreciations,
    isLoading,
    error,
    sortedAppreciations,
    latestAppreciation,
    getAppreciationById,
    loadAppreciations,
    createAppreciation,
    updateAppreciation,
    deleteAppreciation,
  }
})
