import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { CHAT_COPY } from '@/constants/chatCopy'

// OpenAI API endpoint
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Default model configuration
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 500

// API key storage key
const API_KEY_STORAGE_KEY = 'openaiApiKey'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  error?: {
    message: string
    type: string
  }
}

/**
 * Retrieves the OpenAI API key from user settings
 * @throws Error if API key is not configured
 */
async function getApiKey(): Promise<string> {
  const apiKey = await userSettingsDexieRepository.get(API_KEY_STORAGE_KEY)
  if (!apiKey) {
    throw new Error(CHAT_COPY.errors.missingApiKey)
  }
  return apiKey
}

/**
 * Sends a message to the OpenAI API and returns the assistant's response
 * @param messages Array of conversation messages
 * @param systemPrompt Optional system prompt to set the AI's behavior
 * @returns The assistant's message content
 * @throws Error with user-friendly message if API call fails
 */
export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  try {
    // Retrieve API key
    const apiKey = await getApiKey()

    // Construct messages array with system prompt if provided
    const requestMessages: ChatMessage[] = []
    if (systemPrompt) {
      requestMessages.push({ role: 'system', content: systemPrompt })
    }
    requestMessages.push(...messages)

    // Construct request payload
    const requestBody = {
      model: DEFAULT_MODEL,
      messages: requestMessages,
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS,
    }

    // Send POST request to OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(CHAT_COPY.errors.invalidApiKey)
      }
      if (response.status === 429) {
        throw new Error(CHAT_COPY.errors.rateLimit)
      }

      // Try to parse error response from OpenAI
      let errorMessage: string | null = null
      try {
        const errorData: OpenAIResponse = await response.json()
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        }
      } catch {
        // If parsing fails, use generic error message
      }

      if (errorMessage) {
        throw new Error(errorMessage)
      }

      throw new Error(CHAT_COPY.errors.genericApi(response.status))
    }

    // Parse successful response
    const data: OpenAIResponse = await response.json()

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Invalid response from API. Please try again.')
    }

    const content = data.choices[0].message.content
    if (!content) {
      throw new Error('Empty response from API. Please try again.')
    }

    return content
  } catch (error) {
    // Re-throw user-friendly errors as-is
    if (error instanceof Error && error.message.includes('API key')) {
      throw error
    }
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error during API call:', error)
      throw new Error(CHAT_COPY.errors.network)
    }

    // Log other errors for debugging (without exposing API key)
    console.error('Error during LLM API call:', error)

    // Re-throw if it's already a user-friendly error
    if (error instanceof Error) {
      throw error
    }

    // Fallback error message
    throw new Error('An unexpected error occurred. Please try again.')
  }
}

