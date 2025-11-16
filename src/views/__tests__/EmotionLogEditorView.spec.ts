import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/vue'
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
    return { modelValue, selectEmotion }
  },
  template: `
    <div data-testid="emotion-selector-stub">
      <button data-testid="emotion-add" type="button" @click="selectEmotion">
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
      const nextValue =
        tagType.value === 'people' ? 'people-tag-ally' : 'context-tag-home'
      emit('update:modelValue', [...modelValue.value, nextValue])
    }
    return { modelValue, tagType, selectTag }
  },
  template: `
    <div :data-testid="tagType + '-tag-stub'">
      <button
        :data-testid="tagType + '-tag-add'"
        type="button"
        @click="selectTag"
      >
        Add {{ tagType }}
      </button>
      <span :data-testid="tagType + '-tag-values'">{{ modelValue.join(',') }}</span>
    </div>
  `,
})

type EmotionLog = {
  id: string
  createdAt: string
  updatedAt: string
  emotionIds: string[]
  note?: string
  peopleTagIds?: string[]
  contextTagIds?: string[]
}

const createEmotionLogStoreMock = () => {
  const logsRef = ref<EmotionLog[]>([])
  return {
    get logs() {
      return logsRef.value
    },
    set logs(value: EmotionLog[]) {
      logsRef.value = value
    },
    createLog: vi.fn(),
    updateLog: vi.fn(),
  }
}

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
      peopleTagsRef.value = [{ id: 'people-default', name: 'Taylor' }]
      errorRef.value = null
    }),
    loadContextTags: vi.fn().mockImplementation(async () => {
      contextTagsRef.value = [{ id: 'context-default', name: 'Office' }]
      errorRef.value = null
    }),
  }
}

let mockEmotionLogStore = createEmotionLogStoreMock()
let mockEmotionStore = createEmotionStoreMock()
let mockTagStore = createTagStoreMock()

vi.mock('@/stores/emotionLog.store', () => ({
  useEmotionLogStore: vi.fn(() => mockEmotionLogStore),
}))

vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: vi.fn(() => mockEmotionStore),
}))

vi.mock('@/stores/tag.store', () => ({
  useTagStore: vi.fn(() => mockTagStore),
}))

const mockGetById = vi.hoisted(() => vi.fn())
vi.mock('@/repositories/emotionLogDexieRepository', () => ({
  emotionLogDexieRepository: {
    getById: mockGetById,
  },
}))

const mockPush = vi.fn()
const mockRoute = {
  params: {} as Record<string, string>,
  path: '/emotions/edit',
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => mockRoute,
}))

import EmotionLogEditorView from '../EmotionLogEditorView.vue'

const renderEditor = () =>
  render(EmotionLogEditorView, {
    global: {
      stubs: {
        EmotionSelector: EmotionSelectorStub,
        TagInput: TagInputStub,
      },
    },
  })

describe('EmotionLogEditorView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEmotionLogStore = createEmotionLogStoreMock()
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
    mockRoute.params = {}
    mockRoute.path = '/emotions/edit'
    mockGetById.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders create mode with empty fields and current timestamp', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T12:34:00'))

    renderEditor()

    await screen.findByTestId('emotion-add')

    const expectedTimestamp = (() => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      return `Today, ${hours}:${minutes}`
    })()

    expect(screen.getByText(expectedTimestamp, { selector: 'p' })).toBeInTheDocument()
    const noteField = screen.getByLabelText(/note\s+\(optional\)/i) as HTMLTextAreaElement
    expect(noteField.value).toBe('')
    expect(mockEmotionStore.loadEmotions).toHaveBeenCalled()
    expect(mockTagStore.loadPeopleTags).toHaveBeenCalled()
    expect(mockTagStore.loadContextTags).toHaveBeenCalled()
  })

  it('disables save until an emotion is selected', async () => {
    renderEditor()

    await screen.findByTestId('emotion-add')

    const saveButton = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement
    expect(saveButton.disabled).toBe(true)

    await fireEvent.click(screen.getByTestId('emotion-add'))

    expect(
      (screen.getByTestId('emotion-values') as HTMLElement).textContent
    ).toContain('emotion-joy')
    expect(saveButton.disabled).toBe(false)
  })

  it('shows validation error when saving without emotions in create mode', async () => {
    renderEditor()

    await screen.findByTestId('emotion-add')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText('Please select at least one emotion.')
      ).toBeInTheDocument()
    })
    expect(mockEmotionLogStore.createLog).not.toHaveBeenCalled()
  })

  it('creates a log with trimmed note and selected tags in create mode', async () => {
    mockEmotionLogStore.createLog.mockResolvedValue({
      id: 'new-log',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      emotionIds: ['emotion-joy'],
    })

    renderEditor()

    const emotionAddButton = await screen.findByTestId('emotion-add')
    await fireEvent.click(emotionAddButton)
    const noteField = screen.getByLabelText(/note\s+\(optional\)/i)
    await fireEvent.update(noteField, '  Feeling ready ')
    const addPeopleButton = await screen.findByTestId('people-tag-add')
    const addContextButton = await screen.findByTestId('context-tag-add')
    await fireEvent.click(addPeopleButton)
    await fireEvent.click(addContextButton)

    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.createLog).toHaveBeenCalledWith({
        emotionIds: ['emotion-joy'],
        note: 'Feeling ready',
        peopleTagIds: ['people-tag-ally'],
        contextTagIds: ['context-tag-home'],
      })
    })
    expect(mockPush).toHaveBeenCalledWith('/emotions')
    expect(
      screen.getByText('Emotion log saved successfully.')
    ).toBeInTheDocument()
  })

  it('handles errors when createLog fails', async () => {
    mockEmotionLogStore.createLog.mockRejectedValue(new Error('Create failed'))

    renderEditor()

    const emotionAddButton = await screen.findByTestId('emotion-add')
    await fireEvent.click(emotionAddButton)
    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(
        screen.getByText('Create failed')
      ).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('pre-populates fields and updates the log in edit mode', async () => {
    const existingLog: EmotionLog = {
      id: 'log-123',
      createdAt: '2025-02-01T08:00:00.000Z',
      updatedAt: '2025-02-01T08:00:00.000Z',
      emotionIds: ['emotion-calm'],
      note: 'Initial note',
      peopleTagIds: ['people-tag-mentor'],
      contextTagIds: ['context-tag-office'],
    }
    mockEmotionLogStore.logs = [existingLog]
    mockRoute.params = { id: 'log-123' }
    mockRoute.path = '/emotions/log-123/edit'

    renderEditor()

    const emotionAddButton = await screen.findByTestId('emotion-add')
    const noteField = await screen.findByLabelText(/note\s+\(optional\)/i)
    expect((noteField as HTMLTextAreaElement).value).toBe('Initial note')

    await fireEvent.click(emotionAddButton)
    const addPeopleButton = await screen.findByTestId('people-tag-add')
    await fireEvent.click(addPeopleButton)

    const saveButton = screen.getByRole('button', { name: /save/i })
    await fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.updateLog).toHaveBeenCalledWith({
        ...existingLog,
        emotionIds: ['emotion-calm', 'emotion-joy'],
        note: 'Initial note',
        peopleTagIds: ['people-tag-mentor', 'people-tag-ally'],
        contextTagIds: ['context-tag-office'],
      })
    })
    expect(mockPush).toHaveBeenCalledWith('/emotions')
  })

  it('loads log data from repository when not found in store', async () => {
    const repoLog: EmotionLog = {
      id: 'log-456',
      createdAt: '2025-03-05T10:00:00.000Z',
      updatedAt: '2025-03-06T10:00:00.000Z',
      emotionIds: ['emotion-happy'],
      note: 'Loaded from repo',
    }
    mockGetById.mockResolvedValue(repoLog)
    mockRoute.params = { id: 'log-456' }
    mockRoute.path = '/emotions/log-456/edit'

    renderEditor()

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('log-456')
    })

    const noteField = await screen.findByLabelText(/note\s+\(optional\)/i)
    await waitFor(() => {
      expect((noteField as HTMLTextAreaElement).value).toBe('Loaded from repo')
    })
  })

  it('shows loading indicator while fetching log data', async () => {
    let resolveLog: (value: EmotionLog | undefined) => void = () => {}
    mockGetById.mockImplementation(
      () =>
        new Promise<EmotionLog | undefined>((resolve) => {
          resolveLog = resolve
        })
    )
    mockRoute.params = { id: 'log-loading' }
    mockRoute.path = '/emotions/log-loading/edit'

    renderEditor()

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('log-loading')
    })

    expect(
      await screen.findByText(/Loading emotion log/i)
    ).toBeInTheDocument()

    resolveLog({
      id: 'log-loading',
      createdAt: '2025-04-01T08:00:00.000Z',
      updatedAt: '2025-04-01T09:00:00.000Z',
      emotionIds: ['emotion-focus'],
    })

    await waitFor(() => {
      expect(
        screen.queryByText('Loading emotion log...')
      ).not.toBeInTheDocument()
    })
  })

  it('shows error and navigates back when log is not found', async () => {
    mockGetById.mockResolvedValue(undefined)
    mockRoute.params = { id: 'missing-log' }
    mockRoute.path = '/emotions/missing-log/edit'

    renderEditor()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/emotions')
    })
    expect(
      screen.getByText('Emotion log not found.')
    ).toBeInTheDocument()
  })

  it('navigates to emotions list when cancel is clicked', async () => {
    renderEditor()

    await screen.findByTestId('emotion-add')

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await fireEvent.click(cancelButton)

    expect(mockPush).toHaveBeenCalledWith('/emotions')
  })
})


