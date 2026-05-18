import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  profileContextAvailable,
  withProfileContextSystemPrompt,
} from '../userContext'
import { useUserProfileStore } from '@/stores/userProfile.store'
import type { ProfileSections, UserProfile } from '@/domain/userProfile'

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

describe('withProfileContextSystemPrompt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the system prompt unchanged when useProfile is false', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    const out = withProfileContextSystemPrompt('SYS', { useProfile: false })

    expect(out).toBe('SYS')
  })

  it('returns the system prompt unchanged when no profile exists, even with useProfile=true', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = []

    const out = withProfileContextSystemPrompt('SYS', { useProfile: true })

    expect(out).toBe('SYS')
  })

  it('returns the system prompt unchanged when the profile renders to an empty block', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile()] // every section empty → empty block

    const out = withProfileContextSystemPrompt('SYS', { useProfile: true })

    expect(out).toBe('SYS')
  })

  it('prepends the canonical context block when useProfile is true and a profile is present', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'Curious.' })]

    const out = withProfileContextSystemPrompt('SYS', { useProfile: true })

    expect(out.startsWith('## User Profile Context')).toBe(true)
    expect(out).toContain('### Summary')
    expect(out).toContain('Curious.')
    expect(out.endsWith('SYS')).toBe(true)
  })

  it('separates the context block and system prompt with a blank line', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    const out = withProfileContextSystemPrompt('SYS', { useProfile: true })

    expect(out).toContain('\n\nSYS')
  })
})

describe('profileContextAvailable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns false when there is no current profile', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = []

    expect(profileContextAvailable()).toBe(false)
  })

  it('returns true when a profile exists', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    expect(profileContextAvailable()).toBe(true)
  })
})
