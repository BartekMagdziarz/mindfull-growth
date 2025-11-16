import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'
import EmotionsView from '../EmotionsView.vue'
import type { EmotionLog } from '@/domain/emotionLog'
import { formatEntryDate } from '@/utils/dateFormat'

type EmotionName = { id: string; name: string }
type TagName = { id: string; name: string }

const mockRouterPush = vi.fn()

const createEmotionLogStoreMock = () => {
  const sortedLogsRef = ref<EmotionLog[]>([])
  const isLoadingRef = ref(false)
  const errorRef = ref<string | null>(null)

  const loadLogs = vi.fn().mockResolvedValue(undefined)
  const deleteLog = vi.fn().mockResolvedValue(undefined)

  return {
    get sortedLogs() {
      return sortedLogsRef.value
    },
    set sortedLogs(value: EmotionLog[]) {
      sortedLogsRef.value = value
    },
    get isLoading() {
      return isLoadingRef.value
    },
    set isLoading(value: boolean) {
      isLoadingRef.value = value
    },
    get error() {
      return errorRef.value
    },
    set error(value: string | null) {
      errorRef.value = value
    },
    loadLogs,
    deleteLog,
  }
}

const createEmotionStoreMock = () => {
  const isLoadedRef = ref(false)
  const emotionsMap = new Map<string, EmotionName>()

  const loadEmotions = vi.fn().mockImplementation(async () => {
    isLoadedRef.value = true
  })

  const getEmotionById = vi.fn((id: string) => emotionsMap.get(id))

  const setEmotion = (id: string, name: string) => {
    emotionsMap.set(id, { id, name })
  }

  return {
    get isLoaded() {
      return isLoadedRef.value
    },
    set isLoaded(value: boolean) {
      isLoadedRef.value = value
    },
    loadEmotions,
    getEmotionById,
    _setEmotion: setEmotion,
    _clear: () => emotionsMap.clear(),
  }
}

const createTagStoreMock = () => {
  const peopleTagsRef = ref<TagName[]>([])
  const contextTagsRef = ref<TagName[]>([])
  const errorRef = ref<string | null>(null)

  const loadPeopleTags = vi.fn().mockResolvedValue(undefined)
  const loadContextTags = vi.fn().mockResolvedValue(undefined)

  const getPeopleTagById = vi.fn((id: string) =>
    peopleTagsRef.value.find((tag) => tag.id === id)
  )
  const getContextTagById = vi.fn((id: string) =>
    contextTagsRef.value.find((tag) => tag.id === id)
  )

  return {
    get peopleTags() {
      return peopleTagsRef.value
    },
    set peopleTags(value: TagName[]) {
      peopleTagsRef.value = value
    },
    get contextTags() {
      return contextTagsRef.value
    },
    set contextTags(value: TagName[]) {
      contextTagsRef.value = value
    },
    get error() {
      return errorRef.value
    },
    set error(value: string | null) {
      errorRef.value = value
    },
    loadPeopleTags,
    loadContextTags,
    getPeopleTagById,
    getContextTagById,
  }
}

let mockEmotionLogStore = createEmotionLogStoreMock()
let mockEmotionStore = createEmotionStoreMock()
let mockTagStore = createTagStoreMock()
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

vi.mock('vue-router', () => {
  return {
    useRouter: () => ({
      push: mockRouterPush,
    }),
  }
})

vi.mock('@/stores/emotionLog.store', () => {
  return {
    useEmotionLogStore: vi.fn(() => mockEmotionLogStore),
  }
})

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

