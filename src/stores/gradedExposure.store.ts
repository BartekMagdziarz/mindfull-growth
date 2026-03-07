/**
 * Graded Exposure Hierarchy Store
 *
 * Manages GradedExposureHierarchies — fear ladders for systematic
 * desensitization (Wolpe, 1958; Foa & Kozak, 1986).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GradedExposureHierarchy,
  CreateGradedExposureHierarchyPayload,
  UpdateGradedExposureHierarchyPayload,
} from '@/domain/exercises'
import { gradedExposureHierarchyDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useGradedExposureStore = defineStore('gradedExposure', () => {
  const hierarchies = ref<GradedExposureHierarchy[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedHierarchies = computed(() => {
    return [...hierarchies.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestHierarchy = computed(() => {
    return sortedHierarchies.value[0] ?? null
  })

  const getHierarchyById = computed(() => {
    return (id: string): GradedExposureHierarchy | undefined => {
      return hierarchies.value.find((h) => h.id === id)
    }
  })

  async function loadHierarchies(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      hierarchies.value = await gradedExposureHierarchyDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load exposure hierarchies'
      console.error('Error loading exposure hierarchies:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createHierarchy(data: CreateGradedExposureHierarchyPayload): Promise<GradedExposureHierarchy> {
    error.value = null
    try {
      const hierarchy = await gradedExposureHierarchyDexieRepository.create(data)
      hierarchies.value.push(hierarchy)
      return hierarchy
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create exposure hierarchy'
      console.error('Error creating exposure hierarchy:', err)
      throw err
    }
  }

  async function updateHierarchy(
    id: string,
    data: UpdateGradedExposureHierarchyPayload,
  ): Promise<GradedExposureHierarchy> {
    error.value = null
    try {
      const updated = await gradedExposureHierarchyDexieRepository.update(id, data)
      const index = hierarchies.value.findIndex((h) => h.id === id)
      if (index !== -1) {
        hierarchies.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update exposure hierarchy'
      console.error('Error updating exposure hierarchy:', err)
      throw err
    }
  }

  async function deleteHierarchy(id: string): Promise<void> {
    error.value = null
    try {
      await gradedExposureHierarchyDexieRepository.delete(id)
      hierarchies.value = hierarchies.value.filter((h) => h.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete exposure hierarchy'
      console.error('Error deleting exposure hierarchy:', err)
      throw err
    }
  }

  return {
    hierarchies,
    isLoading,
    error,
    sortedHierarchies,
    latestHierarchy,
    getHierarchyById,
    loadHierarchies,
    createHierarchy,
    updateHierarchy,
    deleteHierarchy,
  }
})
