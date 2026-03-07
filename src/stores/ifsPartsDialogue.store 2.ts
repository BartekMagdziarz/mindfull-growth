import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSPartsDialogue,
  CreateIFSPartsDialoguePayload,
  UpdateIFSPartsDialoguePayload,
} from '@/domain/exercises'
import { ifsPartsDialogueDexieRepository } from '@/repositories/exercisesDexieRepository'

export const useIFSPartsDialogueStore = defineStore('ifsPartsDialogue', () => {
  const dialogues = ref<IFSPartsDialogue[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedDialogues = computed(() => {
    return [...dialogues.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestDialogue = computed(() => {
    return sortedDialogues.value[0] ?? null
  })

  const getDialogueById = computed(() => {
    return (id: string): IFSPartsDialogue | undefined => {
      return dialogues.value.find((d) => d.id === id)
    }
  })

  async function loadDialogues(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      dialogues.value = await ifsPartsDialogueDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load parts dialogues'
      console.error('Error loading parts dialogues:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createDialogue(data: CreateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    error.value = null
    try {
      const dialogue = await ifsPartsDialogueDexieRepository.create(data)
      dialogues.value.push(dialogue)
      return dialogue
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create parts dialogue'
      console.error('Error creating parts dialogue:', err)
      throw err
    }
  }

  async function updateDialogue(id: string, data: UpdateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    error.value = null
    try {
      const updated = await ifsPartsDialogueDexieRepository.update(id, data)
      const index = dialogues.value.findIndex((d) => d.id === id)
      if (index !== -1) {
        dialogues.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update parts dialogue'
      console.error('Error updating parts dialogue:', err)
      throw err
    }
  }

  async function deleteDialogue(id: string): Promise<void> {
    error.value = null
    try {
      await ifsPartsDialogueDexieRepository.delete(id)
      dialogues.value = dialogues.value.filter((d) => d.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete parts dialogue'
      console.error('Error deleting parts dialogue:', err)
      throw err
    }
  }

  return {
    dialogues,
    isLoading,
    error,
    sortedDialogues,
    latestDialogue,
    getDialogueById,
    loadDialogues,
    createDialogue,
    updateDialogue,
    deleteDialogue,
  }
})
