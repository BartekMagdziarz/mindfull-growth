/**
 * Paradoxical Intention Lab Store
 *
 * Manages Paradoxical Intention Lab exercises (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ParadoxicalIntentionLab,
  CreateParadoxicalIntentionPayload,
  UpdateParadoxicalIntentionPayload,
} from '@/domain/exercises'
import { paradoxicalIntentionDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useParadoxicalIntentionStore = defineStore('paradoxicalIntention', () => {
  const labs = ref<ParadoxicalIntentionLab[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedLabs = computed(() => {
    return [...labs.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestLab = computed(() => {
    return sortedLabs.value[0] ?? null
  })

  const getLabById = computed(() => {
    return (id: string): ParadoxicalIntentionLab | undefined => {
      return labs.value.find((item) => item.id === id)
    }
  })

  async function loadLabs(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      labs.value = await paradoxicalIntentionDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load labs'
      console.error('Error loading labs:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLab(data: CreateParadoxicalIntentionPayload): Promise<ParadoxicalIntentionLab> {
    error.value = null
    try {
      const item = await paradoxicalIntentionDexieRepository.create(data)
      labs.value.push(item)
      return item
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create lab'
      console.error('Error creating lab:', err)
      throw err
    }
  }

  async function updateLab(
    id: string,
    data: UpdateParadoxicalIntentionPayload,
  ): Promise<ParadoxicalIntentionLab> {
    error.value = null
    try {
      const updated = await paradoxicalIntentionDexieRepository.update(id, data)
      const index = labs.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        labs.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update lab'
      console.error('Error updating lab:', err)
      throw err
    }
  }

  async function deleteLab(id: string): Promise<void> {
    error.value = null
    try {
      await paradoxicalIntentionDexieRepository.delete(id)
      labs.value = labs.value.filter((item) => item.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete lab'
      console.error('Error deleting lab:', err)
      throw err
    }
  }

  return {
    labs,
    isLoading,
    error,
    sortedLabs,
    latestLab,
    getLabById,
    loadLabs,
    createLab,
    updateLab,
    deleteLab,
  }
})
