import type {
  BetaMessage,
  BetaMessageParam,
  BetaUsage,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { CHAT_COPY } from '@/constants/chatCopy'
import { LlmError, LlmNotConfiguredError } from '@/services/llmErrors'
import type {
  AIProviderSettings,
  ChatMessage,
  LLMDiagnostics,
  LLMUsage,
  ReasoningEffort,
  SendMessageOptions,
} from '@/services/llmService'
import {
  anthropicEffort,
  anthropicRequestExtras,
  createAnthropicClient,
  toAnthropicChatError,
} from './client'

export interface AnthropicChatPlan {
  model: string
  messages: ChatMessage[] // system prompt already prepended
  completionTokenCap: number
  reasoningEffort: ReasoningEffort
}

/** Claude takes the system prompt top-level; user/assistant turns stay in order. */
export function toAnthropicMessages(messages: ChatMessage[]): {
  system: string
  messages: BetaMessageParam[]
} {
  return {
    system: messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n'),
    messages: messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  }
}

/** Shared `usage` shape: prompt tokens include cache reads and writes, as OpenAI's do. */
export function anthropicUsage(usage: BetaUsage): LLMUsage {
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const prompt_tokens = usage.input_tokens + cacheRead + cacheWrite
  return {
    prompt_tokens,
    completion_tokens: usage.output_tokens,
    total_tokens: prompt_tokens + usage.output_tokens,
    completion_tokens_details: {
      reasoning_tokens: usage.output_tokens_details?.thinking_tokens ?? 0,
    },
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheWrite,
  }
}

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/**
 * The Claude branch of `sendMessage`. Always streams (long profile builds stay
 * clear of HTTP timeouts); `onToken` callers get text deltas, everyone else the
 * final text. Session, timeout and generic error handling stay in `sendMessage`.
 */
export async function sendAnthropicMessage(
  settings: AIProviderSettings,
  plan: AnthropicChatPlan,
  options: SendMessageOptions & { signal: AbortSignal },
  diagnostics: LLMDiagnostics
): Promise<string> {
  if (!settings.apiKey) throw new LlmNotConfiguredError()
  const client = createAnthropicClient(settings.apiKey)
  const { system, messages } = toAnthropicMessages(plan.messages)
  const startedAt = nowMs()
  // Same JSON snapshot as llmService (type-only import keeps the modules acyclic).
  const emit = () =>
    options.onDiagnostics?.(JSON.parse(JSON.stringify(diagnostics)) as LLMDiagnostics)

  let final: BetaMessage
  try {
    const stream = client.beta.messages.stream(
      {
        model: plan.model,
        max_tokens: plan.completionTokenCap,
        ...(system ? { system } : {}),
        messages,
        // Caches the prompt prefix; repeat chats and rebuilds read it at ~0.1×.
        cache_control: { type: 'ephemeral' },
        ...anthropicRequestExtras(plan.model, anthropicEffort(plan.reasoningEffort)),
      },
      { signal: options.signal }
    )
    let reasoningStartedAt: number | null = null
    let firstContentAt: number | null = null
    for await (const event of stream) {
      const at = nowMs()
      if (diagnostics.timing.firstChunkMs === undefined)
        diagnostics.timing.firstChunkMs = at - startedAt
      if (event.type === 'message_start') {
        diagnostics.rawMetadata = {
          ...diagnostics.rawMetadata,
          id: event.message.id,
          model: event.message.model,
        }
      } else if (
        event.type === 'content_block_start' &&
        (event.content_block.type === 'thinking' ||
          event.content_block.type === 'redacted_thinking')
      ) {
        if (reasoningStartedAt === null) {
          reasoningStartedAt = at
          diagnostics.timing.reasoningStartMs = at - startedAt
        }
        diagnostics.observed.reasoningChunks += 1
        options.onReasoning?.()
      } else if (event.type === 'content_block_delta' && event.delta.type === 'thinking_delta') {
        diagnostics.observed.reasoningCharacters += event.delta.thinking.length
        options.onReasoning?.()
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        if (firstContentAt === null) {
          firstContentAt = at
          diagnostics.timing.firstContentMs = at - startedAt
          if (reasoningStartedAt !== null)
            diagnostics.timing.reasoningDurationMs = at - reasoningStartedAt
        }
        diagnostics.observed.contentChunks += 1
        diagnostics.observed.contentCharacters += event.delta.text.length
        options.onToken?.(event.delta.text)
      } else continue
      emit()
    }
    final = await stream.finalMessage()
    diagnostics.timing.totalMs = nowMs() - startedAt
    if (firstContentAt !== null) diagnostics.timing.generationMs = nowMs() - firstContentAt
    diagnostics.rawMetadata = {
      ...diagnostics.rawMetadata,
      model: final.model,
      stop_reason: final.stop_reason,
      request_id: stream.request_id ?? undefined,
    }
  } catch (error) {
    throw toAnthropicChatError(error)
  }

  diagnostics.usage = anthropicUsage(final.usage)
  emit()
  if (final.stop_reason === 'refusal') throw new LlmError('refusal', CHAT_COPY.errors.refusal)
  if (final.stop_reason === 'max_tokens' || final.stop_reason === 'model_context_window_exceeded')
    throw new LlmError(
      'empty-response',
      'The API returned an incomplete response. Please try again.'
    )
  const content = final.content
    .flatMap(block => (block.type === 'text' ? [block.text] : []))
    .join('')
  if (!content.trim())
    throw new LlmError('empty-response', 'Empty response from API. Please try again.')
  return content
}
