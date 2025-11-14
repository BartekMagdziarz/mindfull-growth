import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref, toRefs } from 'vue'

const EmotionSelectorStub = defineComponent({
  name: 'EmotionSelectorStub',
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { modelValue } = toRefs(props)
    const selectEmotion = () => {
      emit('update:modelValue', [...modelValue.value, 'emotion-joy'])
    }
    return { selectEmotion, modelValue }
  },
  template: `
    <div data-testid="emotion-selector-stub">
      <button data-testid="add-emotion" type="button" @click="selectEmotion">
        Add Emotion
      </button>
      <span data-testid="emotion-values">{{ modelValue.join(',') }}</span>
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
      const id =
        tagType.value === 'people' ? 'people-tag-friend' : 'context-tag-home'
      emit('update:modelValue', [...modelValue.value, id])
    }
    return { selectTag, tagType, modelValue }
  },
  template: `
    <div :data-testid="tagType + '-tag-stub'">
      <button
        :data-testid="tagType + '-tag-button'"
        type="button"
        @click="selectTag"
      >
        Select {{ tagType }}
      </button>
      <span :data-testid="tagType + '-tag-values'">{{ modelValue.join(',') }}</span>
    </div>
  `,
})

// Mock the journal store
const mockCreateEntry = vi.fn()
const mockUpdateEntry = vi.fn()
const mockStore = {
  createEntry: mockCreateEntry,
  updateEntry: mockUpdateEntry,
  entries: [] as any[],
}

vi.mock('@/stores/journal.store', () => {
  return {
    useJournalStore: vi.fn(() => mockStore),
  }
})

const createEmotionStoreMock = () => {
  const isLoadedRef = ref(false)
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

import JournalEditorView from '../JournalEditorView.vue'

const renderEditor = () =>
  render(JournalEditorView, {
    global: {
      stubs: {
        EmotionSelector: EmotionSelectorStub,
        TagInput: TagInputStub,
      },
    },
  })

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
    mockGetById.mockReset()
    mockRoute.params = {}
    mockRoute.path = '/journal/edit'
    mockStore.entries = []
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
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
        title: 'Test Title',
        body: 'Test body content',
        emotionIds: [],
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

  it('navigates back to /journal when Cancel is clicked without calling createEntry', async () => {
    renderEditor()

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
        title: undefined,
        body: 'Test body content',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      })
    })
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
        title: undefined,
        body: 'Filled body',
        emotionIds: ['emotion-joy'],
        peopleTagIds: ['people-tag-friend'],
        contextTagIds: ['context-tag-home'],
      })
    })
  })

  it('pre-populates selections in edit mode and passes them to updateEntry', async () => {
    const existingEntry = {
      id: 'entry-123',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
      title: 'Existing',
      body: 'Existing body',
      emotionIds: ['emotion-calm'],
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
        ...existingEntry,
        title: 'Existing',
        body: 'Updated body content',
        emotionIds: ['emotion-calm'],
        peopleTagIds: ['people-colleague'],
        contextTagIds: ['context-office'],
      })
    })
  })
})

