import { describe, it, beforeEach, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { ref } from 'vue'
import JournalEditorView from '@/views/JournalEditorView.vue'
import EmotionLogEditorView from '@/views/EmotionLogEditorView.vue'

const mockRouterPush = vi.fn()
const mockRoute = { params: {} as Record<string, unknown> }

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useRoute: () => mockRoute,
}))

const quadrantEmotions = {
  'high-energy-high-pleasantness': [
    { id: 'happy', name: 'Happy', pleasantness: 10, energy: 10 },
    { id: 'joyful', name: 'Joyful', pleasantness: 9, energy: 9 },
  ],
  'high-energy-low-pleasantness': [{ id: 'angry', name: 'Angry', pleasantness: 2, energy: 9 }],
  'low-energy-high-pleasantness': [{ id: 'calm', name: 'Calm', pleasantness: 9, energy: 2 }],
  'low-energy-low-pleasantness': [{ id: 'tired', name: 'Tired', pleasantness: 3, energy: 3 }],
}

const allEmotions = Object.values(quadrantEmotions).flat()

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
    getEmotionsByQuadrant: vi.fn((quadrant: keyof typeof quadrantEmotions) => {
      return quadrantEmotions[quadrant] ?? []
    }),
    getEmotionById: vi.fn((id: string) => allEmotions.find((emotion) => emotion.id === id)),
    getScatterCoord: vi.fn(() => undefined),
  }
}

const createTagStoreMock = () => {
  const peopleTagsRef = ref<{ id: string; name: string }[]>([])
  const contextTagsRef = ref<{ id: string; name: string }[]>([])
  const errorRef = ref<string | null>(null)

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
    get error() {
      return errorRef.value
    },
    set error(value: string | null) {
      errorRef.value = value
    },
    loadPeopleTags: vi.fn().mockResolvedValue(undefined),
    loadContextTags: vi.fn().mockResolvedValue(undefined),
    getPeopleTagById: vi.fn((id: string) => peopleTagsRef.value.find((tag) => tag.id === id)),
    getContextTagById: vi.fn((id: string) => contextTagsRef.value.find((tag) => tag.id === id)),
    async createPeopleTag(name: string) {
      const existing = peopleTagsRef.value.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase().trim()
      )
      if (existing) return existing
      const newTag = { id: `people-${peopleTagsRef.value.length + 1}`, name: name.trim() }
      peopleTagsRef.value = [...peopleTagsRef.value, newTag]
      return newTag
    },
    async createContextTag(name: string) {
      const existing = contextTagsRef.value.find(
        (tag) => tag.name.toLowerCase() === name.toLowerCase().trim()
      )
      if (existing) return existing
      const newTag = { id: `context-${contextTagsRef.value.length + 1}`, name: name.trim() }
      contextTagsRef.value = [...contextTagsRef.value, newTag]
      return newTag
    },
    deletePeopleTag: vi.fn(),
    deleteContextTag: vi.fn(),
  }
}

const createJournalStoreMock = () => {
  return {
    entries: [],
    createEntry: vi.fn().mockResolvedValue(undefined),
    updateEntry: vi.fn().mockResolvedValue(undefined),
  }
}

const createEmotionLogStoreMock = () => {
  return {
    logs: [],
    createLog: vi.fn().mockResolvedValue(undefined),
    updateLog: vi.fn().mockResolvedValue(undefined),
  }
}

let mockEmotionStore = createEmotionStoreMock()
let mockTagStore = createTagStoreMock()
let mockJournalStore = createJournalStoreMock()
let mockEmotionLogStore = createEmotionLogStoreMock()

vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: () => mockEmotionStore,
}))

vi.mock('@/stores/tag.store', () => ({
  useTagStore: () => mockTagStore,
}))

vi.mock('@/stores/journal.store', () => ({
  useJournalStore: () => mockJournalStore,
}))

vi.mock('@/stores/emotionLog.store', () => ({
  useEmotionLogStore: () => mockEmotionLogStore,
}))

describe('Component interactions', () => {
  beforeEach(() => {
    mockEmotionStore = createEmotionStoreMock()
    mockTagStore = createTagStoreMock()
    mockJournalStore = createJournalStoreMock()
    mockEmotionLogStore = createEmotionLogStoreMock()
    mockRouterPush.mockReset()
    mockRoute.params = {}
    vi.clearAllMocks()
  })

  it('syncs EmotionSelector and TagInput selections inside JournalEditorView', async () => {
    const user = userEvent.setup()
    render(JournalEditorView)

    await waitFor(() => {
      expect(mockEmotionStore.isLoaded).toBe(true)
    })

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    // Select quadrant -> "show emotions" -> pick the "Happy" dot (new scatter flow)
    await user.click(screen.getByTestId('emotion-quadrant-high-energy-high-pleasantness'))
    await user.click(await screen.findByTestId('emotion-show-emotions'))
    await user.click(await screen.findByTestId('emotion-option-happy'))

    await screen.findByRole('button', { name: /Remove Happy from selection/i })

    // Switch quadrants via the in-panel switcher (level 2/3); selection persists.
    await user.click(await screen.findByTestId('emotion-quadrant-switch-high-energy-low-pleasantness'))
    // Selection persists across the round-trip
    await screen.findByRole('button', { name: /Remove Happy from selection/i })

    // Add people tag
    await user.click(screen.getByRole('button', { name: /Add new people tag/i }))
    const peopleInput = screen.getByLabelText(/New people tag name/i)
    await user.type(peopleInput, 'Mom')
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /Deselect people tag Mom/i })

    // Add context tag
    await user.click(screen.getByRole('button', { name: /Add new context tag/i }))
    const contextInput = screen.getByLabelText(/New context tag name/i)
    await user.type(contextInput, 'Office')
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /Deselect context tag Office/i })

    // Body text enables save
    const bodyField = screen.getByLabelText(/journal entry/i)
    await user.type(bodyField, 'Today I felt amazing after a morning run.')
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    expect(mockJournalStore.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: undefined,
        body: 'Today I felt amazing after a morning run.',
        emotionIds: ['happy'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      })
    )
  })

  it('enforces emotion selection validation in EmotionLogEditorView', async () => {
    const user = userEvent.setup()
    render(EmotionLogEditorView)

    await waitFor(() => {
      expect(mockEmotionStore.isLoaded).toBe(true)
    })

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    expect(saveButton).toBeEnabled()
    await user.click(saveButton)
    expect(mockEmotionLogStore.createLog).not.toHaveBeenCalled()
    await screen.findByText(/Please select at least one emotion/i)

    await user.click(screen.getByTestId('emotion-quadrant-high-energy-high-pleasantness'))
    await user.click(await screen.findByTestId('emotion-show-emotions'))
    await user.click(await screen.findByTestId('emotion-option-joyful'))
    expect(saveButton).toBeEnabled()
    await screen.findByRole('button', { name: /Remove Joyful from selection/i })

    // Add tags then save
    await user.click(screen.getByRole('button', { name: /Add new people tag/i }))
    await user.type(screen.getByLabelText(/New people tag name/i), 'Coach')
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /Deselect people tag Coach/i })

    await user.type(screen.getByLabelText(/note/i), 'Reflection note')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockEmotionLogStore.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          emotionIds: ['joyful'],
          note: 'Reflection note',
          peopleTagIds: ['people-1'],
          contextTagIds: undefined,
        })
      )
    })
  })
})
