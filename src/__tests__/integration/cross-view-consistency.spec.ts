import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/vue'
import { defineComponent, h, ref } from 'vue'
import JournalView from '@/views/JournalView.vue'
import EmotionsView from '@/views/EmotionsView.vue'

const mockRouterPush = vi.fn()

const createJournalStoreMock = () => {
  return {
    sortedEntries: [] as any[],
    isLoading: false,
    error: null as string | null,
    loadEntries: vi.fn().mockResolvedValue(undefined),
  }
}

const createEmotionLogStoreMock = () => {
  return {
    sortedLogs: [] as any[],
    isLoading: false,
    error: null as string | null,
    loadLogs: vi.fn().mockResolvedValue(undefined),
    deleteLog: vi.fn().mockResolvedValue(undefined),
  }
}

const createEmotionStoreMock = () => {
  const isLoadedRef = ref(false)
  const map = new Map<string, { id: string; name: string }>()
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
    getEmotionById: vi.fn((id: string) => map.get(id)),
    setEmotion(id: string, name: string) {
      map.set(id, { id, name })
    },
  }
}

const createTagStoreMock = () => {
  const peopleTagsRef = ref<{ id: string; name: string }[]>([])
  const contextTagsRef = ref<{ id: string; name: string }[]>([])
  return {
    get peopleTags() {
      return peopleTagsRef.value
    },
    set peopleTags(value) {
      peopleTagsRef.value = value
    },
    get contextTags() {
      return contextTagsRef.value
    },
    set contextTags(value) {
      contextTagsRef.value = value
    },
    error: null as string | null,
    loadPeopleTags: vi.fn().mockResolvedValue(undefined),
    loadContextTags: vi.fn().mockResolvedValue(undefined),
    getPeopleTagById: vi.fn((id: string) => peopleTagsRef.value.find((tag) => tag.id === id)),
    getContextTagById: vi.fn((id: string) => contextTagsRef.value.find((tag) => tag.id === id)),
  }
}

let mockJournalStore = createJournalStoreMock()
let mockEmotionLogStore = createEmotionLogStoreMock()
let mockEmotionStore = createEmotionStoreMock()
let mockTagStore = createTagStoreMock()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useRoute: () => ({
    params: {},
  }),
}))

vi.mock('@/stores/journal.store', () => ({
  useJournalStore: () => mockJournalStore,
}))

vi.mock('@/stores/emotionLog.store', () => ({
  useEmotionLogStore: () => mockEmotionLogStore,
}))

vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: () => mockEmotionStore,
}))

vi.mock('@/stores/tag.store', () => ({
  useTagStore: () => mockTagStore,
}))

vi.mock('@/components/AppDialog.vue', () => ({
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
              h('p', { 'data-testid': 'dialog-title' }, props.title),
              h('p', { 'data-testid': 'dialog-message' }, props.message),
              h('button', { onClick: handleCancel }, props.cancelText),
              h('button', { onClick: handleConfirm }, props.confirmText),
            ])
          : null
    },
  }),
}))

vi.mock('@/components/AppSnackbar.vue', () => ({
  default: defineComponent({
    name: 'AppSnackbarStub',
    setup(_, { expose }) {
      const visible = ref(false)
      const message = ref('')
      const show = (text: string) => {
        visible.value = true
        message.value = text
      }
      expose({ show })
      return () =>
        visible.value ? h('div', { 'data-testid': 'snackbar' }, message.value) : null
    },
  }),
}))

