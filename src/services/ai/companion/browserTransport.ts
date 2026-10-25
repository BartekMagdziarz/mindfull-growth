import { getAIProviderSettings, resolveTaskModel, type LLMTask } from '@/services/llmService'
import { anthropicEffort } from '../anthropic/client'
import { createAnthropicTransport } from './anthropic'
import { createOpenAITransport, CompanionError, type ModelTransport } from './openai'

/** `heavy` (profile observations) runs on the configured long-form model where the provider has one. */
export async function browserCompanionTransport(
  options: { task?: LLMTask } = {}
): Promise<ModelTransport> {
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
      /* Fall back to the user's provider settings. */
    }
  }
  if (import.meta.env.MODE === 'ai-demo') throw new CompanionError('missing-api-key')
  try {
    const settings = await getAIProviderSettings()
    if (settings.provider === 'anthropic' && settings.apiKey)
      return createAnthropicTransport({
        apiKey: settings.apiKey,
        model: resolveTaskModel(settings, options.task),
        effort:
          options.task === 'heavy' ? 'high' : anthropicEffort(settings.reasoningEffort ?? 'medium'),
      })
    if (settings.provider !== 'openai' || !settings.apiKey) throw new Error('missing')
    return createOpenAITransport({ apiKey: settings.apiKey })
  } catch {
    throw new CompanionError('missing-api-key')
  }
}
