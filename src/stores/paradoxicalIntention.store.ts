import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Paradoxical Intention Lab Store
 *
 * Manages Paradoxical Intention Lab exercises (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ParadoxicalIntentionLab,
  CreateParadoxicalIntentionPayload,
  UpdateParadoxicalIntentionPayload,
} from '@/domain/exercises'
import { paradoxicalIntentionDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useParadoxicalIntentionStore = defineStore('paradoxicalIntention', () => {
  const sessionScope = createStoreSessionScope()
  const labs = ref<ParadoxicalIntentionLab[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedLabs = computed(() => {
    return [...labs.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestLab = computed(() => {
    return sortedLabs.value[0] ?? null
  })

  const getLabById = computed(() => {
    return (id: string): ParadoxicalIntentionLab | undefined => {
      return labs.value.find(item => item.id === id)
    }
  })

  async function loadLabs(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        labs.value = await operation.wait(paradoxicalIntentionDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load labs'
        console.error('Error loading labs:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createLab(
    data: CreateParadoxicalIntentionPayload
  ): Promise<ParadoxicalIntentionLab> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const item = await operation.wait(paradoxicalIntentionDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('paradoxical-intention', item.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      labs.value.push(item)
      return item
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create lab'
      console.error('Error creating lab:', err)
      throw err
    }
  }

  async function updateLab(
    id: string,
    data: UpdateParadoxicalIntentionPayload
  ): Promise<ParadoxicalIntentionLab> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(paradoxicalIntentionDexieRepository.update(id, data))
      const index = labs.value.findIndex(item => item.id === id)
      if (index !== -1) {
        labs.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update lab'
      console.error('Error updating lab:', err)
      throw err
    }
  }

  async function deleteLab(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(paradoxicalIntentionDexieRepository.delete(id))
        labs.value = labs.value.filter(item => item.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete lab'
        console.error('Error deleting lab:', err)
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
    labs.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    labs,
    isLoading,
    error,
    sortedLabs,
    latestLab,
    getLabById,
    loadLabs,
    createLab,
    updateLab,
    deleteLab,
    reset,
  }
})
