import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sendMessage } from '../llmService'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'

// Mock the user settings repository
vi.mock('@/repositories/userSettingsDexieRepository', () => ({
  userSettingsDexieRepository: {
    get: vi.fn(),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('llmService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('should successfully send a message and return response', async () => {
      const mockApiKey = 'sk-test123456789'
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from the AI.',
            },
          },
        ],
      }

      // Mock API key retrieval
      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)

      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await sendMessage([
        { role: 'user', content: 'Hello, how are you?' },
      ])

      expect(result).toBe('This is a test response from the AI.')
      expect(userSettingsDexieRepository.get).toHaveBeenCalledWith('openaiApiKey')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Verify request payload
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[0]).toBe('https://api.openai.com/v1/chat/completions')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
      expect(fetchCall[1].headers['Authorization']).toBe(`Bearer ${mockApiKey}`)

      const requestBody = JSON.parse(fetchCall[1].body as string)
      expect(requestBody.model).toBe('gpt-4o-mini')
      expect(requestBody.temperature).toBe(0.7)
      expect(requestBody.max_tokens).toBe(500)
      expect(requestBody.messages).toEqual([
        { role: 'user', content: 'Hello, how are you?' },
      ])
    })

    it('should include system prompt when provided', async () => {
      const mockApiKey = 'sk-test123456789'
      const mockResponse = {
        choices: [{ message: { content: 'Response with system prompt' } }],
      }

      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await sendMessage(
        [{ role: 'user', content: 'User message' }],
        'You are a helpful assistant.'
      )

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body as string)
      expect(requestBody.messages).toEqual([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'User message' },
      ])
    })

    it('should throw error when API key is missing', async () => {
      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(undefined)

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(
        'OpenAI API key is not configured. Please add your API key in Profile settings.'
      )

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw error on 401 Unauthorized', async () => {
      const mockApiKey = 'sk-invalid'
      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(
        'Invalid API key. Please check your API key in Profile settings.'
      )
    })

    it('should throw error on 429 Rate Limit', async () => {
      const mockApiKey = 'sk-test123456789'
      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Rate limit exceeded. Please try again in a moment.')
    })

    it('should handle OpenAI error response', async () => {
      const mockApiKey = 'sk-test123456789'
      const mockErrorResponse = {
        error: {
          message: 'Invalid request parameters',
          type: 'invalid_request_error',
        },
      }

      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Invalid request parameters')
    })

    it('should handle network errors', async () => {
      const mockApiKey = 'sk-test123456789'
      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)

      // Simulate network error
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Network error. Please check your connection and try again.')
    })

    it('should throw error on empty response', async () => {
      const mockApiKey = 'sk-test123456789'
      const mockResponse = {
        choices: [],
      }

      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Invalid response from API. Please try again.')
    })

    it('should throw error on empty message content', async () => {
      const mockApiKey = 'sk-test123456789'
      const mockResponse = {
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
      }

      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Empty response from API. Please try again.')
    })

    it('should handle multiple messages in conversation', async () => {
      const mockApiKey = 'sk-test123456789'
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
      }

      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await sendMessage([
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Previous response' },
        { role: 'user', content: 'Follow-up question' },
      ])

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body as string)
      expect(requestBody.messages).toHaveLength(3)
      expect(requestBody.messages[0].role).toBe('user')
      expect(requestBody.messages[0].content).toBe('First message')
    })

    it('should handle generic API errors', async () => {
      const mockApiKey = 'sk-test123456789'
      vi.mocked(userSettingsDexieRepository.get).mockResolvedValue(mockApiKey)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })

      await expect(
        sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('API request failed with status 500')
    })
  })
})

