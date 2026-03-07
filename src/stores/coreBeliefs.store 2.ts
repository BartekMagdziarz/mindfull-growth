/**
 * Core Beliefs Exploration Store
 *
 * Manages CoreBeliefsExplorations — Downward Arrow exercises that drill
 * from automatic thoughts to deep core beliefs (Judith Beck, 1995).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CoreBeliefsExploration,
  CreateCoreBeliefsExplorationPayload,
  UpdateCoreBeliefsExplorationPayload,
} from '@/domain/exercises'
import { coreBeliefsExplorationDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useCoreBeliefsStore = defineStore('coreBeliefs', () => {
  const explorations = ref<CoreBeliefsExploration[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedExplorations = computed(() => {
    return [...explorations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestExploration = computed(() => {
    return sortedExplorations.value[0] ?? null
  })

  const getExplorationById = computed(() => {
    return (id: string): CoreBeliefsExploration | undefined => {
      return explorations.value.find((e) => e.id === id)
    }
  })

  async function loadExplorations(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      explorations.value = await coreBeliefsExplorationDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load core beliefs explorations'
      console.error('Error loading core beliefs explorations:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createExploration(data: CreateCoreBeliefsExplorationPayload): Promise<CoreBeliefsExploration> {
    error.value = null
    try {
      const exploration = await coreBeliefsExplorationDexieRepository.create(data)
      explorations.value.push(exploration)
      return exploration
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create core beliefs exploration'
      console.error('Error creating core beliefs exploration:', err)
      throw err
    }
  }

  async function updateExploration(
    id: string,
    data: UpdateCoreBeliefsExplorationPayload,
  ): Promise<CoreBeliefsExploration> {
    error.value = null
    try {
      const updated = await coreBeliefsExplorationDexieRepository.update(id, data)
      const index = explorations.value.findIndex((e) => e.id === id)
      if (index !== -1) {
        explorations.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update core beliefs exploration'
      console.error('Error updating core beliefs exploration:', err)
      throw err
    }
  }

  async function deleteExploration(id: string): Promise<void> {
    error.value = null
    try {
      await coreBeliefsExplorationDexieRepository.delete(id)
      explorations.value = explorations.value.filter((e) => e.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete core beliefs exploration'
      console.error('Error deleting core beliefs exploration:', err)
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
