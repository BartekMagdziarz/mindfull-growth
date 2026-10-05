import { createStoreSessionScope } from '@/services/userSessionScope'
/**
 * Socratic Self-Dialogue Store
 *
 * Manages Socratic Self-Dialogue exercises (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  SocraticSelfDialogue,
  CreateSocraticDialoguePayload,
  UpdateSocraticDialoguePayload,
} from '@/domain/exercises'
import { socraticDialogueDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

export const useSocraticDialogueStore = defineStore('socraticDialogue', () => {
  const sessionScope = createStoreSessionScope()
  const dialogues = ref<SocraticSelfDialogue[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const sortedDialogues = computed(() => {
    return [...dialogues.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  const latestDialogue = computed(() => {
    return sortedDialogues.value[0] ?? null
  })

  const getDialogueById = computed(() => {
    return (id: string): SocraticSelfDialogue | undefined => {
      return dialogues.value.find(item => item.id === id)
    }
  })

  async function loadDialogues(): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        dialogues.value = await operation.wait(socraticDialogueDexieRepository.getAll())
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to load dialogues'
        console.error('Error loading dialogues:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createDialogue(
    data: CreateSocraticDialoguePayload
  ): Promise<SocraticSelfDialogue> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const item = await operation.wait(socraticDialogueDexieRepository.create(data))
      void useExerciseCompletionsStore()
        .record('socratic-dialogue', item.id)
        .catch(err => console.error('Failed to record exercise completion:', err))
      dialogues.value.push(item)
      return item
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to create dialogue'
      console.error('Error creating dialogue:', err)
      throw err
    }
  }

  async function updateDialogue(
    id: string,
    data: UpdateSocraticDialoguePayload
  ): Promise<SocraticSelfDialogue> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const updated = await operation.wait(socraticDialogueDexieRepository.update(id, data))
      const index = dialogues.value.findIndex(item => item.id === id)
      if (index !== -1) {
        dialogues.value[index] = updated
      }
      return updated
    } catch (err) {
      operation.assertCurrent()
      error.value = err instanceof Error ? err.message : 'Failed to update dialogue'
      console.error('Error updating dialogue:', err)
      throw err
    }
  }

  async function deleteDialogue(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(socraticDialogueDexieRepository.delete(id))
        dialogues.value = dialogues.value.filter(item => item.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        error.value = err instanceof Error ? err.message : 'Failed to delete dialogue'
        console.error('Error deleting dialogue:', err)
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