describe('Cross-view consistency', () => {
  const sharedTimestamp = '2024-04-01T09:30:00.000Z'
  const sharedEmotionId = 'emotion-shared'
  const sharedPeopleTagId = 'people-shared'
  const sharedContextTagId = 'context-shared'

  beforeEach(() => {
    mockJournalStore = createJournalStoreMock()
    mockEmotionLogStore = createEmotionLogStoreMock()
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
    mockRouterPush.mockReset()
    cleanup()

    mockEmotionStore.setEmotion(sharedEmotionId, 'Happy')
    mockTagStore.peopleTags = [{ id: sharedPeopleTagId, name: 'Mom' }]
    mockTagStore.contextTags = [{ id: sharedContextTagId, name: 'Work' }]

    mockJournalStore.sortedEntries = [
      {
        id: 'entry-1',
        createdAt: sharedTimestamp,
        updatedAt: sharedTimestamp,
        body: 'Shared entry body',
        emotionIds: [sharedEmotionId],
        peopleTagIds: [sharedPeopleTagId],
        contextTagIds: [sharedContextTagId],
      },
    ]

    mockEmotionLogStore.sortedLogs = [
      {
        id: 'log-1',
        createdAt: sharedTimestamp,
        updatedAt: sharedTimestamp,
        emotionIds: [sharedEmotionId],
        note: 'Shared note',
        peopleTagIds: [sharedPeopleTagId],
        contextTagIds: [sharedContextTagId],
      },
    ]
  })

  afterEach(() => {
    cleanup()
  })

  it('renders identical tag chip styles between JournalView and EmotionsView', async () => {
    const journalUtils = render(JournalView)
    await waitFor(() => expect(mockJournalStore.loadEntries).toHaveBeenCalled())

    const journalEmotionChip = await screen.findByText('Happy')
    const journalPeopleChip = await screen.findByText('Mom')
    const journalContextChip = await screen.findByText('Work')

    const journalClasses = {
      emotion: journalEmotionChip.className,
      people: journalPeopleChip.className,
      context: journalContextChip.className,
    }

    journalUtils.unmount()

    const emotionUtils = render(EmotionsView)
    await waitFor(() => expect(mockEmotionLogStore.loadLogs).toHaveBeenCalled())

    const emotionEmotionChip = await screen.findByText('Happy')
    const emotionPeopleChip = await screen.findByText('Mom')
    const emotionContextChip = await screen.findByText('Work')

    const emotionsClasses = {
      emotion: emotionEmotionChip.className,
      people: emotionPeopleChip.className,
      context: emotionContextChip.className,
    }

    expect(emotionsClasses.emotion).toBe(journalClasses.emotion)
    expect(emotionsClasses.people).toBe(journalClasses.people)
    expect(emotionsClasses.context).toBe(journalClasses.context)

    emotionUtils.unmount()
  })

  it('formats timestamps identically across views', async () => {
    const journal = render(JournalView)
    await waitFor(() => expect(mockJournalStore.loadEntries).toHaveBeenCalled())
    const journalTimestamp = screen.getByText(/2024/)
    const journalText = journalTimestamp.textContent
    journal.unmount()

    const emotions = render(EmotionsView)
    await waitFor(() => expect(mockEmotionLogStore.loadLogs).toHaveBeenCalled())
    const emotionTimestamp = screen.getByText(journalText as string)
    expect(emotionTimestamp.textContent).toBe(journalText)
    emotions.unmount()
  })

  it('uses the same delete dialog messaging in both views', async () => {
    const journal = render(JournalView)
    await waitFor(() => expect(mockJournalStore.loadEntries).toHaveBeenCalled())
    const journalDeleteButton = screen.getByRole('button', { name: /Delete entry/i })
    await journalDeleteButton.click()
    const journalDialogTitle = await screen.findByTestId('dialog-title')
    const journalDialogMessage = screen.getByTestId('dialog-message')
    const journalTitleText = journalDialogTitle.textContent
    const journalMessageText = journalDialogMessage.textContent
    journal.unmount()

    const emotions = render(EmotionsView)
    await waitFor(() => expect(mockEmotionLogStore.loadLogs).toHaveBeenCalled())
    const logDeleteButton = screen.getByRole('button', {
      name: /Delete emotion log recorded on/,
    })
    await logDeleteButton.click()
    const emotionsDialogTitle = await screen.findByTestId('dialog-title')
    const emotionsDialogMessage = screen.getByTestId('dialog-message')
    expect(emotionsDialogTitle.textContent).toBe(journalTitleText)
    expect(emotionsDialogMessage.textContent).toBe(journalMessageText)
    emotions.unmount()
  })
})


