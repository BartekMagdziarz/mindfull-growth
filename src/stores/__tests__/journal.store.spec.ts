import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useJournalStore } from '../journal.store'
import type { JournalEntry } from '@/domain/journal'
import type { JournalRepository } from '@/repositories/journalRepository'

// Mock the repository module
vi.mock('@/repositories/journalDexieRepository', () => {
  const mockRepository: JournalRepository = {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return {
    journalDexieRepository: mockRepository,
  }
})

// Import the mocked repository to access the mock functions
import { journalDexieRepository } from '@/repositories/journalDexieRepository'

describe('useJournalStore', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('createEntry', () => {
    it('sets id, createdAt, and updatedAt and appends the entry to entries', async () => {
      const store = useJournalStore()
      const mockEntry: JournalEntry = {
        id: 'test-id-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body content',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = { title: 'Test Title', body: 'Test body content' }
      const result = await store.createEntry(payload)

      // Verify the repository was called with the payload including default empty arrays
      expect(journalDexieRepository.create).toHaveBeenCalledWith({
        title: 'Test Title',
        body: 'Test body content',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })

      // Verify the returned entry has id, createdAt, and updatedAt
      expect(result.id).toBe('test-id-123')
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(result.updatedAt).toBe('2024-01-01T00:00:00.000Z')
      expect(result.title).toBe('Test Title')
      expect(result.body).toBe('Test body content')

      // Verify the entry was appended to entries
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0]).toEqual(mockEntry)
    })

    it('creates entry without title when title is not provided', async () => {
      const store = useJournalStore()
      const mockEntry: JournalEntry = {
        id: 'test-id-456',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        body: 'Test body without title',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = { body: 'Test body without title' }
      await store.createEntry(payload)

      expect(journalDexieRepository.create).toHaveBeenCalledWith({
        body: 'Test body without title',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].title).toBeUndefined()
    })

    it('creates entry with all tagging fields', async () => {
      const store = useJournalStore()
      const mockEntry: JournalEntry = {
        id: 'test-id-789',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        title: 'Entry with Tags',
        body: 'Test body with tags',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1', 'context-2'],
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = {
        title: 'Entry with Tags',
        body: 'Test body with tags',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1', 'context-2'],
      }
      const result = await store.createEntry(payload)

      // Verify the repository was called with all tagging fields
      expect(journalDexieRepository.create).toHaveBeenCalledWith({
        title: 'Entry with Tags',
        body: 'Test body with tags',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1', 'context-2'],
      })

      // Verify the returned entry has all tagging fields
      expect(result.emotionIds).toEqual(['emotion-1', 'emotion-2'])
      expect(result.peopleTagIds).toEqual(['people-1'])
      expect(result.contextTagIds).toEqual(['context-1', 'context-2'])

      // Verify the entry was appended to entries
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].emotionIds).toEqual(['emotion-1', 'emotion-2'])
    })

    it('creates entry without tagging fields and defaults them to empty arrays', async () => {
      const store = useJournalStore()
      const mockEntry: JournalEntry = {
        id: 'test-id-101',
        createdAt: '2024-01-04T00:00:00.000Z',
        updatedAt: '2024-01-04T00:00:00.000Z',
        title: 'Entry without Tags',
        body: 'Test body without tags',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = { title: 'Entry without Tags', body: 'Test body without tags' }
      const result = await store.createEntry(payload)

      // Verify the repository was called with empty arrays for tagging fields
      expect(journalDexieRepository.create).toHaveBeenCalledWith({
        title: 'Entry without Tags',
        body: 'Test body without tags',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })

      // Verify the returned entry has empty arrays
      expect(result.emotionIds).toEqual([])
      expect(result.peopleTagIds).toEqual([])
      expect(result.contextTagIds).toEqual([])

      // Verify the entry was appended to entries
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].emotionIds).toEqual([])
    })

    it('creates entry with partial tagging fields and defaults missing fields to empty arrays', async () => {
      const store = useJournalStore()
      const mockEntry: JournalEntry = {
        id: 'test-id-102',
        createdAt: '2024-01-05T00:00:00.000Z',
        updatedAt: '2024-01-05T00:00:00.000Z',
        body: 'Test body with partial tags',
        emotionIds: ['emotion-1'],
        peopleTagIds: [],
        contextTagIds: [],
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = {
        body: 'Test body with partial tags',
        emotionIds: ['emotion-1'],
      }
      const result = await store.createEntry(payload)

      // Verify the repository was called with emotionIds and empty arrays for missing fields
      expect(journalDexieRepository.create).toHaveBeenCalledWith({
        body: 'Test body with partial tags',
        emotionIds: ['emotion-1'],
        peopleTagIds: [],
        contextTagIds: [],
      })

      // Verify the returned entry has emotionIds and empty arrays for other fields
      expect(result.emotionIds).toEqual(['emotion-1'])
      expect(result.peopleTagIds).toEqual([])
      expect(result.contextTagIds).toEqual([])
    })
  })

  describe('loadEntries', () => {
    it('populates entries based on data returned from the repository', async () => {
      const store = useJournalStore()
      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          title: 'First Entry',
          body: 'First body',
          emotionIds: [],
          peopleTagIds: [],
          contextTagIds: [],
        },
        {
          id: 'entry-2',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          body: 'Second body',
          emotionIds: [],
          peopleTagIds: [],
          contextTagIds: [],
        },
      ]

      vi.mocked(journalDexieRepository.getAll).mockResolvedValue(mockEntries)

      expect(store.isLoading).toBe(false)
      expect(store.entries).toHaveLength(0)

      await store.loadEntries()

      // Verify loading state was set correctly
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()

      // Verify entries were populated
      expect(store.entries).toHaveLength(2)
      expect(store.entries).toEqual(mockEntries)
      expect(journalDexieRepository.getAll).toHaveBeenCalledOnce()
    })

    it('loads entries with tagging fields', async () => {
      const store = useJournalStore()
      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          title: 'Entry with Tags',
          body: 'First body',
          emotionIds: ['emotion-1', 'emotion-2'],
          peopleTagIds: ['people-1'],
          contextTagIds: ['context-1'],
        },
        {
          id: 'entry-2',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          body: 'Entry without tags',
          emotionIds: [],
          peopleTagIds: [],
          contextTagIds: [],
        },
      ]

      vi.mocked(journalDexieRepository.getAll).mockResolvedValue(mockEntries)

      await store.loadEntries()

      // Verify entries were loaded with tagging fields
      expect(store.entries).toHaveLength(2)
      expect(store.entries[0].emotionIds).toEqual(['emotion-1', 'emotion-2'])
      expect(store.entries[0].peopleTagIds).toEqual(['people-1'])
      expect(store.entries[0].contextTagIds).toEqual(['context-1'])
      expect(store.entries[1].emotionIds).toEqual([])
      expect(store.entries[1].peopleTagIds).toEqual([])
      expect(store.entries[1].contextTagIds).toEqual([])
    })

    it('sets error state when repository fails', async () => {
      const store = useJournalStore()
      const errorMessage = 'Database error'

      vi.mocked(journalDexieRepository.getAll).mockRejectedValue(
        new Error(errorMessage)
      )

      await store.loadEntries()

      expect(store.isLoading).toBe(false)
      expect(store.error).toBe(errorMessage)
      expect(store.entries).toHaveLength(0)
    })

    it('sets isLoading to true during loading and false after', async () => {
      const store = useJournalStore()
      const mockEntries: JournalEntry[] = []

      // Create a promise that we can control
      let resolvePromise: (value: JournalEntry[]) => void
      const controlledPromise = new Promise<JournalEntry[]>((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(journalDexieRepository.getAll).mockReturnValue(controlledPromise)

      const loadPromise = store.loadEntries()

      // Check that isLoading is true while loading
      expect(store.isLoading).toBe(true)

      // Resolve the promise
      resolvePromise!(mockEntries)
      await loadPromise

      // Check that isLoading is false after loading
      expect(store.isLoading).toBe(false)
    })
  })

  describe('updateEntry', () => {
    it('updates entry with tagging fields', async () => {
      const store = useJournalStore()
      const originalEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Original Title',
        body: 'Original body',
        emotionIds: ['emotion-1'],
        peopleTagIds: [],
        contextTagIds: [],
      }

      const updatedEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        title: 'Updated Title',
        body: 'Updated body',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      // Pre-populate entries
      store.entries = [originalEntry]

      vi.mocked(journalDexieRepository.update).mockResolvedValue(updatedEntry)

      const result = await store.updateEntry(updatedEntry)

      // Verify the repository was called with the updated entry
      expect(journalDexieRepository.update).toHaveBeenCalledWith(updatedEntry)

      // Verify the entry in the store was updated
      expect(store.entries[0].emotionIds).toEqual(['emotion-1', 'emotion-2'])
      expect(store.entries[0].peopleTagIds).toEqual(['people-1'])
      expect(store.entries[0].contextTagIds).toEqual(['context-1'])
      expect(result.emotionIds).toEqual(['emotion-1', 'emotion-2'])
    })

    it('updates entry to remove tags', async () => {
      const store = useJournalStore()
      const originalEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Entry with Tags',
        body: 'Body with tags',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      const updatedEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        title: 'Entry without Tags',
        body: 'Body without tags',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      // Pre-populate entries
      store.entries = [originalEntry]

      vi.mocked(journalDexieRepository.update).mockResolvedValue(updatedEntry)

      const result = await store.updateEntry(updatedEntry)

      // Verify the repository was called with empty arrays
      expect(journalDexieRepository.update).toHaveBeenCalledWith(updatedEntry)

      // Verify the entry in the store has empty arrays
      expect(store.entries[0].emotionIds).toEqual([])
      expect(store.entries[0].peopleTagIds).toEqual([])
      expect(store.entries[0].contextTagIds).toEqual([])
      expect(result.emotionIds).toEqual([])
    })
  })

  describe('deleteEntry', () => {
    it('removes the entry from entries', async () => {
      const store = useJournalStore()
      const entry1: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'First body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }
      const entry2: JournalEntry = {
        id: 'entry-2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        body: 'Second body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      // Pre-populate entries
      store.entries = [entry1, entry2]

      vi.mocked(journalDexieRepository.delete).mockResolvedValue(undefined)

      await store.deleteEntry('entry-1')

      // Verify the repository was called
      expect(journalDexieRepository.delete).toHaveBeenCalledWith('entry-1')

      // Verify the entry was removed from entries
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].id).toBe('entry-2')
    })

    it('does not remove entry if repository delete fails', async () => {
      const store = useJournalStore()
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      store.entries = [entry]

      vi.mocked(journalDexieRepository.delete).mockRejectedValue(
        new Error('Delete failed')
      )

      // Expect the error to be thrown
      await expect(store.deleteEntry('entry-1')).rejects.toThrow('Delete failed')

      // Verify the entry was not removed
      expect(store.entries).toHaveLength(1)
      expect(store.error).toBe('Delete failed')
    })
  })

  describe('tag persistence', () => {
    it('preserves tag IDs through create/update/load cycle', async () => {
      const store = useJournalStore()

      // Create entry with tags
      const createdEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Entry with Tags',
        body: 'Test body',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(createdEntry)

      const createPayload = {
        title: 'Entry with Tags',
        body: 'Test body',
        emotionIds: ['emotion-1', 'emotion-2'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      const created = await store.createEntry(createPayload)

      // Verify tags are present after creation
      expect(created.emotionIds).toEqual(['emotion-1', 'emotion-2'])
      expect(created.peopleTagIds).toEqual(['people-1'])
      expect(created.contextTagIds).toEqual(['context-1'])

      // Update entry with new tags
      const updatedEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        title: 'Entry with Updated Tags',
        body: 'Updated body',
        emotionIds: ['emotion-3'],
        peopleTagIds: ['people-2', 'people-3'],
        contextTagIds: ['context-2'],
      }

      vi.mocked(journalDexieRepository.update).mockResolvedValue(updatedEntry)

      const updated = await store.updateEntry(updatedEntry)

      // Verify new tags are present after update
      expect(updated.emotionIds).toEqual(['emotion-3'])
      expect(updated.peopleTagIds).toEqual(['people-2', 'people-3'])
      expect(updated.contextTagIds).toEqual(['context-2'])

      // Load entries and verify tags are preserved
      vi.mocked(journalDexieRepository.getAll).mockResolvedValue([updatedEntry])

      await store.loadEntries()

      // Verify tags are present after load
      expect(store.entries[0].emotionIds).toEqual(['emotion-3'])
      expect(store.entries[0].peopleTagIds).toEqual(['people-2', 'people-3'])
      expect(store.entries[0].contextTagIds).toEqual(['context-2'])
    })
  })

  describe('sortedEntries', () => {
    it('returns entries sorted by createdAt descending (newest first)', () => {
      const store = useJournalStore()
      const entry1: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Oldest',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }
      const entry2: JournalEntry = {
        id: 'entry-2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        body: 'Middle',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }
      const entry3: JournalEntry = {
        id: 'entry-3',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        body: 'Newest',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      // Add entries in non-chronological order
      store.entries = [entry2, entry1, entry3]

      // Verify sortedEntries returns them in descending order (newest first)
      expect(store.sortedEntries).toHaveLength(3)
      expect(store.sortedEntries[0].id).toBe('entry-3') // Newest
      expect(store.sortedEntries[1].id).toBe('entry-2') // Middle
      expect(store.sortedEntries[2].id).toBe('entry-1') // Oldest
    })
  })
})

