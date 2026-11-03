import { afterEach, describe, expect, it, vi } from 'vitest'

const settings = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))
vi.mock('@/services/llmService', () => ({
  getAIProviderSettings: async () => settings.value,
  resolveTaskModel: (s: { model?: string }) => s.model,
}))

import { browserCompanionTransport } from '../browserTransport'
import { CompanionError } from '../openai'

const proxyAvailable = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ available: true }), { status: 200 }))
  )

afterEach(() => {
  settings.value = null
  vi.unstubAllGlobals()
})

describe('browserCompanionTransport', () => {
  it('uses the configured Claude key even when the dev proxy is available', async () => {
    proxyAvailable()
    settings.value = { provider: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-5-5' }
    const transport = await browserCompanionTransport()
    expect(transport.model).toBe('claude-sonnet-5-5')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('falls back to the dev proxy when no provider is configured', async () => {
    proxyAvailable()
    const transport = await browserCompanionTransport()
    expect(transport.model).toBeUndefined()
    expect(fetch).toHaveBeenCalledWith('/__companion/status', { cache: 'no-store' })
  })

  it('reports a missing key when neither is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 }))
    )
    await expect(browserCompanionTransport()).rejects.toEqual(new CompanionError('missing-api-key'))
  })
})
