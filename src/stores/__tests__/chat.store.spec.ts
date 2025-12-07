import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useChatStore } from '../chat.store'
import type { ChatSession, ChatIntention } from '@/domain/chatSession'
import type { JournalEntry } from '@/domain/journal'
import type { Emotion } from '@/domain/emotion'
import type { PeopleTag, ContextTag } from '@/domain/tag'

// Mock the LLM service
vi.mock('@/services/llmService', () => {
  return {
    sendMessage: vi.fn(),
  }
})

// Mock the journal store
vi.mock('../journal.store', () => {
  return {
    useJournalStore: vi.fn(),
  }
})

// Mock the emotion store
vi.mock('../emotion.store', () => {
  return {
    useEmotionStore: vi.fn(),
  }
})

// Mock the tag store
vi.mock('../tag.store', () => {
  return {
    useTagStore: vi.fn(),
  }
})

// Mock the chat prompts module
vi.mock('@/services/chatPrompts', () => {
  return {
    getSystemPrompt: vi.fn(),
    constructJournalEntryContext: vi.fn(),
  }
})

// Import mocked modules
import { sendMessage as sendLLMMessage } from '@/services/llmService'
import { useJournalStore } from '../journal.store'
import { useEmotionStore } from '../emotion.store'
import { useTagStore } from '../tag.store'
import {
  getSystemPrompt,
  constructJournalEntryContext,
} from '@/services/chatPrompts'

