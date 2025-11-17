import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import JournalView from '../JournalView.vue'
import type { JournalEntry } from '@/domain/journal'

// Mock the journal store
const mockStore = {
  sortedEntries: [] as JournalEntry[],
  isLoading: false,
  error: null as string | null,
  loadEntries: vi.fn(),
}

vi.mock('@/stores/journal.store', () => {
  return {
    useJournalStore: vi.fn(() => mockStore),
  }
})

// Create factory functions for emotion store mock
const createEmotionStoreMock = () => {
  const isLoadedRef = ref(false)
  const emotionsMap = new Map<string, { id: string; name: string }>()

  return {
    get isLoaded() {
      return isLoadedRef.value
    },
    set isLoaded(value: boolean) {
      isLoadedRef.value = value
    },
    loadEmotions: vi.fn().mockImplementation(async () => {
      isLoadedRef.value = true
    }),
    getEmotionById: vi.fn((id: string) => {
      return emotionsMap.get(id)
    }),
    // Helper to set emotions for testing
    _setEmotion: (id: string, name: string) => {
      emotionsMap.set(id, { id, name })
    },
  }
}

// Create factory function for tag store mock
const createTagStoreMock = () => {
  const peopleTagsRef = ref<Array<{ id: string; name: string }>>([])
  const contextTagsRef = ref<Array<{ id: string; name: string }>>([])

  return {
    get peopleTags() {
      return peopleTagsRef.value
    },
    set peopleTags(value: Array<{ id: string; name: string }>) {
      peopleTagsRef.value = value
    },
    get contextTags() {
      return contextTagsRef.value
    },
    set contextTags(value: Array<{ id: string; name: string }>) {
      contextTagsRef.value = value
    },
    loadPeopleTags: vi.fn().mockImplementation(async () => {
      // Keep existing tags if any
    }),
    loadContextTags: vi.fn().mockImplementation(async () => {
      // Keep existing tags if any
    }),
    getPeopleTagById: vi.fn((id: string) => {
      return peopleTagsRef.value.find((tag) => tag.id === id)
    }),
    getContextTagById: vi.fn((id: string) => {
      return contextTagsRef.value.find((tag) => tag.id === id)
    }),
  }
}

let mockEmotionStore = createEmotionStoreMock()
let mockTagStore = createTagStoreMock()

vi.mock('@/stores/emotion.store', () => {
  return {
    useEmotionStore: vi.fn(() => mockEmotionStore),
  }
})

vi.mock('@/stores/tag.store', () => {
  return {
    useTagStore: vi.fn(() => mockTagStore),
  }
})

// Mock vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => {
  return {
    useRouter: () => ({
      push: mockPush,
    }),
  }
})

