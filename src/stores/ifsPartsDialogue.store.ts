import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IFSPartsDialogue,
  CreateIFSPartsDialoguePayload,
  UpdateIFSPartsDialoguePayload,
} from '@/domain/exercises'
import { ifsPartsDialogueDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useIFSPartsDialogueStore = defineStore('ifsPartsDialogue', () => {
  const sessionScope = createStoreSessionScope()
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
      return dialogues.value.find(d => d.id === id)
    }
  })

  async function loadDialogues(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        dialogues.value = await operation.wait(ifsPartsDialogueDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load parts dialogues'
        console.error('Error loading parts dialogues:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createDialogue(data: CreateIFSPartsDialoguePayload): Promise<IFSPartsDialogue> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const dialogue = await operation.wait(ifsPartsDialogueDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('parts-dialogue', dialogue.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      dialogues.value.push(dialogue)
      return dialogue
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create parts dialogue'
      console.error('Error creating parts dialogue:', err)
      throw err
    }
  }

  async function updateDialogue(
    id: string,
    data: UpdateIFSPartsDialoguePayload
  ): Promise<IFSPartsDialogue> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(ifsPartsDialogueDexieRepository.update(id, data))
      const index = dialogues.value.findIndex(d => d.id === id)
      if (index !== -1) {
        dialogues.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update parts dialogue'
      console.error('Error updating parts dialogue:', err)
      throw err
    }
  }

  async function deleteDialogue(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(ifsPartsDialogueDexieRepository.delete(id))
        dialogues.value = dialogues.value.filter(d => d.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete parts dialogue'
        console.error('Error deleting parts dialogue:', err)
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
    dialogues.value = []
    isLoading.value = false
    error.value = null
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
    reset,
  }
})
