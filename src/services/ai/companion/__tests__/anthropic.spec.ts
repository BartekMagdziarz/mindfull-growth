import { describe, expect, it, vi } from 'vitest'
import type { BetaContentBlock } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import {
  claudeOutputSchema,
  createAnthropicTransport,
  fromClaudeContent,
  toClaudeMessages,
} from '../anthropic'
import { CompanionError, type ModelRequest, type WireItem } from '../openai'
import { REPLY_SCHEMA } from '../runtime'
import {
  claudeErrorResponse,
  claudeStreamResponse,
  requestOf,
} from '../../anthropic/__tests__/claudeStreamFixture'

const request = (overrides: Partial<ModelRequest> = {}): ModelRequest => ({
  input: [{ role: 'user', content: '{"mode":"topics"}' }],
  instructions: 'policy',
  schema: REPLY_SCHEMA,
  maxOutputTokens: 4096,
  toolsEnabled: true,
  signal: new AbortController().signal,
  ...overrides,
})

describe('Claude companion transport', () => {
  it('sends system, tools, structured output and effort, and exposes its pricing', async () => {
    const fetcher = vi.fn(async () =>
      claudeStreamResponse(
        [{ type: 'text', text: '{"message":"ok","topics":[],"citations":[]}' }],
        {
          usage: { input_tokens: 30, cache_read_input_tokens: 70, output_tokens: 12 },
        }
      )
    )
    const transport = createAnthropicTransport({
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-5-5',
      fetch: fetcher,
    })

    const result = await transport(request())

    const { body } = requestOf(fetcher)
    expect(body).toMatchObject({
      model: 'claude-sonnet-5-5',
      system: 'policy',
      max_tokens: 4096,
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema' } },
    })
    expect(body.tools).toHaveLength(6)
    expect(result.usage).toEqual({ input: 100, output: 12, cached: 70, reasoning: 0 })
    expect(result.requestId).toBe('req_test')
    expect(result.output).toEqual([
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: '{"message":"ok","topics":[],"citations":[]}' }],
      },
    ])
    expect(transport.model).toBe('claude-sonnet-5-5')
    expect(transport.rates).toEqual({ input: 2, output: 10 })
    expect(transport.spendCapUsd).toBe(2)
  })

  it('round-trips thinking and tool calls into the next request unchanged', async () => {
    const thinking = { type: 'thinking', thinking: '', signature: 'sig-1' }
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        claudeStreamResponse(
          [
            thinking,
            { type: 'tool_use', id: 'toolu_1', name: 'search_history', input: { query: 'sen' } },
          ],
          { stopReason: 'tool_use' }
        )
      )
      .mockResolvedValueOnce(
        claudeStreamResponse([{ type: 'text', text: '{"message":"","topics":[],"citations":[]}' }])
      )
    const transport = createAnthropicTransport({
      apiKey: 'k',
      model: 'claude-opus-5-5',
      fetch: fetcher,
    })

    const first = await transport(request())
    // What the runtime appends after executing the call (see runtime.ts `converted`).
    const input: WireItem[] = [
      ...request().input,
      ...first.output,
      { type: 'function_call_output', call_id: 'toolu_1', output: '{"items":[]}' },
    ]
    await transport(request({ input, toolsEnabled: false }))

    expect(requestOf(fetcher, 1).body).toMatchObject({
      tool_choice: { type: 'none' },
      messages: [
        { role: 'user', content: [{ type: 'text', text: '{"mode":"topics"}' }] },
        {
          role: 'assistant',
          content: [
            thinking,
            { type: 'tool_use', id: 'toolu_1', name: 'search_history', input: { query: 'sen' } },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{"items":[]}' }],
        },
      ],
    })
  })

  it('maps refusals, truncation and HTTP errors to companion codes without provider bodies', async () => {
    const make = (response: Response) =>
      createAnthropicTransport({
        apiKey: 'k',
        model: 'claude-sonnet-5-5',
        fetch: async () => response,
      })

    await expect(
      make(claudeStreamResponse([], { stopReason: 'refusal' }))(request())
    ).rejects.toEqual(new CompanionError('model-refusal'))
    await expect(
      make(claudeStreamResponse([{ type: 'text', text: '{' }], { stopReason: 'max_tokens' }))(
        request()
      )
    ).rejects.toEqual(new CompanionError('incomplete-response'))
    await expect(
      make(claudeErrorResponse(400, 'invalid_request_error', 'credit balance is too low'))(
        request()
      )
    ).rejects.toEqual(new CompanionError('anthropic-http-400'))
  })

  it('rejects an empty key', () => {
    expect(() => createAnthropicTransport({ apiKey: ' ', model: 'claude-sonnet-5-5' })).toThrow(
      'missing-api-key'
    )
  })
})

describe('Claude wire translation', () => {
  it('merges history text and drops empty blocks', () => {
    expect(
      toClaudeMessages([
        { role: 'user', content: 'a' },
        { role: 'assistant', content: '' },
        { role: 'assistant', content: 'b' },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'c' }] },
      ])
    ).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'a' }] },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'b' },
          { type: 'text', text: 'c' },
        ],
      },
    ])
  })

  it('does not echo the declined model’s thinking or tool calls after a fallback', () => {
    const content = [
      { type: 'thinking', thinking: '', signature: 'declined' },
      { type: 'text', text: '{"mess' },
      { type: 'fallback', from: { model: 'claude-sonnet-5-5' }, to: { model: 'claude-opus-4-8' } },
      { type: 'text', text: 'age":""}' },
    ] as unknown as BetaContentBlock[]

    expect(fromClaudeContent(content).map(item => item.type)).toEqual(['message', 'message'])
  })

  it('strips constraints structured outputs reject and closes every object', () => {
    const schema = claudeOutputSchema({
      type: 'object',
      required: ['a'],
      properties: {
        a: { type: 'string', minLength: 1, maxLength: 9 },
        b: { type: 'array', maxItems: 5, items: { type: 'integer', minimum: 0 } },
        c: { anyOf: [{ type: 'object', properties: {} }, { type: 'null' }] },
      },
    })
    expect(schema).toEqual({
      type: 'object',
      required: ['a'],
      additionalProperties: false,
      properties: {
        a: { type: 'string' },
        b: { type: 'array', items: { type: 'integer' } },
        c: {
          anyOf: [
            { type: 'object', properties: {}, additionalProperties: false },
            { type: 'null' },
          ],
        },
      },
    })
  })
})
