import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSPart,
  CreateIFSPartPayload,
  UpdateIFSPartPayload,
  IFSPartRole,
} from '@/domain/exercises'
import { ifsPartDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSPartStore = defineStore('ifsPart', () => {
  const sessionScope = createStoreSessionScope()
  const parts = ref<IFSPart[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedParts = computed(() => {
    return [...parts.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const getPartById = computed(() => {
    return (id: string): IFSPart | undefined => {
      return parts.value.find(p => p.id === id)
    }
  })

  const getPartsByRole = computed(() => {
    return (role: IFSPartRole): IFSPart[] => {
      return parts.value.filter(p => p.role === role)
    }
  })

  const protectorParts = computed(() => {
    return parts.value.filter(p => p.role === 'manager' || p.role === 'firefighter')
  })

  const exileParts = computed(() => {
    return parts.value.filter(p => p.role === 'exile')
  })

  async function loadParts(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        parts.value = await operation.wait(ifsPartDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load IFS parts'
        console.error('Error loading IFS parts:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createPart(data: CreateIFSPartPayload): Promise<IFSPart> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const part = await operation.wait(ifsPartDexieRepository.create(data))
      parts.value.push(part)
      return part
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create IFS part'
      console.error('Error creating IFS part:', err)
      throw err
    }
  }

  async function updatePart(id: string, data: UpdateIFSPartPayload): Promise<IFSPart> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsPartDexieRepository.update(id, data))
      const index = parts.value.findIndex(p => p.id === id)
      if (index !== -1) {
        parts.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update IFS part'
      console.error('Error updating IFS part:', err)
      throw err
    }
  }

  async function deletePart(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsPartDexieRepository.delete(id))
        parts.value = parts.value.filter(p => p.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete IFS part'
        console.error('Error deleting IFS part:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Resets all in-memory state to initial values. Called on user
   * logout/login by `appStateReset` so user B does not see user A's
   * data before the next `load*()` re-fetches from the new database.
   */
  function reset(): void {
    sessionScope.reset()
    parts.value = []
    isLoading.value = false
    error.value = null
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
    reset,
  }
})
