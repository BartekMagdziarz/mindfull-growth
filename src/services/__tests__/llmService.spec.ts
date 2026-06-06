import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  sendMessage,
  snapshotLLMDiagnostics,
  computeOllamaNumCtx,
  computeMaxPromptTokens,
  NUM_CTX_CHARS_PER_TOKEN,
  OLLAMA_NUM_CTX_CEILING,
  PROMPT_SAFETY_TOKENS,
  type AIProviderSettings,
  type LLMDiagnostics,
} from '../llmService'
import { reactive } from 'vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'

vi.mock('@/repositories/userSettingsDexieRepository', () => ({
  userSettingsDexieRepository: {
    get: vi.fn(),
  },
}))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as typeof fetch

function storeSettings(settings?: AIProviderSettings, legacyKey?: string) {
  vi.mocked(userSettingsDexieRepository.get).mockImplementation(async (key) => {
    if (key === AI_PROVIDER_SETTINGS_KEY && settings) {
      return JSON.stringify(settings)
    }
    if (key === LEGACY_OPENAI_API_KEY) return legacyKey
    return undefined
  })
}

function mockSuccess(content = 'This is a test response from the AI.') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  })
}

function mockStream(events: string[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      events.forEach((event) => controller.enqueue(encoder.encode(event)))
      controller.close()
    },
  })

  mockFetch.mockResolvedValueOnce({
    ok: true,
    body,
  })
}

// Ollama native /api/chat fixtures: `{ message: { content } }` + token counts,
// and a newline-delimited JSON stream (not SSE `data:` frames).
function mockOllamaSuccess(
  content = 'This is a test response from the AI.',
  extra: {
    thinking?: string
    prompt_eval_count?: number
    eval_count?: number
  } = {},
) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      message: {
        role: 'assistant',
        content,
        ...(extra.thinking !== undefined ? { thinking: extra.thinking } : {}),
      },
      done: true,
      done_reason: 'stop',
      prompt_eval_count: extra.prompt_eval_count ?? 11,
      eval_count: extra.eval_count ?? 7,
      total_duration: 1234,
      eval_duration: 567,
    }),
  })
}

function mockOllamaStream(objects: Array<Record<string, unknown>>) {
  mockStream(objects.map((o) => JSON.stringify(o) + '\n'))
}

function latestRequest() {
  const fetchCall = mockFetch.mock.calls[0]
  return {
    url: fetchCall[0],
    init: fetchCall[1] as RequestInit & {
      headers: Record<string, string>
      body: string
    },
    body: JSON.parse(fetchCall[1].body as string),
  }
}

