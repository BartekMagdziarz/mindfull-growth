/**
 * Transformative Purpose Store
 *
 * Manages TransformativePurpose exercises — defining a provisional purpose statement.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  TransformativePurpose,
  CreateTransformativePurposePayload,
  UpdateTransformativePurposePayload,
} from '@/domain/exercises'
import { transformativePurposeDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useTransformativePurposeStore = defineStore('transformativePurpose', () => {
  const purposes = ref<TransformativePurpose[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedPurposes = computed(() => {
    return [...purposes.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestPurpose = computed(() => {
    return sortedPurposes.value[0] ?? null
  })

  const getPurposeById = computed(() => {
    return (id: string): TransformativePurpose | undefined => {
      return purposes.value.find((p) => p.id === id)
    }
  })

  async function loadPurposes(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      purposes.value = await transformativePurposeDexieRepository.getAll()
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to load transformative purposes'
      console.error('Error loading transformative purposes:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createPurpose(
    data: CreateTransformativePurposePayload,
  ): Promise<TransformativePurpose> {
    error.value = null
    try {
      const purpose = await transformativePurposeDexieRepository.create(data)
      purposes.value.push(purpose)
      return purpose
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to create transformative purpose'
      console.error('Error creating transformative purpose:', err)
      throw err
    }
  }

  async function updatePurpose(
    id: string,
    data: UpdateTransformativePurposePayload,
  ): Promise<TransformativePurpose> {
    error.value = null
    try {
      const updated = await transformativePurposeDexieRepository.update(id, data)
      const index = purposes.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        purposes.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to update transformative purpose'
      console.error('Error updating transformative purpose:', err)
      throw err
    }
  }

  async function deletePurpose(id: string): Promise<void> {
    error.value = null
    try {
      await transformativePurposeDexieRepository.delete(id)
      purposes.value = purposes.value.filter((p) => p.id !== id)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to delete transformative purpose'
      console.error('Error deleting transformative purpose:', err)
      throw err
    }
  }

  return {
    purposes,
    isLoading,
    error,
    sortedPurposes,
    latestPurpose,
    getPurposeById,
    loadPurposes,
    createPurpose,
    updatePurpose,
    deletePurpose,
  }
})
