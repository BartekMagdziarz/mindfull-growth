import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  sendMessage,
  type AIProviderSettings,
} from '../llmService'
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

    it('sends Ollama requests without requiring an API key', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockSuccess('Ollama response')

      const result = await sendMessage([{ role: 'user', content: 'Hello' }])

      expect(result).toBe('Ollama response')
      const request = latestRequest()
      expect(request.url).toBe('http://localhost:11434/v1/chat/completions')
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

    it('adds reasoning headroom to max_tokens for the Ollama provider', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockSuccess('Ollama response')

      await sendMessage([{ role: 'user', content: 'Hello' }])

      // 500 default answer budget + 2048 reasoning headroom
      expect(latestRequest().body.max_tokens).toBe(2548)
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
      mockSuccess()

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

    it('returns only message content and ignores reasoning', async () => {
      storeSettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                reasoning: 'private reasoning',
                content: 'Visible answer',
              },
            },
          ],
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
  })
})
