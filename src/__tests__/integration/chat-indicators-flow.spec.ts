import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDatabase, getAllJournalEntries } from '../utils/dbTestUtils'
import { initializeStores } from './testUtils'
import { useChatStore } from '@/stores/chat.store'
import { CHAT_INTENTIONS } from '@/domain/chatSession'

// Mock LLM service to avoid network calls
vi.mock('@/services/llmService', () => ({
  sendMessage: vi.fn().mockResolvedValue('Mock AI response'),
}))

describe('Chat Indicators Flow Integration', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('adds chat session to entry and reflects indicator count', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create an entry
    const entry = await journalStore.createEntry({
      title: 'Entry with chat',
      body: 'Some reflective text',
    })

    // Start and complete a chat session
    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.REFLECT)
    await chatStore.sendMessage('Hello, can you help me reflect?')
    await chatStore.saveChatSession()

    // Reload entry and check chatSessions
    const updatedEntry = await journalStore.getEntryById(entry.id)
    expect(updatedEntry?.chatSessions).toBeDefined()
    expect(updatedEntry?.chatSessions?.length).toBe(1)

    // Check persisted data
    const entriesInDb = await getAllJournalEntries()
    expect(entriesInDb[0].chatSessions?.length).toBe(1)
  })

  it('allows viewing an existing chat session via ChatView (historical mode)', async () => {
    const { journalStore, emotionStore } = initializeStores()
    const chatStore = useChatStore()

    await emotionStore.loadEmotions()
    await journalStore.loadEntries()

    // Create an entry and a chat session
    const entry = await journalStore.createEntry({
      title: 'Entry with chat',
      body: 'Some reflective text',
    })

    await chatStore.startChatSession(entry.id, CHAT_INTENTIONS.REFLECT)
    await chatStore.sendMessage('First message')
    await chatStore.saveChatSession()

    const updatedEntry = await journalStore.getEntryById(entry.id)
    expect(updatedEntry?.chatSessions?.length).toBe(1)

    const savedSession = updatedEntry!.chatSessions![0]

    // Load the saved session into the chat store as if visiting historical view
    const loaded = await chatStore.loadChatSession(entry.id, savedSession.id)
    expect(loaded).not.toBeNull()
    expect(chatStore.currentChatSession?.id).toBe(savedSession.id)
    expect(chatStore.currentChatSession?.messages.length).toBe(
      savedSession.messages.length
    )
  })
})


