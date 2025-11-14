import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import {
  peopleTagDexieRepository,
  contextTagDexieRepository,
} from '@/repositories/tagDexieRepository'

export const useTagStore = defineStore('tag', () => {
  // State
  const peopleTags = ref<PeopleTag[]>([])
  const contextTags = ref<ContextTag[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  function getPeopleTagById(id: string): PeopleTag | undefined {
    return peopleTags.value.find((tag) => tag.id === id)
  }

  function getContextTagById(id: string): ContextTag | undefined {
    return contextTags.value.find((tag) => tag.id === id)
  }

  // Actions
  async function loadPeopleTags() {
    isLoading.value = true
    error.value = null
    try {
      const loadedTags = await peopleTagDexieRepository.getAll()
      peopleTags.value = loadedTags
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load people tags'
      error.value = errorMessage
      console.error('Error loading people tags:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadContextTags() {
    isLoading.value = true
    error.value = null
    try {
      const loadedTags = await contextTagDexieRepository.getAll()
      contextTags.value = loadedTags
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load context tags'
      error.value = errorMessage
      console.error('Error loading context tags:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createPeopleTag(name: string): Promise<PeopleTag> {
    error.value = null
    try {
      // Check for duplicate (case-insensitive)
      const existingTag = peopleTags.value.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      )
      if (existingTag) {
        return existingTag
      }

      // Create new tag
      const newTag = await peopleTagDexieRepository.create({ name })
      peopleTags.value.push(newTag)
      return newTag
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create people tag'
      error.value = errorMessage
      console.error('Error creating people tag:', err)
      throw err
    }
  }

  async function createContextTag(name: string): Promise<ContextTag> {
    error.value = null
    try {
      // Check for duplicate (case-insensitive)
      const existingTag = contextTags.value.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase()
      )
      if (existingTag) {
        return existingTag
      }

      // Create new tag
      const newTag = await contextTagDexieRepository.create({ name })
      contextTags.value.push(newTag)
      return newTag
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create context tag'
      error.value = errorMessage
      console.error('Error creating context tag:', err)
      throw err
    }
  }

  async function deletePeopleTag(id: string): Promise<void> {
    error.value = null
    try {
      await peopleTagDexieRepository.delete(id)
      peopleTags.value = peopleTags.value.filter((tag) => tag.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete people tag'
      error.value = errorMessage
      console.error('Error deleting people tag:', err)
      throw err
    }
  }

  async function deleteContextTag(id: string): Promise<void> {
    error.value = null
    try {
      await contextTagDexieRepository.delete(id)
      contextTags.value = contextTags.value.filter((tag) => tag.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete context tag'
      error.value = errorMessage
      console.error('Error deleting context tag:', err)
      throw err
    }
  }

  return {
    // State
    peopleTags,
    contextTags,
    isLoading,
    error,
    // Getters
    getPeopleTagById,
    getContextTagById,
    // Actions
    loadPeopleTags,
    loadContextTags,
    createPeopleTag,
    createContextTag,
    deletePeopleTag,
    deleteContextTag,
  }
})

