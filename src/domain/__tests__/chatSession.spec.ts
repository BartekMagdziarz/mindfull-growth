import { describe, it, expect } from 'vitest'
import type {
  ChatSession,
  ChatMessage,
  ChatIntention,
} from '../chatSession'
import {
  CHAT_INTENTIONS,
  isValidChatIntention,
  createChatSession,
  createChatMessage,
} from '../chatSession'
import type { JournalEntry } from '../journal'

describe('ChatSession Domain Model', () => {
  describe('Type Definitions', () => {
    it('ChatIntention type accepts valid values', () => {
      const intentions: ChatIntention[] = [
        CHAT_INTENTIONS.REFLECT,
        CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY,
        CHAT_INTENTIONS.PROACTIVE,
        CHAT_INTENTIONS.THINKING_TRAPS,
        CHAT_INTENTIONS.CUSTOM,
      ]

      intentions.forEach((intention) => {
        expect(intention).toBeDefined()
        expect(typeof intention).toBe('string')
      })
    })

    it('ChatMessage interface has required fields', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test message',
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      expect(message.role).toBe('user')
      expect(message.content).toBe('Test message')
      expect(message.timestamp).toBe('2024-01-01T00:00:00.000Z')
    })

    it('ChatMessage accepts both user and assistant roles', () => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'User message',
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'Assistant message',
        timestamp: '2024-01-01T00:00:00.000Z',
      }

      expect(userMessage.role).toBe('user')
      expect(assistantMessage.role).toBe('assistant')
    })

    it('ChatSession interface has all required fields', () => {
      const session: ChatSession = {
        id: 'test-id',
        journalEntryId: 'journal-id',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      expect(session.id).toBe('test-id')
      expect(session.journalEntryId).toBe('journal-id')
      expect(session.intention).toBe(CHAT_INTENTIONS.REFLECT)
      expect(session.createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(Array.isArray(session.messages)).toBe(true)
      expect(session.messages.length).toBe(0)
    })

    it('ChatSession can have optional customPrompt when intention is custom', () => {
      const session: ChatSession = {
        id: 'test-id',
        journalEntryId: 'journal-id',
        intention: CHAT_INTENTIONS.CUSTOM,
        customPrompt: 'Custom prompt text',
        createdAt: '2024-01-01T00:00:00.000Z',
        messages: [],
      }

      expect(session.intention).toBe(CHAT_INTENTIONS.CUSTOM)
      expect(session.customPrompt).toBe('Custom prompt text')
    })

    it('ChatSession can have messages array', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-01T00:01:00.000Z',
        },
      ]

      const session: ChatSession = {
        id: 'test-id',
        journalEntryId: 'journal-id',
        intention: CHAT_INTENTIONS.REFLECT,
        createdAt: '2024-01-01T00:00:00.000Z',
        messages,
      }

      expect(session.messages).toHaveLength(2)
      expect(session.messages[0].role).toBe('user')
      expect(session.messages[1].role).toBe('assistant')
    })
  })

  describe('Validation Utilities', () => {
    describe('isValidChatIntention', () => {
      it('returns true for valid intention values', () => {
        expect(isValidChatIntention(CHAT_INTENTIONS.REFLECT)).toBe(true)
        expect(isValidChatIntention(CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY)).toBe(
          true
        )
        expect(isValidChatIntention(CHAT_INTENTIONS.PROACTIVE)).toBe(true)
        expect(isValidChatIntention(CHAT_INTENTIONS.THINKING_TRAPS)).toBe(true)
        expect(isValidChatIntention(CHAT_INTENTIONS.CUSTOM)).toBe(true)
      })

      it('returns false for invalid intention values', () => {
        expect(isValidChatIntention('invalid')).toBe(false)
        expect(isValidChatIntention('')).toBe(false)
        expect(isValidChatIntention('reflect ')).toBe(false) // with space
        expect(isValidChatIntention('REFLECT')).toBe(false) // wrong case
      })
    })
  })

  describe('Factory Functions', () => {
    describe('createChatSession', () => {
      it('creates a ChatSession with UUID and timestamps', () => {
        const journalEntryId = 'journal-123'
        const intention = CHAT_INTENTIONS.REFLECT

        const session = createChatSession(journalEntryId, intention)

        expect(session.id).toBeDefined()
        expect(session.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        ) // UUID format
        expect(session.journalEntryId).toBe(journalEntryId)
        expect(session.intention).toBe(intention)
        expect(session.createdAt).toBeDefined()
        expect(new Date(session.createdAt).getTime()).toBeGreaterThan(0) // Valid ISO timestamp
        expect(Array.isArray(session.messages)).toBe(true)
        expect(session.messages.length).toBe(0)
      })

      it('does not include customPrompt when intention is not custom', () => {
        const session = createChatSession(
          'journal-123',
          CHAT_INTENTIONS.REFLECT
        )

        expect(session.customPrompt).toBeUndefined()
      })

      it('includes customPrompt when intention is custom and prompt is provided', () => {
        const customPrompt = 'Help me think about this differently'
        const session = createChatSession(
          'journal-123',
          CHAT_INTENTIONS.CUSTOM,
          customPrompt
        )

        expect(session.intention).toBe(CHAT_INTENTIONS.CUSTOM)
        expect(session.customPrompt).toBe(customPrompt)
      })

      it('does not include customPrompt when intention is custom but prompt is not provided', () => {
        const session = createChatSession(
          'journal-123',
          CHAT_INTENTIONS.CUSTOM
        )

        expect(session.intention).toBe(CHAT_INTENTIONS.CUSTOM)
        expect(session.customPrompt).toBeUndefined()
      })

      it('creates unique IDs for each session', () => {
        const session1 = createChatSession('journal-123', CHAT_INTENTIONS.REFLECT)
        const session2 = createChatSession('journal-123', CHAT_INTENTIONS.REFLECT)

        expect(session1.id).not.toBe(session2.id)
      })
    })

    describe('createChatMessage', () => {
      it('creates a ChatMessage with timestamp', () => {
        const role = 'user'
        const content = 'Test message content'

        const message = createChatMessage(role, content)

        expect(message.role).toBe(role)
        expect(message.content).toBe(content)
        expect(message.timestamp).toBeDefined()
        expect(new Date(message.timestamp).getTime()).toBeGreaterThan(0) // Valid ISO timestamp
      })

      it('creates messages with user role', () => {
        const message = createChatMessage('user', 'User message')

        expect(message.role).toBe('user')
        expect(message.content).toBe('User message')
      })

      it('creates messages with assistant role', () => {
        const message = createChatMessage('assistant', 'Assistant message')

        expect(message.role).toBe('assistant')
        expect(message.content).toBe('Assistant message')
      })

      it('generates timestamps for messages', () => {
        const before = new Date().toISOString()
        const message = createChatMessage('user', 'Test')
        const after = new Date().toISOString()

        expect(message.timestamp >= before).toBe(true)
        expect(message.timestamp <= after).toBe(true)
      })
    })
  })

  describe('JournalEntry Integration', () => {
    it('JournalEntry can have chatSessions field', () => {
      const entry: JournalEntry = {
        id: 'entry-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        chatSessions: [],
      }

      expect(entry.chatSessions).toBeDefined()
      expect(Array.isArray(entry.chatSessions)).toBe(true)
    })

    it('JournalEntry chatSessions is optional', () => {
      const entry: JournalEntry = {
        id: 'entry-2',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
      }

      expect(entry.chatSessions).toBeUndefined()
    })

    it('JournalEntry can have multiple chat sessions', () => {
      const chatSession1 = createChatSession('entry-3', CHAT_INTENTIONS.REFLECT)
      const chatSession2 = createChatSession(
        'entry-3',
        CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY
      )

      const entry: JournalEntry = {
        id: 'entry-3',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        chatSessions: [chatSession1, chatSession2],
      }

      expect(entry.chatSessions).toHaveLength(2)
      expect(entry.chatSessions?.[0].intention).toBe(CHAT_INTENTIONS.REFLECT)
      expect(entry.chatSessions?.[1].intention).toBe(
        CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY
      )
    })

    it('TypeScript correctly infers types when accessing chatSessions', () => {
      const entry: JournalEntry = {
        id: 'entry-4',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        body: 'Test body',
        chatSessions: [
          {
            id: 'session-1',
            journalEntryId: 'entry-4',
            intention: CHAT_INTENTIONS.REFLECT,
            createdAt: '2024-01-01T00:00:00.000Z',
            messages: [],
          },
        ],
      }

      // TypeScript should infer the type correctly
      const sessionCount = entry.chatSessions?.length ?? 0
      expect(sessionCount).toBe(1)

      if (entry.chatSessions && entry.chatSessions.length > 0) {
        const firstSession = entry.chatSessions[0]
        expect(firstSession.intention).toBe(CHAT_INTENTIONS.REFLECT)
      }
    })
  })
})

