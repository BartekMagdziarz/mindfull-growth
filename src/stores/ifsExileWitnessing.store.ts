import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSExileWitnessing,
  CreateIFSExileWitnessingPayload,
  UpdateIFSExileWitnessingPayload,
} from '@/domain/exercises'
import { ifsExileWitnessingDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSExileWitnessingStore = defineStore('ifsExileWitnessing', () => {
  const sessionScope = createStoreSessionScope()
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
      return witnessings.value.find(w => w.id === id)
    }
  })

  async function loadWitnessings(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        witnessings.value = await operation.wait(ifsExileWitnessingDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load exile witnessings'
        console.error('Error loading exile witnessings:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createWitnessing(
    data: CreateIFSExileWitnessingPayload
  ): Promise<IFSExileWitnessing> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const witnessing = await operation.wait(ifsExileWitnessingDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('exile-witnessing', witnessing.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      witnessings.value.push(witnessing)
      return witnessing
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create exile witnessing'
      console.error('Error creating exile witnessing:', err)
      throw err
    }
  }

  async function updateWitnessing(
    id: string,
    data: UpdateIFSExileWitnessingPayload
  ): Promise<IFSExileWitnessing> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsExileWitnessingDexieRepository.update(id, data))
      const index = witnessings.value.findIndex(w => w.id === id)
      if (index !== -1) {
        witnessings.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update exile witnessing'
      console.error('Error updating exile witnessing:', err)
      throw err
    }
  }

  async function deleteWitnessing(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsExileWitnessingDexieRepository.delete(id))
        witnessings.value = witnessings.value.filter(w => w.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete exile witnessing'
        console.error('Error deleting exile witnessing:', err)
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
    witnessings.value = []
    isLoading.value = false
    error.value = null
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
    reset,
  }
})
