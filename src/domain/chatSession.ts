export type ChatIntention =
  | 'reflect'
  | 'help-see-differently'
  | 'proactive'
  | 'thinking-traps'
  | 'custom'

export const CHAT_INTENTIONS = {
  REFLECT: 'reflect',
  HELP_SEE_DIFFERENTLY: 'help-see-differently',
  PROACTIVE: 'proactive',
  THINKING_TRAPS: 'thinking-traps',
  CUSTOM: 'custom',
} as const

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO timestamp
}

export interface ChatSession {
  id: string // UUID
  journalEntryId: string // Reference to the journal entry this chat belongs to
  intention: ChatIntention // One of: "reflect", "help-see-differently", "proactive", "thinking-traps", "custom"
  customPrompt?: string // Optional, only present if intention is "custom"
  createdAt: string // ISO timestamp, when the chat session was created
  messages: ChatMessage[] // Array of conversation messages
}

/**
 * Validates that an intention string is one of the allowed ChatIntention values.
 *
 * @param intention - The intention string to validate
 * @returns true if the intention is valid, false otherwise
 */
export function isValidChatIntention(intention: string): boolean {
  return (
    intention === CHAT_INTENTIONS.REFLECT ||
    intention === CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY ||
    intention === CHAT_INTENTIONS.PROACTIVE ||
    intention === CHAT_INTENTIONS.THINKING_TRAPS ||
    intention === CHAT_INTENTIONS.CUSTOM
  )
}

/**
 * Factory function to create a new ChatSession with proper defaults.
 * Generates a UUID for the session ID and sets the createdAt timestamp.
 *
 * @param journalEntryId - The ID of the journal entry this chat belongs to
 * @param intention - The intention for this chat session
 * @param customPrompt - Optional custom prompt (only used when intention is "custom")
 * @returns A new ChatSession with id, createdAt, and empty messages array
 */
export function createChatSession(
  journalEntryId: string,
  intention: ChatIntention,
  customPrompt?: string
): ChatSession {
  const now = new Date().toISOString()
  const session: ChatSession = {
    id: crypto.randomUUID(),
    journalEntryId,
    intention,
    createdAt: now,
    messages: [],
  }

  // Only include customPrompt if intention is "custom"
  if (intention === CHAT_INTENTIONS.CUSTOM && customPrompt) {
    session.customPrompt = customPrompt
  }

  return session
}

/**
 * Factory function to create a new ChatMessage with a timestamp.
 *
 * @param role - The role of the message sender ("user" or "assistant")
 * @param content - The message text content
 * @returns A new ChatMessage with timestamp set to current time
 */
export function createChatMessage(
  role: 'user' | 'assistant',
  content: string
): ChatMessage {
  return {
    role,
    content,
    timestamp: new Date().toISOString(),
  }
}

