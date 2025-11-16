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
    { id: 'happy', name: 'Happy' },
    { id: 'joyful', name: 'Joyful' },
  ],
  'high-energy-low-pleasantness': [{ id: 'angry', name: 'Angry' }],
  'low-energy-high-pleasantness': [{ id: 'calm', name: 'Calm' }],
  'low-energy-low-pleasantness': [{ id: 'tired', name: 'Tired' }],
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
      expect(mockEmotionStore.loadEmotions).toHaveBeenCalled()
    })

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    // Select quadrant and emotion
    await user.click(
      screen.getByRole('button', { name: /select High Energy \/ High Pleasantness quadrant/i })
    )
    await user.click(
      await screen.findByRole('button', { name: /Select emotion Happy/i, timeout: 3000 })
    )

    expect(screen.getByText(/Selected Emotions \(1\)/)).toBeInTheDocument()

    // Switch quadrants and ensure selection persists
    await user.click(
      screen.getByRole('button', { name: /Switch to High Energy \/ Low Pleasantness quadrant/i })
    )
    expect(screen.getByText(/Selected Emotions \(1\)/)).toBeInTheDocument()

    // Add people tag
    const peopleInput = screen.getByLabelText(/Add people tag/i)
    await user.type(peopleInput, 'Mom')
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /Remove Mom from selection/i })

    // Add context tag
    const contextInput = screen.getByLabelText(/Add context tag/i)
    await user.type(contextInput, 'Office')
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /Remove Office from selection/i })

    // Body text enables save
    const bodyField = screen.getByLabelText(/journal entry/i)
    await user.type(bodyField, 'Today I felt amazing after a morning run.')
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    expect(mockJournalStore.createEntry).toHaveBeenCalledWith({
      title: undefined,
      body: 'Today I felt amazing after a morning run.',
      emotionIds: ['happy'],
      peopleTagIds: ['people-1'],
      contextTagIds: ['context-1'],
    })
  })

  it('enforces emotion selection validation in EmotionLogEditorView', async () => {
    const user = userEvent.setup()
    render(EmotionLogEditorView)

    await waitFor(() => {
      expect(mockEmotionStore.loadEmotions).toHaveBeenCalled()
    })

    const saveButton = await screen.findByRole('button', { name: 'Save' })
    expect(saveButton).toBeDisabled()

    await user.click(
      screen.getByRole('button', { name: /select High Energy \/ High Pleasantness quadrant/i })
    )
    await user.click(screen.getByRole('button', { name: /Select emotion Joyful/i }))
    expect(saveButton).toBeEnabled()

    // Add tags then remove emotion to ensure validation kicks in again
    const peopleInput = screen.getByLabelText(/Add people tag/i)
    await user.type(peopleInput, 'Coach')
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /Remove Coach from selection/i })

    await user.click(screen.getByRole('button', { name: /Remove Joyful from selection/i }))
    expect(saveButton).toBeDisabled()

    // Re-add an emotion and save
    await user.click(screen.getByRole('button', { name: /Select emotion Joyful/i }))
    expect(saveButton).toBeEnabled()

    await user.type(screen.getByLabelText(/note/i), 'Reflection note')
    await user.click(saveButton)

    expect(mockEmotionLogStore.createLog).toHaveBeenCalledWith({
      emotionIds: ['joyful'],
      note: 'Reflection note',
      peopleTagIds: ['people-1'],
      contextTagIds: undefined,
    })
  })
})


