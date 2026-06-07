import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { CHAT_COPY } from '@/constants/chatCopy'

// Default model configuration. gpt-5.4-nano is OpenAI's smallest/cheapest
// reasoning model (alias `gpt-5.4-nano`, snapshot gpt-5.4-nano-2026-03-17,
// 400k context) — fast and inexpensive for journal chats and profile builds.
export const DEFAULT_MODEL = 'gpt-5.4-nano'
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

/**
 * Ollama's context window (`num_ctx`) is a single shared budget for the prompt
 * AND the generated answer. The server default is small (~4096), so a large
 * prompt silently truncates and leaves no room to generate — the visible answer
 * comes back empty. We auto-size `num_ctx` from the actual prompt length plus
 * the completion budget so every Ollama call (chat, exercises, profile build)
 * gets a window that fits. The ceiling is a RAM guard and also the threshold
 * above which the profile build reports `contextTooLarge`.
 */
// Exported so the profile-build estimator divides by the *same* ratio used to
// size `num_ctx` — guard and window can't disagree. The first real build
// (gemma4:12b, Polish) measured ≈2.6 chars/token; `/3` under-counted by ~15–19%
// and under-sized `num_ctx`, truncating the answer. 2.5 over-reserves slightly
// (safe). Per-model empirical calibration is a later follow-up.
export const NUM_CTX_CHARS_PER_TOKEN = 2.5
const NUM_CTX_MARGIN = 512 // chat-template / role / BOS scaffolding
const NUM_CTX_FLOOR = 4096 // Ollama's default — keeps short chats unaffected
export const OLLAMA_NUM_CTX_CEILING = 65536

/**
 * Tokens carved out of the prompt budget for things the per-record estimate
 * doesn't see: the system prompt (`num_ctx` counts system + user; the profile
 * system prompt is ~800 tok, larger in gendered Polish), the [SCOPE]/section/
 * [END OF DATA] scaffolding (~200 tok), and `ceil()`/chat-template slack.
 */
export const PROMPT_SAFETY_TOKENS = 2048

/**
 * Pick a context window large enough to hold the prompt and the answer.
 * Pure and exported for unit testing and for the profile build's pre-flight
 * `contextTooLarge` guard.
 */
export function computeOllamaNumCtx(
  promptChars: number,
  numPredict: number,
): number {
  const promptTokens = Math.ceil(promptChars / NUM_CTX_CHARS_PER_TOKEN)
  const desired = promptTokens + numPredict + NUM_CTX_MARGIN
  return Math.min(OLLAMA_NUM_CTX_CEILING, Math.max(NUM_CTX_FLOOR, desired))
}

/**
 * Inverse of {@link computeOllamaNumCtx}: the largest payload (user-message)
 * token budget that still lets prompt + answer fit under the ceiling without
 * truncation. Used by the profile-build assembler to fill-to-budget. Returns
 * `null` for providers with no hard local context window (openai/custom), where
 * there is nothing to truncate against.
 *
 * `answerTokens` is the completion reservation the build requests (PROFILE_MAX_TOKENS);
 * the reasoning headroom mirrors what `sendMessage` adds to `num_predict` so the
 * budget and the real request can't disagree.
 */
