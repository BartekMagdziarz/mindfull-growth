/**
 * Behavioral Activation Store
 *
 * Manages BehavioralActivation weekly plans — scheduling and tracking
 * mood-boosting activities across categories (Martell, Dimidjian & Herman-Dunn, 2010).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BehavioralActivation,
  CreateBehavioralActivationPayload,
  UpdateBehavioralActivationPayload,
} from '@/domain/exercises'
import { behavioralActivationDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useBehavioralActivationStore = defineStore('behavioralActivation', () => {
  const activations = ref<BehavioralActivation[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedActivations = computed(() => {
    return [...activations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestActivation = computed(() => {
    return sortedActivations.value[0] ?? null
  })

  const getActivationById = computed(() => {
    return (id: string): BehavioralActivation | undefined => {
      return activations.value.find((a) => a.id === id)
    }
  })

  async function loadActivations(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      activations.value = await behavioralActivationDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load behavioral activations'
      console.error('Error loading behavioral activations:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createActivation(data: CreateBehavioralActivationPayload): Promise<BehavioralActivation> {
    error.value = null
    try {
      const activation = await behavioralActivationDexieRepository.create(data)
      activations.value.push(activation)
      return activation
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create behavioral activation'
      console.error('Error creating behavioral activation:', err)
      throw err
    }
  }

  async function updateActivation(
    id: string,
    data: UpdateBehavioralActivationPayload,
  ): Promise<BehavioralActivation> {
    error.value = null
    try {
      const updated = await behavioralActivationDexieRepository.update(id, data)
      const index = activations.value.findIndex((a) => a.id === id)
      if (index !== -1) {
        activations.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update behavioral activation'
      console.error('Error updating behavioral activation:', err)
      throw err
    }
  }

  async function deleteActivation(id: string): Promise<void> {
    error.value = null
    try {
      await behavioralActivationDexieRepository.delete(id)
      activations.value = activations.value.filter((a) => a.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete behavioral activation'
      console.error('Error deleting behavioral activation:', err)
      throw err
    }
  }

  return {
    activations,
    isLoading,
    error,
    sortedActivations,
    latestActivation,
    getActivationById,
    loadActivations,
    createActivation,
    updateActivation,
    deleteActivation,
  }
})
