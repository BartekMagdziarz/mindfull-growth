import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSProtectorAppreciation,
  CreateIFSProtectorAppreciationPayload,
  UpdateIFSProtectorAppreciationPayload,
} from '@/domain/exercises'
import { ifsProtectorAppreciationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSProtectorAppreciationStore = defineStore('ifsProtectorAppreciation', () => {
  const sessionScope = createStoreSessionScope()
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
      return appreciations.value.find(a => a.id === id)
    }
  })

  async function loadAppreciations(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        appreciations.value = await operation.wait(ifsProtectorAppreciationDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load protector appreciations'
        console.error('Error loading protector appreciations:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createAppreciation(
    data: CreateIFSProtectorAppreciationPayload
  ): Promise<IFSProtectorAppreciation> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const appreciation = await operation.wait(
        ifsProtectorAppreciationDexieRepository.create(data)
      )
      void useExerciseCompletionsStore()
        .record('protector-appreciation', appreciation.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      appreciations.value.push(appreciation)
      return appreciation
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create protector appreciation'
      console.error('Error creating protector appreciation:', err)
      throw err
    }
  }

  async function updateAppreciation(
    id: string,
    data: UpdateIFSProtectorAppreciationPayload
  ): Promise<IFSProtectorAppreciation> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsProtectorAppreciationDexieRepository.update(id, data))
      const index = appreciations.value.findIndex(a => a.id === id)
      if (index !== -1) {
        appreciations.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update protector appreciation'
      console.error('Error updating protector appreciation:', err)
      throw err
    }
  }

  async function deleteAppreciation(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsProtectorAppreciationDexieRepository.delete(id))
        appreciations.value = appreciations.value.filter(a => a.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete protector appreciation'
        console.error('Error deleting protector appreciation:', err)
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
    appreciations.value = []
    isLoading.value = false
    error.value = null
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
    reset,
  }
})
