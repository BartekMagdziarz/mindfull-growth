import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fireEvent, render, screen } from '@testing-library/vue'
import ProfileContextToggle from '../ProfileContextToggle.vue'
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

describe('ProfileContextToggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when no profile is available', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = []

    const { container } = render(ProfileContextToggle, {
      props: { modelValue: true },
    })

    expect(container.querySelector('[data-test-profile-context-toggle]')).toBeNull()
  })

  it('renders the toggle button when a profile exists', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    render(ProfileContextToggle, {
      props: { modelValue: true },
    })

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('reflects the off state via aria-pressed and label', () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    render(ProfileContextToggle, {
      props: { modelValue: false },
    })

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('emits update:modelValue with the inverted value when clicked', async () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    const { emitted } = render(ProfileContextToggle, {
      props: { modelValue: true },
    })

    await fireEvent.click(screen.getByRole('button'))

    expect(emitted('update:modelValue')).toBeTruthy()
    expect(emitted('update:modelValue')![0]).toEqual([false])
  })

  it('emits true when clicked from the off state', async () => {
    const profileStore = useUserProfileStore()
    profileStore.profiles = [makeProfile({ summary: 'S' })]

    const { emitted } = render(ProfileContextToggle, {
      props: { modelValue: false },
    })

    await fireEvent.click(screen.getByRole('button'))

    expect(emitted('update:modelValue')![0]).toEqual([true])
  })
})
