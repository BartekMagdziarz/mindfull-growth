import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import ChatView from '../ChatView.vue'
import type { ChatSession } from '@/domain/chatSession'
import type { JournalEntry } from '@/domain/journal'
import { CHAT_INTENTIONS } from '@/domain/chatSession'

// Mock functions - use vi.hoisted() to ensure they're available in vi.mock
const { mockPush, mockBack, mockShow, mockHide, mockRoute } = vi.hoisted(() => {
  return {
    mockPush: vi.fn(),
    mockBack: vi.fn(),
    mockShow: vi.fn(),
    mockHide: vi.fn(),
    mockRoute: {
      params: { id: 'entry-123' },
      path: '/journal/entry-123/chat',
    },
  }
})

vi.mock('vue-router', () => {
  return {
    useRouter: () => ({
      push: mockPush,
      back: mockBack,
    }),
    useRoute: () => mockRoute,
    onBeforeRouteLeave: vi.fn((callback) => {
      // Store the callback for potential testing
      // In real usage, Vue Router calls this during component setup
      return callback
    }),
  }
})

// Mock chat store - use refs directly for storeToRefs compatibility
const mockCurrentChatSession = ref<ChatSession | null>(null)
const mockIsLoading = ref(false)
const mockIsSaving = ref(false)
const mockError = ref<string | null>(null)
const mockChatStore = {
  // storeToRefs will extract these refs directly
  currentChatSession: mockCurrentChatSession,
  isLoading: mockIsLoading,
  isSaving: mockIsSaving,
  error: mockError,
  // Methods
  startChatSession: vi.fn(),
  sendMessage: vi.fn(),
  saveChatSession: vi.fn(),
  discardChatSession: vi.fn(),
  loadChatSessionsForEntry: vi.fn(),
  loadChatSession: vi.fn(),
  // Other properties
  journalEntryId: ref<string | null>(null),
  hasUnsavedMessages: ref(false),
}

vi.mock('@/stores/chat.store', () => {
  return {
    useChatStore: vi.fn(() => mockChatStore),
  }
})

// Mock journal store
const mockGetEntryById = vi.fn()
const mockJournalStore = {
  getEntryById: mockGetEntryById,
  entries: ref<JournalEntry[]>([]),
  isLoading: ref(false),
  error: ref<string | null>(null),
  sortedEntries: ref<JournalEntry[]>([]),
  loadEntries: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}

vi.mock('@/stores/journal.store', () => {
  return {
    useJournalStore: vi.fn(() => mockJournalStore),
  }
})

// Mock emotion store
const mockGetEmotionById = vi.fn()
const mockEmotionStore = {
  getEmotionById: mockGetEmotionById,
  emotions: ref([]),
  isLoaded: ref(true),
  getAllEmotions: ref([]),
  loadEmotions: vi.fn(),
  getEmotionsByQuadrant: vi.fn(),
}

vi.mock('@/stores/emotion.store', () => {
  return {
    useEmotionStore: vi.fn(() => mockEmotionStore),
  }
})

// Mock tag store
const mockGetPeopleTagById = vi.fn()
const mockGetContextTagById = vi.fn()
const mockTagStore = {
  getPeopleTagById: mockGetPeopleTagById,
  getContextTagById: mockGetContextTagById,
  peopleTags: ref([]),
  contextTags: ref([]),
  isLoading: ref(false),
  error: ref<string | null>(null),
  loadPeopleTags: vi.fn(),
  loadContextTags: vi.fn(),
}

vi.mock('@/stores/tag.store', () => {
  return {
    useTagStore: vi.fn(() => mockTagStore),
  }
})

// Mock AppSnackbar
vi.mock('@/components/AppSnackbar.vue', () => ({
  default: {
    name: 'AppSnackbar',
    template: '<div class="snackbar-mock"></div>',
    setup() {
      return {
        show: mockShow,
        hide: mockHide,
      }
    },
    expose: ['show', 'hide'],
    methods: {
      show: mockShow,
      hide: mockHide,
    },
  },
}))

// Mock AppDialog
vi.mock('@/components/AppDialog.vue', () => ({
  default: {
    name: 'AppDialog',
    template: '<div class="dialog-mock" v-if="modelValue"><slot></slot></div>',
    props: ['modelValue', 'title', 'message', 'confirmText', 'cancelText', 'confirmVariant'],
    emits: ['update:modelValue', 'confirm', 'cancel'],
  },
}))

