import { createStoreSessionScope } from '@/services/userSessionScope'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import {
  peopleTagDexieRepository,
  contextTagDexieRepository,
} from '@/repositories/tagDexieRepository'

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function ensureValidTagName(rawName: string): string {
  const normalized = normalizeTagName(rawName)
  if (!normalized) {
    throw new Error('Tag name cannot be empty')
  }
  return normalized
}

function tagsMatch(existingName: string, normalizedName: string): boolean {
  return normalizeTagName(existingName).toLowerCase() === normalizedName.toLowerCase()
}

export const useTagStore = defineStore('tag', () => {
  const sessionScope = createStoreSessionScope()
  // State
  const peopleTags = ref<PeopleTag[]>([])
  const contextTags = ref<ContextTag[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)

  // Getters
  function getPeopleTagById(id: string): PeopleTag | undefined {
    return peopleTags.value.find(tag => tag.id === id)
  }

  function getContextTagById(id: string): ContextTag | undefined {
    return contextTags.value.find(tag => tag.id === id)
  }

  // Actions
  async function loadPeopleTags() {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        const loadedTags = await operation.wait(peopleTagDexieRepository.getAll())
        peopleTags.value = loadedTags
      } catch (err) {
        operation.assertCurrent()
        const errorMessage = err instanceof Error ? err.message : 'Failed to load people tags'
        error.value = errorMessage
        console.error('Error loading people tags:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function loadContextTags() {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      isLoading.value = true
      error.value = null
      try {
        const loadedTags = await operation.wait(contextTagDexieRepository.getAll())
        contextTags.value = loadedTags
      } catch (err) {
        operation.assertCurrent()
        const errorMessage = err instanceof Error ? err.message : 'Failed to load context tags'
        error.value = errorMessage
        console.error('Error loading context tags:', err)
      } finally {
        if (operation.isCurrent()) {
          isLoading.value = false
        }
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  /**
   * Hydrates both tag lists from Dexie at most once. Components that
   * resolve tag names directly (e.g. calendar summary cards) call this
   * on mount so they work on a cold start, without re-reading the
   * database on every navigation. After a failed load `isLoaded` stays
   * false, so the next caller retries.
   */
  async function ensureLoaded() {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      if (isLoaded.value || isLoading.value) return
      await operation.wait(Promise.all([loadPeopleTags(), loadContextTags()]))
      if (!error.value) {
        isLoaded.value = true
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function createPeopleTag(name: string): Promise<PeopleTag> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const normalizedName = ensureValidTagName(name)

      // Check for duplicate (case-insensitive)
      const existingTag = peopleTags.value.find(tag => tagsMatch(tag.name, normalizedName))
      if (existingTag) {
        return existingTag
      }

      // Create new tag
      const newTag = await operation.wait(peopleTagDexieRepository.create({ name: normalizedName }))
      peopleTags.value.push(newTag)
      return newTag
    } catch (err) {
      operation.assertCurrent()
      const errorMessage = err instanceof Error ? err.message : 'Failed to create people tag'
      error.value = errorMessage
      console.error('Error creating people tag:', err)
      throw err
    }
  }

  async function createContextTag(name: string): Promise<ContextTag> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const normalizedName = ensureValidTagName(name)

      // Check for duplicate (case-insensitive)
      const existingTag = contextTags.value.find(tag => tagsMatch(tag.name, normalizedName))
      if (existingTag) {
        return existingTag
      }

      // Create new tag
      const newTag = await operation.wait(
        contextTagDexieRepository.create({ name: normalizedName })
      )
      contextTags.value.push(newTag)
      return newTag
    } catch (err) {
      operation.assertCurrent()
      const errorMessage = err instanceof Error ? err.message : 'Failed to create context tag'
      error.value = errorMessage
      console.error('Error creating context tag:', err)
      throw err
    }
  }

  async function deletePeopleTag(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(peopleTagDexieRepository.delete(id))
        peopleTags.value = peopleTags.value.filter(tag => tag.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete people tag'
        error.value = errorMessage
        console.error('Error deleting people tag:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function deleteContextTag(id: string): Promise<void> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    try {
      error.value = null
      try {
        await operation.wait(contextTagDexieRepository.delete(id))
        contextTags.value = contextTags.value.filter(tag => tag.id !== id)
      } catch (err) {
        if (!operation.isCurrent()) return
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete context tag'
        error.value = errorMessage
        console.error('Error deleting context tag:', err)
        throw err
      }
    } catch (error) {
      if (operation.isCurrent()) throw error
    }
  }

  async function updatePeopleTag(id: string, name: string): Promise<PeopleTag> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const normalizedName = ensureValidTagName(name)

      // Check for duplicate (case-insensitive), excluding current tag
      const existingTag = peopleTags.value.find(
        tag => tag.id !== id && tagsMatch(tag.name, normalizedName)
      )
      if (existingTag) {
        throw new Error('A tag with this name already exists')
      }

      const updatedTag = await operation.wait(
        peopleTagDexieRepository.update(id, { name: normalizedName })
      )
      const index = peopleTags.value.findIndex(tag => tag.id === id)
      if (index !== -1) {
        peopleTags.value[index] = updatedTag
      }
      return updatedTag
    } catch (err) {
      operation.assertCurrent()
      const errorMessage = err instanceof Error ? err.message : 'Failed to update people tag'
      error.value = errorMessage
      console.error('Error updating people tag:', err)
      throw err
    }
  }

  async function updateContextTag(id: string, name: string): Promise<ContextTag> {
    const operation = sessionScope.capture()
    operation.assertCurrent()
    error.value = null
    try {
      const normalizedName = ensureValidTagName(name)

      // Check for duplicate (case-insensitive), excluding current tag
      const existingTag = contextTags.value.find(
        tag => tag.id !== id && tagsMatch(tag.name, normalizedName)
      )
      if (existingTag) {
        throw new Error('A tag with this name already exists')
      }

      const updatedTag = await operation.wait(
        contextTagDexieRepository.update(id, { name: normalizedName })
      )
      const index = contextTags.value.findIndex(tag => tag.id === id)
      if (index !== -1) {
        contextTags.value[index] = updatedTag
      }
      return updatedTag
    } catch (err) {
      operation.assertCurrent()
      const errorMessage = err instanceof Error ? err.message : 'Failed to update context tag'
      error.value = errorMessage
      console.error('Error updating context tag:', err)
      throw err
    }
  }

  /**
   * Resets all in-memory tag lists. Called on user logout/login by
   * `appStateReset` so user B does not see user A's people/context tags.
   */
  function reset(): void {
    sessionScope.reset()
    peopleTags.value = []
    contextTags.value = []
    isLoading.value = false
    isLoaded.value = false
    error.value = null
  }

  return {
    // State
    peopleTags,
    contextTags,
    isLoading,
    isLoaded,
    error,
    // Getters
    getPeopleTagById,
    getContextTagById,
    // Actions
    loadPeopleTags,
    loadContextTags,
    ensureLoaded,
    createPeopleTag,
    createContextTag,
    deletePeopleTag,
    deleteContextTag,
    updatePeopleTag,
    updateContextTag,
    reset,
  }
})
