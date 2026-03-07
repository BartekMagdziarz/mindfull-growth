import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'
import EmotionsView from '../EmotionsView.vue'

type EmotionName = { id: string; name: string }
type TagName = { id: string; name: string }

const createEmotionLogStoreMock = () => {
  return {
    createLog: vi.fn().mockResolvedValue({
      id: 'log-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      emotionIds: ['emotion-1'],
      note: 'Feeling good',
      peopleTagIds: [],
      contextTagIds: [],
    }),
  }
}

const createEmotionStoreMock = () => {
  const isLoadedRef = ref(false)
  const emotionsMap = new Map<string, EmotionName>()

  const loadEmotions = vi.fn().mockImplementation(async () => {
    isLoadedRef.value = true
  })

  const getEmotionById = vi.fn((id: string) => {
    return emotionsMap.get(id) ?? { id, name: 'Mock Emotion' }
  })

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
  }
}

const createTagStoreMock = () => {
  const peopleTagsRef = ref<TagName[]>([])
  const contextTagsRef = ref<TagName[]>([])

  const loadPeopleTags = vi.fn().mockResolvedValue(undefined)
  const loadContextTags = vi.fn().mockResolvedValue(undefined)

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
    loadPeopleTags,
    loadContextTags,
  }
}

let mockEmotionLogStore = createEmotionLogStoreMock()
let mockEmotionStore = createEmotionStoreMock()
let mockTagStore = createTagStoreMock()
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

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

vi.mock('@/components/EmotionSelector.vue', () => {
  return {
    default: defineComponent({
      name: 'EmotionSelectorStub',
      props: {
        modelValue: { type: Array, default: () => [] },
        showSelectedSection: { type: Boolean, default: false },
      },
      emits: ['update:modelValue'],
      setup(_, { emit }) {
        const selectEmotion = () => emit('update:modelValue', ['emotion-1'])
        return () =>
          h('button', { type: 'button', onClick: selectEmotion }, 'Select emotion')
      },
    }),
  }
})

vi.mock('@/components/TagInput.vue', () => {
  return {
    default: defineComponent({
      name: 'TagInputStub',
      props: {
        modelValue: { type: Array, default: () => [] },
        tagType: { type: String, default: 'people' },
      },
      emits: ['update:modelValue'],
      setup() {
        return () => h('div', { 'data-testid': 'tag-input' })
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
          visible.value ? h('div', { 'data-testid': 'snackbar' }, message.value) : null
      },
    }),
  }
})

describe('EmotionsView', () => {
  const renderView = () => {
    return render(EmotionsView, {
      global: {
        stubs: {
          transition: false,
        },
      },
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockEmotionLogStore = createEmotionLogStoreMock()
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('loads emotion and tag data on mount when missing', async () => {
    mockEmotionStore.isLoaded = false
    mockTagStore.peopleTags = []
    mockTagStore.contextTags = []

    renderView()

    await waitFor(() => {
      expect(mockEmotionStore.loadEmotions).toHaveBeenCalledTimes(1)
      expect(mockTagStore.loadPeopleTags).toHaveBeenCalledTimes(1)
      expect(mockTagStore.loadContextTags).toHaveBeenCalledTimes(1)
    })
  })

  it('skips loading when emotion and tag data already exist', async () => {
    mockEmotionStore.isLoaded = true
    mockTagStore.peopleTags = [{ id: 'people-1', name: 'Alex' }]
    mockTagStore.contextTags = [{ id: 'context-1', name: 'Home' }]

    renderView()

    await waitFor(() => {
      expect(mockEmotionStore.loadEmotions).not.toHaveBeenCalled()
      expect(mockTagStore.loadPeopleTags).not.toHaveBeenCalled()
      expect(mockTagStore.loadContextTags).not.toHaveBeenCalled()
    })
  })

  it('disables the save button when no emotions are selected', () => {
    renderView()

    const saveButton = screen.getByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()
  })

  it('creates a log and shows a success snackbar', async () => {
    mockEmotionStore.isLoaded = true
    renderView()

    const noteInput = screen.getByLabelText('Quick note (optional)')
    await fireEvent.update(noteInput, 'Feeling good')

    const selectButton = screen.getByRole('button', { name: 'Select emotion' })
    await fireEvent.click(selectButton)

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          emotionIds: ['emotion-1'],
          note: 'Feeling good',
        })
      )
    })

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Emotion logged successfully.')
  })

  it('shows an error snackbar when log creation fails', async () => {
    mockEmotionLogStore.createLog = vi
      .fn()
      .mockRejectedValueOnce(new Error('Create failed'))
    mockEmotionStore.isLoaded = true

    renderView()

    const selectButton = screen.getByRole('button', { name: 'Select emotion' })
    await fireEvent.click(selectButton)

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await fireEvent.click(saveButton)

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Create failed')
  })

  it('renders the emotion history link', () => {
    renderView()
    expect(screen.getByText('View emotion history')).toBeInTheDocument()
  })
})