export function computeMaxPromptTokens(
  provider: AIProviderId,
  effort: ReasoningEffort,
  answerTokens: number,
  safety: number = PROMPT_SAFETY_TOKENS,
): number | null {
  if (provider !== 'ollama' && provider !== 'mlx') return null
  const headroom =
    provider === 'ollama' ? OLLAMA_REASONING_HEADROOM[effort] : MLX_REASONING_HEADROOM
  return OLLAMA_NUM_CTX_CEILING - (answerTokens + headroom) - NUM_CTX_MARGIN - safety
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
  usage?: LLMUsage
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

// ---------------------------------------------------------------------------
// Wire-format adapters
//
// `sendMessage` keeps ALL shared concerns (settings, token-budget math,
// diagnostics lifecycle, callbacks, error mapping, empty guard). The two
// concerns that actually differ per provider — building the HTTP request and
// parsing the response/stream — live behind this `WireAdapter`. Only
// `provider === 'ollama'` uses the native adapter; openai/mlx/custom keep the
// exact OpenAI-compatible behaviour.
// ---------------------------------------------------------------------------

/** Normalised request intent computed once (shared) and consumed by adapters. */
interface RequestPlan {
  model: string
  messages: ChatMessage[] // system prompt already prepended
  temperature: number
  requestedMaxTokens: number
  reasoningHeadroom: number
  completionTokenCap: number
  reasoningEffort: ReasoningEffort
  stream: boolean
}

/** One normalised streaming event, format-agnostic. */
interface StreamDelta {
  contentDelta: string
  reasoningDelta: string
  usage?: LLMUsage
  rawMeta?: Record<string, unknown>
  error?: string
}

interface BuiltRequest {
  url: string
  headers: Record<string, string>
  body: Record<string, unknown>
  /** Folded into `diagnostics.rawMetadata.request` (native: wireFormat/numCtx/think). */
  requestMeta?: Record<string, unknown>
}

interface NonStreamingResult {
  content: string
  reasoningChars: number
  usage?: LLMUsage
  rawMeta?: Record<string, unknown>
}

interface WireAdapter {
  format: 'openai' | 'ollama-native'
  buildRequest(settings: AIProviderSettings, plan: RequestPlan): BuiltRequest
  /** Throws only on structural invalidity; emptiness is the shared guard's job. */
  parseNonStreaming(json: unknown): NonStreamingResult
  splitEvents(buffer: string): { events: string[]; remainder: string }
  /** Returns null to skip (sentinel / partial line / unparseable). */
  parseStreamEvent(rawEvent: string): StreamDelta | null
}

// ---- Shared helpers -------------------------------------------------------

function buildAuthHeaders(settings: AIProviderSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`
  }
  return headers
}

/** Coerce a reasoning payload (string or object) to text for length tracking. */
function reasoningToText(reasoning: unknown): string {
  if (!reasoning) return ''
  return typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning)
}

/** Whitespace-only content is treated as empty — a local "thinking" model that
 *  exhausts its budget can emit just a newline, which must not pass as success. */
function assertNonEmpty(content: string): void {
  if (!content.trim()) {
    throw new Error('Empty response from API. Please try again.')
  }
}

function reasoningControlLabel(
  provider: AIProviderId,
  reasoningHeadroom: number,
): string {
  if (provider === 'ollama') return 'native-think'
  return reasoningHeadroom > 0 ? 'completion-headroom-only' : 'none'
}

/** Map Ollama's native token counts into the shared `usage` shape. */
function nativeUsage(
  promptCount?: number,
  evalCount?: number,
): LLMUsage | undefined {
  if (typeof promptCount !== 'number' && typeof evalCount !== 'number') {
    return undefined
  }
  const prompt_tokens = promptCount ?? 0
  const completion_tokens = evalCount ?? 0
  return {
    prompt_tokens,
    completion_tokens,
    total_tokens: prompt_tokens + completion_tokens,
  }
}

const NATIVE_META_KEYS = [
  'model',
  'created_at',
  'done_reason',
  'total_duration',
  'load_duration',
  'prompt_eval_count',
  'prompt_eval_duration',
  'eval_count',
  'eval_duration',
] as const

function pickNativeMeta(data: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = {}
  for (const key of NATIVE_META_KEYS) {
    if (data[key] !== undefined) meta[key] = data[key]
  }
  return meta
}

/**
 * The stored Ollama baseUrl is OpenAI-style (".../v1"); the native API lives at
 * the server root. Strip a trailing `/v1` (tolerating its absence) and append
 * `/api/chat`.
 */
function deriveOllamaNativeUrl(baseUrl: string): string {
  const root = normaliseBaseUrl(baseUrl).replace(/\/v1$/, '')
  return `${root}/api/chat`
}

// ---- OpenAI-compatible adapter (openai / mlx / custom) ---------------------

/**
 * OpenAI's hosted API renamed the completion cap. Its reasoning models — the
 * o-series and the GPT-5 family — reject `max_tokens` outright with
 * "Unsupported parameter: 'max_tokens' is not supported with this model. Use
 * 'max_completion_tokens' instead.", and every current OpenAI chat model also
 * accepts `max_completion_tokens`, so real OpenAI requests always send the new
 * field. Local OpenAI-compatible servers (mlx / custom: llama.cpp, LM Studio,
 * vLLM, MLX) predate the rename and commonly understand only `max_tokens`, so
 * they keep the legacy field.
 */
function completionTokenField(
  provider: AIProviderId,
): 'max_tokens' | 'max_completion_tokens' {
  return provider === 'openai' ? 'max_completion_tokens' : 'max_tokens'
}

/**
 * OpenAI's reasoning families — the o-series and the GPT-5 line (gpt-5,
 * gpt-5.4, …) — differ from the classic chat models in two ways the request
 * builder must respect:
 *   1. They lock sampling to the default: any explicit `temperature` other than
 *      1 returns "Unsupported value: 'temperature' …", so we omit the field.
 *   2. They accept a `reasoning_effort` control that the classic models reject.
 * Classic OpenAI chat models (gpt-3.5 / gpt-4 / gpt-4o) and local servers do
 * neither. Matches o1/o3/o4… and gpt-5 / gpt-5-mini / gpt-5.4-nano …, but NOT
 * gpt-4o (not `o`-prefixed).
 */
function isOpenAIReasoningModel(provider: AIProviderId, model: string): boolean {
  return provider === 'openai' && /^(o\d|gpt-5)/i.test(model)
}

const openAiAdapter: WireAdapter = {
  format: 'openai',

  buildRequest(settings, plan) {
    const reasoningModel = isOpenAIReasoningModel(settings.provider, plan.model)
    const body: Record<string, unknown> = {
      model: plan.model,
      messages: plan.messages,
      // Reasoning models reject a non-default temperature; classic models honour it.
      ...(reasoningModel ? {} : { temperature: plan.temperature }),
      [completionTokenField(settings.provider)]: plan.completionTokenCap,
      // Our effort enum (none/low/medium/high) maps 1:1 onto the GPT-5.4 line's
      // reasoning_effort values; higher effort spends more (billed) reasoning
      // tokens out of the completion budget. Sent only where it's accepted.
      ...(reasoningModel ? { reasoning_effort: plan.reasoningEffort } : {}),
      ...(plan.stream
        ? { stream: true, stream_options: { include_usage: true } }
        : {}),
    }
    return {
      url: `${normaliseBaseUrl(settings.baseUrl)}/chat/completions`,
      headers: buildAuthHeaders(settings),
      body,
    }
  },

  parseNonStreaming(json) {
    const data = json as OpenAIResponse
    if (!data.choices || data.choices.length === 0) {
      throw new Error('Invalid response from API. Please try again.')
    }
    const message = data.choices[0].message
    return {
      content: message.content ?? '',
      reasoningChars: reasoningToText(message.reasoning).length,
      // OpenAI-compatible providers return a usage block on non-streaming
      // responses; surface it so the profile build can log real token counts.
      usage: data.usage,
    }
  },

  splitEvents(buffer) {
    const parts = buffer.split(/\r?\n\r?\n/)
    const remainder = parts.pop() ?? ''
    return { events: parts, remainder }
  },

  parseStreamEvent(rawEvent) {
    const data = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()

    if (!data || data === '[DONE]') return null

    let chunk: OpenAIStreamChunk
    try {
      chunk = JSON.parse(data) as OpenAIStreamChunk
    } catch {
      return null
    }

    if (chunk.error?.message) {
      return { contentDelta: '', reasoningDelta: '', error: chunk.error.message }
    }

    const choice = chunk.choices?.[0]
    const reasoning = choice?.delta?.reasoning ?? choice?.delta?.reasoning_content
    return {
      contentDelta: choice?.delta?.content ?? choice?.message?.content ?? '',
      reasoningDelta: reasoningToText(reasoning),
      usage: chunk.usage,
      rawMeta: {
        ...(chunk.id ? { id: chunk.id } : {}),
        ...(chunk.model ? { model: chunk.model } : {}),
        ...(chunk.created ? { created: chunk.created } : {}),
        ...(chunk.usage ? { usage: chunk.usage } : {}),
      },
    }
  },
}

// ---- Ollama native /api/chat adapter --------------------------------------

interface OllamaNativeMessage {
  content?: string
  thinking?: string
}

interface OllamaNativeChunk {
  message?: OllamaNativeMessage
  done?: boolean
  error?: unknown
  prompt_eval_count?: number
  eval_count?: number
  model?: string
  [key: string]: unknown
}

const ollamaNativeAdapter: WireAdapter = {
  format: 'ollama-native',

  buildRequest(settings, plan) {
    const promptChars = plan.messages.reduce((n, m) => n + m.content.length, 0)
    const numCtx = computeOllamaNumCtx(promptChars, plan.completionTokenCap)
    // Native `think` is boolean — low/medium/high collapse to on/off, but the
    // reasoning *budget* is still differentiated via num_predict's headroom.
    const think = plan.reasoningEffort !== 'none'
    const body: Record<string, unknown> = {
      model: plan.model,
      messages: plan.messages,
      think,
      // MUST be explicit: native defaults to streaming, which would break the
      // non-streaming callers (profile build, exercise assists).
      stream: plan.stream,
      options: {
        num_ctx: numCtx,
        num_predict: plan.completionTokenCap,
        temperature: plan.temperature,
      },
    }
    return {
      url: deriveOllamaNativeUrl(settings.baseUrl),
      headers: buildAuthHeaders(settings),
      body,
      requestMeta: { wireFormat: 'ollama-native', numCtx, think },
    }
  },

  parseNonStreaming(json) {
    const data = json as OllamaNativeChunk
    if (!data.message) {
      throw new Error('Invalid response from API. Please try again.')
    }
    return {
      content: data.message.content ?? '',
      reasoningChars: (data.message.thinking ?? '').length,
      usage: nativeUsage(data.prompt_eval_count, data.eval_count),
      rawMeta: pickNativeMeta(data),
    }
  },

  splitEvents(buffer) {
    const parts = buffer.split(/\r?\n/)
    const remainder = parts.pop() ?? ''
    return { events: parts, remainder }
  },

  parseStreamEvent(rawEvent) {
    const line = rawEvent.trim()
    if (!line) return null

    let obj: OllamaNativeChunk
    try {
      obj = JSON.parse(line) as OllamaNativeChunk
    } catch {
      // Partial JSON across a chunk boundary — leave it buffered for retry.
      return null
    }

    if (obj.error) {
      return { contentDelta: '', reasoningDelta: '', error: String(obj.error) }
    }

    const delta: StreamDelta = {
      contentDelta: obj.message?.content ?? '',
      reasoningDelta: obj.message?.thinking ?? '',
    }
    if (obj.model) delta.rawMeta = { model: obj.model }
    if (obj.done === true) {
      delta.usage = nativeUsage(obj.prompt_eval_count, obj.eval_count)
      delta.rawMeta = { ...(delta.rawMeta ?? {}), ...pickNativeMeta(obj) }
    }
    return delta
  },
}

function selectAdapter(provider: AIProviderId): WireAdapter {
  return provider === 'ollama' ? ollamaNativeAdapter : openAiAdapter
}

async function readStreamingResponse(
  response: Response,
  adapter: WireAdapter,
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

  const handleRaw = (rawEvent: string) => {
    const delta = adapter.parseStreamEvent(rawEvent)
    if (!delta) return

    if (delta.error) {
      throw new Error(delta.error)
    }

    const eventAt = nowMs()

    if (delta.usage) {
      diagnostics.usage = delta.usage
    }
    if (delta.rawMeta) {
      diagnostics.rawMetadata = {
        ...diagnostics.rawMetadata,
        ...delta.rawMeta,
      }
    }

    if (delta.reasoningDelta) {
      if (reasoningStartedAt === null) {
        reasoningStartedAt = eventAt
        diagnostics.timing.reasoningStartMs = eventAt - requestStartedAt
      }
      diagnostics.observed.reasoningChunks += 1
      diagnostics.observed.reasoningCharacters += delta.reasoningDelta.length
      options.onReasoning?.()
    }

    if (delta.contentDelta) {
      if (firstContentAt === null) {
        firstContentAt = eventAt
        diagnostics.timing.firstContentMs = eventAt - requestStartedAt
        if (reasoningStartedAt !== null) {
          diagnostics.timing.reasoningDurationMs =
            eventAt - reasoningStartedAt
        }
      }
      content += delta.contentDelta
      diagnostics.observed.contentChunks += 1
      diagnostics.observed.contentCharacters = content.length
      options.onToken?.(delta.contentDelta)
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

    const { events, remainder } = adapter.splitEvents(buffer)
    buffer = remainder
    events.forEach(handleRaw)

    if (done) break
  }

  if (buffer.trim()) {
    handleRaw(buffer)
  }

  assertNonEmpty(content)

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
    const adapter = selectAdapter(settings.provider)

    // Construct messages array with system prompt if provided
    const requestMessages: ChatMessage[] = []
    if (systemPrompt) {
      requestMessages.push({ role: 'system', content: systemPrompt })
    }
    requestMessages.push(...messages)

    // Local "thinking" providers get extra completion budget so hidden reasoning
    // never starves the visible answer (see *_REASONING_HEADROOM).
    const requestedMaxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS
    const reasoningEffort =
      options?.reasoningEffort ?? settings.reasoningEffort ?? 'low'
    const reasoningHeadroom =
      settings.provider === 'ollama'
        ? OLLAMA_REASONING_HEADROOM[reasoningEffort]
        : settings.provider === 'mlx'
          ? MLX_REASONING_HEADROOM
          : 0
    const completionTokenCap = requestedMaxTokens + reasoningHeadroom

    const plan: RequestPlan = {
      model: options?.model ?? settings.model,
      messages: requestMessages,
      temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
      requestedMaxTokens,
      reasoningHeadroom,
      completionTokenCap,
      reasoningEffort,
      stream: Boolean(options?.onToken),
    }

    const built = adapter.buildRequest(settings, plan)

    const diagnostics: LLMDiagnostics = {
      provider: settings.provider,
      model: plan.model,
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
          completionTokenCap,
          reasoningControl: reasoningControlLabel(
            settings.provider,
            reasoningHeadroom,
          ),
          ...(built.requestMeta ?? {}),
        },
      },
    }
    const requestStartedAt = nowMs()

    const response = await fetch(built.url, {
      method: 'POST',
      headers: built.headers,
      body: JSON.stringify(built.body),
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

      // Try to parse an error body. OpenAI nests it under error.message; Ollama
      // native returns a bare string under `error`.
      let errorMessage: string | null = null
      try {
        const errorData = (await response.json()) as { error?: unknown }
        const err = errorData.error
        if (typeof err === 'string') {
          errorMessage = err
        } else if (
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof (err as { message?: unknown }).message === 'string'
        ) {
          errorMessage = (err as { message: string }).message
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
        adapter,
        options,
        diagnostics,
        requestStartedAt,
      )
    }

    // Parse successful (non-streaming) response.
    const data: unknown = await response.json()
    const result = adapter.parseNonStreaming(data)
    assertNonEmpty(result.content)

    // Parity diagnostics for the non-streaming path so native usage / thinking
    // reach subscribers (inert when nothing is subscribed).
    diagnostics.observed.contentChunks = 1
    diagnostics.observed.contentCharacters = result.content.length
    if (result.reasoningChars > 0) {
      diagnostics.observed.reasoningChunks = 1
      diagnostics.observed.reasoningCharacters = result.reasoningChars
    }
    if (result.usage) {
      diagnostics.usage = result.usage
    }
    if (result.rawMeta) {
      diagnostics.rawMetadata = {
        ...diagnostics.rawMetadata,
        ...result.rawMeta,
      }
    }
    diagnostics.timing.totalMs = nowMs() - requestStartedAt
    options?.onDiagnostics?.(snapshotLLMDiagnostics(diagnostics))

    return result.content
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
