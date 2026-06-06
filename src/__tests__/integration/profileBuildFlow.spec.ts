/**
 * Profile build flow — integration smoke test (Epic 11 Story 8).
 *
 * Drives the full pipeline end-to-end through real repositories against
 * `fake-indexeddb`, with `llmService.sendMessage` stubbed:
 *
 *   seed journal entry
 *     → userProfileStore.buildProfile(scope)
 *     → parseProfileResponse
 *     → userProfileStore.createProfile(...)
 *     → UserProfile + ProfileBuildLogEntry persisted
 *
 * This is the only test that exercises `store.buildProfile` → parser → store
 * write in a single go; everything else is unit-level. Treat it as
 * documentation for how the feature is expected to behave end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { resetDatabase } from '../utils/dbTestUtils'
import { initializeStores } from './testUtils'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'
import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import {
  useUserProfileStore,
  ProfileBuildError,
} from '@/stores/userProfile.store'
import { PROFILE_MAX_TOKENS, type UserProfileScope } from '@/domain/userProfile'

// Stub llmService.sendMessage so we can control responses deterministically.
// Spreading `...actual` preserves DEFAULT_MODEL and other re-exports that the
// store imports from the same module.
vi.mock('@/services/llmService', async () => {
  const actual = await vi.importActual<typeof import('@/services/llmService')>(
    '@/services/llmService',
  )
  return { ...actual, sendMessage: vi.fn() }
})
import {
  sendMessage,
  computeMaxPromptTokens,
  AI_PROVIDER_SETTINGS_KEY,
} from '@/services/llmService'

// A well-formed mock response covering every EN section header the parser
// expects. Using the exact headers from `profileLLMAssists.ts`.
const CANNED_SUCCESS_RESPONSE = [
  '## Summary',
  '',
  'Reflective and calm in recent days, with a growing awareness of bodily cues.',
  '',
  '## Values and guiding principles',
  '',
  'Clarity. Presence. Growth.',
  '',
  '## Emotional patterns',
  '',
  'Calm mornings, reactive evenings — a pattern worth noticing.',
  '',
  '## Strengths',
  '',
  'Careful observation.',
  '',
  '## Challenges and growth edges',
  '',
  'Tendency to ruminate before sleep.',
  '',
  '## Relationships and social patterns',
  '',
  'Prefers depth to breadth in social contact.',
  '',
  '## Themes and recurring topics',
  '',
  'Self-understanding and embodiment.',
  '',
  '## Recent arc',
  '',
  'Starting to name patterns that used to feel automatic.',
  '',
  '## Suggested directions',
  '',
  'Try a weekly check-in with yourself.',
  '',
].join('\n')

function testScope(overrides: Partial<UserProfileScope> = {}): UserProfileScope {
  return {
    dataTypes: ['journal'],
    dateRange: { kind: 'preset', preset: 'last30' },
    includedObjectIds: {},
    approxTokenCount: 200,
    locale: 'en',
    grammaticalGender: 'masculine',
    ...overrides,
  }
}

describe('Profile build flow integration', () => {
  beforeEach(async () => {
    await resetDatabase()
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Seed OpenAI key so `buildProfile` clears its `missingApiKey` guard.
    await userSettingsDexieRepository.set('openaiApiKey', 'sk-test-key-123')

    // Seed a minimal journal entry and load it into the store so the scope
    // has something to include when `buildProfile` reads `sortedEntries`.
    const { journalStore } = initializeStores()
    await journalStore.loadEntries()
    await journalStore.createEntry({
      title: 'Entry for profile build',
      body: 'I noticed I feel calmer after morning walks.',
      emotionIds: [],
      peopleTagIds: [],
      contextTagIds: [],
    })
  })

  it('persists a UserProfile and success log when the full build → save flow completes', async () => {
    const userProfileStore = useUserProfileStore()
    await userProfileStore.loadProfiles()
    expect(userProfileStore.profiles).toHaveLength(0)

    // Report token usage through the diagnostics callback so we can assert the
    // build-log captures it end-to-end (snake_case → camelCase).
    vi.mocked(sendMessage).mockImplementation(
      async (_messages, _systemPrompt, options) => {
        options?.onDiagnostics?.({
          provider: 'ollama',
          model: 'gemma4:e4b',
          timing: {},
          observed: {
            reasoningChunks: 0,
            reasoningCharacters: 0,
            contentChunks: 0,
            contentCharacters: 0,
          },
          usage: { prompt_tokens: 5000, completion_tokens: 600, total_tokens: 5600 },
          rawMetadata: {},
        })
        return CANNED_SUCCESS_RESPONSE
      },
    )

    // ---- Build ----
    const result = await userProfileStore.buildProfile(testScope())
    expect(result.sections.summary).toContain('Reflective')
    expect(result.sections.values).toContain('Clarity')
    expect(result.model).toBeTruthy()
    expect(result.rawResponse).toContain('## Summary')

    // ---- Save (simulate the wizard's `createProfile` hand-off) ----
    const created = await userProfileStore.createProfile({
      note: 'Smoke test save',
      scope: testScope(),
      sections: result.sections,
      rawResponse: result.rawResponse,
      model: result.model,
    })
    expect(created.id).toBeTruthy()
    expect(userProfileStore.profiles).toHaveLength(1)

    // ---- Verify UserProfile persisted in the real Dexie table ----
    const profilesInDb = await userProfileDexieRepository.list()
    expect(profilesInDb).toHaveLength(1)
    expect(profilesInDb[0].id).toBe(created.id)
    expect(profilesInDb[0].sections.summary).toContain('Reflective')

    // ---- Verify build log persisted ----
    const logs = await profileBuildLogDexieRepository.list(5)
    expect(logs.length).toBeGreaterThanOrEqual(1)
    const latest = logs[0]
    expect(latest.success).toBe(true)
    expect(latest.model).toBeTruthy()
    expect(latest.errorMessage).toBeUndefined()
    // Request body should contain the seeded journal entry text so we know
    // the data actually reached the LLM payload assembly.
    expect(latest.requestBody).toContain('calmer after morning walks')
    // Response body should contain the raw LLM text.
    expect(latest.responseBody).toContain('## Summary')
    expect(latest.latencyMs).toBeGreaterThanOrEqual(0)
    // Real provider token usage captured via onDiagnostics, mapped to camelCase.
    expect(latest.tokenUsage).toEqual({
      promptTokens: 5000,
      completionTokens: 600,
      totalTokens: 5600,
    })
  })

  it('records a failure log when the LLM call throws and propagates ProfileBuildError', async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('API key invalid'))

    const userProfileStore = useUserProfileStore()

    await expect(
      userProfileStore.buildProfile(testScope()),
    ).rejects.toBeInstanceOf(ProfileBuildError)

    // Build log persisted even though the call failed — this is the
    // critical debugging affordance for iterating on the system prompt.
    const logs = await profileBuildLogDexieRepository.list(5)
    expect(logs).toHaveLength(1)
    expect(logs[0].success).toBe(false)
    expect(logs[0].errorMessage).toContain('API key invalid')
    // Response body falls back to the error message on failure.
    expect(logs[0].responseBody).toContain('API key invalid')

    // No profile was saved.
    const profilesInDb = await userProfileDexieRepository.list()
    expect(profilesInDb).toHaveLength(0)
  })

  it('fails fast with missingApiKey when no AI provider is configured', async () => {
    // Undo the beforeEach key seed to simulate a fresh user.
    await userSettingsDexieRepository.delete('openaiApiKey')

    const userProfileStore = useUserProfileStore()

    await expect(
      userProfileStore.buildProfile(testScope()),
    ).rejects.toMatchObject({
      name: 'ProfileBuildError',
      code: 'missingApiKey',
    })

    // The store still writes a failure log entry — important evidence in
    // the dev panel that the user attempted a build but had no key.
    const logs = await profileBuildLogDexieRepository.list(5)
    expect(logs).toHaveLength(1)
    expect(logs[0].success).toBe(false)
    expect(logs[0].errorMessage).toMatch(/AI provider/i)
  })

  it('budget-trims a large local-provider scope instead of throwing contextTooLarge', async () => {
    // Switch to a local provider so the computed prompt budget applies.
    await userSettingsDexieRepository.set(
      AI_PROVIDER_SETTINGS_KEY,
      JSON.stringify({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      }),
    )

    // Seed many large journal entries — well over the ~56k-token Ollama budget.
    const { journalStore } = initializeStores()
    await journalStore.loadEntries()
    for (let i = 0; i < 20; i++) {
      await journalStore.createEntry({
        title: `Big entry ${i}`,
        body: 'lorem ipsum '.repeat(1000), // ~12k chars ⇒ ~4k tokens each
        emotionIds: [],
        peopleTagIds: [],
        contextTagIds: [],
        createdAt: `2026-${String((i % 5) + 1).padStart(2, '0')}-01T00:00:00.000Z`,
      })
    }

    vi.mocked(sendMessage).mockResolvedValue(CANNED_SUCCESS_RESPONSE)

    const userProfileStore = useUserProfileStore()
    // Pre-Pillar-2 this scope threw contextTooLarge; now it must build.
    const result = await userProfileStore.buildProfile(
      testScope({ dataTypes: ['journal'], dateRange: { kind: 'preset', preset: 'all' } }),
    )

    expect(result.sections.summary).toContain('Reflective')
    expect(sendMessage).toHaveBeenCalledTimes(1)

    const logs = await profileBuildLogDexieRepository.list(5)
    const latest = logs[0]
    expect(latest.success).toBe(true)
    // The oldest entries were trimmed to fit.
    expect(latest.droppedByType?.journal ?? 0).toBeGreaterThan(0)

    // The payload that was actually sent fits the computed budget (chars/3 ≤ budget).
    const budget = computeMaxPromptTokens('ollama', 'low', PROFILE_MAX_TOKENS) as number
    const userMsg = (
      JSON.parse(latest.requestBody) as { messages: { content: string }[] }
    ).messages[0].content
    expect(Math.ceil(userMsg.length / 3)).toBeLessThanOrEqual(budget)
  })
})
