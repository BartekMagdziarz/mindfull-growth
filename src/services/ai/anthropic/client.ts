import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessageStreamParams } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { CHAT_COPY } from '@/constants/chatCopy'
import type { ReasoningEffort } from '@/services/aiProviderSettingsService'

/**
 * Claude models offered in Profile → AI Assistant. Rates are USD per 1M tokens
 * (standard first-party API, verified 2026-10-25) and only feed the app's own
 * conservative spend guards — the Console Usage/Cost pages are the invoice.
 */
export const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10 },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20 },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1', input: 10, output: 50 },
] as const

export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5-5'
/** Long-form tasks (profile build, profile observations) default to Opus. */
export const ANTHROPIC_HEAVY_MODEL = 'claude-opus-5-5'

/** Unknown ids are priced like the most expensive model so guards never under-reserve. */
export function anthropicRates(model: string): { input: number; output: number } {
  const known = ANTHROPIC_MODELS.find(m => m.id === model)
  return known ? { input: known.input, output: known.output } : { input: 10, output: 50 }
}

/**
 * Server-side refusal fallback (`fallbacks: "default"`): on a safety-classifier
 * decline the API re-runs the request on a model chosen by refusal category,
 * inside the same call. Haiku 5.5 has no server-side fallback.
 */
const FALLBACK_MODELS = new Set([
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
])
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

/** `output_config.effort` exists on the Claude 5 line; older ids get no effort field. */
const EFFORT_MODEL = /^claude-(fable|mythos|opus|sonnet|haiku)-5/

export function anthropicRequestExtras(
  model: string,
  effort: 'low' | 'medium' | 'high'
): Pick<BetaMessageStreamParams, 'betas' | 'fallbacks' | 'output_config'> {
  return {
    ...(FALLBACK_MODELS.has(model) ? { betas: [FALLBACK_BETA], fallbacks: 'default' } : {}),
    ...(EFFORT_MODEL.test(model) ? { output_config: { effort } } : {}),
  }
}

/** The app's none/low/medium/high scale; Claude 5 thinking cannot be switched off, so none = low. */
export function anthropicEffort(effort: ReasoningEffort): 'low' | 'medium' | 'high' {
  return effort === 'none' ? 'low' : effort
}

/**
 * Adaptive thinking spends tokens out of `max_tokens`, so the visible-answer
 * budget gets headroom on top (billed only when actually used).
 */
export const ANTHROPIC_THINKING_HEADROOM: Record<'low' | 'medium' | 'high', number> = {
  low: 2048,
  medium: 4096,
  high: 8192,
}

/**
 * The app has no backend: the key lives in this browser's IndexedDB, exactly
 * like the OpenAI key, and requests go straight to api.anthropic.com.
 */
export function createAnthropicClient(apiKey: string, fetch?: typeof globalThis.fetch): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, ...(fetch ? { fetch } : {}) })
}

/** Map SDK errors onto the shared llmService copy; other API errors keep the server's message. */
export function toAnthropicChatError(error: unknown): unknown {
  if (error instanceof Anthropic.AuthenticationError)
    return new Error(CHAT_COPY.errors.invalidApiKey, { cause: error })
  if (error instanceof Anthropic.RateLimitError)
    return new Error(CHAT_COPY.errors.rateLimit, { cause: error })
  if (error instanceof Anthropic.APIUserAbortError) return error
  if (error instanceof Anthropic.APIConnectionError)
    return new Error(CHAT_COPY.errors.network, { cause: error })
  if (error instanceof Anthropic.APIError && typeof error.status === 'number') {
    const body = error.error as { error?: { message?: unknown } } | undefined
    const message = body?.error?.message
    return new Error(
      typeof message === 'string' ? message : CHAT_COPY.errors.genericApi(error.status),
      { cause: error }
    )
  }
  return error
}
