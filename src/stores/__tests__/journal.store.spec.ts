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
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = { title: 'Test Title', body: 'Test body content' }
      const result = await store.createEntry(payload)

      // Verify the repository was called with the correct payload
      expect(journalDexieRepository.create).toHaveBeenCalledWith(payload)

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
      }

      vi.mocked(journalDexieRepository.create).mockResolvedValue(mockEntry)

      const payload = { body: 'Test body without title' }
      await store.createEntry(payload)

      expect(journalDexieRepository.create).toHaveBeenCalledWith(payload)
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0].title).toBeUndefined()
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
        },
        {
          id: 'entry-2',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          body: 'Second body',
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

  describe('deleteEntry', () => {
    it('removes the entry from entries', async () => {
      const store = useJournalStore()
      const entry1: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'First body',
      }
      const entry2: JournalEntry = {
        id: 'entry-2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        body: 'Second body',
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

  describe('sortedEntries', () => {
    it('returns entries sorted by createdAt descending (newest first)', () => {
      const store = useJournalStore()
      const entry1: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Oldest',
      }
      const entry2: JournalEntry = {
        id: 'entry-2',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        body: 'Middle',
      }
      const entry3: JournalEntry = {
        id: 'entry-3',
        createdAt: '2024-01-03T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        body: 'Newest',
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

