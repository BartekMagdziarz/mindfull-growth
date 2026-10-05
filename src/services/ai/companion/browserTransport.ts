import { getAIProviderSettings } from '@/services/llmService'
import { createOpenAITransport, CompanionError } from './openai'

export async function browserCompanionTransport() {
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/__companion/status', { cache: 'no-store' })
      if (response.ok && (await response.json()).available === true) {
        return createOpenAITransport({
          apiKey: 'local-proxy',
          fetch: (_url, init) =>
            fetch('/__companion/responses', {
              ...init,
              headers: { 'Content-Type': 'application/json' },
            }),
        })
      }
    } catch {
      /* Fall back to the user's existing OpenAI settings. */
    }
  }
  if (import.meta.env.MODE === 'ai-demo') throw new CompanionError('missing-api-key')
  try {
    const settings = await getAIProviderSettings()
    if (settings.provider !== 'openai' || !settings.apiKey) throw new Error('missing')
    return createOpenAITransport({ apiKey: settings.apiKey })
  } catch {
    throw new CompanionError('missing-api-key')
  }
}
