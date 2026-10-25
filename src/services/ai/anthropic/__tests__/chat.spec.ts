import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_PROVIDER_SETTINGS_KEY,
  sendMessage,
  type AIProviderSettings,
} from '@/services/llmService'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { CHAT_COPY } from '@/constants/chatCopy'
import { claudeErrorResponse, claudeStreamResponse, requestOf } from './claudeStreamFixture'

vi.mock('@/repositories/userSettingsDexieRepository', () => ({
  userSettingsDexieRepository: { get: vi.fn() },
}))

const mockFetch = vi.fn()

const claude: AIProviderSettings = {
  provider: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  model: 'claude-sonnet-5-5',
  heavyModel: 'claude-opus-5-5',
  apiKey: 'sk-ant-test',
  reasoningEffort: 'medium',
}

function storeSettings(settings: AIProviderSettings) {
  vi.mocked(userSettingsDexieRepository.get).mockImplementation(async key =>
    key === AI_PROVIDER_SETTINGS_KEY ? JSON.stringify(settings) : undefined
  )
}

describe('sendMessage with the Claude provider', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    storeSettings(claude)
  })

  it('sends a Messages API request with top-level system, effort, fallbacks and caching', async () => {
    mockFetch.mockResolvedValueOnce(claudeStreamResponse([{ type: 'text', text: 'Cześć!' }]))

    const reply = await sendMessage([{ role: 'user', content: 'Hej' }], 'Jesteś pomocny.')

    expect(reply).toBe('Cześć!')
    const { url, body, headers } = requestOf(mockFetch)
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(headers.get('authorization')).toBe('Bearer sk-ant-test')
    expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
    expect(body).toMatchObject({
      model: 'claude-sonnet-5-5',
      system: 'Jesteś pomocny.',
      messages: [{ role: 'user', content: 'Hej' }],
      cache_control: { type: 'ephemeral' },
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      // 500-token answer budget + medium thinking headroom.
      max_tokens: 500 + 4096,
      stream: true,
    })
    expect(body).not.toHaveProperty('temperature')
  })

  it('streams text deltas and reports usage including cache tokens', async () => {
    mockFetch.mockResolvedValueOnce(
      claudeStreamResponse(
        [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'text', text: 'Raz, dwa' },
        ],
        {
          usage: {
            input_tokens: 10,
            cache_read_input_tokens: 90,
            cache_creation_input_tokens: 0,
            output_tokens: 7,
          },
        }
      )
    )
    const tokens: string[] = []
    const onReasoning = vi.fn()
    let usage: unknown

    await sendMessage([{ role: 'user', content: 'Policz' }], undefined, {
      onToken: token => tokens.push(token),
      onReasoning,
      onDiagnostics: d => (usage = d.usage),
    })

    expect(tokens).toEqual(['Raz, dwa'])
    expect(onReasoning).toHaveBeenCalled()
    expect(usage).toMatchObject({ prompt_tokens: 100, completion_tokens: 7, total_tokens: 107 })
  })

  it('runs heavy tasks on the long-form model at high effort', async () => {
    mockFetch.mockResolvedValueOnce(claudeStreamResponse([{ type: 'text', text: 'Profil' }]))

    await sendMessage([{ role: 'user', content: 'dane' }], 'system', {
      task: 'heavy',
      maxTokens: 6000,
    })

    expect(requestOf(mockFetch).body).toMatchObject({
      model: 'claude-opus-5-5',
      output_config: { effort: 'high' },
      max_tokens: 6000 + 8192,
    })
  })

  it('omits refusal fallbacks on Haiku, which has none', async () => {
    storeSettings({ ...claude, model: 'claude-haiku-5-5' })
    mockFetch.mockResolvedValueOnce(claudeStreamResponse([{ type: 'text', text: 'ok' }]))

    await sendMessage([{ role: 'user', content: 'hej' }])

    const { body, headers } = requestOf(mockFetch)
    expect(body).not.toHaveProperty('fallbacks')
    expect(headers.get('anthropic-beta')).toBeNull()
  })

  it('maps a refusal and an invalid key onto user-facing errors', async () => {
    mockFetch.mockResolvedValueOnce(claudeStreamResponse([], { stopReason: 'refusal' }))
    await expect(sendMessage([{ role: 'user', content: 'x' }])).rejects.toThrow(
      CHAT_COPY.errors.refusal
    )

    mockFetch.mockResolvedValueOnce(
      claudeErrorResponse(401, 'authentication_error', 'invalid x-api-key')
    )
    await expect(sendMessage([{ role: 'user', content: 'x' }])).rejects.toThrow(
      CHAT_COPY.errors.invalidApiKey
    )
  })

  it('surfaces the API message when credits run out', async () => {
    mockFetch.mockResolvedValueOnce(
      claudeErrorResponse(400, 'invalid_request_error', 'Your credit balance is too low.')
    )
    await expect(sendMessage([{ role: 'user', content: 'x' }])).rejects.toThrow(
      'Your credit balance is too low.'
    )
  })

  it('treats a max_tokens stop as an incomplete answer', async () => {
    mockFetch.mockResolvedValueOnce(
      claudeStreamResponse([{ type: 'text', text: 'urwane' }], { stopReason: 'max_tokens' })
    )
    await expect(sendMessage([{ role: 'user', content: 'x' }])).rejects.toThrow(
      'incomplete response'
    )
  })

  it('refuses to run without a key', async () => {
    storeSettings({ ...claude, apiKey: undefined })
    await expect(sendMessage([{ role: 'user', content: 'x' }])).rejects.toThrow(
      CHAT_COPY.errors.missingAIProviderConfig
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
