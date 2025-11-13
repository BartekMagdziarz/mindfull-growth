import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import JournalEditorView from '../JournalEditorView.vue'

// Mock the journal store
const mockCreateEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockStore = {
  createEntry: mockCreateEntry,
  updateEntry: mockUpdateEntry,
  entries: [],
}

vi.mock('@/stores/journal.store', () => {
  return {
    useJournalStore: vi.fn(() => mockStore),
  }
})

// Mock journalDexieRepository
const mockGetById = vi.fn()
vi.mock('@/repositories/journalDexieRepository', () => {
  return {
    journalDexieRepository: {
      getById: mockGetById,
    },
  }
})

// Mock vue-router
const mockPush = vi.fn()
const mockRoute = {
  params: {},
  path: '/journal/edit',
}

vi.mock('vue-router', () => {
  return {
    useRouter: () => ({
      push: mockPush,
    }),
    useRoute: () => mockRoute,
  }
})

describe('JournalEditorView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRoute.params = {}
    mockRoute.path = '/journal/edit'
  })

  it('calls createEntry with correct payload when Save is clicked with valid data', async () => {
    const mockEntry = {
      id: 'test-id',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      title: 'Test Title',
      body: 'Test body content',
    }
    mockCreateEntry.mockResolvedValue(mockEntry)

    render(JournalEditorView)

    // Fill in the form
    const titleInput = screen.getByLabelText(/title/i)
    const bodyTextarea = screen.getByLabelText(/journal entry/i)

    await fireEvent.update(titleInput, 'Test Title')
    await fireEvent.update(bodyTextarea, 'Test body content')

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    // Wait for async operation
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledWith({
        title: 'Test Title',
        body: 'Test body content',
      })
    })
  })

  it('navigates back to /journal after successful save', async () => {
    const mockEntry = {
      id: 'test-id',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      body: 'Test body content',
    }
    mockCreateEntry.mockResolvedValue(mockEntry)

    render(JournalEditorView)

    // Fill in the body (required)
    const bodyTextarea = screen.getByLabelText(/journal entry/i)
    await fireEvent.update(bodyTextarea, 'Test body content')

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    // Wait for navigation
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/journal')
    })
  })

  it('shows validation error when Save is clicked with empty body', async () => {
    render(JournalEditorView)

    // Don't fill in body, just click Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    // Wait for snackbar to appear with error message
    await waitFor(() => {
      expect(
        screen.getByText('Please enter some content for your journal entry.')
      ).toBeInTheDocument()
    })

    // Verify createEntry was not called
    expect(mockCreateEntry).not.toHaveBeenCalled()
  })

  it('navigates back to /journal when Cancel is clicked without calling createEntry', async () => {
    render(JournalEditorView)

    // Click Cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await fireEvent.click(cancelButton)

    // Verify navigation
    expect(mockPush).toHaveBeenCalledWith('/journal')

    // Verify createEntry was not called
    expect(mockCreateEntry).not.toHaveBeenCalled()
  })

  it('calls createEntry with undefined title when title is empty', async () => {
    const mockEntry = {
      id: 'test-id',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      body: 'Test body content',
    }
    mockCreateEntry.mockResolvedValue(mockEntry)

    render(JournalEditorView)

    // Fill in only body (no title)
    const bodyTextarea = screen.getByLabelText(/journal entry/i)
    await fireEvent.update(bodyTextarea, 'Test body content')

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    // Wait for async operation
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledWith({
        title: undefined,
        body: 'Test body content',
      })
    })
  })
})

