import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  IFSPart,
  CreateIFSPartPayload,
  UpdateIFSPartPayload,
  IFSPartRole,
} from '@/domain/exercises'
import { ifsPartDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

/** Registry of parts shared by the IFS exercises; creating one is not an exercise completion. */
export const useIFSPartStore = defineStore('ifsPart', () => {
  const parts = useExerciseCollection<IFSPart, CreateIFSPartPayload, UpdateIFSPartPayload>({
    repository: ifsPartDexieRepository,
    label: 'IFS part',
    scope: 'ifsPartStore',
  })

  const getPartsByRole = computed(() => {
    return (role: IFSPartRole): IFSPart[] => parts.items.value.filter(p => p.role === role)
  })
  const protectorParts = computed(() =>
    parts.items.value.filter(p => p.role === 'manager' || p.role === 'firefighter')
  )
  const exileParts = computed(() => parts.items.value.filter(p => p.role === 'exile'))

  return {
    parts: parts.items,
    isLoading: parts.isLoading,
    error: parts.error,
    sortedParts: parts.sorted,
    getPartById: parts.getById,
    getPartsByRole,
    protectorParts,
    exileParts,
    loadParts: parts.loadAll,
    createPart: parts.create,
    updatePart: parts.update,
    deletePart: parts.remove,
    reset: parts.reset,
  }
})
