/**
 * Mountain Range of Meaning Store
 *
 * Manages Mountain Range of Meaning explorations (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MountainRangeOfMeaning,
  CreateMountainRangePayload,
  UpdateMountainRangePayload,
} from '@/domain/exercises'
import { mountainRangeDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useMountainRangeStore = defineStore('mountainRange', () => {
  const explorations = ref<MountainRangeOfMeaning[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedExplorations = computed(() => {
    return [...explorations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestExploration = computed(() => {
    return sortedExplorations.value[0] ?? null
  })

  const getExplorationById = computed(() => {
    return (id: string): MountainRangeOfMeaning | undefined => {
      return explorations.value.find((item) => item.id === id)
    }
  })

  async function loadExplorations(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      explorations.value = await mountainRangeDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load explorations'
      console.error('Error loading explorations:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createExploration(data: CreateMountainRangePayload): Promise<MountainRangeOfMeaning> {
    error.value = null
    try {
      const item = await mountainRangeDexieRepository.create(data)
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
    data: UpdateMountainRangePayload,
  ): Promise<MountainRangeOfMeaning> {
    error.value = null
    try {
      const updated = await mountainRangeDexieRepository.update(id, data)
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
      await mountainRangeDexieRepository.delete(id)
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
