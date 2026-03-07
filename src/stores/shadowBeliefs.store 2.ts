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

export const useShadowBeliefsStore = defineStore('shadowBeliefs', () => {
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
      return beliefsList.value.find((b) => b.id === id)
    }
  })

  async function loadBeliefs(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      beliefsList.value = await shadowBeliefsDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load shadow beliefs'
      console.error('Error loading shadow beliefs:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createBeliefs(data: CreateShadowBeliefsPayload): Promise<ShadowBeliefs> {
    error.value = null
    try {
      const beliefs = await shadowBeliefsDexieRepository.create(data)
      beliefsList.value.push(beliefs)
      return beliefs
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create shadow beliefs'
      console.error('Error creating shadow beliefs:', err)
      throw err
    }
  }

  async function updateBeliefs(
    id: string,
    data: UpdateShadowBeliefsPayload,
  ): Promise<ShadowBeliefs> {
    error.value = null
    try {
      const updated = await shadowBeliefsDexieRepository.update(id, data)
      const index = beliefsList.value.findIndex((b) => b.id === id)
      if (index !== -1) {
        beliefsList.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update shadow beliefs'
      console.error('Error updating shadow beliefs:', err)
      throw err
    }
  }

  async function deleteBeliefs(id: string): Promise<void> {
    error.value = null
    try {
      await shadowBeliefsDexieRepository.delete(id)
      beliefsList.value = beliefsList.value.filter((b) => b.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete shadow beliefs'
      console.error('Error deleting shadow beliefs:', err)
      throw err
    }
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
  }
})
