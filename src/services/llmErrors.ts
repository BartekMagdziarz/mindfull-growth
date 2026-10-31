import { CHAT_COPY } from '@/constants/chatCopy'

/**
 * Why an AI request failed, as a code the UI can translate. The `message`
 * stays English and goes to logs and diagnostics; screens never render it
 * directly — they map the code through `llmErrorPresentation`.
 */
export type LlmErrorCode =
  | 'not-configured'
  | 'invalid-api-key'
  | 'rate-limit'
  | 'network'
  | 'refusal'
  | 'cancelled'
  | 'timed-out'
  | 'empty-response'
  | 'api'

export class LlmError extends Error {
  readonly code: LlmErrorCode

  constructor(code: LlmErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'LlmError'
    this.code = code
  }
}

/** No provider, or a provider that needs a key without one: nothing to call. */
export class LlmNotConfiguredError extends LlmError {
  constructor(options?: ErrorOptions) {
    super('not-configured', CHAT_COPY.errors.missingAIProviderConfig, options)
    this.name = 'LlmNotConfiguredError'
  }
}

export function isLlmError(error: unknown): error is LlmError {
  return error instanceof LlmError
}

export function llmErrorCode(error: unknown): LlmErrorCode | undefined {
  return isLlmError(error) ? error.code : undefined
}

/** A cancelled or timed-out request is the user's (or the clock's) doing, not a failure to report. */
export function isLlmAbort(error: unknown): boolean {
  const code = llmErrorCode(error)
  return code === 'cancelled' || code === 'timed-out'
}

export interface LlmErrorPresentation {
  /** Key under `exerciseWizards.shared.ai`. */
  key: string
  /** The provider's own words (an API error body, a stream error) — shown small under the sentence. */
  detail?: string
  /** The sentence ends with a link to Profile → AI assistant. */
  profileLink: boolean
}

const KEY_BY_CODE: Record<LlmErrorCode, string> = {
  'not-configured': 'notConfigured',
  'invalid-api-key': 'invalidApiKey',
  'rate-limit': 'rateLimit',
  network: 'network',
  refusal: 'refusal',
  cancelled: 'cancelled',
  'timed-out': 'timedOut',
  'empty-response': 'emptyResponse',
  api: 'api',
}

/**
 * Map whatever a wizard caught onto an i18n key. Coded errors translate
 * cleanly; a plain Error (a provider's message, a thrown string) becomes the
 * generic sentence with the original text as a detail line, so nothing the
 * user needs is lost and nothing English stands in for the sentence itself.
 */
export function llmErrorPresentation(error: unknown): LlmErrorPresentation {
  if (isLlmError(error)) {
    const key = KEY_BY_CODE[error.code]
    return {
      key,
      detail: error.code === 'api' ? error.message : undefined,
      profileLink: error.code === 'not-configured' || error.code === 'invalid-api-key',
    }
  }
  if (error instanceof Error) {
    return { key: 'failed', detail: error.message || undefined, profileLink: false }
  }
  if (typeof error === 'string' && error.trim()) {
    return { key: 'failed', detail: error, profileLink: false }
  }
  return { key: 'failed', profileLink: false }
}
