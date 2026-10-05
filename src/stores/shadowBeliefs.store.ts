import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Shadow Beliefs Store
 *
 * Manages ShadowBeliefs exercises — surfacing self-sabotaging beliefs.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ShadowBeliefs,
  CreateShadowBeliefsPayload,
  UpdateShadowBeliefsPayload,
} from '@/domain/exercises'
import { shadowBeliefsDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useShadowBeliefsStore = defineStore('shadowBeliefs', () => {
  const sessionScope = createStoreSessionScope()
  const beliefsList = ref<ShadowBeliefs[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedBeliefs = computed(() => {
    return [...beliefsList.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestBeliefs = computed(() => {
    return sortedBeliefs.value[0] ?? null
  })

  const getBeliefsById = computed(() => {
    return (id: string): ShadowBeliefs | undefined => {
      return beliefsList.value.find(b => b.id === id)
    }
  })

  async function loadBeliefs(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        beliefsList.value = await operation.wait(shadowBeliefsDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load shadow beliefs'
        console.error('Error loading shadow beliefs:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createBeliefs(data: CreateShadowBeliefsPayload): Promise<ShadowBeliefs> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const beliefs = await operation.wait(shadowBeliefsDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('shadow-beliefs', beliefs.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      beliefsList.value.push(beliefs)
      return beliefs
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create shadow beliefs'
      console.error('Error creating shadow beliefs:', err)
      throw err
    }
  }

  async function updateBeliefs(
    id: string,
    data: UpdateShadowBeliefsPayload
  ): Promise<ShadowBeliefs> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(shadowBeliefsDexieRepository.update(id, data))
      const index = beliefsList.value.findIndex(b => b.id === id)
      if (index !== -1) {
        beliefsList.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update shadow beliefs'
      console.error('Error updating shadow beliefs:', err)
      throw err
    }
  }

  async function deleteBeliefs(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(shadowBeliefsDexieRepository.delete(id))
        beliefsList.value = beliefsList.value.filter(b => b.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete shadow beliefs'
        console.error('Error deleting shadow beliefs:', err)
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
    beliefsList.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    beliefsList,
    isLoading,
    error,
    sortedBeliefs,
    latestBeliefs,
    getBeliefsById,
    loadBeliefs,
    createBeliefs,
    updateBeliefs,
    deleteBeliefs,
    reset,
  }
})
