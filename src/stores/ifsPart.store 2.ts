import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IFSPart, CreateIFSPartPayload, UpdateIFSPartPayload, IFSPartRole } from '@/domain/exercises'
import { ifsPartDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSPartStore = defineStore('ifsPart', () => {
  const parts = ref<IFSPart[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedParts = computed(() => {
    return [...parts.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const getPartById = computed(() => {
    return (id: string): IFSPart | undefined => {
      return parts.value.find((p) => p.id === id)
    }
  })

  const getPartsByRole = computed(() => {
    return (role: IFSPartRole): IFSPart[] => {
      return parts.value.filter((p) => p.role === role)
    }
  })

  const protectorParts = computed(() => {
    return parts.value.filter((p) => p.role === 'manager' || p.role === 'firefighter')
  })

  const exileParts = computed(() => {
    return parts.value.filter((p) => p.role === 'exile')
  })

  async function loadParts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      parts.value = await ifsPartDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load IFS parts'
      console.error('Error loading IFS parts:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createPart(data: CreateIFSPartPayload): Promise<IFSPart> {
    error.value = null
    try {
      const part = await ifsPartDexieRepository.create(data)
      parts.value.push(part)
      return part
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create IFS part'
      console.error('Error creating IFS part:', err)
      throw err
    }
  }

  async function updatePart(id: string, data: UpdateIFSPartPayload): Promise<IFSPart> {
    error.value = null
    try {
      const updated = await ifsPartDexieRepository.update(id, data)
      const index = parts.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        parts.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update IFS part'
      console.error('Error updating IFS part:', err)
      throw err
    }
  }

  async function deletePart(id: string): Promise<void> {
    error.value = null
    try {
      await ifsPartDexieRepository.delete(id)
      parts.value = parts.value.filter((p) => p.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete IFS part'
      console.error('Error deleting IFS part:', err)
      throw err
    }
  }

  return {
    parts,
    isLoading,
    error,
    sortedParts,
    getPartById,
    getPartsByRole,
    protectorParts,
    exileParts,
    loadParts,
    createPart,
    updatePart,
    deletePart,
  }
})
