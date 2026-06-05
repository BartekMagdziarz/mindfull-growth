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
const MLX_REASONING_HEADROOM = 2048
const OLLAMA_REASONING_HEADROOM: Record<ReasoningEffort, number> = {
  none: 0,
  low: 512,
  medium: 1024,
  high: 2048,
}

export type AIProviderId = 'openai' | 'ollama' | 'mlx' | 'custom'
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high'

export interface AIProviderSettings {
  provider: AIProviderId
  baseUrl: string
  model: string
  apiKey?: string
  reasoningEffort?: ReasoningEffort
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
    reasoningEffort: 'low',
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

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return (
    value === 'none' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high'
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
      ...(isReasoningEffort(parsed.reasoningEffort)
        ? { reasoningEffort: parsed.reasoningEffort }
        : {}),
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
  /** Override the configured reasoning level for this request. */
  reasoningEffort?: ReasoningEffort
  /** Receive visible answer fragments as soon as the provider emits them. */
  onToken?: (token: string) => void
  /** Signals hidden reasoning activity without exposing chain-of-thought content. */
  onReasoning?: () => void
  /** Receive timing, usage, and observed stream diagnostics. */
  onDiagnostics?: (diagnostics: LLMDiagnostics) => void
}

interface OpenAIStreamDelta {
  content?: string | null
  reasoning?: unknown
  reasoning_content?: unknown
}

interface OpenAIStreamChunk {
  id?: string
  model?: string
  created?: number
  choices?: Array<{
    delta?: OpenAIStreamDelta
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
  usage?: LLMUsage
}

export interface LLMUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  completion_tokens_details?: {
    reasoning_tokens?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface LLMDiagnostics {
  provider: AIProviderId
  model: string
  reasoningEffort?: ReasoningEffort
  timing: {
    connectionMs?: number
    firstChunkMs?: number
    reasoningStartMs?: number
    reasoningDurationMs?: number
    firstContentMs?: number
    generationMs?: number
    totalMs?: number
  }
  observed: {
    reasoningChunks: number
    reasoningCharacters: number
    contentChunks: number
    contentCharacters: number
  }
  usage?: LLMUsage
  rawMetadata: Record<string, unknown>
}

export function snapshotLLMDiagnostics(
  diagnostics: LLMDiagnostics,
): LLMDiagnostics {
  // Diagnostics only contain JSON-compatible request and provider data. A JSON
  // round-trip also unwraps Vue proxies, which structuredClone cannot clone.
  return JSON.parse(JSON.stringify(diagnostics)) as LLMDiagnostics
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function reasoningLength(delta?: OpenAIStreamDelta): number {
  if (!delta) return 0
  const reasoning = delta.reasoning ?? delta.reasoning_content
  if (!reasoning) return 0
  return typeof reasoning === 'string'
    ? reasoning.length
    : JSON.stringify(reasoning).length
}

function hasReasoningDelta(delta?: OpenAIStreamDelta): boolean {
  if (!delta) return false
  return Boolean(delta.reasoning || delta.reasoning_content)
}

async function readStreamingResponse(
  response: Response,
  options: SendMessageOptions,
  diagnostics: LLMDiagnostics,
  requestStartedAt: number,
): Promise<string> {
  if (!response.body) {
    throw new Error('Streaming response did not include a readable body.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let firstChunkAt: number | null = null
  let reasoningStartedAt: number | null = null
  let firstContentAt: number | null = null

  const emitDiagnostics = () => {
    options.onDiagnostics?.(snapshotLLMDiagnostics(diagnostics))
  }

  const processEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()

    if (!data || data === '[DONE]') return

    let chunk: OpenAIStreamChunk
    try {
      chunk = JSON.parse(data) as OpenAIStreamChunk
    } catch {
      return
    }

    if (chunk.error?.message) {
      throw new Error(chunk.error.message)
    }

    const choice = chunk.choices?.[0]
    const token = choice?.delta?.content ?? choice?.message?.content ?? ''
    const eventAt = nowMs()

    if (chunk.usage) {
      diagnostics.usage = chunk.usage
    }
    diagnostics.rawMetadata = {
      ...diagnostics.rawMetadata,
      ...(chunk.id ? { id: chunk.id } : {}),
      ...(chunk.model ? { model: chunk.model } : {}),
      ...(chunk.created ? { created: chunk.created } : {}),
      ...(chunk.usage ? { usage: chunk.usage } : {}),
    }

    if (hasReasoningDelta(choice?.delta)) {
      if (reasoningStartedAt === null) {
        reasoningStartedAt = eventAt
        diagnostics.timing.reasoningStartMs = eventAt - requestStartedAt
      }
      diagnostics.observed.reasoningChunks += 1
      diagnostics.observed.reasoningCharacters += reasoningLength(choice?.delta)
      options.onReasoning?.()
    }

    if (token) {
      if (firstContentAt === null) {
        firstContentAt = eventAt
        diagnostics.timing.firstContentMs = eventAt - requestStartedAt
        if (reasoningStartedAt !== null) {
          diagnostics.timing.reasoningDurationMs =
            eventAt - reasoningStartedAt
        }
      }
      content += token
      diagnostics.observed.contentChunks += 1
      diagnostics.observed.contentCharacters = content.length
      options.onToken?.(token)
    }

    emitDiagnostics()
  }

  while (true) {
    const { value, done } = await reader.read()
    if (value && firstChunkAt === null) {
      firstChunkAt = nowMs()
      diagnostics.timing.firstChunkMs = firstChunkAt - requestStartedAt
      emitDiagnostics()
    }
    buffer += decoder.decode(value, { stream: !done })

    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''
    events.forEach(processEvent)

    if (done) break
  }

  if (buffer.trim()) {
    processEvent(buffer)
  }

  if (!content) {
    throw new Error('Empty response from API. Please try again.')
  }

  const completedAt = nowMs()
  diagnostics.timing.totalMs = completedAt - requestStartedAt
  if (firstContentAt !== null) {
    diagnostics.timing.generationMs = completedAt - firstContentAt
  }
  if (
    reasoningStartedAt !== null &&
    diagnostics.timing.reasoningDurationMs === undefined
  ) {
    diagnostics.timing.reasoningDurationMs = completedAt - reasoningStartedAt
  }
  emitDiagnostics()

  return content
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
    const reasoningEffort =
      options?.reasoningEffort ?? settings.reasoningEffort ?? 'low'
    const reasoningHeadroom =
      settings.provider === 'ollama'
        ? OLLAMA_REASONING_HEADROOM[reasoningEffort]
        : settings.provider === 'mlx'
          ? MLX_REASONING_HEADROOM
          : 0
    const requestBody = {
      model: options?.model ?? settings.model,
      messages: requestMessages,
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: requestedMaxTokens + reasoningHeadroom,
      ...(options?.onToken
        ? {
            stream: true,
            stream_options: { include_usage: true },
          }
        : {}),
      ...(settings.provider === 'ollama'
        ? { reasoning_effort: reasoningEffort }
        : {}),
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (settings.apiKey) {
      headers.Authorization = `Bearer ${settings.apiKey}`
    }

    const diagnostics: LLMDiagnostics = {
      provider: settings.provider,
      model: options?.model ?? settings.model,
      ...(settings.provider === 'ollama' ? { reasoningEffort } : {}),
      timing: {},
      observed: {
        reasoningChunks: 0,
        reasoningCharacters: 0,
        contentChunks: 0,
        contentCharacters: 0,
      },
      rawMetadata: {
        request: {
          answerTokenBudget: requestedMaxTokens,
          reasoningTokenHeadroom: reasoningHeadroom,
          completionTokenCap: requestedMaxTokens + reasoningHeadroom,
          reasoningControl:
            settings.provider === 'ollama'
              ? 'provider-effort-hint'
              : reasoningHeadroom > 0
                ? 'completion-headroom-only'
                : 'none',
        },
      },
    }
    const requestStartedAt = nowMs()

    const response = await fetch(`${normaliseBaseUrl(settings.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })
    diagnostics.timing.connectionMs = nowMs() - requestStartedAt
    diagnostics.rawMetadata = {
      ...diagnostics.rawMetadata,
      status: response.status,
      contentType: response.headers?.get?.('content-type') ?? undefined,
    }
    options?.onDiagnostics?.(snapshotLLMDiagnostics(diagnostics))

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

    if (options?.onToken) {
      return await readStreamingResponse(
        response,
        options,
        diagnostics,
        requestStartedAt,
      )
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
