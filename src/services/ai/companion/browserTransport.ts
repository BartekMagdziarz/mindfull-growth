import { getAIProviderSettings, resolveTaskModel, type LLMTask } from '@/services/llmService'
import { anthropicEffort } from '../anthropic/client'
import { createAnthropicTransport } from './anthropic'
import { createOpenAITransport, CompanionError, type ModelTransport } from './openai'

/** The provider configured in Profile → AI settings, or null when none has a key. */
async function settingsTransport(task: LLMTask | undefined): Promise<ModelTransport | null> {
  const settings = await getAIProviderSettings().catch(() => null)
  if (!settings?.apiKey) return null
  if (settings.provider === 'anthropic')
    return createAnthropicTransport({
      apiKey: settings.apiKey,
      model: resolveTaskModel(settings, task),
      effort: task === 'heavy' ? 'high' : anthropicEffort(settings.reasoningEffort ?? 'medium'),
    })
  if (settings.provider === 'openai') return createOpenAITransport({ apiKey: settings.apiKey })
  return null
}

/**
 * `heavy` (profile observations) runs on the configured long-form model where the provider has one.
 * The user's own provider wins; the dev proxy (.env.ai-companion.local) only stands in when
 * none is configured, so a stale local OpenAI key never shadows a configured Claude key.
 */
export async function browserCompanionTransport(
  options: { task?: LLMTask } = {}
): Promise<ModelTransport> {
  if (import.meta.env.MODE !== 'ai-demo') {
    const configured = await settingsTransport(options.task)
    if (configured) return configured
  }
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
      /* No local proxy. */
    }
  }
  throw new CompanionError('missing-api-key')
}
