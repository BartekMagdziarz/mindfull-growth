import { HISTORY_TOOL_DEFINITIONS } from '../history/toolDefinitions'
import { strictSchema, type Schema } from './schema'

export const OPENAI_COMPANION_MODEL = 'gpt-6-luna'
// Standard short-context rates verified 2026-09-28. Reserve cache-write rate for
// every input token: a conservative estimate, not an invoice or billing guarantee.
export const DEFAULT_COMPANION_RATES = {
  input: 0.125,
  output: 0.5,
  verifiedAt: '2026-09-28',
} as const
export type WireItem = Record<string, unknown>
export interface ModelRequest {
  input: WireItem[]
  instructions: string
  schema: Schema
  maxOutputTokens: number
  toolsEnabled: boolean
  signal: AbortSignal
}
export interface ModelResponse {
  output: WireItem[]
  usage: { input: number; output: number; cached: number; reasoning: number }
  model: string
  requestId: string | null
}
export type ModelTransport = ((request: ModelRequest) => Promise<ModelResponse>) & {
  /** Model id recorded with the conversation; defaults to OPENAI_COMPANION_MODEL. */
  model?: string
  /** USD per 1M tokens for the spend guards; defaults to DEFAULT_COMPANION_RATES. */
  rates?: { input: number; output: number }
  /** Per-conversation and daily profile-task cap; defaults to COMPANION_SPEND_CAP_USD. */
  spendCapUsd?: number
}
export const COMPANION_SPEND_CAP_USD = 0.5

export class CompanionError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = 'CompanionError'
  }
}
export const OPENAI_HISTORY_TOOLS = HISTORY_TOOL_DEFINITIONS.map(tool => ({
  type: 'function',
  ...tool,
  parameters: strictSchema(tool.parameters),
  strict: true,
}))
export function createOpenAITransport(options: {
  apiKey: string
  model?: string
  effort?: 'low' | 'medium' | 'high'
  fetch?: typeof fetch
}): ModelTransport {
  const apiKey = options.apiKey.trim()
  if (!apiKey) throw new CompanionError('missing-api-key')
  const model = options.model ?? OPENAI_COMPANION_MODEL
  const fetcher = options.fetch ?? globalThis.fetch
  return async request => {
    let response: Response
    try {
      response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal: request.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          store: false,
          stream: false,
          service_tier: 'default',
          include: ['reasoning.encrypted_content'],
          reasoning: { effort: options.effort ?? 'medium' },
          instructions: request.instructions,
          input: request.input,
          tools: OPENAI_HISTORY_TOOLS,
          tool_choice: request.toolsEnabled ? 'auto' : 'none',
          parallel_tool_calls: false,
          max_output_tokens: request.maxOutputTokens,
          truncation: 'disabled',
          text: {
            format: {
              type: 'json_schema',
              name: 'companion_reply',
              strict: true,
              schema: request.schema,
            },
          },
        }),
      })
    } catch {
      throw new CompanionError(request.signal.aborted ? 'cancelled' : 'network-error')
    }
    if (!response.ok) {
      await response.body?.cancel()
      // Never surface provider bodies: they may echo sensitive input or credentials.
      throw new CompanionError(`openai-http-${response.status}`)
    }
    const reader = response.body?.getReader()
    if (!reader) throw new CompanionError('empty-response')
    let text = '',
      bytes = 0
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > 2_000_000) {
          await reader.cancel()
          throw new CompanionError('response-too-large')
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    } catch (error) {
      if (error instanceof CompanionError) throw error
      throw new CompanionError(request.signal.aborted ? 'cancelled' : 'network-error')
    }
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      throw new CompanionError('invalid-response')
    }
    if (!data || typeof data !== 'object') throw new CompanionError('invalid-response')
    if (data.status !== 'completed')
      throw new CompanionError(
        data.status === 'incomplete' ? 'incomplete-response' : 'failed-response'
      )
    if (!Array.isArray(data.output) || !data.usage || typeof data.usage !== 'object')
      throw new CompanionError('invalid-response')
    const usage = data.usage as Record<string, unknown>
    const count = (n: unknown) => {
      if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0)
        throw new CompanionError('invalid-usage')
      return n
    }
    return {
      output: data.output as WireItem[],
      model: typeof data.model === 'string' ? data.model : model,
      requestId: response.headers.get('x-request-id'),
      usage: {
        input: count(usage.input_tokens),
        output: count(usage.output_tokens),
        cached: count(
          (usage.input_tokens_details as Record<string, unknown> | undefined)?.cached_tokens ?? 0
        ),
        reasoning: count(
          (usage.output_tokens_details as Record<string, unknown> | undefined)?.reasoning_tokens ??
            0
        ),
      },
    }
  }
}
