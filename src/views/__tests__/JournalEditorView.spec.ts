import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref, toRefs } from 'vue'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

type StubSelection = { emotionId: string; intensity?: number }

const EmotionWheelStub = defineComponent({
  name: 'EmotionWheelStub',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    label: {
      type: String,
      default: undefined,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { modelValue } = toRefs(props)
    const selectEmotion = () => {
      emit('update:modelValue', [
        ...(modelValue.value as StubSelection[]),
        { emotionId: 'gniew', intensity: 3 },
      ])
    }
    const formatted = () =>
      (modelValue.value as StubSelection[])
        .map(s => s.emotionId + (s.intensity != null ? ':' + s.intensity : ''))
        .join(',')
    return { selectEmotion, formatted }
  },
  template: `
    <div data-testid="emotion-selector-stub">
      <button data-testid="add-emotion" type="button" @click="selectEmotion">
        Add Emotion
      </button>
      <span data-testid="emotion-values">{{ formatted() }}</span>
    </div>
  `,
})

const TagInputStub = defineComponent({
  name: 'TagInputStub',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    tagType: {
      type: String,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { modelValue, tagType } = toRefs(props)
    const selectTag = () => {
      const id = tagType.value === 'people' ? 'people-tag-friend' : 'context-tag-home'
      emit('update:modelValue', [...modelValue.value, id])
    }
    return {
      selectTag,
      tagKind: tagType,
      selectedTagIds: modelValue,
    }
  },
  template: `
    <div :data-testid="tagKind + '-tag-stub'">
      <button
        :data-testid="tagKind + '-tag-button'"
        type="button"
        @click="selectTag"
      >
        Select {{ tagKind }}
      </button>
      <span :data-testid="tagKind + '-tag-values'">{{ selectedTagIds.join(',') }}</span>
    </div>
  `,
})

const ChatSessionCardStub = defineComponent({
  name: 'ChatSessionCardStub',
  props: {
    chatSession: {
      type: Object,
      required: true,
    },
  },
  emits: ['view', 'delete'],
  template: `
    <div data-testid="chat-session-card-stub">
      <div>{{ chatSession.intention }}</div>
      <button
        type="button"
        aria-label="View chat session"
        @click="$emit('view')"
      >
        View
      </button>
      <button
        type="button"
        aria-label="Delete chat session"
        @click="$emit('delete')"
      >
        Delete
      </button>
    </div>
  `,
})

const AppDialogStub = defineComponent({
  name: 'AppDialogStub',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    confirmText: {
      type: String,
      default: 'Confirm',
    },
    cancelText: {
      type: String,
      default: 'Cancel',
    },
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  template: `
    <div v-if="modelValue" role="dialog">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <slot />
      <button type="button" @click="$emit('cancel')">
        {{ cancelText }}
      </button>
      <button type="button" @click="$emit('confirm')">
        {{ confirmText }}
      </button>
    </div>
  `,
})

// Mock the journal store
const mockCreateEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockGetEntryById = vi.fn()
const mockStore = {
  createEntry: mockCreateEntry,
  updateEntry: mockUpdateEntry,
  getEntryById: mockGetEntryById,
  entries: [] as any[],
}

vi.mock('@/stores/journal.store', () => {
  return {
    useJournalStore: vi.fn(() => mockStore),
  }
})

const createEmotionStoreMock = () => {
  const isLoadedRef = ref(false)
  const emotions = ref([
    { id: 'emotion-joy', name: 'Joyful' },
    { id: 'emotion-calm', name: 'Calm' },
  ])
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
    getEmotionById: vi.fn((id: string) => emotions.value.find(e => e.id === id)),
  }
}

