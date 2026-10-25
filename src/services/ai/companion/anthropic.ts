import Anthropic from '@anthropic-ai/sdk'
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaTool,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { HISTORY_TOOL_DEFINITIONS } from '../history/toolDefinitions'
import { anthropicRates, anthropicRequestExtras, createAnthropicClient } from '../anthropic/client'
import { CompanionError, type ModelTransport, type WireItem } from './openai'
import type { Schema } from './schema'

/**
 * Claude transport for the companion runtime. The runtime speaks OpenAI
 * Responses items (message / function_call / function_call_output /
 * reasoning); this adapter translates them to Messages API turns and back, so
 * the loop, validation and spend guards stay provider-neutral.
 *
 * Thinking blocks ride in `reasoning.encrypted_content` (JSON of the original
 * block): the runtime keeps them within one turn, and Claude needs them echoed
 * unchanged before the matching `tool_use`.
 */

// Non-strict tools: the runtime validates every argument against the full
// schema itself (min/max lengths included) and answers violations with
// `invalid-arguments`, so the original definitions are sent as-is.
export const ANTHROPIC_HISTORY_TOOLS: BetaTool[] = HISTORY_TOOL_DEFINITIONS.map(tool => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.parameters as BetaTool['input_schema'],
}))

// Structured outputs reject numeric, string-length and array-size constraints.
// They are dropped here only; the runtime re-validates the reply with the full schema.
const UNSUPPORTED_KEYS = new Set([
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
])
export function claudeOutputSchema(schema: Schema): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_KEYS.has(key)) continue
    if (key === 'properties' && value && typeof value === 'object')
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, Schema>).map(([k, v]) => [k, claudeOutputSchema(v)])
      )
    else if (key === 'items') out.items = claudeOutputSchema(value as Schema)
    else if (key === 'anyOf') out.anyOf = (value as Schema[]).map(claudeOutputSchema)
    else out[key] = value
  }
  if (schema.type === 'object') out.additionalProperties = false
  return out
}

function outputText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) throw new CompanionError('invalid-input')
  return (content as WireItem[])
    .filter(part => part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text as string)
    .join('')
}

/** Responses input items → Messages turns; consecutive same-role blocks merge into one turn. */
export function toClaudeMessages(input: WireItem[]): BetaMessageParam[] {
  const turns: Array<{ role: 'user' | 'assistant'; content: BetaContentBlockParam[] }> = []
  const push = (role: 'user' | 'assistant', block: BetaContentBlockParam) => {
    if (block.type === 'text' && !block.text) return // the API rejects empty text blocks
    const last = turns.at(-1)
    if (last?.role === role) last.content.push(block)
    else turns.push({ role, content: [block] })
  }
  for (const item of input) {
    if (item.type === 'reasoning') {
      if (typeof item.encrypted_content !== 'string') throw new CompanionError('invalid-input')
      push('assistant', JSON.parse(item.encrypted_content) as BetaContentBlockParam)
    } else if (item.type === 'function_call') {
      push('assistant', {
        type: 'tool_use',
        id: String(item.call_id),
        name: String(item.name),
        input: JSON.parse(String(item.arguments)) as Record<string, unknown>,
      })
    } else if (item.type === 'function_call_output') {
      push('user', {
        type: 'tool_result',
        tool_use_id: String(item.call_id),
        content: String(item.output),
      })
    } else if (item.type === 'message' || item.role === 'assistant') {
      push('assistant', { type: 'text', text: outputText(item.content) })
    } else if (item.role === 'user') {
      push('user', { type: 'text', text: outputText(item.content) })
    } else throw new CompanionError('invalid-input')
  }
  return turns
}

/**
 * Messages content → Responses output items. After a mid-output refusal
 * fallback, thinking and tool_use blocks before the last `fallback` marker
 * belong to the declined model and must not be echoed back.
 */
export function fromClaudeContent(content: BetaContentBlock[]): WireItem[] {
  const boundary = content.map(block => block.type).lastIndexOf('fallback')
  return content.flatMap((block, index): WireItem[] => {
    if (block.type === 'fallback') return []
    const declined = index < boundary
    if (block.type === 'text')
      return [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: block.text }],
        },
      ]
    if (declined && ['thinking', 'redacted_thinking', 'tool_use'].includes(block.type)) return []
    if (block.type === 'thinking' || block.type === 'redacted_thinking')
      return [
        {
          type: 'reasoning',
          id: `claude-thinking-${index}`,
          summary: [],
          encrypted_content: JSON.stringify(block),
        },
      ]
    if (block.type === 'tool_use')
      return [
        {
          type: 'function_call',
          call_id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        },
      ]
    throw new CompanionError('unsupported-output')
  })
}

export function createAnthropicTransport(options: {
  apiKey: string
  model: string
  effort?: 'low' | 'medium' | 'high'
  fetch?: typeof fetch
}): ModelTransport {
  const apiKey = options.apiKey.trim()
  if (!apiKey) throw new CompanionError('missing-api-key')
  const client = createAnthropicClient(apiKey, options.fetch)
  const model = options.model
  const rates = anthropicRates(model)
  const transport: ModelTransport = async request => {
    const messages = toClaudeMessages(request.input)
    const usesTools = request.toolsEnabled || request.input.some(i => i.type === 'function_call')
    const extras = anthropicRequestExtras(model, options.effort ?? 'medium')
    let message: BetaMessage
    let requestId: string | null = null
    try {
      const stream = client.beta.messages.stream(
        {
          model,
          max_tokens: request.maxOutputTokens,
          system: request.instructions,
          messages,
          // Every round resends the growing transcript; caching bills repeats at ~0.1×.
          cache_control: { type: 'ephemeral' },
          ...(usesTools
            ? {
                tools: ANTHROPIC_HISTORY_TOOLS,
                tool_choice: request.toolsEnabled
                  ? { type: 'auto', disable_parallel_tool_use: true }
                  : { type: 'none' },
              }
            : {}),
          ...extras,
          output_config: {
            ...extras.output_config,
            format: { type: 'json_schema', schema: claudeOutputSchema(request.schema) },
          },
        },
        { signal: request.signal }
      )
      message = await stream.finalMessage()
      requestId = stream.request_id ?? null
    } catch (error) {
      if (request.signal.aborted || error instanceof Anthropic.APIUserAbortError)
        throw new CompanionError('cancelled')
      // Never surface provider bodies: they may echo sensitive input or credentials.
      if (error instanceof Anthropic.APIError && typeof error.status === 'number')
        throw new CompanionError(`anthropic-http-${error.status}`)
      throw new CompanionError('network-error')
    }
    if (message.stop_reason === 'refusal') throw new CompanionError('model-refusal')
    if (
      message.stop_reason === 'max_tokens' ||
      message.stop_reason === 'model_context_window_exceeded'
    )
      throw new CompanionError('incomplete-response')
    const usage = message.usage
    const cached = usage.cache_read_input_tokens ?? 0
    return {
      output: fromClaudeContent(message.content),
      model: message.model,
      requestId,
      usage: {
        input: usage.input_tokens + cached + (usage.cache_creation_input_tokens ?? 0),
        output: usage.output_tokens,
        cached,
        reasoning: usage.output_tokens_details?.thinking_tokens ?? 0,
      },
    }
  }
  return Object.assign(transport, {
    model,
    rates,
    // Pricier models get a proportionally larger cap: max(0.5 USD, price of 1M input tokens).
    spendCapUsd: Math.max(0.5, rates.input),
  })
}
