import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSExileWitnessing,
  CreateIFSExileWitnessingPayload,
  UpdateIFSExileWitnessingPayload,
} from '@/domain/exercises'
import { ifsExileWitnessingDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSExileWitnessingStore = defineStore('ifsExileWitnessing', () => {
  const witnessings = ref<IFSExileWitnessing[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedWitnessings = computed(() => {
    return [...witnessings.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestWitnessing = computed(() => {
    return sortedWitnessings.value[0] ?? null
  })

  const getWitnessingById = computed(() => {
    return (id: string): IFSExileWitnessing | undefined => {
      return witnessings.value.find((w) => w.id === id)
    }
  })

  async function loadWitnessings(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      witnessings.value = await ifsExileWitnessingDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load exile witnessings'
      console.error('Error loading exile witnessings:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createWitnessing(data: CreateIFSExileWitnessingPayload): Promise<IFSExileWitnessing> {
    error.value = null
    try {
      const witnessing = await ifsExileWitnessingDexieRepository.create(data)
      witnessings.value.push(witnessing)
      return witnessing
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create exile witnessing'
      console.error('Error creating exile witnessing:', err)
      throw err
    }
  }

  async function updateWitnessing(
    id: string,
    data: UpdateIFSExileWitnessingPayload,
  ): Promise<IFSExileWitnessing> {
    error.value = null
    try {
      const updated = await ifsExileWitnessingDexieRepository.update(id, data)
      const index = witnessings.value.findIndex((w) => w.id === id)
      if (index !== -1) {
        witnessings.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update exile witnessing'
      console.error('Error updating exile witnessing:', err)
      throw err
    }
  }

  async function deleteWitnessing(id: string): Promise<void> {
    error.value = null
    try {
      await ifsExileWitnessingDexieRepository.delete(id)
      witnessings.value = witnessings.value.filter((w) => w.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete exile witnessing'
      console.error('Error deleting exile witnessing:', err)
      throw err
    }
  }

  return {
    witnessings,
    isLoading,
    error,
    sortedWitnessings,
    latestWitnessing,
    getWitnessingById,
    loadWitnessings,
    createWitnessing,
    updateWitnessing,
    deleteWitnessing,
  }
})