const createTagStoreMock = () => {
  const peopleTagsRef = ref<Array<{ id: string; name: string }>>([])
  const contextTagsRef = ref<Array<{ id: string; name: string }>>([])
  const errorRef = ref<string | null>(null)

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
    get error() {
      return errorRef.value
    },
    set error(value: string | null) {
      errorRef.value = value
    },
    loadPeopleTags: vi.fn().mockImplementation(async () => {
      peopleTagsRef.value = [{ id: 'people-default', name: 'Alex' }]
      errorRef.value = null
    }),
    loadContextTags: vi.fn().mockImplementation(async () => {
      contextTagsRef.value = [{ id: 'context-default', name: 'Office' }]
      errorRef.value = null
    }),
    getPeopleTagById: vi.fn((id: string) => peopleTagsRef.value.find(tag => tag.id === id)),
    getContextTagById: vi.fn((id: string) => contextTagsRef.value.find(tag => tag.id === id)),
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

// Mock the chat store
const mockStartChatSession = vi.fn()
const mockDeleteChatSession = vi.fn()
const mockChatStore = {
  startChatSession: mockStartChatSession,
  deleteChatSession: mockDeleteChatSession,
}

vi.mock('@/stores/chat.store', () => {
  return {
    useChatStore: vi.fn(() => mockChatStore),
  }
})

import JournalEditorView from '../JournalEditorView.vue'

// The AI section hosts the separate-chat entry in the panel's `intro` slot.
const CompanionPanelStub = defineComponent({
  name: 'CompanionPanelStub',
  setup(_, { expose }) {
    expose({ cancel: () => {} })
  },
  template: `<div data-testid="companion-stub"><slot name="intro" /></div>`,
})

const renderEditor = () =>
  render(JournalEditorView, {
    global: {
      stubs: {
        EmotionGroupPicker: EmotionWheelStub,
        TagInput: TagInputStub,
        ChatSessionCard: ChatSessionCardStub,
        AppDialog: AppDialogStub,
        ReflectionCompanionPanel: CompanionPanelStub,
      },
    },
  })

/** Switches the side panel to AI and returns the separate-chat button. */
const openAiSection = async () => {
  await fireEvent.click(await screen.findByRole('button', { name: 'AI' }))
  return await screen.findByRole('button', { name: /start chat about this entry/i })
}

// Mock journalDexieRepository
const mockGetById = vi.hoisted(() => vi.fn())
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
  query: {} as Record<string, string>,
}

type LeaveGuard = (to: { fullPath: string }) => boolean
let leaveGuard: LeaveGuard | null = null

vi.mock('vue-router', () => {
  return {
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(async location => {
        mockRoute.query = location.query ?? {}
      }),
    }),
    useRoute: () => mockRoute,
    onBeforeRouteLeave: (guard: LeaveGuard) => {
      leaveGuard = guard
    },
  }
})

