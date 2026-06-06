import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserProfileStore, ProfileBuildError } from '../userProfile.store'
import { createEmptySections } from '@/domain/userProfile'
import type { UserProfile, UserProfileScope } from '@/domain/userProfile'

// Mock the repositories
vi.mock('@/repositories/userProfileDexieRepository', () => ({
  userProfileDexieRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
  },
}))

vi.mock('@/repositories/profileBuildLogDexieRepository', () => ({
  profileBuildLogDexieRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    add: vi.fn(),
    clearAll: vi.fn(),
  },
}))

// API-key gate uses this repository directly.
vi.mock('@/repositories/userSettingsDexieRepository', () => ({
  userSettingsDexieRepository: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

// Structured reflections repository is touched by buildProfile when weekly/monthly
// data types are enabled — keep it hermetic.
vi.mock('@/repositories/structuredReflectionDexieRepository', () => ({
  structuredReflectionDexieRepository: {
    listWeekly: vi.fn(async () => []),
    listMonthly: vi.fn(async () => []),
  },
}))

// Exercise query helper is also used when exerciseSessions are in scope.
vi.mock('@/services/reflectionDataQueries', () => ({
  getExerciseSessionBundlesForPeriod: vi.fn(async () => []),
}))

// Planning snapshot reads from multiple repositories — stub it at the source.
vi.mock('@/services/profileLLMAssistsHelpers', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/profileLLMAssistsHelpers')
  >('@/services/profileLLMAssistsHelpers')
  return {
    ...actual,
    buildFoundationSnapshot: vi.fn(async () => ({
      items: [],
      snapshot: '',
    })),
    buildLifeAreasSnapshot: vi.fn(() => ({
      items: [],
      snapshot: '',
    })),
    buildPlanningSnapshot: vi.fn(async () => ({
      activeGoals: [],
      activeKeyResults: [],
      activeHabits: [],
      activeTrackers: [],
      priorities: {
        active: [],
        paused: [],
        closed: [],
      },
      snapshot: '',
    })),
  }
})

// Silence the LLM service — buildProfile calls sendMessage; individual tests
// replace this mock's return value per scenario.
vi.mock('@/services/llmService', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/llmService')
  >('@/services/llmService')
  return {
    ...actual,
    sendMessage: vi.fn(),
  }
})

// Downstream stores used when building the journal / emotion payload. We stub
// them with empty lists — buildProfile doesn't need real entries for these
// tests, just enough shape to avoid TypeErrors.
vi.mock('@/stores/journal.store', () => ({
  useJournalStore: vi.fn(() => ({ sortedEntries: [] })),
}))
vi.mock('@/stores/emotionLog.store', () => ({
  useEmotionLogStore: vi.fn(() => ({ sortedLogs: [] })),
}))
vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: vi.fn(() => ({
    emotions: [],
    getEmotionById: vi.fn(() => undefined),
  })),
}))
vi.mock('@/stores/tag.store', () => ({
  useTagStore: vi.fn(() => ({
    peopleTags: [],
    contextTags: [],
    getPeopleTagById: vi.fn(() => undefined),
    getContextTagById: vi.fn(() => undefined),
  })),
}))
vi.mock('@/stores/lifeArea.store', () => ({
  useLifeAreaStore: vi.fn(() => ({
    lifeAreas: [],
    getLifeAreaById: vi.fn(() => undefined),
  })),
}))

// Access the mocked repositories
import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import {
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  sendMessage,
  type AIProviderSettings,
} from '@/services/llmService'
import {
  buildFoundationSnapshot,
  buildLifeAreasSnapshot,
  buildPlanningSnapshot,
} from '@/services/profileLLMAssistsHelpers'

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const base: UserProfile = {
    id: overrides.id ?? 'profile-' + Math.random().toString(36).slice(2, 10),
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    note: overrides.note,
    scope:
      overrides.scope ??
      ({
        dataTypes: ['journal'],
        dateRange: { kind: 'preset', preset: 'last30' },
        includedObjectIds: {},
        approxTokenCount: 0,
        locale: 'en',
        grammaticalGender: 'masculine',
      } satisfies UserProfileScope),
    sections: overrides.sections ?? createEmptySections(),
    rawResponse: overrides.rawResponse ?? '',
    model: overrides.model ?? 'gpt-test',
  }
  return base
}

