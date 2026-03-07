/**
 * Three Pathways to Meaning Store
 *
 * Manages Three Pathways to Meaning explorations (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ThreePathwaysToMeaning,
  CreateThreePathwaysPayload,
  UpdateThreePathwaysPayload,
} from '@/domain/exercises'
import { threePathwaysDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useThreePathwaysStore = defineStore('threePathways', () => {
  const explorations = ref<ThreePathwaysToMeaning[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedExplorations = computed(() => {
    return [...explorations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestExploration = computed(() => {
    return sortedExplorations.value[0] ?? null
  })

  const getExplorationById = computed(() => {
    return (id: string): ThreePathwaysToMeaning | undefined => {
      return explorations.value.find((item) => item.id === id)
    }
  })

  async function loadExplorations(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      explorations.value = await threePathwaysDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load explorations'
      console.error('Error loading explorations:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createExploration(data: CreateThreePathwaysPayload): Promise<ThreePathwaysToMeaning> {
    error.value = null
    try {
      const item = await threePathwaysDexieRepository.create(data)
      explorations.value.push(item)
      return item
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create exploration'
      console.error('Error creating exploration:', err)
      throw err
    }
  }

  async function updateExploration(
    id: string,
    data: UpdateThreePathwaysPayload,
  ): Promise<ThreePathwaysToMeaning> {
    error.value = null
    try {
      const updated = await threePathwaysDexieRepository.update(id, data)
      const index = explorations.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        explorations.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update exploration'
      console.error('Error updating exploration:', err)
      throw err
    }
  }

  async function deleteExploration(id: string): Promise<void> {
    error.value = null
    try {
      await threePathwaysDexieRepository.delete(id)
      explorations.value = explorations.value.filter((item) => item.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete exploration'
      console.error('Error deleting exploration:', err)
      throw err
    }
  }

  return {
    explorations,
    isLoading,
    error,
    sortedExplorations,
    latestExploration,
    getExplorationById,
    loadExplorations,
    createExploration,
    updateExploration,
    deleteExploration,
  }
})