describe('JournalEditorView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useUserPreferencesStore().$patch({ locale: 'en', isLoaded: true })
    vi.clearAllMocks()
    mockGetById.mockReset()
    mockGetEntryById.mockReset()
    mockGetEntryById.mockImplementation(async (id: string) => {
      return mockStore.entries.find(e => e.id === id) || null
    })
    mockRoute.params = {}
    mockRoute.path = '/journal/edit'
    mockRoute.query = {}
    mockStore.entries = []
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
    mockStartChatSession.mockResolvedValue(undefined)
    mockDeleteChatSession.mockResolvedValue(undefined)
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

    renderEditor()

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
        companionConversationId: expect.stringMatching(/^journal:/),
        title: 'Test Title',
        body: 'Test body content',
        emotionIds: [],
        emotionFamilyIds: [],
        emotions: [],
        peopleTagIds: [],
        contextTagIds: [],
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

    renderEditor()

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
    renderEditor()

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

  describe('leaving with unsaved changes', () => {
    it('lets the route change when nothing was written', async () => {
      renderEditor()
      await screen.findByRole('button', { name: 'AI' })

      expect(leaveGuard).not.toBeNull()
      expect(leaveGuard!({ fullPath: '/history?type=journal' })).toBe(true)
    })

    it('asks before leaving and continues after "Keep draft"', async () => {
      renderEditor()
      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Half-written thought')

      expect(leaveGuard!({ fullPath: '/history?type=journal' })).toBe(false)
      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('Unsaved changes')).toBeInTheDocument()

      await fireEvent.click(within(dialog).getByRole('button', { name: 'Keep draft' }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/history?type=journal')
      })
      expect(mockCreateEntry).not.toHaveBeenCalled()
    })

    it('stays on the editor after "Back to writing"', async () => {
      renderEditor()
      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Half-written thought')

      expect(leaveGuard!({ fullPath: '/history?type=journal' })).toBe(false)
      const dialog = await screen.findByRole('dialog')
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Back to writing' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('discards the draft and leaves after "Discard draft"', async () => {
      renderEditor()
      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Half-written thought')

      expect(leaveGuard!({ fullPath: '/history?type=journal' })).toBe(false)
      const dialog = await screen.findByRole('dialog')
      await fireEvent.click(within(dialog).getByRole('button', { name: 'Discard draft' }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/history?type=journal')
      })
      expect(mockCreateEntry).not.toHaveBeenCalled()
    })
  })

  it('calls createEntry with undefined title when title is empty', async () => {
    const mockEntry = {
      id: 'test-id',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      body: 'Test body content',
    }
    mockCreateEntry.mockResolvedValue(mockEntry)

    renderEditor()

    // Fill in only body (no title)
    const bodyTextarea = screen.getByLabelText(/journal entry/i)
    await fireEvent.update(bodyTextarea, 'Test body content')

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    // Wait for async operation
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledWith({
        companionConversationId: expect.stringMatching(/^journal:/),
        title: undefined,
        body: 'Test body content',
        emotionIds: [],
        emotionFamilyIds: [],
        emotions: [],
        peopleTagIds: [],
        contextTagIds: [],
      })
    })
  })

  it('prefills body from guided prompt query in create mode', async () => {
    mockRoute.query = {
      promptSeed: encodeURIComponent('Morning intention\\n\\nWhat matters most today?'),
    }

    renderEditor()

    const bodyTextarea = await screen.findByLabelText(/journal entry/i)
    expect((bodyTextarea as HTMLTextAreaElement).value).toContain('Morning intention')
    expect((bodyTextarea as HTMLTextAreaElement).value).toContain('What matters most today?')
  })

  it('loads supporting data and saves selected tags/emotions in create mode', async () => {
    const mockEntry = {
      id: 'test-id',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      body: 'Test body content',
    }
    mockCreateEntry.mockResolvedValue(mockEntry)

    renderEditor()

    await waitFor(() => {
      expect(mockEmotionStore.loadEmotions).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockTagStore.loadPeopleTags).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockTagStore.loadContextTags).toHaveBeenCalled()
    })

    const bodyTextarea = screen.getByLabelText(/journal entry/i)
    await fireEvent.update(bodyTextarea, 'Filled body')

    await fireEvent.click(screen.getByTestId('add-emotion'))
    await fireEvent.click(screen.getByTestId('people-tag-button'))
    await fireEvent.click(screen.getByTestId('context-tag-button'))

    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledWith({
        companionConversationId: expect.stringMatching(/^journal:/),
        title: undefined,
        body: 'Filled body',
        emotionIds: [],
        emotionFamilyIds: ['gniew'],
        emotions: [{ emotionId: 'gniew', intensity: 3 }],
        peopleTagIds: ['people-tag-friend'],
        contextTagIds: ['context-tag-home'],
      })
    })
  })

  it('pre-populates selections in edit mode and passes them to updateEntry', async () => {
    // Opanowany = podpowiedź poziomu 2 promienia „Spokój" — sprawdza adapter historii
    const existingEntry = {
      id: 'entry-123',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
      title: 'Existing',
      body: 'Existing body',
      emotionIds: ['e7m7-calm-067'],
      peopleTagIds: ['people-colleague'],
      contextTagIds: ['context-office'],
    }
    mockStore.entries = [existingEntry]
    mockRoute.params = { id: 'entry-123' }

    renderEditor()

    const bodyTextarea = await screen.findByLabelText(/journal entry/i)
    await fireEvent.update(bodyTextarea, 'Updated body content')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledWith({
        companionConversationId: 'journal:entry-123',
        ...existingEntry,
        title: 'Existing',
        body: 'Updated body content',
        emotionIds: [],
        emotionFamilyIds: ['spokoj-i-wyciszenie'],
        emotions: [{ emotionId: 'spokoj-i-wyciszenie', intensity: 2 }],
        peopleTagIds: ['people-colleague'],
        contextTagIds: ['context-office'],
      })
    })
  })

  describe('Chat Button', () => {
    it('renders the separate-chat entry in the AI section only', async () => {
      renderEditor()
      await screen.findByRole('button', { name: 'AI' })
      expect(
        screen.queryByRole('button', { name: /start chat about this entry/i })
      ).not.toBeInTheDocument()

      const chatButton = await openAiSection()
      expect(chatButton).toBeInTheDocument()
      expect(chatButton).toHaveTextContent('Talk in a separate chat')
    })

    it('disables Chat button when body is empty', async () => {
      renderEditor()

      const chatButton = await openAiSection()
      expect(chatButton).toBeDisabled()
    })

    it('disables Chat button when entry is being saved', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEntry), 100))
      )

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      const saveButton = screen.getByRole('button', { name: /save/i })

      // Initially enabled
      expect(chatButton).not.toBeDisabled()

      // Click save to start saving
      await fireEvent.click(saveButton)

      // Chat button should be disabled while saving
      await waitFor(() => {
        expect(chatButton).toBeDisabled()
      })
    })

    it('enables Chat button when body has content and not saving', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body content')

      const chatButton = await openAiSection()
      expect(chatButton).not.toBeDisabled()
    })

    it('shows "Starting..." text when starting chat', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEntry), 100))
      )

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()

      // Click chat button to open dropdown
      await fireEvent.click(chatButton)

      // Select an intention (non-custom)
      const reflectOption = await screen.findByText('Reflect')
      await fireEvent.click(reflectOption)

      // Button should show "Starting..." during operation
      await waitFor(() => {
        expect(chatButton).toHaveTextContent('Starting...')
      })
    })
  })

  describe('Chat Dropdown Menu', () => {
    it('opens dropdown when Chat button is clicked', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      // Dropdown should show all intention options
      await waitFor(() => {
        expect(screen.getByText('Reflect')).toBeInTheDocument()
        expect(screen.getByText('Help see differently')).toBeInTheDocument()
        expect(screen.getByText('Help to be proactive')).toBeInTheDocument()
        expect(screen.getByText('Thinking traps')).toBeInTheDocument()
        expect(screen.getByText('Custom')).toBeInTheDocument()
      })
    })

    it('keeps each intention description as the chip title', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      await waitFor(() => {
        expect(screen.getByText('Reflect')).toHaveAttribute(
          'title',
          'Explore deeper meanings and patterns'
        )
        expect(screen.getByText('Custom')).toHaveAttribute('title', 'Use your own prompt')
      })
    })

    it('closes dropdown when pressing Escape', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      await waitFor(() => {
        expect(screen.getByText('Reflect')).toBeInTheDocument()
      })

      // Press Escape
      await fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByText('Reflect')).not.toBeInTheDocument()
      })
    })
  })

  describe('Intention Selection', () => {
    it('closes dropdown and starts chat when selecting non-custom intention', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockResolvedValue(mockEntry)

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const reflectOption = await screen.findByText('Reflect')
      await fireEvent.click(reflectOption)

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Reflect')).not.toBeInTheDocument()
      })

      // Entry should be saved
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled()
      })

      // Chat session should be started
      await waitFor(() => {
        expect(mockStartChatSession).toHaveBeenCalledWith('test-id', 'reflect', undefined)
      })

      // Should navigate to chat view
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/test-id/chat')
      })
    })

    it('opens custom prompt dialog when selecting Custom intention', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Custom')).not.toBeInTheDocument()
      })

      // Custom prompt dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Custom Chat Prompt')).toBeInTheDocument()
      })
    })
  })

  describe('Custom Prompt Dialog', () => {
    it('appears when Custom intention is selected', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      await waitFor(() => {
        expect(screen.getByText('Custom Chat Prompt')).toBeInTheDocument()
        expect(
          screen.getByPlaceholderText(/help me understand why i feel anxious about this situation/i)
        ).toBeInTheDocument()
      })
    })

    it('has textarea for custom prompt input', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      const dialog = await screen.findByRole('dialog')
      const textarea = within(dialog).getByPlaceholderText(
        /help me understand why i feel anxious about this situation/i
      )
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('disables Start Chat button when custom prompt is empty', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      const dialog = await screen.findByRole('dialog')
      const startChatButton = within(dialog).getByRole('button', { name: /start chat/i })
      expect(startChatButton).toBeDisabled()
    })

    it('enables Start Chat button when custom prompt has content', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      const dialog = await screen.findByRole('dialog')
      const textarea = within(dialog).getByPlaceholderText(
        /help me understand why i feel anxious about this situation/i
      )
      await fireEvent.update(textarea, 'My custom prompt')

      const startChatButton = within(dialog).getByRole('button', { name: /start chat/i })
      expect(startChatButton).not.toBeDisabled()
    })

    it('closes dialog when Cancel is clicked', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      const dialog = await screen.findByRole('dialog')
      await waitFor(() => {
        expect(within(dialog).getByText('Custom Chat Prompt')).toBeInTheDocument()
      })

      const cancelButton = within(dialog).getByRole('button', { name: /cancel/i })
      await fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Custom Chat Prompt')).not.toBeInTheDocument()
      })

      // Should not start chat
      expect(mockStartChatSession).not.toHaveBeenCalled()
    })

    it('starts chat with custom prompt when Start Chat is clicked', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockResolvedValue(mockEntry)

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      const dialog = await screen.findByRole('dialog')
      const textarea = within(dialog).getByPlaceholderText(
        /help me understand why i feel anxious about this situation/i
      )
      await fireEvent.update(textarea, 'My custom prompt')

      const startChatButton = within(dialog).getByRole('button', { name: /start chat/i })
      await fireEvent.click(startChatButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Custom Chat Prompt')).not.toBeInTheDocument()
      })

      // Entry should be saved
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled()
      })

      // Chat session should be started with custom prompt
      await waitFor(() => {
        expect(mockStartChatSession).toHaveBeenCalledWith('test-id', 'custom', 'My custom prompt')
      })

      // Should navigate to chat view
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/test-id/chat')
      })
    })

    it('closes dialog when pressing Escape', async () => {
      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      await waitFor(() => {
        expect(screen.getByText('Custom Chat Prompt')).toBeInTheDocument()
      })

      // Press Escape
      await fireEvent.keyDown(document, { key: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByText('Custom Chat Prompt')).not.toBeInTheDocument()
      })
    })
  })

  describe('Save-and-Navigate Flow', () => {
    it('saves entry first in create mode before navigating', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockResolvedValue(mockEntry)

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const reflectOption = await screen.findByText('Reflect')
      await fireEvent.click(reflectOption)

      // Entry should be saved first
      await waitFor(() => {
        expect(mockCreateEntry).toHaveBeenCalled()
      })

      // Then chat session should be started
      await waitFor(() => {
        expect(mockStartChatSession).toHaveBeenCalled()
      })

      // Then navigation should occur
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/test-id/chat')
      })
    })

    it('updates entry first in edit mode before navigating', async () => {
      const existingEntry = {
        id: 'entry-123',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        title: 'Existing',
        body: 'Existing body',
      }
      const updatedEntry = {
        ...existingEntry,
        body: 'Updated body',
      }
      mockStore.entries = [existingEntry]
      mockRoute.params = { id: 'entry-123' }
      mockUpdateEntry.mockResolvedValue(updatedEntry)

      renderEditor()

      const bodyTextarea = await screen.findByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Updated body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const reflectOption = await screen.findByText('Reflect')
      await fireEvent.click(reflectOption)

      // Entry should be updated first
      await waitFor(() => {
        expect(mockUpdateEntry).toHaveBeenCalled()
      })

      // Then chat session should be started
      await waitFor(() => {
        expect(mockStartChatSession).toHaveBeenCalledWith('entry-123', 'reflect', undefined)
      })

      // Then navigation should occur
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/journal/entry-123/chat')
      })
    })

    it('shows error and does not navigate if save fails', async () => {
      mockCreateEntry.mockRejectedValue(new Error('Save failed'))

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const reflectOption = await screen.findByText('Reflect')
      await fireEvent.click(reflectOption)

      // Error should be shown
      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument()
      })

      // Should not start chat session
      expect(mockStartChatSession).not.toHaveBeenCalled()

      // Should not navigate
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/chat'))
    })

    it('shows error and does not navigate if startChatSession fails', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockResolvedValue(mockEntry)
      mockStartChatSession.mockRejectedValue(new Error('Chat session failed'))

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const reflectOption = await screen.findByText('Reflect')
      await fireEvent.click(reflectOption)

      // Error should be shown
      await waitFor(() => {
        expect(screen.getByText(/chat session failed/i)).toBeInTheDocument()
      })

      // Should not navigate
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/chat'))
    })

    it('shows validation error when Chat is clicked with empty body', async () => {
      renderEditor()

      const chatButton = await openAiSection()

      // Chat button should be disabled when body is empty
      expect(chatButton).toBeDisabled()

      // Try to click anyway (should not work, but test the validation)
      await fireEvent.click(chatButton)

      // Should not start chat
      expect(mockStartChatSession).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Chat sessions section', () => {
    it('shows chat sessions section in edit mode when entry has chat sessions', async () => {
      const existingEntry = {
        id: 'entry-123',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        title: 'Existing',
        body: 'Existing body',
        chatSessions: [
          {
            id: 'session-1',
            journalEntryId: 'entry-123',
            intention: 'reflect',
            createdAt: '2024-01-03T10:00:00.000Z',
            messages: [],
          },
        ],
      }
      mockStore.entries = [existingEntry]
      mockRoute.params = { id: 'entry-123' }

      renderEditor()

      await waitFor(() => {
        expect(screen.getByText(/chat sessions/i)).toBeInTheDocument()
        expect(screen.getByText(/1 conversation/)).toBeInTheDocument()
      })

      // ChatSessionCard should render a View button
      const viewButton = await screen.findByRole('button', { name: /view chat session/i })
      expect(viewButton).toBeInTheDocument()
    })

    it('navigates to chat view with sessionId when View is clicked', async () => {
      const existingEntry = {
        id: 'entry-123',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        title: 'Existing',
        body: 'Existing body',
        chatSessions: [
          {
            id: 'session-1',
            journalEntryId: 'entry-123',
            intention: 'reflect',
            createdAt: '2024-01-03T10:00:00.000Z',
            messages: [],
          },
        ],
      }
      mockStore.entries = [existingEntry]
      mockRoute.params = { id: 'entry-123' }

      renderEditor()

      await waitFor(() => {
        expect(screen.getByText(/chat sessions/i)).toBeInTheDocument()
      })

      const viewButton = await screen.findByRole('button', { name: /view chat session/i })
      await fireEvent.click(viewButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith({
          name: 'journal-chat',
          params: { id: 'entry-123' },
          query: { sessionId: 'session-1' },
        })
      })
    })

    it('opens delete confirmation dialog when Delete is clicked', async () => {
      const existingEntry = {
        id: 'entry-123',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        title: 'Existing',
        body: 'Existing body',
        chatSessions: [
          {
            id: 'session-1',
            journalEntryId: 'entry-123',
            intention: 'reflect',
            createdAt: '2024-01-03T10:00:00.000Z',
            messages: [],
          },
        ],
      }
      mockStore.entries = [existingEntry]
      mockRoute.params = { id: 'entry-123' }

      renderEditor()

      await waitFor(() => {
        expect(screen.getByText(/chat sessions/i)).toBeInTheDocument()
      })

      const deleteButton = await screen.findByRole('button', { name: /delete chat session/i })
      await fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete this conversation/i)
        ).toBeInTheDocument()
      })
    })

    it('calls deleteChatSession and updates entry when deletion is confirmed', async () => {
      const existingEntry = {
        id: 'entry-123',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-03T00:00:00.000Z',
        title: 'Existing',
        body: 'Existing body',
        chatSessions: [
          {
            id: 'session-1',
            journalEntryId: 'entry-123',
            intention: 'reflect',
            createdAt: '2024-01-03T10:00:00.000Z',
            messages: [],
          },
        ],
      }
      mockStore.entries = [existingEntry]
      mockRoute.params = { id: 'entry-123' }

      // Mock deleteChatSession to update the entry
      mockDeleteChatSession.mockImplementation(async (entryId: string, sessionId: string) => {
        const entry = mockStore.entries.find(e => e.id === entryId)
        if (entry && entry.chatSessions) {
          entry.chatSessions = entry.chatSessions.filter((s: any) => s.id !== sessionId)
          mockStore.entries = [entry]
        }
      })

      renderEditor()

      await waitFor(() => {
        expect(screen.getByText(/chat sessions/i)).toBeInTheDocument()
      })

      const deleteButton = await screen.findByRole('button', {
        name: /delete chat session/i,
      })
      await fireEvent.click(deleteButton)

      const dialogMessage = await screen.findByText(
        /are you sure you want to delete this conversation/i
      )
      const dialog = dialogMessage.closest('div') as HTMLElement
      const confirmButton = within(dialog).getByRole('button', { name: /delete/i })
      await fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteChatSession).toHaveBeenCalledWith('entry-123', 'session-1')
      })
    })
  })

  describe('Chat Store Integration', () => {
    it('calls startChatSession with correct parameters', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockResolvedValue(mockEntry)

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const proactiveOption = await screen.findByText('Help to be proactive')
      await fireEvent.click(proactiveOption)

      await waitFor(() => {
        expect(mockStartChatSession).toHaveBeenCalledWith('test-id', 'proactive', undefined)
      })
    })

    it('calls startChatSession with custom prompt when Custom is selected', async () => {
      const mockEntry = {
        id: 'test-id',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }
      mockCreateEntry.mockResolvedValue(mockEntry)

      renderEditor()

      const bodyTextarea = screen.getByLabelText(/journal entry/i)
      await fireEvent.update(bodyTextarea, 'Test body')

      const chatButton = await openAiSection()
      await fireEvent.click(chatButton)

      const customOption = await screen.findByText('Custom')
      await fireEvent.click(customOption)

      const dialog = await screen.findByRole('dialog')
      const textarea = within(dialog).getByPlaceholderText(
        /help me understand why i feel anxious about this situation/i
      )
      await fireEvent.update(textarea, 'My custom prompt text')

      const startChatButton = within(dialog).getByRole('button', { name: /start chat/i })
      await fireEvent.click(startChatButton)

      await waitFor(() => {
        expect(mockStartChatSession).toHaveBeenCalledWith(
          'test-id',
          'custom',
          'My custom prompt text'
        )
      })
    })
  })
})
