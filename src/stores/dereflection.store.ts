/**
 * Dereflection Practice Store
 *
 * Manages DereflectionPractice exercises — redirect attention from
 * fixation toward meaningful activities (Viktor Frankl).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DereflectionPractice,
  CreateDereflectionPayload,
  UpdateDereflectionPayload,
} from '@/domain/exercises'
import { dereflectionDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useDereflectionStore = defineStore('dereflection', () => {
  const practices = ref<DereflectionPractice[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedPractices = computed(() => {
    return [...practices.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestPractice = computed(() => {
    return sortedPractices.value[0] ?? null
  })

  const getPracticeById = computed(() => {
    return (id: string): DereflectionPractice | undefined => {
      return practices.value.find((p) => p.id === id)
    }
  })

  async function loadPractices(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      practices.value = await dereflectionDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dereflection practices'
      console.error('Error loading dereflection practices:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createPractice(data: CreateDereflectionPayload): Promise<DereflectionPractice> {
    error.value = null
    try {
      const practice = await dereflectionDexieRepository.create(data)
      practices.value.push(practice)
      return practice
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create dereflection practice'
      console.error('Error creating dereflection practice:', err)
      throw err
    }
  }

  async function updatePractice(
    id: string,
    data: UpdateDereflectionPayload,
  ): Promise<DereflectionPractice> {
    error.value = null
    try {
      const updated = await dereflectionDexieRepository.update(id, data)
      const index = practices.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        practices.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update dereflection practice'
      console.error('Error updating dereflection practice:', err)
      throw err
    }
  }

  async function deletePractice(id: string): Promise<void> {
    error.value = null
    try {
      await dereflectionDexieRepository.delete(id)
      practices.value = practices.value.filter((p) => p.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete dereflection practice'
      console.error('Error deleting dereflection practice:', err)
      throw err
    }
  }

  return {
    practices,
    isLoading,
    error,
    sortedPractices,
    latestPractice,
    getPracticeById,
    loadPractices,
    createPractice,
    updatePractice,
    deletePractice,
  }
})
