/**
 * Values Discovery Store
 *
 * Manages ValuesDiscovery exercises — identifying core values through admiration analysis.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ValuesDiscovery,
  CreateValuesDiscoveryPayload,
  UpdateValuesDiscoveryPayload,
} from '@/domain/exercises'
import { valuesDiscoveryDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useValuesDiscoveryStore = defineStore('valuesDiscovery', () => {
  const discoveries = ref<ValuesDiscovery[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedDiscoveries = computed(() => {
    return [...discoveries.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestDiscovery = computed(() => {
    return sortedDiscoveries.value[0] ?? null
  })

  const getDiscoveryById = computed(() => {
    return (id: string): ValuesDiscovery | undefined => {
      return discoveries.value.find((d) => d.id === id)
    }
  })

  async function loadDiscoveries(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      discoveries.value = await valuesDiscoveryDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load values discoveries'
      console.error('Error loading values discoveries:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createDiscovery(data: CreateValuesDiscoveryPayload): Promise<ValuesDiscovery> {
    error.value = null
    try {
      const discovery = await valuesDiscoveryDexieRepository.create(data)
      discoveries.value.push(discovery)
      return discovery
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create values discovery'
      console.error('Error creating values discovery:', err)
      throw err
    }
  }

  async function updateDiscovery(
    id: string,
    data: UpdateValuesDiscoveryPayload,
  ): Promise<ValuesDiscovery> {
    error.value = null
    try {
      const updated = await valuesDiscoveryDexieRepository.update(id, data)
      const index = discoveries.value.findIndex((d) => d.id === id)
      if (index !== -1) {
        discoveries.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update values discovery'
      console.error('Error updating values discovery:', err)
      throw err
    }
  }

  async function deleteDiscovery(id: string): Promise<void> {
    error.value = null
    try {
      await valuesDiscoveryDexieRepository.delete(id)
      discoveries.value = discoveries.value.filter((d) => d.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete values discovery'
      console.error('Error deleting values discovery:', err)
      throw err
    }
  }

  return {
    discoveries,
    isLoading,
    error,
    sortedDiscoveries,
    latestDiscovery,
    getDiscoveryById,
    loadDiscoveries,
    createDiscovery,
    updateDiscovery,
    deleteDiscovery,
  }
})
