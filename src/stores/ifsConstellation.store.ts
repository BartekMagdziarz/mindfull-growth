import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSConstellation,
  CreateIFSConstellationPayload,
  UpdateIFSConstellationPayload,
} from '@/domain/exercises'
import { ifsConstellationDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSConstellationStore = defineStore('ifsConstellation', () => {
  const sessionScope = createStoreSessionScope()
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
      return constellations.value.find(c => c.id === id)
    }
  })

  async function loadConstellations(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        constellations.value = await operation.wait(ifsConstellationDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load constellations'
        console.error('Error loading constellations:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createConstellation(
    data: CreateIFSConstellationPayload
  ): Promise<IFSConstellation> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const constellation = await operation.wait(ifsConstellationDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('constellation', constellation.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      constellations.value.push(constellation)
      return constellation
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create constellation'
      console.error('Error creating constellation:', err)
      throw err
    }
  }

  async function updateConstellation(
    id: string,
    data: UpdateIFSConstellationPayload
  ): Promise<IFSConstellation> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsConstellationDexieRepository.update(id, data))
      const index = constellations.value.findIndex(c => c.id === id)
      if (index !== -1) {
        constellations.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update constellation'
      console.error('Error updating constellation:', err)
      throw err
    }
  }

  async function deleteConstellation(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsConstellationDexieRepository.delete(id))
        constellations.value = constellations.value.filter(c => c.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete constellation'
        console.error('Error deleting constellation:', err)
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
    constellations.value = []
    isLoading.value = false
    error.value = null
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
    reset,
  }
})
