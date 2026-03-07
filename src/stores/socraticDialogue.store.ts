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

export const useSocraticDialogueStore = defineStore('socraticDialogue', () => {
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
      return dialogues.value.find((item) => item.id === id)
    }
  })

  async function loadDialogues(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      dialogues.value = await socraticDialogueDexieRepository.getAll()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load dialogues'
      console.error('Error loading dialogues:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createDialogue(data: CreateSocraticDialoguePayload): Promise<SocraticSelfDialogue> {
    error.value = null
    try {
      const item = await socraticDialogueDexieRepository.create(data)
      dialogues.value.push(item)
      return item
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create dialogue'
      console.error('Error creating dialogue:', err)
      throw err
    }
  }

  async function updateDialogue(
    id: string,
    data: UpdateSocraticDialoguePayload,
  ): Promise<SocraticSelfDialogue> {
    error.value = null
    try {
      const updated = await socraticDialogueDexieRepository.update(id, data)
      const index = dialogues.value.findIndex((item) => item.id === id)
      if (index !== -1) {
        dialogues.value[index] = updated
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update dialogue'
      console.error('Error updating dialogue:', err)
      throw err
    }
  }

  async function deleteDialogue(id: string): Promise<void> {
    error.value = null
    try {
      await socraticDialogueDexieRepository.delete(id)
      dialogues.value = dialogues.value.filter((item) => item.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete dialogue'
      console.error('Error deleting dialogue:', err)
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
