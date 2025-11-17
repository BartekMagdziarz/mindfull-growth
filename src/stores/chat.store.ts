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

export const useChatStore = defineStore('chat', () => {
  // State
  const currentChatSession = ref<ChatSession | null>(null)
  const isLoading = ref<boolean>(false)
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
      error.value = 'No active chat session. Please start a chat session first.'
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
      error.value = 'Journal entry not found.'
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
    // Validate current session exists
    if (!currentChatSession.value) {
      error.value = 'No active chat session to save.'
      throw new Error('No active chat session to save')
    }

    // Validate session has at least one message exchange (user + assistant)
    const messages = currentChatSession.value.messages
    if (messages.length < 2) {
      error.value =
        'Cannot save chat session: at least one message exchange (user message and assistant response) is required.'
      throw new Error(
        'Cannot save chat session: at least one message exchange is required'
      )
    }

    // Check that we have both user and assistant messages
    const hasUserMessage = messages.some((msg) => msg.role === 'user')
    const hasAssistantMessage = messages.some((msg) => msg.role === 'assistant')
    if (!hasUserMessage || !hasAssistantMessage) {
      error.value =
        'Cannot save chat session: conversation must include both user and assistant messages.'
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
      error.value = 'Journal entry not found.'
      throw new Error('Journal entry not found')
    }

    try {
      // Initialize chatSessions array if undefined/null
      const chatSessions = entry.chatSessions ?? []

      // Add current session to entry's chatSessions array
      const updatedEntry: JournalEntry = {
        ...entry,
        chatSessions: [...chatSessions, currentChatSession.value],
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
        error.value = 'Journal entry not found.'
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

  return {
    // State
    currentChatSession,
    isLoading,
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
  }
})