vi.mock('@/components/AppDialog.vue', () => {
  return {
    default: defineComponent({
      name: 'AppDialogStub',
      props: {
        modelValue: { type: Boolean, default: false },
        title: { type: String, required: true },
        message: { type: String, required: true },
        confirmText: { type: String, default: 'Confirm' },
        cancelText: { type: String, default: 'Cancel' },
      },
      emits: ['update:modelValue', 'confirm', 'cancel'],
      setup(props, { emit }) {
        const handleConfirm = () => {
          emit('confirm')
          emit('update:modelValue', false)
        }

        const handleCancel = () => {
          emit('cancel')
          emit('update:modelValue', false)
        }

        return () =>
          props.modelValue
            ? h('div', { 'data-testid': 'dialog' }, [
                h('p', props.title),
                h('p', props.message),
                h(
                  'button',
                  { type: 'button', onClick: handleCancel },
                  props.cancelText
                ),
                h(
                  'button',
                  { type: 'button', onClick: handleConfirm },
                  props.confirmText
                ),
              ])
            : null
      },
    }),
  }
})

vi.mock('@/components/AppSnackbar.vue', () => {
  return {
    default: defineComponent({
      name: 'AppSnackbarStub',
      setup(_, { expose }) {
        const message = ref('')
        const visible = ref(false)

        const show = (text: string) => {
          message.value = text
          visible.value = true
        }

        const hide = () => {
          visible.value = false
        }

        expose({ show, hide })

        return () =>
          visible.value
            ? h('div', { 'data-testid': 'snackbar' }, message.value)
            : null
      },
    }),
  }
})