describe('useChatStore', () => {
  // Mock stores
  let mockJournalStore: {
    getEntryById: ReturnType<typeof vi.fn>
    updateEntry: ReturnType<typeof vi.fn>
  }
  let mockEmotionStore: {
    getEmotionById: ReturnType<typeof vi.fn>
  }
  let mockTagStore: {
    getPeopleTagById: ReturnType<typeof vi.fn>
    getContextTagById: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Setup mock stores
    mockJournalStore = {
      getEntryById: vi.fn(),
      updateEntry: vi.fn(),
    }
    mockEmotionStore = {
      getEmotionById: vi.fn(),
    }
    mockTagStore = {
      getPeopleTagById: vi.fn(),
      getContextTagById: vi.fn(),
    }

    vi.mocked(useJournalStore).mockReturnValue(
      mockJournalStore as unknown as ReturnType<typeof useJournalStore>
    )
    vi.mocked(useEmotionStore).mockReturnValue(
      mockEmotionStore as unknown as ReturnType<typeof useEmotionStore>
    )
    vi.mocked(useTagStore).mockReturnValue(
      mockTagStore as unknown as ReturnType<typeof useTagStore>
    )

    // Setup default mocks for chat prompts
    vi.mocked(getSystemPrompt).mockImplementation((intention) => {
      return `System prompt for ${intention}`
    })
    vi.mocked(constructJournalEntryContext).mockImplementation((entry) => {
      const title = entry.title || 'Untitled entry'
      const body = entry.body || ''
      return `Journal Entry Context:\nTitle: ${title}\nEmotions: None\nPeople Tags: None\nContext Tags: None\nContent:\n${body}`
    })
  })

  describe('store initialization', () => {
    it('initializes with correct default state', () => {
      const store = useChatStore()

      expect(store.currentChatSession).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.journalEntryId).toBeNull()
      expect(store.hasUnsavedMessages).toBe(false)
    })
  })

  describe('hasUnsavedMessages getter', () => {
    it('returns false when no session exists', () => {
      const store = useChatStore()
      expect(store.hasUnsavedMessages).toBe(false)
    })

    it('returns false when session has no messages', async () => {
      const store = useChatStore()
      await store.startChatSession('entry-1', 'reflect')
      expect(store.hasUnsavedMessages).toBe(false)
    })

    it('returns true when session has messages', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockResolvedValue('Test response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')

      expect(store.hasUnsavedMessages).toBe(true)
    })
  })

  describe('startChatSession', () => {
    it('creates a new chat session with correct structure', async () => {
      const store = useChatStore()
      const entryId = 'entry-1'
      const intention: ChatIntention = 'reflect'

      await store.startChatSession(entryId, intention)

      expect(store.currentChatSession).not.toBeNull()
      expect(store.currentChatSession?.journalEntryId).toBe(entryId)
      expect(store.currentChatSession?.intention).toBe(intention)
      expect(store.currentChatSession?.messages).toEqual([])
      expect(store.currentChatSession?.id).toBeDefined()
      expect(store.currentChatSession?.createdAt).toBeDefined()
      expect(store.journalEntryId).toBe(entryId)
      expect(store.error).toBeNull()
    })

    it('creates a chat session with custom intention and customPrompt', async () => {
      const store = useChatStore()
      const entryId = 'entry-1'
      const intention: ChatIntention = 'custom'
      const customPrompt = 'Custom prompt text'

      await store.startChatSession(entryId, intention, customPrompt)

      expect(store.currentChatSession).not.toBeNull()
      expect(store.currentChatSession?.intention).toBe(intention)
      expect(store.currentChatSession?.customPrompt).toBe(customPrompt)
    })

    it('clears previous session state when starting a new session', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockResolvedValue('First response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('First message')

      const firstSessionId = store.currentChatSession?.id

      await store.startChatSession('entry-2', 'proactive')

      expect(store.currentChatSession?.id).not.toBe(firstSessionId)
      expect(store.currentChatSession?.messages).toEqual([])
      expect(store.journalEntryId).toBe('entry-2')
    })

    it('throws error for invalid intention', async () => {
      const store = useChatStore()

      await expect(
        store.startChatSession('entry-1', 'invalid-intention' as ChatIntention)
      ).rejects.toThrow('Invalid chat intention')

      expect(store.error).toBe('Invalid chat intention: invalid-intention')
    })
  })

  describe('sendMessage', () => {
    it('throws error when no session exists', async () => {
      const store = useChatStore()

      await expect(store.sendMessage('Hello')).rejects.toThrow(
        'No active chat session'
      )
      expect(store.error).toBe(
        'No active chat session. Please start a chat session first.'
      )
    })

    it('successfully sends message and receives response', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockResolvedValue('Test response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')

      expect(store.currentChatSession?.messages).toHaveLength(2)
      expect(store.currentChatSession?.messages[0].role).toBe('user')
      expect(store.currentChatSession?.messages[0].content).toBe('Hello')
      expect(store.currentChatSession?.messages[1].role).toBe('assistant')
      expect(store.currentChatSession?.messages[1].content).toBe('Test response')
      expect(store.error).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('includes context in first message only', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'reflect')

      // First message
      await store.sendMessage('First message')
      expect(vi.mocked(sendLLMMessage)).toHaveBeenCalledTimes(1)
      const firstCall = vi.mocked(sendLLMMessage).mock.calls[0]
      expect(firstCall[0][0].content).toContain('Journal Entry Context')

      // Second message
      await store.sendMessage('Second message')
      expect(vi.mocked(sendLLMMessage)).toHaveBeenCalledTimes(2)
      const secondCall = vi.mocked(sendLLMMessage).mock.calls[1]
      // Should not include context message again
      expect(secondCall[0].some((msg) => msg.content.includes('Journal Entry Context'))).toBe(
        false
      )
    })

    it('includes emotion and tag names in context message', async () => {
      const store = useChatStore()
      const mockEmotion: Emotion = {
        id: 'emotion-1',
        name: 'Happy',
        valence: 1,
        arousal: 1,
      }
      const mockPeopleTag: PeopleTag = { id: 'people-1', name: 'John' }
      const mockContextTag: ContextTag = { id: 'context-1', name: 'Work' }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        title: 'Test Title',
        body: 'Test body',
        emotionIds: ['emotion-1'],
        peopleTagIds: ['people-1'],
        contextTagIds: ['context-1'],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      mockEmotionStore.getEmotionById.mockReturnValue(mockEmotion)
      mockTagStore.getPeopleTagById.mockReturnValue(mockPeopleTag)
      mockTagStore.getContextTagById.mockReturnValue(mockContextTag)
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      // Mock constructJournalEntryContext to return context with emotion and tag names
      vi.mocked(constructJournalEntryContext).mockReturnValue(
        'Journal Entry Context:\nTitle: Test Title\nEmotions: Happy\nPeople Tags: John\nContext Tags: Work\nContent:\nTest body'
      )

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')

      const call = vi.mocked(sendLLMMessage).mock.calls[0]
      const contextMessage = call[0].find((msg) =>
        msg.content.includes('Journal Entry Context')
      )
      expect(contextMessage?.content).toContain('Happy')
      expect(contextMessage?.content).toContain('John')
      expect(contextMessage?.content).toContain('Work')
      // Verify constructJournalEntryContext was called with correct parameters
      expect(constructJournalEntryContext).toHaveBeenCalledWith(
        mockEntry,
        mockEmotionStore,
        mockTagStore
      )
    })

    it('manages loading state correctly', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      // Create a promise we can control
      // eslint-disable-next-line no-unused-vars
      let resolvePromise: (arg: string) => void
      const controlledPromise = new Promise<string>((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(sendLLMMessage).mockReturnValue(controlledPromise)

      await store.startChatSession('entry-1', 'reflect')
      const sendPromise = store.sendMessage('Hello')

      // Wait for Vue to process reactivity updates
      await nextTick()

      // Check loading is true during API call
      expect(store.isLoading).toBe(true)

      // Resolve the promise
      resolvePromise!('Response')
      await sendPromise

      // Check loading is false after API call
      expect(store.isLoading).toBe(false)
    })

    it('handles LLM service errors gracefully', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockRejectedValue(
        new Error('OpenAI API key is not configured. Please add your API key in Profile settings.')
      )

      await store.startChatSession('entry-1', 'reflect')

      await expect(store.sendMessage('Hello')).rejects.toThrow()

      expect(store.error).toBe(
        'OpenAI API key is not configured. Please add your API key in Profile settings.'
      )
      expect(store.currentChatSession?.messages).toHaveLength(0) // User message not added
      expect(store.isLoading).toBe(false)
    })

    it('does not add user message when API call fails', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockRejectedValue(new Error('Network error'))

      await store.startChatSession('entry-1', 'reflect')

      try {
        await store.sendMessage('Hello')
      } catch {
        // Expected to throw
      }

      expect(store.currentChatSession?.messages).toHaveLength(0)
    })

    it('throws error when journal entry is not found', async () => {
      const store = useChatStore()
      mockJournalStore.getEntryById.mockResolvedValue(undefined)

      await store.startChatSession('entry-1', 'reflect')

      await expect(store.sendMessage('Hello')).rejects.toThrow('Journal entry not found')
      expect(store.error).toBe('Journal entry not found.')
    })
  })

  describe('saveChatSession', () => {
    it('saves session to journal entry', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      mockJournalStore.updateEntry.mockResolvedValue({
        ...mockEntry,
        chatSessions: [],
      })
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')

      await store.saveChatSession()

      expect(mockJournalStore.updateEntry).toHaveBeenCalled()
      const updateCall = mockJournalStore.updateEntry.mock.calls[0][0]
      expect(updateCall.chatSessions).toHaveLength(1)
      expect(updateCall.chatSessions[0].messages).toHaveLength(2)
      expect(store.currentChatSession).toBeNull()
      expect(store.journalEntryId).toBeNull()
    })

    it('initializes chatSessions array if undefined', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        // chatSessions is undefined
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      mockJournalStore.updateEntry.mockResolvedValue({
        ...mockEntry,
        chatSessions: [],
      })
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')
      await store.saveChatSession()

      const updateCall = mockJournalStore.updateEntry.mock.calls[0][0]
      expect(Array.isArray(updateCall.chatSessions)).toBe(true)
      expect(updateCall.chatSessions).toHaveLength(1)
    })

    it('appends to existing chatSessions array', async () => {
      const store = useChatStore()
      const existingSession: ChatSession = {
        id: 'existing-session',
        journalEntryId: 'entry-1',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [existingSession],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      mockJournalStore.updateEntry.mockResolvedValue({
        ...mockEntry,
        chatSessions: [existingSession],
      })
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'proactive')
      await store.sendMessage('Hello')
      await store.saveChatSession()

      const updateCall = mockJournalStore.updateEntry.mock.calls[0][0]
      expect(updateCall.chatSessions).toHaveLength(2)
      expect(updateCall.chatSessions[0].id).toBe('existing-session')
    })

    it('throws error when no session exists', async () => {
      const store = useChatStore()

      await expect(store.saveChatSession()).rejects.toThrow(
        'No active chat session to save'
      )
      expect(store.error).toBe('No active chat session to save.')
    })

    it('throws error when session has no messages', async () => {
      const store = useChatStore()

      await store.startChatSession('entry-1', 'reflect')

      await expect(store.saveChatSession()).rejects.toThrow(
        'at least one message exchange is required'
      )
      expect(store.error).toContain('at least one message exchange')
    })

    it('throws error when session has only user message', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      await store.startChatSession('entry-1', 'reflect')
      // Manually add only a user message (simulating failed API call scenario)
      if (store.currentChatSession) {
        store.currentChatSession.messages.push({
          role: 'user',
          content: 'Hello',
          timestamp: new Date().toISOString(),
        })
      }

      await expect(store.saveChatSession()).rejects.toThrow(
        'at least one message exchange is required'
      )
    })

    it('throws error when journal entry is not found', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById
        .mockResolvedValueOnce(mockEntry) // For sendMessage
        .mockResolvedValueOnce(undefined) // For saveChatSession
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')

      await expect(store.saveChatSession()).rejects.toThrow('Journal entry not found')
    })

    it('handles updateEntry errors gracefully', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      mockJournalStore.updateEntry.mockRejectedValue(new Error('Update failed'))
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')

      await expect(store.saveChatSession()).rejects.toThrow('Update failed')
      expect(store.error).toBe('Update failed')
    })
  })

  describe('discardChatSession', () => {
    it('clears all state', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      vi.mocked(sendLLMMessage).mockResolvedValue('Response')

      await store.startChatSession('entry-1', 'reflect')
      await store.sendMessage('Hello')
      store.error = 'Some error'

      store.discardChatSession()

      expect(store.currentChatSession).toBeNull()
      expect(store.journalEntryId).toBeNull()
      expect(store.error).toBeNull()
    })

    it('does not error when no session exists', () => {
      const store = useChatStore()

      expect(() => store.discardChatSession()).not.toThrow()
      expect(store.currentChatSession).toBeNull()
      expect(store.journalEntryId).toBeNull()
    })
  })

  describe('loadChatSessionsForEntry', () => {
    it('returns chat sessions for an entry', async () => {
      const store = useChatStore()
      const existingSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-1',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [existingSession],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      const sessions = await store.loadChatSessionsForEntry('entry-1')

      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe('session-1')
    })

    it('returns empty array when entry has no chat sessions', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      const sessions = await store.loadChatSessionsForEntry('entry-1')

      expect(sessions).toEqual([])
    })

    it('returns empty array when chatSessions is undefined', async () => {
      const store = useChatStore()
      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        // chatSessions is undefined
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      const sessions = await store.loadChatSessionsForEntry('entry-1')

      expect(sessions).toEqual([])
    })

    it('throws error when entry is not found', async () => {
      const store = useChatStore()
      mockJournalStore.getEntryById.mockResolvedValue(undefined)

      await expect(store.loadChatSessionsForEntry('entry-1')).rejects.toThrow(
        'Journal entry not found'
      )
      expect(store.error).toBe('Journal entry not found.')
    })
  })

  describe('loadChatSession', () => {
    it('loads a single chat session and sets it as current session', async () => {
      const store = useChatStore()

      const existingSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-1',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
        ],
      }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [existingSession],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      const loaded = await store.loadChatSession('entry-1', 'session-1')

      expect(loaded).not.toBeNull()
      expect(loaded?.id).toBe('session-1')
      expect(store.currentChatSession?.id).toBe('session-1')
      expect(store.journalEntryId).toBe('entry-1')
    })

    it('returns a cloned session so stored data is not mutated', async () => {
      const store = useChatStore()

      const existingSession: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-1',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [
          {
            role: 'assistant',
            content: 'Original',
            timestamp: '2024-01-01T10:00:00.000Z',
          },
        ],
      }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [existingSession],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      const loaded = await store.loadChatSession('entry-1', 'session-1')

      expect(loaded).not.toBeNull()
      expect(loaded).not.toBe(existingSession)
      expect(loaded?.messages).not.toBe(existingSession.messages)

      // Mutate the loaded session and ensure the original is unchanged
      loaded?.messages.push({
        role: 'user',
        content: 'New message',
        timestamp: '2024-01-01T11:00:00.000Z',
      })

      expect(existingSession.messages).toHaveLength(1)
      expect(existingSession.messages[0].content).toBe('Original')
    })

    it('returns null and sets error when session is not found', async () => {
      const store = useChatStore()

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      const loaded = await store.loadChatSession('entry-1', 'missing-session')

      expect(loaded).toBeNull()
      expect(store.error).toBe('Chat session not found.')
      expect(store.currentChatSession).toBeNull()
      expect(store.journalEntryId).toBeNull()
    })

    it('throws error when journal entry is not found', async () => {
      const store = useChatStore()
      mockJournalStore.getEntryById.mockResolvedValue(undefined)

      await expect(
        store.loadChatSession('entry-1', 'session-1')
      ).rejects.toThrow('Journal entry not found')

      expect(store.error).toBe('Journal entry not found.')
    })
  })

  describe('deleteChatSession', () => {
    it('deletes a chat session from a journal entry and updates store', async () => {
      const store = useChatStore()

      const session1: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-1',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }
      const session2: ChatSession = {
        id: 'session-2',
        journalEntryId: 'entry-1',
        intention: 'proactive',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [session1, session2],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)
      mockJournalStore.updateEntry.mockResolvedValue({
        ...mockEntry,
        chatSessions: [session2],
      })

      await store.deleteChatSession('entry-1', 'session-1')

      expect(mockJournalStore.updateEntry).toHaveBeenCalled()
      const updated = mockJournalStore.updateEntry.mock.calls[0][0] as JournalEntry
      expect(updated.chatSessions).toHaveLength(1)
      expect(updated.chatSessions?.[0].id).toBe('session-2')
    })

    it('is a no-op when the session does not exist', async () => {
      const store = useChatStore()

      const session1: ChatSession = {
        id: 'session-1',
        journalEntryId: 'entry-1',
        intention: 'reflect',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      const mockEntry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        chatSessions: [session1],
      }

      mockJournalStore.getEntryById.mockResolvedValue(mockEntry)

      await store.deleteChatSession('entry-1', 'missing-session')

      expect(mockJournalStore.updateEntry).not.toHaveBeenCalled()
      expect(store.error).toBeNull()
    })

    it('throws error when journal entry is not found', async () => {
      const store = useChatStore()
      mockJournalStore.getEntryById.mockResolvedValue(undefined)

      await expect(
        store.deleteChatSession('entry-1', 'session-1')
      ).rejects.toThrow('Journal entry not found')

      expect(store.error).toBe('Journal entry not found.')
    })
  })
})