function mockAISettings(settings?: AIProviderSettings, legacyKey?: string) {
  vi.mocked(userSettingsDexieRepository.get).mockImplementation(async (key) => {
    if (key === AI_PROVIDER_SETTINGS_KEY && settings) {
      return JSON.stringify(settings)
    }
    if (key === LEGACY_OPENAI_API_KEY) return legacyKey
    return undefined
  })
}

describe('useUserProfileStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('loadProfiles', () => {
    it('populates profiles from the repository', async () => {
      const a = makeProfile({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' })
      const b = makeProfile({ id: 'b', createdAt: '2026-02-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([b, a])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(userProfileDexieRepository.list).toHaveBeenCalledOnce()
      expect(store.profiles).toEqual([b, a])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('captures error message on repository failure', async () => {
      vi.mocked(userProfileDexieRepository.list).mockRejectedValue(new Error('boom'))
      const store = useUserProfileStore()
      await store.loadProfiles()
      expect(store.error).toBe('boom')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createProfile', () => {
    it('prepends the created profile to the profiles array', async () => {
      const existing = makeProfile({ id: 'existing', createdAt: '2026-01-01T00:00:00.000Z' })
      const created = makeProfile({ id: 'new', createdAt: '2026-03-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([existing])
      vi.mocked(userProfileDexieRepository.create).mockResolvedValue(created)

      const store = useUserProfileStore()
      await store.loadProfiles()

      const result = await store.createProfile({
        scope: created.scope,
        sections: created.sections,
        rawResponse: created.rawResponse,
        model: created.model,
      })

      expect(result).toEqual(created)
      expect(store.profiles[0]).toEqual(created)
      expect(store.profiles[1]).toEqual(existing)
      expect(store.profiles).toHaveLength(2)
    })
  })

  describe('updateProfile', () => {
    it('replaces the matching record and returns the updated profile', async () => {
      const original = makeProfile({ id: 'p1', note: 'first' })
      const updated = makeProfile({ id: 'p1', note: 'edited' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([original])
      vi.mocked(userProfileDexieRepository.update).mockResolvedValue(updated)

      const store = useUserProfileStore()
      await store.loadProfiles()

      const result = await store.updateProfile('p1', { note: 'edited' })

      expect(userProfileDexieRepository.update).toHaveBeenCalledWith('p1', { note: 'edited' })
      expect(result).toEqual(updated)
      expect(store.profiles[0]).toEqual(updated)
      expect(store.profiles).toHaveLength(1)
    })
  })

  describe('deleteProfile', () => {
    it('removes a non-current profile', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const current = makeProfile({ id: 'current', createdAt: '2026-02-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([current, older])
      vi.mocked(userProfileDexieRepository.delete).mockResolvedValue(undefined)

      const store = useUserProfileStore()
      await store.loadProfiles()

      await store.deleteProfile('older')

      expect(userProfileDexieRepository.delete).toHaveBeenCalledWith('older')
      expect(store.profiles.map((p) => p.id)).toEqual(['current'])
    })

    it('throws when called on the current profile while older versions exist', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const current = makeProfile({ id: 'current', createdAt: '2026-02-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([current, older])

      const store = useUserProfileStore()
      await store.loadProfiles()

      await expect(store.deleteProfile('current')).rejects.toThrow(
        'Cannot delete the current (most recent) profile while older versions exist',
      )
      expect(userProfileDexieRepository.delete).not.toHaveBeenCalled()
      expect(store.profiles).toHaveLength(2)
    })

    it('succeeds when there is only one profile (even though it is the current)', async () => {
      const only = makeProfile({ id: 'only' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([only])
      vi.mocked(userProfileDexieRepository.delete).mockResolvedValue(undefined)

      const store = useUserProfileStore()
      await store.loadProfiles()

      await store.deleteProfile('only')

      expect(userProfileDexieRepository.delete).toHaveBeenCalledWith('only')
      expect(store.profiles).toEqual([])
    })
  })

  describe('buildProfile', () => {
    const validScope: UserProfileScope = {
      dataTypes: ['journal'],
      dateRange: { kind: 'preset', preset: 'last30' },
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    }

    function aWellFormedResponse(): string {
      return [
        '## Summary',
        '',
        'A short portrait.',
        '',
        '## Values and guiding principles',
        '',
        'Principles body.',
        '',
        '## Emotional patterns',
        '',
        'Patterns body.',
      ].join('\n')
    }

    it('throws when dataTypes is empty (and does NOT write a log)', async () => {
      const store = useUserProfileStore()
      await expect(
        store.buildProfile({
          ...validScope,
          dataTypes: [],
        }),
      ).rejects.toThrow('Scope must include at least one data type')
      // The guard short-circuits before the try/finally log path.
      expect(profileBuildLogDexieRepository.add).not.toHaveBeenCalled()
    })

    it('throws ProfileBuildError("missingApiKey") when no AI provider is configured', async () => {
      mockAISettings()
      const store = useUserProfileStore()

      const promise = store.buildProfile(validScope)
      await expect(promise).rejects.toBeInstanceOf(ProfileBuildError)
      await expect(promise).rejects.toMatchObject({ code: 'missingApiKey' })
      expect(sendMessage).not.toHaveBeenCalled()
      // We still log the failure for developer debugging (success: false).
      expect(profileBuildLogDexieRepository.add).toHaveBeenCalledTimes(1)
      const logCall = vi.mocked(profileBuildLogDexieRepository.add).mock.calls[0][0]
      expect(logCall.success).toBe(false)
      expect(logCall.errorMessage).toContain('AI provider')
    })

    it('returns parsed sections and rawResponse on a well-formed LLM answer', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      const result = await store.buildProfile(validScope)

      expect(result.rawResponse).toContain('## Summary')
      expect(result.sections.summary).toContain('A short portrait.')
      expect(result.sections.values).toContain('Principles body.')
      expect(result.sections.emotionalPatterns).toContain('Patterns body.')
      // Unmentioned sections stay empty (no hallucinated content).
      expect(result.sections.strengths).toBe('')
      expect(result.model).toBe('gpt-5-nano')
    })

    it('calls buildFoundationSnapshot once when foundation is in scope', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      await store.buildProfile({
        ...validScope,
        dataTypes: ['foundation'],
      })

      expect(buildFoundationSnapshot).toHaveBeenCalledTimes(1)
    })

    it('does not call foundation, planning or life-area helpers when their types are out of scope', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      await store.buildProfile(validScope)

      expect(buildFoundationSnapshot).not.toHaveBeenCalled()
      expect(buildPlanningSnapshot).not.toHaveBeenCalled()
      expect(buildLifeAreasSnapshot).not.toHaveBeenCalled()
    })

    it('calls planning and life-area helpers when planning is in scope', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      await store.buildProfile({
        ...validScope,
        dataTypes: ['planning'],
      })

      expect(buildPlanningSnapshot).toHaveBeenCalledTimes(1)
      expect(buildLifeAreasSnapshot).toHaveBeenCalledTimes(1)
    })

    it('sends foundation, life-area and planning blocks in the LLM user payload', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(buildFoundationSnapshot).mockResolvedValueOnce({
        items: [],
        snapshot: '## Value map\nTop values: care',
      })
      vi.mocked(buildLifeAreasSnapshot).mockReturnValueOnce({
        items: [],
        snapshot: '- Career\n  Meaning: Build well',
      })
      vi.mocked(buildPlanningSnapshot).mockResolvedValueOnce({
        activeGoals: [],
        activeKeyResults: [],
        activeHabits: [],
        activeTrackers: [],
        priorities: {
          active: [],
          paused: [],
          closed: [],
        },
        snapshot: '- Daily meditation [habit, daily]',
      })
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      await store.buildProfile({
        ...validScope,
        dataTypes: ['foundation', 'planning'],
      })

      const messages = vi.mocked(sendMessage).mock.calls[0][0]
      const systemPrompt = vi.mocked(sendMessage).mock.calls[0][1]
      const userPayload = messages[0].content

      expect(userPayload).toContain('[FOUNDATION SNAPSHOT]')
      expect(userPayload).toContain('[LIFE AREAS]')
      expect(userPayload).toContain('[PLANNING SNAPSHOT]')
      expect(userPayload.indexOf('[FOUNDATION SNAPSHOT]')).toBeLessThan(
        userPayload.indexOf('[LIFE AREAS]'),
      )
      expect(userPayload.indexOf('[LIFE AREAS]')).toBeLessThan(
        userPayload.indexOf('[PLANNING SNAPSHOT]'),
      )
      expect(systemPrompt).toContain('You are a careful, psychologically literate observer')
      expect(systemPrompt).not.toContain('[USER PROFILE]')
      expect(systemPrompt).not.toContain('[PROFILE CONTEXT]')
    })

    it('never injects "## User Profile Context" into the build prompt, even when a saved profile exists', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      // Pre-seed a saved profile with populated sections — withProfileContextSystemPrompt
      // would prepend "## User Profile Context" if useProfile were ever true.
      // The build path hard-codes useProfile:false, so the marker must NOT appear.
      store.profiles = [
        makeProfile({
          id: 'existing',
          sections: {
            ...createEmptySections(),
            summary: 'Curious, reflective.',
            values: 'Care, honesty.',
          },
        }),
      ]

      await store.buildProfile(validScope)

      const systemPrompt = vi.mocked(sendMessage).mock.calls[0][1]
      expect(systemPrompt).not.toContain('## User Profile Context')
      expect(systemPrompt).not.toContain('Curious, reflective.')
    })

    it('uses a configured local model in the result, sendMessage options, and log', async () => {
      mockAISettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      const result = await store.buildProfile(validScope)

      expect(result.model).toBe('gemma4:e4b')
      expect(sendMessage).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        { maxTokens: 6000, model: 'gemma4:e4b' },
      )
      const logPayload = vi.mocked(profileBuildLogDexieRepository.add).mock.calls[0][0]
      expect(logPayload.model).toBe('gemma4:e4b')
      expect(logPayload.requestBody).toContain('"model":"gemma4:e4b"')
    })

    it('flips isBuilding true mid-call and back to false when done', async () => {
      mockAISettings(undefined, 'sk-test')
      let duringFlag = false
      vi.mocked(sendMessage).mockImplementation(async () => {
        duringFlag = store.isBuilding
        return aWellFormedResponse()
      })

      const store = useUserProfileStore()
      expect(store.isBuilding).toBe(false)
      await store.buildProfile(validScope)
      expect(duringFlag).toBe(true)
      expect(store.isBuilding).toBe(false)
    })

    it('writes a SUCCESS log with the request/response bodies and latency', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      await store.buildProfile(validScope)

      expect(profileBuildLogDexieRepository.add).toHaveBeenCalledTimes(1)
      const payload = vi.mocked(profileBuildLogDexieRepository.add).mock.calls[0][0]
      expect(payload.success).toBe(true)
      expect(payload.responseBody).toContain('## Summary')
      expect(payload.requestBody).toContain('systemPrompt')
      expect(payload.requestBody).toContain('"role":"user"')
      expect(payload.model).toBe('gpt-5-nano')
      expect(payload.requestBody).toContain('"model":"gpt-5-nano"')
      expect(typeof payload.latencyMs).toBe('number')
      expect(payload.latencyMs).toBeGreaterThanOrEqual(0)
      expect(payload.scope).toEqual(validScope)
    })

    it('re-throws and logs a FAILURE entry when sendMessage rejects', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockRejectedValue(new Error('network is unreachable'))

      const store = useUserProfileStore()
      await expect(store.buildProfile(validScope)).rejects.toBeInstanceOf(
        ProfileBuildError,
      )

      expect(profileBuildLogDexieRepository.add).toHaveBeenCalledTimes(1)
      const payload = vi.mocked(profileBuildLogDexieRepository.add).mock.calls[0][0]
      expect(payload.success).toBe(false)
      expect(payload.errorMessage).toContain('network')
    })

    it('classifies fetch/network style errors with code="network"', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockRejectedValue(new Error('Failed to fetch'))

      const store = useUserProfileStore()
      try {
        await store.buildProfile(validScope)
        throw new Error('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ProfileBuildError)
        expect((err as ProfileBuildError).code).toBe('network')
      }
    })

    it('falls back to code="unknown" for unclassified errors', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockRejectedValue(new Error('teapot responded 418'))

      const store = useUserProfileStore()
      try {
        await store.buildProfile(validScope)
        throw new Error('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ProfileBuildError)
        expect((err as ProfileBuildError).code).toBe('unknown')
      }
    })

    it('classifies a whitespace-only model reply (llmService throw) as code="emptyResponse"', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockRejectedValue(
        new Error('Empty response from API. Please try again.'),
      )

      const store = useUserProfileStore()
      try {
        await store.buildProfile(validScope)
        throw new Error('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ProfileBuildError)
        expect((err as ProfileBuildError).code).toBe('emptyResponse')
      }
    })

    it('throws code="emptyResponse" when the response parses to all-empty sections', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(
        'Just some prose with no recognisable headers at all.',
      )

      const store = useUserProfileStore()
      try {
        await store.buildProfile(validScope)
        throw new Error('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ProfileBuildError)
        expect((err as ProfileBuildError).code).toBe('emptyResponse')
      }
    })

    it('throws code="contextTooLarge" for a local provider when the scope cannot fit the largest window', async () => {
      mockAISettings({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'gemma4:e4b',
      })
      const store = useUserProfileStore()

      const promise = store.buildProfile({
        ...validScope,
        approxTokenCount: 100000,
      })
      await expect(promise).rejects.toBeInstanceOf(ProfileBuildError)
      await expect(promise).rejects.toMatchObject({ code: 'contextTooLarge' })
      // Guard fires before any model call.
      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('does not apply the contextTooLarge guard to hosted providers', async () => {
      mockAISettings(undefined, 'sk-test') // resolves to the OpenAI preset
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())

      const store = useUserProfileStore()
      const result = await store.buildProfile({
        ...validScope,
        approxTokenCount: 100000,
      })

      expect(result.sections.summary).toContain('A short portrait.')
      expect(sendMessage).toHaveBeenCalledTimes(1)
    })

    it('swallows logging failures without masking the build outcome', async () => {
      mockAISettings(undefined, 'sk-test')
      vi.mocked(sendMessage).mockResolvedValue(aWellFormedResponse())
      vi.mocked(profileBuildLogDexieRepository.add).mockRejectedValue(
        new Error('log write failed'),
      )
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const store = useUserProfileStore()
      const result = await store.buildProfile(validScope)

      expect(result.sections.summary).toContain('A short portrait.')
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('does not call sendMessage when the scope guard rejects (empty dataTypes)', async () => {
      const store = useUserProfileStore()
      await expect(
        store.buildProfile({ ...validScope, dataTypes: [] }),
      ).rejects.toThrow()
      expect(sendMessage).not.toHaveBeenCalled()
    })
  })

  describe('computed getters', () => {
    it('sortedProfiles is reverse-chronological regardless of input order', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const middle = makeProfile({ id: 'middle', createdAt: '2026-02-01T00:00:00.000Z' })
      const newest = makeProfile({ id: 'newest', createdAt: '2026-03-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([middle, older, newest])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(store.sortedProfiles.map((p) => p.id)).toEqual(['newest', 'middle', 'older'])
    })

    it('currentProfile returns the newest', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const newest = makeProfile({ id: 'newest', createdAt: '2026-03-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([older, newest])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(store.currentProfile?.id).toBe('newest')
    })

    it('hasProfiles reflects current state', async () => {
      const store = useUserProfileStore()
      expect(store.hasProfiles).toBe(false)

      const p = makeProfile()
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([p])
      await store.loadProfiles()
      expect(store.hasProfiles).toBe(true)
    })

    it('getById finds a profile by id', async () => {
      const p = makeProfile({ id: 'target' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([p])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(store.getById('target')?.id).toBe('target')
      expect(store.getById('missing')).toBeUndefined()
    })
  })

  describe('build logs', () => {
    it('loadBuildLogs populates buildLogs', async () => {
      const log = {
        id: 'log1',
        timestamp: '2026-01-01T00:00:00.000Z',
        scope: {
          dataTypes: ['journal' as const],
          dateRange: { kind: 'preset' as const, preset: 'last30' as const },
          includedObjectIds: {},
          approxTokenCount: 0,
          locale: 'en' as const,
          grammaticalGender: 'masculine' as const,
        },
        model: 'gpt-test',
        requestBody: '{}',
        responseBody: '{}',
        latencyMs: 0,
        success: true,
      }
      vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([log])

      const store = useUserProfileStore()
      await store.loadBuildLogs()

      expect(profileBuildLogDexieRepository.list).toHaveBeenCalledWith(100)
      expect(store.buildLogs).toEqual([log])
    })

    it('clearBuildLogs empties the buildLogs ref', async () => {
      const store = useUserProfileStore()
      // seed
      vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([])
      await store.loadBuildLogs()
      vi.mocked(profileBuildLogDexieRepository.clearAll).mockResolvedValue(undefined)

      await store.clearBuildLogs()

      expect(profileBuildLogDexieRepository.clearAll).toHaveBeenCalledOnce()
      expect(store.buildLogs).toEqual([])
    })

    it('loadBuildLogs swallows errors with a warn', async () => {
      vi.mocked(profileBuildLogDexieRepository.list).mockRejectedValue(new Error('log fail'))
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const store = useUserProfileStore()
      await store.loadBuildLogs()

      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})