describe('EmotionsView', () => {
  const renderView = async () => {
    const utils = render(EmotionsView, {
      global: {
        stubs: {
          transition: false,
        },
      },
    })

    await waitFor(() => {
      expect(mockEmotionLogStore.loadLogs).toHaveBeenCalled()
    })

    return utils
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRouterPush.mockReset()
    mockEmotionLogStore = createEmotionLogStoreMock()
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  const createLog = (overrides: Partial<EmotionLog> = {}): EmotionLog => {
    return {
      id: 'log-id',
      createdAt: '2024-01-02T10:00:00.000Z',
      updatedAt: '2024-01-02T10:00:00.000Z',
      emotionIds: ['emotion-1'],
      note: 'Sample note',
      ...overrides,
    }
  }

  it('loads all related stores on mount', async () => {
    mockEmotionStore.isLoaded = false
    mockTagStore.peopleTags = []
    mockTagStore.contextTags = []

    await renderView()

    expect(mockEmotionLogStore.loadLogs).toHaveBeenCalledTimes(1)
    expect(mockEmotionStore.loadEmotions).toHaveBeenCalledTimes(1)
    expect(mockTagStore.loadPeopleTags).toHaveBeenCalledTimes(1)
    expect(mockTagStore.loadContextTags).toHaveBeenCalledTimes(1)
  })

  it('renders the primary action button and navigates to create route', async () => {
    await renderView()

    const logEmotionButton = await screen.findByRole('button', {
      name: 'Log emotion',
    })

    await fireEvent.click(logEmotionButton)

    expect(mockRouterPush).toHaveBeenCalledWith('/emotions/edit')
  })

  it('shows a snackbar message when navigation to create route fails', async () => {
    mockRouterPush.mockRejectedValueOnce(new Error('missing route'))

    await renderView()

    const logEmotionButton = await screen.findByRole('button', {
      name: 'Log emotion',
    })

    await fireEvent.click(logEmotionButton)

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Coming soon')
  })

  it('displays an empty state when there are no emotion logs', async () => {
    mockEmotionLogStore.sortedLogs = []

    await renderView()

    expect(
      screen.getByText(/No emotion logs yet\. Tap "Log emotion" to get started\./)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Log emotion' })
    ).toBeInTheDocument()
  })

  it('renders log cards in the order provided by the store', async () => {
    const olderLog = createLog({
      id: 'log-older',
      createdAt: '2024-01-01T08:00:00.000Z',
      updatedAt: '2024-01-01T08:00:00.000Z',
      emotionIds: ['emotion-older'],
    })
    const newerLog = createLog({
      id: 'log-newer',
      createdAt: '2024-02-01T09:30:00.000Z',
      updatedAt: '2024-02-01T09:30:00.000Z',
      emotionIds: ['emotion-newer'],
    })

    mockEmotionLogStore.sortedLogs = [newerLog, olderLog]

    await renderView()

    const deleteButtons = screen.getAllByRole('button', {
      name: /Delete emotion log recorded on/,
    })

    const labels = deleteButtons.map((button) =>
      button.getAttribute('aria-label')
    )

    expect(labels).toEqual([
      `Delete emotion log recorded on ${formatEntryDate(newerLog.createdAt)}`,
      `Delete emotion log recorded on ${formatEntryDate(olderLog.createdAt)}`,
    ])
  })

  it('displays emotions, note, tags, and timestamp for each log', async () => {
    mockEmotionStore._setEmotion('emotion-1', 'Happy')
    mockTagStore.peopleTags = [{ id: 'people-1', name: 'Partner' }]
    mockTagStore.contextTags = [{ id: 'context-1', name: 'Home' }]

    const log = createLog({
      createdAt: '2024-03-01T12:00:00.000Z',
      emotionIds: ['emotion-1'],
      note: 'Feeling balanced.',
      peopleTagIds: ['people-1'],
      contextTagIds: ['context-1'],
    })

    mockEmotionLogStore.sortedLogs = [log]

    await renderView()

    expect(screen.getByText('Happy')).toBeInTheDocument()
    expect(screen.getByText('Feeling balanced.')).toBeInTheDocument()
    expect(screen.getByText('Partner')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(
      screen.getByText(formatEntryDate(log.createdAt))
    ).toBeInTheDocument()
  })

  it('truncates note previews longer than 100 characters', async () => {
    mockEmotionStore._setEmotion('emotion-1', 'Joyful')

    const longNote =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    const log = createLog({
      note: longNote,
    })

    mockEmotionLogStore.sortedLogs = [log]

    await renderView()

    const expectedPreview = `${longNote.slice(0, 100)}...`
    expect(screen.getByText(expectedPreview)).toBeInTheDocument()
  })

  it('skips invalid emotion and tag identifiers without throwing errors', async () => {
    const log = createLog({
      emotionIds: ['invalid-emotion'],
      peopleTagIds: ['invalid-people'],
      contextTagIds: ['invalid-context'],
      note: 'Testing invalid IDs',
    })

    mockEmotionLogStore.sortedLogs = [log]

    const { container } = await renderView()

    expect(screen.getByText('Testing invalid IDs')).toBeInTheDocument()
    expect(container.querySelector('.bg-rose-100')).toBeNull()
    expect(container.querySelector('.bg-blue-100')).toBeNull()
    expect(container.querySelector('.bg-green-100')).toBeNull()
  })

  it('navigates to the edit route when a log card is clicked', async () => {
    const log = createLog({
      id: 'log-to-edit',
      note: 'Click me',
    })

    mockEmotionLogStore.sortedLogs = [log]

    await renderView()

    const noteElement = await screen.findByText('Click me')
    await fireEvent.click(noteElement)

    expect(mockRouterPush).toHaveBeenCalledWith('/emotions/log-to-edit/edit')
  })

  it('shows the delete confirmation dialog when delete is clicked', async () => {
    const log = createLog({
      id: 'log-delete',
    })

    mockEmotionLogStore.sortedLogs = [log]

    await renderView()

    const deleteButton = screen.getByRole('button', {
      name: `Delete emotion log recorded on ${formatEntryDate(log.createdAt)}`,
    })

    await fireEvent.click(deleteButton)

    const dialog = await screen.findByTestId('dialog')
    expect(dialog).toHaveTextContent('Delete Entry')
    expect(dialog).toHaveTextContent(
      'Are you sure you want to delete this entry? This action cannot be undone.'
    )
  })

  it('deletes a log after confirmation and shows a success message', async () => {
    const log = createLog({
      id: 'log-delete-success',
      note: 'Delete me',
    })

    mockEmotionLogStore.sortedLogs = [log]
    mockEmotionLogStore.deleteLog = vi.fn().mockImplementation(async (id) => {
      const remaining = mockEmotionLogStore.sortedLogs.filter(
        (entry) => entry.id !== id
      )
      mockEmotionLogStore.sortedLogs = remaining
    })

    await renderView()

    const deleteButton = screen.getByRole('button', {
      name: `Delete emotion log recorded on ${formatEntryDate(log.createdAt)}`,
    })
    await fireEvent.click(deleteButton)

    const dialog = await screen.findByTestId('dialog')
    const confirmButton = screen.getByRole('button', { name: 'Delete' })
    await fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.deleteLog).toHaveBeenCalledWith(
        'log-delete-success'
      )
    })

    await waitFor(() => {
      expect(screen.queryByText('Delete me')).not.toBeInTheDocument()
    })

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Emotion log deleted successfully.')
  })

  it('cancels deletion without calling the store action', async () => {
    const log = createLog({
      id: 'log-cancel',
      note: 'Keep me',
    })

    mockEmotionLogStore.sortedLogs = [log]

    await renderView()

    const deleteButton = screen.getByRole('button', {
      name: `Delete emotion log recorded on ${formatEntryDate(log.createdAt)}`,
    })
    await fireEvent.click(deleteButton)

    const cancelButton = await screen.findByRole('button', { name: 'Cancel' })
    await fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.deleteLog).not.toHaveBeenCalled()
    })

    expect(screen.getByText('Keep me')).toBeInTheDocument()
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('shows an error snackbar when deletion fails', async () => {
    const log = createLog({
      id: 'log-delete-error',
      note: 'Problematic log',
    })

    mockEmotionLogStore.sortedLogs = [log]
    mockEmotionLogStore.deleteLog = vi
      .fn()
      .mockRejectedValueOnce(new Error('Delete failed'))

    await renderView()

    const deleteButton = screen.getByRole('button', {
      name: `Delete emotion log recorded on ${formatEntryDate(log.createdAt)}`,
    })
    await fireEvent.click(deleteButton)

    const confirmButton = await screen.findByRole('button', { name: 'Delete' })
    await fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.deleteLog).toHaveBeenCalledWith(
        'log-delete-error'
      )
    })

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Delete failed')
    expect(screen.getByText('Problematic log')).toBeInTheDocument()
  })

  it('displays a loading indicator while logs are loading', async () => {
    mockEmotionLogStore.isLoading = true

    await renderView()

    expect(
      screen.getByText('Loading emotion logs...')
    ).toBeInTheDocument()
  })

  it('displays error information and allows retry when loading fails', async () => {
    mockEmotionLogStore.loadLogs = vi.fn().mockResolvedValue(undefined)

    await renderView()

    mockEmotionLogStore.error = 'Database failure'

    await screen.findByText('Unable to load emotion logs')
    expect(
      screen.getByText('Database failure', { selector: 'p' })
    ).toBeInTheDocument()

    mockEmotionLogStore.loadLogs.mockImplementationOnce(async () => {
      mockEmotionLogStore.error = null
    })

    const retryButton = screen.getByRole('button', { name: 'Try again' })
    await fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.loadLogs).toHaveBeenCalledTimes(2)
    })

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Emotion logs reloaded.')
  })

  it('shows a snackbar when the initial load sets an error', async () => {
    mockEmotionLogStore.loadLogs = vi.fn().mockImplementation(async () => {
      mockEmotionLogStore.error = 'Load error'
    })

    await renderView()

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Load error')
  })

  it('shows a snackbar if tag store reports an error', async () => {
    await renderView()

    mockTagStore.error = 'Tag store error'

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Tag store error')
  })

  it('shows a snackbar when navigation to edit route fails', async () => {
    const log = createLog({
      id: 'log-nav-error',
      note: 'Navigate me',
    })

    mockEmotionLogStore.sortedLogs = [log]
    mockRouterPush.mockRejectedValueOnce(new Error('No edit route'))

    await renderView()

    const noteElement = await screen.findByText('Navigate me')
    await fireEvent.click(noteElement)

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Coming soon')
  })
})


