import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
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
})

