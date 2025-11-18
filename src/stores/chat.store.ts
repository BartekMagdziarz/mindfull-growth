import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ChatSession,
  ChatIntention,
} from '@/domain/chatSession'
import {
  createChatSession,
  createChatMessage,
  isValidChatIntention,
} from '@/domain/chatSession'
import { sendMessage as sendLLMMessage } from '@/services/llmService'
import type { ChatMessage as LLMChatMessage } from '@/services/llmService'
import {
  getSystemPrompt,
  constructJournalEntryContext,
} from '@/services/chatPrompts'
import { useJournalStore } from './journal.store'
import { useEmotionStore } from './emotion.store'
import { useTagStore } from './tag.store'
import type { JournalEntry } from '@/domain/journal'
import { CHAT_COPY } from '@/constants/chatCopy'

export const useChatStore = defineStore('chat', () => {
  // State
  const currentChatSession = ref<ChatSession | null>(null)
  const isLoading = ref<boolean>(false)
  const isSaving = ref<boolean>(false)
  const error = ref<string | null>(null)
  const journalEntryId = ref<string | null>(null)

  // Getters
  const hasUnsavedMessages = computed(() => {
    return (
      currentChatSession.value !== null &&
      currentChatSession.value.messages.length > 0
    )
  })

  // Actions
  async function startChatSession(
    entryId: string,
    intention: ChatIntention,
    customPrompt?: string
  ): Promise<void> {
    error.value = null

    // Validate intention
    if (!isValidChatIntention(intention)) {
      error.value = `Invalid chat intention: ${intention}`
      throw new Error(`Invalid chat intention: ${intention}`)
    }

    // Create new chat session using factory function
    const newSession = createChatSession(entryId, intention, customPrompt)

    // Set state
    currentChatSession.value = newSession
    journalEntryId.value = entryId
  }

  async function sendMessage(message: string): Promise<void> {
    // Validate current session exists
    if (!currentChatSession.value) {
      error.value = CHAT_COPY.chat.noActiveSession
      throw new Error('No active chat session')
    }

    if (!journalEntryId.value) {
      error.value = 'Journal entry ID is missing.'
      throw new Error('Journal entry ID is missing')
    }

    // Retrieve journal entry for context
    const journalStore = useJournalStore()
    const entry = await journalStore.getEntryById(journalEntryId.value)

    if (!entry) {
      error.value = CHAT_COPY.chat.entryNotFound
      throw new Error('Journal entry not found')
    }

    // Check if this is the first message
    const isFirstMessage = currentChatSession.value.messages.length === 0

    // Construct messages array for LLM
    const messagesToSend: LLMChatMessage[] = []

    if (isFirstMessage) {
      // Add context message
      const emotionStore = useEmotionStore()
      const tagStore = useTagStore()
      const contextMessage = constructJournalEntryContext(
        entry,
        emotionStore,
        tagStore
      )
      messagesToSend.push({ role: 'user', content: contextMessage })
    }

    // Add conversation history (existing messages)
    for (const msg of currentChatSession.value.messages) {
      messagesToSend.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add new user message
    messagesToSend.push({ role: 'user', content: message })

    // Set loading state
    isLoading.value = true
    error.value = null

    try {
      // Get system prompt for LLM service
      const systemPrompt = getSystemPrompt(
        currentChatSession.value.intention,
        currentChatSession.value.customPrompt
      )

      // Call LLM service
      const assistantResponse = await sendLLMMessage(messagesToSend, systemPrompt)

      // Add user message and assistant response to session
      if (currentChatSession.value) {
        currentChatSession.value.messages.push(
          createChatMessage('user', message),
          createChatMessage('assistant', assistantResponse)
        )
      }

      error.value = null
    } catch (err) {
      // LLM service already provides user-friendly error messages
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while sending the message.'
      error.value = errorMessage
      console.error('Error sending message to LLM:', err)
      // Do NOT add user message to session (Option A approach)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function saveChatSession(): Promise<void> {
    isSaving.value = true
    error.value = null

    try {
      // Validate current session exists
      if (!currentChatSession.value) {
        error.value = CHAT_COPY.chat.noSessionToSave
        throw new Error('No active chat session to save.')
      }

      // Validate session has at least one message exchange (user + assistant)
      const messages = currentChatSession.value.messages
      if (messages.length < 2) {
        error.value = CHAT_COPY.chat.saveRequirements
        throw new Error(
          'Cannot save chat session: at least one message exchange is required'
        )
      }

      // Check that we have both user and assistant messages
      const hasUserMessage = messages.some((msg) => msg.role === 'user')
      const hasAssistantMessage = messages.some((msg) => msg.role === 'assistant')
      if (!hasUserMessage || !hasAssistantMessage) {
        error.value = CHAT_COPY.chat.saveRequirements
        throw new Error(
          'Cannot save chat session: conversation must include both user and assistant messages'
        )
      }

      if (!journalEntryId.value) {
        error.value = 'Journal entry ID is missing.'
        throw new Error('Journal entry ID is missing')
      }

      // Retrieve journal entry
      const journalStore = useJournalStore()
      const entry = await journalStore.getEntryById(journalEntryId.value)

      if (!entry) {
        error.value = CHAT_COPY.chat.entryNotFound
        throw new Error('Journal entry not found')
      }

      // Initialize chatSessions array if undefined/null
      const existingChatSessions = entry.chatSessions ?? []

      // Serialize existing chat sessions to ensure they're plain objects
      // (Vue reactive objects can't be directly stored in IndexedDB)
      const serializedExistingSessions: ChatSession[] = existingChatSessions.map(
        (session) => ({
          id: session.id,
          journalEntryId: session.journalEntryId,
          intention: session.intention,
          createdAt: session.createdAt,
          messages: session.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
          ...(session.customPrompt && { customPrompt: session.customPrompt }),
        })
      )

      // Create a plain object copy of the current chat session to ensure it's serializable
      const sessionToSave: ChatSession = {
        id: currentChatSession.value.id,
        journalEntryId: currentChatSession.value.journalEntryId,
        intention: currentChatSession.value.intention,
        createdAt: currentChatSession.value.createdAt,
        messages: currentChatSession.value.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      }
      if (currentChatSession.value.customPrompt) {
        sessionToSave.customPrompt = currentChatSession.value.customPrompt
      }

      // Create a plain object copy of the entire entry to ensure all properties are serializable
      // (Vue reactive objects can't be directly stored in IndexedDB)
      const updatedEntry: JournalEntry = {
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        title: entry.title,
        body: entry.body,
        emotionIds: entry.emotionIds ? [...entry.emotionIds] : [],
        peopleTagIds: entry.peopleTagIds ? [...entry.peopleTagIds] : [],
        contextTagIds: entry.contextTagIds ? [...entry.contextTagIds] : [],
        chatSessions: [...serializedExistingSessions, sessionToSave],
      }

      // Update entry using journal store
      await journalStore.updateEntry(updatedEntry)

      // Clear state on success
      currentChatSession.value = null
      journalEntryId.value = null
      error.value = null
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to save chat session to journal entry.'
      error.value = errorMessage
      console.error('Error saving chat session:', err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function discardChatSession(): void {
    currentChatSession.value = null
    journalEntryId.value = null
    error.value = null
  }
  
  async function loadChatSessionsForEntry(
    entryId: string
  ): Promise<ChatSession[]> {
    error.value = null
    try {
      const journalStore = useJournalStore()
      const entry = await journalStore.getEntryById(entryId)

      if (!entry) {
        error.value = CHAT_COPY.chat.entryNotFound
        throw new Error('Journal entry not found')
      }

      return entry.chatSessions ?? []
    } catch (err) {
      // Only set error if it hasn't been set already
      if (!error.value) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Failed to load chat sessions for entry ${entryId}`
        error.value = errorMessage
      }
      console.error(`Error loading chat sessions for entry ${entryId}:`, err)
      throw err
    }
  }

  /**
   * Loads a single chat session for a given entry and sets it as the current session.
   * Returns the loaded session or null if not found.
   */
  async function loadChatSession(
    entryId: string,
    chatSessionId: string
  ): Promise<ChatSession | null> {
    error.value = null

    try {
      const journalStore = useJournalStore()
      const entry = await journalStore.getEntryById(entryId)

      if (!entry) {
        const message = 'Journal entry not found.'
        error.value = message
        throw new Error(message)
      }

      const session = (entry.chatSessions ?? []).find(
        (cs) => cs.id === chatSessionId
      )

      if (!session) {
        const message = 'Chat session not found.'
        error.value = message
        return null
      }

      // Create a plain-object clone so that viewing a saved session
      // does not accidentally mutate the stored data.
      const clonedSession: ChatSession = {
        id: session.id,
        journalEntryId: session.journalEntryId,
        intention: session.intention,
        createdAt: session.createdAt,
        messages: session.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      }

      if (session.customPrompt) {
        clonedSession.customPrompt = session.customPrompt
      }

      currentChatSession.value = clonedSession
      journalEntryId.value = entryId
      return clonedSession
    } catch (err) {
      if (!error.value) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Failed to load chat session ${chatSessionId} for entry ${entryId}`
        error.value = errorMessage
      }
      console.error(
        `Error loading chat session ${chatSessionId} for entry ${entryId}:`,
        err
      )
      throw err
    }
  }

  /**
   * Deletes a single chat session from a journal entry.
   */
  async function deleteChatSession(
    entryId: string,
    chatSessionId: string
  ): Promise<void> {
    error.value = null
    try {
      const journalStore = useJournalStore()
      const entry = await journalStore.getEntryById(entryId)

      if (!entry) {
        const message = 'Journal entry not found.'
        error.value = message
        throw new Error(message)
      }

      const existingSessions = entry.chatSessions ?? []
      const updatedSessions = existingSessions.filter(
        (session) => session.id !== chatSessionId
      )

      // If nothing changed, just return (no-op)
      if (updatedSessions.length === existingSessions.length) {
        return
      }

      const updatedEntry: JournalEntry = {
        ...entry,
        chatSessions: updatedSessions,
      }

      await journalStore.updateEntry(updatedEntry)
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : `Failed to delete chat session ${chatSessionId} for entry ${entryId}`
      error.value = errorMessage
      console.error(
        `Error deleting chat session ${chatSessionId} for entry ${entryId}:`,
        err
      )
      throw err
    }
  }

  return {
    // State
    currentChatSession,
    isLoading,
    isSaving,
    error,
    journalEntryId,
    // Getters
    hasUnsavedMessages,
    // Actions
    startChatSession,
    sendMessage,
    saveChatSession,
    discardChatSession,
    loadChatSessionsForEntry,
    loadChatSession,
    deleteChatSession,
  }
})

