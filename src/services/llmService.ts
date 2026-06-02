import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { CHAT_COPY } from '@/constants/chatCopy'

// Default model configuration
export const DEFAULT_MODEL = 'gpt-5-nano'
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_MAX_TOKENS = 500

/**
 * Local "thinking" models (e.g. Gemma via Ollama or MLX) emit a chain-of-thought
 * into a separate `reasoning` field that still counts against `max_tokens`. Without
 * extra budget the reasoning can swallow the whole allowance and leave `content`
 * empty. For local providers we add this headroom on top of the requested answer
 * budget so the visible answer is never starved. Hosted models (OpenAI) are billed
 * per token and left untouched. The model still stops at its natural end token, so
 * the larger cap does not slow short replies down.
 */
const LOCAL_REASONING_HEADROOM = 2048

export type AIProviderId = 'openai' | 'ollama' | 'mlx' | 'custom'

export interface AIProviderSettings {
  provider: AIProviderId
  baseUrl: string
  model: string
  apiKey?: string
}

export const AI_PROVIDER_SETTINGS_KEY = 'aiProviderSettings'
export const LEGACY_OPENAI_API_KEY = 'openaiApiKey'

export const AI_PROVIDER_PRESETS: Record<
  Exclude<AIProviderId, 'custom'>,
  AIProviderSettings
> = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: DEFAULT_MODEL,
  },
  ollama: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma4:e4b',
  },
  mlx: {
    provider: 'mlx',
    baseUrl: 'http://localhost:8080/v1',
    model: 'mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit',
  },
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
      reasoning?: unknown
    }
  }>
  error?: {
    message: string
    type: string
  }
}

function isAIProviderId(value: unknown): value is AIProviderId {
  return (
    value === 'openai' ||
    value === 'ollama' ||
    value === 'mlx' ||
    value === 'custom'
  )
}

function parseProviderSettings(raw: string): AIProviderSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AIProviderSettings>
    if (
      !isAIProviderId(parsed.provider) ||
      typeof parsed.baseUrl !== 'string' ||
      typeof parsed.model !== 'string'
    ) {
      return null
    }

    const baseUrl = parsed.baseUrl.trim()
    const model = parsed.model.trim()
    const apiKey =
      typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : undefined

    if (!baseUrl || !model) return null

    return {
      provider: parsed.provider,
      baseUrl,
      model,
      ...(apiKey ? { apiKey } : {}),
    }
  } catch {
    return null
  }
}

export function normaliseBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

export async function getAIProviderSettings(): Promise<AIProviderSettings> {
  const storedSettings = await userSettingsDexieRepository.get(
    AI_PROVIDER_SETTINGS_KEY,
  )
  if (storedSettings) {
    const settings = parseProviderSettings(storedSettings)
    if (settings?.provider === 'openai' && !settings.apiKey) {
      throw new Error(CHAT_COPY.errors.missingAIProviderConfig)
    }
    if (settings) return settings
    throw new Error(CHAT_COPY.errors.missingAIProviderConfig)
  }

  const legacyApiKey = await userSettingsDexieRepository.get(
    LEGACY_OPENAI_API_KEY,
  )
  if (legacyApiKey?.trim()) {
    return {
      ...AI_PROVIDER_PRESETS.openai,
      apiKey: legacyApiKey.trim(),
    }
  }

  throw new Error(CHAT_COPY.errors.missingAIProviderConfig)
}

export async function hasAIProviderConfigured(): Promise<boolean> {
  try {
    await getAIProviderSettings()
    return true
  } catch {
    return false
  }
}

export interface SendMessageOptions {
  /** Override the default model id (e.g. to use a larger model for a long-form task). */
  model?: string
  /** Override the sampling temperature. */
  temperature?: number
  /** Override the cap on completion tokens. Longer tasks (like profile generation) need more. */
  maxTokens?: number
}

/**
 * Sends a message to an OpenAI-compatible API and returns the assistant's response
 * @param messages Array of conversation messages
 * @param systemPrompt Optional system prompt to set the AI's behavior
 * @param options Optional per-call overrides for model, temperature, and maxTokens
 * @returns The assistant's message content
 * @throws Error with user-friendly message if API call fails
 */
export async function sendMessage(
  messages: ChatMessage[],
  systemPrompt?: string,
  options?: SendMessageOptions
): Promise<string> {
  try {
    const settings = await getAIProviderSettings()

    // Construct messages array with system prompt if provided
    const requestMessages: ChatMessage[] = []
    if (systemPrompt) {
      requestMessages.push({ role: 'system', content: systemPrompt })
    }
    requestMessages.push(...messages)

    // Construct request payload. Local "thinking" providers get extra token budget so
    // hidden reasoning never starves the visible answer (see LOCAL_REASONING_HEADROOM).
    const requestedMaxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
    const isLocalThinkingProvider =
      settings.provider === 'ollama' || settings.provider === 'mlx'
    const requestBody = {
      model: options?.model ?? settings.model,
      messages: requestMessages,
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: isLocalThinkingProvider
        ? requestedMaxTokens + LOCAL_REASONING_HEADROOM
        : requestedMaxTokens,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (settings.apiKey) {
      headers.Authorization = `Bearer ${settings.apiKey}`
    }

    const response = await fetch(`${normaliseBaseUrl(settings.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers,
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