describe('llmService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('sends OpenAI requests with the configured API key', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockSuccess()

      const result = await sendMessage([
        { role: 'user', content: 'Hello, how are you?' },
      ])

      expect(result).toBe('This is a test response from the AI.')
      expect(userSettingsDexieRepository.get).toHaveBeenCalledWith(
        AI_PROVIDER_SETTINGS_KEY,
      )
      expect(mockFetch).toHaveBeenCalledTimes(1)

      const request = latestRequest()
      expect(request.url).toBe('https://api.openai.com/v1/chat/completions')
      expect(request.init.method).toBe('POST')
      expect(request.init.headers['Content-Type']).toBe('application/json')
      expect(request.init.headers.Authorization).toBe('Bearer sk-test123456789')
      expect(request.body.model).toBe('gpt-5-nano')
      expect(request.body.temperature).toBe(0.7)
      expect(request.body.max_tokens).toBe(500)
      expect(request.body.messages).toEqual([
        { role: 'user', content: 'Hello, how are you?' },
      ])
    })

    it('captures OpenAI non-streaming token usage via onDiagnostics', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      // OpenAI returns a usage block on non-streaming responses by default.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'hi' } }],
          usage: { prompt_tokens: 1200, completion_tokens: 80, total_tokens: 1280 },
        }),
      })

      let captured: LLMDiagnostics | undefined
      await sendMessage([{ role: 'user', content: 'Hello' }], undefined, {
        // last non-undefined usage wins (the callback fires more than once)
        onDiagnostics: (d) => {
          if (d.usage) captured = d
        },
      })

      expect(captured?.usage?.prompt_tokens).toBe(1200)
      expect(captured?.usage?.completion_tokens).toBe(80)
      expect(captured?.usage?.total_tokens).toBe(1280)
    })

    it('falls back to the legacy OpenAI key when provider settings are missing', async () => {
      storeSettings(undefined, 'sk-legacy')
      mockSuccess('Legacy response')

      await sendMessage([{ role: 'user', content: 'Hello' }])

      expect(userSettingsDexieRepository.get).toHaveBeenCalledWith(
        AI_PROVIDER_SETTINGS_KEY,
      )
      expect(userSettingsDexieRepository.get).toHaveBeenCalledWith(
        LEGACY_OPENAI_API_KEY,
      )
      const request = latestRequest()
      expect(request.url).toBe('https://api.openai.com/v1/chat/completions')
      expect(request.init.headers.Authorization).toBe('Bearer sk-legacy')
      expect(request.body.model).toBe('gpt-5-nano')
    })

    it('sends Ollama requests to the native /api/chat endpoint without an API key', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaSuccess('Ollama response')

      const result = await sendMessage([{ role: 'user', content: 'Hello' }])

      expect(result).toBe('Ollama response')
      const request = latestRequest()
      expect(request.url).toBe('http://localhost:11434/api/chat')
      expect(request.init.headers.Authorization).toBeUndefined()
      expect(request.body.model).toBe('gemma4:e4b')
    })

    it('sends MLX requests without requiring an API key', async () => {
      storeSettings({
        provider: 'mlx',
        baseUrl: 'http://localhost:8080/v1',
        model: 'mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit',
      })
      mockSuccess('MLX response')

      await sendMessage([{ role: 'user', content: 'Hello' }])

      const request = latestRequest()
      expect(request.url).toBe('http://localhost:8080/v1/chat/completions')
      expect(request.init.headers.Authorization).toBeUndefined()
      expect(request.body.model).toBe(
        'mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit',
      )
    })

    it('puts the completion budget in options.num_predict and enables think for Ollama by default', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaSuccess('Ollama response')

      await sendMessage([{ role: 'user', content: 'Hello' }])

      const body = latestRequest().body
      // 500 default answer budget + 512 low-effort reasoning headroom
      expect(body.options.num_predict).toBe(1012)
      expect(body.think).toBe(true)
      // native /api/chat must not carry the OpenAI-compatible fields
      expect(body.max_tokens).toBeUndefined()
      expect(body.reasoning_effort).toBeUndefined()
    })

    it('maps Ollama reasoning effort to the num_predict headroom', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
        reasoningEffort: 'medium',
      })
      mockOllamaSuccess('Ollama response')

      await sendMessage([{ role: 'user', content: 'Hello' }], undefined, {
        maxTokens: 300,
      })

      const body = latestRequest().body
      expect(body.options.num_predict).toBe(1324)
      expect(body.think).toBe(true)
    })

    it('streams visible content while keeping thinking hidden (Ollama native)', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaStream([
        { message: { thinking: 'private analysis' } },
        { message: { content: 'Visible ' } },
        { message: { content: 'answer' } },
        { message: { content: '' }, done: true, eval_count: 2 },
      ])
      const onToken = vi.fn()
      const onReasoning = vi.fn()

      const result = await sendMessage(
        [{ role: 'user', content: 'Hello' }],
        undefined,
        { onToken, onReasoning },
      )

      expect(result).toBe('Visible answer')
      expect(onReasoning).toHaveBeenCalledTimes(1)
      expect(onToken.mock.calls.map(([token]) => token)).toEqual([
        'Visible ',
        'answer',
      ])
      expect(latestRequest().body.stream).toBe(true)
      // native /api/chat does not use OpenAI stream_options
      expect(latestRequest().body.stream_options).toBeUndefined()
    })

    it('reports timing, observed chunks, and provider token usage', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaStream([
        { model: 'gemma4:e4b', message: { thinking: 'abc' } },
        { message: { content: 'Answer' } },
        {
          message: { content: '' },
          done: true,
          prompt_eval_count: 12,
          eval_count: 9,
        },
      ])
      const diagnosticsSnapshots: Array<{
        usage?: { total_tokens?: number }
        observed: { reasoningCharacters: number; contentCharacters: number }
        timing: { totalMs?: number; firstContentMs?: number }
      }> = []

      await sendMessage(
        [{ role: 'user', content: 'Hello' }],
        undefined,
        {
          onToken: vi.fn(),
          onDiagnostics: (diagnostics) => {
            diagnosticsSnapshots.push(diagnostics)
          },
        },
      )

      const finalDiagnostics =
        diagnosticsSnapshots[diagnosticsSnapshots.length - 1]
      expect(finalDiagnostics.usage?.total_tokens).toBe(21)
      expect(finalDiagnostics.observed.reasoningCharacters).toBe(3)
      expect(finalDiagnostics.observed.contentCharacters).toBe(6)
      expect(finalDiagnostics.timing.firstContentMs).toBeTypeOf('number')
      expect(finalDiagnostics.timing.totalMs).toBeTypeOf('number')
    })

    it('includes the effective token limits and native request metadata in diagnostics', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaStream([
        { message: { content: 'Answer' } },
        { message: { content: '' }, done: true, eval_count: 1 },
      ])
      const onDiagnostics = vi.fn()

      await sendMessage([{ role: 'user', content: 'Hello' }], undefined, {
        maxTokens: 300,
        reasoningEffort: 'medium',
        onToken: vi.fn(),
        onDiagnostics,
      })

      // 'Hello' is 5 chars -> ceil(5/3)+1324+512 = 1838 < floor -> 4096
      expect(onDiagnostics.mock.calls[0][0].rawMetadata.request).toEqual({
        answerTokenBudget: 300,
        reasoningTokenHeadroom: 1024,
        completionTokenCap: 1324,
        reasoningControl: 'native-think',
        wireFormat: 'ollama-native',
        numCtx: 4096,
        think: true,
      })
    })

    it('adds reasoning headroom on top of an explicit maxTokens override for local providers', async () => {
      storeSettings({
        provider: 'mlx',
        baseUrl: 'http://localhost:8080/v1',
        model: 'mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit',
      })
      mockSuccess('MLX response')

      await sendMessage([{ role: 'user', content: 'Hello' }], undefined, {
        maxTokens: 300,
      })

      // 300 requested + 2048 reasoning headroom
      expect(latestRequest().body.max_tokens).toBe(2348)
    })

    it('does not add reasoning headroom for hosted OpenAI requests', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockSuccess()

      await sendMessage([{ role: 'user', content: 'Hello' }], undefined, {
        maxTokens: 300,
      })

      expect(latestRequest().body.max_tokens).toBe(300)
    })

    it('adds Authorization for custom providers when an API key is configured', async () => {
      storeSettings({
        provider: 'custom',
        baseUrl: 'http://localhost:9999/v1/',
        model: 'custom-model',
        apiKey: 'custom-token',
      })
      mockSuccess()

      await sendMessage([{ role: 'user', content: 'Hello' }])

      const request = latestRequest()
      expect(request.url).toBe('http://localhost:9999/v1/chat/completions')
      expect(request.init.headers.Authorization).toBe('Bearer custom-token')
      expect(request.body.model).toBe('custom-model')
    })

    it('uses an explicit model override when provided', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaSuccess()

      await sendMessage(
        [{ role: 'user', content: 'User message' }],
        undefined,
        { model: 'override-model' },
      )

      expect(latestRequest().body.model).toBe('override-model')
    })

    it('includes system prompt before existing conversation history', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockSuccess('Combined response')

      await sendMessage(
        [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'Previous answer' },
          { role: 'user', content: 'Follow-up question' },
        ],
        'System behavior description',
      )

      expect(latestRequest().body.messages).toEqual([
        { role: 'system', content: 'System behavior description' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Previous answer' },
        { role: 'user', content: 'Follow-up question' },
      ])
    })

    it('throws when no AI provider is configured', async () => {
      storeSettings()

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow(
        'AI provider is not configured. Please add AI provider settings in Profile settings.',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws when OpenAI provider settings have no API key', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow(
        'AI provider is not configured. Please add AI provider settings in Profile settings.',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws error on 401 Unauthorized', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-invalid',
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow(
        'Invalid API key. Please check your API key in Profile settings.',
      )
    })

    it('throws error on 429 Rate Limit', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Rate limit exceeded. Please try again in a moment.')
    })

    it('handles OpenAI-compatible error response bodies', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid request parameters',
            type: 'invalid_request_error',
          },
        }),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Invalid request parameters')
    })

    it('handles network errors', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Network error. Please check your connection and try again.')
    })

    it('throws error on empty choices', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Invalid response from API. Please try again.')
    })

    it('throws error on empty message content', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Empty response from API. Please try again.')
    })

    it('returns only message content and ignores thinking (Ollama native)', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            thinking: 'private reasoning',
            content: 'Visible answer',
          },
          done: true,
        }),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).resolves.toBe('Visible answer')
    })

    it('handles generic API errors', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('API request failed with status 500')
    })

    // --- Ollama native adapter specifics ---

    it('derives the native URL when the Ollama baseUrl has no /v1 suffix', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'gemma4:e4b',
      })
      mockOllamaSuccess('ok')

      await sendMessage([{ role: 'user', content: 'Hello' }])

      expect(latestRequest().url).toBe('http://localhost:11434/api/chat')
    })

    it('sends think:false and no headroom when reasoning effort is none', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
        reasoningEffort: 'none',
      })
      mockOllamaSuccess('ok')

      await sendMessage([{ role: 'user', content: 'Hello' }], undefined, {
        maxTokens: 800,
      })

      const body = latestRequest().body
      expect(body.think).toBe(false)
      expect(body.options.num_predict).toBe(800)
    })

    it('auto-sizes num_ctx above the floor for a large prompt', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaSuccess('ok')

      const big = 'x'.repeat(30000) // ~10000 tokens at chars/3
      await sendMessage([{ role: 'user', content: big }], undefined, {
        maxTokens: 2048,
        reasoningEffort: 'none',
      })

      // ceil(30000/3) + 2048 + 512 = 12560
      expect(latestRequest().body.options.num_ctx).toBe(12560)
    })

    it('clamps num_ctx at the ceiling for an oversized prompt', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockOllamaSuccess('ok')

      const huge = 'x'.repeat(300000)
      await sendMessage([{ role: 'user', content: huge }], undefined, {
        maxTokens: 2048,
        reasoningEffort: 'none',
      })

      expect(latestRequest().body.options.num_ctx).toBe(OLLAMA_NUM_CTX_CEILING)
    })

    it('reassembles a native answer split across stream chunk boundaries', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockStream([
        '{"message":{"con',
        'tent":"Hi"}}\n',
        '{"message":{"content":""},"done":true,"eval_count":1}\n',
      ])

      const result = await sendMessage(
        [{ role: 'user', content: 'Hello' }],
        undefined,
        { onToken: vi.fn() },
      )

      expect(result).toBe('Hi')
    })

    it('throws when a native thinking-only response has no visible content', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { thinking: 'lots of reasoning', content: '   ' },
          done: true,
        }),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Empty response from API. Please try again.')
    })

    it('treats a whitespace-only OpenAI response as empty', async () => {
      storeSettings({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-5-nano',
        apiKey: 'sk-test123456789',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '\n  \n' } }] }),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }]),
      ).rejects.toThrow('Empty response from API. Please try again.')
    })
  })

  describe('computeOllamaNumCtx', () => {
    it('uses the floor for a tiny prompt', () => {
      expect(computeOllamaNumCtx(0, 500)).toBe(4096)
    })

    it('scales above the floor with prompt + answer budget', () => {
      // ceil(30000/3) + 2048 + 512
      expect(computeOllamaNumCtx(30000, 2048)).toBe(12560)
    })

    it('clamps at the ceiling', () => {
      expect(computeOllamaNumCtx(600000, 2048)).toBe(OLLAMA_NUM_CTX_CEILING)
    })
  })

  describe('computeMaxPromptTokens', () => {
    it('inverts num_ctx sizing per provider/effort (answer=6000, safety=2048)', () => {
      expect(computeMaxPromptTokens('ollama', 'none', 6000)).toBe(56976)
      expect(computeMaxPromptTokens('ollama', 'low', 6000)).toBe(56464)
      expect(computeMaxPromptTokens('ollama', 'medium', 6000)).toBe(55952)
      expect(computeMaxPromptTokens('ollama', 'high', 6000)).toBe(54928)
      // mlx uses a fixed 2048 headroom regardless of effort.
      expect(computeMaxPromptTokens('mlx', 'low', 6000)).toBe(54928)
    })

    it('returns null for hosted providers (no hard local window)', () => {
      expect(computeMaxPromptTokens('openai', 'high', 6000)).toBeNull()
      expect(computeMaxPromptTokens('custom', 'low', 6000)).toBeNull()
    })

    it('respects a custom safety margin', () => {
      expect(computeMaxPromptTokens('ollama', 'low', 6000, 0)).toBe(56464 + PROMPT_SAFETY_TOKENS)
    })

    it('round-trips with computeOllamaNumCtx (budget leaves exactly CEILING − safety)', () => {
      const budget = computeMaxPromptTokens('ollama', 'low', 6000) as number
      // The build's num_predict at low effort = 6000 answer + 512 reasoning headroom.
      const numCtx = computeOllamaNumCtx(budget * NUM_CTX_CHARS_PER_TOKEN, 6512)
      expect(numCtx).toBe(OLLAMA_NUM_CTX_CEILING - PROMPT_SAFETY_TOKENS)
      expect(numCtx).toBeLessThanOrEqual(OLLAMA_NUM_CTX_CEILING)
    })
  })

  it('creates a plain diagnostics snapshot from a Vue reactive proxy', () => {
    const diagnostics = reactive<LLMDiagnostics>({
      provider: 'ollama',
      model: 'gemma4:e4b',
      timing: { totalMs: 100 },
      observed: {
        reasoningChunks: 1,
        reasoningCharacters: 20,
        contentChunks: 1,
        contentCharacters: 10,
      },
      rawMetadata: { request: { completionTokenCap: 1012 } },
    })

    const snapshot = snapshotLLMDiagnostics(diagnostics)

    expect(snapshot).toEqual(diagnostics)
    expect(snapshot).not.toBe(diagnostics)
    expect(snapshot.timing).not.toBe(diagnostics.timing)
  })
})
