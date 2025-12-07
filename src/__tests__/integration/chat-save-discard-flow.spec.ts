import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDatabase, getAllJournalEntries } from '../utils/dbTestUtils'
import { initializeStores } from './testUtils'
import { useChatStore } from '@/stores/chat.store'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import type { ChatSession } from '@/domain/chatSession'

// Mock LLM service
vi.mock('@/services/llmService', () => ({
  sendMessage: vi.fn().mockResolvedValue('Mock AI response'),
}))

describe('Chat Save Discard Flow Integration', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('saves chat session to journal entry after conversation', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    // Load required data
    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create a journal entry
    const entry = await journalStore.createEntry({
      title: 'Test Entry',
      body: 'Test body content',
    })

    // Start a chat session
    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.REFLECT)

    // Send a message (this will add user and assistant messages)
    await chatStore.sendMessage('Hello, how are you?')

    // Verify session has messages
    expect(chatStore.currentChatSession).not.toBeNull()
    expect(chatStore.currentChatSession?.messages.length).toBeGreaterThanOrEqual(2)

    // Save the chat session
    await chatStore.saveChatSession()

    // Verify session is cleared
    expect(chatStore.currentChatSession).toBeNull()

    // Reload entry from database
    const updatedEntry = await journalStore.getEntryById(entry.id)
    expect(updatedEntry).not.toBeUndefined()
    expect(updatedEntry?.chatSessions).toBeDefined()
    expect(updatedEntry?.chatSessions?.length).toBe(1)

    // Verify chat session content
    const savedSession = updatedEntry?.chatSessions?.[0]
    expect(savedSession).toBeDefined()
    expect(savedSession?.journalEntryId).toBe(entry.id)
    expect(savedSession?.intention).toBe(CHAT_INTENTIONS.REFLECT)
    expect(savedSession?.messages.length).toBeGreaterThanOrEqual(2)

    // Verify persistence in database
    const entriesInDb = await getAllJournalEntries()
    expect(entriesInDb).toHaveLength(1)
    expect(entriesInDb[0].chatSessions?.length).toBe(1)
  })

  it('discards chat session without saving', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    // Load required data
    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create a journal entry
    const entry = await journalStore.createEntry({
      title: 'Test Entry',
      body: 'Test body content',
    })

    // Start a chat session
    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.REFLECT)

    // Send a message
    await chatStore.sendMessage('Hello, how are you?')

    // Verify session has messages
    expect(chatStore.currentChatSession).not.toBeNull()
    expect(chatStore.currentChatSession?.messages.length).toBeGreaterThanOrEqual(2)

    // Discard the chat session
    chatStore.discardChatSession()

    // Verify session is cleared
    expect(chatStore.currentChatSession).toBeNull()

    // Reload entry from database
    const updatedEntry = await journalStore.getEntryById(entry.id)
    expect(updatedEntry).not.toBeUndefined()
    expect(updatedEntry?.chatSessions).toBeUndefined()

    // Verify no chat sessions in database
    const entriesInDb = await getAllJournalEntries()
    expect(entriesInDb).toHaveLength(1)
    expect(entriesInDb[0].chatSessions).toBeUndefined()
  })

  it('preserves existing chat sessions when saving a new one', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    // Load required data
    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create a journal entry with an existing chat session
    const existingSession: ChatSession = {
      id: 'existing-session-1',
      journalEntryId: 'entry-1',
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
          content: 'First response',
          timestamp: '2024-01-01T10:01:00.000Z',
        },
      ],
    }

    const entry = await journalStore.createEntry({
      title: 'Test Entry',
      body: 'Test body content',
    })

    // Add existing session to entry
    const entryWithSession = {
      ...entry,
      chatSessions: [existingSession],
    }
    await journalStore.updateEntry(entryWithSession)

    // Start a new chat session
    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY)

    // Store the new session ID before saving
    const newSessionId = chatStore.currentChatSession?.id
    expect(newSessionId).toBeDefined()

    // Send a message
    await chatStore.sendMessage('New conversation')

    // Save the new chat session
    await chatStore.saveChatSession()

    // Reload entry from database
    const updatedEntry = await journalStore.getEntryById(entry.id)
    expect(updatedEntry?.chatSessions?.length).toBe(2)

    // Verify both sessions exist
    const sessionIds = updatedEntry?.chatSessions?.map((s) => s.id) || []
    expect(sessionIds).toContain('existing-session-1')
    expect(sessionIds).toContain(newSessionId)
  })

  it('handles save error gracefully', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    // Load required data
    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create a journal entry
    const entry = await journalStore.createEntry({
      title: 'Test Entry',
      body: 'Test body content',
    })

    // Start a chat session
    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.REFLECT)

    // Send a message
    await chatStore.sendMessage('Hello')

    // Delete the entry to simulate error
    await journalStore.deleteEntry(entry.id)

    // Try to save - should throw error
    await expect(chatStore.saveChatSession()).rejects.toThrow()

    // Verify error is set
    expect(chatStore.error).not.toBeNull()

    // Verify session is still in memory (not cleared on error)
    expect(chatStore.currentChatSession).not.toBeNull()
  })

  it('prevents saving session with insufficient messages', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    // Load required data
    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create a journal entry
    const entry = await journalStore.createEntry({
      title: 'Test Entry',
      body: 'Test body content',
    })

    // Start a chat session
    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.REFLECT)

    // Don't send any messages - session has no messages

    // Try to save - should throw error
    await expect(chatStore.saveChatSession()).rejects.toThrow()

    // Verify error message
    expect(chatStore.error).toContain('message exchange')
  })
})