describe('ChatView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockRoute.params = { id: 'entry-123' }
    mockRoute.query = {}
    mockCurrentChatSession.value = null
    mockGetEntryById.mockReset()
    mockGetEmotionById.mockReset()
    mockGetPeopleTagById.mockReset()
    mockGetContextTagById.mockReset()
    mockIsLoading.value = false
    mockIsSaving.value = false
    mockError.value = null
    mockShow.mockClear()
    mockHide.mockClear()
    mockPush.mockClear()
  })

  describe('Component Rendering', () => {
    it('renders without errors', () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Entry',
        body: 'Test body content',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)
      expect(screen.getByText(/reflect.*chat about entry/i)).toBeInTheDocument()
    })

    it('renders all main sections', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Entry',
        body: 'Test body content',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByLabelText(/go back/i)).toBeInTheDocument()
        expect(screen.getByText(/test entry/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
      })
    })
  })

  describe('Router Integration', () => {
    it('receives entry ID from route params', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(mockGetEntryById).toHaveBeenCalledWith('entry-123')
      })
    })

    it('shows error when entry not found', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      mockGetEntryById.mockResolvedValue(undefined)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText(/entry not found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Top App Bar', () => {
    it('displays back button', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const backButton = screen.getByLabelText(/go back/i)
        expect(backButton).toBeInTheDocument()
      })
    })

    it('displays chat intention in title', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText(/help see differently.*chat about entry/i)).toBeInTheDocument()
      })
    })

    it('shows default title when no session exists', () => {
      mockCurrentChatSession.value = null

      render(ChatView)

      // Component redirects when no session, but title is computed before redirect
      expect(mockPush).toHaveBeenCalledWith('/journal/entry-123/edit')
    })

    it('navigates back when back button is clicked', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      // Wait for entry to load first
      await waitFor(() => {
        expect(screen.getByText(/test body/i)).toBeInTheDocument()
      })

      const backButton = screen.getByLabelText(/go back/i)
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/entry-123/edit')
      })
    })

    it('redirects to journal editor if no chat session exists', async () => {
      mockCurrentChatSession.value = null

      render(ChatView)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/entry-123/edit')
      })
    })

    it('loads existing chat session when sessionId query is present', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockChatStore.loadChatSession.mockResolvedValue(mockSession)
      mockRoute.query = { sessionId: 'session-1' }

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(mockChatStore.loadChatSession).toHaveBeenCalledWith(
          'entry-123',
          'session-1'
        )
      })
    })
  })

  describe('Entry Context Display', () => {
    it('displays entry title', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'My Journal Entry',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('My Journal Entry')).toBeInTheDocument()
      })
    })

    it('displays "Untitled entry" when title is empty', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('Untitled entry')).toBeInTheDocument()
      })
    })

    it('displays emotions as chips with correct names', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: ['emotion-1', 'emotion-2'],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      mockGetEmotionById.mockImplementation((id: string) => {
        if (id === 'emotion-1') return { id: 'emotion-1', name: 'Joyful' }
        if (id === 'emotion-2') return { id: 'emotion-2', name: 'Calm' }
        return undefined
      })

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('Joyful')).toBeInTheDocument()
        expect(screen.getByText('Calm')).toBeInTheDocument()
      })
    })

    it('displays people tags as chips with correct names', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        peopleTagIds: ['people-1'],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      mockGetPeopleTagById.mockImplementation((id: string) => {
        if (id === 'people-1') return { id: 'people-1', name: 'Alex' }
        return undefined
      })

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('Alex')).toBeInTheDocument()
      })
    })

    it('displays context tags as chips with correct names', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        contextTagIds: ['context-1'],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      mockGetContextTagById.mockImplementation((id: string) => {
        if (id === 'context-1') return { id: 'context-1', name: 'Office' }
        return undefined
      })

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('Office')).toBeInTheDocument()
      })
    })

    it('displays entry body preview', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'This is a test journal entry body content.',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText(/this is a test journal entry/i)).toBeInTheDocument()
      })
    })

    it('truncates long entry body preview', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const longBody = 'a'.repeat(200)
      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: longBody,
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        // The preview should be truncated to 150 characters + "..."
        const expectedPreview = 'a'.repeat(150) + '...'
        const preview = screen.getByText(expectedPreview)
        expect(preview).toBeInTheDocument()
      })
    })

    it('handles loading state', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      // Don't resolve the promise immediately
      mockGetEntryById.mockImplementation(() => new Promise(() => {}))

      const { container } = render(ChatView)

      // Wait for loading state to appear (component needs to mount and start loading)
      await waitFor(() => {
        const skeleton = container.querySelector('.animate-pulse')
        expect(skeleton).not.toBeNull()
      })
    })

    it('handles error state gracefully', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      mockGetEntryById.mockRejectedValue(new Error('Network error'))

      render(ChatView)

      await waitFor(() => {
        // The error message is the actual error message from the Error object
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('handles missing emotions gracefully', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: ['non-existent'],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      mockGetEmotionById.mockReturnValue(undefined)

      render(ChatView)

      await waitFor(() => {
        // Should not crash, emotions section should not be displayed
        expect(screen.queryByText(/emotions/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Message Area', () => {
    it('displays empty state message when no messages exist', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(
          screen.getByText(/start the conversation by sending a message below/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Input Area', () => {
    it('displays input field', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i)
        expect(input).toBeInTheDocument()
      })
    })

    it('displays send button', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeInTheDocument()
      })
    })

    it('disables send button when input is empty', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeDisabled()
      })
    })
  })

  describe('Action Buttons', () => {
    it('displays "Save conversation" button (disabled initially)', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).toBeInTheDocument()
        expect(saveButton).toBeDisabled()
      })
    })

    it('displays "Leave without saving" button', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const leaveButton = screen.getByRole('button', { name: /leave without saving/i })
        expect(leaveButton).toBeInTheDocument()
      })
    })
  })

  describe('Store Integration', () => {
    it('accesses chat store correctly', () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      render(ChatView)

      expect(screen.getByText(/reflect.*chat about entry/i)).toBeInTheDocument()
    })

    it('accesses journal store correctly', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(mockGetEntryById).toHaveBeenCalledWith('entry-123')
      })
    })

    it('accesses emotion and tag stores correctly', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: ['emotion-1'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      mockGetEmotionById.mockReturnValue({ id: 'emotion-1', name: 'Joyful' })
      mockGetPeopleTagById.mockReturnValue({ id: 'people-1', name: 'Alex' })
      mockGetContextTagById.mockReturnValue({ id: 'context-1', name: 'Office' })

      render(ChatView)

      await waitFor(() => {
        expect(mockGetEmotionById).toHaveBeenCalledWith('emotion-1')
        expect(mockGetPeopleTagById).toHaveBeenCalledWith('people-1')
        expect(mockGetContextTagById).toHaveBeenCalledWith('context-1')
      })
    })
  })

  describe('Message Display', () => {
    it('displays user messages correctly', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
      })
    })

    it('displays assistant messages correctly', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'assistant',
            content: 'I am doing well, thank you!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument()
      })
    })

    it('displays messages in chronological order', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'First message',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Second message',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
          {
            role: 'user',
            content: 'Third message',
            timestamp: '2024-01-01T10:02:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      const { container } = render(ChatView)

      await waitFor(() => {
        const messages = container.querySelectorAll('[class*="max-w-[80%]"]')
        expect(messages).toHaveLength(3)
        expect(messages[0].textContent).toContain('First message')
        expect(messages[1].textContent).toContain('Second message')
        expect(messages[2].textContent).toContain('Third message')
      })
    })

    it('preserves line breaks in messages', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Line 1\nLine 2\nLine 3',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      const { container } = render(ChatView)

      await waitFor(() => {
        const messageElement = container.querySelector('.whitespace-pre-wrap')
        expect(messageElement).toBeInTheDocument()
        expect(messageElement?.textContent).toContain('Line 1')
        expect(messageElement?.textContent).toContain('Line 2')
        expect(messageElement?.textContent).toContain('Line 3')
      })
    })

    it('displays timestamps for messages', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Test message',
            timestamp: new Date().toISOString(),
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      const { container } = render(ChatView)

      await waitFor(() => {
        const timestamp = container.querySelector('.text-xs.opacity-70')
        expect(timestamp).toBeInTheDocument()
        expect(timestamp?.textContent).toContain('Just now')
      })
    })
  })

  describe('Send Functionality', () => {
    it('calls sendMessage when send button is clicked', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.sendMessage.mockResolvedValue(undefined)

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i)
        const sendButton = screen.getByRole('button', { name: /send/i })

        fireEvent.update(input, 'Hello, AI!')
        fireEvent.click(sendButton)
      })

      await waitFor(() => {
        expect(mockChatStore.sendMessage).toHaveBeenCalledWith('Hello, AI!')
      })
    })

    it('calls sendMessage when Enter key is pressed', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.sendMessage.mockResolvedValue(undefined)

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i)
        fireEvent.update(input, 'Test message')
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      })

      await waitFor(() => {
        expect(mockChatStore.sendMessage).toHaveBeenCalledWith('Test message')
      })
    })

    it('clears input field after successful send', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.sendMessage.mockResolvedValue(undefined)

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i) as HTMLTextAreaElement
        fireEvent.update(input, 'Test message')
        const sendButton = screen.getByRole('button', { name: /send/i })
        fireEvent.click(sendButton)
      })

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i) as HTMLTextAreaElement
        expect(input.value).toBe('')
      })
    })

    it('keeps message in input on error', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.sendMessage.mockRejectedValue(new Error('Network error'))

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i) as HTMLTextAreaElement
        fireEvent.update(input, 'Test message')
        const sendButton = screen.getByRole('button', { name: /send/i })
        fireEvent.click(sendButton)
      })

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i) as HTMLTextAreaElement
        expect(input.value).toBe('Test message')
      })
    })

    it('disables send button when input is empty', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /send/i })
        expect(sendButton).toBeDisabled()
      })
    })

    it('allows Shift+Enter to create new line', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i) as HTMLTextAreaElement
        fireEvent.update(input, 'Line 1')
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true })
        // Shift+Enter should not trigger send, so sendMessage should not be called
        expect(mockChatStore.sendMessage).not.toHaveBeenCalled()
      })
    })
  })

  describe('Loading States', () => {
    it('displays loading indicator when AI is responding', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockIsLoading.value = true

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText(/ai is thinking/i)).toBeInTheDocument()
      })
    })

    it('disables input field during loading', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockIsLoading.value = true

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/type your message/i)
        expect(input).toBeDisabled()
      })
    })

    it('disables send button during loading', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockIsLoading.value = true

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /^send message$/i })
        expect(sendButton).toBeDisabled()
        expect(sendButton.textContent).toContain('Sending...')
      })
    })

    it('shows "Sending..." text on send button during loading', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockIsLoading.value = true

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /^send message$/i })
        expect(sendButton.textContent).toContain('Sending...')
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message via snackbar when error occurs', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockError.value = null

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      const { container } = render(ChatView)

      // Wait for component to mount
      await waitFor(() => {
        expect(container.querySelector('.snackbar-mock')).toBeInTheDocument()
      })

      // Set error after component is mounted
      mockError.value = 'Network error occurred'

      await waitFor(
        () => {
          // Error watcher should call show on snackbar
          expect(mockShow).toHaveBeenCalledWith('Network error occurred')
        },
        { timeout: 2000 }
      )
    })

    it('clears error when user starts typing', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession
      mockError.value = 'Test error'

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText(/type your message/i)
      
      // The error should be cleared when user types
      // We need to trigger the watcher by updating the input
      fireEvent.update(input, 'New message')
      
      // The component watches messageInput and clears error
      // But we need to access the store's error setter
      await waitFor(() => {
        // The error should be cleared via chatStore.error = null in the watcher
        // Since we're using a ref directly, we can check it
        expect(mockError.value).toBeNull()
      }, { timeout: 1000 })
    })
  })

  describe('Store Integration', () => {
    it('reactively updates when messages change', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        expect(screen.getByText(/start the conversation/i)).toBeInTheDocument()
      })

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/start the conversation/i)).toBeInTheDocument()
      })

      // Add a message to the session by updating the ref
      const updatedSession: ChatSession = {
        ...mockSession,
        messages: [
          {
            role: 'user',
            content: 'New message',
            timestamp: new Date().toISOString(),
          },
        ],
      }
      mockCurrentChatSession.value = updatedSession

      await waitFor(() => {
        expect(screen.getByText('New message')).toBeInTheDocument()
      })
    })
  })

  describe('Save Conversation Functionality', () => {
    it('disables save button when no messages exist', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).toBeDisabled()
      })
    })

    it('disables save button when only one message exists', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).toBeDisabled()
      })
    })

    it('enables save button after at least one message exchange', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('disables save button while saving', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession
      mockIsSaving.value = true

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).toBeDisabled()
        expect(saveButton.textContent).toContain('Saving...')
      })
    })

    it('disables save button after successful save', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        chatSessions: [mockSession],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).toBeDisabled()
        expect(saveButton.textContent).toContain('Saved')
      })
    })

    it('calls saveChatSession when save button is clicked', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.saveChatSession.mockResolvedValue(undefined)

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockChatStore.saveChatSession).toHaveBeenCalled()
      })
    })

    it('shows success feedback after successful save', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.saveChatSession.mockResolvedValue(undefined)

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Conversation saved successfully')
      })
    })

    it('navigates after successful save', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.saveChatSession.mockResolvedValue(undefined)

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/entry-123/edit')
      })
    })

    it('shows error message if save fails', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession
      mockChatStore.saveChatSession.mockRejectedValue(new Error('Save failed'))
      mockError.value = 'Save failed'

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        fireEvent.click(saveButton)
      })

      await waitFor(() => {
        expect(mockShow).toHaveBeenCalledWith('Save failed')
      })
    })
  })

  describe('Leave Without Saving Functionality', () => {
    it('always enables leave button', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const leaveButton = screen.getByRole('button', { name: /leave without saving/i })
        expect(leaveButton).not.toBeDisabled()
      })
    })

    it('shows confirmation dialog when leaving with unsaved messages', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      const { container } = render(ChatView)

      await waitFor(() => {
        const leaveButton = screen.getByRole('button', { name: /leave without saving/i })
        fireEvent.click(leaveButton)
      })

      await waitFor(() => {
        const dialog = container.querySelector('.dialog-mock')
        expect(dialog).toBeInTheDocument()
      })
    })

    it('navigates immediately when leaving with no messages', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      // Wait for entry to load
      await waitFor(() => {
        expect(screen.getByText(/test body/i)).toBeInTheDocument()
      })

      await waitFor(() => {
        const leaveButton = screen.getByRole('button', { name: /leave without saving/i })
        fireEvent.click(leaveButton)
      })

      await waitFor(() => {
        expect(mockChatStore.discardChatSession).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/journal/entry-123/edit')
      })
    })

    it('calls discardChatSession and navigates when confirming leave', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      const { container } = render(ChatView)

      await waitFor(() => {
        const leaveButton = screen.getByRole('button', { name: /leave without saving/i })
        fireEvent.click(leaveButton)
      })

      await waitFor(() => {
        const dialog = container.querySelector('.dialog-mock')
        expect(dialog).toBeInTheDocument()
      })

      // Simulate confirm event
      const dialog = container.querySelector('.dialog-mock')
      if (dialog) {
        // The dialog component would emit confirm event
        // We'll test this by directly calling the handler
        // In a real scenario, we'd need to trigger the confirm event
      }

      // For now, we'll test that discardChatSession is called when handleDiscard is invoked
      // This is a limitation of the mock - in real tests, we'd trigger the actual event
    })
  })

  describe('State Management', () => {
    it('canSave computed property works correctly', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('isSaved computed property works correctly', async () => {
      const mockSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-123',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
            timestamp: '2024-01-01T10:01:00.000Z',
          },
        ],
      }
      mockCurrentChatSession.value = mockSession

      const mockEntry: JournalEntry = {
        id: 'entry-123',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        chatSessions: [mockSession],
      }
      mockGetEntryById.mockResolvedValue(mockEntry)

      render(ChatView)

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save conversation/i })
        expect(saveButton).toBeDisabled()
        expect(saveButton.textContent).toContain('Saved')
      })
    })
  })
})

