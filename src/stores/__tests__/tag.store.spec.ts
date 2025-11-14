import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTagStore } from '../tag.store'
import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'
import type { PeopleTagRepository } from '@/repositories/tagRepository'
import type { ContextTagRepository } from '@/repositories/tagRepository'

// Mock the repository module
vi.mock('@/repositories/tagDexieRepository', () => {
  const mockPeopleTagRepository: PeopleTagRepository = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  }
  const mockContextTagRepository: ContextTagRepository = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  }
  return {
    peopleTagDexieRepository: mockPeopleTagRepository,
    contextTagDexieRepository: mockContextTagRepository,
  }
})

// Import the mocked repositories to access the mock functions
import {
  peopleTagDexieRepository,
  contextTagDexieRepository,
} from '@/repositories/tagDexieRepository'

describe('useTagStore', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('createPeopleTag', () => {
    it('sets id and name and adds the tag to peopleTags', async () => {
      const store = useTagStore()
      const mockTag: PeopleTag = {
        id: 'test-id-123',
        name: 'Mom',
      }

      vi.mocked(peopleTagDexieRepository.create).mockResolvedValue(mockTag)

      const result = await store.createPeopleTag('Mom')

      // Verify the repository was called with the correct name
      expect(peopleTagDexieRepository.create).toHaveBeenCalledWith({
        name: 'Mom',
      })

      // Verify the returned tag has id and name
      expect(result.id).toBe('test-id-123')
      expect(result.name).toBe('Mom')

      // Verify the tag was added to peopleTags
      expect(store.peopleTags).toHaveLength(1)
      expect(store.peopleTags[0]).toEqual(mockTag)
    })

    it('returns existing tag when duplicate name exists (case-insensitive)', async () => {
      const store = useTagStore()
      const existingTag: PeopleTag = {
        id: 'existing-id',
        name: 'mom',
      }

      // Pre-populate with existing tag
      store.peopleTags = [existingTag]

      const result = await store.createPeopleTag('Mom')

      // Verify the repository was NOT called (duplicate prevention)
      expect(peopleTagDexieRepository.create).not.toHaveBeenCalled()

      // Verify the existing tag was returned
      expect(result).toEqual(existingTag)
      expect(result.id).toBe('existing-id')
      expect(result.name).toBe('mom')

      // Verify no duplicate was created
      expect(store.peopleTags).toHaveLength(1)
    })

    it('returns existing tag when duplicate name exists with different case', async () => {
      const store = useTagStore()
      const existingTag: PeopleTag = {
        id: 'existing-id',
        name: 'Work Team',
      }

      // Pre-populate with existing tag
      store.peopleTags = [existingTag]

      const result = await store.createPeopleTag('work team')

      // Verify the repository was NOT called
      expect(peopleTagDexieRepository.create).not.toHaveBeenCalled()

      // Verify the existing tag was returned
      expect(result).toEqual(existingTag)
      expect(store.peopleTags).toHaveLength(1)
    })
  })

  describe('createContextTag', () => {
    it('sets id and name and adds the tag to contextTags', async () => {
      const store = useTagStore()
      const mockTag: ContextTag = {
        id: 'test-id-456',
        name: 'Morning Routine',
      }

      vi.mocked(contextTagDexieRepository.create).mockResolvedValue(mockTag)

      const result = await store.createContextTag('Morning Routine')

      // Verify the repository was called with the correct name
      expect(contextTagDexieRepository.create).toHaveBeenCalledWith({
        name: 'Morning Routine',
      })

      // Verify the returned tag has id and name
      expect(result.id).toBe('test-id-456')
      expect(result.name).toBe('Morning Routine')

      // Verify the tag was added to contextTags
      expect(store.contextTags).toHaveLength(1)
      expect(store.contextTags[0]).toEqual(mockTag)
    })

    it('returns existing tag when duplicate name exists (case-insensitive)', async () => {
      const store = useTagStore()
      const existingTag: ContextTag = {
        id: 'existing-id',
        name: 'morning routine',
      }

      // Pre-populate with existing tag
      store.contextTags = [existingTag]

      const result = await store.createContextTag('Morning Routine')

      // Verify the repository was NOT called
      expect(contextTagDexieRepository.create).not.toHaveBeenCalled()

      // Verify the existing tag was returned
      expect(result).toEqual(existingTag)
      expect(store.contextTags).toHaveLength(1)
    })
  })

  describe('loadPeopleTags', () => {
    it('populates peopleTags based on data returned from the repository', async () => {
      const store = useTagStore()
      const mockTags: PeopleTag[] = [
        {
          id: 'tag-1',
          name: 'Mom',
        },
        {
          id: 'tag-2',
          name: 'John',
        },
      ]

      vi.mocked(peopleTagDexieRepository.getAll).mockResolvedValue(mockTags)

      expect(store.isLoading).toBe(false)
      expect(store.peopleTags).toHaveLength(0)

      await store.loadPeopleTags()

      // Verify loading state was set correctly
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()

      // Verify tags were populated
      expect(store.peopleTags).toHaveLength(2)
      expect(store.peopleTags).toEqual(mockTags)
      expect(peopleTagDexieRepository.getAll).toHaveBeenCalledOnce()
    })

    it('sets error state when repository fails', async () => {
      const store = useTagStore()
      const errorMessage = 'Database error'

      vi.mocked(peopleTagDexieRepository.getAll).mockRejectedValue(
        new Error(errorMessage)
      )

      await store.loadPeopleTags()

      expect(store.isLoading).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.peopleTags).toHaveLength(0)
    })

    it('sets isLoading to true during loading and false after', async () => {
      const store = useTagStore()
      const mockTags: PeopleTag[] = []

      // Create a promise that we can control
      let resolvePromise: (value: PeopleTag[]) => void
      const controlledPromise = new Promise<PeopleTag[]>((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(peopleTagDexieRepository.getAll).mockReturnValue(
        controlledPromise
      )

      const loadPromise = store.loadPeopleTags()

      // Check that isLoading is true while loading
      expect(store.isLoading).toBe(true)

      // Resolve the promise
      resolvePromise!(mockTags)
      await loadPromise

      // Check that isLoading is false after loading
      expect(store.isLoading).toBe(false)
    })
  })

  describe('loadContextTags', () => {
    it('populates contextTags based on data returned from the repository', async () => {
      const store = useTagStore()
      const mockTags: ContextTag[] = [
        {
          id: 'tag-1',
          name: 'Morning Routine',
        },
        {
          id: 'tag-2',
          name: 'Work Meeting',
        },
      ]

      vi.mocked(contextTagDexieRepository.getAll).mockResolvedValue(mockTags)

      expect(store.isLoading).toBe(false)
      expect(store.contextTags).toHaveLength(0)

      await store.loadContextTags()

      // Verify loading state was set correctly
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()

      // Verify tags were populated
      expect(store.contextTags).toHaveLength(2)
      expect(store.contextTags).toEqual(mockTags)
      expect(contextTagDexieRepository.getAll).toHaveBeenCalledOnce()
    })

    it('sets error state when repository fails', async () => {
      const store = useTagStore()
      const errorMessage = 'Database error'

      vi.mocked(contextTagDexieRepository.getAll).mockRejectedValue(
        new Error(errorMessage)
      )

      await store.loadContextTags()

      expect(store.isLoading).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.contextTags).toHaveLength(0)
    })
  })

  describe('deletePeopleTag', () => {
    it('removes the tag from peopleTags', async () => {
      const store = useTagStore()
      const tag1: PeopleTag = {
        id: 'tag-1',
        name: 'Mom',
      }
      const tag2: PeopleTag = {
        id: 'tag-2',
        name: 'John',
      }

      // Pre-populate tags
      store.peopleTags = [tag1, tag2]

      vi.mocked(peopleTagDexieRepository.delete).mockResolvedValue(undefined)

      await store.deletePeopleTag('tag-1')

      // Verify the repository was called
      expect(peopleTagDexieRepository.delete).toHaveBeenCalledWith('tag-1')

      // Verify the tag was removed from peopleTags
      expect(store.peopleTags).toHaveLength(1)
      expect(store.peopleTags[0].id).toBe('tag-2')
    })

    it('does not remove tag if repository delete fails', async () => {
      const store = useTagStore()
      const tag: PeopleTag = {
        id: 'tag-1',
        name: 'Mom',
      }

      store.peopleTags = [tag]

      vi.mocked(peopleTagDexieRepository.delete).mockRejectedValue(
        new Error('Delete failed')
      )

      // Expect the error to be thrown
      await expect(store.deletePeopleTag('tag-1')).rejects.toThrow(
        'Delete failed'
      )

      // Verify the tag was not removed
      expect(store.peopleTags).toHaveLength(1)
      expect(store.error).toBe('Delete failed')
    })
  })

  describe('deleteContextTag', () => {
    it('removes the tag from contextTags', async () => {
      const store = useTagStore()
      const tag1: ContextTag = {
        id: 'tag-1',
        name: 'Morning Routine',
      }
      const tag2: ContextTag = {
        id: 'tag-2',
        name: 'Work Meeting',
      }

      // Pre-populate tags
      store.contextTags = [tag1, tag2]

      vi.mocked(contextTagDexieRepository.delete).mockResolvedValue(undefined)

      await store.deleteContextTag('tag-1')

      // Verify the repository was called
      expect(contextTagDexieRepository.delete).toHaveBeenCalledWith('tag-1')

      // Verify the tag was removed from contextTags
      expect(store.contextTags).toHaveLength(1)
      expect(store.contextTags[0].id).toBe('tag-2')
    })
  })

  describe('getPeopleTagById', () => {
    it('returns the tag with the matching id', () => {
      const store = useTagStore()
      const tag1: PeopleTag = {
        id: 'tag-1',
        name: 'Mom',
      }
      const tag2: PeopleTag = {
        id: 'tag-2',
        name: 'John',
      }

      store.peopleTags = [tag1, tag2]

      const result = store.getPeopleTagById('tag-1')

      expect(result).toEqual(tag1)
      expect(result?.name).toBe('Mom')
    })

    it('returns undefined when tag with id does not exist', () => {
      const store = useTagStore()
      const tag: PeopleTag = {
        id: 'tag-1',
        name: 'Mom',
      }

      store.peopleTags = [tag]

      const result = store.getPeopleTagById('non-existent-id')

      expect(result).toBeUndefined()
    })
  })

  describe('getContextTagById', () => {
    it('returns the tag with the matching id', () => {
      const store = useTagStore()
      const tag1: ContextTag = {
        id: 'tag-1',
        name: 'Morning Routine',
      }
      const tag2: ContextTag = {
        id: 'tag-2',
        name: 'Work Meeting',
      }

      store.contextTags = [tag1, tag2]

      const result = store.getContextTagById('tag-2')

      expect(result).toEqual(tag2)
      expect(result?.name).toBe('Work Meeting')
    })

    it('returns undefined when tag with id does not exist', () => {
      const store = useTagStore()
      const tag: ContextTag = {
        id: 'tag-1',
        name: 'Morning Routine',
      }

      store.contextTags = [tag]

      const result = store.getContextTagById('non-existent-id')

      expect(result).toBeUndefined()
    })
  })
})

