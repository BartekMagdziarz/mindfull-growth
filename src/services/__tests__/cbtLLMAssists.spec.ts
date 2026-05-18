import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { identifyThoughts } from '../cbtLLMAssists'
import type { ProfileSections, UserProfile } from '@/domain/userProfile'

vi.mock('@/services/llmService', () => ({
  sendMessage: vi.fn(async () => 'response'),
}))

import { sendMessage } from '@/services/llmService'

function emptySections(): ProfileSections {
  return {
    summary: '',
    values: '',
    emotionalPatterns: '',
    strengths: '',
    challenges: '',
    relationships: '',
    themes: '',
    recentArc: '',
    suggestedDirections: '',
  }
}

function makeProfile(overrides: Partial<ProfileSections> = {}): UserProfile {
  return {
    id: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    scope: {
      dataTypes: [],
      dateRange: { kind: 'preset', preset: 'last90' },
      filters: {},
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    sections: { ...emptySections(), ...overrides },
    rawResponse: '',
    model: 'test-model',
  }
}

describe('cbtLLMAssists.identifyThoughts (sample function)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not prefix profile context when useProfile is false (default)', async () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [
      makeProfile({ summary: 'Curious, reflective.' }),
    ]

    await identifyThoughts({
      situation: 'Missed a deadline',
      emotions: [{ name: 'anxious', intensity: 7 }],
      locale: 'en',
    })

    expect(sendMessage).toHaveBeenCalledTimes(1)
    const systemPrompt = vi.mocked(sendMessage).mock.calls[0][1]
    expect(systemPrompt).not.toContain('## User Profile Context')
    expect(systemPrompt).not.toContain('Curious, reflective.')
  })

  it('prepends the profile context block when useProfile is true and a profile exists', async () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [
      makeProfile({ summary: 'Curious, reflective.' }),
    ]

    await identifyThoughts({
      situation: 'Missed a deadline',
      emotions: [{ name: 'anxious', intensity: 7 }],
      locale: 'en',
      useProfile: true,
    })

    expect(sendMessage).toHaveBeenCalledTimes(1)
    const systemPrompt = vi.mocked(sendMessage).mock.calls[0][1]!
    expect(systemPrompt.startsWith('## User Profile Context')).toBe(true)
    expect(systemPrompt).toContain('Curious, reflective.')
  })

  it('returns the unchanged base prompt when useProfile is true but no profile exists', async () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = []

    await identifyThoughts({
      situation: 'Missed a deadline',
      emotions: [{ name: 'anxious', intensity: 7 }],
      locale: 'en',
      useProfile: true,
    })

    const systemPrompt = vi.mocked(sendMessage).mock.calls[0][1]
    expect(systemPrompt).not.toContain('## User Profile Context')
  })
})
