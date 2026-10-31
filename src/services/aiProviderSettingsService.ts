import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { LlmNotConfiguredError } from '@/services/llmErrors'
import { ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_HEAVY_MODEL } from '@/services/ai/anthropic/client'

// Default model configuration. gpt-5.4-nano is OpenAI's smallest/cheapest
// reasoning model (alias `gpt-5.4-nano`, snapshot gpt-5.4-nano-2026-03-17,
// 400k context) — fast and inexpensive for journal chats and profile builds.
export const DEFAULT_MODEL = 'gpt-5.4-nano'

export type AIProviderId = 'openai' | 'anthropic' | 'ollama' | 'mlx' | 'custom'
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high'

export interface AIProviderSettings {
  provider: AIProviderId
  baseUrl: string
  model: string
  apiKey?: string
  reasoningEffort?: ReasoningEffort
  /** Model for long-form tasks (profile build); falls back to `model`. */
  heavyModel?: string
}

export const AI_PROVIDER_SETTINGS_KEY = 'aiProviderSettings'
export const LEGACY_OPENAI_API_KEY = 'openaiApiKey'

export const AI_PROVIDER_PRESETS: Record<Exclude<AIProviderId, 'custom'>, AIProviderSettings> = {
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: DEFAULT_MODEL,
  },
  anthropic: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: ANTHROPIC_DEFAULT_MODEL,
    heavyModel: ANTHROPIC_HEAVY_MODEL,
    reasoningEffort: 'medium',
  },
  ollama: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma4:e4b',
    reasoningEffort: 'low',
  },
  mlx: {
    provider: 'mlx',
    baseUrl: 'http://localhost:8080/v1',
    model: 'mlx-community/gemma-4-26B-A4B-it-OptiQ-4bit',
  },
}

function isAIProviderId(value: unknown): value is AIProviderId {
  return (
    value === 'openai' ||
    value === 'anthropic' ||
    value === 'ollama' ||
    value === 'mlx' ||
    value === 'custom'
  )
}

/** Hosted providers cannot be reached without a key. */
export function providerRequiresApiKey(provider: AIProviderId): boolean {
  return provider === 'openai' || provider === 'anthropic'
}

/** `heavy` = long-form work such as the profile build; uses `heavyModel` when set. */
export type LLMTask = 'default' | 'heavy'

export function resolveTaskModel(settings: AIProviderSettings, task: LLMTask = 'default'): string {
  return (task === 'heavy' && settings.heavyModel) || settings.model
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return value === 'none' || value === 'low' || value === 'medium' || value === 'high'
}

function parseProviderSettings(raw: string): AIProviderSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AIProviderSettings>
    if (
      !isAIProviderId(parsed.provider) ||
      typeof parsed.baseUrl !== 'string' ||
      typeof parsed.model !== 'string'
    ) {
      return null
    }

    const baseUrl = parsed.baseUrl.trim()
    const model = parsed.model.trim()
    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : undefined
    const heavyModel = typeof parsed.heavyModel === 'string' ? parsed.heavyModel.trim() : undefined

    if (!baseUrl || !model) return null

    return {
      provider: parsed.provider,
      baseUrl,
      model,
      ...(apiKey ? { apiKey } : {}),
      ...(heavyModel ? { heavyModel } : {}),
      ...(isReasoningEffort(parsed.reasoningEffort)
        ? { reasoningEffort: parsed.reasoningEffort }
        : {}),
    }
  } catch {
    return null
  }
}

export function normaliseBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

export async function getAIProviderSettings(): Promise<AIProviderSettings> {
  const storedSettings = await userSettingsDexieRepository.get(AI_PROVIDER_SETTINGS_KEY)
  if (storedSettings) {
    const settings = parseProviderSettings(storedSettings)
    if (settings && providerRequiresApiKey(settings.provider) && !settings.apiKey) {
      throw new LlmNotConfiguredError()
    }
    if (settings) return settings
    throw new LlmNotConfiguredError()
  }

  const legacyApiKey = await userSettingsDexieRepository.get(LEGACY_OPENAI_API_KEY)
  if (legacyApiKey?.trim()) {
    return {
      ...AI_PROVIDER_PRESETS.openai,
      apiKey: legacyApiKey.trim(),
    }
  }

  throw new LlmNotConfiguredError()
}

export async function hasAIProviderConfigured(): Promise<boolean> {
  try {
    await getAIProviderSettings()
    return true
  } catch {
    return false
  }
}