describe('JournalView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStore.sortedEntries = []
    mockStore.isLoading = false
    mockStore.error = null
    // Reset store mocks using factory functions
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
  })

  it('renders three action cards (Free form, Guided, Periodic)', () => {
    render(JournalView)

    // Check for Free form card
    expect(screen.getByText('Free form')).toBeInTheDocument()
    expect(
      screen.getByText('Write freely about what comes to your mind')
    ).toBeInTheDocument()

    // Check for Guided card
    expect(screen.getByText('Guided')).toBeInTheDocument()
    expect(screen.getByText('Follow prompts and questions')).toBeInTheDocument()

    // Check for Periodic card
    expect(screen.getByText('Periodic')).toBeInTheDocument()
    expect(
      screen.getByText('Scheduled reflection moments')
    ).toBeInTheDocument()
  })

  it('shows "No entries yet" empty state when sortedEntries is empty', () => {
    mockStore.sortedEntries = []
    mockStore.isLoading = false
    mockStore.error = null

    render(JournalView)

    expect(screen.getByText('No entries yet')).toBeInTheDocument()
  })

  it('shows list of entry cards when sortedEntries has entries', () => {
    const mockEntries: JournalEntry[] = [
      {
        id: 'entry-1',
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
        title: 'First Entry',
        body: 'First entry body content',
      },
      {
        id: 'entry-2',
        createdAt: '2024-01-02T10:00:00.000Z',
        updatedAt: '2024-01-02T10:00:00.000Z',
        body: 'Second entry body content without title',
      },
    ]

    mockStore.sortedEntries = mockEntries
    mockStore.isLoading = false
    mockStore.error = null

    render(JournalView)

    // Check first entry
    expect(screen.getByText('First Entry')).toBeInTheDocument()
    expect(screen.getByText('First entry body content')).toBeInTheDocument()

    // Check second entry (should show "Untitled entry" for entry without title)
    expect(screen.getByText('Untitled entry')).toBeInTheDocument()
    expect(
      screen.getByText('Second entry body content without title')
    ).toBeInTheDocument()
  })

  it('calls loadEntries on mount', () => {
    render(JournalView)

    expect(mockStore.loadEntries).toHaveBeenCalledOnce()
  })

  describe('Store loading', () => {
    it('loads emotion store if not already loaded', async () => {
      mockEmotionStore.isLoaded = false
      render(JournalView)

      await waitFor(() => {
        expect(mockEmotionStore.loadEmotions).toHaveBeenCalled()
      })
    })

    it('does not load emotion store if already loaded', async () => {
      mockEmotionStore.isLoaded = true
      render(JournalView)

      await waitFor(() => {
        // Wait a bit to ensure loadEmotions is not called
      })

      expect(mockEmotionStore.loadEmotions).not.toHaveBeenCalled()
    })

    it('loads people tags if empty', async () => {
      mockTagStore.peopleTags = []
      render(JournalView)

      await waitFor(() => {
        expect(mockTagStore.loadPeopleTags).toHaveBeenCalled()
      })
    })

    it('does not load people tags if already populated', async () => {
      mockTagStore.peopleTags = [{ id: 'people-1', name: 'Friend' }]
      render(JournalView)

      await waitFor(() => {
        // Wait a bit to ensure loadPeopleTags is not called
      })

      expect(mockTagStore.loadPeopleTags).not.toHaveBeenCalled()
    })

    it('loads context tags if empty', async () => {
      mockTagStore.contextTags = []
      render(JournalView)

      await waitFor(() => {
        expect(mockTagStore.loadContextTags).toHaveBeenCalled()
      })
    })

    it('does not load context tags if already populated', async () => {
      mockTagStore.contextTags = [{ id: 'context-1', name: 'Home' }]
      render(JournalView)

      await waitFor(() => {
        // Wait a bit to ensure loadContextTags is not called
      })

      expect(mockTagStore.loadContextTags).not.toHaveBeenCalled()
    })
  })

  describe('Tag display', () => {
    it('displays emotion chips for entry with emotions', async () => {
      // Set up emotion store
      mockEmotionStore.isLoaded = true
      // Override getEmotionById to return emotions
      mockEmotionStore.getEmotionById = vi.fn((id: string) => {
        if (id === 'emotion-1') return { id: 'emotion-1', name: 'Happy' }
        if (id === 'emotion-2') return { id: 'emotion-2', name: 'Excited' }
        return undefined
      })

      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
          emotionIds: ['emotion-1', 'emotion-2'],
        },
      ]

      mockStore.sortedEntries = mockEntries
      render(JournalView)

      await waitFor(() => {
        expect(screen.getByText('Happy')).toBeInTheDocument()
        expect(screen.getByText('Excited')).toBeInTheDocument()
      })
    })

    it('displays people tag chips for entry with people tags', async () => {
      mockTagStore.peopleTags = [
        { id: 'people-1', name: 'Alice' },
        { id: 'people-2', name: 'Bob' },
      ]

      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
          peopleTagIds: ['people-1', 'people-2'],
        },
      ]

      mockStore.sortedEntries = mockEntries
      render(JournalView)

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()
      })
    })

    it('displays context tag chips for entry with context tags', async () => {
      mockTagStore.contextTags = [
        { id: 'context-1', name: 'Office' },
        { id: 'context-2', name: 'Morning' },
      ]

      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
          contextTagIds: ['context-1', 'context-2'],
        },
      ]

      mockStore.sortedEntries = mockEntries
      render(JournalView)

      await waitFor(() => {
        expect(screen.getByText('Office')).toBeInTheDocument()
        expect(screen.getByText('Morning')).toBeInTheDocument()
      })
    })

    it('displays all tag types with visual distinction', async () => {
      // Set up all stores
      mockEmotionStore.isLoaded = true
      mockEmotionStore.getEmotionById = vi.fn((id: string) => {
        if (id === 'emotion-1') return { id: 'emotion-1', name: 'Happy' }
        return undefined
      })

      mockTagStore.peopleTags = [{ id: 'people-1', name: 'Alice' }]
      mockTagStore.contextTags = [{ id: 'context-1', name: 'Office' }]

      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
          emotionIds: ['emotion-1'],
          peopleTagIds: ['people-1'],
          contextTagIds: ['context-1'],
        },
      ]

      mockStore.sortedEntries = mockEntries
      render(JournalView)

      await waitFor(() => {
        expect(screen.getByText('Happy')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Office')).toBeInTheDocument()
      })

      // Check visual distinction by checking classes
      const happyChip = screen.getByText('Happy').closest('span')
      const aliceChip = screen.getByText('Alice').closest('span')
      const officeChip = screen.getByText('Office').closest('span')

      expect(happyChip?.className).toContain('bg-section-strong')
      expect(aliceChip?.className).toContain('bg-chip')
      expect(officeChip?.className).toContain('bg-primary-soft')
    })

    it('does not show tags section for entry without tags', () => {
      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
        },
      ]

      mockStore.sortedEntries = mockEntries
      render(JournalView)

      // Entry should render but tags section should not
      expect(screen.getByText('Test Entry')).toBeInTheDocument()
      expect(screen.getByText('Test body')).toBeInTheDocument()
    })

    it('skips invalid tag IDs gracefully', async () => {
      mockEmotionStore.isLoaded = true
      mockEmotionStore.getEmotionById = vi.fn(() => undefined)

      mockTagStore.peopleTags = []
      mockTagStore.contextTags = []

      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
          emotionIds: ['invalid-emotion-id'],
          peopleTagIds: ['invalid-people-id'],
          contextTagIds: ['invalid-context-id'],
        },
      ]

      mockStore.sortedEntries = mockEntries
      render(JournalView)

      // Entry should render but no chips should appear
      await waitFor(() => {
        expect(screen.getByText('Test Entry')).toBeInTheDocument()
      })

      // No error should be thrown and entry should still be visible
      expect(screen.getByText('Test body')).toBeInTheDocument()
    })

    it('wraps tags to multiple lines when needed', async () => {
      mockEmotionStore.isLoaded = true
      mockEmotionStore.getEmotionById = vi.fn((id: string) => {
        return { id, name: `Emotion ${id}` }
      })

      const mockEntries: JournalEntry[] = [
        {
          id: 'entry-1',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T10:00:00.000Z',
          title: 'Test Entry',
          body: 'Test body',
          emotionIds: Array.from({ length: 10 }, (_, i) => `emotion-${i}`),
        },
      ]

      mockStore.sortedEntries = mockEntries
      const { container } = render(JournalView)

      await waitFor(() => {
        expect(screen.getByText('Emotion emotion-0')).toBeInTheDocument()
        expect(screen.getByText('Emotion emotion-9')).toBeInTheDocument()
      })

      // Check that flex-wrap is applied
      const tagsContainer = container.querySelector('.flex.flex-wrap')
      expect(tagsContainer).toBeInTheDocument()
    })
  })
})
